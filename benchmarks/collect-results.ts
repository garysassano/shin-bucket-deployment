import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

export type BenchmarkResultRecord = {
  readonly schemaVersion: 2;
  readonly runId: string;
  readonly runDate: string;
  readonly providerImplementationCommit: string | null;
  readonly providerImplementationSubject: string | null;
  readonly resultDocumentationCommit: string | null;
  readonly region: string | null;
  readonly implementation: string | null;
  readonly profile: string | null;
  readonly series: string | null;
  readonly memoryMb: number | null;
  readonly phase: string;
  readonly state: string | null;
  readonly fileCount: number | null;
  readonly totalBytes: number | null;
  readonly cdkDeploySeconds: number | null;
  readonly localWallSeconds: number | null;
  readonly providerDurationSeconds: number | null;
  readonly billedDurationSeconds: number | null;
  readonly initDurationSeconds: number | null;
  readonly maxMemoryMb: number | null;
  readonly providerInvoked: boolean;
  readonly cleanup: string | null;
  readonly notes: string | null;
  readonly providerSummary?: unknown;
};

export type CollectBenchmarkOptions = {
  readonly logFile: string;
  readonly reportFile?: string;
  readonly summaryFile?: string;
  readonly outputFile: string;
  readonly runId: string;
  readonly runDate: string;
  readonly phase: string;
  readonly series?: string;
  readonly commit?: string;
  readonly subject?: string;
  readonly resultCommit?: string;
  readonly region?: string;
  readonly implementation?: string;
  readonly profile?: string;
  readonly memoryMb?: number;
  readonly state?: string;
  readonly fileCount?: number;
  readonly totalBytes?: number;
  readonly cleanup?: string;
  readonly notes?: string;
};

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  collectBenchmarkResult(options);
  console.log(
    `appended ${options.phase} from ${basename(options.logFile)} to ${options.outputFile}`,
  );
}

export function collectBenchmarkResult(options: CollectBenchmarkOptions): BenchmarkResultRecord {
  const logText = readFileSync(options.logFile, "utf8");
  const report = options.reportFile ? readReportFile(options.reportFile) : undefined;
  const providerSummary = options.summaryFile ? readSummaryFile(options.summaryFile) : undefined;
  const record: BenchmarkResultRecord = {
    schemaVersion: 2,
    runId: options.runId,
    runDate: options.runDate,
    providerImplementationCommit: options.commit ?? null,
    providerImplementationSubject: options.subject ?? null,
    resultDocumentationCommit: options.resultCommit ?? null,
    region: options.region ?? null,
    implementation: normalizeImplementation(
      options.implementation ?? outputString(logText, "BenchmarkImplementation"),
    ),
    profile: options.profile ?? outputString(logText, "BenchmarkProfile"),
    series: options.series ?? null,
    memoryMb: options.memoryMb ?? outputNumber(logText, "BenchmarkMemoryLimitMb"),
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

  appendFileSync(options.outputFile, `${JSON.stringify(record)}\n`);
  return record;
}

function parseArgs(args: string[]): CollectBenchmarkOptions {
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

  const logFile = required(values, "log-file");
  const outputFile = values.get("output-file") ?? "benchmarks/results.jsonl";
  const runId = required(values, "run-id");
  const runDate = required(values, "run-date");
  const phase = required(values, "phase");

  return {
    logFile,
    reportFile: values.get("report-file"),
    summaryFile: values.get("summary-file"),
    outputFile,
    runId,
    runDate,
    phase,
    series: values.get("series"),
    commit: values.get("commit"),
    subject: values.get("subject"),
    resultCommit: values.get("result-commit"),
    region: values.get("region"),
    implementation: values.get("implementation"),
    profile: values.get("profile"),
    memoryMb: optionalNumber(values, "memory-mb"),
    state: values.get("state"),
    fileCount: optionalNumber(values, "file-count"),
    totalBytes: optionalNumber(values, "total-bytes"),
    cleanup: values.get("cleanup"),
    notes: values.get("notes"),
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

function normalizeImplementation(value: string | null | undefined): string | null {
  if (value === "rust") {
    return "shin";
  }
  return value ?? null;
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/collect-results.js --log-file <path> --run-id <id> --run-date <YYYY-MM-DD> --phase <name> [--report-file <path>] [--summary-file <path>] [--output-file benchmarks/results.jsonl] [--implementation <shin|aws>] [--profile <name>] [--memory-mb <n>] [--state <name>]",
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (require.main === module) {
  main();
}
