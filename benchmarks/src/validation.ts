import type { BenchmarkRunOptions } from "./config";
import { benchmarkConfigurationSha256, parseBenchmarkRunOptions } from "./config";
import type { BenchmarkRunRecord, BenchmarkRunSample, BenchmarkSampleRecord } from "./model";
import {
  benchmarkEvidenceErrors,
  benchmarkRunKey,
  implementationLabel,
  joinBenchmarkSamples,
  selectBenchmarkRuns,
  selectBenchmarkSamples,
} from "./model";
import { createBenchmarkPlan } from "./plan";
import { assertBenchmarkLedgerMatchesManifest } from "./resume";

export const CANONICAL_BENCHMARK_CONFIG = "benchmarks/configs/canonical.json";

type BenchmarkSelectionArgs = {
  readonly runs: readonly BenchmarkRunRecord[];
  readonly samples: readonly BenchmarkSampleRecord[];
  readonly runId?: string;
  readonly configFile?: string;
  readonly inputFile?: string;
  readonly scratchRoot?: string;
};

export function selectValidatedBenchmarkRun(args: BenchmarkSelectionArgs): BenchmarkRunSample[] {
  return selectValidatedRecords(args, true);
}

export function selectValidatedBenchmarkPreview(
  args: BenchmarkSelectionArgs,
): BenchmarkRunSample[] {
  return selectValidatedRecords(args, false);
}

function selectValidatedRecords(
  args: BenchmarkSelectionArgs,
  requireCompleteRun: boolean,
): BenchmarkRunSample[] {
  const selectedRuns = selectBenchmarkRuns(args.runs, args.runId);
  const selectedSamples = selectBenchmarkSamples(args.samples, args.runId);
  {
    // Publication binds the ledger to its runner-written resume manifest. Preview
    // rendering is the explicit inspect-without-publishing mode, so it reads the
    // committed JSONL directly; records are still validated either way.
    if (requireCompleteRun && args.inputFile !== undefined) {
      if (args.scratchRoot === undefined) {
        throw new Error("Benchmark publication requires the external scratch directory.");
      }
      assertBenchmarkLedgerMatchesManifest({
        scratchRoot: args.scratchRoot,
        evidenceFile: args.inputFile,
      });
    }
    const runId = selectedRuns[0]?.runId ?? selectedSamples[0]?.runId;
    if (!runId) throw new Error("A canonical run UUID is required.");
    const snapshotDate = selectedRuns[0]?.snapshotDate;
    if (!snapshotDate) throw new Error("A canonical snapshot date is required.");
    const implementations = ["shin", "aws"].filter((implementation) =>
      selectedSamples.some((record) => implementationLabel(record) === implementation),
    );
    if (implementations.length === 0) {
      throw new Error("At least one canonical implementation is required.");
    }
    const decisionRunId = selectedRuns[0]?.decisionRunId ?? null;
    const comparisonVariant = selectedRuns[0]?.comparisonVariant ?? null;
    const repetitionParallelism = selectedRuns[0]?.config?.repetitionParallelism ?? 1;
    const options = parseBenchmarkRunOptions([
      "--config",
      args.configFile ?? CANONICAL_BENCHMARK_CONFIG,
      "--run-id",
      runId,
      "--snapshot-date",
      snapshotDate,
      "--start-repetition",
      "1",
      "--repetitions",
      "5",
      "--repetition-parallelism",
      String(repetitionParallelism),
      "--implementations",
      implementations.join(","),
      ...(decisionRunId ? ["--decision-run-id", decisionRunId] : []),
      ...(comparisonVariant ? ["--comparison-variant", comparisonVariant] : []),
    ]);
    validateCanonicalRecords(selectedRuns, selectedSamples, options, requireCompleteRun);
    const runIds = new Set(args.runs.map((run) => run.runId).filter(Boolean));
    if (args.runId === undefined && runIds.size !== 1) {
      throw new Error(
        "Canonical publication requires exactly one run in the ledger or an explicit run-id.",
      );
    }
  }
  return joinBenchmarkSamples(selectedRuns, selectedSamples);
}

export function validateCompleteCanonicalRun(args: {
  readonly runs: readonly BenchmarkRunRecord[];
  readonly samples: readonly BenchmarkSampleRecord[];
  readonly options: BenchmarkRunOptions;
}): void {
  validateCanonicalRecords(args.runs, args.samples, args.options, true);
}

function validateCanonicalRecords(
  runs: readonly BenchmarkRunRecord[],
  samples: readonly BenchmarkSampleRecord[],
  options: BenchmarkRunOptions,
  requireCompleteRun: boolean,
): void {
  if (samples.length === 0 && runs.length === 0) {
    throw new Error("No canonical benchmark records were available for rendering.");
  }
  if (options.repetitions !== 5 || options.startRepetition !== 1) {
    throw new Error("Canonical rendering requires the exact five-repetition plan.");
  }
  const errors: string[] = [];
  errors.push(...benchmarkEvidenceErrors({ runs, samples }));
  // Run records are per (runId x implementation). An implementation present in
  // the run ledger must be backed by samples: the expected matrix is derived
  // from samples, so without this check an orphan AWS run record with zero
  // samples would let a full Shin matrix publish with no upstream baseline.
  const runImplementations = new Set(runs.map((run) => implementationLabel(run)));
  const sampleImplementations = new Set(samples.map((sample) => implementationLabel(sample)));
  for (const implementation of runImplementations) {
    if (!sampleImplementations.has(implementation)) {
      errors.push(`run record implementation ${implementation} has no samples`);
    }
  }
  const expected = new Map<
    string,
    {
      sample: ReturnType<typeof createBenchmarkPlan>[number];
      phase: BenchmarkRunOptions["phases"][number];
    }
  >();
  for (const sample of createBenchmarkPlan(options)) {
    for (const phase of options.phases) {
      expected.set(`${sample.sampleId}\0${phase.name}`, { sample, phase });
    }
  }
  const observed = new Set<string>();
  const expectedConfigurationSha256 = benchmarkConfigurationSha256(options);
  const workloadIdentity = new Map<string, string>();
  const runsByKey = new Map(runs.map((run) => [benchmarkRunKey(run), run]));
  for (const record of samples) {
    const run = runsByKey.get(benchmarkRunKey(record));
    const identity = `${record.sampleId ?? ""}\0${record.phase ?? ""}`;
    const planned = expected.get(identity);
    if (planned === undefined) {
      errors.push(
        `unplanned sample/phase ${record.sampleId ?? "missing"}/${record.phase ?? "missing"}`,
      );
      continue;
    }
    if (observed.has(identity))
      errors.push(`duplicate sample/phase ${identity.replace("\0", "/")}`);
    observed.add(identity);
    const { sample } = planned;
    if (
      record.runId !== options.runId ||
      run?.region !== options.region ||
      run?.snapshotDate !== options.snapshotDate ||
      (run?.decisionRunId ?? null) !== (options.decisionRunId ?? null) ||
      (run?.comparisonVariant ?? null) !== (options.comparisonVariant ?? null) ||
      run?.config?.benchmarkConfigSha256 !== expectedConfigurationSha256 ||
      record.repetition !== sample.repetition ||
      implementationLabel(record) !== sample.implementation ||
      record.profile !== sample.assetProfile ||
      record.memoryMb !== sample.memoryMb ||
      (record.parallel ?? null) !== (sample.parallel ?? null) ||
      (Object.hasOwn(sample, "sourceWindowBytes") && !Object.hasOwn(record, "sourceWindowBytes")) ||
      (record.sourceWindowBytes ?? null) !== (sample.sourceWindowBytes ?? null) ||
      record.state !== planned.phase.assetState
    ) {
      errors.push(
        `record does not match planned matrix for ${sample.sampleId}/${planned.phase.name}`,
      );
    }
    const workloadKey = `${record.profile ?? ""}\0${record.state ?? ""}`;
    const identityValue = `${record.fileCount ?? ""}\0${record.totalBytes ?? ""}\0${
      record.assetManifestSha256 ?? ""
    }`;
    const existingWorkloadIdentity = workloadIdentity.get(workloadKey);
    if (existingWorkloadIdentity !== undefined && existingWorkloadIdentity !== identityValue) {
      errors.push(`${record.sampleId}/${record.phase}: inconsistent measured workload identity`);
    }
    workloadIdentity.set(workloadKey, identityValue);
  }
  if (requireCompleteRun) {
    for (const identity of expected.keys()) {
      if (!observed.has(identity))
        errors.push(`missing planned sample/phase ${identity.replace("\0", "/")}`);
    }
  } else {
    const sampleIds = new Set(samples.map((record) => record.sampleId).filter(Boolean));
    for (const sampleId of sampleIds) {
      for (const phase of options.phases) {
        const identity = `${sampleId}\0${phase.name}`;
        if (!observed.has(identity)) {
          errors.push(`incomplete preview sample/phase ${identity.replace("\0", "/")}`);
        }
      }
    }
  }
  for (const field of ["snapshotDate", "region"] as const) {
    if (new Set(runs.map((run) => run[field])).size !== 1) {
      errors.push(`inconsistent run metadata field ${field}`);
    }
  }
  for (const field of ["decisionRunId", "comparisonVariant"] as const) {
    if (new Set(runs.map((run) => run[field] ?? null)).size !== 1) {
      errors.push(`inconsistent run metadata field ${field}`);
    }
  }
  for (const field of [
    "benchmarkConfigSha256",
    "memoryMeasurementScope",
    "repetitionParallelism",
  ] as const) {
    if (new Set(runs.map((run) => run.config?.[field])).size !== 1) {
      errors.push(`inconsistent run metadata field ${field}`);
    }
  }
  for (const field of [
    "nodeVersion",
    "pnpmVersion",
    "executionEnvironmentSha256",
    "executionEnvironmentFresh",
    "dependencyLockSha256",
    "installedDependenciesSha256",
    "applicationBuildSha256",
    "sourceTreeSha256",
    "gitDirty",
  ] as const) {
    if (new Set(runs.map((run) => run.environment?.[field])).size !== 1) {
      errors.push(`inconsistent run metadata field ${field}`);
    }
  }
  for (const field of [
    "cliVersion",
    "cliInstalledSha256",
    "libVersion",
    "libInstalledSha256",
    "constructsInstalledSha256",
  ] as const) {
    if (new Set(runs.map((run) => run.cdk?.[field])).size !== 1) {
      errors.push(`inconsistent run metadata field ${field}`);
    }
  }
  const shinSamples = samples.filter((record) => implementationLabel(record) === "shin");
  for (const record of shinSamples) {
    if (record.providerSummary?.maxParallelTransfers !== record.parallel) {
      errors.push(`${record.sampleId}/${record.phase}: summary maxParallelTransfers mismatch`);
    }
    if (record.providerSummary?.availableMemoryMb !== record.memoryMb) {
      errors.push(`${record.sampleId}/${record.phase}: summary availableMemoryMb mismatch`);
    }
    const expectedRequestType = record.phase === options.phases[0]?.name ? "Create" : "Update";
    if (record.providerSummary?.requestType !== expectedRequestType) {
      errors.push(`${record.sampleId}/${record.phase}: summary requestType mismatch`);
    }
    if (
      Math.abs(
        (record.providerSummary?.durationMs ?? Number.POSITIVE_INFINITY) / 1000 -
          (record.providerDurationSeconds ?? 0),
      ) > 1
    ) {
      errors.push(`${record.sampleId}/${record.phase}: summary duration does not match REPORT`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Invalid or incomplete canonical benchmark run:\n- ${errors.join("\n- ")}`);
  }
}
