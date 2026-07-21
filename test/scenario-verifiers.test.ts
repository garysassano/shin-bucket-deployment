import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { grantVerifierRead } from "../scenarios/apps/verification-access";
import {
  VERIFY_DEFAULT_GROUPS,
  VERIFY_DESTROY_ORDER,
  VERIFY_SCENARIOS,
} from "../scenarios/catalog";
import type { ObjectMetadata, VerificationApi } from "../scenarios/verifiers/aws";
import { bucketListingProvesAbsence } from "../scenarios/verifiers/aws";
import { requiredOutput, stackOutputs } from "../scenarios/verifiers/outputs";
import { expectedScenarioNames, verifyScenarioState } from "../scenarios/verifiers/scenario-state";
import { verifyStackAbsent } from "../scenarios/verifiers/stack-absent";

const STACK_NAME = "VerificationStack";
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

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("scenario state verifier", () => {
  it("defines an assertion for every cataloged verification phase", () => {
    expect(expectedScenarioNames()).toEqual(Object.keys(VERIFY_SCENARIOS));
    expect(
      Object.values(VERIFY_SCENARIOS).every(
        ({ postDeployVerifier, postDestroyVerifier, grantVerifierRead }) =>
          postDeployVerifier === "scenario-state.js" &&
          postDestroyVerifier === "stack-absent.js" &&
          grantVerifierRead === true,
      ),
    ).toBe(true);
  });

  it("places every cataloged phase in exactly one default execution group", () => {
    const groupedNames = VERIFY_DEFAULT_GROUPS.flatMap((group) => [...group]);
    expect(new Set(groupedNames).size).toBe(groupedNames.length);
    expect([...groupedNames].sort()).toEqual(Object.keys(VERIFY_SCENARIOS).sort());
    expect(VERIFY_DESTROY_ORDER).toEqual(VERIFY_DEFAULT_GROUPS.map((group) => group.at(-1)));
  });

  it("fails a successful deployment when an exact object body is wrong", async () => {
    const api = new FakeVerificationApi();
    api.putObject("destination", "site/app.js", "console.log('fixture');\n");
    api.putObject("destination", "site/index.html", FIXTURE_INDEX, {
      contentType: "text/html",
    });
    const outputs = outputsFile({ BucketName: "destination" });

    await expect(verifyScenarioState(STACK_NAME, "simple", outputs, api)).resolves.toBeUndefined();

    api.putObject("destination", "site/app.js", "deployed but incorrect\n");
    await expect(verifyScenarioState(STACK_NAME, "simple", outputs, api)).rejects.toThrow(
      "did not match the expected scenario state",
    );
  });

  it("matches raw, escaped, data, and YAML marker serialization exactly", async () => {
    vi.stubEnv("AWS_REGION", "eu-central-1");
    const api = new FakeVerificationApi();
    putFixture(api, "destination", "site");
    const special = 'value with "quotes" and \\backslash';
    api.putObject(
      "destination",
      "site/runtime/plain.txt",
      `stack=${STACK_NAME}\nregion=${region()}\nregion-again=${region()}\nbucket=destination`,
    );
    api.putObject(
      "destination",
      "site/runtime/raw.json",
      `{"stackName":"${STACK_NAME}","region":"${region()}","bucketName":"destination","message":"jsonData without escape","repeatedRegion":"${region()}","specialValue":"${special}"}`,
    );
    api.putObject(
      "destination",
      "site/runtime/escaped.json",
      JSON.stringify({
        stackName: STACK_NAME,
        region: region(),
        bucketName: "destination",
        message: "jsonData with escape",
        repeatedRegion: region(),
        specialValue: special,
      }),
    );
    api.putObject(
      "destination",
      "site/runtime/from-data-raw.json",
      `{"specialValue":"${special}"}`,
    );
    api.putObject(
      "destination",
      "site/runtime/from-data-escaped.json",
      JSON.stringify({ specialValue: special }),
    );
    api.putObject(
      "destination",
      "site/runtime/config.yaml",
      `stackName: "${STACK_NAME}"\nregion: "${region()}"\nbucketName: "destination"\nmessage: yaml replacement is active\nrepeatedRegion: "${region()}"\n`,
    );
    const outputs = outputsFile({
      BucketName: "destination",
      SpecialJsonTokenValue: special,
    });

    await expect(
      verifyScenarioState(STACK_NAME, "marker-replacement", outputs, api),
    ).resolves.toBeUndefined();
  });

  it("checks the copied Info-ZIP archive key, length, digest, and content type", async () => {
    const api = new FakeVerificationApi();
    const archive = Buffer.from(
      readFileSync("rust/test-fixtures/external-zips/info-zip.zip.b64", "utf8").trim(),
      "base64",
    );
    api.putObject("destination", "archive/info-zip.zip", archive, {
      contentLength: 196,
      contentType: "application/zip",
    });
    const outputs = outputsFile({
      BucketName: "destination",
      DestinationPrefix: "archive",
      ObjectKeys: "asset-prefix/info-zip.zip",
    });

    await expect(
      verifyScenarioState(STACK_NAME, "extract-false", outputs, api),
    ).resolves.toBeUndefined();

    const corrupted = Buffer.from(archive);
    corrupted[0] = (corrupted[0] ?? 0) ^ 0xff;
    api.putObject("destination", "archive/info-zip.zip", corrupted, {
      contentLength: 196,
      contentType: "application/zip",
    });
    await expect(verifyScenarioState(STACK_NAME, "extract-false", outputs, api)).rejects.toThrow(
      "did not match its expected length and digest",
    );
  });

  it("checks encrypted object bodies and stored checksum metadata", async () => {
    const api = new FakeVerificationApi();
    const key = "kms-managed-site/runtime/kms-managed.txt";
    const body = "encrypted-by-aws-managed-s3-key\n";
    api.putObject("destination", key, body, {
      contentLength: Buffer.byteLength(body),
      checksumSha256: "l9AgkZn9JIfdB92qd1kabqygO900YlyzotW/CxtFjuk=",
      checksumType: "FULL_OBJECT",
      serverSideEncryption: "aws:kms",
    });
    const outputs = outputsFile({ BucketName: "destination" });

    await expect(
      verifyScenarioState(STACK_NAME, "kms-managed-destination", outputs, api),
    ).resolves.toBeUndefined();

    api.metadata.set(objectId("destination", key), {
      contentLength: Buffer.byteLength(body),
      checksumSha256: "wrong",
      checksumType: "FULL_OBJECT",
      serverSideEncryption: "aws:kms",
    });
    await expect(
      verifyScenarioState(STACK_NAME, "kms-managed-destination", outputs, api),
    ).rejects.toThrow("unexpected checksumSha256");
  });

  it("proves retained objects survive custom-resource deletion", async () => {
    const api = new FakeVerificationApi();
    putFixture(api, "destination", "retain-initial");
    api.putObject(
      "destination",
      "retain-initial/runtime/current.txt",
      "phase=initial\nstate=retain-previous-prefix-on-update",
    );
    putFixture(api, "destination", "retain-updated");
    api.putObject(
      "destination",
      "retain-updated/runtime/current.txt",
      "phase=updated\nstate=retain-previous-prefix-and-delete",
    );
    const outputs = outputsFile({ BucketName: "destination" });

    await expect(
      verifyScenarioState(STACK_NAME, "default-retention-bucket-only", outputs, api),
    ).resolves.toBeUndefined();

    api.objects.delete(objectId("destination", "retain-initial/runtime/current.txt"));
    await expect(
      verifyScenarioState(STACK_NAME, "default-retention-bucket-only", outputs, api),
    ).rejects.toThrow("did not contain the exact expected keys");
  });

  it("proves delete-on-Delete leaves the deployment namespace empty", async () => {
    const api = new FakeVerificationApi();
    const outputs = outputsFile({ BucketName: "destination" });

    await expect(
      verifyScenarioState(STACK_NAME, "object-deletion-bucket-only", outputs, api),
    ).resolves.toBeUndefined();

    api.putObject("destination", "cleanup/runtime/current.txt", "unexpected retained object");
    await expect(
      verifyScenarioState(STACK_NAME, "object-deletion-bucket-only", outputs, api),
    ).rejects.toThrow("did not contain the exact expected keys");
  });

  it("requires synchronous CloudFront updates to be fresh immediately", async () => {
    const api = cloudFrontApi("sync-updated");
    api.fetchResponses.push(JSON.stringify({ cacheProbeToken: "sync-initial" }));

    await expect(
      verifyScenarioState(
        STACK_NAME,
        "cloudfront-sync-updated",
        cloudFrontOutputs("sync-updated"),
        api,
      ),
    ).rejects.toThrow("within the deadline");
    expect(api.sleeps).toEqual([]);
  });

  it("polls bounded asynchronous CloudFront updates until fresh content is served", async () => {
    const api = cloudFrontApi("async-updated");
    api.fetchResponses.push(
      JSON.stringify({ cacheProbeToken: "async-initial" }),
      JSON.stringify({ cacheProbeToken: "async-updated" }),
    );

    await expect(
      verifyScenarioState(
        STACK_NAME,
        "cloudfront-async-updated",
        cloudFrontOutputs("async-updated"),
        api,
      ),
    ).resolves.toBeUndefined();
    expect(api.sleeps).toEqual([10_000]);
    expect(api.fetches).toEqual(["https://example.invalid/probe", "https://example.invalid/probe"]);
  });

  it("primes the same long-lived CloudFront URL twice in an initial phase", async () => {
    const api = cloudFrontApi("sync-initial");
    api.fetchResponses.push(
      JSON.stringify({ cacheProbeToken: "sync-initial" }),
      JSON.stringify({ cacheProbeToken: "sync-initial" }),
    );

    await expect(
      verifyScenarioState(
        STACK_NAME,
        "cloudfront-sync-initial",
        cloudFrontOutputs("sync-initial"),
        api,
      ),
    ).resolves.toBeUndefined();
    expect(api.fetches).toHaveLength(2);
  });

  it("rejects catalog names without an assertion", async () => {
    await expect(
      verifyScenarioState(STACK_NAME, "not-a-scenario", outputsFile({}), new FakeVerificationApi()),
    ).rejects.toThrow("No object-state assertions");
  });
});

describe("deployment output parsing", () => {
  it("accepts only string-valued outputs for the requested stack", () => {
    const path = outputsFile({ BucketName: "destination" });
    expect(stackOutputs(path, STACK_NAME)).toEqual({ BucketName: "destination" });
    expect(requiredOutput(stackOutputs(path, STACK_NAME), "BucketName")).toBe("destination");

    const invalidPath = rawOutputsFile({ [STACK_NAME]: { BucketName: 42 } });
    expect(() => stackOutputs(invalidPath, STACK_NAME)).toThrow("unexpected response shape");
    expect(() => requiredOutput({}, "BucketName")).toThrow("Stack output BucketName is missing");
  });
});

describe("cleanup verifier", () => {
  it("treats only an exact bucket listing 404 as proven absence", () => {
    expect(bucketListingProvesAbsence({ $metadata: { httpStatusCode: 404 } })).toBe(true);
    expect(bucketListingProvesAbsence({ $metadata: { httpStatusCode: 403 } })).toBe(false);
    expect(bucketListingProvesAbsence(new Error("network failure"))).toBe(false);
  });

  it("lets CloudFormation delete verifier bucket policies normally", () => {
    const stack = new Stack();
    const bucket = new Bucket(stack, "Destination");
    grantVerifierRead(
      bucket,
      undefined,
      "arn:aws:sts::111122223333:assumed-role/VerifierRole/workflow-session",
    );

    const policies = Template.fromStack(stack).findResources("AWS::S3::BucketPolicy");
    expect(Object.values(policies)).toHaveLength(1);
    expect(Object.values(policies)[0]).not.toHaveProperty("DeletionPolicy");
    expect(Object.values(policies)[0]).not.toHaveProperty("UpdateReplacePolicy");
  });

  it("checks the stack and every unique scoped bucket and distribution", async () => {
    const api = new FakeVerificationApi();
    const outputs = outputsFile({
      BucketName: "bucket-a",
      PreviousBucketName: "bucket-a",
      CurrentBucketName: "bucket-b",
      DistributionId: "distribution-a",
      PreviousDistributionId: "distribution-a",
      DistributionDomainName: "example.invalid",
    });

    await expect(verifyStackAbsent(STACK_NAME, outputs, api)).resolves.toBeUndefined();
    expect(api.absenceChecks).toEqual([
      "bucket:bucket-a",
      "bucket:bucket-b",
      "distribution:distribution-a",
    ]);
  });

  it("fails cleanup when a scoped resource still exists", async () => {
    const api = new FakeVerificationApi();
    api.presentBuckets.add("bucket-a");
    const outputs = outputsFile({ BucketName: "bucket-a" });

    await expect(verifyStackAbsent(STACK_NAME, outputs, api)).rejects.toThrow(
      "Simulated bucket still exists",
    );
  });

  it("can verify stack absence after a deployment failed before outputs were written", async () => {
    const api = new FakeVerificationApi();
    await expect(verifyStackAbsent(STACK_NAME, undefined, api)).resolves.toBeUndefined();
    expect(api.absenceChecks).toEqual([]);
  });

  it("fails when saved deployment outputs cannot be read", async () => {
    const invalidOutputs = rawOutputsFile({ WrongStack: {} });

    await expect(
      verifyStackAbsent(STACK_NAME, invalidOutputs, new FakeVerificationApi()),
    ).rejects.toThrow("unexpected response shape");
  });
});

class FakeVerificationApi implements VerificationApi {
  readonly objects = new Map<string, Uint8Array>();
  readonly metadata = new Map<string, ObjectMetadata>();
  readonly fetchResponses: string[] = [];
  readonly fetches: string[] = [];
  readonly sleeps: number[] = [];
  readonly absenceChecks: string[] = [];
  readonly presentBuckets = new Set<string>();
  readonly presentDistributions = new Set<string>();

  putObject(
    bucket: string,
    key: string,
    body: string | Uint8Array,
    metadata: ObjectMetadata = {},
  ): void {
    this.objects.set(objectId(bucket, key), typeof body === "string" ? Buffer.from(body) : body);
    this.metadata.set(objectId(bucket, key), metadata);
  }

  async getObject(bucket: string, key: string): Promise<Uint8Array> {
    const object = this.objects.get(objectId(bucket, key));
    if (!object) throw new Error(`Expected object to exist: ${bucket}/${key}`);
    return object;
  }

  async headObject(bucket: string, key: string): Promise<ObjectMetadata> {
    if (!this.objects.has(objectId(bucket, key))) {
      throw new Error(`Expected object to exist: ${bucket}/${key}`);
    }
    return this.metadata.get(objectId(bucket, key)) ?? {};
  }

  async listObjects(bucket: string, prefix = ""): Promise<readonly string[]> {
    const bucketPrefix = `${bucket}\0`;
    return [...this.objects.keys()]
      .filter((id) => id.startsWith(bucketPrefix))
      .map((id) => id.slice(bucketPrefix.length))
      .filter((key) => key.startsWith(prefix));
  }

  async fetchText(url: string): Promise<string> {
    this.fetches.push(url);
    const response = this.fetchResponses.shift();
    if (response === undefined) throw new Error("No simulated CloudFront response remains.");
    return response;
  }

  async sleep(milliseconds: number): Promise<void> {
    this.sleeps.push(milliseconds);
  }

  async assertBucketAbsent(bucket: string): Promise<void> {
    this.absenceChecks.push(`bucket:${bucket}`);
    if (this.presentBuckets.has(bucket)) throw new Error("Simulated bucket still exists.");
  }

  async assertDistributionAbsent(distributionId: string): Promise<void> {
    this.absenceChecks.push(`distribution:${distributionId}`);
    if (this.presentDistributions.has(distributionId)) {
      throw new Error("Simulated distribution still exists.");
    }
  }
}

function objectId(bucket: string, key: string): string {
  return `${bucket}\0${key}`;
}

function outputsFile(outputs: Record<string, string>): string {
  return rawOutputsFile({ [STACK_NAME]: outputs });
}

function rawOutputsFile(value: unknown): string {
  const directory = temporaryDirectory();
  const path = join(directory, "outputs.json");
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "shin-scenario-verifier-"));
  temporaryDirectories.push(directory);
  return directory;
}

function cloudFrontApi(token: string): FakeVerificationApi {
  const api = new FakeVerificationApi();
  putFixture(api, "destination", "site");
  api.putObject(
    "destination",
    "site/runtime/cache-probe.json",
    JSON.stringify({
      cacheProbeToken: token,
      bucketName: "destination",
      distributionId: "distribution",
    }),
  );
  return api;
}

function putFixture(api: FakeVerificationApi, bucket: string, prefix: string): void {
  api.putObject(bucket, `${prefix}/app.js`, "console.log('fixture');\n");
  api.putObject(bucket, `${prefix}/index.html`, FIXTURE_INDEX, { contentType: "text/html" });
}

function cloudFrontOutputs(token: string): string {
  return outputsFile({
    BucketName: "destination",
    CloudFrontCacheProbeUrl: "https://example.invalid/probe",
    CurrentCacheProbeToken: token,
    DistributionId: "distribution",
  });
}

function region(): string {
  return process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "eu-central-1";
}
