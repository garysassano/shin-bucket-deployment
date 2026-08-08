import { createHash } from "node:crypto";
import {
  benchmarkConfigurationSha256,
  parseBenchmarkRunOptions,
} from "../dist/benchmarks/src/config.js";
import { createBenchmarkPlan } from "../dist/benchmarks/src/plan.js";
import { validateCompleteCanonicalRun } from "../dist/benchmarks/src/validation.js";

const runId = "00000000-0000-4000-a000-000000000001";
const options = parseBenchmarkRunOptions([
  "--config",
  "benchmarks/configs/canonical.json",
  "--run-id",
  runId,
]);
const plan = createBenchmarkPlan(options);
const expectedSamples = 5 * (3 + 3);
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

const runs = ["shin", "aws"].map((implementation) => canonicalRunRecord(options, implementation));
const samples = plan.flatMap((sample) =>
  options.phases.map((phase) => canonicalSampleRecord(options, sample, phase)),
);
validateCompleteCanonicalRun({ runs, samples, options });
console.log(
  `Verified canonical five-repetition dry-run plan and ${samples.length} complete cells.`,
);

function canonicalRunRecord(options, implementation) {
  const shin = implementation === "shin";
  const archiveSha256 = shin ? "a".repeat(64) : "b".repeat(64);
  return {
    runId: options.runId,
    implementation,
    snapshotDate: options.snapshotDate,
    region: options.region,
    cleanup: "destroyed",
    config: {
      benchmarkConfigSha256: benchmarkConfigurationSha256(options),
      memoryMeasurementScope: "phase-local",
    },
    environment: {
      nodeVersion: "v24.0.0",
      pnpmVersion: "11.0.0",
      executionEnvironmentSha256: "8".repeat(64),
      executionEnvironmentFresh: true,
      dependencyLockSha256: "1".repeat(64),
      installedDependenciesSha256: "7".repeat(64),
      applicationBuildSha256: "2".repeat(64),
      sourceTreeSha256: "3".repeat(64),
      gitDirty: false,
    },
    cdk: {
      cliVersion: "1.0.0",
      cliInstalledSha256: "c".repeat(64),
      libVersion: "1.0.0",
      libInstalledSha256: "d".repeat(64),
      constructsInstalledSha256: "e".repeat(64),
    },
    ...(shin
      ? {
          provider: {
            implementationCommit: "9".repeat(40),
            packageVersion: "1.0.0",
            architecture: "arm64",
            runtime: "provided.al2023",
            handler: "bootstrap",
            codeSha256: Buffer.from(archiveSha256, "hex").toString("base64"),
            bootstrap: {
              sha256: "a".repeat(64),
              archiveSha256,
              provenanceSha256: "4".repeat(64),
              buildDirty: false,
              cargoVersion: "cargo 1.0.0",
              rustcVersion: "rustc 1.0.0",
              cargoLambdaVersion: "cargo-lambda 1.0.0",
              zigVersion: "1.0.0",
              buildToolchainSha256: "6".repeat(64),
              buildEnvironmentSha256: "5".repeat(64),
            },
          },
        }
      : {
          provider: {
            packageVersion: "1.0.0",
            architecture: "x86_64",
            runtime: "python3.13",
            handler: "index.handler",
            codeSha256: Buffer.from(archiveSha256, "hex").toString("base64"),
          },
        }),
  };
}

function canonicalSampleRecord(options, sample, phase) {
  const shin = sample.implementation === "shin";
  return {
    runId: options.runId,
    sampleId: sample.sampleId,
    implementation: sample.implementation,
    profile: sample.assetProfile,
    memoryMb: sample.memoryMb,
    ...(shin ? { parallel: sample.parallel } : {}),
    assetManifestSha256: assetManifestSha256(sample.assetProfile, phase.assetState),
    phase: phase.name,
    state: phase.assetState,
    repetition: sample.repetition,
    fileCount: 1,
    totalBytes: 1,
    ...(shin ? { detailedFailureDiagnostics: true } : {}),
    cdkDeploySeconds: 1,
    localWallSeconds: 1,
    providerDurationSeconds: 1,
    billedDurationSeconds: 1,
    initDurationSeconds: 0.1,
    maxMemoryMb: 1,
    providerInvoked: true,
    ...(shin
      ? {
          providerSummary: providerSummary(
            sample.memoryMb,
            sample.parallel,
            phase.name === "cold-create",
          ),
        }
      : {}),
  };
}

function providerSummary(memoryMb, parallel, create) {
  const zeroFields = (names) => Object.fromEntries(names.map((name) => [name, 0]));
  return {
    event: "shin_deployment_summary",
    requestType: create ? "Create" : "Update",
    deploymentStatus: "success",
    extract: true,
    deleteStaleObjectsOnDeployment: true,
    availableMemoryMb: memoryMb,
    maxParallelTransfers: parallel,
    detailedFailureDiagnosticsEnabled: true,
    durationMs: 1000,
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
      "globalReleaseAnomalies",
    ]),
    putObject: {
      ...zeroFields([
        "wireAttempts",
        "failedAttempts",
        "retryAttempts",
        "throttledAttempts",
        "retryWaitMs",
        "throttleCooldownWaits",
        "throttleCooldownWaitMs",
      ]),
      failuresBySdkErrorKind: {},
      failuresByServiceCode: {},
      failureStates: [],
      failureStateOverflowAttempts: 0,
    },
    copyObject: zeroFields([
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
