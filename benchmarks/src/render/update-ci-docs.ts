import { readFileSync, writeFileSync } from "node:fs";
import { parseCliOptions } from "../cli";
import {
  type BenchmarkResultRecord,
  implementationLabel,
  readBenchmarkResultRecords,
} from "../model";
import { selectValidatedBenchmarkRun } from "../validation";
import { renderComparisonTable } from "./ci-summary";

const START = "<!-- benchmark-ci:start -->";
const END = "<!-- benchmark-ci:end -->";
const CLI_OPTIONS = [
  "benchmark-readme",
  "config",
  "docs-file",
  "input-file",
  "run-id",
  "scratch-root",
] as const;

function main(): void {
  const values = parseCliOptions(process.argv.slice(2), CLI_OPTIONS, usage);
  const inputFile = required(values, "input-file");
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
  const docsFile = required(values, "docs-file");
  const benchmarkReadme = required(values, "benchmark-readme");
  replaceGeneratedBlock(docsFile, renderDocsBlock(records, runId));
  replaceGeneratedBlock(benchmarkReadme, renderReadmeBlock(records, runId));
  console.log(`updated CI benchmark documentation in ${docsFile} and ${benchmarkReadme}`);
}

function renderDocsBlock(records: BenchmarkResultRecord[], runId: string): string {
  const first = records[0];
  const source = records.find((record) => implementationLabel(record) === "shin");
  return [
    START,
    "## Latest CI benchmark",
    "",
    `The latest complete canonical methodology-v2 run was collected by GitHub Actions on ${first?.snapshotDate ?? "unknown"} from source commit \`${source?.providerImplementationCommit?.slice(0, 7) ?? "unknown"}\`. It contains five sequential repetitions of both canonical profiles across all four phases. The sanitized run UUID is \`${runId}\`; raw AWS output remains outside git.`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Region | \`${first?.region ?? "unknown"}\` |`,
    `| Lambda configuration | ${first?.memoryMb ?? "unknown"} MiB / 32 Shin transfers |`,
    `| Sanitized rows | ${records.length} |`,
    `| Cleanup | ${unique(records.map((record) => record.cleanup)).join(", ")} |`,
    "",
    renderComparisonTable(records),
    "",
    "The [complete generated report](../benchmarks/ci-report.md) includes quartiles, end-to-end timings, and per-phase deltas. [Provider telemetry](../benchmarks/ci-telemetry.md) contains the sanitized Shin diagnostic tables.",
    "",
    "![Latest tiny-many CI benchmark](../benchmarks/snapshots/ci-tiny-many-1024mib-32.svg)",
    "",
    "![Latest large-few CI benchmark](../benchmarks/snapshots/ci-large-few-1024mib-32.svg)",
    END,
  ].join("\n");
}

function renderReadmeBlock(records: BenchmarkResultRecord[], runId: string): string {
  const first = records[0];
  return [
    START,
    "## Latest Methodology-v2 CI Benchmark",
    "",
    `GitHub Actions last published a complete five-repetition canonical run dated ${first?.snapshotDate ?? "unknown"} (run \`${runId}\`).`,
    "",
    "- [Comparison report](ci-report.md)",
    "- [Shin provider telemetry](ci-telemetry.md)",
    "- [Sanitized structured results](results.jsonl)",
    "",
    "### tiny-many / 1024 MiB / max concurrency 32",
    "",
    "![Latest tiny-many CI benchmark](snapshots/ci-tiny-many-1024mib-32.svg)",
    "",
    "### large-few / 1024 MiB / max concurrency 32",
    "",
    "![Latest large-few CI benchmark](snapshots/ci-large-few-1024mib-32.svg)",
    END,
  ].join("\n");
}

function replaceGeneratedBlock(path: string, block: string): void {
  const source = readFileSync(path, "utf8");
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  let updated: string;
  if (start === -1 && end === -1) {
    const anchor = source.indexOf("\n## ");
    updated =
      anchor === -1
        ? `${source.trimEnd()}\n\n${block}\n`
        : `${source.slice(0, anchor)}\n\n${block}\n${source.slice(anchor)}`;
  } else {
    if (start === -1 || end === -1 || end < start) {
      throw new Error(`${path} contains malformed benchmark CI markers.`);
    }
    updated = `${source.slice(0, start)}${block}${source.slice(end + END.length)}`;
  }
  writeFileSync(path, updated.endsWith("\n") ? updated : `${updated}\n`);
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string"))];
}

function required(values: ReadonlyMap<string, string>, name: string): string {
  return values.get(name) ?? usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/render/update-ci-docs.js --input-file <results.jsonl> --run-id <uuid> --scratch-root <path> --docs-file <docs/benchmark.md> --benchmark-readme <benchmarks/README.md> [--config <path>]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
