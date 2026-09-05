#!/usr/bin/env node
// End-to-end provider smoke test against a local S3 mock, without AWS.
//
// The shipped provider is a Lambda runtime client, not a CLI: it pulls one
// CloudFormation custom-resource event from the Lambda Runtime API and drives
// S3 from it. Unit and synth tests stub the bootstrap with `exit 0`, so this
// script closes that gap by running the real binary under the AWS Lambda
// Runtime Interface Emulator (RIE) with an S3-compatible mock (MinIO) behind
// `AWS_ENDPOINT_URL_S3`.
//
// Three phases run through one emulator: `Create`, then `Update` against a
// second archive (which overwrites one object, adds another, and leaves a
// third stale for deletion), then `Delete` with `deleteCurrentObjects`
// enabled. Stale-object deletion and the destructive delete path otherwise
// run end-to-end only under opt-in AWS verification. Each phase asserts
// against only the log produced after it started, so a later phase cannot
// pass on an earlier phase's deployment summary.
//
// The CloudFormation callback requires HTTPS and a validated AWS callback
// host, so the smoke test does not try to make the callback succeed. The
// synthetic `ResponseURL` uses a non-existent region and the provider runs
// with `HTTPS_PROXY` pointed at a dead local port, so the callback fails fast
// without any outbound traffic. The test asserts the provider's observable
// outcome instead: the extracted objects land in the mock destination bucket
// with the expected keys and bytes, and the provider logs a successful
// deployment summary before the expected callback failure.
//
// Usage:
//   node scripts/smoke-provider.mjs
//
// Environment:
//   MINIO_BIN    Path to the MinIO server binary (default: `minio` on PATH).
//   RIE_BIN      Path to the AWS Lambda Runtime Interface Emulator binary
//                (default: `aws-lambda-rie` on PATH).
//   PROVIDER_BIN Path to a prebuilt provider `bootstrap`; when unset, the
//                script builds it with `cargo lambda build`.
//   SMOKE_KEEP   Set to 1 to keep the scratch directory on failure.

import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { Socket } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";
import {
  CreateBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { assertPayloadPaths, assertPayloadWithinSynthShape } from "./synth-payload-shape.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const PROVIDER_BINARY_NAME = "shin-bucket-deployment-handler";
const PROVIDER_TARGET = "x86_64-unknown-linux-gnu";

// Dummy credentials and mock names are deliberately not real AWS identifiers.
const SMOKE_ACCESS_KEY = "shin-smoke-access";
const SMOKE_SECRET_KEY = "shin-smoke-secret";
const SOURCE_BUCKET = "shin-smoke-source";
const DESTINATION_BUCKET = "shin-smoke-destination";
const SOURCE_OBJECT_KEY = "site.zip";
const SOURCE_OBJECT_KEY_V2 = "site-v2.zip";
// Update and Delete must carry a PhysicalResourceId; the provider requires one
// for both and echoes it back unchanged, deriving an ID only on Create.
const SMOKE_PHYSICAL_RESOURCE_ID = "shin-smoke-physical-resource-id";
const DESTINATION_OWNER_ID = "smoke0abc";
export const SERVICE_TOKEN = "arn:aws:lambda:us-east-1:000000000000:function:shin-provider-smoke";
// `useast99`/`us-east-99` satisfies the provider's CloudFormation callback
// host validation (bucket prefix, s3, region shape) while the region itself
// does not exist, so any accidental direct connection fails at DNS.
const CALLBACK_RESPONSE_URL =
  "https://cloudformation-custom-resource-response-useast99.s3.us-east-99.amazonaws.com/response?signature=shin-smoke";

const MINIO_PORT = Number(process.env.SMOKE_MINIO_PORT ?? 9000);
// The Runtime Interface Emulator serves its invoke endpoint on this port.
const RIE_PORT = 8080;
// Nothing listens on the discard port; the callback's HTTPS proxy connect
// fails here instantly instead of touching the network.
const DEAD_PROXY_PORT = 9;

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;

/** Smoke fixture: two files exercising a nested path and the root path. */
export const SMOKE_ENTRIES = [
  { path: "index.html", content: "<!doctype html><title>shin smoke</title>" },
  { path: "assets/app.js", content: 'console.log("shin smoke");\n' },
];

/**
 * Second-generation fixture for the `Update` invocation.
 *
 * Deliberately overlaps `SMOKE_ENTRIES` in one key, drops another, and adds a
 * third, so a single Update exercises all three outcomes at once: `index.html`
 * is overwritten with different bytes, `assets/app.js` becomes stale and must
 * be deleted, and `about.html` is a new object.
 */
export const SMOKE_UPDATE_ENTRIES = [
  { path: "index.html", content: "<!doctype html><title>shin smoke v2</title>" },
  { path: "about.html", content: "<!doctype html><title>about</title>" },
];

/**
 * Builds a minimal ZIP archive with stored (uncompressed) entries.
 *
 * The provider reads the archive through S3 ranged GETs and parses the
 * central directory, so the archive only needs to be a valid ZIP; no
 * compression is required for the smoke payload.
 */
export function buildSourceZip(entries) {
  const encoded = entries.map((entry) => ({
    name: Buffer.from(entry.path, "utf8"),
    data: Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(String(entry.content), "utf8"),
  }));

  const localChunks = [];
  const centralChunks = [];
  let dataOffset = 0;
  for (const { name, data } of encoded) {
    const checksum = crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(ZIP_LOCAL_FILE_HEADER, 0);
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0x0800, 6); // UTF-8 file name flag
    local.writeUInt16LE(0, 8); // stored (no compression)
    local.writeUInt16LE(0, 10); // modification time
    local.writeUInt16LE(0x21, 12); // modification date (1980-01-01)
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    localChunks.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER, 0);
    central.writeUInt16LE(0x031e, 4); // version made by (Unix)
    central.writeUInt16LE(20, 6); // version needed to extract
    central.writeUInt16LE(0x0800, 8); // UTF-8 file name flag
    central.writeUInt16LE(0, 10); // stored
    central.writeUInt16LE(0, 12); // modification time
    central.writeUInt16LE(0x21, 14); // modification date
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attributes
    central.writeUInt32LE(dataOffset, 42); // local header offset
    centralChunks.push(central, name);

    dataOffset += local.length + name.length + data.length;
  }

  const centralSize = centralChunks.reduce((total, chunk) => total + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY, 0);
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // central directory disk
  end.writeUInt16LE(encoded.length, 8);
  end.writeUInt16LE(encoded.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(dataOffset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localChunks, ...centralChunks, end]);
}

/**
 * Builds a synthetic CloudFormation custom-resource `Create` envelope.
 *
 * `ResourceProperties` mirrors what the construct synthesizes for a simple
 * site. The provider decodes the envelope strictly (`deny_unknown_fields`),
 * so only fields the provider declares may appear. `ServiceToken` and
 * `ServiceTimeout` stay nested here on purpose, and both must be present:
 * CloudFormation delivers the reserved custom-resource properties inside
 * `ResourceProperties` (commit c530bf7 records the production failure when
 * the strict decoder rejected a real event over `ServiceTimeout`), so a
 * faithful fixture carries both — dropping either would let the smoke run
 * pass while every real CDK deployment failed. `assertPayloadPaths` pins
 * both keys, and the fixture is checked against the runtime ResourceProperties
 * schema (scripts/synth-payload-shape.mjs -> contract/wire-contract.mjs) on
 * every build: any key outside the schema, any missing required path, or any
 * wrong-typed value throws.
 */
function buildResourceProperties({
  sourceBucketNames,
  sourceObjectKeys,
  destinationBucketName,
  destinationOwnerId,
  serviceToken,
  serviceTimeout,
  deleteCurrentObjectsOnDelete,
}) {
  return {
    SourceBucketNames: sourceBucketNames,
    SourceObjectKeys: sourceObjectKeys,
    Destination: {
      BucketName: destinationBucketName,
    },
    DestinationOwnerId: destinationOwnerId,
    DestinationLifecycle: {
      OnDeploy: { DeleteStaleObjects: true },
      OnChange: { DeletePreviousObjects: false },
      OnDelete: { DeleteCurrentObjects: deleteCurrentObjectsOnDelete },
    },
    CloudfrontInvalidation: { WaitForCompletion: true },
    SourceProcessing: {
      Extract: true,
      MaxUncompressedEntryBytes: 1024 * 1024 * 1024,
      MaxCompressionRatio: 100,
    },
    OutputObjectKeys: false,
    Transfer: {
      AdvancedTuning: { DestinationWriteRetry: {} },
    },
    ServiceToken: serviceToken,
    ServiceTimeout: serviceTimeout,
  };
}

/**
 * Builds a synthetic CloudFormation custom-resource envelope.
 *
 * `Update` and `Delete` carry a `PhysicalResourceId`, which the provider
 * requires for both and echoes back unchanged; only `Create` derives one.
 * `Update` additionally carries `OldResourceProperties`, which CloudFormation
 * populates from the previous template and the provider decodes just as
 * strictly as the current properties.
 */
export function buildEvent({
  requestType = "Create",
  sourceBucketNames = [SOURCE_BUCKET],
  sourceObjectKeys = [SOURCE_OBJECT_KEY],
  destinationBucketName = DESTINATION_BUCKET,
  destinationOwnerId = DESTINATION_OWNER_ID,
  responseUrl = CALLBACK_RESPONSE_URL,
  serviceToken = SERVICE_TOKEN,
  serviceTimeout = "900",
  requestId = "00000000-0000-4000-8000-000000000000",
  stackId = "arn:aws:cloudformation:us-east-1:000000000000:stack/shin-provider-smoke/00000000-0000-4000-8000-000000000000",
  logicalResourceId = "ShinProviderSmoke",
  physicalResourceId,
  oldSourceObjectKeys,
  deleteCurrentObjectsOnDelete = false,
} = {}) {
  const resourceProperties = buildResourceProperties({
    sourceBucketNames,
    sourceObjectKeys,
    destinationBucketName,
    destinationOwnerId,
    serviceToken,
    serviceTimeout,
    deleteCurrentObjectsOnDelete,
  });
  const event = {
    RequestType: requestType,
    ServiceToken: serviceToken,
    ResponseURL: responseUrl,
    StackId: stackId,
    RequestId: requestId,
    LogicalResourceId: logicalResourceId,
    ResourceType: "AWS::CloudFormation::CustomResource",
    ResourceProperties: resourceProperties,
  };
  if (physicalResourceId !== undefined) {
    event.PhysicalResourceId = physicalResourceId;
  }
  if (oldSourceObjectKeys !== undefined) {
    event.OldResourceProperties = buildResourceProperties({
      sourceBucketNames,
      sourceObjectKeys: oldSourceObjectKeys,
      destinationBucketName,
      destinationOwnerId,
      serviceToken,
      serviceTimeout,
      deleteCurrentObjectsOnDelete,
    });
    assertPayloadWithinSynthShape(event.OldResourceProperties);
    assertPayloadPaths(event.OldResourceProperties);
  }
  assertPayloadWithinSynthShape(event.ResourceProperties);
  assertPayloadPaths(event.ResourceProperties);
  return event;
}

/** Back-compatible alias for the `Create` envelope. */
export function buildCreateEvent(options = {}) {
  return buildEvent({ ...options, requestType: "Create" });
}

/** The destination keys a successful deployment of `entries` must contain. */
export function expectedDestinationKeys(entries) {
  return entries.map((entry) => entry.path).sort();
}

function runOrThrow(command, args, cwd, label) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} exited with status ${result.status}`);
  }
}

function buildProvider() {
  const manifest = join(repoRoot, "rust", "Cargo.toml");
  console.log("Building the provider binary with cargo lambda...");
  runOrThrow(
    "cargo",
    [
      "lambda",
      "build",
      "--release",
      "--manifest-path",
      manifest,
      "--bin",
      PROVIDER_BINARY_NAME,
      "--target",
      PROVIDER_TARGET,
    ],
    repoRoot,
    "cargo lambda build",
  );

  const targetDir = process.env.CARGO_TARGET_DIR ?? join(repoRoot, "rust", "target");
  const bootstrap = join(targetDir, "lambda", PROVIDER_BINARY_NAME, "bootstrap");
  if (!existsSync(bootstrap)) {
    throw new Error(`Provider binary not found after build: ${bootstrap}`);
  }
  return bootstrap;
}

function resolveBinary(envName, fallback, label) {
  const candidate = process.env[envName] ?? fallback;
  assertExecutable(candidate, label, `Set ${envName} to its path.`);
  return candidate;
}

function assertExecutable(path, label, hint = "") {
  if (!existsSync(path)) {
    throw new Error(`${label} binary not found at ${path}. ${hint}`.trim());
  }
  try {
    accessSync(path, constants.X_OK);
  } catch {
    throw new Error(`${label} binary at ${path} is not executable. ${hint}`.trim());
  }
}

async function waitForTcp(host, port, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await tcpProbe(host, port)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`${label} did not start listening on ${host}:${port} within ${timeoutMs}ms`);
}

function tcpProbe(host, port) {
  return new Promise((resolveProbe) => {
    const socket = new Socket();
    const settled = (result) => {
      socket.destroy();
      resolveProbe(result);
    };
    socket.setTimeout(1000);
    socket.once("connect", () => settled(true));
    socket.once("timeout", () => settled(false));
    socket.once("error", () => settled(false));
    socket.connect(port, host);
  });
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitForMinio(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/minio/health/live`);
      if (response.ok) {
        return;
      }
    } catch {
      // Not up yet.
    }
    await sleep(250);
  }
  throw new Error(`MinIO did not become healthy on port ${port} within ${timeoutMs}ms`);
}

function captureOutput(stream, buffer, limit = 4 * 1024 * 1024) {
  stream.on("data", (chunk) => {
    if (buffer.length < limit) {
      buffer.push(chunk);
    }
  });
}

function outputTail(buffer, lines = 40) {
  const text = Buffer.concat(buffer).toString("utf8");
  const trimmed = text.split("\n").filter(Boolean);
  return trimmed.slice(-lines).join("\n");
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  await exited;
}

async function seedMock(s3) {
  await s3.send(new CreateBucketCommand({ Bucket: SOURCE_BUCKET }));
  await s3.send(new CreateBucketCommand({ Bucket: DESTINATION_BUCKET }));
  await s3.send(
    new PutObjectCommand({
      Bucket: SOURCE_BUCKET,
      Key: SOURCE_OBJECT_KEY,
      Body: buildSourceZip(SMOKE_ENTRIES),
    }),
  );
  await s3.send(
    new PutObjectCommand({
      Bucket: SOURCE_BUCKET,
      Key: SOURCE_OBJECT_KEY_V2,
      Body: buildSourceZip(SMOKE_UPDATE_ENTRIES),
    }),
  );
  // A stale object the deployment must remove, and an `index.html` the
  // deployment must overwrite with different bytes.
  await s3.send(
    new PutObjectCommand({
      Bucket: DESTINATION_BUCKET,
      Key: "index.html",
      Body: "stale home page",
    }),
  );
  await s3.send(
    new PutObjectCommand({ Bucket: DESTINATION_BUCKET, Key: "stale.txt", Body: "must be deleted" }),
  );
}

async function deployedDestination(s3) {
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: DESTINATION_BUCKET }));
  const objects = [];
  for (const object of listed.Contents ?? []) {
    const key = object.Key;
    const body = await s3.send(new GetObjectCommand({ Bucket: DESTINATION_BUCKET, Key: key }));
    objects.push({ key, body: Buffer.from(await body.Body.transformToByteArray()) });
  }
  return objects;
}

function assertDeployed(entries, objects) {
  const expected = expectedDestinationKeys(entries);
  const actual = objects.map((object) => object.key).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Destination objects do not match the deployment outcome.\n` +
        `Expected keys: ${JSON.stringify(expected)}\n` +
        `Actual keys:   ${JSON.stringify(actual)}`,
    );
  }

  for (const entry of entries) {
    const expectedBody = Buffer.from(String(entry.content), "utf8");
    const object = objects.find((candidate) => candidate.key === entry.path);
    if (!object?.body?.equals(expectedBody)) {
      throw new Error(
        `Object bytes do not match for ${entry.path}.\n` +
          `Expected ${expectedBody.length} bytes, got ${object?.body.length ?? 0} bytes.`,
      );
    }
  }
}

async function main() {
  const minioBin = resolveBinary("MINIO_BIN", "minio", "MinIO");
  const rieBin = resolveBinary("RIE_BIN", "aws-lambda-rie", "Runtime Interface Emulator");
  const providerBin = process.env.PROVIDER_BIN ?? buildProvider();
  assertExecutable(providerBin, "Provider");

  const workDir = mkdtempSync(join(tmpdir(), "shin-provider-smoke-"));
  const minioData = join(workDir, "minio-data");
  const eventPath = join(workDir, "event.json");
  const minioLog = [];
  const rieLog = [];
  let minio;
  let rie;

  try {
    console.log(`Scratch directory: ${workDir}`);
    console.log(`Provider binary: ${providerBin}`);
    runOrThrow(minioBin, ["--version"], repoRoot, "MinIO version");

    const mockEnv = {
      ...process.env,
      MINIO_BROWSER: "off",
      MINIO_ROOT_USER: SMOKE_ACCESS_KEY,
      MINIO_ROOT_PASSWORD: SMOKE_SECRET_KEY,
      MINIO_REGION: "us-east-1",
    };
    minio = spawn(
      minioBin,
      ["server", minioData, "--address", `127.0.0.1:${MINIO_PORT}`, "--quiet"],
      { env: mockEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    captureOutput(minio.stdout, minioLog);
    captureOutput(minio.stderr, minioLog);
    await waitForMinio(MINIO_PORT, 30_000);
    console.log(`MinIO is healthy on port ${MINIO_PORT}`);

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint: `http://127.0.0.1:${MINIO_PORT}`,
      forcePathStyle: true,
      credentials: { accessKeyId: SMOKE_ACCESS_KEY, secretAccessKey: SMOKE_SECRET_KEY },
    });
    await seedMock(s3);
    console.log(
      `Seeded ${SOURCE_BUCKET}/${SOURCE_OBJECT_KEY} and ${DESTINATION_BUCKET} (stale + overwrite targets)`,
    );

    writeFileSync(eventPath, `${JSON.stringify(buildCreateEvent(), null, 2)}\n`, "utf8");

    const providerEnv = {
      ...process.env,
      AWS_ACCESS_KEY_ID: SMOKE_ACCESS_KEY,
      AWS_SECRET_ACCESS_KEY: SMOKE_SECRET_KEY,
      AWS_REGION: "us-east-1",
      AWS_DEFAULT_REGION: "us-east-1",
      AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${MINIO_PORT}`,
      AWS_LAMBDA_FUNCTION_MEMORY_SIZE: "1024",
      AWS_LAMBDA_FUNCTION_TIMEOUT: "900",
      // The CloudFormation callback requires HTTPS to a validated AWS host,
      // so it cannot succeed locally. Pin HTTPS to a dead proxy so the
      // expected callback failure never leaves the machine. The mock S3
      // endpoint is plain HTTP on loopback and is not proxied.
      HTTPS_PROXY: `http://127.0.0.1:${DEAD_PROXY_PORT}`,
      https_proxy: `http://127.0.0.1:${DEAD_PROXY_PORT}`,
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    };
    rie = spawn(rieBin, [providerBin], { env: providerEnv, stdio: ["ignore", "pipe", "pipe"] });
    captureOutput(rie.stdout, rieLog);
    captureOutput(rie.stderr, rieLog);
    await waitForTcp("127.0.0.1", RIE_PORT, 30_000, "Runtime Interface Emulator");
    console.log(`Runtime Interface Emulator is listening on port ${RIE_PORT}`);

    /**
     * Invokes the real provider once and asserts it logged a successful
     * deployment summary for that invocation.
     *
     * Each phase asserts against only the log produced after it started, so a
     * later phase cannot pass on an earlier phase's summary — the whole point
     * of running three of them through one emulator.
     */
    async function invokePhase(label, event) {
      const logMark = rieLog.length;
      const invoke = await fetch(
        `http://127.0.0.1:${RIE_PORT}/2015-03-31/functions/function/invocations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(180_000),
        },
      );
      const invokeBody = await invoke.text();
      console.log(`${label} invoke response: HTTP ${invoke.status}`);
      console.log(outputTail([Buffer.from(invokeBody)], 10));

      // Give the emulator a moment to flush the provider's logs.
      await sleep(1000);
      const phaseLog = outputTail(rieLog.slice(logMark));
      if (!phaseLog.includes("shin deployment summary")) {
        throw new Error(
          `The provider did not log a deployment summary for ${label}. ` +
            `See the RIE output:\n${phaseLog}`,
        );
      }
      // The summary is emitted as a quoted tracing field, so the raw log carries the
      // JSON with escaped quotes (\"deploymentStatus\":\"success\"). Unescape before
      // matching rather than asserting against the unescaped shape, which never appears.
      if (!phaseLog.replace(/\\"/g, '"').includes('"deploymentStatus":"success"')) {
        throw new Error(
          `The provider deployment summary for ${label} did not report success. ` +
            `See the RIE output:\n${phaseLog}`,
        );
      }
      return phaseLog;
    }

    await invokePhase("Create", buildCreateEvent());
    const created = await deployedDestination(s3);
    assertDeployed(SMOKE_ENTRIES, created);
    console.log(
      `Create: ${created.length} objects deployed with the expected keys and bytes; ` +
        "seeded stale object deleted; overwrite replaced.",
    );

    // Update against a second archive. `index.html` is overwritten with new
    // bytes, `assets/app.js` becomes stale and must be deleted, and
    // `about.html` is new. This is the stale-deletion path that previously ran
    // only under opt-in AWS verification.
    await invokePhase(
      "Update",
      buildEvent({
        requestType: "Update",
        sourceObjectKeys: [SOURCE_OBJECT_KEY_V2],
        oldSourceObjectKeys: [SOURCE_OBJECT_KEY],
        physicalResourceId: SMOKE_PHYSICAL_RESOURCE_ID,
      }),
    );
    const updated = await deployedDestination(s3);
    assertDeployed(SMOKE_UPDATE_ENTRIES, updated);
    console.log(
      `Update: ${updated.length} objects; "assets/app.js" deleted as stale, ` +
        '"about.html" added, "index.html" replaced with the new bytes.',
    );

    // Delete with `OnDelete.DeleteCurrentObjects` enabled: the destructive
    // path, which must empty the destination namespace it owns.
    await invokePhase(
      "Delete",
      buildEvent({
        requestType: "Delete",
        sourceObjectKeys: [SOURCE_OBJECT_KEY_V2],
        physicalResourceId: SMOKE_PHYSICAL_RESOURCE_ID,
        deleteCurrentObjectsOnDelete: true,
      }),
    );
    const remaining = await deployedDestination(s3);
    if (remaining.length !== 0) {
      throw new Error(
        "Delete with deleteCurrentObjects must empty the destination. Remaining keys: " +
          JSON.stringify(remaining.map((object) => object.key).sort()),
      );
    }
    console.log("Delete: destination emptied as required by onDelete.deleteCurrentObjects.");

    console.log(
      "PASS: Create, Update, and Delete each ran through the real provider binary " +
        "with the expected S3 side effects and a successful deployment summary.",
    );
    console.log(
      "The CloudFormation callback failed as expected (HTTPS callback host cannot be reached " +
        "locally); the S3 side effects are the assertion.",
    );
  } catch (error) {
    if (minioLog.length > 0) {
      console.error(`--- MinIO output tail ---\n${outputTail(minioLog)}`);
    }
    if (rieLog.length > 0) {
      console.error(`--- Runtime Interface Emulator output tail ---\n${outputTail(rieLog)}`);
    }
    throw error;
  } finally {
    await Promise.all([stopProcess(rie), stopProcess(minio)]);
    if (process.env.SMOKE_KEEP !== "1") {
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
