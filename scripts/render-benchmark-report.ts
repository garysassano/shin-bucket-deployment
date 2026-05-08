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
    "## Comparison Ratios",
    "",
    renderRatioTable(comparable, "providerDurationSeconds"),
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

function renderRatioTable(records: BenchmarkRecord[], metric: MetricName): string {
  const rows = aggregateRows(records, metric);
  const grouped = new Map<string, AggregatedRow[]>();
  for (const row of rows) {
    const key = `${row.profile}\u0000${row.phase}\u0000${row.memoryMb ?? ""}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const ratioRows = [...grouped.values()]
    .map((group) => {
      const aws = group.find((row) => row.implementation.startsWith("aws"));
      const rust = group.find((row) => row.implementation.startsWith("rust"));
      if (!aws || !rust || rust.median === 0) {
        return undefined;
      }
      return { aws, rust, ratio: aws.median / rust.median };
    })
    .filter((row) => row !== undefined);

  if (ratioRows.length === 0) {
    return "No rust/aws pairs were available for provider-duration ratios.";
  }

  return [
    "| Profile | Phase | Memory MiB | Rust median (s) | AWS median (s) | AWS/Rust |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
    ...ratioRows.map(
      ({ aws, rust, ratio }) =>
        `| ${rust.profile} | ${rust.phase} | ${rust.memoryMb ?? ""} | ${formatNumber(rust.median)} | ${formatNumber(aws.median)} | ${formatNumber(ratio)}x |`,
    ),
  ].join("\n");
}

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
    .sort((left, right) =>
      [left.profile, left.phase, left.memoryMb ?? 0, left.implementation]
        .join("\u0000")
        .localeCompare(
          [right.profile, right.phase, right.memoryMb ?? 0, right.implementation].join("\u0000"),
        ),
    );
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
