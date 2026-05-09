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
  | "initDurationSeconds"
  | "localWallSeconds"
  | "cdkDeploySeconds"
  | "maxMemoryMb";

type MetricDefinition = { name: MetricName; label: string; unit: string };

type RenderOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
  readonly runId?: string;
  readonly series?: string;
};

const METRICS: MetricDefinition[] = [
  { name: "providerDurationSeconds", label: "Provider duration", unit: "s" },
  { name: "billedDurationSeconds", label: "Billed duration", unit: "s" },
  { name: "initDurationSeconds", label: "Init duration", unit: "s" },
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
    "## RustBucketDeployment vs AWS BucketDeployment",
    "",
    renderComparisonSummaryTable(comparable),
    "",
    ...renderPhaseComparisonTables(comparable),
    "",
    "## Charts",
    "",
    ...renderComparisonCharts(comparable),
    "## Metric Tables",
    "",
    ...METRICS.flatMap((metric) => renderMetricSection(comparable, metric)),
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

function renderComparisonSummaryTable(records: BenchmarkRecord[]): string {
  const rows = buildPhaseComparisonRows(records);
  if (rows.length === 0) {
    return "No rust/aws pairs were available for comparison.";
  }

  return [
    "| Profile | Phase | Memory MiB | Provider duration | Local wall time | CDK deploy time | Max memory |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => {
      return `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${formatOptionalComparisonCell(row.metrics.providerDurationSeconds)} | ${formatOptionalComparisonCell(row.metrics.localWallSeconds)} | ${formatOptionalComparisonCell(row.metrics.cdkDeploySeconds)} | ${formatOptionalMemoryCell(row.metrics.maxMemoryMb)} |`;
    }),
  ].join("\n");
}

function renderPhaseComparisonTables(records: BenchmarkRecord[]): string[] {
  const rows = buildPhaseComparisonRows(records);
  if (rows.length === 0) {
    return [];
  }

  return rows.flatMap((phaseRow) => [
    `### ${phaseTitle(phaseRow)}`,
    "",
    renderPhaseComparisonTable(phaseRow),
    "",
  ]);
}

function renderPhaseComparisonTable(phaseRow: PhaseComparisonRow): string {
  const rows = METRICS.map((metric) => phaseRow.metrics[metric.name]).filter(
    (row) => row !== undefined,
  );
  return [
    "| Metric | RustBucketDeployment | AWS BucketDeployment | Difference | AWS/Rust | AWS delta % |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.metricLabel} | ${formatValue(row.rust, row.unit)} | ${formatValue(row.aws, row.unit)} | ${formatSignedValue(row.diff, row.unit)} | ${formatRatio(row.ratio)} | ${formatSignedPercent(row.percentDelta)} |`,
    ),
  ].join("\n");
}

function renderComparisonCharts(records: BenchmarkRecord[]): string[] {
  const rows = buildPhaseComparisonRows(records);
  if (rows.length === 0) {
    return ["No rust/aws pairs were available for charts.", ""];
  }

  return [
    "### Provider Duration By Construct",
    "",
    renderConstructMetricChart(
      { name: "providerDurationSeconds", label: "Provider duration", unit: "s" },
      rows,
    ),
    "",
    "### Local Wall Time By Construct",
    "",
    renderConstructMetricChart(
      { name: "localWallSeconds", label: "Local wall time", unit: "s" },
      rows,
    ),
    "",
    "### Max Memory By Construct",
    "",
    renderConstructMetricChart({ name: "maxMemoryMb", label: "Max memory", unit: "MiB" }, rows),
    "",
    "### AWS/Rust Ratio By Phase",
    "",
    renderRatioChart(rows),
    "",
  ];
}

function renderRatioChart(rows: PhaseComparisonRow[]): string {
  const axisLabels = phaseChartLabels(rows);
  const providerRatios = rows.map((row) => row.metrics.providerDurationSeconds?.ratio ?? 0);
  const wallRatios = rows.map((row) => row.metrics.localWallSeconds?.ratio ?? 0);
  const deployRatios = rows.map((row) => row.metrics.cdkDeploySeconds?.ratio ?? 0);
  const memoryRatios = rows.map((row) => row.metrics.maxMemoryMb?.ratio ?? 0);
  const max = Math.max(...providerRatios, ...wallRatios, ...deployRatios, ...memoryRatios, 0);

  return [
    "```mermaid",
    "xychart-beta",
    '  title "AWS BucketDeployment / RustBucketDeployment ratio"',
    `  x-axis [${axisLabels.map((label) => `"${escapeMermaidString(label)}"`).join(", ")}]`,
    `  y-axis "x" 0 --> ${formatNumber(niceAxisMax(max))}`,
    `  bar "Provider duration" [${providerRatios.map(formatNumber).join(", ")}]`,
    `  bar "Local wall time" [${wallRatios.map(formatNumber).join(", ")}]`,
    `  bar "CDK deploy time" [${deployRatios.map(formatNumber).join(", ")}]`,
    `  bar "Max memory" [${memoryRatios.map(formatNumber).join(", ")}]`,
    "```",
  ].join("\n");
}

function renderConstructMetricChart(metric: MetricDefinition, rows: PhaseComparisonRow[]): string {
  const metricRows = rows.map((row) => row.metrics[metric.name]);
  const rustValues = metricRows.map((row) => row?.rust ?? 0);
  const awsValues = metricRows.map((row) => row?.aws ?? 0);
  const max = Math.max(...rustValues, ...awsValues, 0);

  return [
    "```mermaid",
    "xychart-beta",
    `  title "${escapeMermaidString(metric.label)}: RustBucketDeployment vs AWS BucketDeployment"`,
    `  x-axis [${phaseChartLabels(rows)
      .map((label) => `"${escapeMermaidString(label)}"`)
      .join(", ")}]`,
    `  y-axis "${metric.unit}" 0 --> ${formatNumber(niceAxisMax(max))}`,
    `  bar "RustBucketDeployment" [${rustValues.map(formatNumber).join(", ")}]`,
    `  bar "AWS BucketDeployment" [${awsValues.map(formatNumber).join(", ")}]`,
    "```",
  ].join("\n");
}

function buildMetricComparisonRows(records: BenchmarkRecord[]): MetricComparisonRow[] {
  return METRICS.flatMap((metric, metricIndex) => {
    return metricPairs(records, metric.name).map((pair) => ({
      profile: pair.profile,
      phase: pair.phase,
      memoryMb: pair.memoryMb,
      metricName: metric.name,
      metricLabel: metric.label,
      metricIndex,
      unit: metric.unit,
      rust: pair.rust,
      aws: pair.aws,
      diff: pair.aws - pair.rust,
      ratio: pair.ratio,
      percentDelta: ((pair.aws - pair.rust) / pair.rust) * 100,
    }));
  }).sort(compareMetricComparisonRows);
}

function buildPhaseComparisonRows(records: BenchmarkRecord[]): PhaseComparisonRow[] {
  const rows = new Map<string, PhaseComparisonRow>();
  for (const metricRow of buildMetricComparisonRows(records)) {
    const key = comparisonKey(metricRow);
    const row = rows.get(key) ?? {
      profile: metricRow.profile,
      phase: metricRow.phase,
      memoryMb: metricRow.memoryMb,
      metrics: {},
    };
    row.metrics[metricRow.metricName] = metricRow;
    rows.set(key, row);
  }
  return [...rows.values()].sort(comparePhaseGroups);
}

function phaseTitle(row: PhaseComparisonRow): string {
  const memory = row.memoryMb === null ? "" : ` at ${row.memoryMb} MiB`;
  return `${row.profile} ${row.phase}${memory}`;
}

function phaseChartLabels(rows: PhaseComparisonRow[]): string[] {
  const profiles = unique(rows.map((row) => row.profile));
  const memoryValues = unique(rows.map((row) => row.memoryMb));
  return rows.map((row) => {
    const profile = profiles.length === 1 ? "" : `${row.profile} `;
    const memory = memoryValues.length === 1 ? "" : ` ${row.memoryMb ?? ""}`;
    return `${profile}${row.phase}${memory}`.trim();
  });
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

type MetricComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly metricName: MetricName;
  readonly metricLabel: string;
  readonly metricIndex: number;
  readonly unit: string;
  readonly rust: number;
  readonly aws: number;
  readonly diff: number;
  readonly ratio: number;
  readonly percentDelta: number;
};

type PhaseComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly metrics: Partial<Record<MetricName, MetricComparisonRow>>;
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

function compareMetricPairs(left: MetricPair, right: MetricPair): number {
  return comparePhaseGroups(left, right);
}

function compareMetricComparisonRows(
  left: MetricComparisonRow,
  right: MetricComparisonRow,
): number {
  return comparePhaseGroups(left, right) || left.metricIndex - right.metricIndex;
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

function unique<T>(values: Array<T | null | undefined>): T[] {
  return [...new Set(values.filter((value): value is T => value !== null && value !== undefined))];
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatValue(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

function formatComparisonCell(row: MetricComparisonRow): string {
  return `${formatValue(row.rust, row.unit)} vs ${formatValue(row.aws, row.unit)} (${formatRustAdvantage(row.ratio)})`;
}

function formatOptionalComparisonCell(row: MetricComparisonRow | undefined): string {
  return row === undefined ? "" : formatComparisonCell(row);
}

function formatMemoryCell(row: MetricComparisonRow): string {
  return `${formatValue(row.rust, row.unit)} vs ${formatValue(row.aws, row.unit)} (${formatMemoryAdvantage(row)})`;
}

function formatOptionalMemoryCell(row: MetricComparisonRow | undefined): string {
  return row === undefined ? "" : formatMemoryCell(row);
}

function formatSignedValue(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value))} ${unit}`;
}

function formatRatio(value: number): string {
  return `${formatNumber(value)}x`;
}

function formatRustAdvantage(value: number): string {
  return value >= 1 ? `${formatRatio(value)} faster` : `${formatRatio(1 / value)} slower`;
}

function formatMemoryAdvantage(row: MetricComparisonRow): string {
  const reduction = ((row.aws - row.rust) / row.aws) * 100;
  return reduction >= 0
    ? `${formatNumber(reduction)}% lower`
    : `${formatNumber(Math.abs(reduction))}% higher`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value))}%`;
}

function niceAxisMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const padded = value * 1.1;
  if (padded <= 1) {
    return Math.ceil(padded * 10) / 10;
  }
  if (padded <= 10) {
    return Math.ceil(padded);
  }
  return Math.ceil(padded / 10) * 10;
}

function escapeMermaidString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
