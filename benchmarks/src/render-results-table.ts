import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type BenchmarkRecord = {
  readonly snapshotDate?: string | null;
  readonly providerImplementationCommit?: string | null;
  readonly providerImplementationSubject?: string | null;
  readonly resultDocumentationCommit?: string | null;
  readonly region?: string | null;
  readonly implementation?: string | null;
  readonly profile?: string | null;
  readonly memoryMb?: number | null;
  readonly parallel?: number | null;
  readonly phase?: string | null;
  readonly state?: string | null;
  readonly fileCount?: number | null;
  readonly totalBytes?: number | null;
  readonly cdkDeploySeconds?: number | null;
  readonly localWallSeconds?: number | null;
  readonly providerDurationSeconds?: number | null;
  readonly billedDurationSeconds?: number | null;
  readonly initDurationSeconds?: number | null;
  readonly maxMemoryMb?: number | null;
  readonly cleanup?: string | null;
  readonly notes?: string | null;
  readonly providerSummary?: ProviderSummary | null;
};

type ProviderSummary = {
  readonly requestType?: string | null;
  readonly status?: string | null;
  readonly extract?: boolean | null;
  readonly prune?: boolean | null;
  readonly availableMemoryMb?: number | null;
  readonly maxParallelTransfers?: number | null;
  readonly durationMs?: number | null;
  readonly phaseMs?: Record<string, number | null> | null;
  readonly counts?: Record<string, number | null> | null;
  readonly bytes?: Record<string, number | null> | null;
  readonly source?: Record<string, number | null> | null;
  readonly putObject?: Record<string, number | null> | null;
};

type RenderOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
};

type TelemetryRow = {
  readonly line: number;
  readonly record: BenchmarkRecord;
  readonly summary: ProviderSummary;
};

type TelemetryGroup = {
  readonly profile: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly rows: TelemetryRow[];
};

type Column<T> = {
  readonly header: string;
  readonly value: (row: T) => unknown;
};

const PHASE_ORDER = new Map([
  ["cold-create", 0],
  ["forced-unchanged", 1],
  ["sparse-update", 2],
  ["prune-update", 3],
]);

const RUNTIME_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "State", value: (row) => row.record.state },
  { header: "Request", value: (row) => row.summary.requestType },
  { header: "Status", value: (row) => row.summary.status },
  { header: "Files", value: (row) => row.record.fileCount },
  { header: "Bytes", value: (row) => row.record.totalBytes },
  { header: "CDK deploy s", value: (row) => row.record.cdkDeploySeconds },
  { header: "Local wall s", value: (row) => row.record.localWallSeconds },
  { header: "CloudWatch provider s", value: (row) => row.record.providerDurationSeconds },
  { header: "Summary duration ms", value: (row) => row.summary.durationMs },
  { header: "Billed s", value: (row) => row.record.billedDurationSeconds },
  { header: "Init s", value: (row) => row.record.initDurationSeconds },
  { header: "Max memory MiB", value: (row) => row.record.maxMemoryMb },
  { header: "Available MiB", value: (row) => row.summary.availableMemoryMb },
  { header: "Max transfers", value: (row) => row.summary.maxParallelTransfers },
  { header: "Row", value: (row) => row.line },
];

const PHASE_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Plan ms", value: (row) => nested(row, "phaseMs", "plan") },
  { header: "Destination list ms", value: (row) => nested(row, "phaseMs", "destinationList") },
  { header: "Transfer ms", value: (row) => nested(row, "phaseMs", "transfer") },
  { header: "Delete ms", value: (row) => nested(row, "phaseMs", "delete") },
  { header: "CloudFront ms", value: (row) => nested(row, "phaseMs", "cloudfront") },
  { header: "Old prefix delete ms", value: (row) => nested(row, "phaseMs", "oldPrefixDelete") },
];

const OBJECT_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Planned", value: (row) => nested(row, "counts", "plannedEntries") },
  { header: "Filtered", value: (row) => nested(row, "counts", "filteredEntries") },
  { header: "Markers", value: (row) => nested(row, "counts", "markerEntries") },
  { header: "Destination objects", value: (row) => nested(row, "counts", "destinationObjects") },
  { header: "Uploaded", value: (row) => nested(row, "counts", "uploadedObjects") },
  { header: "Skipped", value: (row) => nested(row, "counts", "skippedObjects") },
  { header: "Deleted", value: (row) => nested(row, "counts", "deleteObjects") },
  { header: "Delete batches", value: (row) => nested(row, "counts", "deleteBatches") },
  {
    header: "Conditional conflicts",
    value: (row) => nested(row, "counts", "conditionalConflicts"),
  },
  { header: "Copied", value: (row) => nested(row, "counts", "copiedObjects") },
  { header: "MD5 hash attempts", value: (row) => nested(row, "counts", "md5HashAttempts") },
  { header: "MD5 skips", value: (row) => nested(row, "counts", "md5Skips") },
  { header: "Catalog skips", value: (row) => nested(row, "counts", "catalogSkips") },
];

const BYTE_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Source zip bytes", value: (row) => nested(row, "bytes", "sourceZip") },
  { header: "Uploaded bytes", value: (row) => nested(row, "bytes", "uploaded") },
  { header: "Copied bytes", value: (row) => nested(row, "bytes", "copied") },
  { header: "Source planned bytes", value: (row) => nested(row, "source", "plannedBytes") },
  { header: "Source fetched bytes", value: (row) => nested(row, "source", "fetchedBytes") },
  {
    header: "Resident bytes high",
    value: (row) => nested(row, "source", "residentBytesHighWater"),
  },
];

const SOURCE_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Planned blocks", value: (row) => nested(row, "source", "plannedBlocks") },
  { header: "Fetched blocks", value: (row) => nested(row, "source", "fetchedBlocks") },
  { header: "Get attempts", value: (row) => nested(row, "source", "getAttempts") },
  { header: "Get retries", value: (row) => nested(row, "source", "getRetries") },
  { header: "Get errors", value: (row) => nested(row, "source", "getErrors") },
  { header: "Block hits", value: (row) => nested(row, "source", "blockHits") },
  { header: "Block misses", value: (row) => nested(row, "source", "blockMisses") },
  { header: "Block refetches", value: (row) => nested(row, "source", "blockRefetches") },
  { header: "Block waits", value: (row) => nested(row, "source", "blockWaits") },
  { header: "Waits fetching", value: (row) => nested(row, "source", "blockWaitsFetching") },
  { header: "Waits capacity", value: (row) => nested(row, "source", "blockWaitsCapacity") },
  { header: "Replay claims", value: (row) => nested(row, "source", "replayClaims") },
  {
    header: "Replay after release",
    value: (row) => nested(row, "source", "replayClaimsAfterRelease"),
  },
  {
    header: "Replay after failure",
    value: (row) => nested(row, "source", "replayClaimsAfterFailure"),
  },
  {
    header: "Active readers high",
    value: (row) => nested(row, "source", "activeReadersHighWater"),
  },
];

const PUT_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Failed attempts", value: (row) => nested(row, "putObject", "failedAttempts") },
  { header: "Retry attempts", value: (row) => nested(row, "putObject", "retryAttempts") },
  { header: "Throttled attempts", value: (row) => nested(row, "putObject", "throttledAttempts") },
  { header: "Retry wait ms", value: (row) => nested(row, "putObject", "retryWaitMs") },
  {
    header: "Throttle cooldown waits",
    value: (row) => nested(row, "putObject", "throttleCooldownWaits"),
  },
  {
    header: "Throttle cooldown ms",
    value: (row) => nested(row, "putObject", "throttleCooldownWaitMs"),
  },
];

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  renderBenchmarkResultsTable(options);
  console.log(`wrote benchmark results table to ${options.outputFile}`);
}

export function renderBenchmarkResultsTable(options: RenderOptions): string {
  const rows = readTelemetryRows(options.inputFile);
  const groups = buildGroups(rows);
  const report = renderResultsMarkdown(rows, groups, options.inputFile);
  mkdirSync(dirname(options.outputFile), { recursive: true });
  writeFileSync(options.outputFile, report);
  return report;
}

function renderResultsMarkdown(
  rows: TelemetryRow[],
  groups: TelemetryGroup[],
  inputFile: string,
): string {
  return [
    "# Shin Provider Benchmark Telemetry",
    "",
    `Generated from Shin rows in \`${inputFile}\`. Raw benchmark evidence stays outside the repo.`,
    "",
    "## Summary",
    "",
    renderMarkdownTable(
      [
        ["Shin telemetry rows", rows.length],
        ["Config groups", groups.length],
        ["Snapshot dates", unique(rows.map((row) => row.record.snapshotDate)).join(", ")],
        ["Regions", unique(rows.map((row) => row.record.region)).join(", ")],
        ["Profiles", unique(rows.map((row) => row.record.profile)).join(", ")],
      ].map(([field, value]) => ({ field, value })),
      [
        { header: "Field", value: (row) => row.field },
        { header: "Value", value: (row) => row.value },
      ],
    ),
    "",
    ...groups.flatMap(renderGroup),
  ].join("\n");
}

function renderGroup(group: TelemetryGroup): string[] {
  const title = `${group.profile} / ${formatCell(group.memoryMb)} MiB / parallel ${formatCell(group.parallel)}`;
  return [
    `## ${title}`,
    "",
    "### Runtime",
    "",
    renderMarkdownTable(group.rows, RUNTIME_COLUMNS),
    "",
    "### Provider Phase Timing",
    "",
    renderMarkdownTable(group.rows, PHASE_COLUMNS),
    "",
    "### Object Work",
    "",
    renderMarkdownTable(group.rows, OBJECT_COLUMNS),
    "",
    "### Bytes And Memory Window",
    "",
    renderMarkdownTable(group.rows, BYTE_COLUMNS),
    "",
    "### Source Range Reads",
    "",
    renderMarkdownTable(group.rows, SOURCE_COLUMNS),
    "",
    "### PutObject Pressure",
    "",
    renderMarkdownTable(group.rows, PUT_COLUMNS),
    "",
  ];
}

function buildGroups(rows: TelemetryRow[]): TelemetryGroup[] {
  const groups = new Map<string, TelemetryGroup>();
  for (const row of rows) {
    const profile = row.record.profile ?? "unknown";
    const memoryMb = row.record.memoryMb ?? null;
    const parallel = row.record.parallel ?? null;
    const key = [profile, memoryMb, parallel].join("\0");
    const group = groups.get(key) ?? { profile, memoryMb, parallel, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, rows: [...group.rows].sort(compareRows) }))
    .sort(compareGroups);
}

function compareGroups(left: TelemetryGroup, right: TelemetryGroup): number {
  return (
    left.profile.localeCompare(right.profile) ||
    (left.memoryMb ?? 0) - (right.memoryMb ?? 0) ||
    (left.parallel ?? 0) - (right.parallel ?? 0)
  );
}

function compareRows(left: TelemetryRow, right: TelemetryRow): number {
  return (
    phaseRank(phase(left)) - phaseRank(phase(right)) || phase(left).localeCompare(phase(right))
  );
}

function phase(row: TelemetryRow): string {
  return row.record.phase ?? "unknown";
}

function phaseRank(value: string): number {
  return PHASE_ORDER.get(value) ?? Number.MAX_SAFE_INTEGER;
}

function nested(
  row: TelemetryRow,
  section: "phaseMs" | "counts" | "bytes" | "source" | "putObject",
  key: string,
): unknown {
  return row.summary[section]?.[key];
}

function renderMarkdownTable<T>(rows: T[], columns: Array<Column<T>>): string {
  return [
    `| ${columns.map((column) => escapeTableCell(column.header)).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map(
      (row) => `| ${columns.map((column) => formatCell(column.value(row))).join(" | ")} |`,
    ),
  ].join("\n");
}

function readTelemetryRows(filePath: string): TelemetryRow[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, lineNumber }) => {
      try {
        return { line: lineNumber, record: JSON.parse(line) as BenchmarkRecord };
      } catch (cause) {
        throw new Error(`Invalid JSONL record at ${filePath}:${lineNumber}`, { cause });
      }
    })
    .filter(({ record }) => record.providerSummary !== undefined && record.providerSummary !== null)
    .map(({ line, record }) => ({
      line,
      record,
      summary: record.providerSummary as ProviderSummary,
    }));
}

function unique<T>(values: Array<T | null | undefined>): T[] {
  return [...new Set(values.filter((value): value is T => value !== null && value !== undefined))];
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null) {
    return "null";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? formatNumber(value) : "null";
  }
  return escapeTableCell(String(value));
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\r\n", "<br>").replaceAll("\n", "<br>");
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
    inputFile: values.get("input-file") ?? "benchmarks/results.jsonl",
    outputFile: values.get("output-file") ?? "benchmarks/results.md",
  };
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/render-results-table.js [--input-file benchmarks/results.jsonl] [--output-file benchmarks/results.md]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
