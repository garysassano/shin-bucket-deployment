import { readFileSync, writeFileSync } from "node:fs";
import { parseCliOptions } from "../cli";
import {
  type BenchmarkRunSample,
  implementationLabel,
  readBenchmarkEvidence,
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
  const evidence = readBenchmarkEvidence(inputFile);
  const records = selectValidatedBenchmarkRun({
    runs: evidence.runs,
    samples: evidence.samples,
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

function lambdaConfigurations(records: BenchmarkRunSample[]): string {
  const configurations = new Set<string>();
  for (const { memoryMb, parallel } of shinGroups(records)) {
    configurations.add(`${memoryMb} MiB / ${parallel} Shin transfers`);
  }
  return configurations.size === 0 ? "unknown" : [...configurations].join(", ");
}

function shinGroups(
  records: BenchmarkRunSample[],
): Array<{ readonly profile: string; readonly memoryMb: number; readonly parallel: number }> {
  const groups = new Map<
    string,
    { readonly profile: string; readonly memoryMb: number; readonly parallel: number }
  >();
  for (const record of records) {
    if (implementationLabel(record) !== "shin") continue;
    if (record.profile == null || record.memoryMb == null || record.parallel == null) continue;
    const key = `${record.profile}\u0000${record.memoryMb}\u0000${record.parallel}`;
    groups.set(key, {
      profile: record.profile,
      memoryMb: record.memoryMb,
      parallel: record.parallel,
    });
  }
  return [...groups.values()].sort(
    (left, right) =>
      left.profile.localeCompare(right.profile) ||
      left.memoryMb - right.memoryMb ||
      left.parallel - right.parallel,
  );
}

function renderDocsBlock(records: BenchmarkRunSample[], runId: string): string {
  const first = records[0];
  const source = records.find((record) => implementationLabel(record) === "shin");
  return [
    START,
    "## Latest CI benchmark",
    "",
    `The latest complete canonical five-repetition run was collected by GitHub Actions on ${first?.snapshotDate ?? "unknown"} from source commit \`${source?.provider?.implementationCommit?.slice(0, 7) ?? "unknown"}\`. It contains five sequential repetitions of all canonical profiles across all four phases. The sanitized run UUID is \`${runId}\`; raw AWS output remains outside git.`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Region | \`${first?.region ?? "unknown"}\` |`,
    `| Lambda configurations | ${lambdaConfigurations(records)} |`,
    `| Sanitized rows | ${records.length} |`,
    `| Cleanup | ${unique(records.map((record) => record.cleanup)).join(", ")} |`,
    "",
    renderComparisonTable(records),
    "",
    "The [complete generated report](../benchmarks/ci-report.md) includes quartiles, end-to-end timings, and per-phase deltas. [Provider telemetry](../benchmarks/ci-telemetry.md) contains the sanitized Shin diagnostic tables.",
    "",
    ...shinGroups(records).flatMap(({ profile, memoryMb, parallel }) => [
      `![Latest ${profile} CI benchmark](../benchmarks/snapshots/ci-${profile}-${memoryMb}mib-${parallel}.svg)`,
      "",
    ]),
    END,
  ].join("\n");
}

function renderReadmeBlock(records: BenchmarkRunSample[], runId: string): string {
  const first = records[0];
  return [
    START,
    "## Latest Canonical CI Benchmark",
    "",
    `GitHub Actions last published a complete five-repetition canonical run dated ${first?.snapshotDate ?? "unknown"} (run \`${runId}\`).`,
    "",
    "- [Comparison report](ci-report.md)",
    "- [Shin provider telemetry](ci-telemetry.md)",
    "- [Sanitized structured results](results.jsonl)",
    "- [Run provenance records](runs.jsonl)",
    "",
    ...shinGroups(records).flatMap(({ profile, memoryMb, parallel }) => [
      `### ${profile} / ${memoryMb} MiB / max concurrency ${parallel}`,
      "",
      `![Latest ${profile} CI benchmark](snapshots/ci-${profile}-${memoryMb}mib-${parallel}.svg)`,
      "",
    ]),
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
