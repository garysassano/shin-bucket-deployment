import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { parseCliOptions } from "./cli";
import { type BenchmarkResultRecord, benchmarkResultKey, normalizeImplementation } from "./model";

export type CollectBenchmarkOptions = {
  readonly assetProfile?: string;
  readonly cleanup?: string;
  readonly commit?: string;
  readonly fileCount?: number;
  readonly implementation?: string;
  readonly logFile: string;
  readonly memoryMb?: number;
  readonly notes?: string;
  readonly outputFile: string;
  readonly parallel?: number;
  readonly phase: string;
  readonly region?: string;
  readonly reportFile?: string;
  readonly resultCommit?: string;
  readonly snapshotDate?: string;
  readonly state?: string;
  readonly subject?: string;
  readonly summaryFile?: string;
  readonly totalBytes?: number;
};

const CLI_OPTIONS = [
  "asset-profile",
  "asset-state",
  "cleanup",
  "commit",
  "file-count",
  "implementation",
  "lambda-max-parallel-transfers",
  "lambda-memory-mb",
  "log-file",
  "notes",
  "output-file",
  "phase",
  "region",
  "report-file",
  "result-commit",
  "snapshot-date",
  "subject",
  "summary-file",
  "total-bytes",
] as const;

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  collectBenchmarkResult(options);
  console.log(
    `upserted ${options.phase} from ${basename(options.logFile)} to ${options.outputFile}`,
  );
}

export function collectBenchmarkResult(options: CollectBenchmarkOptions): BenchmarkResultRecord {
  const logText = readFileSync(options.logFile, "utf8");
  const report = options.reportFile ? readReportFile(options.reportFile) : undefined;
  const providerSummary = options.summaryFile ? readSummaryFile(options.summaryFile) : undefined;
  const record: BenchmarkResultRecord = {
    snapshotDate: options.snapshotDate ?? today(),
    providerImplementationCommit: options.commit ?? null,
    providerImplementationSubject: options.subject ?? null,
    resultDocumentationCommit: options.resultCommit ?? null,
    region: options.region ?? null,
    implementation: normalizeImplementation(
      options.implementation ?? outputString(logText, "BenchmarkImplementation"),
    ),
    profile: options.assetProfile ?? outputString(logText, "BenchmarkAssetProfile"),
    memoryMb: options.memoryMb ?? outputNumber(logText, "BenchmarkMemoryLimitMb"),
    parallel: options.parallel ?? outputNumber(logText, "BenchmarkMaxParallelTransfers"),
    phase: options.phase,
    state: options.state ?? outputString(logText, "BenchmarkState"),
    fileCount: options.fileCount ?? outputNumber(logText, "BenchmarkFileCount"),
    totalBytes: options.totalBytes ?? outputNumber(logText, "BenchmarkTotalBytes"),
    cdkDeploySeconds: parseSeconds(logText, /Deployment time: ([\d.]+)s/),
    localWallSeconds: parseSeconds(logText, /^real ([\d.]+)$/m),
    providerDurationSeconds: report?.durationSeconds ?? null,
    billedDurationSeconds: report?.billedDurationSeconds ?? null,
    initDurationSeconds: report?.initDurationSeconds ?? null,
    maxMemoryMb: report?.maxMemoryMb ?? null,
    providerInvoked: report !== undefined || providerSummary !== undefined,
    cleanup: options.cleanup ?? null,
    notes: options.notes ?? noChangeNote(logText),
    ...(providerSummary === undefined ? {} : { providerSummary }),
  };

  upsertBenchmarkResult(options.outputFile, record);
  return record;
}

function upsertBenchmarkResult(outputFile: string, record: BenchmarkResultRecord): void {
  const key = benchmarkResultKey(record);
  const retainedRows = existsSync(outputFile)
    ? readFileSync(outputFile, "utf8")
        .split(/\n/)
        .filter((line) => line.trim() !== "")
        .filter((line) => rowKey(line) !== key)
    : [];
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${[...retainedRows, JSON.stringify(record)].join("\n")}\n`);
}

function rowKey(line: string): string | null {
  try {
    const parsed = JSON.parse(line) as Partial<BenchmarkResultRecord>;
    return benchmarkResultKey(parsed as BenchmarkResultRecord);
  } catch {
    return null;
  }
}

function parseArgs(args: string[]): CollectBenchmarkOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);

  const logFile = required(values, "log-file");
  const outputFile = values.get("output-file") ?? "benchmarks/results.jsonl";
  const phase = required(values, "phase");

  return {
    assetProfile: values.get("asset-profile"),
    cleanup: values.get("cleanup"),
    commit: values.get("commit"),
    fileCount: optionalNumber(values, "file-count"),
    implementation: values.get("implementation"),
    logFile,
    memoryMb: optionalNumber(values, "lambda-memory-mb"),
    notes: values.get("notes"),
    outputFile,
    parallel: optionalNumber(values, "lambda-max-parallel-transfers"),
    phase,
    region: values.get("region"),
    reportFile: values.get("report-file"),
    resultCommit: values.get("result-commit"),
    snapshotDate: values.get("snapshot-date"),
    state: values.get("asset-state"),
    subject: values.get("subject"),
    summaryFile: values.get("summary-file"),
    totalBytes: optionalNumber(values, "total-bytes"),
  };
}

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name);
  if (!value) {
    usage();
  }
  return value;
}

function optionalNumber(values: Map<string, string>, name: string): number | undefined {
  const value = values.get(name);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    usage();
  }
  return parsed;
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/collect-results.js --log-file <path> --phase <name> [--snapshot-date <YYYY-MM-DD>] [--report-file <path>] [--summary-file <path>] [--output-file benchmarks/results.jsonl] [--asset-profile <name>] [--asset-state <name>] [--implementation <shin|aws>] [--lambda-max-parallel-transfers <n>] [--lambda-memory-mb <n>]",
  );
  process.exit(1);
}

function readReportFile(path: string):
  | {
      durationSeconds: number;
      billedDurationSeconds: number;
      initDurationSeconds: number | null;
      maxMemoryMb: number;
    }
  | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const text = readFileSync(path, "utf8");
  const json = JSON.parse(text) as { events?: Array<{ message?: string; timestamp?: number }> };
  const message = [...(json.events ?? [])]
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    .at(-1)?.message;
  if (!message) {
    return undefined;
  }
  const durationMs = parseReportNumber(message, /Duration: ([\d.]+) ms/);
  const billedMs = parseReportNumber(message, /Billed Duration: ([\d.]+) ms/);
  const maxMemoryMb = parseReportNumber(message, /Max Memory Used: ([\d.]+) MB/);
  if (durationMs === null || billedMs === null || maxMemoryMb === null) {
    return undefined;
  }
  const initMs = parseReportNumber(message, /Init Duration: ([\d.]+) ms/);
  return {
    durationSeconds: roundSeconds(durationMs / 1000),
    billedDurationSeconds: roundSeconds(billedMs / 1000),
    initDurationSeconds: initMs === null ? null : roundSeconds(initMs / 1000),
    maxMemoryMb,
  };
}

function readSummaryFile(path: string): unknown | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const text = readFileSync(path, "utf8").trim();
  if (!text) {
    return undefined;
  }
  const summary = readCloudWatchSummaryJson(text) ?? readSummaryJsonLines(text);
  if (summary === undefined) {
    throw new Error(`No shin_deployment_summary record found in ${path}.`);
  }
  return summary;
}

function readCloudWatchSummaryJson(text: string): unknown | undefined {
  const parsed = tryParseJson(text);
  if (!isRecord(parsed) || !Array.isArray(parsed.events)) {
    return undefined;
  }

  const summaries = parsed.events
    .filter(isRecord)
    .sort((left, right) => optionalTimestamp(left) - optionalTimestamp(right))
    .map((event) =>
      typeof event.message === "string" ? summaryFromMessage(event.message) : undefined,
    )
    .filter((summary) => summary !== undefined);
  return summaries.at(-1);
}

function readSummaryJsonLines(text: string): unknown | undefined {
  const summaries = text
    .split(/\n/)
    .filter(Boolean)
    .map((line) => summaryFromJsonLine(line))
    .filter((summary) => summary !== undefined);
  return summaries.at(-1);
}

function summaryFromJsonLine(line: string): unknown | undefined {
  const parsed = JSON.parse(line) as unknown;
  if (isDeploymentSummary(parsed)) {
    return parsed;
  }
  if (isRecord(parsed) && typeof parsed.message === "string") {
    return summaryFromMessage(parsed.message);
  }
  return undefined;
}

function summaryFromMessage(message: string): unknown | undefined {
  const cleanMessage = stripAnsi(message);
  const match = cleanMessage.match(/\bsummary=(?:"((?:\\.|[^"\\])*)"|(\{.*\}))/);
  if (!match) {
    return undefined;
  }

  const summaryText = match[1] ? JSON.parse(`"${match[1]}"`) : match[2];
  const summary = tryParseJson(summaryText);
  return isDeploymentSummary(summary) ? summary : undefined;
}

function isDeploymentSummary(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.event === "shin_deployment_summary";
}

function optionalTimestamp(value: Record<string, unknown>): number {
  return typeof value.timestamp === "number" ? value.timestamp : 0;
}

function tryParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripAnsi(value: string): string {
  const escapeCharacter = String.fromCharCode(27);
  return value.replace(new RegExp(`${escapeCharacter}\\[[0-?]*[ -/]*[@-~]`, "g"), "");
}

function outputString(logText: string, outputName: string): string | null {
  const pattern = new RegExp(`\\.${escapeRegExp(outputName)} = (.+)`);
  return logText.match(pattern)?.[1]?.trim() ?? null;
}

function outputNumber(logText: string, outputName: string): number | null {
  const value = outputString(logText, outputName);
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSeconds(logText: string, pattern: RegExp): number | null {
  const value = logText.match(pattern)?.[1];
  if (!value) {
    return null;
  }
  return roundSeconds(Number(value));
}

function parseReportNumber(message: string, pattern: RegExp): number | null {
  const value = message.match(pattern)?.[1];
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function noChangeNote(logText: string): string | null {
  return logText.includes("(no changes)")
    ? "CDK reported no changes; provider was not invoked."
    : null;
}

function roundSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (require.main === module) {
  main();
}
