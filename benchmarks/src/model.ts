import { readFileSync } from "node:fs";

export const BENCHMARK_IMPLEMENTATIONS = ["shin", "aws"] as const;
export type BenchmarkImplementation = (typeof BENCHMARK_IMPLEMENTATIONS)[number];

export const BENCHMARK_ASSET_PROFILES = ["tiny-many", "mixed", "large-few"] as const;
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
  readonly requestType?: string | null;
  readonly status?: string | null;
  readonly extract?: boolean | null;
  readonly prune?: boolean | null;
  readonly availableMemoryMb?: number | null;
  readonly maxParallelTransfers?: number | null;
  readonly durationMs?: number | null;
  readonly phaseMs?: Record<string, number | null> | null;
  readonly counts?: Record<string, number | null> | null;
  readonly bytes?: Record<string, number | null> | null;
  readonly source?: Record<string, number | null> | null;
  readonly putObject?: Record<string, number | null> | null;
};

export type BenchmarkResultRecord = {
  readonly snapshotDate?: string | null;
  readonly providerImplementationCommit?: string | null;
  readonly providerImplementationSubject?: string | null;
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
    "profile" | "memoryMb" | "parallel" | "implementation" | "phase" | "state"
  >,
): string {
  return [
    record.profile,
    record.memoryMb,
    record.parallel,
    normalizeImplementation(record.implementation),
    record.phase,
    record.state,
  ]
    .map((part) => part ?? "")
    .join("\u0000");
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
