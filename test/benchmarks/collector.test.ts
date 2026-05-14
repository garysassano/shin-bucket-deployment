import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { collectBenchmarkResult } from "../../benchmarks/src/collect-results";
import { renderBenchmarkReport } from "../../benchmarks/src/render-report";

describe("benchmark result collector", () => {
  test("appends sanitized benchmark history records", () => {
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
        "Stack.BenchmarkImplementation = shin",
        "Stack.BenchmarkMemoryLimitMb = 512",
        "Stack.BenchmarkProfile = mixed",
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
      runId: "test-run",
      runDate: "2026-05-02",
      phase: "forced-unchanged",
      series: "forced-unchanged",
      commit: "abc1234",
      region: "ap-southeast-2",
    });

    const record = JSON.parse(readFileSync(outputFile, "utf8"));
    expect(collected).toEqual(record);
    expect(record).toMatchObject({
      schemaVersion: 2,
      runId: "test-run",
      runDate: "2026-05-02",
      providerImplementationCommit: "abc1234",
      region: "ap-southeast-2",
      implementation: "shin",
      profile: "mixed",
      series: "forced-unchanged",
      memoryMb: 512,
      phase: "forced-unchanged",
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

  test("uses explicit metadata when command logs omit outputs", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-collector-"));
    const logFile = join(dir, "destroy.log");
    const outputFile = join(dir, "results.jsonl");

    writeFileSync(logFile, ["destroying...", "real 37.91", ""].join("\n"));

    const collected = collectBenchmarkResult({
      logFile,
      outputFile,
      runId: "test-run",
      runDate: "2026-05-02",
      phase: "destroy",
      series: "large-few-create-unchanged-update",
      profile: "large-few",
      memoryMb: 2048,
      fileCount: 32,
      totalBytes: 144167470,
    });

    expect(collected).toMatchObject({
      profile: "large-few",
      memoryMb: 2048,
      phase: "destroy",
      state: null,
      fileCount: 32,
      totalBytes: 144167470,
      localWallSeconds: 37.91,
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
      requestType: "Create",
      status: "success",
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
        "Stack.BenchmarkImplementation = shin",
        "Stack.BenchmarkMemoryLimitMb = 1024",
        "Stack.BenchmarkProfile = tiny-many",
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
      runId: "parallel-transfer",
      runDate: "2026-05-10",
      phase: "cold-create-parallel-32",
      series: "parallel-transfers-1024",
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

  test("renders markdown benchmark comparison reports", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-report-"));
    const inputFile = join(dir, "results.jsonl");
    const outputFile = join(dir, "report.md");
    writeFileSync(
      inputFile,
      `${[
        {
          schemaVersion: 2,
          runId: "comparison",
          runDate: "2026-05-08",
          providerImplementationCommit: "abc1234",
          providerImplementationSubject: "test",
          resultDocumentationCommit: null,
          region: "ap-southeast-2",
          implementation: "shin",
          profile: "mixed",
          series: "comparison",
          memoryMb: 1024,
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
          cleanup: null,
          notes: null,
        },
        {
          schemaVersion: 2,
          runId: "comparison",
          runDate: "2026-05-08",
          providerImplementationCommit: null,
          providerImplementationSubject: null,
          resultDocumentationCommit: null,
          region: "ap-southeast-2",
          implementation: "aws",
          profile: "mixed",
          series: "comparison",
          memoryMb: 1024,
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
          cleanup: null,
          notes: null,
        },
      ]
        .map((record) => JSON.stringify(record))
        .join("\n")}\n`,
    );

    const report = renderBenchmarkReport({ inputFile, outputFile, runId: "comparison" });

    expect(readFileSync(outputFile, "utf8")).toEqual(report);
    expect(report).toContain("Benchmark Report: comparison");
    expect(report).toContain("| mixed | cold-create | 1024 | shin | 1 | 2 | 2 | 2 | 2 |");
    expect(report).toContain("## ShinBucketDeployment vs AWS BucketDeployment");
    expect(report).toContain(
      "| mixed | cold-create | 1024 | 2 s vs 8 s (4x faster) | 90 s vs 120 s (1.333x faster) | 60 s vs 90 s (1.5x faster) | 80 MiB vs 180 MiB (55.556% lower) |",
    );
    expect(report).toContain("### mixed cold-create at 1024 MiB");
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
    expect(svg).toContain("Profile");
    expect(svg).toContain("mixed");
    expect(svg).toContain("Lambda Handler Duration");
    expect(svg).toContain("Max Memory Used");
    expect(svg).toContain("4x faster");
    expect(svg).toContain("55.6% lower");
    expect(report).not.toContain("xychart-beta");
  });
});
