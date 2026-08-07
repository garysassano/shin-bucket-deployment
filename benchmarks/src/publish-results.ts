import { parseCliOptions } from "./cli";
import { readBenchmarkEvidence, runsFileFor } from "./model";
import { upsertBenchmarkRuns, upsertBenchmarkSamples } from "./persistence";
import { selectValidatedBenchmarkRun } from "./validation";

const CLI_OPTIONS = ["config", "input-file", "output-file", "run-id", "scratch-root"] as const;

function main(): void {
  const values = parseCliOptions(process.argv.slice(2), CLI_OPTIONS, usage);
  const inputFile = required(values, "input-file");
  const outputFile = values.get("output-file") ?? "benchmarks/results.jsonl";
  const runId = required(values, "run-id");
  const scratchRoot = required(values, "scratch-root");
  const evidence = readBenchmarkEvidence(inputFile);
  selectValidatedBenchmarkRun({
    runs: evidence.runs,
    samples: evidence.samples,
    runId,
    configFile: values.get("config"),
    inputFile,
    scratchRoot,
  });
  const runIds = new Set(
    evidence.samples
      .filter((sample) => sample.runId === runId)
      .map((sample) => sample.runId)
      .filter((id): id is string => id !== null && id !== undefined),
  );
  const samples = evidence.samples.filter(
    (sample) => sample.runId !== null && sample.runId !== undefined && runIds.has(sample.runId),
  );
  const runs = evidence.runs.filter(
    (run) => run.runId !== null && run.runId !== undefined && runIds.has(run.runId),
  );
  upsertBenchmarkSamples(outputFile, samples);
  upsertBenchmarkRuns(runsFileFor(outputFile), runs);
  console.log(`published ${samples.length} validated benchmark samples to ${outputFile}`);
}

function required(values: ReadonlyMap<string, string>, name: string): string {
  return values.get(name) ?? usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/publish-results.js --input-file <results.jsonl> --run-id <uuid> --scratch-root <path> [--output-file benchmarks/results.jsonl] [--config <path>]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
