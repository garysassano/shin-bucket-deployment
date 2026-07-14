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
  readonly durationMs?: number | null;
  readonly phaseMs?: Record<string, number | null> | null;
  readonly counts?: Record<string, number | null> | null;
  readonly bytes?: Record<string, number | null> | null;
  readonly transfer?: Record<string, number | null> | null;
  readonly markerReplacement?: Record<string, string | number | null> | null;
  readonly catalog?: Record<string, number | null> | null;
  readonly source?: Record<string, number | null> | null;
  readonly putObject?: Record<string, number | null> | null;
  readonly deleteObject?: Record<string, number | null> | null;
  readonly callback?: Record<string, number | null> | null;
};

export type BenchmarkResultRecord = {
  readonly resultSchemaVersion?: number | null;
  readonly methodologyVersion?: number | null;
  readonly runId?: string | null;
  readonly sampleId?: string | null;
  readonly snapshotDate?: string | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly repetition?: number | null;
  readonly providerImplementationCommit?: string | null;
  readonly providerImplementationSubject?: string | null;
  readonly providerPackageName?: string | null;
  readonly providerPackageVersion?: string | null;
  readonly providerArchitecture?: string | null;
  readonly providerCodeSha256?: string | null;
  readonly providerBootstrapSha256?: string | null;
  readonly gitDirty?: boolean | null;
  readonly cdkCliVersion?: string | null;
  readonly awsCdkLibVersion?: string | null;
  readonly awsCdkLibIntegrity?: string | null;
  readonly executionEnvironmentFresh?: boolean | null;
  readonly memoryMeasurementScope?: "phase-local" | "cumulative" | null;
  readonly resultDocumentationCommit?: string | null;
  readonly region?: string | null;
  readonly implementation?: string | null;
  readonly profile?: string | null;
  readonly memoryMb?: number | null;
  readonly parallel?: number | null;
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

export function methodologyV2RecordErrors(record: BenchmarkResultRecord): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexSha256 = /^[0-9a-f]{64}$/i;
  const errors: string[] = [];
  const label = `${record.sampleId ?? "missing-sample"}/${record.phase ?? "missing-phase"}`;
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
  if (record.resultSchemaVersion !== 2) errors.push(`${label}: resultSchemaVersion must be 2`);
  if (record.methodologyVersion !== 2) errors.push(`${label}: methodologyVersion must be 2`);
  if (!uuid.test(record.runId ?? "")) errors.push(`${label}: runId must be a UUID`);
  if (!uuid.test(record.sampleId ?? "")) errors.push(`${label}: sampleId must be an opaque UUID`);
  for (const name of [
    "snapshotDate",
    "providerPackageName",
    "providerPackageVersion",
    "providerArchitecture",
    "providerCodeSha256",
    "cdkCliVersion",
    "awsCdkLibVersion",
    "awsCdkLibIntegrity",
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
    "maxMemoryMb",
  ] as const)
    requireNumber(name);
  if (record.gitDirty !== false) errors.push(`${label}: gitDirty must be false`);
  if (record.executionEnvironmentFresh !== true)
    errors.push(`${label}: executionEnvironmentFresh must be true`);
  if (record.memoryMeasurementScope !== "phase-local")
    errors.push(`${label}: memoryMeasurementScope must be phase-local`);
  if (record.providerInvoked !== true) errors.push(`${label}: providerInvoked must be true`);
  if (!isCompleteBenchmarkRecord(record)) errors.push(`${label}: cleanup is incomplete`);
  if (implementationLabel(record) === "aws") {
    if (record.parallel !== null) errors.push(`${label}: AWS parallel must be null`);
  } else if (implementationLabel(record) === "shin") {
    requireNumber("parallel");
    requireString("providerImplementationCommit");
    requireString("providerImplementationSubject");
    if (!hexSha256.test(record.providerBootstrapSha256 ?? ""))
      errors.push(`${label}: invalid providerBootstrapSha256`);
    if (record.providerSummary === undefined || record.providerSummary === null)
      errors.push(`${label}: providerSummary is required for Shin`);
    else {
      if (record.providerSummary.schemaVersion !== 3)
        errors.push(`${label}: Shin providerSummary schemaVersion must be 3`);
      if (
        typeof record.providerSummary.deploymentStatus !== "string" ||
        record.providerSummary.deploymentStatus.length === 0
      )
        errors.push(`${label}: Shin providerSummary deploymentStatus is required`);
    }
  } else {
    errors.push(`${label}: unsupported implementation`);
  }
  return errors;
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
  if (value === "rust") {
    return "shin";
  }
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
