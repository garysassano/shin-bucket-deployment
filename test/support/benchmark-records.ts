import { createHash } from "node:crypto";
import type { BenchmarkRunOptions } from "../../benchmarks/src/config";
import { benchmarkConfigurationSha256 } from "../../benchmarks/src/config";
import type { createBenchmarkPlan } from "../../benchmarks/src/plan";

/**
 * A complete, valid canonical benchmark run record. Every required field carries a
 * placeholder that passes `benchmarkRunRecordErrors`, so tests override only the
 * fields they actually assert on.
 */
export function canonicalRunRecord(
  options: BenchmarkRunOptions,
  implementation: "shin" | "aws",
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const shin = implementation === "shin";
  const archiveSha256 = shin ? "a".repeat(64) : "b".repeat(64);
  return {
    runId: options.runId,
    implementation,
    snapshotDate: options.snapshotDate,
    region: options.region,
    cleanup: "destroyed",
    ...(options.decisionRunId ? { decisionRunId: options.decisionRunId } : {}),
    ...(options.comparisonVariant ? { comparisonVariant: options.comparisonVariant } : {}),
    config: {
      benchmarkConfigSha256: benchmarkConfigurationSha256(options),
      memoryMeasurementScope: "phase-local",
      repetitionParallelism: options.repetitionParallelism,
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
            codeSha256: codeSha256(archiveSha256),
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
            codeSha256: codeSha256(archiveSha256),
          },
        }),
    ...overrides,
  };
}

/** The canonical run ledger for both implementations of the given run options. */
export function canonicalRuns(options: BenchmarkRunOptions): Array<Record<string, unknown>> {
  return [canonicalRunRecord(options, "shin"), canonicalRunRecord(options, "aws")];
}

/**
 * A complete, valid canonical benchmark sample record. Every required field carries
 * a placeholder that passes `benchmarkSampleRecordErrors`, so tests override only
 * the fields they actually assert on.
 */
export function canonicalSampleRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const shin = (overrides.implementation ?? "shin") === "shin";
  return {
    runId: "00000000-0000-4000-a000-000000000001",
    sampleId: "00000000-0000-5000-a000-000000000001",
    implementation: shin ? "shin" : "aws",
    profile: "tiny-many",
    memoryMb: 1024,
    ...(shin ? { parallel: 32 } : {}),
    assetManifestSha256: "2".repeat(64),
    phase: "cold-create",
    state: "baseline",
    repetition: 1,
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
    ...(shin ? { providerSummary: providerSummary(1024, 32, true) } : {}),
    ...overrides,
  };
}

/** The canonical sample for one planned cell of a canonical run. */
export function canonicalRecord(
  options: BenchmarkRunOptions,
  sample: ReturnType<typeof createBenchmarkPlan>[number],
  phase: BenchmarkRunOptions["phases"][number],
) {
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
    ...(shin ? { detailedFailureDiagnostics: options.detailedFailureDiagnostics } : {}),
    ...(sample.sourceWindowBytes !== undefined && sample.sourceWindowBytes !== null
      ? { sourceWindowBytes: sample.sourceWindowBytes }
      : {}),
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
            sample.parallel as number,
            phase.name === "cold-create",
          ),
        }
      : {}),
  };
}

function zeroFields(names: readonly string[]): Record<string, number> {
  return Object.fromEntries(names.map((name) => [name, 0]));
}

export function providerSummary(memoryMb: number, parallel: number, create: boolean) {
  return {
    event: "shin_deployment_summary",
    requestType: create ? "Create" : "Update",
    deploymentStatus: "success",
    extract: true,
    deleteStaleObjectsOnDeployment: true,
    availableMemoryMb: memoryMb,
    maxParallelTransfers: parallel,
    detailedFailureDiagnosticsEnabled: true,
    durationMs: 1,
    phaseMs: zeroFields([
      "plan",
      "planSourceHeads",
      "planCatalog",
      "planDirectory",
      "planEntries",
      "planValidation",
      "destinationList",
      "transfer",
      "transferTaskTotal",
      "transferPrepare",
      "transferPutWait",
      "transferPrepareSourceWait",
      "transferPutSourceWait",
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
      spooledUploads: 0,
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
      "retryAttempts",
      "throttledAttempts",
      "throttleCooldownWaits",
      "throttleCooldownWaitMs",
    ]),
    callback: {
      wireAttempts: 1,
      failedAttempts: 0,
      retryAttempts: 0,
      confirmedResponses: 1,
    },
  };
}

export function assetManifestSha256(profile: string, state: string): string {
  return createHash("sha256").update(`${profile}\0${state}`).digest("hex");
}

export function codeSha256(hexDigest: string): string {
  return Buffer.from(hexDigest, "hex").toString("base64");
}
