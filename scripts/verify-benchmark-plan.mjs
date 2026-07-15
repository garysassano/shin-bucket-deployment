import { createHash } from "node:crypto";
import {
  benchmarkConfigurationSha256,
  parseBenchmarkRunOptions,
} from "../dist/benchmarks/src/config.js";
import { createBenchmarkPlan } from "../dist/benchmarks/src/plan.js";
import { validateMethodologyV2Run } from "../dist/benchmarks/src/validation.js";

const runId = "00000000-0000-4000-a000-000000000001";
const options = parseBenchmarkRunOptions([
  "--config",
  "benchmarks/configs/methodology-v2-1024-32.json",
  "--run-id",
  runId,
]);
const plan = createBenchmarkPlan(options);
const expectedSamples = 5 * (2 + 2);
if (plan.length !== expectedSamples) {
  throw new Error(
    `Canonical benchmark plan has ${plan.length} samples; expected ${expectedSamples}.`,
  );
}
if (plan.some((sample) => sample.implementation === "aws" && sample.parallel !== null)) {
  throw new Error("Canonical upstream samples must use parallel=null.");
}
if (new Set(plan.map((sample) => sample.sampleId)).size !== plan.length) {
  throw new Error("Canonical benchmark sample IDs are not unique.");
}

const records = plan.flatMap((sample) =>
  options.phases.map((phase) => {
    const shin = sample.implementation === "shin";
    const archiveSha256 = shin ? "a".repeat(64) : "b".repeat(64);
    return {
      resultSchemaVersion: 2,
      methodologyVersion: 2,
      runId,
      sampleId: sample.sampleId,
      snapshotDate: options.snapshotDate,
      decisionRunId: null,
      comparisonVariant: null,
      repetition: sample.repetition,
      benchmarkConfigSha256: benchmarkConfigurationSha256(options),
      assetManifestSha256: assetManifestSha256(sample.assetProfile, phase.assetState),
      dependencyLockSha256: "1".repeat(64),
      applicationBuildSha256: "2".repeat(64),
      installedDependenciesSha256: "7".repeat(64),
      nodeVersion: "v24.0.0",
      pnpmVersion: "11.0.0",
      executionEnvironmentSha256: "8".repeat(64),
      sourceTreeSha256: "3".repeat(64),
      providerImplementationCommit: shin ? "9".repeat(40) : null,
      providerImplementationSubject: shin ? "subject" : null,
      providerPackageName:
        sample.implementation === "shin" ? "shin-bucket-deployment" : "aws-cdk-lib",
      providerPackageVersion: "1.0.0",
      providerArchitecture: shin ? "arm64" : "x86_64",
      providerRuntime: shin ? "provided.al2023" : "python3.13",
      providerHandler: shin ? "bootstrap" : "index.handler",
      providerCodeSha256: Buffer.from(archiveSha256, "hex").toString("base64"),
      providerBootstrapSha256: shin ? "a".repeat(64) : null,
      providerBootstrapArchiveSha256: shin ? archiveSha256 : null,
      providerBootstrapProvenanceSha256: shin ? "4".repeat(64) : null,
      providerBootstrapBuildDirty: shin ? false : null,
      providerBootstrapCargoVersion: shin ? "cargo 1.0.0" : null,
      providerBootstrapRustcVersion: shin ? "rustc 1.0.0" : null,
      providerBootstrapCargoLambdaVersion: shin ? "cargo-lambda 1.0.0" : null,
      providerBootstrapZigVersion: shin ? "1.0.0" : null,
      providerBootstrapBuildToolchainSha256: shin ? "6".repeat(64) : null,
      providerBootstrapBuildEnvironmentSha256: shin ? "5".repeat(64) : null,
      gitDirty: false,
      cdkCliVersion: "1.0.0",
      cdkCliInstalledSha256: "c".repeat(64),
      awsCdkLibVersion: "1.0.0",
      awsCdkLibIntegrity: "sha512-test",
      awsCdkLibInstalledSha256: "d".repeat(64),
      constructsInstalledSha256: "e".repeat(64),
      executionEnvironmentFresh: true,
      memoryMeasurementScope: "phase-local",
      region: options.region,
      implementation: sample.implementation,
      profile: sample.assetProfile,
      memoryMb: sample.memoryMb,
      parallel: sample.parallel,
      phase: phase.name,
      state: phase.assetState,
      fileCount: 1,
      totalBytes: 1,
      cdkDeploySeconds: 1,
      localWallSeconds: 1,
      providerDurationSeconds: 1,
      billedDurationSeconds: 1,
      initDurationSeconds: 0.1,
      maxMemoryMb: 1,
      providerInvoked: true,
      cleanup: "all benchmark stacks destroyed",
      resultDocumentationCommit: null,
      notes: null,
      providerSummary: shin
        ? providerSummary(sample.memoryMb, sample.parallel, phase.name === "cold-create")
        : null,
    };
  }),
);
validateMethodologyV2Run(records, options);
console.log(`Verified canonical methodology-v2 dry-run plan and ${records.length} complete cells.`);

function providerSummary(memoryMb, parallel, create) {
  const zeroFields = (names) => Object.fromEntries(names.map((name) => [name, 0]));
  return {
    event: "shin_deployment_summary",
    schemaVersion: 3,
    requestType: create ? "Create" : "Update",
    deploymentStatus: "success",
    extract: true,
    destinationChecksumStrategy: "sse-s3-etag",
    deleteStaleObjectsOnDeployment: true,
    availableMemoryMb: memoryMb,
    maxParallelTransfers: parallel,
    durationMs: 1,
    phaseMs: zeroFields([
      "plan",
      "destinationList",
      "transfer",
      "delete",
      "cloudfront",
      "oldPrefixDelete",
      "callback",
    ]),
    counts: {
      ...zeroFields([
        "sourceArchives",
        "plannedEntries",
        "filteredEntries",
        "markerEntries",
        "destinationObjects",
        "destinationMetadataRetained",
        "destinationPageObjectsHighWater",
        "deleteObjects",
        "deleteBatches",
        "uploadedObjects",
        "skippedObjects",
        "conditionalConflicts",
        "copiedObjects",
        "md5HashAttempts",
        "md5Skips",
        "catalogSkips",
      ]),
      plannedEntries: 1,
      skippedObjects: 1,
    },
    bytes: zeroFields(["sourceZip", "uploaded", "copied"]),
    transfer: zeroFields([
      "scheduledObjects",
      "completedObjects",
      "failedObjects",
      "cancelledObjects",
      "panickedObjects",
      "inFlightHighWater",
    ]),
    markerReplacement: {
      strategy: "planning-plus-retryable-stream",
      semantics: "leftmost-longest-non-recursive",
      plannedPassesPerUpload: 2,
      planningPasses: 0,
      uploadPasses: 0,
    },
    catalog: zeroFields([
      "trustedArchives",
      "untrustedArchives",
      "trustedEntries",
      "fallbackHashAttempts",
      "sparseSkips",
    ]),
    source: zeroFields([
      "plannedBlocks",
      "plannedBytes",
      "fetchedBlocks",
      "fetchedBytes",
      "getAttempts",
      "getRetries",
      "getThrottledAttempts",
      "getRetryableErrors",
      "getPermanentErrors",
      "getRequestErrors",
      "getBodyErrors",
      "getShortBodyErrors",
      "getErrors",
      "blockHits",
      "blockMisses",
      "blockRefetches",
      "blockWaits",
      "blockWaitsFetching",
      "blockWaitsCapacity",
      "replayClaims",
      "replayClaimsAfterRelease",
      "replayClaimsAfterFailure",
      "bodyAttempts",
      "bodyReplays",
      "activeGetsHighWater",
      "activeReadersHighWater",
      "residentBytesHighWater",
      "globalBudgetBytes",
      "globalResidentBytesCurrent",
      "globalResidentBytesHighWater",
    ]),
    putObject: zeroFields([
      "wireAttempts",
      "failedAttempts",
      "retryAttempts",
      "throttledAttempts",
      "retryWaitMs",
      "throttleCooldownWaits",
      "throttleCooldownWaitMs",
    ]),
    deleteObject: zeroFields([
      "sdkCalls",
      "failedCalls",
      "requestedObjects",
      "inferredDeletedObjects",
      "unconfirmedObjects",
      "noSuchBucketRequestedIdentifiers",
    ]),
    callback: {
      wireAttempts: 1,
      failedAttempts: 0,
      retryAttempts: 0,
      confirmedResponses: 1,
    },
  };
}

function assetManifestSha256(profile, state) {
  return createHash("sha256").update(`${profile}\0${state}`).digest("hex");
}
