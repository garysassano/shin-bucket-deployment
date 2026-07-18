import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { collectBenchmarkResult } from "../../benchmarks/src/collect-results";
import {
  providerSummaryErrors,
  readBenchmarkResultRecords,
  sanitizeProviderSummary,
} from "../../benchmarks/src/model";
import { renderBenchmarkReport } from "../../benchmarks/src/render/comparison-report";
import { renderBenchmarkResultsTable } from "../../benchmarks/src/render/telemetry-table";

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
        "Stack.BenchmarkMaxParallelTransfers = 32",
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
        "Stack.BenchmarkMaxParallelTransfers = 32",
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

  test("round-trips strict schema-v4 PutObject failure diagnostics", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-v4-"));
    const logFile = join(dir, "deploy.log");
    const summaryFile = join(dir, "summary.json");
    const outputFile = join(dir, "results.jsonl");
    const summary = providerSummaryV4Fixture();
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

  test("keeps strict schema-v3 summaries and committed historical rows readable", () => {
    const v4 = providerSummaryV4Fixture();
    const { detailedFailureDiagnosticsEnabled: _detailedFailureDiagnosticsEnabled, ...v3TopLevel } =
      v4;
    const {
      failuresBySdkErrorKind: _sdkKinds,
      failuresByServiceCode: _serviceCodes,
      failureStates: _failureStates,
      failureStateOverflowAttempts: _overflow,
      ...putObject
    } = v4.putObject;
    const v3 = { ...v3TopLevel, schemaVersion: 3, putObject };

    expect(providerSummaryErrors(v3)).toEqual([]);
    const committed = readBenchmarkResultRecords(
      join(process.cwd(), "benchmarks", "results.jsonl"),
    );
    expect(committed.length).toBeGreaterThan(0);
    expect(committed.some((row) => row.providerSummary?.schemaVersion === 3)).toBe(true);
  });

  test("accepts schema-v4 basic failures with detailed diagnostics disabled", () => {
    const summary = providerSummaryV4Fixture();
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

  test("requires an exact schema-v4 diagnostics marker and empty disabled detail", () => {
    const missing = providerSummaryV4Fixture();
    delete (missing as Partial<typeof missing>).detailedFailureDiagnosticsEnabled;
    expect(providerSummaryErrors(missing).join("; ")).toContain(
      "detailedFailureDiagnosticsEnabled must be boolean",
    );

    const invalid = providerSummaryV4Fixture();
    invalid.detailedFailureDiagnosticsEnabled = "true" as never;
    expect(providerSummaryErrors(invalid).join("; ")).toContain(
      "detailedFailureDiagnosticsEnabled",
    );

    const disabledWithDetail = providerSummaryV4Fixture();
    disabledWithDetail.detailedFailureDiagnosticsEnabled = false;
    expect(providerSummaryErrors(disabledWithDetail).join("; ")).toContain(
      "disabled detailed failure diagnostics must be empty",
    );
  });

  test("rejects identifiers, arbitrary strings, and unexpected nested v4 fields", () => {
    for (const [field, value] of [
      ["objectKey", "private/object.txt"],
      ["bucketName", "private-bucket"],
      ["requestId", "request-identifier"],
      ["rawError", "raw transport detail"],
    ] as const) {
      const summary = providerSummaryV4Fixture();
      const state = firstFailureState(summary);
      summary.putObject.failureStates[0] = {
        ...state,
        [field]: value,
      };
      expect(providerSummaryErrors(summary).join("; ")).toContain("unexpected field");
    }

    const invalidLabel = providerSummaryV4Fixture();
    firstFailureState(invalidLabel).serviceCode = "RequestTimeout/private-object";
    expect(providerSummaryErrors(invalidLabel).join("; ")).toContain("serviceCode is invalid");
  });

  test("rejects oversized v4 maps and failure-state arrays", () => {
    const oversizedMap = providerSummaryV4Fixture();
    Object.assign(
      oversizedMap.putObject.failuresByServiceCode,
      Object.fromEntries(Array.from({ length: 33 }, (_, index) => [`Code${index}`, 0])),
    );
    expect(providerSummaryErrors(oversizedMap).join("; ")).toContain("exceeds 32 labels");

    const oversizedStates = providerSummaryV4Fixture();
    const state = firstFailureState(oversizedStates);
    oversizedStates.putObject.failureStates = Array.from({ length: 33 }, () =>
      structuredClone(state),
    );
    expect(providerSummaryErrors(oversizedStates).join("; ")).toContain("exceeds 32 groups");
  });

  test("rejects malformed v4 ranges and inconsistent failure totals", () => {
    const inverted = providerSummaryV4Fixture();
    firstFailureState(inverted).elapsedMs = { min: 2, max: 1, total: 3 };
    expect(providerSummaryErrors(inverted).join("; ")).toContain("min exceeds max");

    const outside = providerSummaryV4Fixture();
    firstFailureState(outside).body.remainingBytes.total = 1;
    expect(providerSummaryErrors(outside).join("; ")).toContain("outside the represented range");

    const inconsistent = providerSummaryV4Fixture();
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
    writeFileSync(
      inputFile,
      `${[
        {
          methodologyVersion: 1,
          gitDirty: false,
          snapshotDate: "2026-05-08",
          providerImplementationCommit: "abc1234",
          providerImplementationSubject: "test",
          resultDocumentationCommit: null,
          region: "ap-southeast-2",
          implementation: "shin",
          profile: "mixed",
          memoryMb: 1024,
          parallel: 8,
          phase: "cold-create",
          state: "baseline",
          fileCount: 442,
          totalBytes: 52904649,
          cdkDeploySeconds: 60,
          localWallSeconds: 90,
          providerDurationSeconds: 2,
          billedDurationSeconds: 2.1,
          initDurationSeconds: 0.1,
          maxMemoryMb: 80,
          providerInvoked: true,
          cleanup: "all benchmark stacks destroyed",
          notes: null,
        },
        {
          methodologyVersion: 1,
          gitDirty: false,
          snapshotDate: "2026-05-08",
          providerImplementationCommit: "abc1234",
          providerImplementationSubject: "test",
          resultDocumentationCommit: null,
          region: "ap-southeast-2",
          implementation: "shin",
          profile: "mixed",
          memoryMb: 1024,
          parallel: 8,
          sourceWindowBytes: 134217728,
          phase: "cold-create",
          state: "baseline",
          fileCount: 442,
          totalBytes: 52904649,
          cdkDeploySeconds: 70,
          localWallSeconds: 100,
          providerDurationSeconds: 4,
          billedDurationSeconds: 4.1,
          initDurationSeconds: 0.15,
          maxMemoryMb: 100,
          providerInvoked: true,
          cleanup: "all benchmark stacks destroyed",
          notes: null,
        },
        {
          methodologyVersion: 1,
          gitDirty: false,
          snapshotDate: "2026-05-08",
          providerImplementationCommit: null,
          providerImplementationSubject: null,
          resultDocumentationCommit: null,
          region: "ap-southeast-2",
          implementation: "aws",
          profile: "mixed",
          memoryMb: 1024,
          parallel: null,
          phase: "cold-create",
          state: "baseline",
          fileCount: 442,
          totalBytes: 52904649,
          cdkDeploySeconds: 90,
          localWallSeconds: 120,
          providerDurationSeconds: 8,
          billedDurationSeconds: 8.2,
          initDurationSeconds: 0.2,
          maxMemoryMb: 180,
          providerInvoked: true,
          cleanup: "all benchmark stacks destroyed",
          notes: null,
        },
      ]
        .map((record) => JSON.stringify(record))
        .join("\n")}\n`,
    );

    const report = renderBenchmarkReport({
      assetProfile: "mixed",
      inputFile,
      outputFile,
      methodologyVersion: 1,
    });

    expect(readFileSync(outputFile, "utf8")).toEqual(report);
    expect(report).toContain("Benchmark Report: mixed");
    expect(report).toContain("- Source window bytes: adaptive, 134217728");
    expect(report).toContain(
      "| mixed | cold-create | 1024 | 8 | adaptive | shin | 1 | 2 | 2 | 2 | 0 | 2 | 2 |",
    );
    expect(report).toContain(
      "| mixed | cold-create | 1024 | 8 | 134217728 | shin | 1 | 4 | 4 | 4 | 0 | 4 | 4 |",
    );
    expect(report).toContain("## ShinBucketDeployment vs AWS BucketDeployment");
    expect(report).toContain(
      "| mixed | cold-create | 1024 | 8 | adaptive | 2 s vs 8 s (4x faster) | 90 s vs 120 s (1.333x faster) | 60 s vs 90 s (1.5x faster) | 80 MiB vs 180 MiB (55.556% lower) |",
    );
    expect(report).toContain(
      "| mixed | cold-create | 1024 | 8 | 134217728 | 4 s vs 8 s (2x faster) | 100 s vs 120 s (1.2x faster) | 70 s vs 90 s (1.286x faster) | 100 MiB vs 180 MiB (44.444% lower) |",
    );
    expect(report).toContain(
      "### mixed cold-create at 1024 MiB / parallel 8 / source window adaptive",
    );
    expect(report).toContain(
      "### mixed cold-create at 1024 MiB / parallel 8 / source window 134217728",
    );
    expect(report).toContain("| Provider duration | 2 s | 8 s | +6 s | 4x | +300% |");
    expect(report).toContain("| Init duration | 0.1 s | 0.2 s | +0.1 s | 2x | +100% |");
    expect(report).toContain("| Max memory | 80 MiB | 180 MiB | +100 MiB | 2.25x | +125% |");
    expect(report).toContain("## Visual Summary");
    expect(report).toContain("Lower is better for both Lambda handler duration and max memory.");
    expect(report).toContain(
      "![ShinBucketDeployment vs AWS BucketDeployment Lambda handler duration and max memory](report-assets/shin-vs-aws-duration-memory.svg)",
    );
    const svg = readFileSync(join(dir, "report-assets", "shin-vs-aws-duration-memory.svg"), "utf8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Asset profile");
    expect(svg).toContain("mixed");
    expect(svg).toContain("Lambda Handler Duration");
    expect(svg).toContain("Max Memory Used");
    expect(svg).toContain("4x faster");
    expect(svg).toContain("55.6% lower");
    expect(report).not.toContain("xychart-beta");
  });

  test("renders grouped Shin provider telemetry tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-results-table-"));
    const inputFile = join(dir, "results.jsonl");
    const outputFile = join(dir, "telemetry.md");
    writeFileSync(
      inputFile,
      `${[
        {
          methodologyVersion: 1,
          gitDirty: false,
          snapshotDate: "2026-05-14",
          region: "ap-southeast-2",
          implementation: "shin",
          profile: "tiny-many",
          memoryMb: 1024,
          parallel: 32,
          phase: "cold-create",
          state: "baseline",
          fileCount: 2584,
          totalBytes: 8178618,
          cdkDeploySeconds: 66.1,
          localWallSeconds: 120.069,
          providerDurationSeconds: 3.261,
          billedDurationSeconds: 3.386,
          initDurationSeconds: 0.124,
          maxMemoryMb: 97,
          providerInvoked: true,
          cleanup: "all benchmark stacks destroyed",
          notes: null,
          providerSummary: {
            schemaVersion: 3,
            requestType: "Create",
            deploymentStatus: "success",
            destinationChecksumStrategy: "sse-s3-etag",
            durationMs: 3207,
            phaseMs: {
              plan: 328,
              destinationList: 34,
              transfer: 2843,
              delete: 0,
              callback: 12,
            },
            counts: { uploadedObjects: 2585, skippedObjects: 0, catalogSkips: 0 },
            transfer: {
              scheduledObjects: 2585,
              completedObjects: 2585,
              failedObjects: 0,
              cancelledObjects: 0,
              panickedObjects: 0,
              inFlightHighWater: 32,
            },
            source: {
              fetchedBytes: 856774,
              getRetries: 0,
              getThrottledAttempts: 0,
              getRetryableErrors: 0,
              getPermanentErrors: 0,
              bodyAttempts: 2585,
              bodyReplays: 0,
            },
            putObject: { wireAttempts: 2585, retryAttempts: 0, throttledAttempts: 0 },
            catalog: {
              trustedArchives: 1,
              untrustedArchives: 0,
              trustedEntries: 2585,
              fallbackHashAttempts: 0,
              sparseSkips: 0,
            },
            deleteObject: {
              sdkCalls: 1,
              failedCalls: 0,
              requestedObjects: 10,
              inferredDeletedObjects: 10,
              unconfirmedObjects: 0,
              noSuchBucketRequestedIdentifiers: 0,
            },
            callback: {
              wireAttempts: 1,
              failedAttempts: 0,
              retryAttempts: 0,
              confirmedResponses: 1,
            },
          },
        },
      ]
        .map((record) => JSON.stringify(record))
        .join("\n")}\n`,
    );

    const table = renderBenchmarkResultsTable({ inputFile, outputFile, methodologyVersion: 1 });

    expect(readFileSync(outputFile, "utf8")).toEqual(table);
    expect(table).toContain("# Shin Provider Benchmark Telemetry");
    expect(table).toContain("## tiny-many / 1024 MiB / parallel 32");
    expect(table).toContain("### Runtime");
    expect(table).toContain(
      "| cold-create | baseline | Create | success | 2584 | 8178618 | 66.1 | 120.069 | 3.261 | 3207 | 3.386 | 0.124 | 97 | null | null | sse-s3-etag | 1 |",
    );
    expect(table).toContain("### Provider Phase Timing");
    expect(table).toContain("| cold-create | 328 | 34 | 2843 | 0 | null | null | 12 |");
    expect(table).toContain("### Catalog Trust And Fallback");
    expect(table).toContain("| cold-create | 1 | 0 | 2585 | 0 | 0 |");
    expect(table).toContain("### Source Range Reads");
    expect(table).toContain("### Transfer Scheduler");
    expect(table).toContain("| cold-create | 2585 | 2585 | 0 | 0 | 0 | 32 |");
    expect(table).toContain("### PutObject Pressure");
    expect(table).toContain("### DeleteObjects Pressure");
    expect(table).toContain("| cold-create | 1 | 0 | 10 | 10 | 0 | 0 |");
    expect(table).toContain("### CloudFormation Callback");
    expect(table).toContain("| cold-create | 1 | 0 | 0 | 1 |");
    expect(table).toContain("| Shin telemetry rows | 1 |");
  });
});

function providerSummaryV4Fixture() {
  const zeros = (names: readonly string[]) => Object.fromEntries(names.map((name) => [name, 0]));
  const range = (value: number, count = 2) => ({ min: value, max: value, total: value * count });
  return {
    event: "shin_deployment_summary",
    schemaVersion: 4,
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

function firstFailureState(summary: ReturnType<typeof providerSummaryV4Fixture>) {
  const state = summary.putObject.failureStates[0];
  if (state === undefined) throw new Error("schema-v4 fixture must contain one failure state");
  return state;
}
