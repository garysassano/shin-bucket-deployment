import type { BenchmarkRunOptions, LambdaConfig } from "./config";
import type { BenchmarkAssetProfile, BenchmarkImplementation } from "./model";

export type PlannedBenchmarkRun = {
  readonly repetition: number;
  readonly sampleId: string;
  readonly implementation: BenchmarkImplementation;
  readonly assetProfile: BenchmarkAssetProfile;
  readonly memoryMb: number;
  readonly parallel: number | null;
};

export function createBenchmarkPlan(options: BenchmarkRunOptions): PlannedBenchmarkRun[] {
  const configurations = options.assetProfiles.flatMap((assetProfile) =>
    options.lambdaConfigs.flatMap((lambdaConfig) =>
      planImplementations(options, assetProfile, lambdaConfig),
    ),
  );
  const deduplicated = deduplicateRuns(configurations);
  return Array.from(
    { length: options.repetitions },
    (_, index) => options.startRepetition + index,
  ).flatMap((repetition) =>
    deduplicated.map((configuration) => ({
      ...configuration,
      repetition,
      sampleId: sampleId(options.runId, repetition, configuration),
    })),
  );
}

export function wallClockCapReached(
  startedAtMs: number,
  maxWallClockMinutes: number | undefined,
  nowMs = Date.now(),
): boolean {
  return (
    maxWallClockMinutes !== undefined && nowMs - startedAtMs >= maxWallClockMinutes * 60 * 1000
  );
}

function planImplementations(
  options: BenchmarkRunOptions,
  assetProfile: BenchmarkAssetProfile,
  lambdaConfig: LambdaConfig,
): Array<Omit<PlannedBenchmarkRun, "repetition" | "sampleId">> {
  return options.implementations.map((implementation) => ({
    implementation,
    assetProfile,
    memoryMb: lambdaConfig.memoryMb,
    parallel: implementation === "aws" ? null : lambdaConfig.parallel,
  }));
}

function deduplicateRuns(
  runs: readonly Omit<PlannedBenchmarkRun, "repetition" | "sampleId">[],
): Array<Omit<PlannedBenchmarkRun, "repetition" | "sampleId">> {
  const seen = new Set<string>();
  return runs.filter((run) => {
    const key = [run.implementation, run.assetProfile, run.memoryMb, run.parallel ?? "na"].join(
      "\0",
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sampleId(
  runId: string,
  repetition: number,
  run: Omit<PlannedBenchmarkRun, "repetition" | "sampleId">,
): string {
  return [
    runId,
    repetition,
    run.implementation,
    run.assetProfile,
    run.memoryMb,
    run.parallel ?? "na",
  ].join(":");
}
