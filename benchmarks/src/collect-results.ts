import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseCliOptions } from "./cli";
import {
  type BenchmarkResultRecord,
  type ProviderSummary,
  benchmarkEvidenceSanitizationErrors,
  methodologyV2RecordErrors,
  normalizeImplementation,
  providerSummaryErrors,
  sanitizeProviderSummary,
} from "./model";
import { upsertBenchmarkRecord } from "./persistence";

export type CollectBenchmarkOptions = {
  readonly resultSchemaVersion?: number;
  readonly methodologyVersion?: number;
  readonly runId?: string;
  readonly sampleId?: string;
  readonly assetProfile?: string;
  readonly cleanup?: string;
  readonly comparisonVariant?: string;
  readonly commit?: string;
  readonly benchmarkConfigSha256?: string;
  readonly assetManifestSha256?: string;
  readonly dependencyLockSha256?: string;
  readonly applicationBuildSha256?: string;
  readonly installedDependenciesSha256?: string;
  readonly nodeVersion?: string;
  readonly pnpmVersion?: string;
  readonly executionEnvironmentSha256?: string;
  readonly sourceTreeSha256?: string;
  readonly providerPackageName?: string;
  readonly providerPackageVersion?: string;
  readonly providerArchitecture?: string;
  readonly providerRuntime?: string;
  readonly providerHandler?: string;
  readonly providerCodeSha256?: string;
  readonly providerBootstrapSha256?: string;
  readonly providerBootstrapArchiveSha256?: string;
  readonly providerBootstrapProvenanceSha256?: string;
  readonly providerBootstrapBuildDirty?: boolean;
  readonly providerBootstrapCargoVersion?: string;
  readonly providerBootstrapRustcVersion?: string;
  readonly providerBootstrapCargoLambdaVersion?: string;
  readonly providerBootstrapZigVersion?: string;
  readonly providerBootstrapBuildToolchainSha256?: string;
  readonly providerBootstrapBuildEnvironmentSha256?: string;
  readonly gitDirty?: boolean;
  readonly cdkCliVersion?: string;
  readonly cdkCliInstalledSha256?: string;
  readonly awsCdkLibVersion?: string;
  readonly awsCdkLibIntegrity?: string;
  readonly awsCdkLibInstalledSha256?: string;
  readonly constructsInstalledSha256?: string;
  readonly executionEnvironmentFresh?: boolean;
  readonly memoryMeasurementScope?: "phase-local" | "cumulative";
  readonly decisionRunId?: string;
  readonly fileCount?: number;
  readonly implementation?: string;
  readonly logFile: string;
  readonly memoryMb?: number;
  readonly notes?: string;
  readonly outputFile: string;
  readonly persist?: boolean;
  readonly parallel?: number | null;
  readonly sourceWindowBytes?: number | null;
  readonly detailedFailureDiagnostics?: boolean | null;
  readonly phase: string;
  readonly region?: string;
  readonly repetition?: number;
  readonly reportFile?: string;
  readonly resultCommit?: string;
  readonly snapshotDate?: string;
  readonly state?: string;
  readonly sourceCount?: number;
  readonly subject?: string;
  readonly summaryFile?: string;
  readonly totalBytes?: number;
  readonly cleanupVerified?: boolean;
};

type CloudWatchLogEvent = {
  readonly message?: string;
  readonly timestamp?: number;
  readonly logStreamName?: string;
};

type ReportEvidence = {
  readonly durationSeconds: number;
  readonly billedDurationSeconds: number;
  readonly initDurationSeconds: number | null;
  readonly maxMemoryMb: number;
  readonly memorySizeMb: number;
  readonly requestId: string | null;
  readonly timestamp: number | null;
  readonly logStreamName: string | null;
};

type SummaryEvidence = {
  readonly summary: ProviderSummary;
  readonly timestamp: number | null;
  readonly logStreamName: string | null;
  readonly requestId: string | null;
};

const CLI_OPTIONS = [
  "asset-profile",
  "asset-state",
  "cleanup",
  "comparison-variant",
  "commit",
  "result-schema-version",
  "methodology-version",
  "run-id",
  "sample-id",
  "provider-package-name",
  "provider-package-version",
  "provider-architecture",
  "provider-runtime",
  "provider-handler",
  "provider-code-sha256",
  "provider-bootstrap-sha256",
  "provider-bootstrap-archive-sha256",
  "git-dirty",
  "cdk-cli-version",
  "cdk-cli-installed-sha256",
  "aws-cdk-lib-version",
  "aws-cdk-lib-integrity",
  "aws-cdk-lib-installed-sha256",
  "constructs-installed-sha256",
  "benchmark-config-sha256",
  "asset-manifest-sha256",
  "dependency-lock-sha256",
  "application-build-sha256",
  "execution-environment-fresh",
  "memory-measurement-scope",
  "decision-run-id",
  "file-count",
  "implementation",
  "lambda-max-parallel-transfers",
  "lambda-memory-mb",
  "source-window-bytes",
  "log-file",
  "notes",
  "output-file",
  "phase",
  "region",
  "repetition",
  "report-file",
  "result-commit",
  "snapshot-date",
  "subject",
  "summary-file",
  "source-count",
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
  const strictEvidence = options.methodologyVersion === 2;
  const implementation = normalizeImplementation(
    options.implementation ?? outputString(logText, "BenchmarkImplementation"),
  );
  const report = options.reportFile
    ? readReportFile(options.reportFile, strictEvidence)
    : undefined;
  const summaryEvidence = options.summaryFile
    ? readSummaryFile(options.summaryFile, strictEvidence)
    : undefined;
  if (strictEvidence && report === undefined) {
    throw new Error("Methodology-v2 collection requires one complete CloudWatch REPORT event.");
  }
  if (strictEvidence && implementation === "shin" && summaryEvidence === undefined) {
    throw new Error("Methodology-v2 Shin collection requires one provider summary event.");
  }
  if (strictEvidence && summaryEvidence !== undefined && report !== undefined) {
    assertCorrelatedTelemetry(report, summaryEvidence);
  }
  if (strictEvidence && summaryEvidence !== undefined) {
    const summaryErrors = providerSummaryErrors(summaryEvidence.summary);
    if (summaryErrors.length > 0) {
      throw new Error(`Invalid methodology-v2 provider summary: ${summaryErrors.join("; ")}`);
    }
  }
  if (strictEvidence) {
    assertObservedOutputs(logText, options, implementation);
    if (report?.memorySizeMb !== options.memoryMb) {
      throw new Error(
        `Methodology-v2 REPORT memory size ${report?.memorySizeMb ?? "missing"} does not match planned memory ${options.memoryMb ?? "missing"}.`,
      );
    }
  }
  if (
    strictEvidence &&
    options.cleanup === "all benchmark stacks destroyed" &&
    options.cleanupVerified !== true
  ) {
    throw new Error("Methodology-v2 cleanup can only be qualified by the automated runner.");
  }
  const record: BenchmarkResultRecord = {
    resultSchemaVersion: options.resultSchemaVersion ?? null,
    methodologyVersion: options.methodologyVersion ?? null,
    runId: options.runId ?? null,
    sampleId: options.sampleId ?? null,
    snapshotDate: options.snapshotDate ?? today(),
    decisionRunId: options.decisionRunId ?? null,
    comparisonVariant: options.comparisonVariant ?? null,
    repetition: options.repetition ?? null,
    benchmarkConfigSha256: options.benchmarkConfigSha256 ?? null,
    assetManifestSha256: options.assetManifestSha256 ?? null,
    dependencyLockSha256: options.dependencyLockSha256 ?? null,
    applicationBuildSha256: options.applicationBuildSha256 ?? null,
    installedDependenciesSha256: options.installedDependenciesSha256 ?? null,
    nodeVersion: options.nodeVersion ?? null,
    pnpmVersion: options.pnpmVersion ?? null,
    executionEnvironmentSha256: options.executionEnvironmentSha256 ?? null,
    sourceTreeSha256: options.sourceTreeSha256 ?? null,
    providerImplementationCommit: options.commit ?? null,
    providerImplementationSubject: options.subject ?? null,
    providerPackageName: options.providerPackageName ?? null,
    providerPackageVersion: options.providerPackageVersion ?? null,
    providerArchitecture: options.providerArchitecture ?? null,
    providerRuntime: options.providerRuntime ?? null,
    providerHandler: options.providerHandler ?? null,
    providerCodeSha256: options.providerCodeSha256 ?? null,
    providerBootstrapSha256: options.providerBootstrapSha256 ?? null,
    providerBootstrapArchiveSha256: options.providerBootstrapArchiveSha256 ?? null,
    providerBootstrapProvenanceSha256: options.providerBootstrapProvenanceSha256 ?? null,
    providerBootstrapBuildDirty: options.providerBootstrapBuildDirty ?? null,
    providerBootstrapCargoVersion: options.providerBootstrapCargoVersion ?? null,
    providerBootstrapRustcVersion: options.providerBootstrapRustcVersion ?? null,
    providerBootstrapCargoLambdaVersion: options.providerBootstrapCargoLambdaVersion ?? null,
    providerBootstrapZigVersion: options.providerBootstrapZigVersion ?? null,
    providerBootstrapBuildToolchainSha256: options.providerBootstrapBuildToolchainSha256 ?? null,
    providerBootstrapBuildEnvironmentSha256:
      options.providerBootstrapBuildEnvironmentSha256 ?? null,
    gitDirty: options.gitDirty ?? null,
    cdkCliVersion: options.cdkCliVersion ?? null,
    cdkCliInstalledSha256: options.cdkCliInstalledSha256 ?? null,
    awsCdkLibVersion: options.awsCdkLibVersion ?? null,
    awsCdkLibIntegrity: options.awsCdkLibIntegrity ?? null,
    awsCdkLibInstalledSha256: options.awsCdkLibInstalledSha256 ?? null,
    constructsInstalledSha256: options.constructsInstalledSha256 ?? null,
    executionEnvironmentFresh: options.executionEnvironmentFresh ?? null,
    memoryMeasurementScope: options.memoryMeasurementScope ?? null,
    resultDocumentationCommit: options.resultCommit ?? null,
    region: options.region ?? null,
    implementation,
    profile: options.assetProfile ?? outputString(logText, "BenchmarkAssetProfile"),
    memoryMb: options.memoryMb ?? outputNumber(logText, "BenchmarkMemoryLimitMb"),
    parallel:
      strictEvidence && implementation === "aws"
        ? null
        : options.parallel === undefined
          ? outputNumber(logText, "BenchmarkMaxParallelTransfers")
          : options.parallel,
    sourceWindowBytes:
      options.sourceWindowBytes === undefined
        ? outputSourceWindowBytes(logText)
        : options.sourceWindowBytes,
    detailedFailureDiagnostics:
      options.detailedFailureDiagnostics === undefined
        ? outputDetailedFailureDiagnostics(logText)
        : options.detailedFailureDiagnostics,
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
    providerInvoked: report !== undefined || summaryEvidence !== undefined,
    cleanup: options.cleanup ?? null,
    notes: options.notes ?? noChangeNote(logText),
    providerSummary: summaryEvidence?.summary ?? null,
  };

  const sanitizationErrors = benchmarkEvidenceSanitizationErrors(record, [
    process.env.AWS_PROFILE ?? "",
    process.env.AWS_DEFAULT_PROFILE ?? "",
  ]);
  if (sanitizationErrors.length > 0) {
    throw new Error(`Benchmark record failed sanitization: ${sanitizationErrors.join("; ")}`);
  }
  if (strictEvidence) {
    const recordErrors = methodologyV2RecordErrors(record, { allowPendingCleanup: true });
    if (recordErrors.length > 0) {
      throw new Error(`Invalid methodology-v2 benchmark record: ${recordErrors.join("; ")}`);
    }
  }

  if (options.persist !== false) {
    upsertBenchmarkRecord(options.outputFile, record);
  }
  return record;
}

function parseArgs(args: string[]): CollectBenchmarkOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);

  const logFile = required(values, "log-file");
  const outputFile = values.get("output-file") ?? "benchmarks/results.jsonl";
  const phase = required(values, "phase");

  return {
    resultSchemaVersion: optionalPositiveInteger(values, "result-schema-version"),
    methodologyVersion: optionalPositiveInteger(values, "methodology-version"),
    runId: values.get("run-id"),
    sampleId: values.get("sample-id"),
    assetProfile: values.get("asset-profile"),
    cleanup: values.get("cleanup"),
    comparisonVariant: values.get("comparison-variant"),
    commit: values.get("commit"),
    providerPackageName: values.get("provider-package-name"),
    providerPackageVersion: values.get("provider-package-version"),
    providerArchitecture: values.get("provider-architecture"),
    providerRuntime: values.get("provider-runtime"),
    providerHandler: values.get("provider-handler"),
    providerCodeSha256: values.get("provider-code-sha256"),
    providerBootstrapSha256: values.get("provider-bootstrap-sha256"),
    providerBootstrapArchiveSha256: values.get("provider-bootstrap-archive-sha256"),
    gitDirty: optionalBoolean(values, "git-dirty"),
    cdkCliVersion: values.get("cdk-cli-version"),
    cdkCliInstalledSha256: values.get("cdk-cli-installed-sha256"),
    awsCdkLibVersion: values.get("aws-cdk-lib-version"),
    awsCdkLibIntegrity: values.get("aws-cdk-lib-integrity"),
    awsCdkLibInstalledSha256: values.get("aws-cdk-lib-installed-sha256"),
    constructsInstalledSha256: values.get("constructs-installed-sha256"),
    benchmarkConfigSha256: values.get("benchmark-config-sha256"),
    assetManifestSha256: values.get("asset-manifest-sha256"),
    dependencyLockSha256: values.get("dependency-lock-sha256"),
    applicationBuildSha256: values.get("application-build-sha256"),
    executionEnvironmentFresh: optionalBoolean(values, "execution-environment-fresh"),
    memoryMeasurementScope: optionalMemoryScope(values.get("memory-measurement-scope")),
    decisionRunId: values.get("decision-run-id"),
    fileCount: optionalNumber(values, "file-count"),
    implementation: values.get("implementation"),
    logFile,
    memoryMb: optionalNumber(values, "lambda-memory-mb"),
    notes: values.get("notes"),
    outputFile,
    parallel: optionalNumber(values, "lambda-max-parallel-transfers"),
    sourceWindowBytes: optionalNullablePositiveInteger(values.get("source-window-bytes")),
    phase,
    region: values.get("region"),
    repetition: optionalPositiveInteger(values, "repetition"),
    reportFile: values.get("report-file"),
    resultCommit: values.get("result-commit"),
    snapshotDate: values.get("snapshot-date"),
    state: values.get("asset-state"),
    subject: values.get("subject"),
    summaryFile: values.get("summary-file"),
    sourceCount: optionalNumber(values, "source-count"),
    totalBytes: optionalNumber(values, "total-bytes"),
  };
}

function optionalBoolean(values: ReadonlyMap<string, string>, name: string): boolean | undefined {
  const value = values.get(name);
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  usage();
}

function optionalMemoryScope(value: string | undefined): "phase-local" | "cumulative" | undefined {
  if (value === undefined) return undefined;
  if (value === "phase-local" || value === "cumulative") return value;
  usage();
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

function optionalPositiveInteger(values: Map<string, string>, name: string): number | undefined {
  const value = optionalNumber(values, name);
  if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
    usage();
  }
  return value;
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/collect-results.js --log-file <path> --phase <name> [--snapshot-date <YYYY-MM-DD>] [--decision-run-id <id>] [--comparison-variant <name>] [--repetition <n>] [--report-file <path>] [--summary-file <path>] [--output-file benchmarks/results.jsonl] [--asset-profile <name>] [--asset-state <name>] [--implementation <shin|aws>] [--lambda-max-parallel-transfers <n>] [--lambda-memory-mb <n>]",
  );
  process.exit(1);
}

function readReportFile(path: string, strict: boolean): ReportEvidence | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const text = readFileSync(path, "utf8");
  const json = JSON.parse(text) as { events?: CloudWatchLogEvent[] };
  const reports = [...(json.events ?? [])]
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
    .flatMap((event) => {
      if (!event.message) return [];
      const durationMs = parseReportNumber(event.message, /Duration: ([\d.]+) ms/);
      const billedMs = parseReportNumber(event.message, /Billed Duration: ([\d.]+) ms/);
      const maxMemoryMb = parseReportNumber(event.message, /Max Memory Used: ([\d.]+) MB/);
      const memorySizeMb = parseReportNumber(event.message, /Memory Size: ([\d.]+) MB/);
      if (durationMs === null || billedMs === null || maxMemoryMb === null || memorySizeMb === null)
        return [];
      const initMs = parseReportNumber(event.message, /Init Duration: ([\d.]+) ms/);
      return [
        {
          durationSeconds: roundSeconds(durationMs / 1000),
          billedDurationSeconds: roundSeconds(billedMs / 1000),
          initDurationSeconds: initMs === null ? null : roundSeconds(initMs / 1000),
          maxMemoryMb,
          memorySizeMb,
          requestId: event.message.match(/REPORT RequestId:\s*([^\s]+)/)?.[1] ?? null,
          timestamp: event.timestamp ?? null,
          logStreamName: event.logStreamName ?? null,
        },
      ];
    });
  if (strict && reports.length !== 1) {
    throw new Error(
      `Expected exactly one complete REPORT event in ${path}, found ${reports.length}.`,
    );
  }
  const report = reports.at(-1);
  if (report === undefined) {
    return undefined;
  }
  if (strict && (report.initDurationSeconds === null || report.requestId === null)) {
    throw new Error(
      `Methodology-v2 REPORT event in ${path} is missing init duration or request ID.`,
    );
  }
  return report;
}

function readSummaryFile(path: string, strict: boolean): SummaryEvidence | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const text = readFileSync(path, "utf8").trim();
  if (!text) {
    return undefined;
  }
  const summaries = readCloudWatchSummaryJson(text) ?? readSummaryJsonLines(text);
  if (summaries.length === 0) {
    throw new Error(`No shin_deployment_summary record found in ${path}.`);
  }
  if (strict && summaries.length !== 1) {
    throw new Error(
      `Expected exactly one shin_deployment_summary event in ${path}, found ${summaries.length}.`,
    );
  }
  return summaries.at(-1);
}

function readCloudWatchSummaryJson(text: string): SummaryEvidence[] | undefined {
  const parsed = tryParseJson(text);
  if (!isRecord(parsed) || !Array.isArray(parsed.events)) {
    return undefined;
  }

  return parsed.events
    .filter(isRecord)
    .sort((left, right) => optionalTimestamp(left) - optionalTimestamp(right))
    .map((event) => {
      const summary =
        typeof event.message === "string" ? summaryFromMessage(event.message) : undefined;
      return summary === undefined
        ? undefined
        : {
            summary,
            timestamp: typeof event.timestamp === "number" ? event.timestamp : null,
            logStreamName: typeof event.logStreamName === "string" ? event.logStreamName : null,
            requestId: requestIdFromMessage(event.message as string),
          };
    })
    .filter((summary) => summary !== undefined);
}

function readSummaryJsonLines(text: string): SummaryEvidence[] {
  return text
    .split(/\n/)
    .filter(Boolean)
    .map((line) => summaryFromJsonLine(line))
    .filter((summary) => summary !== undefined)
    .map((summary) => ({ summary, timestamp: null, logStreamName: null, requestId: null }));
}

function summaryFromJsonLine(line: string): ProviderSummary | undefined {
  const parsed = JSON.parse(line) as unknown;
  if (isDeploymentSummary(parsed)) {
    return parsed;
  }
  if (isRecord(parsed) && typeof parsed.message === "string") {
    return summaryFromMessage(parsed.message);
  }
  return undefined;
}

function summaryFromMessage(message: string): ProviderSummary | undefined {
  const cleanMessage = stripAnsi(message);
  const match = cleanMessage.match(/\bsummary=(?:"((?:\\.|[^"\\])*)"|(\{.*\}))/);
  if (!match) {
    return undefined;
  }

  const summaryText = match[1] ? JSON.parse(`"${match[1]}"`) : match[2];
  const summary = tryParseJson(summaryText);
  return isDeploymentSummary(summary) ? summary : undefined;
}

function isDeploymentSummary(value: unknown): value is ProviderSummary {
  if (!isRecord(value) || value.event !== "shin_deployment_summary") return false;
  sanitizeProviderSummary(value);
  if (value.schemaVersion === 4) {
    const errors = providerSummaryErrors(value);
    if (errors.length > 0)
      throw new Error(`Invalid schema-v4 provider summary: ${errors.join("; ")}`);
  }
  return true;
}

function assertCorrelatedTelemetry(report: ReportEvidence, summary: SummaryEvidence): void {
  if (
    report.logStreamName === null ||
    summary.logStreamName === null ||
    report.logStreamName !== summary.logStreamName
  ) {
    throw new Error("Methodology-v2 REPORT and provider summary are not from the same log stream.");
  }
  if (
    report.requestId === null ||
    summary.requestId === null ||
    report.requestId !== summary.requestId
  ) {
    throw new Error("Methodology-v2 REPORT and provider summary request IDs do not match.");
  }
  if (
    report.timestamp === null ||
    summary.timestamp === null ||
    summary.timestamp > report.timestamp ||
    report.timestamp - summary.timestamp > 60_000
  ) {
    throw new Error("Methodology-v2 REPORT and provider summary timestamps are not correlated.");
  }
}

function requestIdFromMessage(message: string): string | null {
  return stripAnsi(message).match(/\brequestId="([^"]+)"/)?.[1] ?? null;
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

function assertObservedOutputs(
  logText: string,
  options: CollectBenchmarkOptions,
  implementation: string | null,
): void {
  const checks: Array<[string, string | number | null | undefined]> = [
    ["BenchmarkImplementation", implementation],
    ["BenchmarkAssetProfile", options.assetProfile],
    ["BenchmarkMemoryLimitMb", options.memoryMb],
    ["BenchmarkState", options.state],
    ["BenchmarkFileCount", options.fileCount],
    ["BenchmarkTotalBytes", options.totalBytes],
    ["BenchmarkAssetManifestSha256", options.assetManifestSha256],
    ["BenchmarkSourceCount", options.sourceCount],
  ];
  if (implementation === "shin") {
    checks.push(["BenchmarkMaxParallelTransfers", options.parallel]);
    const expectedSourceWindow = options.sourceWindowBytes ?? "adaptive";
    checks.push(["BenchmarkSourceWindowBytes", expectedSourceWindow]);
    checks.push(["BenchmarkDetailedFailureDiagnostics", "true"]);
  } else {
    checks.push(["BenchmarkDetailedFailureDiagnostics", "not-applicable"]);
  }
  for (const [name, expected] of checks) {
    if (expected === undefined || expected === null) {
      throw new Error(`Methodology-v2 collection is missing planned ${name}.`);
    }
    const observed = outputString(logText, name);
    if (observed !== String(expected)) {
      throw new Error(
        `Methodology-v2 output ${name}=${observed ?? "missing"} does not match planned ${expected}.`,
      );
    }
  }
}

function outputNumber(logText: string, outputName: string): number | null {
  const value = outputString(logText, outputName);
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function outputSourceWindowBytes(logText: string): number | null {
  const value = outputString(logText, "BenchmarkSourceWindowBytes");
  if (value === null || value === "adaptive") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function outputDetailedFailureDiagnostics(logText: string): boolean | null {
  const value = outputString(logText, "BenchmarkDetailedFailureDiagnostics");
  if (value === "true") return true;
  if (value === "not-applicable") return null;
  return null;
}

function optionalNullablePositiveInteger(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === "adaptive" || value === "null") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) usage();
  return parsed;
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
