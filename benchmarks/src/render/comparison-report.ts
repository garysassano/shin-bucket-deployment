import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  type BenchmarkAggregate,
  aggregateMetric,
  assertCompleteSamples,
  comparisonGroupKey,
} from "../aggregate";
import { parseCliOptions } from "../cli";
import {
  type BenchmarkResultRecord,
  benchmarkMethodologyVersion,
  implementationLabel,
  phaseRank,
  readBenchmarkResultRecords,
} from "../model";
import { selectValidatedBenchmarkPreview, selectValidatedBenchmarkRun } from "../validation";

type BenchmarkRecord = BenchmarkResultRecord;

type MetricName =
  | "providerDurationSeconds"
  | "billedDurationSeconds"
  | "initDurationSeconds"
  | "localWallSeconds"
  | "cdkDeploySeconds"
  | "maxMemoryMb";

type RenderOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
  readonly assetProfile?: string;
  readonly memoryMb?: number;
  readonly parallel?: number;
  readonly methodologyVersion?: 1 | 2;
  readonly runId?: string;
  readonly configFile?: string;
  readonly scratchRoot?: string;
  readonly preview?: boolean;
};

const METRICS: Array<{ name: MetricName; label: string; unit: string }> = [
  { name: "providerDurationSeconds", label: "Provider duration", unit: "s" },
  { name: "billedDurationSeconds", label: "Billed duration", unit: "s" },
  { name: "initDurationSeconds", label: "Init duration", unit: "s" },
  { name: "localWallSeconds", label: "Local wall time", unit: "s" },
  { name: "cdkDeploySeconds", label: "CDK deploy time", unit: "s" },
  { name: "maxMemoryMb", label: "Max memory", unit: "MiB" },
];

const CLI_OPTIONS = [
  "asset-profile",
  "config",
  "input-file",
  "transfer-max-concurrency",
  "lambda-memory-mb",
  "methodology-version",
  "output-file",
  "preview",
  "run-id",
  "scratch-root",
] as const;

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  renderBenchmarkReport(options);
  console.log(`wrote benchmark report to ${options.outputFile}`);
}

export function renderBenchmarkReport(options: RenderOptions): string {
  const selectRecords = options.preview
    ? selectValidatedBenchmarkPreview
    : selectValidatedBenchmarkRun;
  const records = selectRecords({
    records: readBenchmarkResultRecords(options.inputFile),
    methodologyVersion: options.methodologyVersion ?? 2,
    runId: options.runId,
    configFile: options.configFile,
    inputFile: options.inputFile,
    scratchRoot: options.scratchRoot,
  })
    .filter((record) => (options.assetProfile ? record.profile === options.assetProfile : true))
    .filter((record) => (options.memoryMb ? record.memoryMb === options.memoryMb : true))
    .filter((record) =>
      options.parallel
        ? implementationLabel(record) === "aws" || record.parallel === options.parallel
        : true,
    );
  const report = renderReport(records, options);
  mkdirSync(dirname(options.outputFile), { recursive: true });
  writeFileSync(options.outputFile, report);
  return report;
}

function renderReport(records: BenchmarkRecord[], options: RenderOptions): string {
  const comparable = records.filter((record) => record.phase && record.profile);
  const title = reportTitle(options);

  return [
    `# Benchmark Report: ${title}`,
    "",
    ...(options.preview
      ? [
          "> [!WARNING]",
          "> Preliminary preview from an incomplete methodology-v2 run. Do not treat these values as accepted benchmark evidence.",
          "",
        ]
      : []),
    renderScope(comparable, options.preview ?? false),
    "",
    "## ShinBucketDeployment vs AWS BucketDeployment",
    "",
    renderComparisonSummaryTable(comparable, options.preview ?? false),
    "",
    ...renderPhaseComparisonTables(comparable, options.preview ?? false),
    "## Metric Tables",
    "",
    ...METRICS.flatMap((metric) =>
      renderMetricSection(comparable, metric, options.preview ?? false),
    ),
    "",
  ]
    .join("\n")
    .replace(/\n+$/, "\n");
}

function renderScope(records: BenchmarkRecord[], preview: boolean): string {
  if (records.length === 0) {
    return "No benchmark records matched the selected filters.";
  }

  const snapshotDates = unique(records.map((record) => record.snapshotDate));
  const implementations = unique(records.map((record) => implementationLabel(record)));
  const assetProfiles = unique(records.map((record) => record.profile));
  const memoryValues = unique(records.map((record) => record.memoryMb));
  const parallelValues = unique(records.map((record) => record.parallel));
  const sourceWindowValues = unique(
    records.map((record) => formatSourceWindow(record.sourceWindowBytes)),
  );
  const phases = unique(records.map((record) => record.phase));
  const methodologyVersions = unique(records.map(benchmarkMethodologyVersion));
  const runIds = unique(records.map((record) => record.runId));
  const sampleCounts = unique(
    aggregateRows(records, "providerDurationSeconds", preview).map((row) => row.count),
  );
  const completeness =
    methodologyVersions.length === 1 && methodologyVersions[0] === 2
      ? sampleCounts.length === 1 && sampleCounts[0] === 5
        ? "complete (n=5 per provider-duration cell)"
        : `incomplete (observed n=${sampleCounts.join(", ") || "0"}; canonical target is n=5)`
      : "historical methodology; no v2 completeness claim";

  return [
    "## Scope",
    "",
    `- Snapshot date: ${snapshotDates.join(", ")}`,
    `- Methodology: ${methodologyVersions.map((version) => `v${version}`).join(", ")}`,
    `- Run ID: ${runIds.join(", ") || "not recorded"}`,
    `- Sample completeness: ${completeness}`,
    `- Implementations: ${implementations.join(", ")}`,
    `- Asset profiles: ${assetProfiles.join(", ")}`,
    `- Memory MiB: ${memoryValues.join(", ")}`,
    `- Max concurrency: ${parallelValues.join(", ")}`,
    `- Source window bytes: ${sourceWindowValues.join(", ")}`,
    `- Phases: ${phases.join(", ")}`,
  ].join("\n");
}

function reportTitle(options: RenderOptions): string {
  const filters = [
    options.assetProfile,
    options.memoryMb === undefined ? undefined : `${options.memoryMb} MiB`,
    options.parallel === undefined ? undefined : `max concurrency ${options.parallel}`,
  ].filter((value) => value !== undefined);
  return filters.length === 0 ? "benchmark results" : filters.join(" / ");
}

function renderMetricSection(
  records: BenchmarkRecord[],
  metric: { name: MetricName; label: string; unit: string },
  preview: boolean,
): string[] {
  const rows = aggregateRows(records, metric.name, preview);
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
    `| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (${unit}) | Q1 (${unit}) | Q3 (${unit}) | IQR (${unit}) | min (${unit}) | max (${unit}) |`,
    "| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${row.parallel ?? ""} | ${formatSourceWindow(row.sourceWindowBytes)} | ${row.implementation} | ${row.count} | ${formatNumber(row.median)} | ${formatNumber(row.q1)} | ${formatNumber(row.q3)} | ${formatNumber(row.iqr)} | ${formatNumber(row.min)} | ${formatNumber(row.max)} |`,
    ),
  ].join("\n");
}

function renderBarChart(rows: AggregatedRow[], unit: string): string {
  const max = Math.max(...rows.map((row) => row.median), 0);
  const lines = rows.map((row) => {
    const width = max === 0 ? 0 : Math.max(1, Math.round((row.median / max) * 30));
    const bar = "#".repeat(width);
    const label = `${row.profile} ${row.phase} ${row.memoryMb ?? ""}/${row.parallel ?? ""}/${formatSourceWindow(row.sourceWindowBytes)} ${row.implementation}`;
    return `${label.padEnd(48)} | ${bar} ${formatNumber(row.median)} ${unit}`;
  });

  return ["```text", ...lines, "```"].join("\n");
}

function renderComparisonSummaryTable(records: BenchmarkRecord[], preview: boolean): string {
  const rows = buildPhaseComparisonRows(records, preview);
  if (rows.length === 0) {
    return "No shin/aws pairs were available for comparison.";
  }

  return [
    "| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Provider duration | Local wall time | CDK deploy time | Max memory |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => {
      return `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${row.parallel ?? ""} | ${formatSourceWindow(row.sourceWindowBytes)} | ${formatOptionalComparisonCell(row.metrics.providerDurationSeconds)} | ${formatOptionalComparisonCell(row.metrics.localWallSeconds)} | ${formatOptionalComparisonCell(row.metrics.cdkDeploySeconds)} | ${formatOptionalMemoryCell(row.metrics.maxMemoryMb)} |`;
    }),
  ].join("\n");
}

function renderPhaseComparisonTables(records: BenchmarkRecord[], preview: boolean): string[] {
  const rows = buildPhaseComparisonRows(records, preview);
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
    "| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.metricLabel} | ${formatValue(row.shin, row.unit)} | ${formatValue(row.aws, row.unit)} | ${formatSignedValue(row.diff, row.unit)} | ${formatRatio(row.ratio)} | ${formatSignedPercent(row.percentDelta)} |`,
    ),
  ].join("\n");
}

function buildMetricComparisonRows(
  records: BenchmarkRecord[],
  preview: boolean,
): MetricComparisonRow[] {
  return METRICS.flatMap((metric, metricIndex) => {
    return metricPairs(records, metric.name, preview).map((pair) => ({
      profile: pair.profile,
      phase: pair.phase,
      memoryMb: pair.memoryMb,
      parallel: pair.parallel,
      sourceWindowBytes: pair.sourceWindowBytes,
      metricName: metric.name,
      metricLabel: metric.label,
      metricIndex,
      unit: metric.unit,
      shin: pair.shin,
      aws: pair.aws,
      diff: pair.aws - pair.shin,
      ratio: pair.ratio,
      percentDelta: ((pair.aws - pair.shin) / pair.shin) * 100,
    }));
  }).sort(compareMetricComparisonRows);
}

function buildPhaseComparisonRows(
  records: BenchmarkRecord[],
  preview = false,
): PhaseComparisonRow[] {
  const rows = new Map<string, PhaseComparisonRow>();
  for (const metricRow of buildMetricComparisonRows(records, preview)) {
    const key = comparisonKey(metricRow);
    const row = rows.get(key) ?? {
      profile: metricRow.profile,
      phase: metricRow.phase,
      memoryMb: metricRow.memoryMb,
      parallel: metricRow.parallel,
      sourceWindowBytes: metricRow.sourceWindowBytes,
      metrics: {},
    };
    row.metrics[metricRow.metricName] = metricRow;
    rows.set(key, row);
  }
  return [...rows.values()].sort(comparePhaseGroups);
}

function phaseTitle(row: PhaseComparisonRow): string {
  const memory = row.memoryMb === null ? "" : ` at ${row.memoryMb} MiB`;
  const parallel = row.parallel === null ? "" : ` / max concurrency ${row.parallel}`;
  const sourceWindow = ` / source window ${formatSourceWindow(row.sourceWindowBytes)}`;
  return `${row.profile} ${row.phase}${memory}${parallel}${sourceWindow}`;
}

function metricPairs(
  records: BenchmarkRecord[],
  metric: MetricName,
  preview: boolean,
): MetricPair[] {
  const rows = aggregateRows(records, metric, preview);
  const grouped = new Map<string, AggregatedRow[]>();
  for (const row of rows) {
    const key = comparisonGroupKey(row);
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .flatMap((group) => {
      const aws = group.find((row) => row.implementation.startsWith("aws"));
      if (!aws) {
        return [];
      }
      return group
        .filter((row) => row.implementation.startsWith("shin") && row.median !== 0)
        .map((shin) => ({
          key: comparisonKey(shin),
          profile: shin.profile,
          phase: shin.phase,
          memoryMb: shin.memoryMb,
          parallel: shin.parallel,
          sourceWindowBytes: shin.sourceWindowBytes,
          shin: shin.median,
          aws: aws.median,
          ratio: aws.median / shin.median,
        }));
    })
    .sort(compareMetricPairs);
}

type MetricComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly sourceWindowBytes: number | null;
  readonly metricName: MetricName;
  readonly metricLabel: string;
  readonly metricIndex: number;
  readonly unit: string;
  readonly shin: number;
  readonly aws: number;
  readonly diff: number;
  readonly ratio: number;
  readonly percentDelta: number;
};

type PhaseComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly sourceWindowBytes: number | null;
  readonly metrics: Partial<Record<MetricName, MetricComparisonRow>>;
};

type MetricPair = {
  readonly key: string;
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly sourceWindowBytes: number | null;
  readonly shin: number;
  readonly aws: number;
  readonly ratio: number;
};

type AggregatedRow = BenchmarkAggregate;

function aggregateRows(
  records: BenchmarkRecord[],
  metric: MetricName,
  preview = false,
): AggregatedRow[] {
  const rows = aggregateMetric(records, metric).sort(compareAggregatedRows);
  if (!preview && records.some((record) => benchmarkMethodologyVersion(record) === 2)) {
    assertCompleteSamples(rows);
  }
  return rows;
}

function comparisonKey(row: {
  profile: string;
  phase: string;
  memoryMb: number | null;
  parallel: number | null;
  sourceWindowBytes: number | null;
}): string {
  return [
    row.profile,
    row.phase,
    row.memoryMb ?? "",
    row.parallel ?? "",
    row.sourceWindowBytes ?? "adaptive",
  ].join("\u0000");
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
  left: {
    profile: string;
    phase: string;
    memoryMb: number | null;
    parallel: number | null;
    sourceWindowBytes: number | null;
  },
  right: {
    profile: string;
    phase: string;
    memoryMb: number | null;
    parallel: number | null;
    sourceWindowBytes: number | null;
  },
): number {
  return (
    left.profile.localeCompare(right.profile) ||
    (left.memoryMb ?? 0) - (right.memoryMb ?? 0) ||
    (left.parallel ?? 0) - (right.parallel ?? 0) ||
    (left.sourceWindowBytes ?? 0) - (right.sourceWindowBytes ?? 0) ||
    phaseRank(left.phase) - phaseRank(right.phase) ||
    left.phase.localeCompare(right.phase)
  );
}

function formatSourceWindow(value: number | null | undefined): string {
  return value === null || value === undefined ? "adaptive" : String(value);
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
  return `${formatValue(row.shin, row.unit)} vs ${formatValue(row.aws, row.unit)} (${formatShinAdvantage(row.ratio)})`;
}

function formatOptionalComparisonCell(row: MetricComparisonRow | undefined): string {
  return row === undefined ? "" : formatComparisonCell(row);
}

function formatMemoryCell(row: MetricComparisonRow): string {
  return `${formatValue(row.shin, row.unit)} vs ${formatValue(row.aws, row.unit)} (${formatMemoryAdvantage(row)})`;
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

function formatShinAdvantage(value: number): string {
  return value >= 1 ? `${formatRatio(value)} faster` : `${formatRatio(1 / value)} slower`;
}

function formatMemoryAdvantage(row: MetricComparisonRow): string {
  const reduction = ((row.aws - row.shin) / row.aws) * 100;
  return reduction >= 0
    ? `${formatNumber(reduction)}% lower`
    : `${formatNumber(Math.abs(reduction))}% higher`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value))}%`;
}

function parseArgs(args: string[]): RenderOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);

  return {
    inputFile: values.get("input-file") ?? "benchmarks/results.jsonl",
    outputFile: values.get("output-file") ?? "benchmarks/report.md",
    memoryMb: parsePositiveInteger(values.get("lambda-memory-mb")),
    parallel: parsePositiveInteger(values.get("transfer-max-concurrency")),
    methodologyVersion: parseMethodologyVersion(values.get("methodology-version")),
    preview: parseBoolean(values.get("preview")),
    runId: values.get("run-id"),
    configFile: values.get("config"),
    scratchRoot: values.get("scratch-root"),
    assetProfile: values.get("asset-profile"),
  };
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  usage();
}

function parseMethodologyVersion(value: string | undefined): 1 | 2 | undefined {
  if (value === undefined) return undefined;
  if (value === "1") return 1;
  if (value === "2") return 2;
  usage();
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/render/comparison-report.js [--input-file benchmarks/results.jsonl] [--output-file benchmarks/report.md] [--asset-profile <name>] [--transfer-max-concurrency <n>] [--lambda-memory-mb <n>] [--preview true|false]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
