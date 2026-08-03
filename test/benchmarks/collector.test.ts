import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { collectBenchmarkResult } from "../../benchmarks/src/collect-results";
import { parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import { providerSummaryErrors, sanitizeProviderSummary } from "../../benchmarks/src/model";
import { createBenchmarkPlan } from "../../benchmarks/src/plan";
import { renderBenchmarkReport } from "../../benchmarks/src/render/comparison-report";
import { renderBenchmarkResultsTable } from "../../benchmarks/src/render/telemetry-table";
import { CANONICAL_BENCHMARK_CONFIG } from "../../benchmarks/src/validation";
import { canonicalRecord } from "../support/benchmark-records";

describe("benchmark result collector", () => {
  test("upserts sanitized benchmark result records", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const reportFile = join(dir, "report.json");
    const outputFile = join(dir, "results.jsonl");

    writeFileSync(
      logFile,
      [
        "✨  Deployment time: 14.16s",
        "Outputs:",
        "Stack.BenchmarkFileCount = 442",
        "Stack.BenchmarkAssetProfile = mixed",
        "Stack.BenchmarkImplementation = shin",
        "Stack.BenchmarkMemoryLimitMb = 512",
        "Stack.BenchmarkTransferMaxConcurrency = 32",
        "Stack.BenchmarkState = baseline",
        "Stack.BenchmarkTotalBytes = 52904649",
        "real 57.72",
        "",
      ].join("\n"),
    );
    writeFileSync(
      reportFile,
      JSON.stringify({
        events: [
          {
            timestamp: 1,
            message:
              "REPORT RequestId: id\tDuration: 211.83 ms\tBilled Duration: 212 ms\tMemory Size: 512 MB\tMax Memory Used: 68 MB\t",
          },
        ],
      }),
    );

    const collected = collectBenchmarkResult({
      logFile,
      reportFile,
      outputFile,
      snapshotDate: "2026-05-02",
      phase: "unchanged-update",
      commit: "abc1234",
      region: "ap-southeast-2",
      parallel: null,
    });

    const record = JSON.parse(readFileSync(outputFile, "utf8"));
    expect(collected).toEqual(record);
    expect(record).toMatchObject({
      snapshotDate: "2026-05-02",
      providerImplementationCommit: "abc1234",
      region: "ap-southeast-2",
      implementation: "shin",
      profile: "mixed",
      memoryMb: 512,
      parallel: null,
      phase: "unchanged-update",
      state: "baseline",
      fileCount: 442,
      totalBytes: 52904649,
      cdkDeploySeconds: 14.16,
      localWallSeconds: 57.72,
      providerDurationSeconds: 0.212,
      billedDurationSeconds: 0.212,
      initDurationSeconds: null,
      maxMemoryMb: 68,
      providerInvoked: true,
    });
  });

  test("preserves decision-run variants and repetitions in the JSONL key", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const outputFile = join(dir, "results.jsonl");
    writeFileSync(
      logFile,
      [
        "Stack.BenchmarkAssetProfile = tiny-many",
        "Stack.BenchmarkImplementation = shin",
        "Stack.BenchmarkMemoryLimitMb = 2048",
        "Stack.BenchmarkTransferMaxConcurrency = 32",
        "Stack.BenchmarkState = baseline",
        "",
      ].join("\n"),
    );

    for (const repetition of [1, 2]) {
      collectBenchmarkResult({
        logFile,
        outputFile,
        phase: "cold-create",
        decisionRunId: "transfer-scheduler-2026-07-13",
        comparisonVariant: "current",
        repetition,
      });
    }

    const rows = readFileSync(outputFile, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.repetition)).toEqual([1, 2]);
  });

  test("uses explicit metadata when command logs omit outputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "destroy.log");
    const outputFile = join(dir, "results.jsonl");

    writeFileSync(logFile, ["destroying...", "real 37.91", ""].join("\n"));

    const collected = collectBenchmarkResult({
      logFile,
      outputFile,
      snapshotDate: "2026-05-02",
      phase: "destroy",
      assetProfile: "large-few",
      memoryMb: 2048,
      parallel: 8,
      fileCount: 32,
      totalBytes: 144167470,
    });

    expect(collected).toMatchObject({
      profile: "large-few",
      memoryMb: 2048,
      parallel: 8,
      phase: "destroy",
      state: null,
      fileCount: 32,
      totalBytes: 144167470,
      localWallSeconds: 37.91,
    });
  });

  test("persists source and provider build provenance metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const outputFile = join(dir, "results.jsonl");
    writeFileSync(logFile, "Stack.BenchmarkImplementation = shin\n");

    const collected = collectBenchmarkResult({
      logFile,
      outputFile,
      phase: "cold-create",
      sourceTreeSha256: "1".repeat(64),
      installedDependenciesSha256: "5".repeat(64),
      nodeVersion: "v24.0.0",
      pnpmVersion: "11.0.0",
      executionEnvironmentSha256: "6".repeat(64),
      providerBootstrapProvenanceSha256: "2".repeat(64),
      providerBootstrapBuildDirty: false,
      providerBootstrapCargoVersion: "cargo 1.0.0",
      providerBootstrapRustcVersion: "rustc 1.0.0",
      providerBootstrapCargoLambdaVersion: "cargo-lambda 1.0.0",
      providerBootstrapZigVersion: "1.0.0",
      providerBootstrapBuildToolchainSha256: "4".repeat(64),
      providerBootstrapBuildEnvironmentSha256: "3".repeat(64),
    });

    expect(JSON.parse(readFileSync(outputFile, "utf8"))).toEqual(collected);
    expect(collected).toMatchObject({
      sourceTreeSha256: "1".repeat(64),
      installedDependenciesSha256: "5".repeat(64),
      nodeVersion: "v24.0.0",
      pnpmVersion: "11.0.0",
      executionEnvironmentSha256: "6".repeat(64),
      providerBootstrapProvenanceSha256: "2".repeat(64),
      providerBootstrapBuildDirty: false,
      providerBootstrapCargoVersion: "cargo 1.0.0",
      providerBootstrapRustcVersion: "rustc 1.0.0",
      providerBootstrapCargoLambdaVersion: "cargo-lambda 1.0.0",
      providerBootstrapZigVersion: "1.0.0",
      providerBootstrapBuildToolchainSha256: "4".repeat(64),
      providerBootstrapBuildEnvironmentSha256: "3".repeat(64),
    });
  });

  test("extracts sanitized provider summary from raw CloudWatch log events", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const reportFile = join(dir, "report.json");
    const summaryFile = join(dir, "summary.json");
    const outputFile = join(dir, "results.jsonl");
    const summary = {
      event: "shin_deployment_summary",
      schemaVersion: 3,
      requestType: "Create",
      deploymentStatus: "success",
      destinationChecksumStrategy: "sse-s3-etag",
      maxParallelTransfers: 32,
      durationMs: 3632,
      counts: { uploadedObjects: 2585 },
    };

    writeFileSync(
      logFile,
      [
        "✨  Deployment time: 66.68s",
        "Outputs:",
        "Stack.BenchmarkFileCount = 2584",
        "Stack.BenchmarkAssetProfile = tiny-many",
        "Stack.BenchmarkImplementation = shin",
        "Stack.BenchmarkMemoryLimitMb = 1024",
        "Stack.BenchmarkState = baseline",
        "Stack.BenchmarkTotalBytes = 8178618",
        "real 128.05",
        "",
      ].join("\n"),
    );
    writeFileSync(
      reportFile,
      JSON.stringify({
        events: [
          {
            timestamp: 1,
            message:
              "REPORT RequestId: id\tDuration: 3694.94 ms\tBilled Duration: 3830 ms\tMemory Size: 1024 MB\tMax Memory Used: 96 MB\tInit Duration: 134.50 ms",
          },
        ],
      }),
    );
    writeFileSync(
      summaryFile,
      JSON.stringify({
        events: [
          {
            timestamp: 1,
            message: `\u001b[0m{requestId="redacted"}: summary=${JSON.stringify(JSON.stringify(summary))}`,
          },
        ],
      }),
    );

    const collected = collectBenchmarkResult({
      logFile,
      reportFile,
      summaryFile,
      outputFile,
      snapshotDate: "2026-05-10",
      phase: "cold-create-parallel-32",
      parallel: 32,
      region: "ap-southeast-2",
    });

    expect(collected.providerSummary).toEqual(summary);
    expect(collected).toMatchObject({
      providerDurationSeconds: 3.695,
      billedDurationSeconds: 3.83,
      initDurationSeconds: 0.135,
      maxMemoryMb: 96,
      providerInvoked: true,
    });
  });

  test("round-trips strict current-schema PutObject failure diagnostics", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-v4-"));
    const logFile = join(dir, "deploy.log");
    const summaryFile = join(dir, "summary.json");
    const outputFile = join(dir, "results.jsonl");
    const summary = summaryFixture();
    writeFileSync(
      logFile,
      [
        "Stack.BenchmarkImplementation = shin",
        "Stack.BenchmarkSourceWindowBytes = 134217728",
        "",
      ].join("\n"),
    );
    writeFileSync(
      summaryFile,
      JSON.stringify({
        events: [
          {
            timestamp: 1,
            message: `summary=${JSON.stringify(JSON.stringify(summary))}`,
          },
        ],
      }),
    );

    const collected = collectBenchmarkResult({
      logFile,
      summaryFile,
      outputFile,
      phase: "cold-create",
    });

    expect(collected.providerSummary).toEqual(summary);
    expect(collected.sourceWindowBytes).toBe(134217728);
    expect(sanitizeProviderSummary(summary)).toEqual(summary);
    expect(providerSummaryErrors(summary)).toEqual([]);
  });

  test("accepts a strict current-schema summary carrying copy diagnostics", () => {
    const summary = summaryFixture();

    expect(summary.copyObject.retryAttempts).toBe(4);
    expect(sanitizeProviderSummary(summary)).toEqual(summary);
    expect(providerSummaryErrors(summary)).toEqual([]);
  });

  test("requires an exact current-schema copyObject section", () => {
    const missing = summaryFixture();
    delete (missing.copyObject as Partial<typeof missing.copyObject>).retryAttempts;
    expect(providerSummaryErrors(missing).join("; ")).toContain(
      "summary is missing copyObject.retryAttempts",
    );

    const unexpected = summaryFixture();
    (unexpected.copyObject as Record<string, unknown>).failuresByServiceCode = {};
    expect(providerSummaryErrors(unexpected).join("; ")).toContain("unexpected field");

    const nulled = summaryFixture();
    (nulled.copyObject as Record<string, unknown>).wireAttempts = null;
    expect(providerSummaryErrors(nulled).join("; ")).toContain(
      "copyObject.wireAttempts must not be null",
    );

    const fractional = summaryFixture();
    (fractional.copyObject as Record<string, unknown>).wireAttempts = 1.5;
    expect(providerSummaryErrors(fractional).join("; ")).toContain(
      "copyObject.wireAttempts must be a safe integer",
    );

    // Above 2^53 the value has already lost precision in JSON, so it must be
    // rejected rather than silently recorded as evidence.
    const unsafe = summaryFixture();
    (unsafe.copyObject as Record<string, unknown>).wireAttempts = Number.MAX_SAFE_INTEGER + 2;
    expect(providerSummaryErrors(unsafe).join("; ")).toContain(
      "copyObject.wireAttempts must be a safe integer",
    );

    const absent = summaryFixture();
    delete (absent as Partial<typeof absent>).copyObject;
    expect(providerSummaryErrors(absent).join("; ")).toContain("copyObject must be an object");
  });

  test("rejects internally impossible current-schema copy telemetry", () => {
    const moreFailedThanWire = summaryFixture();
    moreFailedThanWire.copyObject.failedAttempts = moreFailedThanWire.copyObject.wireAttempts + 1;
    expect(providerSummaryErrors(moreFailedThanWire).join("; ")).toContain(
      "CopyObject failedAttempts exceeds wireAttempts",
    );

    const moreRetriesThanWire = summaryFixture();
    moreRetriesThanWire.copyObject.retryAttempts = moreRetriesThanWire.copyObject.wireAttempts + 1;
    expect(providerSummaryErrors(moreRetriesThanWire).join("; ")).toContain(
      "CopyObject retryAttempts exceeds wireAttempts",
    );

    const moreThrottledThanFailed = summaryFixture();
    moreThrottledThanFailed.copyObject.throttledAttempts =
      moreThrottledThanFailed.copyObject.failedAttempts + 1;
    expect(providerSummaryErrors(moreThrottledThanFailed).join("; ")).toContain(
      "CopyObject throttledAttempts exceeds failedAttempts",
    );

    // The relationships hold at equality.
    const atBoundary = summaryFixture();
    atBoundary.copyObject.failedAttempts = atBoundary.copyObject.wireAttempts;
    atBoundary.copyObject.retryAttempts = atBoundary.copyObject.wireAttempts;
    atBoundary.copyObject.throttledAttempts = atBoundary.copyObject.failedAttempts;
    expect(providerSummaryErrors(atBoundary)).toEqual([]);
  });

  test("accepts current-schema basic failures with detailed diagnostics disabled", () => {
    const summary = summaryFixture();
    summary.detailedFailureDiagnosticsEnabled = false;
    Object.assign(summary.putObject, {
      failuresBySdkErrorKind: {},
      failuresByServiceCode: {},
    });
    summary.putObject.failureStates = [];
    summary.putObject.failureStateOverflowAttempts = 0;

    expect(summary.putObject.failedAttempts).toBe(2);
    expect(sanitizeProviderSummary(summary)).toEqual(summary);
    expect(providerSummaryErrors(summary)).toEqual([]);
  });

  test("requires an exact current-schema diagnostics marker and empty disabled detail", () => {
    const missing = summaryFixture();
    delete (missing as Partial<typeof missing>).detailedFailureDiagnosticsEnabled;
    expect(providerSummaryErrors(missing).join("; ")).toContain(
      "detailedFailureDiagnosticsEnabled must be boolean",
    );

    const invalid = summaryFixture();
    invalid.detailedFailureDiagnosticsEnabled = "true" as never;
    expect(providerSummaryErrors(invalid).join("; ")).toContain(
      "detailedFailureDiagnosticsEnabled",
    );

    const disabledWithDetail = summaryFixture();
    disabledWithDetail.detailedFailureDiagnosticsEnabled = false;
    expect(providerSummaryErrors(disabledWithDetail).join("; ")).toContain(
      "disabled detailed failure diagnostics must be empty",
    );
  });

  test("rejects identifiers, arbitrary strings, and unexpected nested current-schema fields", () => {
    for (const [field, value] of [
      ["objectKey", "private/object.txt"],
      ["bucketName", "private-bucket"],
      ["requestId", "request-identifier"],
      ["rawError", "raw transport detail"],
    ] as const) {
      const summary = summaryFixture();
      const state = firstFailureState(summary);
      summary.putObject.failureStates[0] = {
        ...state,
        [field]: value,
      };
      expect(providerSummaryErrors(summary).join("; ")).toContain("unexpected field");
    }

    const invalidLabel = summaryFixture();
    firstFailureState(invalidLabel).serviceCode = "RequestTimeout/private-object";
    expect(providerSummaryErrors(invalidLabel).join("; ")).toContain("serviceCode is invalid");
  });

  test("rejects oversized current-schema maps and failure-state arrays", () => {
    const oversizedMap = summaryFixture();
    Object.assign(
      oversizedMap.putObject.failuresByServiceCode,
      Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`Code${index}`, 0])),
    );
    expect(providerSummaryErrors(oversizedMap).join("; ")).toContain("exceeds 32 labels");

    const oversizedStates = summaryFixture();
    const state = firstFailureState(oversizedStates);
    oversizedStates.putObject.failureStates = Array.from({ length: 33 }, () =>
      structuredClone(state),
    );
    expect(providerSummaryErrors(oversizedStates).join("; ")).toContain("exceeds 32 groups");
  });

  test("rejects malformed current-schema ranges and inconsistent failure totals", () => {
    const inverted = summaryFixture();
    firstFailureState(inverted).elapsedMs = { min: 2, max: 1, total: 3 };
    expect(providerSummaryErrors(inverted).join("; ")).toContain("min exceeds max");

    const outside = summaryFixture();
    firstFailureState(outside).body.remainingBytes.total = 1;
    expect(providerSummaryErrors(outside).join("; ")).toContain("outside the represented range");

    const inconsistent = summaryFixture();
    inconsistent.putObject.failureStateOverflowAttempts = 1;
    expect(providerSummaryErrors(inconsistent).join("; ")).toContain(
      "counts plus overflow must equal failedAttempts",
    );
  });

  test("rejects unsanitized provider summary fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const summaryFile = join(dir, "summary.json");
    writeFileSync(logFile, "Stack.BenchmarkImplementation = shin\n");
    writeFileSync(
      summaryFile,
      `${JSON.stringify({
        event: "shin_deployment_summary",
        schemaVersion: 3,
        requestId: "must-not-be-persisted",
      })}\n`,
    );
    expect(() =>
      collectBenchmarkResult({
        logFile,
        summaryFile,
        outputFile: join(dir, "results.jsonl"),
        phase: "cold-create",
      }),
    ).toThrow("unexpected field requestId");
  });

  test("correlates strict REPORT and summary evidence by stream and request ID", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const reportFile = join(dir, "report.json");
    const summaryFile = join(dir, "summary.json");
    writeFileSync(logFile, "Stack.BenchmarkImplementation = shin\n");
    writeFileSync(
      reportFile,
      JSON.stringify({
        events: [
          {
            timestamp: 2,
            logStreamName: "stream",
            message:
              "REPORT RequestId: report-id Duration: 1 ms Billed Duration: 1 ms Memory Size: 1024 MB Max Memory Used: 1 MB Init Duration: 1 ms",
          },
        ],
      }),
    );
    writeFileSync(
      summaryFile,
      JSON.stringify({
        events: [
          {
            timestamp: 1,
            logStreamName: "stream",
            message: `requestId="summary-id": summary=${JSON.stringify(
              JSON.stringify({ event: "shin_deployment_summary" }),
            )}`,
          },
        ],
      }),
    );
    expect(() =>
      collectBenchmarkResult({
        methodologyVersion: 2,
        implementation: "shin",
        logFile,
        reportFile,
        summaryFile,
        outputFile: join(dir, "results.jsonl"),
        phase: "cold-create",
      }),
    ).toThrow("request IDs do not match");
  });

  test("renders markdown benchmark comparison reports", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-report-"));
    const inputFile = join(dir, "results.jsonl");
    const outputFile = join(dir, "report.md");
    const options = parseBenchmarkRunOptions([
      "--config",
      CANONICAL_BENCHMARK_CONFIG,
      "--run-id",
      "00000000-0000-4000-a000-00000000002a",
      "--snapshot-date",
      "2026-01-01",
    ]);
    const records = createBenchmarkPlan(options)
      .filter((sample) => sample.repetition === 1)
      .flatMap((sample) => options.phases.map((phase) => canonicalRecord(options, sample, phase)));
    writeFileSync(inputFile, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);

    const report = renderBenchmarkReport({ inputFile, outputFile, preview: true });

    expect(readFileSync(outputFile, "utf8")).toEqual(report);
    expect(report.endsWith("\n")).toBe(true);
    expect(report.endsWith("\n\n")).toBe(false);
    expect(report).toContain("## Scope");
    expect(report).toContain("## ShinBucketDeployment vs AWS BucketDeployment");
    expect(report).toContain("mixed");
    expect(report).toContain("cold-create");
    expect(report).not.toContain("## Visual Summary");
    expect(existsSync(join(dir, "report-assets"))).toBe(false);
  });

  test("renders grouped Shin provider telemetry tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-results-table-"));
    const inputFile = join(dir, "results.jsonl");
    const outputFile = join(dir, "telemetry.md");
    const options = parseBenchmarkRunOptions([
      "--config",
      CANONICAL_BENCHMARK_CONFIG,
      "--run-id",
      "00000000-0000-4000-a000-00000000002b",
      "--snapshot-date",
      "2026-01-01",
    ]);
    const records = createBenchmarkPlan(options)
      .filter((sample) => sample.repetition === 1)
      .flatMap((sample) => options.phases.map((phase) => canonicalRecord(options, sample, phase)));
    writeFileSync(inputFile, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);

    const table = renderBenchmarkResultsTable({ inputFile, outputFile, preview: true });

    expect(readFileSync(outputFile, "utf8")).toEqual(table);
    expect(table).toContain("# Shin Provider Benchmark Telemetry");
    expect(table).toContain("## mixed / 1024 MiB / max concurrency 32");
    expect(table).toContain("### Runtime");
    expect(table).toContain("### Provider Phase Timing");
    expect(table).toContain("### Catalog Trust And Fallback");
  });
});

function summaryFixture() {
  const base = summaryBaseFixture();
  return {
    ...base,
    schemaVersion: 5,
    copyObject: {
      wireAttempts: 12,
      failedAttempts: 3,
      retryAttempts: 4,
      throttledAttempts: 2,
      retryWaitMs: 750,
      throttleCooldownWaits: 1,
      throttleCooldownWaitMs: 300,
    },
  };
}

function summaryBaseFixture() {
  const zeros = (names: readonly string[]) => Object.fromEntries(names.map((name) => [name, 0]));
  const range = (value: number, count = 2) => ({ min: value, max: value, total: value * count });
  return {
    event: "shin_deployment_summary",
    schemaVersion: 5,
    requestType: "Create",
    deploymentStatus: "success",
    extract: true,
    destinationChecksumStrategy: "sse-s3-etag",
    deleteStaleObjectsOnDeployment: true,
    availableMemoryMb: 1024,
    maxParallelTransfers: 32,
    detailedFailureDiagnosticsEnabled: true,
    durationMs: 60000,
    phaseMs: zeros([
      "plan",
      "destinationList",
      "transfer",
      "delete",
      "cloudfront",
      "oldPrefixDelete",
      "callback",
    ]),
    counts: {
      ...zeros([
        "sourceArchives",
        "plannedEntries",
        "filteredEntries",
        "markerEntries",
        "destinationObjects",
        "destinationMetadataRetained",
        "destinationPageObjectsHighWater",
        "deleteObjects",
        "deleteBatches",
        "uploadedObjects",
        "skippedObjects",
        "conditionalConflicts",
        "copiedObjects",
        "md5HashAttempts",
        "md5Skips",
        "catalogSkips",
      ]),
      plannedEntries: 1,
      uploadedObjects: 1,
    },
    bytes: { sourceZip: 1048576, uploaded: 1048576, copied: 0 },
    transfer: {
      scheduledObjects: 1,
      completedObjects: 1,
      failedObjects: 0,
      cancelledObjects: 0,
      panickedObjects: 0,
      inFlightHighWater: 1,
    },
    markerReplacement: {
      strategy: "planning-plus-retryable-stream",
      semantics: "leftmost-longest-non-recursive",
      plannedPassesPerUpload: 2,
      planningPasses: 0,
      uploadPasses: 0,
    },
    catalog: zeros([
      "trustedArchives",
      "untrustedArchives",
      "trustedEntries",
      "fallbackHashAttempts",
      "sparseSkips",
    ]),
    source: {
      ...zeros([
        "plannedBlocks",
        "plannedBytes",
        "fetchedBlocks",
        "fetchedBytes",
        "getAttempts",
        "getRetries",
        "getThrottledAttempts",
        "getRetryableErrors",
        "getPermanentErrors",
        "getRequestErrors",
        "getBodyErrors",
        "getShortBodyErrors",
        "getErrors",
        "blockHits",
        "blockMisses",
        "blockRefetches",
        "blockWaits",
        "blockWaitsFetching",
        "blockWaitsCapacity",
        "replayClaims",
        "replayClaimsAfterRelease",
        "replayClaimsAfterFailure",
        "bodyAttempts",
        "bodyReplays",
        "activeGetsHighWater",
        "activeReadersHighWater",
        "residentBytesHighWater",
        "globalBudgetBytes",
        "globalResidentBytesCurrent",
        "globalResidentBytesHighWater",
      ]),
      globalBudgetBytes: 536870912,
    },
    putObject: {
      wireAttempts: 3,
      failedAttempts: 2,
      retryAttempts: 2,
      throttledAttempts: 0,
      retryWaitMs: 500,
      throttleCooldownWaits: 0,
      throttleCooldownWaitMs: 0,
      failuresBySdkErrorKind: { ServiceError: 2 },
      failuresByServiceCode: { RequestTimeout: 2 },
      failureStates: [
        {
          count: 2,
          sdkErrorKind: "ServiceError",
          dispatchFailureKind: null,
          serviceCode: "RequestTimeout",
          elapsedMs: { min: 56200, max: 56300, total: 112500 },
          body: {
            attemptObserved: true,
            replay: false,
            producerStage: "reading-source",
            finalFrameDelivered: false,
            producerCompleted: false,
            bodyErrorObserved: false,
            receiverDropped: true,
            receiverDropAbortedProducer: true,
            attemptNumber: range(1),
            bytesEmitted: range(0),
            remainingBytes: range(1048576),
          },
          source: {
            observed: true,
            localWindowBytes: range(67108864),
            localCommittedBytes: range(8388608),
            localResidentBytes: range(0),
            localCapacityWaiters: range(1),
            globalBudgetBytes: range(536870912),
            globalResidentBytes: range(528482304),
            globalAvailablePermits: range(1),
            globalPermitUnitBytes: range(4096),
            globalPermitWaiters: range(1),
            activeFetches: range(0),
          },
        },
      ],
      failureStateOverflowAttempts: 0,
    },
    deleteObject: zeros([
      "sdkCalls",
      "failedCalls",
      "requestedObjects",
      "inferredDeletedObjects",
      "unconfirmedObjects",
      "noSuchBucketRequestedIdentifiers",
    ]),
    callback: {
      wireAttempts: 1,
      failedAttempts: 0,
      retryAttempts: 0,
      confirmedResponses: 1,
    },
  };
}

function firstFailureState(summary: ReturnType<typeof summaryBaseFixture>) {
  const state = summary.putObject.failureStates[0];
  if (state === undefined) throw new Error("summary fixture must contain one failure state");
  return state;
}
