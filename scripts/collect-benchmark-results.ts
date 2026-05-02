import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

export type BenchmarkHistoryRecord = {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly runDate: string;
  readonly providerImplementationCommit: string | null;
  readonly providerImplementationSubject: string | null;
  readonly resultDocumentationCommit: string | null;
  readonly region: string | null;
  readonly profile: string | null;
  readonly series: string | null;
  readonly memoryMb: number | null;
  readonly phase: string;
  readonly variant: string | null;
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
  readonly cleanup?: string;
  readonly notes?: string;
};

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  collectBenchmarkResult(options);
  console.log(`appended ${options.phase} from ${basename(options.logFile)} to ${options.outputFile}`);
}

export function collectBenchmarkResult(options: CollectBenchmarkOptions): BenchmarkHistoryRecord {
  const logText = readFileSync(options.logFile, "utf8");
  const report = options.reportFile ? readReportFile(options.reportFile) : undefined;
  const providerSummary = options.summaryFile ? readSummaryFile(options.summaryFile) : undefined;
  const record: BenchmarkHistoryRecord = {
    schemaVersion: 1,
    runId: options.runId,
    runDate: options.runDate,
    providerImplementationCommit: options.commit ?? null,
    providerImplementationSubject: options.subject ?? null,
    resultDocumentationCommit: options.resultCommit ?? null,
    region: options.region ?? null,
    profile: outputString(logText, "BenchmarkProfile"),
    series: options.series ?? null,
    memoryMb: outputNumber(logText, "BenchmarkMemoryLimitMb"),
    phase: options.phase,
    variant: outputString(logText, "BenchmarkVariant"),
    fileCount: outputNumber(logText, "BenchmarkFileCount"),
    totalBytes: outputNumber(logText, "BenchmarkTotalBytes"),
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
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      usage();
    }
    values.set(key.slice(2), value);
  }

  const logFile = required(values, "log-file");
  const outputFile = values.get("output-file") ?? "docs/benchmark-history.jsonl";
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

function usage(): never {
  console.error(
    "Usage: node dist/scripts/collect-benchmark-results.js --log-file <path> --run-id <id> --run-date <YYYY-MM-DD> --phase <name> [--report-file <path>] [--summary-file <path>]",
  );
  process.exit(1);
}

function readReportFile(path: string): {
  durationSeconds: number;
  billedDurationSeconds: number;
  initDurationSeconds: number | null;
  maxMemoryMb: number;
} | undefined {
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
  const lines = readFileSync(path, "utf8").trim().split(/\n/).filter(Boolean);
  const parsed = lines.map((line) => JSON.parse(line) as unknown);
  return parsed.at(-1);
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
  return logText.includes("(no changes)") ? "CDK reported no changes; provider was not invoked." : null;
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
