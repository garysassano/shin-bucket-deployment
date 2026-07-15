import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { parseCliOptions } from "../cli";
import {
  type BenchmarkResultRecord,
  type ProviderSummary,
  phaseRank,
  readBenchmarkResultRows,
} from "../model";
import { selectValidatedBenchmarkRun } from "../validation";

type RenderOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
  readonly methodologyVersion?: 1 | 2;
  readonly runId?: string;
  readonly configFile?: string;
  readonly scratchRoot?: string;
};

type TelemetryRow = {
  readonly line: number;
  readonly record: BenchmarkResultRecord;
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

const CLI_OPTIONS = [
  "config",
  "input-file",
  "methodology-version",
  "output-file",
  "run-id",
  "scratch-root",
] as const;

const RUNTIME_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "State", value: (row) => row.record.state },
  { header: "Request", value: (row) => row.summary.requestType },
  {
    header: "Deployment work",
    value: (row) => row.summary.deploymentStatus ?? row.summary.status,
  },
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
  { header: "Checksum strategy", value: (row) => row.summary.destinationChecksumStrategy },
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
  { header: "Callback ms", value: (row) => nested(row, "phaseMs", "callback") },
];

const OBJECT_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Planned", value: (row) => nested(row, "counts", "plannedEntries") },
  { header: "Filtered", value: (row) => nested(row, "counts", "filteredEntries") },
  { header: "Markers", value: (row) => nested(row, "counts", "markerEntries") },
  { header: "Destination objects", value: (row) => nested(row, "counts", "destinationObjects") },
  {
    header: "Destination metadata retained",
    value: (row) => nested(row, "counts", "destinationMetadataRetained"),
  },
  {
    header: "Destination page objects high",
    value: (row) => nested(row, "counts", "destinationPageObjectsHighWater"),
  },
  { header: "Uploaded", value: (row) => nested(row, "counts", "uploadedObjects") },
  { header: "Skipped", value: (row) => nested(row, "counts", "skippedObjects") },
  { header: "Inferred deleted", value: (row) => nested(row, "counts", "deleteObjects") },
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
  {
    header: "Global budget bytes",
    value: (row) => nested(row, "source", "globalBudgetBytes"),
  },
  {
    header: "Global resident bytes current",
    value: (row) => nested(row, "source", "globalResidentBytesCurrent"),
  },
  {
    header: "Global resident bytes high",
    value: (row) => nested(row, "source", "globalResidentBytesHighWater"),
  },
];

const SOURCE_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Planned blocks", value: (row) => nested(row, "source", "plannedBlocks") },
  { header: "Fetched blocks", value: (row) => nested(row, "source", "fetchedBlocks") },
  { header: "Get attempts", value: (row) => nested(row, "source", "getAttempts") },
  { header: "Get retries", value: (row) => nested(row, "source", "getRetries") },
  {
    header: "Get throttled",
    value: (row) => nested(row, "source", "getThrottledAttempts"),
  },
  {
    header: "Get retryable errors",
    value: (row) => nested(row, "source", "getRetryableErrors"),
  },
  {
    header: "Get permanent errors",
    value: (row) => nested(row, "source", "getPermanentErrors"),
  },
  { header: "Get request errors", value: (row) => nested(row, "source", "getRequestErrors") },
  { header: "Get body errors", value: (row) => nested(row, "source", "getBodyErrors") },
  {
    header: "Get short bodies",
    value: (row) => nested(row, "source", "getShortBodyErrors"),
  },
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
  { header: "Body attempts", value: (row) => nested(row, "source", "bodyAttempts") },
  { header: "Body replays", value: (row) => nested(row, "source", "bodyReplays") },
  {
    header: "Active GETs high",
    value: (row) => nested(row, "source", "activeGetsHighWater"),
  },
  {
    header: "Active readers high",
    value: (row) => nested(row, "source", "activeReadersHighWater"),
  },
];

const TRANSFER_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Scheduled", value: (row) => nested(row, "transfer", "scheduledObjects") },
  { header: "Completed", value: (row) => nested(row, "transfer", "completedObjects") },
  { header: "Failed", value: (row) => nested(row, "transfer", "failedObjects") },
  { header: "Cancelled", value: (row) => nested(row, "transfer", "cancelledObjects") },
  { header: "Panicked", value: (row) => nested(row, "transfer", "panickedObjects") },
  {
    header: "In flight high",
    value: (row) => nested(row, "transfer", "inFlightHighWater"),
  },
];

const PUT_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Wire attempts", value: (row) => nested(row, "putObject", "wireAttempts") },
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

const CATALOG_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Trusted archives", value: (row) => nested(row, "catalog", "trustedArchives") },
  {
    header: "Untrusted archives",
    value: (row) => nested(row, "catalog", "untrustedArchives"),
  },
  { header: "Trusted entries", value: (row) => nested(row, "catalog", "trustedEntries") },
  {
    header: "Fallback hash attempts",
    value: (row) => nested(row, "catalog", "fallbackHashAttempts"),
  },
  { header: "Sparse skips", value: (row) => nested(row, "catalog", "sparseSkips") },
];

const DELETE_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "SDK calls", value: (row) => nested(row, "deleteObject", "sdkCalls") },
  {
    header: "Failed calls",
    value: (row) => nested(row, "deleteObject", "failedCalls"),
  },
  {
    header: "Requested objects",
    value: (row) => nested(row, "deleteObject", "requestedObjects"),
  },
  {
    header: "Inferred deleted objects",
    value: (row) => nested(row, "deleteObject", "inferredDeletedObjects"),
  },
  {
    header: "Unconfirmed objects",
    value: (row) => nested(row, "deleteObject", "unconfirmedObjects"),
  },
  {
    header: "NoSuchBucket requested identifiers",
    value: (row) => nested(row, "deleteObject", "noSuchBucketRequestedIdentifiers"),
  },
];

const CALLBACK_COLUMNS: Array<Column<TelemetryRow>> = [
  { header: "Phase", value: phase },
  { header: "Wire attempts", value: (row) => nested(row, "callback", "wireAttempts") },
  { header: "Failed attempts", value: (row) => nested(row, "callback", "failedAttempts") },
  { header: "Retry attempts", value: (row) => nested(row, "callback", "retryAttempts") },
  {
    header: "Confirmed responses",
    value: (row) => nested(row, "callback", "confirmedResponses"),
  },
];

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  renderBenchmarkResultsTable(options);
  console.log(`wrote benchmark results table to ${options.outputFile}`);
}

export function renderBenchmarkResultsTable(options: RenderOptions): string {
  const rows = readTelemetryRows(
    options.inputFile,
    options.methodologyVersion ?? 2,
    options.runId,
    options.configFile,
    options.scratchRoot,
  );
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
    `Generated from Shin rows in \`${basename(inputFile)}\`. Raw benchmark evidence stays outside the repo.`,
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
    "### Catalog Trust And Fallback",
    "",
    renderMarkdownTable(group.rows, CATALOG_COLUMNS),
    "",
    "### Bytes And Memory Window",
    "",
    renderMarkdownTable(group.rows, BYTE_COLUMNS),
    "",
    "### Source Range Reads",
    "",
    renderMarkdownTable(group.rows, SOURCE_COLUMNS),
    "",
    "### Transfer Scheduler",
    "",
    renderMarkdownTable(group.rows, TRANSFER_COLUMNS),
    "",
    "### PutObject Pressure",
    "",
    renderMarkdownTable(group.rows, PUT_COLUMNS),
    "",
    "### DeleteObjects Pressure",
    "",
    renderMarkdownTable(group.rows, DELETE_COLUMNS),
    "",
    "### CloudFormation Callback",
    "",
    renderMarkdownTable(group.rows, CALLBACK_COLUMNS),
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

function nested(
  row: TelemetryRow,
  section:
    | "phaseMs"
    | "counts"
    | "bytes"
    | "transfer"
    | "catalog"
    | "source"
    | "putObject"
    | "deleteObject"
    | "callback",
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

function readTelemetryRows(
  filePath: string,
  methodologyVersion: 1 | 2,
  requestedRunId: string | undefined,
  configFile: string | undefined,
  scratchRoot: string | undefined,
): TelemetryRow[] {
  const allRows = readBenchmarkResultRows(filePath);
  const selectedRecords = new Set(
    selectValidatedBenchmarkRun({
      records: allRows.map(({ record }) => record),
      methodologyVersion,
      runId: requestedRunId,
      configFile,
      inputFile: filePath,
      scratchRoot,
    }),
  );
  const rows = allRows
    .filter(({ record }) => selectedRecords.has(record))
    .filter(
      ({ record }) => record.providerSummary !== undefined && record.providerSummary !== null,
    );
  return rows.map(({ line, record }) => ({
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
  const values = parseCliOptions(args, CLI_OPTIONS, usage);

  return {
    inputFile: values.get("input-file") ?? "benchmarks/results.jsonl",
    outputFile: values.get("output-file") ?? "benchmarks/telemetry.md",
    methodologyVersion: parseMethodologyVersion(values.get("methodology-version")),
    runId: values.get("run-id"),
    configFile: values.get("config"),
    scratchRoot: values.get("scratch-root"),
  };
}

function parseMethodologyVersion(value: string | undefined): 1 | 2 | undefined {
  if (value === undefined) return undefined;
  if (value === "1") return 1;
  if (value === "2") return 2;
  usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/render/telemetry-table.js [--input-file benchmarks/results.jsonl] [--output-file benchmarks/telemetry.md]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
