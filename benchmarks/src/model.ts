import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const BENCHMARK_IMPLEMENTATIONS = ["shin", "aws"] as const;
export type BenchmarkImplementation = (typeof BENCHMARK_IMPLEMENTATIONS)[number];

export const BENCHMARK_ASSET_PROFILES = [
  "tiny-many",
  "mixed",
  "large-few",
  "marker-heavy",
  "multi-source-prune",
  "uncataloged",
  "copy-archives",
] as const;
export type BenchmarkAssetProfile = (typeof BENCHMARK_ASSET_PROFILES)[number];

/**
 * Whether a profile extracts its sources. `copy-archives` deploys each source archive as
 * a single copied object (`extract:false`), which is the only committed coverage of the
 * copy path and its destination `HeadObject` identity probe.
 */
export function profileExtractsSources(profile: string | null | undefined): boolean {
  return profile !== "copy-archives";
}

/**
 * Whether a profile's directory sources carry Shin's embedded catalog. `uncataloged`
 * mirrors `mixed` without one, so the untrusted comparison path stays measurable.
 */
export function profileUsesEmbeddedCatalog(profile: string | null | undefined): boolean {
  return profile !== "uncataloged";
}

export const BENCHMARK_ASSET_STATES = ["baseline", "changed", "pruned"] as const;
export type BenchmarkAssetState = (typeof BENCHMARK_ASSET_STATES)[number];

const BENCHMARK_PHASE_ORDER = [
  "cold-create",
  "unchanged-update",
  "no-change-redeploy",
  "changed-update",
  "pruned-update",
  "destroy",
] as const;

const PHASE_RANKS: ReadonlyMap<string, number> = new Map(
  BENCHMARK_PHASE_ORDER.map((phase, index) => [phase, index]),
);

export type ProviderSummary = {
  readonly event?: string | null;
  readonly requestType?: string | null;
  readonly deploymentStatus?: string | null;
  readonly extract?: boolean | null;
  readonly deleteStaleObjectsOnDeployment?: boolean | null;
  readonly availableMemoryMb?: number | null;
  readonly maxParallelTransfers?: number | null;
  readonly detailedFailureDiagnosticsEnabled?: boolean | null;
  readonly durationMs?: number | null;
  readonly phaseMs?: Record<string, number | null> | null;
  readonly counts?: Record<string, number | null> | null;
  readonly bytes?: Record<string, number | null> | null;
  readonly transfer?: Record<string, number | null> | null;
  readonly markerReplacement?: Record<string, string | number | null> | null;
  readonly catalog?: Record<string, number | null> | null;
  readonly source?: Record<string, number | null> | null;
  readonly putObject?: ProviderPutObjectSummary | null;
  readonly copyObject?: Record<string, number | null> | null;
  readonly deleteObject?: Record<string, number | null> | null;
  readonly callback?: Record<string, number | null> | null;
};

export type DiagnosticRange = {
  readonly min: number;
  readonly max: number;
  readonly total: number;
};

export type PutObjectFailureBody = {
  readonly attemptObserved: boolean;
  readonly replay: boolean;
  readonly producerStage: string;
  readonly finalFrameDelivered: boolean;
  readonly producerCompleted: boolean;
  readonly bodyErrorObserved: boolean;
  readonly receiverDropped: boolean;
  readonly receiverDropAbortedProducer: boolean;
  readonly attemptNumber: DiagnosticRange;
  readonly bytesEmitted: DiagnosticRange;
  readonly remainingBytes: DiagnosticRange;
};

export type PutObjectFailureSource = {
  readonly observed: boolean;
  readonly localWindowBytes: DiagnosticRange;
  readonly localCommittedBytes: DiagnosticRange;
  readonly localResidentBytes: DiagnosticRange;
  readonly localCapacityWaiters: DiagnosticRange;
  readonly globalBudgetBytes: DiagnosticRange;
  readonly globalResidentBytes: DiagnosticRange;
  readonly globalAvailablePermits: DiagnosticRange;
  readonly globalPermitUnitBytes: DiagnosticRange;
  readonly globalPermitWaiters: DiagnosticRange;
  readonly activeFetches: DiagnosticRange;
};

export type PutObjectFailureState = {
  readonly count: number;
  readonly sdkErrorKind: string;
  readonly dispatchFailureKind: string | null;
  readonly serviceCode: string | null;
  readonly elapsedMs: DiagnosticRange;
  readonly body: PutObjectFailureBody;
  readonly source: PutObjectFailureSource;
};

export type ProviderPutObjectSummary = Record<string, unknown> & {
  readonly wireAttempts?: number | null;
  readonly failedAttempts?: number | null;
  readonly retryAttempts?: number | null;
  readonly throttledAttempts?: number | null;
  readonly retryWaitMs?: number | null;
  readonly throttleCooldownWaits?: number | null;
  readonly throttleCooldownWaitMs?: number | null;
  readonly failuresBySdkErrorKind?: Record<string, number>;
  readonly failuresByServiceCode?: Record<string, number>;
  readonly failureStates?: PutObjectFailureState[];
  readonly failureStateOverflowAttempts?: number;
};

const PROVIDER_SUMMARY_SCALARS = {
  event: "string",
  requestType: "string",
  deploymentStatus: "string",
  extract: "boolean",
  deleteStaleObjectsOnDeployment: "boolean",
  availableMemoryMb: "number",
  maxParallelTransfers: "number",
  detailedFailureDiagnosticsEnabled: "boolean",
  durationMs: "number",
} as const;

const PROVIDER_SUMMARY_SECTIONS = {
  phaseMs: {
    plan: "number",
    destinationList: "number",
    transfer: "number",
    delete: "number",
    cloudfront: "number",
    oldPrefixDelete: "number",
    callback: "number",
  },
  counts: {
    sourceArchives: "number",
    plannedEntries: "number",
    filteredEntries: "number",
    markerEntries: "number",
    destinationObjects: "number",
    destinationMetadataRetained: "number",
    destinationPageObjectsHighWater: "number",
    deleteObjects: "number",
    deleteBatches: "number",
    uploadedObjects: "number",
    skippedObjects: "number",
    conditionalConflicts: "number",
    copiedObjects: "number",
    md5HashAttempts: "number",
    md5Skips: "number",
    catalogSkips: "number",
  },
  bytes: {
    sourceZip: "number",
    uploaded: "number",
    copied: "number",
  },
  transfer: {
    scheduledObjects: "number",
    completedObjects: "number",
    failedObjects: "number",
    cancelledObjects: "number",
    panickedObjects: "number",
    inFlightHighWater: "number",
  },
  markerReplacement: {
    strategy: "string",
    semantics: "string",
    plannedPassesPerUpload: "number",
    planningPasses: "number",
    uploadPasses: "number",
  },
  catalog: {
    trustedArchives: "number",
    untrustedArchives: "number",
    trustedEntries: "number",
    fallbackHashAttempts: "number",
    sparseSkips: "number",
  },
  source: {
    plannedBlocks: "number",
    plannedBytes: "number",
    fetchedBlocks: "number",
    fetchedBytes: "number",
    getAttempts: "number",
    getRetries: "number",
    getThrottledAttempts: "number",
    getRetryableErrors: "number",
    getPermanentErrors: "number",
    getRequestErrors: "number",
    getBodyErrors: "number",
    getShortBodyErrors: "number",
    getErrors: "number",
    blockHits: "number",
    blockMisses: "number",
    blockRefetches: "number",
    blockWaits: "number",
    blockWaitsFetching: "number",
    blockWaitsCapacity: "number",
    replayClaims: "number",
    replayClaimsAfterRelease: "number",
    replayClaimsAfterFailure: "number",
    bodyAttempts: "number",
    bodyReplays: "number",
    activeGetsHighWater: "number",
    activeReadersHighWater: "number",
    residentBytesHighWater: "number",
    globalBudgetBytes: "number",
    globalResidentBytesCurrent: "number",
    globalResidentBytesHighWater: "number",
    globalReleaseAnomalies: "number",
  },
  putObject: {
    wireAttempts: "number",
    failedAttempts: "number",
    retryAttempts: "number",
    throttledAttempts: "number",
    retryWaitMs: "number",
    throttleCooldownWaits: "number",
    throttleCooldownWaitMs: "number",
  },
  deleteObject: {
    sdkCalls: "number",
    failedCalls: "number",
    requestedObjects: "number",
    inferredDeletedObjects: "number",
    unconfirmedObjects: "number",
    noSuchBucketRequestedIdentifiers: "number",
  },
  callback: {
    wireAttempts: "number",
    failedAttempts: "number",
    retryAttempts: "number",
    confirmedResponses: "number",
  },
} as const;

/**
 * The `copyObject` section carries the CopyObject retry and throttle counters that
 * direct-copy (`extract:false`) deployments produce. It is validated by its own stage
 * rather than through `PROVIDER_SUMMARY_SECTIONS`, which drives the base shape loop.
 */
const PROVIDER_SUMMARY_COPY_SECTIONS = {
  copyObject: {
    wireAttempts: "number",
    failedAttempts: "number",
    retryAttempts: "number",
    throttledAttempts: "number",
    retryWaitMs: "number",
    throttleCooldownWaits: "number",
    throttleCooldownWaitMs: "number",
  },
} as const;

const PROVIDER_SUMMARY_ALL_SECTIONS = {
  ...PROVIDER_SUMMARY_SECTIONS,
  ...PROVIDER_SUMMARY_COPY_SECTIONS,
} as const;

const PROVIDER_SUMMARY_FIELDS = new Set([
  ...Object.keys(PROVIDER_SUMMARY_SCALARS),
  ...Object.keys(PROVIDER_SUMMARY_ALL_SECTIONS),
]);
const MAX_FAILURE_DIAGNOSTIC_LABELS = 32;
const MAX_FAILURE_DIAGNOSTIC_GROUPS = 32;
const DIAGNOSTIC_LABEL = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const SDK_ERROR_KINDS = new Set([
  "ConstructionFailure",
  "TimeoutError",
  "DispatchFailure",
  "ResponseError",
  "ServiceError",
  "SdkError",
]);
const DISPATCH_FAILURE_KINDS = new Set(["timeout", "io", "user", "other"]);
const PRODUCER_STAGES = new Set([
  "awaiting-first-poll",
  "reading-source",
  "final-frame-ready",
  "complete",
  "receiver-closed",
  "body-error",
  "not-observed",
]);

export type BenchmarkCleanupStatus = "destroyed" | "partial" | "failed";

export type BenchmarkRunConfig = {
  readonly benchmarkConfigSha256?: string | null;
  readonly memoryMeasurementScope?: "phase-local" | "cumulative" | null;
};

export type BenchmarkRunEnvironment = {
  readonly nodeVersion?: string | null;
  readonly pnpmVersion?: string | null;
  readonly executionEnvironmentSha256?: string | null;
  readonly executionEnvironmentFresh?: boolean | null;
  readonly dependencyLockSha256?: string | null;
  readonly installedDependenciesSha256?: string | null;
  readonly applicationBuildSha256?: string | null;
  readonly sourceTreeSha256?: string | null;
  readonly gitDirty?: boolean | null;
};

export type BenchmarkRunCdk = {
  readonly cliVersion?: string | null;
  readonly cliInstalledSha256?: string | null;
  readonly libVersion?: string | null;
  readonly libInstalledSha256?: string | null;
  readonly constructsInstalledSha256?: string | null;
};

export type BenchmarkRunProviderBootstrap = {
  readonly sha256?: string | null;
  readonly archiveSha256?: string | null;
  readonly provenanceSha256?: string | null;
  readonly buildDirty?: boolean | null;
  readonly cargoVersion?: string | null;
  readonly rustcVersion?: string | null;
  readonly cargoLambdaVersion?: string | null;
  readonly zigVersion?: string | null;
  readonly buildToolchainSha256?: string | null;
  readonly buildEnvironmentSha256?: string | null;
};

export type BenchmarkRunProvider = {
  readonly implementationCommit?: string | null;
  readonly packageVersion?: string | null;
  readonly architecture?: string | null;
  readonly runtime?: string | null;
  readonly handler?: string | null;
  readonly codeSha256?: string | null;
  readonly bootstrap?: BenchmarkRunProviderBootstrap | null;
};

/**
 * One record per (runId x implementation) in `benchmarks/runs.jsonl`: everything
 * constant across a run's samples, grouped instead of flat. Optional fields that
 * are absent are omitted rather than written as null.
 */
export type BenchmarkRunRecord = {
  readonly runId?: string | null;
  readonly implementation?: string | null;
  readonly snapshotDate?: string | null;
  readonly region?: string | null;
  readonly cleanup?: BenchmarkCleanupStatus | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly config?: BenchmarkRunConfig | null;
  readonly environment?: BenchmarkRunEnvironment | null;
  readonly cdk?: BenchmarkRunCdk | null;
  /** Both implementations carry a provider block; AWS keeps only the five
   * measured upstream-Lambda fields (packageVersion, architecture, runtime,
   * handler, codeSha256) and omits implementationCommit and bootstrap. */
  readonly provider?: BenchmarkRunProvider | null;
};

/**
 * One record per sample in `benchmarks/results.jsonl`: only what varies between
 * samples of the same run. Optional fields that are absent are omitted rather
 * than written as null.
 */
export type BenchmarkSampleRecord = {
  readonly runId?: string | null;
  readonly sampleId?: string | null;
  readonly implementation?: string | null;
  readonly profile?: string | null;
  readonly memoryMb?: number | null;
  readonly parallel?: number | null;
  readonly assetManifestSha256?: string | null;
  readonly phase?: string;
  readonly state?: string | null;
  readonly repetition?: number | null;
  readonly fileCount?: number | null;
  readonly totalBytes?: number | null;
  readonly detailedFailureDiagnostics?: boolean | null;
  readonly sourceWindowBytes?: number | null;
  readonly cdkDeploySeconds?: number | null;
  readonly localWallSeconds?: number | null;
  readonly providerDurationSeconds?: number | null;
  readonly billedDurationSeconds?: number | null;
  readonly initDurationSeconds?: number | null;
  readonly maxMemoryMb?: number | null;
  readonly providerInvoked?: boolean | null;
  /** Shin samples only; omitted for aws. */
  readonly providerSummary?: ProviderSummary | null;
};

export type BenchmarkSampleRow = {
  readonly line: number;
  readonly record: BenchmarkSampleRecord;
};

export type BenchmarkRunRow = {
  readonly line: number;
  readonly record: BenchmarkRunRecord;
};

/** A sample joined with its run record, used by the render pipeline. */
export type BenchmarkRunSample = BenchmarkSampleRecord & {
  readonly snapshotDate?: string | null;
  readonly region?: string | null;
  readonly cleanup?: BenchmarkCleanupStatus | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly config?: BenchmarkRunConfig | null;
  readonly environment?: BenchmarkRunEnvironment | null;
  readonly cdk?: BenchmarkRunCdk | null;
  readonly provider?: BenchmarkRunProvider | null;
};

/** The run ledger file that accompanies a sample ledger file. */
export function runsFileFor(resultsFile: string): string {
  return join(dirname(resultsFile), "runs.jsonl");
}

export function readBenchmarkRunRecords(filePath: string): BenchmarkRunRecord[] {
  return readJsonlRecords<BenchmarkRunRecord>(filePath).map((row) => row.record);
}

export function readBenchmarkRunRows(filePath: string): BenchmarkRunRow[] {
  return readJsonlRecords<BenchmarkRunRecord>(filePath);
}

export function readBenchmarkSampleRecords(filePath: string): BenchmarkSampleRecord[] {
  return readJsonlRecords<BenchmarkSampleRecord>(filePath).map((row) => row.record);
}

export function readBenchmarkSampleRows(filePath: string): BenchmarkSampleRow[] {
  return readJsonlRecords<BenchmarkSampleRecord>(filePath);
}

export function readBenchmarkEvidence(resultsFile: string): {
  readonly runs: BenchmarkRunRecord[];
  readonly samples: BenchmarkSampleRecord[];
} {
  return {
    runs: readBenchmarkRunRecords(runsFileFor(resultsFile)),
    samples: readBenchmarkSampleRecords(resultsFile),
  };
}

function readJsonlRecords<T>(filePath: string): Array<{ line: number; record: T }> {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, lineNumber }) => {
      try {
        return { line: lineNumber, record: JSON.parse(line) as T };
      } catch (cause) {
        throw new Error(`Invalid JSONL record at ${filePath}:${lineNumber}`, { cause });
      }
    });
}

export function benchmarkRunKey(run: Pick<BenchmarkRunRecord, "runId" | "implementation">): string {
  return [run.runId, run.implementation].join("\u0000");
}

export function benchmarkSampleKey(
  sample: Pick<BenchmarkSampleRecord, "runId" | "sampleId" | "phase">,
): string {
  return [sample.runId, sample.sampleId, sample.phase].join("\u0000");
}

export type BenchmarkRunRecordSource = {
  readonly runId?: string | null;
  readonly implementation?: string | null;
  readonly snapshotDate?: string | null;
  readonly region?: string | null;
  readonly cleanup?: BenchmarkCleanupStatus | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly benchmarkConfigSha256?: string | null;
  readonly memoryMeasurementScope?: "phase-local" | "cumulative" | null;
  readonly nodeVersion?: string | null;
  readonly pnpmVersion?: string | null;
  readonly executionEnvironmentSha256?: string | null;
  readonly executionEnvironmentFresh?: boolean | null;
  readonly dependencyLockSha256?: string | null;
  readonly installedDependenciesSha256?: string | null;
  readonly applicationBuildSha256?: string | null;
  readonly sourceTreeSha256?: string | null;
  readonly gitDirty?: boolean | null;
  readonly cdkCliVersion?: string | null;
  readonly cdkCliInstalledSha256?: string | null;
  readonly awsCdkLibVersion?: string | null;
  readonly awsCdkLibInstalledSha256?: string | null;
  readonly constructsInstalledSha256?: string | null;
  readonly provider?: BenchmarkRunProviderSource;
};

export type BenchmarkRunProviderSource = {
  readonly implementationCommit?: string | null;
  readonly packageVersion?: string | null;
  readonly architecture?: string | null;
  readonly runtime?: string | null;
  readonly handler?: string | null;
  readonly codeSha256?: string | null;
  readonly bootstrapSha256?: string | null;
  readonly bootstrapArchiveSha256?: string | null;
  readonly bootstrapProvenanceSha256?: string | null;
  readonly buildDirty?: boolean | null;
  readonly cargoVersion?: string | null;
  readonly rustcVersion?: string | null;
  readonly cargoLambdaVersion?: string | null;
  readonly zigVersion?: string | null;
  readonly buildToolchainSha256?: string | null;
  readonly buildEnvironmentSha256?: string | null;
};

export function benchmarkRunRecordFrom(source: BenchmarkRunRecordSource): BenchmarkRunRecord {
  const bootstrapMembers = {
    sha256: source.provider?.bootstrapSha256 ?? null,
    archiveSha256: source.provider?.bootstrapArchiveSha256 ?? null,
    provenanceSha256: source.provider?.bootstrapProvenanceSha256 ?? null,
    buildDirty: source.provider?.buildDirty ?? null,
    cargoVersion: source.provider?.cargoVersion ?? null,
    rustcVersion: source.provider?.rustcVersion ?? null,
    cargoLambdaVersion: source.provider?.cargoLambdaVersion ?? null,
    zigVersion: source.provider?.zigVersion ?? null,
    buildToolchainSha256: source.provider?.buildToolchainSha256 ?? null,
    buildEnvironmentSha256: source.provider?.buildEnvironmentSha256 ?? null,
  };
  return {
    runId: source.runId ?? null,
    implementation: source.implementation ?? null,
    snapshotDate: source.snapshotDate ?? null,
    region: source.region ?? null,
    cleanup: source.cleanup ?? null,
    ...(source.decisionRunId !== undefined && source.decisionRunId !== null
      ? { decisionRunId: source.decisionRunId }
      : {}),
    ...(source.comparisonVariant !== undefined && source.comparisonVariant !== null
      ? { comparisonVariant: source.comparisonVariant }
      : {}),
    config: {
      benchmarkConfigSha256: source.benchmarkConfigSha256 ?? null,
      memoryMeasurementScope: source.memoryMeasurementScope ?? null,
    },
    environment: {
      nodeVersion: source.nodeVersion ?? null,
      pnpmVersion: source.pnpmVersion ?? null,
      executionEnvironmentSha256: source.executionEnvironmentSha256 ?? null,
      executionEnvironmentFresh: source.executionEnvironmentFresh ?? null,
      dependencyLockSha256: source.dependencyLockSha256 ?? null,
      installedDependenciesSha256: source.installedDependenciesSha256 ?? null,
      applicationBuildSha256: source.applicationBuildSha256 ?? null,
      sourceTreeSha256: source.sourceTreeSha256 ?? null,
      gitDirty: source.gitDirty ?? null,
    },
    cdk: {
      cliVersion: source.cdkCliVersion ?? null,
      cliInstalledSha256: source.cdkCliInstalledSha256 ?? null,
      libVersion: source.awsCdkLibVersion ?? null,
      libInstalledSha256: source.awsCdkLibInstalledSha256 ?? null,
      constructsInstalledSha256: source.constructsInstalledSha256 ?? null,
    },
    ...(source.provider !== undefined && source.provider !== null
      ? {
          provider: omitNullMembers({
            implementationCommit: source.provider.implementationCommit ?? null,
            packageVersion: source.provider.packageVersion ?? null,
            architecture: source.provider.architecture ?? null,
            runtime: source.provider.runtime ?? null,
            handler: source.provider.handler ?? null,
            codeSha256: source.provider.codeSha256 ?? null,
            ...(Object.values(bootstrapMembers).some((value) => value !== null)
              ? { bootstrap: omitNullMembers(bootstrapMembers) }
              : {}),
          }),
        }
      : {}),
  };
}

/**
 * Drops null-valued members so the emitted record follows omit-when-absent.
 * AWS run records carry only the five measured provider fields; the shin-only
 * members (implementationCommit, bootstrap) stay absent instead of being
 * written as null.
 */
function omitNullMembers(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null && value !== undefined),
  );
}

/**
 * Maps the previous flat ledger cleanup wording onto the run-record cleanup enum.
 * `destroyed` means the automated runner verified every stack absent; `partial`
 * is the in-flight state; anything else is `failed`.
 */
export function cleanupStatusFrom(value: string | null | undefined): BenchmarkCleanupStatus {
  if (value === "all benchmark stacks destroyed") return "destroyed";
  if (value === "benchmark cleanup pending") return "partial";
  return "failed";
}

export function isCompleteBenchmarkRun(run: BenchmarkRunRecord): boolean {
  return run.cleanup === "destroyed";
}

export function isCanonicalBenchmarkRun(run: BenchmarkRunRecord): boolean {
  return benchmarkRunRecordErrors(run).length === 0;
}

export function isCanonicalBenchmarkSample(sample: BenchmarkSampleRecord): boolean {
  return benchmarkSampleRecordErrors(sample).length === 0;
}

export function benchmarkRunRecordErrors(run: BenchmarkRunRecord): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexSha256 = /^[0-9a-f]{64}$/i;
  const errors: string[] = [];
  const label = `${run.runId ?? "missing-run"}/${run.implementation ?? "missing-implementation"}`;
  const runFields = new Set([
    "runId",
    "implementation",
    "snapshotDate",
    "region",
    "cleanup",
    "decisionRunId",
    "comparisonVariant",
    "config",
    "environment",
    "cdk",
    "provider",
  ]);
  for (const name of Object.keys(run)) {
    if (!runFields.has(name)) errors.push(`${label}: unexpected run field ${name}`);
  }
  if (!uuid.test(run.runId ?? "")) errors.push(`${label}: runId must be a UUID`);
  if (!isBenchmarkImplementation(run.implementation)) {
    errors.push(`${label}: unsupported implementation`);
  }
  if (!isIsoDate(run.snapshotDate ?? "")) {
    errors.push(`${label}: snapshotDate must use YYYY-MM-DD`);
  }
  if (typeof run.region !== "string" || run.region.length === 0) {
    errors.push(`${label}: missing region`);
  }
  if (run.cleanup !== "destroyed" && run.cleanup !== "partial" && run.cleanup !== "failed") {
    errors.push(`${label}: cleanup must be destroyed, partial, or failed`);
  }
  for (const name of ["decisionRunId", "comparisonVariant"] as const) {
    const value = run[name];
    if (value !== undefined && value !== null && !/^[A-Za-z0-9._-]+$/.test(value)) {
      errors.push(`${label}: invalid ${name}`);
    }
  }
  const config = run.config;
  const configFields = new Set(["benchmarkConfigSha256", "memoryMeasurementScope"]);
  if (isObject(config)) {
    for (const name of Object.keys(config)) {
      if (!configFields.has(name)) errors.push(`${label}: unexpected config field ${name}`);
    }
  }
  if (!hexSha256.test(config?.benchmarkConfigSha256 ?? "")) {
    errors.push(`${label}: invalid benchmarkConfigSha256`);
  }
  if (
    config?.memoryMeasurementScope !== "phase-local" &&
    config?.memoryMeasurementScope !== "cumulative"
  ) {
    errors.push(`${label}: memoryMeasurementScope must be phase-local or cumulative`);
  }
  const environment = run.environment;
  const environmentFields = new Set([
    "nodeVersion",
    "pnpmVersion",
    "executionEnvironmentSha256",
    "executionEnvironmentFresh",
    "dependencyLockSha256",
    "installedDependenciesSha256",
    "applicationBuildSha256",
    "sourceTreeSha256",
    "gitDirty",
  ]);
  if (isObject(environment)) {
    for (const name of Object.keys(environment)) {
      if (!environmentFields.has(name)) {
        errors.push(`${label}: unexpected environment field ${name}`);
      }
    }
  }
  for (const name of ["nodeVersion", "pnpmVersion"] as const) {
    if (typeof environment?.[name] !== "string" || (environment?.[name] as string).length === 0) {
      errors.push(`${label}: missing ${name}`);
    }
  }
  for (const name of [
    "executionEnvironmentSha256",
    "dependencyLockSha256",
    "installedDependenciesSha256",
    "applicationBuildSha256",
    "sourceTreeSha256",
  ] as const) {
    if (!hexSha256.test(environment?.[name] ?? "")) errors.push(`${label}: invalid ${name}`);
  }
  if (environment?.executionEnvironmentFresh !== true) {
    errors.push(`${label}: executionEnvironmentFresh must be true`);
  }
  if (environment?.gitDirty !== false) errors.push(`${label}: gitDirty must be false`);
  const cdk = run.cdk;
  const cdkFields = new Set([
    "cliVersion",
    "cliInstalledSha256",
    "libVersion",
    "libInstalledSha256",
    "constructsInstalledSha256",
  ]);
  if (isObject(cdk)) {
    for (const name of Object.keys(cdk)) {
      if (!cdkFields.has(name)) errors.push(`${label}: unexpected cdk field ${name}`);
    }
  }
  for (const name of ["cliVersion", "libVersion"] as const) {
    if (typeof cdk?.[name] !== "string" || (cdk?.[name] as string).length === 0) {
      errors.push(`${label}: missing cdk.${name}`);
    }
  }
  for (const name of [
    "cliInstalledSha256",
    "libInstalledSha256",
    "constructsInstalledSha256",
  ] as const) {
    if (!hexSha256.test(cdk?.[name] ?? "")) errors.push(`${label}: invalid cdk.${name}`);
  }
  const implementation = implementationLabel(run);
  const provider = run.provider;
  if (implementation === "aws") {
    if (provider === undefined || provider === null) {
      errors.push(`${label}: provider is required for AWS`);
    } else {
      const awsProviderFields = new Set([
        "packageVersion",
        "architecture",
        "runtime",
        "handler",
        "codeSha256",
      ]);
      for (const name of Object.keys(provider)) {
        if (!awsProviderFields.has(name)) {
          errors.push(`${label}: unexpected AWS provider field ${name}`);
        }
      }
      if (typeof provider.packageVersion !== "string" || provider.packageVersion.length === 0) {
        errors.push(`${label}: missing provider.packageVersion`);
      }
      if (provider.architecture !== "x86_64") {
        errors.push(`${label}: AWS provider.architecture must be x86_64`);
      }
      if (provider.runtime !== "python3.13") {
        errors.push(`${label}: AWS provider.runtime must be python3.13`);
      }
      if (provider.handler !== "index.handler") {
        errors.push(`${label}: AWS provider.handler must be index.handler`);
      }
      if (!isBase64Sha256(provider.codeSha256)) {
        errors.push(`${label}: invalid provider.codeSha256`);
      }
    }
  } else if (implementation === "shin") {
    if (provider === undefined || provider === null) {
      errors.push(`${label}: provider is required for Shin`);
    } else {
      if (!/^[0-9a-f]{40}$/i.test(provider.implementationCommit ?? "")) {
        errors.push(`${label}: invalid provider.implementationCommit`);
      }
      if (typeof provider.packageVersion !== "string" || provider.packageVersion.length === 0) {
        errors.push(`${label}: missing provider.packageVersion`);
      }
      if (provider.architecture !== "arm64") {
        errors.push(`${label}: Shin provider.architecture must be arm64`);
      }
      if (provider.runtime !== "provided.al2023") {
        errors.push(`${label}: Shin provider.runtime must be provided.al2023`);
      }
      if (provider.handler !== "bootstrap") {
        errors.push(`${label}: Shin provider.handler must be bootstrap`);
      }
      if (!isBase64Sha256(provider.codeSha256)) {
        errors.push(`${label}: invalid provider.codeSha256`);
      }
      const bootstrap = provider.bootstrap;
      const bootstrapFields = new Set([
        "sha256",
        "archiveSha256",
        "provenanceSha256",
        "buildDirty",
        "cargoVersion",
        "rustcVersion",
        "cargoLambdaVersion",
        "zigVersion",
        "buildToolchainSha256",
        "buildEnvironmentSha256",
      ]);
      if (isObject(bootstrap)) {
        for (const name of Object.keys(bootstrap)) {
          if (!bootstrapFields.has(name)) {
            errors.push(`${label}: unexpected provider.bootstrap field ${name}`);
          }
        }
      }
      for (const name of [
        "sha256",
        "archiveSha256",
        "provenanceSha256",
        "buildToolchainSha256",
        "buildEnvironmentSha256",
      ] as const) {
        if (!hexSha256.test(bootstrap?.[name] ?? "")) {
          errors.push(`${label}: invalid provider.bootstrap.${name}`);
        }
      }
      if (bootstrap?.buildDirty !== false) {
        errors.push(`${label}: provider.bootstrap.buildDirty must be false`);
      }
      for (const name of [
        "cargoVersion",
        "rustcVersion",
        "cargoLambdaVersion",
        "zigVersion",
      ] as const) {
        if (typeof bootstrap?.[name] !== "string" || (bootstrap?.[name] as string).length === 0) {
          errors.push(`${label}: missing provider.bootstrap.${name}`);
        }
      }
      if (
        isBase64Sha256(provider.codeSha256) &&
        bootstrap?.archiveSha256 !== undefined &&
        Buffer.from(provider.codeSha256, "base64").toString("hex") !== bootstrap.archiveSha256
      ) {
        errors.push(`${label}: deployed Shin code does not match provider bootstrap archive`);
      }
    }
  } else {
    errors.push(`${label}: unsupported implementation`);
  }
  return errors;
}

export function benchmarkSampleRecordErrors(sample: BenchmarkSampleRecord): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexSha256 = /^[0-9a-f]{64}$/i;
  const errors: string[] = [];
  const label = `${sample.sampleId ?? "missing-sample"}/${sample.phase ?? "missing-phase"}`;
  const sampleFields = new Set([
    "runId",
    "sampleId",
    "implementation",
    "profile",
    "memoryMb",
    "parallel",
    "assetManifestSha256",
    "phase",
    "state",
    "repetition",
    "fileCount",
    "totalBytes",
    "detailedFailureDiagnostics",
    "sourceWindowBytes",
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "initDurationSeconds",
    "maxMemoryMb",
    "providerInvoked",
    "providerSummary",
  ]);
  for (const name of Object.keys(sample)) {
    if (!sampleFields.has(name)) errors.push(`${label}: unexpected sample field ${name}`);
  }
  if (!uuid.test(sample.runId ?? "")) errors.push(`${label}: runId must be a UUID`);
  if (!uuid.test(sample.sampleId ?? "")) errors.push(`${label}: sampleId must be an opaque UUID`);
  for (const name of ["implementation", "profile", "phase", "state"] as const) {
    if (typeof sample[name] !== "string" || (sample[name] as string).length === 0) {
      errors.push(`${label}: missing ${name}`);
    }
  }
  if (!hexSha256.test(sample.assetManifestSha256 ?? "")) {
    errors.push(`${label}: invalid assetManifestSha256`);
  }
  for (const name of [
    "repetition",
    "memoryMb",
    "fileCount",
    "totalBytes",
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "initDurationSeconds",
    "maxMemoryMb",
  ] as const) {
    if (typeof sample[name] !== "number" || !Number.isFinite(sample[name])) {
      errors.push(`${label}: missing ${name}`);
    }
  }
  for (const name of [
    "repetition",
    "memoryMb",
    "fileCount",
    "totalBytes",
    "maxMemoryMb",
  ] as const) {
    const value = sample[name];
    if (typeof value === "number" && (!Number.isInteger(value) || value < 0)) {
      errors.push(`${label}: ${name} must be a non-negative integer`);
    }
  }
  for (const name of [
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "initDurationSeconds",
  ] as const) {
    const value = sample[name];
    if (typeof value === "number" && value < 0) {
      errors.push(`${label}: ${name} must not be negative`);
    }
  }
  if ((sample.memoryMb ?? 0) <= 0) errors.push(`${label}: memoryMb must be positive`);
  if ((sample.fileCount ?? 0) <= 0) errors.push(`${label}: fileCount must be positive`);
  if ((sample.totalBytes ?? 0) <= 0) errors.push(`${label}: totalBytes must be positive`);
  if ((sample.repetition ?? 0) < 1 || (sample.repetition ?? 0) > 5) {
    errors.push(`${label}: repetition must be between 1 and 5`);
  }
  if ((sample.maxMemoryMb ?? Number.POSITIVE_INFINITY) > (sample.memoryMb ?? 0)) {
    errors.push(`${label}: maxMemoryMb exceeds configured memoryMb`);
  }
  if (
    sample.sourceWindowBytes === null ||
    (sample.sourceWindowBytes !== undefined &&
      (!Number.isInteger(sample.sourceWindowBytes) || sample.sourceWindowBytes <= 0))
  ) {
    errors.push(`${label}: sourceWindowBytes must be omitted or a positive integer`);
  }
  if (sample.providerInvoked !== true) errors.push(`${label}: providerInvoked must be true`);
  const implementation = implementationLabel(sample);
  if (implementation === "aws") {
    for (const name of ["parallel", "detailedFailureDiagnostics", "providerSummary"] as const) {
      if (Object.hasOwn(sample, name)) errors.push(`${label}: AWS ${name} must be omitted`);
    }
  } else if (implementation === "shin") {
    if (
      typeof sample.parallel !== "number" ||
      !Number.isInteger(sample.parallel) ||
      (sample.parallel ?? 0) <= 0
    ) {
      errors.push(`${label}: Shin parallel must be a positive integer`);
    }
    if (sample.detailedFailureDiagnostics !== true) {
      errors.push(`${label}: Shin detailedFailureDiagnostics must be true`);
    }
    if (sample.providerSummary === undefined || sample.providerSummary === null) {
      errors.push(`${label}: providerSummary is required for Shin`);
    } else {
      errors.push(
        ...providerSummaryErrors(sample.providerSummary).map((error) => `${label}: ${error}`),
      );
      const expectedExtract = profileExtractsSources(sample.profile);
      if (sample.providerSummary.extract !== expectedExtract) {
        errors.push(`${label}: summary extract must be ${expectedExtract} for this profile`);
      }
    }
  } else {
    errors.push(`${label}: unsupported implementation`);
  }
  return errors;
}

/**
 * Validates both ledgers together: every record against its shape, plus the
 * referential checks that bind samples to runs -- every sample's runId (and
 * implementation) must exist in `runs.jsonl`, run and sample identities must
 * be unique, and a run must be cleanup-complete unless pending is allowed.
 */
export function benchmarkEvidenceErrors(
  evidence: {
    readonly runs: readonly BenchmarkRunRecord[];
    readonly samples: readonly BenchmarkSampleRecord[];
  },
  options: { readonly allowPendingCleanup?: boolean } = {},
): string[] {
  const errors: string[] = [];
  for (const run of evidence.runs) errors.push(...benchmarkRunRecordErrors(run));
  for (const sample of evidence.samples) errors.push(...benchmarkSampleRecordErrors(sample));
  const runsByKey = new Map<string, BenchmarkRunRecord>();
  for (const run of evidence.runs) {
    const key = benchmarkRunKey(run);
    if (runsByKey.has(key)) {
      errors.push(`duplicate run record ${run.runId}/${run.implementation}`);
    } else {
      runsByKey.set(key, run);
    }
  }
  for (const run of evidence.runs) {
    if (
      !isCompleteBenchmarkRun(run) &&
      !(options.allowPendingCleanup === true && run.cleanup === "partial")
    ) {
      errors.push(`${run.runId}/${run.implementation}: cleanup is incomplete`);
    }
  }
  const sampleKeys = new Set<string>();
  for (const sample of evidence.samples) {
    const run = runsByKey.get(benchmarkRunKey(sample));
    if (run === undefined) {
      errors.push(
        `${sample.sampleId ?? "missing-sample"}/${sample.phase ?? "missing-phase"}: runId ${sample.runId ?? "missing"} has no run record`,
      );
    }
    const key = benchmarkSampleKey(sample);
    if (sampleKeys.has(key)) {
      errors.push(`duplicate sample ${sample.sampleId}/${sample.phase}`);
    }
    sampleKeys.add(key);
  }
  return errors;
}

/**
 * Joins samples with their run records for rendering. Fails loudly when a sample
 * references a runId with no run record.
 */
export function joinBenchmarkSamples(
  runs: readonly BenchmarkRunRecord[],
  samples: readonly BenchmarkSampleRecord[],
): BenchmarkRunSample[] {
  const runsByKey = new Map(runs.map((run) => [benchmarkRunKey(run), run]));
  return samples.map((sample) => {
    const run = runsByKey.get(benchmarkRunKey(sample));
    if (run === undefined) {
      throw new Error(
        `Sample ${sample.sampleId ?? "missing"}/${sample.phase ?? "missing"} references runId ${sample.runId ?? "missing"} with no run record.`,
      );
    }
    return {
      ...sample,
      snapshotDate: run.snapshotDate,
      region: run.region,
      cleanup: run.cleanup,
      decisionRunId: run.decisionRunId ?? null,
      comparisonVariant: run.comparisonVariant ?? null,
      config: run.config,
      environment: run.environment,
      cdk: run.cdk,
      provider: run.provider ?? null,
    };
  });
}

export function selectBenchmarkRuns(
  runs: readonly BenchmarkRunRecord[],
  requestedRunId?: string,
): BenchmarkRunRecord[] {
  const runId = requestedRunId ?? [...runs].reverse().find((run) => run.runId)?.runId ?? undefined;
  return runId === undefined || runId === null
    ? [...runs]
    : runs.filter((run) => run.runId === runId);
}

export function selectBenchmarkSamples(
  samples: readonly BenchmarkSampleRecord[],
  requestedRunId?: string,
): BenchmarkSampleRecord[] {
  const runId =
    requestedRunId ?? [...samples].reverse().find((sample) => sample.runId)?.runId ?? undefined;
  return runId === undefined || runId === null
    ? [...samples]
    : samples.filter((sample) => sample.runId === runId);
}

export function sanitizeProviderSummary(value: unknown): ProviderSummary {
  if (!isObject(value)) throw new Error("Provider summary must be an object.");
  for (const name of Object.keys(value)) {
    if (!PROVIDER_SUMMARY_FIELDS.has(name)) {
      throw new Error(`Provider summary contains unexpected field ${name}.`);
    }
  }

  const sanitized: Record<string, unknown> = {};
  for (const [name, kind] of Object.entries(PROVIDER_SUMMARY_SCALARS)) {
    if (!Object.hasOwn(value, name)) continue;
    sanitized[name] = sanitizedValue(value[name], kind, `providerSummary.${name}`);
  }
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_ALL_SECTIONS)) {
    if (!Object.hasOwn(value, sectionName)) continue;
    const section = value[sectionName];
    if (section === null) {
      sanitized[sectionName] = null;
      continue;
    }
    if (!isObject(section)) throw new Error(`providerSummary.${sectionName} must be an object.`);
    const allowed = new Set(Object.keys(fields));
    if (sectionName === "putObject") {
      for (const name of [
        "failuresBySdkErrorKind",
        "failuresByServiceCode",
        "failureStates",
        "failureStateOverflowAttempts",
      ]) {
        allowed.add(name);
      }
    }
    for (const name of Object.keys(section)) {
      if (!allowed.has(name)) {
        throw new Error(`providerSummary.${sectionName} contains unexpected field ${name}.`);
      }
    }
    const sanitizedSection = Object.fromEntries(
      Object.entries(fields)
        .filter(([name]) => Object.hasOwn(section, name))
        .map(([name, kind]) => [
          name,
          sanitizedValue(section[name], kind, `providerSummary.${sectionName}.${name}`),
        ]),
    ) as Record<string, unknown>;
    if (sectionName === "putObject") {
      sanitizedSection.failuresBySdkErrorKind = sanitizeDiagnosticCountMap(
        section.failuresBySdkErrorKind,
        "providerSummary.putObject.failuresBySdkErrorKind",
        SDK_ERROR_KINDS,
      );
      sanitizedSection.failuresByServiceCode = sanitizeDiagnosticCountMap(
        section.failuresByServiceCode,
        "providerSummary.putObject.failuresByServiceCode",
      );
      sanitizedSection.failureStates = sanitizeFailureStates(
        section.failureStates,
        "providerSummary.putObject.failureStates",
      );
      sanitizedSection.failureStateOverflowAttempts = requiredNonnegativeInteger(
        section.failureStateOverflowAttempts,
        "providerSummary.putObject.failureStateOverflowAttempts",
      );
    }
    sanitized[sectionName] = sanitizedSection;
  }
  return sanitized as ProviderSummary;
}

/**
 * Validates a provider summary against the current diagnostics contract. Validation runs
 * in three stages -- copy section, detailed PutObject invariants, then the base shape --
 * which is a factoring of one schema, not support for older ones.
 */
export function providerSummaryErrors(summary: ProviderSummary): string[] {
  return summaryCopyErrors(summary);
}

function summaryCopyErrors(summary: ProviderSummary): string[] {
  const errors: string[] = [];
  try {
    sanitizeProviderSummary(summary);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const copyObject = summary.copyObject;
  if (!isObject(copyObject)) {
    errors.push("summary section copyObject must be an object");
  } else {
    const fields = PROVIDER_SUMMARY_COPY_SECTIONS.copyObject;
    for (const name of Object.keys(fields)) {
      if (!Object.hasOwn(copyObject, name)) {
        errors.push(`summary is missing copyObject.${name}`);
      } else if (copyObject[name] === null) {
        errors.push(`summary field copyObject.${name} must not be null`);
      } else if (typeof copyObject[name] !== "number" || !Number.isSafeInteger(copyObject[name])) {
        // Safe integers, matching the scalar and section checks. Plain
        // `Number.isInteger` would accept values above 2^53 that have already lost
        // precision in JSON, letting lossy counters into committed evidence.
        errors.push(`summary field copyObject.${name} must be a safe integer`);
      }
    }
    for (const name of Object.keys(copyObject)) {
      if (!Object.hasOwn(fields, name)) {
        errors.push(`summary contains unexpected field copyObject.${name}`);
      }
    }

    // The same internal consistency required of `putObject`.
    // Without these the collector accepts impossible copy telemetry.
    const counter = (name: string): number => {
      const value = copyObject[name];
      return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
    };
    if (counter("failedAttempts") > counter("wireAttempts")) {
      errors.push("summary CopyObject failedAttempts exceeds wireAttempts");
    }
    if (counter("retryAttempts") > counter("wireAttempts")) {
      errors.push("summary CopyObject retryAttempts exceeds wireAttempts");
    }
    if (counter("throttledAttempts") > counter("failedAttempts")) {
      errors.push("summary CopyObject throttledAttempts exceeds failedAttempts");
    }
  }

  errors.push(...summaryShapeErrors(summary));
  return errors;
}

function summaryShapeErrors(summary: ProviderSummary): string[] {
  const errors: string[] = [];
  try {
    sanitizeProviderSummary(summary);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const expectedTopLevel = new Set([
    ...Object.keys(PROVIDER_SUMMARY_SCALARS),
    ...Object.keys(PROVIDER_SUMMARY_SECTIONS),
  ]);
  for (const name of Object.keys(summary)) {
    if (!expectedTopLevel.has(name) && name !== "copyObject") {
      errors.push(`summary contains unexpected field ${name}`);
    }
  }
  for (const name of expectedTopLevel) {
    if (!Object.hasOwn(summary, name)) errors.push(`summary is missing ${name}`);
    else if (summary[name as keyof ProviderSummary] === null) {
      errors.push(`summary field ${name} must not be null`);
    }
  }

  if (summary.event !== "shin_deployment_summary") errors.push("summary event is invalid");
  if (!(["Create", "Update", "Delete"] as const).includes(summary.requestType as never))
    errors.push("summary requestType is invalid");
  if (summary.deploymentStatus !== "success")
    errors.push("summary deploymentStatus must be success");
  if (typeof summary.detailedFailureDiagnosticsEnabled !== "boolean")
    errors.push("summary detailedFailureDiagnosticsEnabled must be boolean");
  if (summary.availableMemoryMb === null || (summary.availableMemoryMb ?? 0) <= 0)
    errors.push("summary availableMemoryMb must be positive");
  if (summary.maxParallelTransfers === null || (summary.maxParallelTransfers ?? 0) <= 0)
    errors.push("summary maxParallelTransfers must be positive");
  if (summary.markerReplacement?.strategy !== "planning-plus-retryable-stream")
    errors.push("summary markerReplacement.strategy is invalid");
  if (summary.markerReplacement?.semantics !== "leftmost-longest-non-recursive")
    errors.push("summary markerReplacement.semantics is invalid");
  if (summary.markerReplacement?.plannedPassesPerUpload !== 2)
    errors.push("summary markerReplacement.plannedPassesPerUpload must be 2");

  for (const [name, kind] of Object.entries(PROVIDER_SUMMARY_SCALARS)) {
    const value = summary[name as keyof ProviderSummary];
    if (kind === "number" && typeof value === "number" && !Number.isSafeInteger(value)) {
      errors.push(`summary field ${name} must be a safe integer`);
    }
  }
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_SECTIONS)) {
    const section = summary[sectionName as keyof ProviderSummary];
    if (!isObject(section)) {
      errors.push(`summary section ${sectionName} must be an object`);
      continue;
    }
    for (const name of Object.keys(fields)) {
      if (!Object.hasOwn(section, name)) {
        errors.push(`summary is missing ${sectionName}.${name}`);
      } else if (section[name] === null) {
        errors.push(`summary field ${sectionName}.${name} must not be null`);
      } else if (typeof section[name] === "number" && !Number.isSafeInteger(section[name])) {
        errors.push(`summary field ${sectionName}.${name} must be a safe integer`);
      }
    }
  }

  // Both values are legitimate: `copy-archives` deploys with `extract:false`. The record
  // level cross-checks the value against the profile, which the summary alone cannot.
  if (typeof summary.extract !== "boolean") errors.push("summary extract must be boolean");
  if (summary.deleteStaleObjectsOnDeployment !== true)
    errors.push("summary deleteStaleObjectsOnDeployment must be true");
  if (summary.transfer?.failedObjects !== 0)
    errors.push("summary transfer failedObjects must be zero");
  if (summary.transfer?.cancelledObjects !== 0)
    errors.push("summary transfer cancelledObjects must be zero");
  if (summary.transfer?.panickedObjects !== 0)
    errors.push("summary transfer panickedObjects must be zero");
  if (summary.transfer?.scheduledObjects !== summary.transfer?.completedObjects)
    errors.push("summary transfer scheduledObjects must equal completedObjects");
  if ((summary.transfer?.inFlightHighWater ?? 0) > (summary.maxParallelTransfers ?? 0))
    errors.push("summary transfer inFlightHighWater exceeds maxParallelTransfers");
  if (summary.source?.globalResidentBytesCurrent !== 0)
    errors.push("summary source globalResidentBytesCurrent must be zero");
  if (summary.source?.globalReleaseAnomalies !== 0)
    errors.push("summary source globalReleaseAnomalies must be zero");

  const put = isObject(summary.putObject) ? summary.putObject : {};
  const states = Array.isArray(put.failureStates) ? put.failureStates : [];
  const represented = states.reduce(
    (total, state) => total + safeNonnegativeBigInt(state.count),
    0n,
  );
  const overflow = safeNonnegativeBigInt(put.failureStateOverflowAttempts);
  const failed = safeNonnegativeBigInt(put.failedAttempts);
  const sdkCount = Object.values(put.failuresBySdkErrorKind ?? {}).reduce(
    (total, count) => total + safeNonnegativeBigInt(count),
    0n,
  );
  const serviceCount = Object.values(put.failuresByServiceCode ?? {}).reduce(
    (total, count) => total + safeNonnegativeBigInt(count),
    0n,
  );
  if (summary.detailedFailureDiagnosticsEnabled === true) {
    if (represented + overflow !== failed)
      errors.push("summary PutObject failure-state counts plus overflow must equal failedAttempts");
    if (sdkCount !== failed)
      errors.push("summary PutObject SDK-kind counts must equal failedAttempts");
    if (serviceCount > failed)
      errors.push("summary PutObject service-code counts exceed failedAttempts");
  } else if (sdkCount !== 0n || serviceCount !== 0n || states.length !== 0 || overflow !== 0n) {
    errors.push("summary disabled detailed failure diagnostics must be empty");
  }
  if (safeNonnegativeBigInt(put.failedAttempts) > safeNonnegativeBigInt(put.wireAttempts))
    errors.push("summary PutObject failedAttempts exceeds wireAttempts");
  if (safeNonnegativeBigInt(put.retryAttempts) > safeNonnegativeBigInt(put.wireAttempts))
    errors.push("summary PutObject retryAttempts exceeds wireAttempts");
  if (safeNonnegativeBigInt(put.throttledAttempts) > failed)
    errors.push("summary PutObject throttledAttempts exceeds failedAttempts");

  if ((summary.deleteObject?.failedCalls ?? 0) > (summary.deleteObject?.sdkCalls ?? 0))
    errors.push("summary DeleteObjects failedCalls exceeds sdkCalls");
  if (
    (summary.deleteObject?.inferredDeletedObjects ?? 0) +
      (summary.deleteObject?.unconfirmedObjects ?? 0) +
      (summary.deleteObject?.noSuchBucketRequestedIdentifiers ?? 0) !==
    summary.deleteObject?.requestedObjects
  ) {
    errors.push("summary DeleteObjects outcomes do not equal requestedObjects");
  }
  if (summary.callback?.confirmedResponses !== 1)
    errors.push("summary callback confirmedResponses must be one");
  if ((summary.callback?.wireAttempts ?? 0) < 1)
    errors.push("summary callback wireAttempts must be positive");
  if (
    (summary.callback?.failedAttempts ?? 0) + (summary.callback?.confirmedResponses ?? 0) !==
    summary.callback?.wireAttempts
  ) {
    errors.push("summary callback outcomes do not equal wireAttempts");
  }
  if (summary.callback?.retryAttempts !== (summary.callback?.wireAttempts ?? 0) - 1)
    errors.push("summary callback retryAttempts must equal wireAttempts minus one");
  return errors;
}

export function benchmarkEvidenceSanitizationErrors(
  run: BenchmarkRunRecord,
  sample: BenchmarkSampleRecord,
  forbiddenValues: readonly string[] = [],
): string[] {
  const errors: string[] = [];
  const serialized = JSON.stringify({ run, sample });
  const sensitiveText = JSON.stringify([
    run.provider?.packageVersion,
    run.provider?.runtime,
    run.provider?.handler,
    run.cdk?.cliVersion,
    run.cdk?.libVersion,
    run.region,
    run.cleanup,
    run.decisionRunId,
    run.comparisonVariant,
    sample.profile,
    sample.phase,
    sample.state,
  ]);
  if (/arn:aws(?:-[a-z0-9-]+)?:/i.test(serialized)) errors.push("record contains an ARN");
  if (/\b(?:request[ -]?id|etag)\b\s*(?::|=|\s)/i.test(sensitiveText))
    errors.push("record contains a request ID or ETag label");
  if (/(?<!\d)\d{12}(?!\d)/.test(sensitiveText)) errors.push("record contains an AWS account ID");
  if (
    /\b(?:bucket|distribution|physical(?:resource)?)[ -]?(?:name|id)\b\s*(?::|=)/i.test(
      sensitiveText,
    )
  ) {
    errors.push("record contains a labeled AWS resource identifier");
  }
  for (const forbidden of forbiddenValues.filter(Boolean)) {
    if (serialized.includes(forbidden)) errors.push("record contains a forbidden local value");
  }
  return [...new Set(errors)];
}

export function phaseRank(phase: string | null | undefined): number {
  return PHASE_RANKS.get(phase ?? "") ?? Number.MAX_SAFE_INTEGER;
}

export function implementationLabel(
  record: Pick<BenchmarkRunRecord | BenchmarkSampleRecord, "implementation">,
): string {
  return normalizeImplementation(record.implementation) ?? "unknown";
}

export function normalizeImplementation(value: string | null | undefined): string | null {
  return value ?? null;
}

export function isBenchmarkImplementation(
  value: string | null | undefined,
): value is BenchmarkImplementation {
  return includesString(BENCHMARK_IMPLEMENTATIONS, value);
}

export function isBenchmarkAssetProfile(
  value: string | null | undefined,
): value is BenchmarkAssetProfile {
  return includesString(BENCHMARK_ASSET_PROFILES, value);
}

export function isBenchmarkAssetState(
  value: string | null | undefined,
): value is BenchmarkAssetState {
  return includesString(BENCHMARK_ASSET_STATES, value);
}

function includesString<T extends string>(
  values: readonly T[],
  value: string | null | undefined,
): value is T {
  return value !== undefined && value !== null && values.includes(value as T);
}

function sanitizedValue(
  value: unknown,
  kind: "boolean" | "number" | "string",
  path: string,
): boolean | number | string | null {
  if (value === null) return null;
  if (typeof value !== kind || (kind === "number" && !Number.isFinite(value))) {
    throw new Error(`${path} must be ${kind} or null.`);
  }
  if (typeof value === "number" && value < 0) throw new Error(`${path} must not be negative.`);
  return value as boolean | number | string;
}

function sanitizeDiagnosticCountMap(
  value: unknown,
  path: string,
  allowedLabels?: ReadonlySet<string>,
): Record<string, number> {
  if (!isObject(value)) throw new Error(`${path} must be an object.`);
  const entries = Object.entries(value);
  if (entries.length > MAX_FAILURE_DIAGNOSTIC_LABELS) {
    throw new Error(`${path} exceeds ${MAX_FAILURE_DIAGNOSTIC_LABELS} labels.`);
  }
  return Object.fromEntries(
    entries.map(([label, count]) => {
      if (
        !DIAGNOSTIC_LABEL.test(label) ||
        (allowedLabels !== undefined && label !== "Other" && !allowedLabels.has(label))
      ) {
        throw new Error(`${path} contains an invalid label.`);
      }
      return [label, requiredNonnegativeInteger(count, `${path}.${label}`)];
    }),
  );
}

function sanitizeFailureStates(value: unknown, path: string): PutObjectFailureState[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  if (value.length > MAX_FAILURE_DIAGNOSTIC_GROUPS) {
    throw new Error(`${path} exceeds ${MAX_FAILURE_DIAGNOSTIC_GROUPS} groups.`);
  }
  return value.map((failure, index) => sanitizeFailureState(failure, `${path}[${index}]`));
}

function sanitizeFailureState(value: unknown, path: string): PutObjectFailureState {
  const fields = [
    "count",
    "sdkErrorKind",
    "dispatchFailureKind",
    "serviceCode",
    "elapsedMs",
    "body",
    "source",
  ];
  assertExactObject(value, fields, path);
  if (!SDK_ERROR_KINDS.has(value.sdkErrorKind as string)) {
    throw new Error(`${path}.sdkErrorKind is invalid.`);
  }
  if (
    value.dispatchFailureKind !== null &&
    !DISPATCH_FAILURE_KINDS.has(value.dispatchFailureKind as string)
  ) {
    throw new Error(`${path}.dispatchFailureKind is invalid.`);
  }
  if (value.serviceCode !== null && !DIAGNOSTIC_LABEL.test(value.serviceCode as string)) {
    throw new Error(`${path}.serviceCode is invalid.`);
  }
  if ((value.sdkErrorKind === "DispatchFailure") !== (value.dispatchFailureKind !== null)) {
    throw new Error(`${path}.dispatchFailureKind must be set only for DispatchFailure.`);
  }
  if (value.sdkErrorKind !== "ServiceError" && value.serviceCode !== null) {
    throw new Error(`${path}.serviceCode must be null unless sdkErrorKind is ServiceError.`);
  }
  const count = requiredPositiveInteger(value.count, `${path}.count`);
  return {
    count,
    sdkErrorKind: value.sdkErrorKind as string,
    dispatchFailureKind: value.dispatchFailureKind as string | null,
    serviceCode: value.serviceCode as string | null,
    elapsedMs: sanitizeRange(value.elapsedMs, `${path}.elapsedMs`, count),
    body: sanitizeFailureBody(value.body, `${path}.body`, count),
    source: sanitizeFailureSource(value.source, `${path}.source`, count),
  };
}

function sanitizeFailureBody(value: unknown, path: string, count: number): PutObjectFailureBody {
  const fields = [
    "attemptObserved",
    "replay",
    "producerStage",
    "finalFrameDelivered",
    "producerCompleted",
    "bodyErrorObserved",
    "receiverDropped",
    "receiverDropAbortedProducer",
    "attemptNumber",
    "bytesEmitted",
    "remainingBytes",
  ];
  assertExactObject(value, fields, path);
  for (const field of fields.slice(0, 8)) {
    if (field === "producerStage") continue;
    if (typeof value[field] !== "boolean") throw new Error(`${path}.${field} must be boolean.`);
  }
  if (!PRODUCER_STAGES.has(value.producerStage as string)) {
    throw new Error(`${path}.producerStage is invalid.`);
  }
  if (value.attemptObserved === false && value.producerStage !== "not-observed") {
    throw new Error(
      `${path}.producerStage must be not-observed when the attempt was not observed.`,
    );
  }
  if (value.producerCompleted !== (value.producerStage === "complete")) {
    throw new Error(`${path}.producerCompleted must match producerStage.`);
  }
  if (value.receiverDropAbortedProducer === true && value.receiverDropped !== true) {
    throw new Error(`${path}.receiverDropAbortedProducer requires receiverDropped.`);
  }
  const sanitized = {
    attemptObserved: value.attemptObserved as boolean,
    replay: value.replay as boolean,
    producerStage: value.producerStage as string,
    finalFrameDelivered: value.finalFrameDelivered as boolean,
    producerCompleted: value.producerCompleted as boolean,
    bodyErrorObserved: value.bodyErrorObserved as boolean,
    receiverDropped: value.receiverDropped as boolean,
    receiverDropAbortedProducer: value.receiverDropAbortedProducer as boolean,
    attemptNumber: sanitizeRange(value.attemptNumber, `${path}.attemptNumber`, count),
    bytesEmitted: sanitizeRange(value.bytesEmitted, `${path}.bytesEmitted`, count),
    remainingBytes: sanitizeRange(value.remainingBytes, `${path}.remainingBytes`, count),
  };
  if (
    !sanitized.attemptObserved &&
    (sanitized.replay ||
      sanitized.finalFrameDelivered ||
      sanitized.producerCompleted ||
      sanitized.bodyErrorObserved ||
      sanitized.receiverDropped ||
      sanitized.receiverDropAbortedProducer ||
      !rangeIsZero(sanitized.attemptNumber) ||
      !rangeIsZero(sanitized.bytesEmitted) ||
      !rangeIsZero(sanitized.remainingBytes))
  ) {
    throw new Error(`${path} contains state for an unobserved attempt.`);
  }
  if (sanitized.attemptObserved && sanitized.attemptNumber.min < 1) {
    throw new Error(`${path}.attemptNumber must be positive for an observed attempt.`);
  }
  return sanitized;
}

function sanitizeFailureSource(
  value: unknown,
  path: string,
  count: number,
): PutObjectFailureSource {
  const ranges = [
    "localWindowBytes",
    "localCommittedBytes",
    "localResidentBytes",
    "localCapacityWaiters",
    "globalBudgetBytes",
    "globalResidentBytes",
    "globalAvailablePermits",
    "globalPermitUnitBytes",
    "globalPermitWaiters",
    "activeFetches",
  ] as const;
  assertExactObject(value, ["observed", ...ranges], path);
  if (typeof value.observed !== "boolean") throw new Error(`${path}.observed must be boolean.`);
  const sanitized = {
    observed: value.observed,
    ...Object.fromEntries(
      ranges.map((field) => [field, sanitizeRange(value[field], `${path}.${field}`, count)]),
    ),
  } as PutObjectFailureSource;
  if (!sanitized.observed && ranges.some((field) => !rangeIsZero(sanitized[field]))) {
    throw new Error(`${path} contains state for an unobserved source.`);
  }
  return sanitized;
}

function sanitizeRange(value: unknown, path: string, count: number): DiagnosticRange {
  assertExactObject(value, ["min", "max", "total"], path);
  const min = requiredNonnegativeInteger(value.min, `${path}.min`);
  const max = requiredNonnegativeInteger(value.max, `${path}.max`);
  const total = requiredNonnegativeInteger(value.total, `${path}.total`);
  if (min > max) throw new Error(`${path}.min exceeds max.`);
  const totalExact = BigInt(total);
  const countExact = BigInt(count);
  if (totalExact < BigInt(min) * countExact || totalExact > BigInt(max) * countExact) {
    throw new Error(`${path}.total is outside the represented range.`);
  }
  return { min, max, total };
}

function rangeIsZero(range: DiagnosticRange): boolean {
  return range.min === 0 && range.max === 0 && range.total === 0;
}

function assertExactObject(
  value: unknown,
  fields: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${path} must be an object.`);
  const allowed = new Set(fields);
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) throw new Error(`${path} contains unexpected field ${field}.`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) throw new Error(`${path} is missing ${field}.`);
  }
}

function requiredNonnegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${path} must be a nonnegative safe integer.`);
  }
  return value;
}

function requiredPositiveInteger(value: unknown, path: string): number {
  const parsed = requiredNonnegativeInteger(value, path);
  if (parsed === 0) throw new Error(`${path} must be positive.`);
  return parsed;
}

function safeNonnegativeBigInt(value: unknown): bigint {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? BigInt(value)
    : 0n;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBase64Sha256(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  const bytes = Buffer.from(value, "base64");
  return bytes.length === 32 && bytes.toString("base64") === value;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
