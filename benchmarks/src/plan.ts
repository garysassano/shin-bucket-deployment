import { createHash } from "node:crypto";
import type { BenchmarkRunOptions, LambdaConfig } from "./config";
import type { BenchmarkAssetProfile, BenchmarkImplementation } from "./model";

export type PlannedBenchmarkRun = {
  readonly repetition: number;
  readonly sampleId: string;
  readonly implementation: BenchmarkImplementation;
  readonly assetProfile: BenchmarkAssetProfile;
  readonly memoryMb: number;
  readonly parallel: number | null;
  readonly sourceWindowBytes?: number | null;
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
      sampleId: benchmarkSampleId(options.runId, repetition, configuration),
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
    ...(implementation === "shin" && Object.hasOwn(lambdaConfig, "sourceWindowBytes")
      ? { sourceWindowBytes: lambdaConfig.sourceWindowBytes ?? null }
      : {}),
  }));
}

function deduplicateRuns(
  runs: readonly Omit<PlannedBenchmarkRun, "repetition" | "sampleId">[],
): Array<Omit<PlannedBenchmarkRun, "repetition" | "sampleId">> {
  const seen = new Set<string>();
  return runs.filter((run) => {
    const key = [
      run.implementation,
      run.assetProfile,
      run.memoryMb,
      run.parallel ?? "na",
      ...(Object.hasOwn(run, "sourceWindowBytes") ? [run.sourceWindowBytes ?? "adaptive"] : []),
    ].join("\0");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function benchmarkSampleId(
  runId: string,
  repetition: number,
  run: Omit<PlannedBenchmarkRun, "repetition" | "sampleId">,
): string {
  const digest = createHash("sha256")
    .update(
      [
        runId,
        repetition,
        run.implementation,
        run.assetProfile,
        run.memoryMb,
        run.parallel ?? "na",
        ...(Object.hasOwn(run, "sourceWindowBytes") ? [run.sourceWindowBytes ?? "adaptive"] : []),
      ].join("\0"),
    )
    .digest("hex")
    .slice(0, 32);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20)}`;
}
