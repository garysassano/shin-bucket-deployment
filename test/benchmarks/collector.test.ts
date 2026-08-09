import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { collectBenchmarkResult } from "../../benchmarks/src/collect-results";
import { parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import {
  benchmarkEvidenceErrors,
  providerSummaryErrors,
  sanitizeProviderSummary,
} from "../../benchmarks/src/model";
import { createBenchmarkPlan } from "../../benchmarks/src/plan";
import {
  renderBenchmarkReport,
  rowsRequiringCompleteSamples,
} from "../../benchmarks/src/render/comparison-report";
import { renderBenchmarkResultsTable } from "../../benchmarks/src/render/telemetry-table";
import { CANONICAL_BENCHMARK_CONFIG } from "../../benchmarks/src/validation";
import {
  canonicalRecord,
  canonicalRunRecord,
  canonicalRuns,
  canonicalSampleRecord,
  codeSha256,
} from "../support/benchmark-records";

describe("benchmark result collector", () => {
  // Lambda emits Init Duration only on a cold start, so an update phase that
  // reused a warm container has none. Asserting the full repetition count for
  // that metric on every phase failed the entire canonical report the first
  // time a container survived between phases -- at publish time, after the
  // measurement had already been paid for.
  describe("phase-optional metric completeness", () => {
    const rows = [
      { phase: "cold-create", count: 5 },
      { phase: "unchanged-update", count: 5 },
      { phase: "pruned-update", count: 4 },
    ];

    test("checks a phase-optional metric only on the cold-start phase", () => {
      expect(rowsRequiringCompleteSamples(rows, "initDurationSeconds")).toEqual([
        { phase: "cold-create", count: 5 },
      ]);
    });

    test("still checks every phase for a required metric", () => {
      expect(rowsRequiringCompleteSamples(rows, "providerDurationSeconds")).toEqual(rows);
    });

    test("does not exempt the cold-start phase, where the measurement must exist", () => {
      expect(
        rowsRequiringCompleteSamples([{ phase: "cold-create", count: 4 }], "initDurationSeconds"),
      ).toEqual([{ phase: "cold-create", count: 4 }]);
    });
  });
  // A warm Lambda container omits Init Duration. Requiring it on every phase
  // aborted a canonical run on pruned-update -- the fourth invocation of the
  // same function -- after every stack had deployed and destroyed cleanly.
  function collectWithReport(phase: string, reportMessage: string, dirTag: string) {
    const dir = mkdtempSync(join(tmpdir(), `shin-bench-collector-${dirTag}-`));
    const logFile = join(dir, "deploy.log");
    const reportFile = join(dir, "report.json");
    writeFileSync(
      logFile,
      [
        "\u2728  Deployment time: 1s",
        "Stack.BenchmarkImplementation = aws",
        "Stack.BenchmarkAssetProfile = tiny-many",
        "Stack.BenchmarkMemoryLimitMb = 1024",
        "Stack.BenchmarkState = baseline",
        "Stack.BenchmarkFileCount = 1",
        "Stack.BenchmarkTotalBytes = 1",
        `Stack.BenchmarkAssetManifestSha256 = ${"2".repeat(64)}`,
        "Stack.BenchmarkSourceCount = 1",
        "Stack.BenchmarkDetailedFailureDiagnostics = not-applicable",
        "real 1",
        "",
      ].join("\n"),
    );
    writeFileSync(
      reportFile,
      JSON.stringify({
        events: [{ timestamp: 2, logStreamName: "stream", message: reportMessage }],
      }),
    );
    return () =>
      collectBenchmarkResult({
        implementation: "aws",
        runId: "00000000-0000-4000-a000-000000000099",
        sampleId: "00000000-0000-5000-a000-000000000099",
        snapshotDate: "2026-01-01",
        region: "eu-central-1",
        cleanup: "benchmark cleanup pending",
        benchmarkConfigSha256: "2".repeat(64),
        assetManifestSha256: "2".repeat(64),
        dependencyLockSha256: "1".repeat(64),
        applicationBuildSha256: "2".repeat(64),
        installedDependenciesSha256: "7".repeat(64),
        nodeVersion: "v24.0.0",
        pnpmVersion: "11.0.0",
        executionEnvironmentSha256: "8".repeat(64),
        executionEnvironmentFresh: true,
        sourceTreeSha256: "3".repeat(64),
        gitDirty: false,
        cdkCliVersion: "1.0.0",
        cdkCliInstalledSha256: "c".repeat(64),
        awsCdkLibVersion: "2.260.0",
        awsCdkLibInstalledSha256: "d".repeat(64),
        constructsInstalledSha256: "e".repeat(64),
        memoryMeasurementScope: "phase-local",
        providerPackageVersion: "2.260.0",
        providerArchitecture: "x86_64",
        providerRuntime: "python3.13",
        providerHandler: "index.handler",
        providerCodeSha256: codeSha256("b".repeat(64)),
        memoryMb: 1024,
        parallel: null,
        detailedFailureDiagnostics: null,
        assetProfile: "tiny-many",
        state: "baseline",
        repetition: 1,
        fileCount: 1,
        totalBytes: 1,
        sourceCount: 1,
        phase,
        logFile,
        reportFile,
        outputFile: join(dir, "results.jsonl"),
      });
  }

  const WARM =
    "REPORT RequestId: warm-id Duration: 1000 ms Billed Duration: 1000 ms Memory Size: 1024 MB Max Memory Used: 1 MB";
  const COLD = `${WARM} Init Duration: 100 ms`;

  test("accepts an update phase whose Lambda container stayed warm", () => {
    const collected = collectWithReport("pruned-update", WARM, "warm")();

    expect(collected.sample.initDurationSeconds).toBeNull();
    expect(collected.sample.phase).toBe("pruned-update");
  });

  test("still rejects a cold-start phase that reports no init duration", () => {
    expect(collectWithReport("cold-create", WARM, "coldmissing")).toThrow(
      /missing init duration on a cold-start phase/,
    );
  });

  test("still rejects a REPORT line with no request ID", () => {
    const noRequestId =
      "REPORT Duration: 1000 ms Billed Duration: 1000 ms Memory Size: 1024 MB Max Memory Used: 1 MB";
    expect(collectWithReport("pruned-update", noRequestId, "noreqid")).toThrow(
      /missing its request ID/,
    );
  });

  test("accepts a cold-start phase that reports an init duration", () => {
    const collected = collectWithReport("cold-create", COLD, "cold")();

    expect(collected.sample.initDurationSeconds).toBe(0.1);
  });
  test("collects AWS run records with the five measured provider fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-aws-"));
    const logFile = join(dir, "deploy.log");
    const reportFile = join(dir, "report.json");
    writeFileSync(
      logFile,
      [
        "✨  Deployment time: 1s",
        "Stack.BenchmarkImplementation = aws",
        "Stack.BenchmarkAssetProfile = tiny-many",
        "Stack.BenchmarkMemoryLimitMb = 1024",
        "Stack.BenchmarkState = baseline",
        "Stack.BenchmarkFileCount = 1",
        "Stack.BenchmarkTotalBytes = 1",
        `Stack.BenchmarkAssetManifestSha256 = ${"2".repeat(64)}`,
        "Stack.BenchmarkSourceCount = 1",
        "Stack.BenchmarkDetailedFailureDiagnostics = not-applicable",
        "real 1",
        "",
      ].join("\n"),
    );
    writeFileSync(
      reportFile,
      JSON.stringify({
        events: [
          {
            timestamp: 2,
            logStreamName: "stream",
            message:
              "REPORT RequestId: aws-id Duration: 1000 ms Billed Duration: 1000 ms Memory Size: 1024 MB Max Memory Used: 1 MB Init Duration: 100 ms",
          },
        ],
      }),
    );
    const providerCodeSha256 = codeSha256("b".repeat(64));
    const collected = collectBenchmarkResult({
      implementation: "aws",
      runId: "00000000-0000-4000-a000-000000000099",
      sampleId: "00000000-0000-5000-a000-000000000099",
      snapshotDate: "2026-01-01",
      region: "eu-central-1",
      cleanup: "benchmark cleanup pending",
      benchmarkConfigSha256: "2".repeat(64),
      assetManifestSha256: "2".repeat(64),
      dependencyLockSha256: "1".repeat(64),
      applicationBuildSha256: "2".repeat(64),
      installedDependenciesSha256: "7".repeat(64),
      nodeVersion: "v24.0.0",
      pnpmVersion: "11.0.0",
      executionEnvironmentSha256: "8".repeat(64),
      executionEnvironmentFresh: true,
      sourceTreeSha256: "3".repeat(64),
      gitDirty: false,
      cdkCliVersion: "1.0.0",
      cdkCliInstalledSha256: "c".repeat(64),
      awsCdkLibVersion: "2.260.0",
      awsCdkLibInstalledSha256: "d".repeat(64),
      constructsInstalledSha256: "e".repeat(64),
      memoryMeasurementScope: "phase-local",
      providerPackageVersion: "2.260.0",
      providerArchitecture: "x86_64",
      providerRuntime: "python3.13",
      providerHandler: "index.handler",
      providerCodeSha256,
      memoryMb: 1024,
      parallel: null,
      detailedFailureDiagnostics: null,
      assetProfile: "tiny-many",
      state: "baseline",
      repetition: 1,
      fileCount: 1,
      totalBytes: 1,
      sourceCount: 1,
      phase: "cold-create",
      logFile,
      reportFile,
      outputFile: join(dir, "results.jsonl"),
    });

    expect(collected.run.provider).toEqual({
      packageVersion: "2.260.0",
      architecture: "x86_64",
      runtime: "python3.13",
      handler: "index.handler",
      codeSha256: providerCodeSha256,
    });
    expect(Object.hasOwn(collected.run.provider ?? {}, "implementationCommit")).toBe(false);
    expect(Object.hasOwn(collected.run.provider ?? {}, "bootstrap")).toBe(false);
    expect(
      benchmarkEvidenceErrors(
        { runs: [collected.run], samples: [collected.sample] },
        { allowPendingCleanup: true },
      ),
    ).toEqual([]);
  });

  test("collects and persists one complete current-schema record", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const outputFile = join(dir, "results.jsonl");

    const collected = collectCurrentRecord(dir, outputFile);

    expect(JSON.parse(readFileSync(outputFile, "utf8"))).toEqual(collected);
    expect(collected).toMatchObject({
      implementation: "shin",
      profile: "tiny-many",
      memoryMb: 1024,
      parallel: 32,
      phase: "cold-create",
      providerDurationSeconds: 1,
      billedDurationSeconds: 1,
      initDurationSeconds: 0.1,
      maxMemoryMb: 1,
      providerInvoked: true,
    });
    expect(collected.providerSummary).toEqual(summaryFixture());
  });

  test("preserves complete decision-run repetitions in the JSONL key", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const outputFile = join(dir, "results.jsonl");

    collectCurrentRecord(dir, outputFile, {
      decisionRunId: "scheduler-current",
      comparisonVariant: "current",
      repetition: 1,
      sampleId: "00000000-0000-5000-a000-000000000001",
    });
    collectCurrentRecord(dir, outputFile, {
      decisionRunId: "scheduler-current",
      comparisonVariant: "current",
      repetition: 2,
      sampleId: "00000000-0000-5000-a000-000000000002",
    });

    const rows = readFileSync(outputFile, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.repetition)).toEqual([1, 2]);
  });

  test("fails closed when the memory measurement scope is not supplied", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-scope-"));
    expect(() =>
      collectCurrentRecord(dir, join(dir, "results.jsonl"), {
        memoryMeasurementScope: undefined,
      }),
    ).toThrow("memoryMeasurementScope must be phase-local");
  });

  test("fails closed on a stale provider summary that still carries the removed schemaVersion marker", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-schema-"));
    const logFile = join(dir, "deploy.log");
    const summaryFile = join(dir, "summary.json");
    writeFileSync(logFile, "Stack.BenchmarkImplementation = shin\n");
    // The removed marker was a constant on the single living contract, so ANY
    // summary still carrying it -- including the old contract value 6, which the
    // pre-bump collector accepted and stripped -- is a stale-contract payload.
    // The collector must reject it, never accept or silently strip it.
    for (const marker of [6, 5]) {
      writeFileSync(
        summaryFile,
        JSON.stringify({
          events: [
            {
              timestamp: 1,
              logStreamName: "stream",
              message: `requestId="summary-id": summary=${JSON.stringify(
                JSON.stringify(liveSummaryFixture({ schemaVersion: marker })),
              )}`,
            },
          ],
        }),
      );
      expect(() =>
        collectBenchmarkResult({
          implementation: "shin",
          logFile,
          summaryFile,
          outputFile: join(dir, "results.jsonl"),
          phase: "cold-create",
        }),
      ).toThrow("unexpected field schemaVersion");
    }
  });

  test("round-trips strict current-schema PutObject failure diagnostics", () => {
    const summary = summaryFixture();

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
    expect(() =>
      sanitizeProviderSummary({
        event: "shin_deployment_summary",
        requestId: "must-not-be-persisted",
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
            message: `requestId="summary-id": summary=${JSON.stringify(JSON.stringify(liveSummaryFixture()))}`,
          },
        ],
      }),
    );
    expect(() =>
      collectBenchmarkResult({
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
    writeFileSync(
      join(dir, "runs.jsonl"),
      `${canonicalRuns(options)
        .map((run) => JSON.stringify(run))
        .join("\n")}\n`,
    );

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
    writeFileSync(
      join(dir, "runs.jsonl"),
      `${canonicalRuns(options)
        .map((run) => JSON.stringify(run))
        .join("\n")}\n`,
    );

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

/**
 * The current live provider output shape: exactly the stored summary shape.
 * The constant `schemaVersion` marker is gone from the provider contract (V-1),
 * so a live summary carrying one is a stale-contract payload the collector
 * rejects at the parse boundary.
 */
function liveSummaryFixture(overrides: Record<string, unknown> = {}) {
  return { ...summaryFixture(), ...overrides };
}

function summaryBaseFixture() {
  const zeros = (names: readonly string[]) => Object.fromEntries(names.map((name) => [name, 0]));
  const range = (value: number, count = 2) => ({ min: value, max: value, total: value * count });
  return {
    event: "shin_deployment_summary",
    requestType: "Create",
    deploymentStatus: "success",
    extract: true,
    deleteStaleObjectsOnDeployment: true,
    availableMemoryMb: 1024,
    maxParallelTransfers: 32,
    detailedFailureDiagnosticsEnabled: true,
    durationMs: 60000,
    phaseMs: zeros([
      "plan",
      "planCatalog",
      "planDirectory",
      "planEntries",
      "planValidation",
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
      spooledUploads: 0,
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
        "globalReleaseAnomalies",
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

function collectCurrentRecord(
  dir: string,
  outputFile: string,
  overrides: Record<string, unknown> = {},
) {
  const decisionRunId = overrides.decisionRunId as string | undefined;
  const comparisonVariant = overrides.comparisonVariant as string | undefined;
  const {
    decisionRunId: _decisionRunId,
    comparisonVariant: _comparisonVariant,
    ...sampleOverrides
  } = overrides;
  const record = canonicalSampleRecord({
    providerSummary: summaryFixture(),
    ...sampleOverrides,
  });
  const options = parseBenchmarkRunOptions([
    "--run-id",
    String(record.runId),
    "--snapshot-date",
    "2026-01-01",
    ...(decisionRunId ? ["--decision-run-id", decisionRunId] : []),
    ...(comparisonVariant ? ["--comparison-variant", comparisonVariant] : []),
  ]);
  const run = canonicalRunRecord(options, "shin") as Record<string, unknown>;
  const runConfig = run.config as Record<string, unknown>;
  const environment = run.environment as Record<string, unknown>;
  const cdk = run.cdk as Record<string, unknown>;
  const provider = run.provider as Record<string, unknown>;
  const bootstrap = provider.bootstrap as Record<string, unknown>;
  const memoryMeasurementScope = Object.hasOwn(overrides, "memoryMeasurementScope")
    ? (overrides.memoryMeasurementScope as "phase-local" | undefined)
    : "phase-local";
  const sampleId = record.sampleId as string;
  const requestId = `request-${sampleId}`;
  const logStreamName = `stream-${sampleId}`;
  const logFile = join(dir, `deploy-${sampleId}.log`);
  const reportFile = join(dir, `report-${sampleId}.json`);
  const summaryFile = join(dir, `summary-${sampleId}.json`);

  writeFileSync(
    logFile,
    [
      "✨  Deployment time: 1s",
      `Stack.BenchmarkImplementation = ${String(record.implementation)}`,
      `Stack.BenchmarkAssetProfile = ${String(record.profile)}`,
      `Stack.BenchmarkMemoryLimitMb = ${String(record.memoryMb)}`,
      `Stack.BenchmarkState = ${String(record.state)}`,
      `Stack.BenchmarkFileCount = ${String(record.fileCount)}`,
      `Stack.BenchmarkTotalBytes = ${String(record.totalBytes)}`,
      `Stack.BenchmarkAssetManifestSha256 = ${String(record.assetManifestSha256)}`,
      "Stack.BenchmarkSourceCount = 1",
      `Stack.BenchmarkTransferMaxConcurrency = ${String(record.parallel)}`,
      "Stack.BenchmarkSourceWindowBytes = adaptive",
      "Stack.BenchmarkDetailedFailureDiagnostics = true",
      "real 1",
      "",
    ].join("\n"),
  );
  writeFileSync(
    reportFile,
    JSON.stringify({
      events: [
        {
          timestamp: 2,
          logStreamName,
          message: `REPORT RequestId: ${requestId} Duration: 1000 ms Billed Duration: 1000 ms Memory Size: ${String(record.memoryMb)} MB Max Memory Used: 1 MB Init Duration: 100 ms`,
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
          logStreamName,
          message: `requestId="${requestId}": summary=${JSON.stringify(
            JSON.stringify(liveSummaryFixture(record.providerSummary as Record<string, unknown>)),
          )}`,
        },
      ],
    }),
  );

  return collectBenchmarkResult({
    runId: record.runId as string,
    sampleId,
    snapshotDate: run.snapshotDate as string,
    decisionRunId,
    comparisonVariant,
    repetition: record.repetition as number,
    benchmarkConfigSha256: runConfig.benchmarkConfigSha256 as string,
    assetManifestSha256: record.assetManifestSha256 as string,
    dependencyLockSha256: environment.dependencyLockSha256 as string,
    applicationBuildSha256: environment.applicationBuildSha256 as string,
    installedDependenciesSha256: environment.installedDependenciesSha256 as string,
    nodeVersion: environment.nodeVersion as string,
    pnpmVersion: environment.pnpmVersion as string,
    executionEnvironmentSha256: environment.executionEnvironmentSha256 as string,
    sourceTreeSha256: environment.sourceTreeSha256 as string,
    commit: provider.implementationCommit as string,
    providerPackageVersion: provider.packageVersion as string,
    providerArchitecture: provider.architecture as string,
    providerRuntime: provider.runtime as string,
    providerHandler: provider.handler as string,
    providerCodeSha256: provider.codeSha256 as string,
    providerBootstrapSha256: bootstrap.sha256 as string,
    providerBootstrapArchiveSha256: bootstrap.archiveSha256 as string,
    providerBootstrapProvenanceSha256: bootstrap.provenanceSha256 as string,
    providerBootstrapBuildDirty: bootstrap.buildDirty as boolean,
    providerBootstrapCargoVersion: bootstrap.cargoVersion as string,
    providerBootstrapRustcVersion: bootstrap.rustcVersion as string,
    providerBootstrapCargoLambdaVersion: bootstrap.cargoLambdaVersion as string,
    providerBootstrapZigVersion: bootstrap.zigVersion as string,
    providerBootstrapBuildToolchainSha256: bootstrap.buildToolchainSha256 as string,
    providerBootstrapBuildEnvironmentSha256: bootstrap.buildEnvironmentSha256 as string,
    gitDirty: environment.gitDirty as boolean,
    cdkCliVersion: cdk.cliVersion as string,
    cdkCliInstalledSha256: cdk.cliInstalledSha256 as string,
    awsCdkLibVersion: cdk.libVersion as string,
    awsCdkLibInstalledSha256: cdk.libInstalledSha256 as string,
    constructsInstalledSha256: cdk.constructsInstalledSha256 as string,
    executionEnvironmentFresh: environment.executionEnvironmentFresh as boolean,
    memoryMeasurementScope,
    region: run.region as string,
    implementation: record.implementation as string,
    assetProfile: record.profile as string,
    memoryMb: record.memoryMb as number,
    parallel: record.parallel as number,
    sourceWindowBytes: null,
    detailedFailureDiagnostics: true,
    phase: record.phase as string,
    state: record.state as string,
    fileCount: record.fileCount as number,
    totalBytes: record.totalBytes as number,
    sourceCount: 1,
    cleanup: "benchmark cleanup pending",
    logFile,
    reportFile,
    summaryFile,
    outputFile,
  }).sample;
}

function firstFailureState(summary: ReturnType<typeof summaryBaseFixture>) {
  const state = summary.putObject.failureStates[0];
  if (state === undefined) throw new Error("summary fixture must contain one failure state");
  return state;
}
