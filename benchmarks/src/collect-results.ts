import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseCliOptions } from "./cli";
import {
  type BenchmarkRunRecord,
  type BenchmarkRunRecordSource,
  type BenchmarkSampleRecord,
  type ProviderSummary,
  benchmarkEvidenceErrors,
  benchmarkEvidenceSanitizationErrors,
  benchmarkRunRecordFrom,
  cleanupStatusFrom,
  normalizeImplementation,
  providerSummaryErrors,
  runsFileFor,
  sanitizeProviderSummary,
} from "./model";
import { upsertBenchmarkRun, upsertBenchmarkSample } from "./persistence";

export type CollectBenchmarkOptions = {
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
  readonly awsCdkLibInstalledSha256?: string;
  readonly constructsInstalledSha256?: string;
  readonly executionEnvironmentFresh?: boolean;
  readonly memoryMeasurementScope?: "phase-local";
  readonly decisionRunId?: string;
  readonly fileCount?: number;
  readonly implementation?: string;
  readonly logFile: string;
  readonly memoryMb?: number;
  readonly outputFile: string;
  readonly persist?: boolean;
  readonly parallel?: number | null;
  readonly sourceWindowBytes?: number | null;
  readonly detailedFailureDiagnostics?: boolean | null;
  readonly phase: string;
  readonly region?: string;
  readonly repetition?: number;
  readonly reportFile?: string;
  readonly snapshotDate?: string;
  readonly state?: string;
  readonly sourceCount?: number;
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
  "run-id",
  "sample-id",
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
  "transfer-max-concurrency",
  "lambda-memory-mb",
  "source-window-bytes",
  "log-file",
  "output-file",
  "phase",
  "region",
  "repetition",
  "report-file",
  "snapshot-date",
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

const COLD_START_PHASE = "cold-create";

export function collectBenchmarkResult(options: CollectBenchmarkOptions): {
  readonly sample: BenchmarkSampleRecord;
  readonly run: BenchmarkRunRecord;
} {
  const logText = readFileSync(options.logFile, "utf8");
  const implementation = normalizeImplementation(
    options.implementation ?? outputString(logText, "BenchmarkImplementation"),
  );
  // Only the first phase against a fresh stack is guaranteed to cold-start.
  const report = options.reportFile
    ? readReportFile(options.reportFile, {
        requireInitDuration: options.phase === COLD_START_PHASE,
      })
    : undefined;
  const summaryEvidence = options.summaryFile ? readSummaryFile(options.summaryFile) : undefined;
  if (report === undefined) {
    throw new Error("Canonical collection requires one complete CloudWatch REPORT event.");
  }
  if (implementation === "shin" && summaryEvidence === undefined) {
    throw new Error("Canonical Shin collection requires one provider summary event.");
  }
  if (summaryEvidence !== undefined) {
    assertCorrelatedTelemetry(report, summaryEvidence);
    const summaryErrors = providerSummaryErrors(summaryEvidence.summary);
    if (summaryErrors.length > 0) {
      throw new Error(`Invalid canonical provider summary: ${summaryErrors.join("; ")}`);
    }
  }
  assertObservedOutputs(logText, options, implementation);
  if (report.memorySizeMb !== options.memoryMb) {
    throw new Error(
      `Canonical REPORT memory size ${report.memorySizeMb} does not match planned memory ${options.memoryMb ?? "missing"}.`,
    );
  }
  if (options.cleanup === "all benchmark stacks destroyed" && options.cleanupVerified !== true) {
    throw new Error("Canonical cleanup can only be qualified by the automated runner.");
  }
  const run = benchmarkRunRecordFrom(buildRunRecordSource(options, implementation));
  const sample: BenchmarkSampleRecord = {
    runId: options.runId ?? null,
    sampleId: options.sampleId ?? null,
    implementation: implementation ?? null,
    profile: options.assetProfile ?? outputString(logText, "BenchmarkAssetProfile"),
    memoryMb: options.memoryMb ?? outputNumber(logText, "BenchmarkMemoryLimitMb"),
    assetManifestSha256: options.assetManifestSha256 ?? null,
    phase: options.phase,
    state: options.state ?? outputString(logText, "BenchmarkState"),
    repetition: options.repetition ?? null,
    fileCount: options.fileCount ?? outputNumber(logText, "BenchmarkFileCount"),
    totalBytes: options.totalBytes ?? outputNumber(logText, "BenchmarkTotalBytes"),
    cdkDeploySeconds: parseSeconds(logText, /Deployment time: ([\d.]+)s/),
    localWallSeconds: parseSeconds(logText, /^real ([\d.]+)$/m),
    providerDurationSeconds: report?.durationSeconds ?? null,
    billedDurationSeconds: report?.billedDurationSeconds ?? null,
    initDurationSeconds: report?.initDurationSeconds ?? null,
    maxMemoryMb: report?.maxMemoryMb ?? null,
    providerInvoked: report !== undefined || summaryEvidence !== undefined,
    ...(implementation === "aws"
      ? {}
      : {
          parallel:
            options.parallel === undefined
              ? outputNumber(logText, "BenchmarkTransferMaxConcurrency")
              : options.parallel,
          detailedFailureDiagnostics:
            options.detailedFailureDiagnostics === undefined
              ? outputDetailedFailureDiagnostics(logText)
              : options.detailedFailureDiagnostics,
          sourceWindowBytes:
            options.sourceWindowBytes === undefined
              ? (outputSourceWindowBytes(logText) ?? undefined)
              : (options.sourceWindowBytes ?? undefined),
        }),
    ...(implementation === "aws" ? {} : { providerSummary: summaryEvidence?.summary }),
  };

  const sanitizationErrors = benchmarkEvidenceSanitizationErrors(run, sample, [
    process.env.AWS_PROFILE ?? "",
    process.env.AWS_DEFAULT_PROFILE ?? "",
  ]);
  if (sanitizationErrors.length > 0) {
    throw new Error(`Benchmark record failed sanitization: ${sanitizationErrors.join("; ")}`);
  }
  const evidenceErrors = benchmarkEvidenceErrors(
    { runs: [run], samples: [sample] },
    { allowPendingCleanup: true },
  );
  if (evidenceErrors.length > 0) {
    throw new Error(`Invalid canonical benchmark record: ${evidenceErrors.join("; ")}`);
  }

  if (options.persist !== false) {
    upsertBenchmarkSample(options.outputFile, sample);
    upsertBenchmarkRun(runsFileFor(options.outputFile), run);
  }
  return { sample, run };
}

function buildRunRecordSource(
  options: CollectBenchmarkOptions,
  implementation: string | null,
): BenchmarkRunRecordSource {
  return {
    runId: options.runId ?? null,
    implementation: implementation ?? null,
    snapshotDate: options.snapshotDate ?? today(),
    region: options.region ?? null,
    cleanup: cleanupStatusFrom(options.cleanup),
    benchmarkConfigSha256: options.benchmarkConfigSha256 ?? null,
    memoryMeasurementScope: options.memoryMeasurementScope ?? null,
    nodeVersion: options.nodeVersion ?? null,
    pnpmVersion: options.pnpmVersion ?? null,
    executionEnvironmentSha256: options.executionEnvironmentSha256 ?? null,
    executionEnvironmentFresh: options.executionEnvironmentFresh ?? null,
    dependencyLockSha256: options.dependencyLockSha256 ?? null,
    installedDependenciesSha256: options.installedDependenciesSha256 ?? null,
    applicationBuildSha256: options.applicationBuildSha256 ?? null,
    sourceTreeSha256: options.sourceTreeSha256 ?? null,
    gitDirty: options.gitDirty ?? null,
    cdkCliVersion: options.cdkCliVersion ?? null,
    cdkCliInstalledSha256: options.cdkCliInstalledSha256 ?? null,
    awsCdkLibVersion: options.awsCdkLibVersion ?? null,
    awsCdkLibInstalledSha256: options.awsCdkLibInstalledSha256 ?? null,
    constructsInstalledSha256: options.constructsInstalledSha256 ?? null,
    ...(options.decisionRunId !== undefined ? { decisionRunId: options.decisionRunId } : {}),
    ...(options.comparisonVariant !== undefined
      ? { comparisonVariant: options.comparisonVariant }
      : {}),
    ...(implementation === "shin" || implementation === "aws"
      ? {
          provider: {
            ...(implementation === "shin" ? { implementationCommit: options.commit ?? null } : {}),
            packageVersion: options.providerPackageVersion ?? null,
            architecture: options.providerArchitecture ?? null,
            runtime: options.providerRuntime ?? null,
            handler: options.providerHandler ?? null,
            codeSha256: options.providerCodeSha256 ?? null,
            ...(implementation === "shin"
              ? {
                  bootstrapSha256: options.providerBootstrapSha256 ?? null,
                  bootstrapArchiveSha256: options.providerBootstrapArchiveSha256 ?? null,
                  bootstrapProvenanceSha256: options.providerBootstrapProvenanceSha256 ?? null,
                  buildDirty: options.providerBootstrapBuildDirty ?? null,
                  cargoVersion: options.providerBootstrapCargoVersion ?? null,
                  rustcVersion: options.providerBootstrapRustcVersion ?? null,
                  cargoLambdaVersion: options.providerBootstrapCargoLambdaVersion ?? null,
                  zigVersion: options.providerBootstrapZigVersion ?? null,
                  buildToolchainSha256: options.providerBootstrapBuildToolchainSha256 ?? null,
                  buildEnvironmentSha256: options.providerBootstrapBuildEnvironmentSha256 ?? null,
                }
              : {}),
          },
        }
      : {}),
  };
}

function parseArgs(args: string[]): CollectBenchmarkOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);

  const logFile = required(values, "log-file");
  const outputFile = values.get("output-file") ?? "benchmarks/results.jsonl";
  const phase = required(values, "phase");

  return {
    runId: values.get("run-id"),
    sampleId: values.get("sample-id"),
    assetProfile: values.get("asset-profile"),
    cleanup: values.get("cleanup"),
    comparisonVariant: values.get("comparison-variant"),
    commit: values.get("commit"),
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
    outputFile,
    parallel: optionalNumber(values, "transfer-max-concurrency"),
    sourceWindowBytes: optionalNullablePositiveInteger(values.get("source-window-bytes")),
    phase,
    region: values.get("region"),
    repetition: optionalPositiveInteger(values, "repetition"),
    reportFile: values.get("report-file"),
    snapshotDate: values.get("snapshot-date"),
    state: values.get("asset-state"),
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

function optionalMemoryScope(value: string | undefined): "phase-local" | undefined {
  if (value === undefined) return undefined;
  if (value === "phase-local") return value;
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
    "Usage: node dist/benchmarks/src/collect-results.js --log-file <path> --phase <name> [--snapshot-date <YYYY-MM-DD>] [--decision-run-id <id>] [--comparison-variant <name>] [--repetition <n>] [--report-file <path>] [--summary-file <path>] [--output-file benchmarks/results.jsonl] [--asset-profile <name>] [--asset-state <name>] [--implementation <shin|aws>] [--transfer-max-concurrency <n>] [--lambda-memory-mb <n>]",
  );
  process.exit(1);
}

/**
 * Reads the single canonical CloudWatch REPORT event for one measured phase.
 *
 * `requireInitDuration` is true only for the phase that must be a cold start by
 * construction. Lambda emits `Init Duration` on a cold start and omits it when
 * the invocation reuses a warm container, so requiring it on every phase
 * rejects ordinary runtime behaviour: a canonical run aborted on
 * `pruned-update`, the fourth invocation of the same function, after all of its
 * stacks had deployed and destroyed successfully. Whether a container survives
 * between phases is a service scheduling detail, not evidence quality.
 *
 * The genuine capture failures stay fatal and are caught elsewhere: an event
 * missing duration, billed duration, or memory is discarded above, and the
 * caller requires exactly one surviving event. `requestId` remains mandatory
 * for every phase because a REPORT line always carries one, so its absence
 * means the line was malformed or truncated rather than warm.
 */
function readReportFile(
  path: string,
  { requireInitDuration }: { requireInitDuration: boolean },
): ReportEvidence | undefined {
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
  if (reports.length !== 1) {
    throw new Error(
      `Expected exactly one complete REPORT event in ${path}, found ${reports.length}.`,
    );
  }
  const report = reports.at(-1);
  if (report === undefined) {
    return undefined;
  }
  if (report.requestId === null) {
    throw new Error(`Canonical REPORT event in ${path} is missing its request ID.`);
  }
  if (requireInitDuration && report.initDurationSeconds === null) {
    throw new Error(
      `Canonical REPORT event in ${path} is missing init duration on a cold-start phase.`,
    );
  }
  return report;
}

function readSummaryFile(path: string): SummaryEvidence | undefined {
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
  if (summaries.length !== 1) {
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
  // The event discriminator plus the strict field-shape validation below is the
  // whole contract gate. There is no version marker to strip: `sanitizeProviderSummary`
  // rejects unknown top-level members, so a summary that still carries the removed
  // `schemaVersion` marker (a stale-contract payload) fails closed here instead of
  // being laundered into current evidence.
  sanitizeProviderSummary(value);
  const errors = providerSummaryErrors(value);
  if (errors.length > 0) throw new Error(`Invalid provider summary: ${errors.join("; ")}`);
  return true;
}

function assertCorrelatedTelemetry(report: ReportEvidence, summary: SummaryEvidence): void {
  if (
    report.logStreamName === null ||
    summary.logStreamName === null ||
    report.logStreamName !== summary.logStreamName
  ) {
    throw new Error("Canonical REPORT and provider summary are not from the same log stream.");
  }
  if (
    report.requestId === null ||
    summary.requestId === null ||
    report.requestId !== summary.requestId
  ) {
    throw new Error("Canonical REPORT and provider summary request IDs do not match.");
  }
  if (
    report.timestamp === null ||
    summary.timestamp === null ||
    summary.timestamp > report.timestamp ||
    report.timestamp - summary.timestamp > 60_000
  ) {
    throw new Error("Canonical REPORT and provider summary timestamps are not correlated.");
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
    checks.push(["BenchmarkTransferMaxConcurrency", options.parallel]);
    const expectedSourceWindow = options.sourceWindowBytes ?? "adaptive";
    checks.push(["BenchmarkSourceWindowBytes", expectedSourceWindow]);
    checks.push(["BenchmarkDetailedFailureDiagnostics", "true"]);
  } else {
    checks.push(["BenchmarkDetailedFailureDiagnostics", "not-applicable"]);
  }
  for (const [name, expected] of checks) {
    if (expected === undefined || expected === null) {
      throw new Error(`Canonical collection is missing planned ${name}.`);
    }
    const observed = outputString(logText, name);
    if (observed !== String(expected)) {
      throw new Error(
        `Canonical output ${name}=${observed ?? "missing"} does not match planned ${expected}.`,
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
