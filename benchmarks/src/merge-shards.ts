import { mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseCliOptions } from "./cli";
import {
  type BenchmarkRunRecord,
  type BenchmarkSampleRecord,
  benchmarkEvidenceErrors,
  benchmarkRunKey,
  benchmarkSampleKey,
  phaseRank,
  readBenchmarkEvidence,
  runsFileFor,
} from "./model";
import { writeBenchmarkLedger } from "./persistence";
import {
  type ResumeIdentity,
  assertBenchmarkShardMatchesManifest,
  writeBenchmarkRunManifest,
} from "./resume";
import { selectValidatedBenchmarkRun } from "./validation";

const REQUIRED_SHARD_FILES = [
  "benchmark-run-manifest.json",
  "results.jsonl",
  "runs.jsonl",
] as const;
const CLI_OPTIONS = ["config", "input-directory", "output-file", "run-id", "scratch-root"] as const;

export type MergeBenchmarkShardsOptions = {
  readonly configFile: string;
  readonly inputDirectory: string;
  readonly outputFile: string;
  readonly runId: string;
  readonly scratchRoot: string;
};

export function mergeBenchmarkShards(options: MergeBenchmarkShardsOptions): {
  readonly repetitions: number;
  readonly runs: number;
  readonly samples: number;
} {
  const shardDirectories = readdirSync(resolve(options.inputDirectory), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(resolve(options.inputDirectory), entry.name))
    .sort();
  if (shardDirectories.length === 0) {
    throw new Error("No benchmark repetition artifacts were available to merge.");
  }

  let commonIdentity: ResumeIdentity | undefined;
  let commonIdentityJson: string | undefined;
  const repetitions = new Set<number>();
  const runs = new Map<string, BenchmarkRunRecord>();
  const samples = new Map<string, BenchmarkSampleRecord>();

  for (const shardDirectory of shardDirectories) {
    assertExactShardFiles(shardDirectory);
    const resultsFile = join(shardDirectory, "results.jsonl");
    const manifest = assertBenchmarkShardMatchesManifest({
      manifestFile: join(shardDirectory, "benchmark-run-manifest.json"),
      evidenceFile: resultsFile,
    });
    if (manifest.identity.runId !== options.runId) {
      throw new Error(`Benchmark shard ${shardDirectory} has an unexpected run UUID.`);
    }
    const identityJson = JSON.stringify(manifest.identity);
    if (commonIdentity === undefined) {
      commonIdentity = manifest.identity;
      commonIdentityJson = identityJson;
    } else if (identityJson !== commonIdentityJson) {
      throw new Error("Benchmark repetition artifacts do not share one exact run identity.");
    }

    const evidence = readBenchmarkEvidence(resultsFile);
    const errors = benchmarkEvidenceErrors(evidence);
    if (errors.length > 0) {
      throw new Error(`Invalid benchmark shard evidence: ${errors.join("; ")}`);
    }
    const shardRepetitions = new Set(
      evidence.samples.map((sample) => sample.repetition).filter(isNumber),
    );
    if (shardRepetitions.size !== 1) {
      throw new Error("Each benchmark artifact must contain exactly one repetition.");
    }
    const [repetition] = shardRepetitions;
    if (repetition === undefined || repetitions.has(repetition)) {
      throw new Error(`Duplicate benchmark repetition artifact ${repetition ?? "missing"}.`);
    }
    repetitions.add(repetition);

    for (const run of evidence.runs) {
      const key = benchmarkRunKey(run);
      const existing = runs.get(key);
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(run)) {
        throw new Error(`Benchmark run metadata differs between repetition artifacts for ${key}.`);
      }
      runs.set(key, run);
    }
    for (const sample of evidence.samples) {
      const key = benchmarkSampleKey(sample);
      if (samples.has(key)) {
        throw new Error(`Duplicate benchmark sample while merging ${key}.`);
      }
      samples.set(key, sample);
    }
  }

  if (commonIdentity === undefined) {
    throw new Error("Benchmark repetition artifacts did not contain a run identity.");
  }
  const expectedRepetitions = commonIdentity.configuration.expectedRepetitions;
  if (
    expectedRepetitions !== 5 ||
    commonIdentity.configuration.repetitionParallelism !== expectedRepetitions ||
    shardDirectories.length !== expectedRepetitions
  ) {
    throw new Error(
      "Canonical publication requires five independently completed repetition shards.",
    );
  }
  for (let repetition = 1; repetition <= expectedRepetitions; repetition += 1) {
    if (!repetitions.has(repetition)) {
      throw new Error(`Canonical benchmark repetition ${repetition} is missing.`);
    }
  }

  const mergedRuns = [...runs.values()].sort((left, right) =>
    String(left.implementation).localeCompare(String(right.implementation)),
  );
  const mergedSamples = [...samples.values()].sort(compareSamples);
  const mergedErrors = benchmarkEvidenceErrors({ runs: mergedRuns, samples: mergedSamples });
  if (mergedErrors.length > 0) {
    throw new Error(`Invalid merged benchmark evidence: ${mergedErrors.join("; ")}`);
  }

  writeBenchmarkLedger(
    options.outputFile,
    `${mergedSamples.map((sample) => JSON.stringify(sample)).join("\n")}\n`,
  );
  writeBenchmarkLedger(
    runsFileFor(options.outputFile),
    `${mergedRuns.map((run) => JSON.stringify(run)).join("\n")}\n`,
  );
  mkdirSync(options.scratchRoot, { recursive: true });
  writeBenchmarkRunManifest({
    manifestFile: join(options.scratchRoot, "benchmark-run-manifest.json"),
    evidenceFile: options.outputFile,
    identity: commonIdentity,
  });
  selectValidatedBenchmarkRun({
    runs: mergedRuns,
    samples: mergedSamples,
    runId: options.runId,
    configFile: options.configFile,
    inputFile: options.outputFile,
    scratchRoot: options.scratchRoot,
  });

  return {
    repetitions: repetitions.size,
    runs: mergedRuns.length,
    samples: mergedSamples.length,
  };
}

function assertExactShardFiles(shardDirectory: string): void {
  const observed = readdirSync(shardDirectory)
    .filter((name) => !name.startsWith("."))
    .sort();
  if (JSON.stringify(observed) !== JSON.stringify([...REQUIRED_SHARD_FILES].sort())) {
    throw new Error(`Benchmark shard ${shardDirectory} does not contain the exact sanitized set.`);
  }
}

function compareSamples(left: BenchmarkSampleRecord, right: BenchmarkSampleRecord): number {
  return (
    compareNumber(left.repetition, right.repetition) ||
    String(left.profile).localeCompare(String(right.profile)) ||
    compareNumber(left.memoryMb, right.memoryMb) ||
    compareNumber(left.parallel, right.parallel) ||
    String(left.implementation).localeCompare(String(right.implementation)) ||
    compareNumber(left.sourceWindowBytes, right.sourceWindowBytes) ||
    phaseRank(left.phase) - phaseRank(right.phase) ||
    String(left.sampleId).localeCompare(String(right.sampleId))
  );
}

function compareNumber(left: number | null | undefined, right: number | null | undefined): number {
  return (left ?? -1) - (right ?? -1);
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number";
}

function main(): void {
  const values = parseCliOptions(process.argv.slice(2), CLI_OPTIONS, usage);
  const result = mergeBenchmarkShards({
    configFile: required(values, "config"),
    inputDirectory: required(values, "input-directory"),
    outputFile: required(values, "output-file"),
    runId: required(values, "run-id"),
    scratchRoot: required(values, "scratch-root"),
  });
  console.log(
    `merged ${result.repetitions} benchmark repetitions, ${result.runs} run records, and ${result.samples} samples`,
  );
}

function required(values: ReadonlyMap<string, string>, name: string): string {
  return values.get(name) ?? usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/merge-shards.js --config <path> --input-directory <path> --output-file <results.jsonl> --run-id <uuid> --scratch-root <path>",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
