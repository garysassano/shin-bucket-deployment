import { createHash } from "node:crypto";
import { AwsVerificationApi, type ObjectMetadata, type VerificationApi } from "./aws";
import { requiredOutput, stackOutputs } from "./outputs";

const FIXTURE_INDEX = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ShinBucketDeployment</title>
  </head>
  <body>
    <main>fixture</main>
  </body>
</html>
`;
const FIXTURE_APP = "console.log('fixture');\n";
const LARGE_OBJECT_BYTES = 24 * 1024 * 1024;
const LARGE_OBJECT_SHA256 = "6d7551af71d07d02c91d2824824b0a111a2546c9fd66467c426a745a56f9f866";
const INFO_ZIP_BYTES = 196;
const INFO_ZIP_SHA256 = "dea0ccf95b561cc7f336e7fb60f8903c97e9d455a085e00483b08384ed61cb81";
const CLOUD_FRONT_ATTEMPTS = 30;
const CLOUD_FRONT_POLL_MS = 10_000;

type ScenarioContext = {
  readonly stackName: string;
  readonly scenarioName: string;
  readonly outputs: Record<string, string>;
  readonly api: VerificationApi;
};

type ScenarioAssertion = (context: ScenarioContext) => Promise<void>;

export async function verifyScenarioState(
  stackName: string,
  scenarioName: string,
  outputsFile: string,
  api: VerificationApi = new AwsVerificationApi(),
): Promise<void> {
  const assertion = SCENARIO_ASSERTIONS[scenarioName];
  if (!assertion) {
    throw new Error(`No object-state assertions are defined for scenario ${scenarioName}.`);
  }
  await assertion({ stackName, scenarioName, outputs: stackOutputs(outputsFile, stackName), api });
}

export async function assertObjectBody(
  api: VerificationApi,
  bucket: string,
  key: string,
  expected: string,
): Promise<void> {
  const actual = Buffer.from(await api.getObject(bucket, key)).toString("utf8");
  if (actual !== expected) {
    throw new Error(`Destination object ${key} did not match the expected scenario state.`);
  }
}

export async function assertObjectMissing(
  api: VerificationApi,
  bucket: string,
  key: string,
): Promise<void> {
  const keys = await api.listObjects(bucket, key);
  if (keys.includes(key)) {
    throw new Error(`Destination object ${key} should be absent.`);
  }
}

export async function assertExactKeys(
  api: VerificationApi,
  bucket: string,
  prefix: string,
  expected: readonly string[],
): Promise<void> {
  const actual = [...(await api.listObjects(bucket, prefix))].sort();
  const sortedExpected = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    throw new Error(`Destination prefix ${prefix || "/"} did not contain the exact expected keys.`);
  }
}

export async function assertObjectMetadata(
  api: VerificationApi,
  bucket: string,
  key: string,
  expected: ObjectMetadata,
): Promise<void> {
  const actual = await api.headObject(bucket, key);
  for (const [name, value] of Object.entries(expected)) {
    if (actual[name as keyof ObjectMetadata] !== value) {
      throw new Error(`Destination object ${key} had unexpected ${name}.`);
    }
  }
}

export function expectedScenarioNames(): readonly string[] {
  return Object.keys(SCENARIO_ASSERTIONS);
}

const SCENARIO_ASSERTIONS: Readonly<Record<string, ScenarioAssertion>> = {
  simple: fixtureScenario("site"),
  "root-prefix": async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await assertExactKeys(api, bucket, "", ["app.js", "index.html", "runtime/root-prefix.txt"]);
    await Promise.all([
      assertFixtureBodies(api, bucket, ""),
      assertObjectBody(
        api,
        bucket,
        "runtime/root-prefix.txt",
        "deployed-without-destination-prefix\n",
      ),
    ]);
  },
  "marker-replacement": verifyMarkerReplacement,
  filters: async ({ stackName, outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await assertExactKeys(api, bucket, "filtered-site/", [
      "filtered-site/index.html",
      "filtered-site/runtime/probe.txt",
    ]);
    await Promise.all([
      assertObjectBody(api, bucket, "filtered-site/index.html", FIXTURE_INDEX),
      assertObjectBody(
        api,
        bucket,
        "filtered-site/runtime/probe.txt",
        `stack=${stackName}\nregion=${region()}\nmode=include-exclude`,
      ),
      assertObjectMissing(api, bucket, "filtered-site/app.js"),
    ]);
  },
  "source-overwrite-order": singleObjectScenario(
    "BucketName",
    "multi-source/",
    "multi-source/runtime/overlap.txt",
    "second-source\n",
  ),
  "external-zips": async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await assertExactKeys(api, bucket, "external/", [
      "external/info-zip/index.html",
      "external/python-force-zip64/index.html",
    ]);
    await Promise.all([
      assertObjectBody(api, bucket, "external/info-zip/index.html", "info-zip external archive\n"),
      assertObjectMetadata(api, bucket, "external/info-zip/index.html", {
        contentType: "text/html",
      }),
      assertObjectBody(
        api,
        bucket,
        "external/python-force-zip64/index.html",
        "python force_zip64 external archive\n",
      ),
      assertObjectMetadata(api, bucket, "external/python-force-zip64/index.html", {
        contentType: "text/html",
      }),
    ]);
  },
  "co-tenant-protection-initial": coTenantScenario("initial"),
  "co-tenant-protection-updated": coTenantScenario("updated"),
  "child-parent-retention-initial": childParentScenario("initial", false),
  "child-parent-retention-updated": childParentScenario("updated", false),
  "child-parent-cleanup-initial": childParentScenario("initial", true),
  "child-parent-cleanup-updated": childParentScenario("updated", true),
  "cross-bucket-change-initial": crossBucketScenario("initial"),
  "cross-bucket-change-updated": crossBucketScenario("updated"),
  "stale-object-cleanup-initial": staleCleanupScenario("initial"),
  "stale-object-cleanup-updated": staleCleanupScenario("updated"),
  "stale-object-retention-initial": staleRetentionScenario("initial"),
  "stale-object-retention-updated": staleRetentionScenario("updated"),
  "default-retention-initial": defaultRetentionScenario("initial"),
  "default-retention-updated": defaultRetentionScenario("updated"),
  "default-retention-bucket-only": defaultRetentionScenario("updated"),
  "extract-false": async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const prefix = `${requiredOutput(outputs, "DestinationPrefix")}/`;
    const sourceKey = requiredOutput(outputs, "ObjectKeys");
    const basename = sourceKey.split("/").at(-1);
    if (!basename) {
      throw new Error("The direct-copy scenario returned an invalid source archive key.");
    }
    const key = `${prefix}${basename}`;
    await assertExactKeys(api, bucket, prefix, [key]);
    const body = Buffer.from(await api.getObject(bucket, key));
    if (body.length !== INFO_ZIP_BYTES || sha256(body) !== INFO_ZIP_SHA256) {
      throw new Error("The direct-copy archive did not match its expected length and digest.");
    }
    await assertObjectMetadata(api, bucket, key, {
      contentLength: INFO_ZIP_BYTES,
      contentType: "application/zip",
    });
  },
  "object-deletion-initial": singleObjectScenario(
    "BucketName",
    "cleanup/",
    "cleanup/runtime/current.txt",
    "phase=initial\n",
  ),
  "object-deletion-updated": async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await Promise.all([
      assertExactKeys(api, bucket, "cleanup/", ["cleanup/updated/runtime/current.txt"]),
      assertObjectBody(api, bucket, "cleanup/updated/runtime/current.txt", "phase=updated\n"),
      assertObjectMissing(api, bucket, "cleanup/runtime/current.txt"),
    ]);
  },
  "object-deletion-bucket-only": async ({ outputs, api }) => {
    await assertExactKeys(api, requiredOutput(outputs, "BucketName"), "cleanup/", []);
  },
  "replacement-safety-initial": replacementSafetyScenario("initial"),
  "replacement-safety-updated": replacementSafetyScenario("updated"),
  "large-archive": async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const key = requiredOutput(outputs, "LargeObjectKey");
    await assertExactKeys(api, bucket, "large-archive/", [
      "large-archive/.generated.json",
      "large-archive/assets/large.bin",
      "large-archive/index.html",
    ]);
    const body = Buffer.from(await api.getObject(bucket, key));
    if (body.length !== LARGE_OBJECT_BYTES || sha256(body) !== LARGE_OBJECT_SHA256) {
      throw new Error("The large ranged-read object did not match its expected length and digest.");
    }
    await Promise.all([
      assertObjectBody(
        api,
        bucket,
        "large-archive/.generated.json",
        '{\n  "fileCount": 2,\n  "largeFileBytes": 25165824\n}\n',
      ),
      assertObjectBody(
        api,
        bucket,
        "large-archive/index.html",
        "<!doctype html><title>large archive verification</title>\n",
      ),
    ]);
  },
  "kms-destination": encryptionScenario(
    "kms-site/runtime/kms.txt",
    "encrypted-by-bucket-default-kms-key\n",
    "aws:kms",
    "xlkRCTCTstRHhaJVMhHeXT7S4opbHEH82f+DUeU1sLI=",
    ["kms-site/app.js", "kms-site/index.html", "kms-site/runtime/kms.txt"],
  ),
  "kms-managed-destination": encryptionScenario(
    "kms-managed-site/runtime/kms-managed.txt",
    "encrypted-by-aws-managed-s3-key\n",
    "aws:kms",
    "l9AgkZn9JIfdB92qd1kabqygO900YlyzotW/CxtFjuk=",
  ),
  "dsse-managed-destination": encryptionScenario(
    "dsse-managed-site/runtime/dsse-managed.txt",
    "encrypted-by-managed-dsse\n",
    "aws:kms:dsse",
    "wpHYQjkJVk4+CR7F989LE4Y3aRQ7wBPN9Pk4XfcduTE=",
  ),
  "handler-isolation": async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const keys = ["shared/first", "shared/second", "isolated/first", "isolated/second"];
    await assertExactKeys(
      api,
      bucket,
      "",
      keys.map((prefix) => `${prefix}/value.txt`),
    );
    await Promise.all(
      keys.map((prefix) => assertObjectBody(api, bucket, `${prefix}/value.txt`, `${prefix}\n`)),
    );
  },
  "cloudfront-sync-initial": cloudFrontScenario("sync", "initial"),
  "cloudfront-sync-updated": cloudFrontScenario("sync", "updated"),
  "cloudfront-async-initial": cloudFrontScenario("async", "initial"),
  "cloudfront-async-updated": cloudFrontScenario("async", "updated"),
};

function fixtureScenario(prefix: string): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await assertExactKeys(api, bucket, `${prefix}/`, [`${prefix}/app.js`, `${prefix}/index.html`]);
    await assertFixtureBodies(api, bucket, prefix);
  };
}

async function assertFixtureBodies(
  api: VerificationApi,
  bucket: string,
  prefix: string,
): Promise<void> {
  const keyPrefix = prefix ? `${prefix}/` : "";
  await Promise.all([
    assertObjectBody(api, bucket, `${keyPrefix}app.js`, FIXTURE_APP),
    assertObjectBody(api, bucket, `${keyPrefix}index.html`, FIXTURE_INDEX),
    assertObjectMetadata(api, bucket, `${keyPrefix}index.html`, { contentType: "text/html" }),
  ]);
}

function singleObjectScenario(
  outputName: string,
  prefix: string,
  key: string,
  body: string,
): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, outputName);
    await Promise.all([
      assertExactKeys(api, bucket, prefix, [key]),
      assertObjectBody(api, bucket, key, body),
    ]);
  };
}

async function verifyMarkerReplacement({
  stackName,
  outputs,
  api,
}: ScenarioContext): Promise<void> {
  const bucket = requiredOutput(outputs, "BucketName");
  const special = requiredOutput(outputs, "SpecialJsonTokenValue");
  const json = JSON.stringify({
    stackName,
    region: region(),
    bucketName: bucket,
    message: "jsonData without escape",
    repeatedRegion: region(),
    specialValue: special,
  });
  const escapedJson = JSON.stringify({
    stackName,
    region: region(),
    bucketName: bucket,
    message: "jsonData with escape",
    repeatedRegion: region(),
    specialValue: special,
  });
  await assertExactKeys(api, bucket, "site/", [
    "site/app.js",
    "site/index.html",
    "site/runtime/config.yaml",
    "site/runtime/escaped.json",
    "site/runtime/from-data-escaped.json",
    "site/runtime/from-data-raw.json",
    "site/runtime/plain.txt",
    "site/runtime/raw.json",
  ]);
  await Promise.all([
    assertFixtureBodies(api, bucket, "site"),
    assertObjectBody(
      api,
      bucket,
      "site/runtime/plain.txt",
      `stack=${stackName}\nregion=${region()}\nregion-again=${region()}\nbucket=${bucket}`,
    ),
    assertObjectBody(api, bucket, "site/runtime/raw.json", json),
    assertObjectBody(api, bucket, "site/runtime/escaped.json", escapedJson),
    assertObjectBody(
      api,
      bucket,
      "site/runtime/from-data-raw.json",
      `{"specialValue":"${special}"}`,
    ),
    assertObjectBody(
      api,
      bucket,
      "site/runtime/from-data-escaped.json",
      JSON.stringify({ specialValue: special }),
    ),
    assertObjectBody(
      api,
      bucket,
      "site/runtime/config.yaml",
      `stackName: ${stackName}\nregion: ${region()}\nbucketName: ${bucket}\nmessage: yaml replacement is active\nrepeatedRegion: ${region()}\n`,
    ),
  ]);
}

function coTenantScenario(phase: "initial" | "updated"): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await assertExactKeys(api, bucket, "", ["root.txt", "tenant/protected.txt"]);
    await Promise.all([
      assertObjectBody(api, bucket, "root.txt", `phase=${phase}\n`),
      assertObjectBody(api, bucket, "tenant/protected.txt", "tenant=protected\n"),
    ]);
  };
}

function childParentScenario(phase: "initial" | "updated", cleanup: boolean): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    if (phase === "initial") {
      await assertExactKeys(api, bucket, "site/", [
        "site/initial/current.txt",
        "site/initial/obsolete.txt",
      ]);
      await Promise.all([
        assertObjectBody(api, bucket, "site/initial/current.txt", "state=current\nphase=initial\n"),
        assertObjectBody(api, bucket, "site/initial/obsolete.txt", "state=obsolete\n"),
      ]);
      return;
    }
    const expectedKeys = ["site/initial/current.txt", "site/parent.txt"];
    if (!cleanup) expectedKeys.push("site/initial/obsolete.txt");
    await assertExactKeys(api, bucket, "site/", expectedKeys);
    await Promise.all([
      assertObjectBody(api, bucket, "site/initial/current.txt", "state=current\nphase=updated\n"),
      assertObjectBody(api, bucket, "site/parent.txt", "state=parent\n"),
      cleanup
        ? assertObjectMissing(api, bucket, "site/initial/obsolete.txt")
        : assertObjectBody(api, bucket, "site/initial/obsolete.txt", "state=obsolete\n"),
    ]);
  };
}

function crossBucketScenario(phase: "initial" | "updated"): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const previous = requiredOutput(outputs, "PreviousBucketName");
    const current = requiredOutput(outputs, "CurrentBucketName");
    if (phase === "initial") {
      await Promise.all([
        assertExactKeys(api, previous, "site/previous/", [
          "site/previous/current.txt",
          "site/previous/obsolete.txt",
        ]),
        assertExactKeys(api, current, "site/current/", []),
        assertObjectBody(api, previous, "site/previous/current.txt", "bucket=previous\n"),
        assertObjectBody(api, previous, "site/previous/obsolete.txt", "state=obsolete\n"),
      ]);
      return;
    }
    await Promise.all([
      assertExactKeys(api, previous, "site/previous/", []),
      assertExactKeys(api, current, "site/current/", ["site/current/current.txt"]),
      assertObjectBody(api, current, "site/current/current.txt", "bucket=current\n"),
    ]);
  };
}

function staleCleanupScenario(phase: "initial" | "updated"): ScenarioAssertion {
  return async ({ stackName, outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const keys = [
      "stale-cleanup-site/app.js",
      "stale-cleanup-site/index.html",
      "stale-cleanup-site/runtime/current.txt",
    ];
    if (phase === "initial") keys.push("stale-cleanup-site/runtime/legacy.txt");
    await assertExactKeys(api, bucket, "stale-cleanup-site/", keys);
    await Promise.all([
      assertFixtureBodies(api, bucket, "stale-cleanup-site"),
      assertObjectBody(
        api,
        bucket,
        "stale-cleanup-site/runtime/current.txt",
        `stack=${stackName}\nphase=${phase}\nstate=${phase === "initial" ? "current-and-legacy-exist" : "legacy-should-be-deleted"}`,
      ),
    ]);
    await (phase === "initial"
      ? assertObjectBody(
          api,
          bucket,
          "stale-cleanup-site/runtime/legacy.txt",
          "remove this by deploying stale-object-cleanup-updated",
        )
      : assertObjectMissing(api, bucket, "stale-cleanup-site/runtime/legacy.txt"));
  };
}

function staleRetentionScenario(phase: "initial" | "updated"): ScenarioAssertion {
  return async ({ stackName, outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    await assertExactKeys(api, bucket, "stale-retention-site/", [
      "stale-retention-site/app.js",
      "stale-retention-site/index.html",
      "stale-retention-site/runtime/current.txt",
      "stale-retention-site/runtime/retained-stale.txt",
    ]);
    await Promise.all([
      assertFixtureBodies(api, bucket, "stale-retention-site"),
      assertObjectBody(
        api,
        bucket,
        "stale-retention-site/runtime/current.txt",
        `stack=${stackName}\nphase=${phase}\nstate=${phase === "initial" ? "stale-object-retention-seed" : "stale-object-cleanup-disabled"}`,
      ),
      assertObjectBody(
        api,
        bucket,
        "stale-retention-site/runtime/retained-stale.txt",
        "this remains after the updated phase\n",
      ),
    ]);
  };
}

function defaultRetentionScenario(phase: "initial" | "updated"): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const initialBody = "phase=initial\nstate=retain-previous-prefix-on-update";
    const keys = [
      "retain-initial/app.js",
      "retain-initial/index.html",
      "retain-initial/runtime/current.txt",
    ];
    if (phase === "updated") {
      keys.push(
        "retain-updated/app.js",
        "retain-updated/index.html",
        "retain-updated/runtime/current.txt",
      );
    }
    await assertExactKeys(api, bucket, "retain-", keys);
    await Promise.all([
      assertFixtureBodies(api, bucket, "retain-initial"),
      assertObjectBody(api, bucket, "retain-initial/runtime/current.txt", initialBody),
    ]);
    if (phase === "updated") {
      await Promise.all([
        assertFixtureBodies(api, bucket, "retain-updated"),
        assertObjectBody(
          api,
          bucket,
          "retain-updated/runtime/current.txt",
          "phase=updated\nstate=retain-previous-prefix-and-delete",
        ),
      ]);
    }
  };
}

function replacementSafetyScenario(phase: "initial" | "updated"): ScenarioAssertion {
  return async (context) => {
    const bucket = requiredOutput(context.outputs, "BucketName");
    await Promise.all([
      assertExactKeys(context.api, bucket, "replacement-safe/", [
        "replacement-safe/runtime/replacement.txt",
      ]),
      assertObjectBody(
        context.api,
        bucket,
        "replacement-safe/runtime/replacement.txt",
        `phase=${phase}\n`,
      ),
    ]);
    await verifyDestinationMoveMatrix(context, phase);
  };
}

async function verifyDestinationMoveMatrix(
  { outputs, api }: ScenarioContext,
  phase: "initial" | "updated",
): Promise<void> {
  for (const shape of ["child-parent", "parent-child", "sibling", "cross-bucket"] as const) {
    for (const cleanup of [false, true]) {
      const mode = cleanup ? "cleanup" : "retain";
      const base = `matrix/${shape}/${mode}`;
      const oldBucket = requiredOutput(
        outputs,
        shape === "cross-bucket" ? "MoveMatrixPreviousBucketName" : "MoveMatrixSharedBucketName",
      );
      const newBucket = requiredOutput(
        outputs,
        shape === "cross-bucket" ? "MoveMatrixCurrentBucketName" : "MoveMatrixSharedBucketName",
      );
      const oldPrefix = previousPrefix(shape, base);
      const currentKey = `${oldPrefix}/current.txt`;
      const obsoleteKey = `${oldPrefix}/obsolete.txt`;
      if (phase === "initial") {
        await Promise.all([
          assertObjectBody(api, oldBucket, currentKey, moveBody(shape, cleanup, "phase=initial")),
          assertObjectBody(api, oldBucket, obsoleteKey, moveBody(shape, cleanup, "state=obsolete")),
        ]);
        continue;
      }
      await assertObjectBody(
        api,
        newBucket,
        `${currentPrefix(shape, base)}/current.txt`,
        moveBody(shape, cleanup, "phase=updated"),
      );
      await Promise.all(
        cleanup
          ? [
              assertObjectMissing(api, oldBucket, currentKey),
              assertObjectMissing(api, oldBucket, obsoleteKey),
            ]
          : [
              assertObjectBody(
                api,
                oldBucket,
                currentKey,
                moveBody(shape, cleanup, "phase=initial"),
              ),
              assertObjectBody(
                api,
                oldBucket,
                obsoleteKey,
                moveBody(shape, cleanup, "state=obsolete"),
              ),
            ],
      );
    }
  }
  await assertDestinationMoveKeySets(outputs, api, phase);
}

async function assertDestinationMoveKeySets(
  outputs: Record<string, string>,
  api: VerificationApi,
  phase: "initial" | "updated",
): Promise<void> {
  const sharedKeys: string[] = [];
  const previousKeys: string[] = [];
  const currentKeys: string[] = [];
  for (const shape of ["child-parent", "parent-child", "sibling", "cross-bucket"] as const) {
    for (const cleanup of [false, true]) {
      const base = `matrix/${shape}/${cleanup ? "cleanup" : "retain"}`;
      const oldPrefix = previousPrefix(shape, base);
      const currentPrefixValue = currentPrefix(shape, base);
      const destination = shape === "cross-bucket" ? currentKeys : sharedKeys;
      const previous = shape === "cross-bucket" ? previousKeys : sharedKeys;
      if (phase === "initial" || !cleanup) {
        previous.push(`${oldPrefix}/current.txt`, `${oldPrefix}/obsolete.txt`);
      }
      if (phase === "updated") destination.push(`${currentPrefixValue}/current.txt`);
    }
  }
  await Promise.all([
    assertExactKeys(
      api,
      requiredOutput(outputs, "MoveMatrixSharedBucketName"),
      "matrix/",
      sharedKeys,
    ),
    assertExactKeys(
      api,
      requiredOutput(outputs, "MoveMatrixPreviousBucketName"),
      "matrix/",
      previousKeys,
    ),
    assertExactKeys(
      api,
      requiredOutput(outputs, "MoveMatrixCurrentBucketName"),
      "matrix/",
      currentKeys,
    ),
  ]);
}

function encryptionScenario(
  key: string,
  body: string,
  serverSideEncryption: string,
  checksumSha256: string,
  expectedKeys: readonly string[] = [key],
): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const prefix = `${key.split("/")[0]}/`;
    await Promise.all([
      assertExactKeys(api, bucket, prefix, expectedKeys),
      ...(expectedKeys.length > 1
        ? [assertFixtureBodies(api, bucket, key.split("/")[0] ?? "")]
        : []),
      assertObjectBody(api, bucket, key, body),
      assertObjectMetadata(api, bucket, key, {
        contentLength: Buffer.byteLength(body),
        checksumSha256,
        checksumType: "FULL_OBJECT",
        serverSideEncryption,
      }),
    ]);
  };
}

function cloudFrontScenario(
  mode: "sync" | "async",
  phase: "initial" | "updated",
): ScenarioAssertion {
  return async ({ outputs, api }) => {
    const bucket = requiredOutput(outputs, "BucketName");
    const url = requiredOutput(outputs, "CloudFrontCacheProbeUrl");
    const token = requiredOutput(outputs, "CurrentCacheProbeToken");
    const expectedToken = `${mode}-${phase}`;
    if (token !== expectedToken) {
      throw new Error("The CloudFront scenario output did not contain its expected phase token.");
    }
    await assertExactKeys(api, bucket, "site/", [
      "site/app.js",
      "site/index.html",
      "site/runtime/cache-probe.json",
    ]);
    await assertFixtureBodies(api, bucket, "site");
    const s3Body = JSON.parse(
      Buffer.from(await api.getObject(bucket, "site/runtime/cache-probe.json")).toString("utf8"),
    ) as Record<string, unknown>;
    if (
      s3Body.cacheProbeToken !== expectedToken ||
      s3Body.bucketName !== bucket ||
      s3Body.distributionId !== requiredOutput(outputs, "DistributionId")
    ) {
      throw new Error("The S3 CloudFront probe did not contain the expected deployed state.");
    }
    await waitForCloudFrontBody(
      api,
      url,
      expectedToken,
      phase === "updated" && mode === "sync" ? 1 : CLOUD_FRONT_ATTEMPTS,
    );
    if (phase === "initial") {
      // Prime the exact long-TTL cache key a second time before the ordered update phase.
      await waitForCloudFrontBody(api, url, expectedToken, 1);
    }
  };
}

async function waitForCloudFrontBody(
  api: VerificationApi,
  url: string,
  expectedToken: string,
  attempts = CLOUD_FRONT_ATTEMPTS,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const body = await api.fetchText(url);
    const parsed = JSON.parse(body) as Record<string, unknown>;
    if (parsed.cacheProbeToken === expectedToken) return;
    if (attempt + 1 < attempts) await api.sleep(CLOUD_FRONT_POLL_MS);
  }
  throw new Error("CloudFront did not serve the expected cache-probe token within the deadline.");
}

function moveBody(
  shape: string,
  cleanup: boolean,
  state: "phase=initial" | "phase=updated" | "state=obsolete",
): string {
  return `move=${shape}\ncleanup=${cleanup ? "cleanup" : "retain"}\n${state}\n`;
}

function previousPrefix(shape: string, base: string): string {
  if (shape === "child-parent") return `${base}/child`;
  if (shape === "parent-child") return base;
  if (shape === "sibling") return `${base}/left`;
  return `${base}/previous`;
}

function currentPrefix(shape: string, base: string): string {
  if (shape === "child-parent") return base;
  if (shape === "parent-child") return `${base}/child`;
  if (shape === "sibling") return `${base}/right`;
  return `${base}/current`;
}

function region(): string {
  const value = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (!value) throw new Error("AWS_REGION is required for scenario verification.");
  return value;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

if (require.main === module) {
  const scenarioName = option("--scenario-name");
  verifyScenarioState(option("--stack-name"), scenarioName, option("--outputs-file"))
    .then(() => console.log(`Scenario ${scenarioName} object-state assertions passed.`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
