import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type BenchmarkAggregate, aggregateMetric } from "../aggregate";
import { parseCliOptions } from "../cli";
import {
  type BenchmarkResultRecord,
  implementationLabel,
  phaseRank,
  readBenchmarkResultRecords,
} from "../model";
import { selectValidatedBenchmarkPreview, selectValidatedBenchmarkRun } from "../validation";

type SummaryOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
  readonly runId: string;
  readonly configFile?: string;
  readonly scratchRoot: string;
  readonly preview: boolean;
};

const CLI_OPTIONS = [
  "config",
  "input-file",
  "output-file",
  "preview",
  "run-id",
  "scratch-root",
] as const;

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const summary = renderBenchmarkCiSummary(options);
  mkdirSync(dirname(options.outputFile), { recursive: true });
  writeFileSync(options.outputFile, summary);
  console.log(`wrote benchmark CI summary to ${options.outputFile}`);
}

export function renderBenchmarkCiSummary(options: SummaryOptions): string {
  const selectRecords = options.preview
    ? selectValidatedBenchmarkPreview
    : selectValidatedBenchmarkRun;
  const records = selectRecords({
    records: readBenchmarkResultRecords(options.inputFile),
    methodologyVersion: 2,
    runId: options.runId,
    configFile: options.configFile,
    inputFile: options.inputFile,
    scratchRoot: options.scratchRoot,
  });
  const repetitions = uniqueNumbers(records.map((record) => record.repetition));
  const sourceCommit = records.find(
    (record) => implementationLabel(record) === "shin",
  )?.providerImplementationCommit;
  const cleanupValues = uniqueStrings(records.map((record) => record.cleanup));
  const comparisonTable = renderComparisonTable(records);
  const pressureTable = renderPressureTable(records);

  return [
    `# AWS Benchmark ${options.preview ? "Smoke Preview" : "Complete Results"}`,
    "",
    ...(options.preview
      ? [
          "> [!WARNING]",
          "> Preliminary repetition-1 data. The canonical methodology requires five sequential repetitions before publication.",
          "",
        ]
      : []),
    "| Field | Value |",
    "| --- | --- |",
    `| Source commit | \`${shortSha(sourceCommit)}\` |`,
    `| Benchmark run | \`${options.runId}\` |`,
    `| Repetitions present | ${repetitions.join(", ")} |`,
    `| Sanitized result rows | ${records.length} |`,
    `| Cleanup | ${cleanupValues.join(", ")} |`,
    "",
    "## ShinBucketDeployment vs AWS BucketDeployment",
    "",
    comparisonTable,
    "",
    "## Shin provider pressure counters",
    "",
    pressureTable,
    "",
    options.preview
      ? "Download the benchmark report artifact for the full preliminary report, telemetry tables, JSONL, and SVG snapshots."
      : "The complete report artifact contains the report, telemetry tables, JSONL, and SVG snapshots used for publication.",
    "",
  ].join("\n");
}

export function renderComparisonTable(records: readonly BenchmarkResultRecord[]): string {
  const durationRows = metricRows(records, "providerDurationSeconds");
  const wallRows = metricRows(records, "localWallSeconds");
  const memoryRows = metricRows(records, "maxMemoryMb");
  const rows = durationRows
    .filter((row) => row.implementation === "shin")
    .flatMap((shin) => {
      const aws = durationRows.find((row) => comparable(row, shin, "aws"));
      const shinWall = wallRows.find((row) => sameAggregate(row, shin));
      const awsWall = wallRows.find((row) => comparable(row, shin, "aws"));
      const shinMemory = memoryRows.find((row) => sameAggregate(row, shin));
      const awsMemory = memoryRows.find((row) => comparable(row, shin, "aws"));
      return aws && shinWall && awsWall && shinMemory && awsMemory
        ? [{ shin, aws, shinWall, awsWall, shinMemory, awsMemory }]
        : [];
    })
    .sort(
      (left, right) =>
        left.shin.profile.localeCompare(right.shin.profile) ||
        phaseRank(left.shin.phase) - phaseRank(right.shin.phase),
    );

  if (rows.length === 0) return "No paired Shin/AWS cells were available.";
  return [
    "| Profile | Phase | n | Provider s, Shin / AWS | AWS/Shin | Local wall s, Shin / AWS | Max MiB, Shin / AWS |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(({ shin, aws, shinWall, awsWall, shinMemory, awsMemory }) =>
      [
        `| \`${shin.profile}\``,
        `\`${shin.phase}\``,
        `${shin.count}`,
        `${format(shin.median)} / ${format(aws.median)}`,
        `${format(aws.median / shin.median)}x`,
        `${format(shinWall.median)} / ${format(awsWall.median)}`,
        `${format(shinMemory.median)} / ${format(awsMemory.median)} |`,
      ].join(" | "),
    ),
  ].join("\n");
}

function renderPressureTable(records: readonly BenchmarkResultRecord[]): string {
  const grouped = new Map<string, BenchmarkResultRecord[]>();
  for (const record of records.filter((row) => implementationLabel(row) === "shin")) {
    const profile = record.profile ?? "unknown";
    const rows = grouped.get(profile) ?? [];
    rows.push(record);
    grouped.set(profile, rows);
  }
  return [
    "| Profile | GET retries | GET errors | PUT retries | PUT throttles | Block refetches | Transfer failures |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...[...grouped.entries()]
      .sort()
      .map(([profile, rows]) =>
        [
          `| \`${profile}\``,
          sum(rows, "source", "getRetries"),
          sum(rows, "source", "getErrors"),
          sum(rows, "putObject", "retryAttempts"),
          sum(rows, "putObject", "throttledAttempts"),
          sum(rows, "source", "blockRefetches"),
          `${sum(rows, "transfer", "failedObjects")} |`,
        ].join(" | "),
      ),
  ].join("\n");
}

function metricRows(
  records: readonly BenchmarkResultRecord[],
  metric: keyof BenchmarkResultRecord,
): BenchmarkAggregate[] {
  return aggregateMetric(records, metric);
}

function sameAggregate(left: BenchmarkAggregate, right: BenchmarkAggregate): boolean {
  return (
    left.implementation === right.implementation &&
    left.profile === right.profile &&
    left.phase === right.phase &&
    left.memoryMb === right.memoryMb &&
    left.parallel === right.parallel &&
    left.sourceWindowBytes === right.sourceWindowBytes
  );
}

function comparable(
  row: BenchmarkAggregate,
  shin: BenchmarkAggregate,
  implementation: string,
): boolean {
  return (
    row.implementation === implementation &&
    row.profile === shin.profile &&
    row.phase === shin.phase &&
    row.memoryMb === shin.memoryMb
  );
}

function sum(
  records: readonly BenchmarkResultRecord[],
  section: "source" | "putObject" | "transfer",
  field: string,
): number {
  return records.reduce((total, record) => {
    const value = record.providerSummary?.[section]?.[field];
    return total + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function uniqueNumbers(values: Array<number | null | undefined>): number[] {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))].sort(
    (left, right) => left - right,
  );
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string"))];
}

function shortSha(value: string | null | undefined): string {
  return value?.slice(0, 7) ?? "unknown";
}

function format(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function parseArgs(args: string[]): SummaryOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);
  return {
    inputFile: required(values, "input-file"),
    outputFile: required(values, "output-file"),
    runId: required(values, "run-id"),
    configFile: values.get("config"),
    scratchRoot: required(values, "scratch-root"),
    preview: parseBoolean(required(values, "preview")),
  };
}

function required(values: ReadonlyMap<string, string>, name: string): string {
  return values.get(name) ?? usage();
}

function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/render/ci-summary.js --input-file <results.jsonl> --output-file <summary.md> --run-id <uuid> --scratch-root <path> --preview <true|false> [--config <path>]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
