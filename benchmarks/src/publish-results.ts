import { parseCliOptions } from "./cli";
import { readBenchmarkResultRecords } from "./model";
import { upsertBenchmarkRecords } from "./persistence";
import { selectValidatedBenchmarkRun } from "./validation";

const CLI_OPTIONS = ["config", "input-file", "output-file", "run-id", "scratch-root"] as const;

function main(): void {
  const values = parseCliOptions(process.argv.slice(2), CLI_OPTIONS, usage);
  const inputFile = required(values, "input-file");
  const outputFile = values.get("output-file") ?? "benchmarks/results.jsonl";
  const runId = required(values, "run-id");
  const scratchRoot = required(values, "scratch-root");
  const records = selectValidatedBenchmarkRun({
    records: readBenchmarkResultRecords(inputFile),
    methodologyVersion: 2,
    runId,
    configFile: values.get("config"),
    inputFile,
    scratchRoot,
  });
  upsertBenchmarkRecords(outputFile, records);
  console.log(`published ${records.length} validated benchmark rows to ${outputFile}`);
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
