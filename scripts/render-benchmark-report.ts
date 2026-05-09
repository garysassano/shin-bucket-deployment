import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type BenchmarkRecord = {
  readonly schemaVersion?: number;
  readonly runId?: string;
  readonly runDate?: string;
  readonly providerImplementationCommit?: string | null;
  readonly region?: string | null;
  readonly implementation?: string | null;
  readonly profile?: string | null;
  readonly series?: string | null;
  readonly memoryMb?: number | null;
  readonly phase?: string;
  readonly variant?: string | null;
  readonly fileCount?: number | null;
  readonly totalBytes?: number | null;
  readonly cdkDeploySeconds?: number | null;
  readonly localWallSeconds?: number | null;
  readonly providerDurationSeconds?: number | null;
  readonly billedDurationSeconds?: number | null;
  readonly initDurationSeconds?: number | null;
  readonly maxMemoryMb?: number | null;
  readonly providerInvoked?: boolean;
  readonly providerSummary?: unknown;
};

type MetricName =
  | "providerDurationSeconds"
  | "billedDurationSeconds"
  | "localWallSeconds"
  | "cdkDeploySeconds"
  | "maxMemoryMb";

type RenderOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
  readonly runId?: string;
  readonly series?: string;
};

const METRICS: Array<{ name: MetricName; label: string; unit: string }> = [
  { name: "providerDurationSeconds", label: "Provider duration", unit: "s" },
  { name: "billedDurationSeconds", label: "Billed duration", unit: "s" },
  { name: "localWallSeconds", label: "Local wall time", unit: "s" },
  { name: "cdkDeploySeconds", label: "CDK deploy time", unit: "s" },
  { name: "maxMemoryMb", label: "Max memory", unit: "MiB" },
];

const PHASE_ORDER = new Map([
  ["cold-create", 0],
  ["forced-unchanged", 1],
  ["no-change-redeploy", 2],
  ["sparse-update", 3],
  ["prune-update", 4],
  ["destroy", 5],
]);

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  renderBenchmarkReport(options);
  console.log(`wrote benchmark report to ${options.outputFile}`);
}

export function renderBenchmarkReport(options: RenderOptions): string {
  const records = readRecords(options.inputFile)
    .filter((record) => (options.runId ? record.runId === options.runId : true))
    .filter((record) => (options.series ? record.series === options.series : true));
  const report = renderReport(records, options);
  mkdirSync(dirname(options.outputFile), { recursive: true });
  writeFileSync(options.outputFile, report);
  return report;
}

function renderReport(records: BenchmarkRecord[], options: RenderOptions): string {
  const comparable = records.filter((record) => record.phase && record.profile);
  const latestRun = [...new Set(comparable.map((record) => record.runId).filter(Boolean))].at(-1);
  const title = options.runId ?? options.series ?? latestRun ?? "all benchmark records";

  return [
    `# Benchmark Report: ${title}`,
    "",
    renderScope(comparable),
    "",
    "## Metric Tables",
    "",
    ...METRICS.flatMap((metric) => renderMetricSection(comparable, metric)),
    "## Rust vs AWS Comparison",
    "",
    renderComparisonTable(comparable),
    "",
    "### Provider Duration By Phase",
    "",
    renderPhaseDurationChart(comparable),
    "",
  ].join("\n");
}

function renderScope(records: BenchmarkRecord[]): string {
  if (records.length === 0) {
    return "No benchmark records matched the selected filters.";
  }

  const runIds = unique(records.map((record) => record.runId));
  const implementations = unique(records.map((record) => implementationLabel(record)));
  const profiles = unique(records.map((record) => record.profile));
  const phases = unique(records.map((record) => record.phase));

  return [
    "## Scope",
    "",
    `- Runs: ${runIds.join(", ")}`,
    `- Implementations: ${implementations.join(", ")}`,
    `- Profiles: ${profiles.join(", ")}`,
    `- Phases: ${phases.join(", ")}`,
  ].join("\n");
}

function renderMetricSection(
  records: BenchmarkRecord[],
  metric: { name: MetricName; label: string; unit: string },
): string[] {
  const rows = aggregateRows(records, metric.name);
  if (rows.length === 0) {
    return [];
  }

  return [
    `### ${metric.label}`,
    "",
    renderMetricTable(rows, metric.unit),
    "",
    renderBarChart(rows, metric.unit),
    "",
  ];
}

function renderMetricTable(rows: AggregatedRow[], unit: string): string {
  return [
    `| Profile | Phase | Memory MiB | Implementation | n | median (${unit}) | p90 (${unit}) | min (${unit}) | max (${unit}) |`,
    "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${row.implementation} | ${row.count} | ${formatNumber(row.median)} | ${formatNumber(row.p90)} | ${formatNumber(row.min)} | ${formatNumber(row.max)} |`,
    ),
  ].join("\n");
}

function renderBarChart(rows: AggregatedRow[], unit: string): string {
  const max = Math.max(...rows.map((row) => row.median), 0);
  const lines = rows.map((row) => {
    const width = max === 0 ? 0 : Math.max(1, Math.round((row.median / max) * 30));
    const bar = "#".repeat(width);
    const label = `${row.profile} ${row.phase} ${row.memoryMb ?? ""} ${row.implementation}`;
    return `${label.padEnd(48)} | ${bar} ${formatNumber(row.median)} ${unit}`;
  });

  return ["```text", ...lines, "```"].join("\n");
}

function renderComparisonTable(records: BenchmarkRecord[]): string {
  const rows = buildComparisonRows(records);
  if (rows.length === 0) {
    return "No rust/aws pairs were available for comparison.";
  }

  return [
    "| Profile | Phase | Memory MiB | Rust duration (s) | AWS duration (s) | AWS/Rust duration | Rust memory (MiB) | AWS memory (MiB) | AWS/Rust memory |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${formatOptionalNumber(row.rustDuration)} | ${formatOptionalNumber(row.awsDuration)} | ${formatOptionalRatio(row.durationRatio)} | ${formatOptionalNumber(row.rustMemory)} | ${formatOptionalNumber(row.awsMemory)} | ${formatOptionalRatio(row.memoryRatio)} |`,
    ),
  ].join("\n");
}

function renderPhaseDurationChart(records: BenchmarkRecord[]): string {
  const rows = metricPairs(records, "providerDurationSeconds");
  if (rows.length === 0) {
    return "No rust/aws pairs were available for provider-duration charts.";
  }

  const max = Math.max(...rows.flatMap((row) => [row.rust, row.aws]), 0);
  const lines = rows.flatMap((row) => {
    const label = `${row.profile} ${row.phase} ${row.memoryMb ?? ""}`;
    return [
      label,
      `  rust | ${renderScaledBar(row.rust, max)} ${formatNumber(row.rust)} s`,
      `  aws  | ${renderScaledBar(row.aws, max)} ${formatNumber(row.aws)} s`,
    ];
  });

  return ["```text", ...lines, "```"].join("\n");
}

function buildComparisonRows(records: BenchmarkRecord[]): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  for (const pair of metricPairs(records, "providerDurationSeconds")) {
    const row = rows.get(pair.key) ?? comparisonRowBase(pair);
    row.rustDuration = pair.rust;
    row.awsDuration = pair.aws;
    row.durationRatio = pair.ratio;
    rows.set(pair.key, row);
  }
  for (const pair of metricPairs(records, "maxMemoryMb")) {
    const row = rows.get(pair.key) ?? comparisonRowBase(pair);
    row.rustMemory = pair.rust;
    row.awsMemory = pair.aws;
    row.memoryRatio = pair.ratio;
    rows.set(pair.key, row);
  }

  return [...rows.values()].sort(compareComparisonRows);
}

function comparisonRowBase(pair: MetricPair): ComparisonRow {
  return {
    profile: pair.profile,
    phase: pair.phase,
    memoryMb: pair.memoryMb,
    rustDuration: null,
    awsDuration: null,
    durationRatio: null,
    rustMemory: null,
    awsMemory: null,
    memoryRatio: null,
  };
}

function metricPairs(records: BenchmarkRecord[], metric: MetricName): MetricPair[] {
  const rows = aggregateRows(records, metric);
  const grouped = new Map<string, AggregatedRow[]>();
  for (const row of rows) {
    const key = `${row.profile}\u0000${row.phase}\u0000${row.memoryMb ?? ""}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .map((group) => {
      const aws = group.find((row) => row.implementation.startsWith("aws"));
      const rust = group.find((row) => row.implementation.startsWith("rust"));
      if (!aws || !rust || rust.median === 0) {
        return undefined;
      }
      return {
        key: comparisonKey(rust),
        profile: rust.profile,
        phase: rust.phase,
        memoryMb: rust.memoryMb,
        rust: rust.median,
        aws: aws.median,
        ratio: aws.median / rust.median,
      };
    })
    .filter((row) => row !== undefined)
    .sort(compareMetricPairs);
}

type ComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  rustDuration: number | null;
  awsDuration: number | null;
  durationRatio: number | null;
  rustMemory: number | null;
  awsMemory: number | null;
  memoryRatio: number | null;
};

type MetricPair = {
  readonly key: string;
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly rust: number;
  readonly aws: number;
  readonly ratio: number;
};

type AggregatedRow = {
  readonly profile: string;
  readonly phase: string;
  readonly implementation: string;
  readonly memoryMb: number | null;
  readonly count: number;
  readonly median: number;
  readonly p90: number;
  readonly min: number;
  readonly max: number;
};

function aggregateRows(records: BenchmarkRecord[], metric: MetricName): AggregatedRow[] {
  const groups = new Map<string, { record: BenchmarkRecord; values: number[] }>();
  for (const record of records) {
    const value = record[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    const key = [record.profile, record.phase, implementationLabel(record), record.memoryMb].join(
      "\u0000",
    );
    const group = groups.get(key) ?? { record, values: [] };
    group.values.push(value);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ record, values }) => {
      const sorted = [...values].sort((left, right) => left - right);
      return {
        profile: record.profile ?? "unknown",
        phase: record.phase ?? "unknown",
        implementation: implementationLabel(record),
        memoryMb: record.memoryMb ?? null,
        count: sorted.length,
        median: percentile(sorted, 0.5),
        p90: percentile(sorted, 0.9),
        min: sorted[0] ?? 0,
        max: sorted.at(-1) ?? 0,
      };
    })
    .sort(compareAggregatedRows);
}

function comparisonKey(row: { profile: string; phase: string; memoryMb: number | null }): string {
  return [row.profile, row.phase, row.memoryMb ?? ""].join("\u0000");
}

function compareComparisonRows(left: ComparisonRow, right: ComparisonRow): number {
  return comparePhaseGroups(left, right);
}

function compareMetricPairs(left: MetricPair, right: MetricPair): number {
  return comparePhaseGroups(left, right);
}

function compareAggregatedRows(left: AggregatedRow, right: AggregatedRow): number {
  return comparePhaseGroups(left, right) || left.implementation.localeCompare(right.implementation);
}

function comparePhaseGroups(
  left: { profile: string; phase: string; memoryMb: number | null },
  right: { profile: string; phase: string; memoryMb: number | null },
): number {
  return (
    left.profile.localeCompare(right.profile) ||
    (left.memoryMb ?? 0) - (right.memoryMb ?? 0) ||
    phaseRank(left.phase) - phaseRank(right.phase) ||
    left.phase.localeCompare(right.phase)
  );
}

function phaseRank(phase: string): number {
  return PHASE_ORDER.get(phase) ?? Number.MAX_SAFE_INTEGER;
}

function percentile(sorted: number[], quantile: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.ceil(sorted.length * quantile) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function implementationLabel(record: BenchmarkRecord): string {
  return record.implementation ?? inferImplementation(record) ?? "unknown";
}

function inferImplementation(record: BenchmarkRecord): string | null {
  if (record.providerImplementationCommit || record.providerSummary) {
    return "rust";
  }
  return null;
}

function readRecords(path: string): BenchmarkRecord[] {
  return readFileSync(path, "utf8")
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as BenchmarkRecord);
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? "" : formatNumber(value);
}

function formatOptionalRatio(value: number | null): string {
  return value === null ? "" : `${formatNumber(value)}x`;
}

function renderScaledBar(value: number, max: number): string {
  const width = max === 0 ? 0 : Math.max(1, Math.round((value / max) * 30));
  return "#".repeat(width).padEnd(30);
}

function parseArgs(args: string[]): RenderOptions {
  const values = new Map<string, string>();
  const normalizedArgs = args.filter((arg) => arg !== "--");
  for (let index = 0; index < normalizedArgs.length; index += 2) {
    const key = normalizedArgs[index];
    const value = normalizedArgs[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      usage();
    }
    values.set(key.slice(2), value);
  }

  return {
    inputFile: values.get("input-file") ?? "docs/benchmark-history.jsonl",
    outputFile: values.get("output-file") ?? "docs/benchmark-report.md",
    runId: values.get("run-id"),
    series: values.get("series"),
  };
}

function usage(): never {
  console.error(
    "Usage: node dist/scripts/render-benchmark-report.js [--input-file docs/benchmark-history.jsonl] [--output-file docs/benchmark-report.md] [--run-id <id>] [--series <name>]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
