import { readFileSync } from "node:fs";

export const BENCHMARK_IMPLEMENTATIONS = ["shin", "aws"] as const;
export type BenchmarkImplementation = (typeof BENCHMARK_IMPLEMENTATIONS)[number];

export const BENCHMARK_ASSET_PROFILES = [
  "tiny-many",
  "mixed",
  "large-few",
  "marker-heavy",
  "multi-source-prune",
] as const;
export type BenchmarkAssetProfile = (typeof BENCHMARK_ASSET_PROFILES)[number];

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
  readonly schemaVersion?: number | null;
  readonly requestType?: string | null;
  readonly deploymentStatus?: string | null;
  /** Diagnostics schema v2 compatibility. */
  readonly status?: string | null;
  readonly extract?: boolean | null;
  readonly destinationChecksumStrategy?: string | null;
  readonly deleteStaleObjectsOnDeployment?: boolean | null;
  /** Historical provider snapshots before the destination lifecycle rename. */
  readonly prune?: boolean | null;
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
  schemaVersion: "number",
  requestType: "string",
  deploymentStatus: "string",
  status: "string",
  extract: "boolean",
  destinationChecksumStrategy: "string",
  deleteStaleObjectsOnDeployment: "boolean",
  prune: "boolean",
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

const PROVIDER_SUMMARY_V3_SCALARS = Object.keys(PROVIDER_SUMMARY_SCALARS).filter(
  (name) => name !== "status" && name !== "prune" && name !== "detailedFailureDiagnosticsEnabled",
);
const PROVIDER_SUMMARY_FIELDS = new Set([
  ...Object.keys(PROVIDER_SUMMARY_SCALARS),
  ...Object.keys(PROVIDER_SUMMARY_SECTIONS),
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

export type BenchmarkResultRecord = {
  readonly resultSchemaVersion?: number | null;
  readonly methodologyVersion?: number | null;
  readonly runId?: string | null;
  readonly sampleId?: string | null;
  readonly snapshotDate?: string | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly repetition?: number | null;
  readonly benchmarkConfigSha256?: string | null;
  readonly assetManifestSha256?: string | null;
  readonly dependencyLockSha256?: string | null;
  readonly applicationBuildSha256?: string | null;
  readonly installedDependenciesSha256?: string | null;
  readonly nodeVersion?: string | null;
  readonly pnpmVersion?: string | null;
  readonly executionEnvironmentSha256?: string | null;
  readonly sourceTreeSha256?: string | null;
  readonly providerImplementationCommit?: string | null;
  readonly providerImplementationSubject?: string | null;
  readonly providerPackageName?: string | null;
  readonly providerPackageVersion?: string | null;
  readonly providerArchitecture?: string | null;
  readonly providerRuntime?: string | null;
  readonly providerHandler?: string | null;
  readonly providerCodeSha256?: string | null;
  readonly providerBootstrapSha256?: string | null;
  readonly providerBootstrapArchiveSha256?: string | null;
  readonly providerBootstrapProvenanceSha256?: string | null;
  readonly providerBootstrapBuildDirty?: boolean | null;
  readonly providerBootstrapCargoVersion?: string | null;
  readonly providerBootstrapRustcVersion?: string | null;
  readonly providerBootstrapCargoLambdaVersion?: string | null;
  readonly providerBootstrapZigVersion?: string | null;
  readonly providerBootstrapBuildToolchainSha256?: string | null;
  readonly providerBootstrapBuildEnvironmentSha256?: string | null;
  readonly gitDirty?: boolean | null;
  readonly cdkCliVersion?: string | null;
  readonly cdkCliInstalledSha256?: string | null;
  readonly awsCdkLibVersion?: string | null;
  readonly awsCdkLibIntegrity?: string | null;
  readonly awsCdkLibInstalledSha256?: string | null;
  readonly constructsInstalledSha256?: string | null;
  readonly executionEnvironmentFresh?: boolean | null;
  readonly memoryMeasurementScope?: "phase-local" | "cumulative" | null;
  readonly resultDocumentationCommit?: string | null;
  readonly region?: string | null;
  readonly implementation?: string | null;
  readonly profile?: string | null;
  readonly memoryMb?: number | null;
  readonly parallel?: number | null;
  readonly sourceWindowBytes?: number | null;
  readonly detailedFailureDiagnostics?: boolean | null;
  readonly phase?: string;
  readonly state?: string | null;
  readonly fileCount?: number | null;
  readonly totalBytes?: number | null;
  readonly cdkDeploySeconds?: number | null;
  readonly localWallSeconds?: number | null;
  readonly providerDurationSeconds?: number | null;
  readonly billedDurationSeconds?: number | null;
  readonly initDurationSeconds?: number | null;
  readonly maxMemoryMb?: number | null;
  readonly providerInvoked?: boolean | null;
  readonly cleanup?: string | null;
  readonly notes?: string | null;
  readonly providerSummary?: ProviderSummary | null;
};

export type BenchmarkResultRow = {
  readonly line: number;
  readonly record: BenchmarkResultRecord;
};

export function readBenchmarkResultRecords(filePath: string): BenchmarkResultRecord[] {
  return readBenchmarkResultRows(filePath).map((row) => row.record);
}

export function readBenchmarkResultRows(filePath: string): BenchmarkResultRow[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, lineNumber }) => {
      try {
        return { line: lineNumber, record: JSON.parse(line) as BenchmarkResultRecord };
      } catch (cause) {
        throw new Error(`Invalid JSONL record at ${filePath}:${lineNumber}`, { cause });
      }
    });
}

export function benchmarkResultKey(
  record: Pick<
    BenchmarkResultRecord,
    | "profile"
    | "memoryMb"
    | "parallel"
    | "sourceWindowBytes"
    | "detailedFailureDiagnostics"
    | "implementation"
    | "phase"
    | "state"
    | "decisionRunId"
    | "runId"
    | "sampleId"
    | "methodologyVersion"
    | "comparisonVariant"
    | "repetition"
  >,
): string {
  return [
    record.profile,
    record.memoryMb,
    record.parallel,
    record.sourceWindowBytes,
    record.detailedFailureDiagnostics,
    normalizeImplementation(record.implementation),
    record.phase,
    record.state,
    record.decisionRunId,
    record.methodologyVersion,
    record.runId,
    record.sampleId,
    record.comparisonVariant,
    record.repetition,
  ]
    .map((part) => part ?? "")
    .join("\u0000");
}

export function isCanonicalBenchmarkRecord(record: BenchmarkResultRecord): boolean {
  return methodologyV2RecordErrors(record).length === 0;
}

export function methodologyV2RecordErrors(
  record: BenchmarkResultRecord,
  options: { readonly allowPendingCleanup?: boolean } = {},
): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexSha256 = /^[0-9a-f]{64}$/i;
  const errors: string[] = [];
  const label = `${record.sampleId ?? "missing-sample"}/${record.phase ?? "missing-phase"}`;
  const recordFields = new Set([
    "resultSchemaVersion",
    "methodologyVersion",
    "runId",
    "sampleId",
    "snapshotDate",
    "decisionRunId",
    "comparisonVariant",
    "repetition",
    "benchmarkConfigSha256",
    "assetManifestSha256",
    "dependencyLockSha256",
    "applicationBuildSha256",
    "installedDependenciesSha256",
    "nodeVersion",
    "pnpmVersion",
    "executionEnvironmentSha256",
    "sourceTreeSha256",
    "providerImplementationCommit",
    "providerImplementationSubject",
    "providerPackageName",
    "providerPackageVersion",
    "providerArchitecture",
    "providerRuntime",
    "providerHandler",
    "providerCodeSha256",
    "providerBootstrapSha256",
    "providerBootstrapArchiveSha256",
    "providerBootstrapProvenanceSha256",
    "providerBootstrapBuildDirty",
    "providerBootstrapCargoVersion",
    "providerBootstrapRustcVersion",
    "providerBootstrapCargoLambdaVersion",
    "providerBootstrapZigVersion",
    "providerBootstrapBuildToolchainSha256",
    "providerBootstrapBuildEnvironmentSha256",
    "gitDirty",
    "cdkCliVersion",
    "cdkCliInstalledSha256",
    "awsCdkLibVersion",
    "awsCdkLibIntegrity",
    "awsCdkLibInstalledSha256",
    "constructsInstalledSha256",
    "executionEnvironmentFresh",
    "memoryMeasurementScope",
    "resultDocumentationCommit",
    "region",
    "implementation",
    "profile",
    "memoryMb",
    "parallel",
    "sourceWindowBytes",
    "detailedFailureDiagnostics",
    "phase",
    "state",
    "fileCount",
    "totalBytes",
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "initDurationSeconds",
    "maxMemoryMb",
    "providerInvoked",
    "cleanup",
    "notes",
    "providerSummary",
  ]);
  for (const name of Object.keys(record)) {
    if (!recordFields.has(name)) errors.push(`${label}: unexpected record field ${name}`);
  }
  const requireString = (name: keyof BenchmarkResultRecord): void => {
    if (typeof record[name] !== "string" || (record[name] as string).length === 0) {
      errors.push(`${label}: missing ${name}`);
    }
  };
  const requireNumber = (name: keyof BenchmarkResultRecord): void => {
    const value = record[name];
    if (typeof value !== "number" || !Number.isFinite(value))
      errors.push(`${label}: missing ${name}`);
  };
  const requireNullableString = (name: keyof BenchmarkResultRecord): void => {
    const value = record[name];
    if (!Object.hasOwn(record, name) || (value !== null && typeof value !== "string"))
      errors.push(`${label}: missing or invalid ${name}`);
  };
  if (record.resultSchemaVersion !== 2) errors.push(`${label}: resultSchemaVersion must be 2`);
  if (record.methodologyVersion !== 2) errors.push(`${label}: methodologyVersion must be 2`);
  if (!uuid.test(record.runId ?? "")) errors.push(`${label}: runId must be a UUID`);
  if (!uuid.test(record.sampleId ?? "")) errors.push(`${label}: sampleId must be an opaque UUID`);
  for (const name of [
    "snapshotDate",
    "benchmarkConfigSha256",
    "assetManifestSha256",
    "dependencyLockSha256",
    "applicationBuildSha256",
    "installedDependenciesSha256",
    "nodeVersion",
    "pnpmVersion",
    "executionEnvironmentSha256",
    "sourceTreeSha256",
    "providerPackageName",
    "providerPackageVersion",
    "providerArchitecture",
    "providerRuntime",
    "providerHandler",
    "providerCodeSha256",
    "cdkCliVersion",
    "cdkCliInstalledSha256",
    "awsCdkLibVersion",
    "awsCdkLibIntegrity",
    "awsCdkLibInstalledSha256",
    "constructsInstalledSha256",
    "region",
    "implementation",
    "profile",
    "phase",
    "state",
  ] as const)
    requireString(name);
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
  ] as const)
    requireNumber(name);
  requireNullableString("resultDocumentationCommit");
  requireNullableString("notes");
  requireNullableString("decisionRunId");
  requireNullableString("comparisonVariant");
  if (!isIsoDate(record.snapshotDate ?? ""))
    errors.push(`${label}: snapshotDate must use YYYY-MM-DD`);
  if (record.notes !== null) errors.push(`${label}: methodology-v2 notes must be null`);
  if (
    record.resultDocumentationCommit !== null &&
    !/^[0-9a-f]{40}$/i.test(record.resultDocumentationCommit ?? "")
  ) {
    errors.push(`${label}: invalid resultDocumentationCommit`);
  }
  for (const name of ["decisionRunId", "comparisonVariant"] as const) {
    const value = record[name];
    if (value !== null && !/^[A-Za-z0-9._-]+$/.test(value ?? "")) {
      errors.push(`${label}: invalid ${name}`);
    }
  }
  for (const name of [
    "benchmarkConfigSha256",
    "assetManifestSha256",
    "dependencyLockSha256",
    "applicationBuildSha256",
    "installedDependenciesSha256",
    "executionEnvironmentSha256",
    "sourceTreeSha256",
    "cdkCliInstalledSha256",
    "awsCdkLibInstalledSha256",
    "constructsInstalledSha256",
  ] as const) {
    if (!hexSha256.test(record[name] ?? "")) errors.push(`${label}: invalid ${name}`);
  }
  if (!isBase64Sha256(record.providerCodeSha256))
    errors.push(`${label}: invalid providerCodeSha256`);
  if (!(record.providerArchitecture === "arm64" || record.providerArchitecture === "x86_64"))
    errors.push(`${label}: unsupported providerArchitecture`);
  for (const name of [
    "repetition",
    "memoryMb",
    "fileCount",
    "totalBytes",
    "maxMemoryMb",
  ] as const) {
    const value = record[name];
    if (typeof value === "number" && (!Number.isInteger(value) || value < 0))
      errors.push(`${label}: ${name} must be a non-negative integer`);
  }
  for (const name of [
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "initDurationSeconds",
  ] as const) {
    const value = record[name];
    if (typeof value === "number" && value < 0)
      errors.push(`${label}: ${name} must not be negative`);
  }
  if ((record.memoryMb ?? 0) <= 0) errors.push(`${label}: memoryMb must be positive`);
  if (
    record.sourceWindowBytes !== undefined &&
    record.sourceWindowBytes !== null &&
    (!Number.isInteger(record.sourceWindowBytes) || record.sourceWindowBytes <= 0)
  ) {
    errors.push(`${label}: sourceWindowBytes must be null or a positive integer`);
  }
  if (
    record.detailedFailureDiagnostics !== undefined &&
    record.detailedFailureDiagnostics !== null &&
    typeof record.detailedFailureDiagnostics !== "boolean"
  ) {
    errors.push(`${label}: detailedFailureDiagnostics must be null or boolean`);
  }
  if ((record.fileCount ?? 0) <= 0) errors.push(`${label}: fileCount must be positive`);
  if ((record.totalBytes ?? 0) <= 0) errors.push(`${label}: totalBytes must be positive`);
  if ((record.repetition ?? 0) < 1 || (record.repetition ?? 0) > 5)
    errors.push(`${label}: repetition must be between 1 and 5`);
  if ((record.maxMemoryMb ?? Number.POSITIVE_INFINITY) > (record.memoryMb ?? 0))
    errors.push(`${label}: maxMemoryMb exceeds configured memoryMb`);
  if (record.gitDirty !== false) errors.push(`${label}: gitDirty must be false`);
  if (record.executionEnvironmentFresh !== true)
    errors.push(`${label}: executionEnvironmentFresh must be true`);
  if (record.memoryMeasurementScope !== "phase-local")
    errors.push(`${label}: memoryMeasurementScope must be phase-local`);
  if (record.providerInvoked !== true) errors.push(`${label}: providerInvoked must be true`);
  if (
    !isCompleteBenchmarkRecord(record) &&
    !(options.allowPendingCleanup === true && record.cleanup === "benchmark cleanup pending")
  ) {
    errors.push(`${label}: cleanup is incomplete`);
  }
  if (implementationLabel(record) === "aws") {
    if (record.parallel !== null) errors.push(`${label}: AWS parallel must be null`);
    if (
      Object.hasOwn(record, "detailedFailureDiagnostics") &&
      record.detailedFailureDiagnostics !== null
    ) {
      errors.push(`${label}: AWS detailedFailureDiagnostics must be null`);
    }
    for (const name of [
      "providerImplementationCommit",
      "providerImplementationSubject",
      "providerBootstrapSha256",
      "providerBootstrapArchiveSha256",
      "providerBootstrapProvenanceSha256",
      "providerBootstrapBuildDirty",
      "providerBootstrapCargoVersion",
      "providerBootstrapRustcVersion",
      "providerBootstrapCargoLambdaVersion",
      "providerBootstrapZigVersion",
      "providerBootstrapBuildToolchainSha256",
      "providerBootstrapBuildEnvironmentSha256",
      "providerSummary",
    ] as const) {
      if (!Object.hasOwn(record, name) || record[name] !== null)
        errors.push(`${label}: AWS ${name} must be null`);
    }
    if (record.providerPackageName !== "aws-cdk-lib")
      errors.push(`${label}: AWS providerPackageName must be aws-cdk-lib`);
    if (record.providerPackageVersion !== record.awsCdkLibVersion)
      errors.push(`${label}: AWS package version must match awsCdkLibVersion`);
    if (record.providerArchitecture !== "x86_64")
      errors.push(`${label}: AWS providerArchitecture must be x86_64`);
    if (record.providerRuntime !== "python3.13")
      errors.push(`${label}: AWS providerRuntime must be python3.13`);
    if (record.providerHandler !== "index.handler")
      errors.push(`${label}: AWS providerHandler must be index.handler`);
  } else if (implementationLabel(record) === "shin") {
    requireNumber("parallel");
    if (!Number.isInteger(record.parallel) || (record.parallel ?? 0) <= 0)
      errors.push(`${label}: Shin parallel must be a positive integer`);
    if (
      Object.hasOwn(record, "detailedFailureDiagnostics") &&
      record.detailedFailureDiagnostics !== true
    ) {
      errors.push(`${label}: Shin detailedFailureDiagnostics must be true`);
    }
    requireString("providerImplementationCommit");
    requireString("providerImplementationSubject");
    if (!/^[0-9a-f]{40}$/i.test(record.providerImplementationCommit ?? ""))
      errors.push(`${label}: invalid providerImplementationCommit`);
    if (record.providerPackageName !== "shin-bucket-deployment")
      errors.push(`${label}: Shin providerPackageName must be shin-bucket-deployment`);
    if (record.providerArchitecture !== "arm64")
      errors.push(`${label}: Shin providerArchitecture must be arm64`);
    if (record.providerRuntime !== "provided.al2023")
      errors.push(`${label}: Shin providerRuntime must be provided.al2023`);
    if (record.providerHandler !== "bootstrap")
      errors.push(`${label}: Shin providerHandler must be bootstrap`);
    if (!hexSha256.test(record.providerBootstrapSha256 ?? ""))
      errors.push(`${label}: invalid providerBootstrapSha256`);
    if (!hexSha256.test(record.providerBootstrapArchiveSha256 ?? ""))
      errors.push(`${label}: invalid providerBootstrapArchiveSha256`);
    if (!hexSha256.test(record.providerBootstrapProvenanceSha256 ?? ""))
      errors.push(`${label}: invalid providerBootstrapProvenanceSha256`);
    if (!hexSha256.test(record.providerBootstrapBuildToolchainSha256 ?? ""))
      errors.push(`${label}: invalid providerBootstrapBuildToolchainSha256`);
    if (!hexSha256.test(record.providerBootstrapBuildEnvironmentSha256 ?? ""))
      errors.push(`${label}: invalid providerBootstrapBuildEnvironmentSha256`);
    if (record.providerBootstrapBuildDirty !== false)
      errors.push(`${label}: providerBootstrapBuildDirty must be false`);
    for (const name of [
      "providerBootstrapCargoVersion",
      "providerBootstrapRustcVersion",
      "providerBootstrapCargoLambdaVersion",
      "providerBootstrapZigVersion",
    ] as const)
      requireString(name);
    if (
      isBase64Sha256(record.providerCodeSha256) &&
      Buffer.from(record.providerCodeSha256 as string, "base64").toString("hex") !==
        record.providerBootstrapArchiveSha256
    ) {
      errors.push(`${label}: deployed Shin code does not match provider bootstrap archive`);
    }
    if (record.providerSummary === undefined || record.providerSummary === null)
      errors.push(`${label}: providerSummary is required for Shin`);
    else {
      errors.push(
        ...providerSummaryErrors(record.providerSummary).map((error) => `${label}: ${error}`),
      );
    }
  } else {
    errors.push(`${label}: unsupported implementation`);
  }
  errors.push(...benchmarkEvidenceSanitizationErrors(record));
  return errors;
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
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_SECTIONS)) {
    if (!Object.hasOwn(value, sectionName)) continue;
    const section = value[sectionName];
    if (section === null) {
      sanitized[sectionName] = null;
      continue;
    }
    if (!isObject(section)) throw new Error(`providerSummary.${sectionName} must be an object.`);
    const allowed = new Set(Object.keys(fields));
    if (sectionName === "putObject" && value.schemaVersion === 4) {
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
    if (sectionName === "putObject" && value.schemaVersion === 4) {
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

export function providerSummaryErrors(summary: ProviderSummary): string[] {
  return summary.schemaVersion === 4
    ? providerSummaryV4Errors(summary)
    : providerSummaryV3Errors(summary);
}

export function providerSummaryV4Errors(summary: ProviderSummary): string[] {
  const putObject = isObject(summary.putObject) ? summary.putObject : {};
  const {
    failuresBySdkErrorKind: _failuresBySdkErrorKind,
    failuresByServiceCode: _failuresByServiceCode,
    failureStates: _failureStates,
    failureStateOverflowAttempts: _failureStateOverflowAttempts,
    ...v3PutObject
  } = putObject;
  const { detailedFailureDiagnosticsEnabled: _detailedFailureDiagnosticsEnabled, ...commonFields } =
    summary;
  const commonSummary = {
    ...commonFields,
    schemaVersion: 3,
    putObject: v3PutObject,
  } as ProviderSummary;
  const errors = providerSummaryV3Errors(commonSummary).map((error) =>
    error.replaceAll("schema-v3", "schema-v4"),
  );
  try {
    sanitizeProviderSummary(summary);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  if (summary.schemaVersion !== 4) return ["schema-v4 schemaVersion must be 4"];
  if (typeof summary.detailedFailureDiagnosticsEnabled !== "boolean") {
    errors.push("schema-v4 detailedFailureDiagnosticsEnabled must be boolean");
  }
  for (const [name, kind] of Object.entries(PROVIDER_SUMMARY_SCALARS)) {
    const value = summary[name as keyof ProviderSummary];
    if (kind === "number" && typeof value === "number" && !Number.isSafeInteger(value)) {
      errors.push(`schema-v4 summary field ${name} must be a safe integer`);
    }
  }
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_SECTIONS)) {
    const section = summary[sectionName as keyof ProviderSummary];
    if (!isObject(section)) continue;
    for (const [name, kind] of Object.entries(fields)) {
      const value = section[name];
      if (kind === "number" && typeof value === "number" && !Number.isSafeInteger(value)) {
        errors.push(`schema-v4 summary field ${sectionName}.${name} must be a safe integer`);
      }
    }
  }
  const put = summary.putObject;
  if (!isObject(put)) {
    errors.push("schema-v4 summary section putObject must be an object");
    return errors;
  }
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
    if (represented + overflow !== failed) {
      errors.push(
        "schema-v4 PutObject failure-state counts plus overflow must equal failedAttempts",
      );
    }
    if (sdkCount !== failed) {
      errors.push("schema-v4 PutObject SDK-kind counts must equal failedAttempts");
    }
    if (serviceCount > failed) {
      errors.push("schema-v4 PutObject service-code counts exceed failedAttempts");
    }
  } else if (sdkCount !== 0n || serviceCount !== 0n || states.length !== 0 || overflow !== 0n) {
    errors.push("schema-v4 disabled detailed failure diagnostics must be empty");
  }
  if (
    ((put.retryAttempts as number | undefined) ?? 0) >
    ((put.wireAttempts as number | undefined) ?? 0)
  ) {
    errors.push("schema-v4 PutObject retryAttempts exceeds wireAttempts");
  }
  if (safeNonnegativeBigInt(put.throttledAttempts) > failed) {
    errors.push("schema-v4 PutObject throttledAttempts exceeds failedAttempts");
  }
  return errors;
}

export function providerSummaryV3Errors(summary: ProviderSummary): string[] {
  const errors: string[] = [];
  try {
    sanitizeProviderSummary(summary);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return errors;
  }
  const expectedTopLevel = new Set([
    ...PROVIDER_SUMMARY_V3_SCALARS,
    ...Object.keys(PROVIDER_SUMMARY_SECTIONS),
  ]);
  for (const name of Object.keys(summary)) {
    if (!expectedTopLevel.has(name))
      errors.push(`schema-v3 summary contains unexpected field ${name}`);
  }
  for (const name of expectedTopLevel) {
    if (!Object.hasOwn(summary, name)) errors.push(`schema-v3 summary is missing ${name}`);
  }
  for (const name of PROVIDER_SUMMARY_V3_SCALARS) {
    if (summary[name as keyof ProviderSummary] === null) {
      errors.push(`schema-v3 summary field ${name} must not be null`);
    }
  }
  if (summary.event !== "shin_deployment_summary") errors.push("schema-v3 event is invalid");
  if (summary.schemaVersion !== 3) errors.push("schema-v3 schemaVersion must be 3");
  if (!(["Create", "Update", "Delete"] as const).includes(summary.requestType as never))
    errors.push("schema-v3 requestType is invalid");
  if (summary.deploymentStatus !== "success")
    errors.push("schema-v3 deploymentStatus must be success");
  if (
    !(["sse-s3-etag", "kms-sha256"] as const).includes(summary.destinationChecksumStrategy as never)
  )
    errors.push("schema-v3 destinationChecksumStrategy is invalid");
  if (summary.availableMemoryMb === null || (summary.availableMemoryMb ?? 0) <= 0)
    errors.push("schema-v3 availableMemoryMb must be positive");
  if (summary.maxParallelTransfers === null || (summary.maxParallelTransfers ?? 0) <= 0)
    errors.push("schema-v3 maxParallelTransfers must be positive");
  if (summary.markerReplacement?.strategy !== "planning-plus-retryable-stream")
    errors.push("schema-v3 markerReplacement.strategy is invalid");
  if (summary.markerReplacement?.semantics !== "leftmost-longest-non-recursive")
    errors.push("schema-v3 markerReplacement.semantics is invalid");
  if (summary.markerReplacement?.plannedPassesPerUpload !== 2)
    errors.push("schema-v3 markerReplacement.plannedPassesPerUpload must be 2");
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_SECTIONS)) {
    const section = summary[sectionName as keyof ProviderSummary];
    if (!isObject(section)) {
      errors.push(`schema-v3 summary section ${sectionName} must be an object`);
      continue;
    }
    for (const name of Object.keys(fields)) {
      if (!Object.hasOwn(section, name)) {
        errors.push(`schema-v3 summary is missing ${sectionName}.${name}`);
      } else if (section[name] === null) {
        errors.push(`schema-v3 summary field ${sectionName}.${name} must not be null`);
      } else if (typeof section[name] === "number" && !Number.isInteger(section[name])) {
        errors.push(`schema-v3 summary field ${sectionName}.${name} must be an integer`);
      }
    }
  }
  for (const name of [
    "schemaVersion",
    "availableMemoryMb",
    "maxParallelTransfers",
    "durationMs",
  ] as const) {
    if (typeof summary[name] === "number" && !Number.isInteger(summary[name]))
      errors.push(`schema-v3 summary field ${name} must be an integer`);
  }
  if (summary.extract !== true) errors.push("schema-v3 extract must be true");
  if (summary.deleteStaleObjectsOnDeployment !== true)
    errors.push("schema-v3 deleteStaleObjectsOnDeployment must be true");
  if (summary.transfer?.failedObjects !== 0)
    errors.push("schema-v3 transfer failedObjects must be zero");
  if (summary.transfer?.cancelledObjects !== 0)
    errors.push("schema-v3 transfer cancelledObjects must be zero");
  if (summary.transfer?.panickedObjects !== 0)
    errors.push("schema-v3 transfer panickedObjects must be zero");
  if (summary.transfer?.scheduledObjects !== summary.transfer?.completedObjects)
    errors.push("schema-v3 transfer scheduledObjects must equal completedObjects");
  if ((summary.transfer?.inFlightHighWater ?? 0) > (summary.maxParallelTransfers ?? 0))
    errors.push("schema-v3 transfer inFlightHighWater exceeds maxParallelTransfers");
  if (summary.source?.globalResidentBytesCurrent !== 0)
    errors.push("schema-v3 source globalResidentBytesCurrent must be zero");
  if ((summary.putObject?.failedAttempts ?? 0) > (summary.putObject?.wireAttempts ?? 0))
    errors.push("schema-v3 PutObject failedAttempts exceeds wireAttempts");
  if ((summary.putObject?.retryAttempts ?? 0) > (summary.putObject?.wireAttempts ?? 0))
    errors.push("schema-v3 PutObject retryAttempts exceeds wireAttempts");
  if ((summary.putObject?.throttledAttempts ?? 0) > (summary.putObject?.failedAttempts ?? 0))
    errors.push("schema-v3 PutObject throttledAttempts exceeds failedAttempts");
  if ((summary.deleteObject?.failedCalls ?? 0) > (summary.deleteObject?.sdkCalls ?? 0))
    errors.push("schema-v3 DeleteObjects failedCalls exceeds sdkCalls");
  if (
    (summary.deleteObject?.inferredDeletedObjects ?? 0) +
      (summary.deleteObject?.unconfirmedObjects ?? 0) +
      (summary.deleteObject?.noSuchBucketRequestedIdentifiers ?? 0) !==
    summary.deleteObject?.requestedObjects
  ) {
    errors.push("schema-v3 DeleteObjects outcomes do not equal requestedObjects");
  }
  if (summary.callback?.confirmedResponses !== 1)
    errors.push("schema-v3 callback confirmedResponses must be one");
  if ((summary.callback?.wireAttempts ?? 0) < 1)
    errors.push("schema-v3 callback wireAttempts must be positive");
  if (
    (summary.callback?.failedAttempts ?? 0) + (summary.callback?.confirmedResponses ?? 0) !==
    summary.callback?.wireAttempts
  ) {
    errors.push("schema-v3 callback outcomes do not equal wireAttempts");
  }
  if (summary.callback?.retryAttempts !== (summary.callback?.wireAttempts ?? 0) - 1)
    errors.push("schema-v3 callback retryAttempts must equal wireAttempts minus one");
  return errors;
}

export function benchmarkEvidenceSanitizationErrors(
  record: BenchmarkResultRecord,
  forbiddenValues: readonly string[] = [],
): string[] {
  const errors: string[] = [];
  const serialized = JSON.stringify(record);
  const sensitiveText = JSON.stringify([
    record.providerImplementationSubject,
    record.providerPackageName,
    record.providerPackageVersion,
    record.providerRuntime,
    record.providerHandler,
    record.cdkCliVersion,
    record.awsCdkLibVersion,
    record.region,
    record.profile,
    record.phase,
    record.state,
    record.cleanup,
    record.notes,
    record.decisionRunId,
    record.comparisonVariant,
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

export function isCompleteBenchmarkRecord(record: BenchmarkResultRecord): boolean {
  return record.cleanup === "all benchmark stacks destroyed";
}

export function benchmarkMethodologyVersion(record: BenchmarkResultRecord): number {
  return record.methodologyVersion ?? 1;
}

export function selectBenchmarkRun(
  records: readonly BenchmarkResultRecord[],
  requestedRunId?: string,
): BenchmarkResultRecord[] {
  const runId = requestedRunId ?? [...records].reverse().find((record) => record.runId)?.runId;
  return runId === undefined || runId === null
    ? [...records]
    : records.filter((record) => record.runId === runId);
}

export function phaseRank(phase: string | null | undefined): number {
  return PHASE_RANKS.get(phase ?? "") ?? Number.MAX_SAFE_INTEGER;
}

export function implementationLabel(record: BenchmarkResultRecord): string {
  const implementation = normalizeImplementation(
    record.implementation ?? inferImplementation(record),
  );
  return implementation ?? "unknown";
}

export function normalizeImplementation(value: string | null | undefined): string | null {
  return value ?? null;
}

export function isBenchmarkImplementation(
  value: string | undefined,
): value is BenchmarkImplementation {
  return includesString(BENCHMARK_IMPLEMENTATIONS, value);
}

export function isBenchmarkAssetProfile(value: string | undefined): value is BenchmarkAssetProfile {
  return includesString(BENCHMARK_ASSET_PROFILES, value);
}

export function isBenchmarkAssetState(value: string | undefined): value is BenchmarkAssetState {
  return includesString(BENCHMARK_ASSET_STATES, value);
}

function inferImplementation(record: BenchmarkResultRecord): string | null {
  if (record.providerImplementationCommit || record.providerSummary) {
    return "shin";
  }
  return null;
}

function includesString<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return value !== undefined && values.includes(value as T);
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
