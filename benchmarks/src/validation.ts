import type { BenchmarkRunOptions } from "./config";
import { benchmarkConfigurationSha256, parseBenchmarkRunOptions } from "./config";
import type { BenchmarkResultRecord } from "./model";
import {
  benchmarkMethodologyVersion,
  implementationLabel,
  isCompleteBenchmarkRecord,
  methodologyV2RecordErrors,
  selectBenchmarkRun,
} from "./model";
import { createBenchmarkPlan } from "./plan";
import { assertBenchmarkLedgerMatchesManifest } from "./resume";

export const CANONICAL_BENCHMARK_CONFIG = "benchmarks/configs/methodology-v2-1024-32.json";

export function selectValidatedBenchmarkRun(args: {
  readonly records: readonly BenchmarkResultRecord[];
  readonly methodologyVersion: 1 | 2;
  readonly runId?: string;
  readonly configFile?: string;
  readonly inputFile?: string;
  readonly scratchRoot?: string;
}): BenchmarkResultRecord[] {
  const methodologyRecords = args.records.filter(
    (record) => benchmarkMethodologyVersion(record) === args.methodologyVersion,
  );
  const selected = selectBenchmarkRun(
    args.methodologyVersion === 1
      ? methodologyRecords.filter(isCompleteBenchmarkRecord)
      : methodologyRecords,
    args.runId,
  );
  if (args.methodologyVersion === 2) {
    if (args.inputFile !== undefined) {
      if (args.scratchRoot === undefined) {
        throw new Error("Methodology-v2 publication requires the external scratch directory.");
      }
      assertBenchmarkLedgerMatchesManifest({
        scratchRoot: args.scratchRoot,
        evidenceFile: args.inputFile,
      });
    }
    const runId = selected[0]?.runId;
    if (!runId) throw new Error("A complete methodology-v2 run UUID is required.");
    const snapshotDate = selected[0]?.snapshotDate;
    if (!snapshotDate) throw new Error("A complete methodology-v2 snapshot date is required.");
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
    ]);
    validateMethodologyV2Run(selected, options);
    const v2RunIds = new Set(
      methodologyRecords.map((record) => record.runId).filter((runId) => runId !== null),
    );
    if (args.runId === undefined && v2RunIds.size !== 1) {
      throw new Error(
        "Methodology-v2 publication requires exactly one run in the ledger or an explicit run-id.",
      );
    }
  }
  return selected;
}

export function validateMethodologyV2Run(
  records: readonly BenchmarkResultRecord[],
  options: BenchmarkRunOptions,
): void {
  if (records.length === 0) {
    throw new Error("No methodology-v2 records were available for canonical rendering.");
  }
  if (
    options.methodologyVersion !== 2 ||
    options.repetitions !== 5 ||
    options.startRepetition !== 1
  ) {
    throw new Error("Canonical methodology-v2 rendering requires the exact five-repetition plan.");
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
  const errors: string[] = [];
  const expectedConfigurationSha256 = benchmarkConfigurationSha256(options);
  const workloadIdentity = new Map<string, string>();
  for (const record of records) {
    errors.push(...methodologyV2RecordErrors(record));
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
      record.region !== options.region ||
      record.snapshotDate !== options.snapshotDate ||
      record.decisionRunId !== (options.decisionRunId ?? null) ||
      record.comparisonVariant !== (options.comparisonVariant ?? null) ||
      record.benchmarkConfigSha256 !== expectedConfigurationSha256 ||
      record.repetition !== sample.repetition ||
      implementationLabel(record) !== sample.implementation ||
      record.profile !== sample.assetProfile ||
      record.memoryMb !== sample.memoryMb ||
      record.parallel !== sample.parallel ||
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
  for (const identity of expected.keys()) {
    if (!observed.has(identity))
      errors.push(`missing planned sample/phase ${identity.replace("\0", "/")}`);
  }
  for (const field of [
    "snapshotDate",
    "cdkCliVersion",
    "cdkCliInstalledSha256",
    "awsCdkLibVersion",
    "awsCdkLibIntegrity",
    "awsCdkLibInstalledSha256",
    "constructsInstalledSha256",
    "dependencyLockSha256",
    "applicationBuildSha256",
    "installedDependenciesSha256",
    "nodeVersion",
    "pnpmVersion",
    "executionEnvironmentSha256",
    "sourceTreeSha256",
    "benchmarkConfigSha256",
    "decisionRunId",
    "comparisonVariant",
    "resultDocumentationCommit",
  ] as const) {
    if (new Set(records.map((record) => record[field])).size !== 1) {
      errors.push(`inconsistent run metadata field ${field}`);
    }
  }
  const shinRecords = records.filter((record) => implementationLabel(record) === "shin");
  for (const field of [
    "providerImplementationCommit",
    "providerImplementationSubject",
    "providerPackageName",
    "providerPackageVersion",
    "providerArchitecture",
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
  ] as const) {
    if (new Set(shinRecords.map((record) => record[field])).size !== 1) {
      errors.push(`inconsistent Shin provider field ${field}`);
    }
  }
  for (const implementation of ["shin", "aws"] as const) {
    const implementationRecords = records.filter(
      (record) => implementationLabel(record) === implementation,
    );
    for (const field of [
      "providerPackageName",
      "providerPackageVersion",
      "providerArchitecture",
      "providerRuntime",
      "providerHandler",
      "providerCodeSha256",
    ] as const) {
      if (new Set(implementationRecords.map((record) => record[field])).size !== 1) {
        errors.push(`inconsistent ${implementation} provider field ${field}`);
      }
    }
  }
  for (const record of shinRecords) {
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
    if (record.providerSummary?.destinationChecksumStrategy !== "sse-s3-etag") {
      errors.push(`${record.sampleId}/${record.phase}: summary checksum strategy mismatch`);
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
    throw new Error(
      `Invalid or incomplete methodology-v2 benchmark run:\n- ${errors.join("\n- ")}`,
    );
  }
}
