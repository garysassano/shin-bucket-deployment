import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { collectBenchmarkResult } from "../scripts/collect-benchmark-results";

describe("benchmark result collector", () => {
  test("appends sanitized benchmark history records", () => {
    const dir = mkdtempSync(join(tmpdir(), "rbd-bench-collector-"));
    const logFile = join(dir, "deploy.log");
    const reportFile = join(dir, "report.json");
    const outputFile = join(dir, "history.jsonl");

    writeFileSync(
      logFile,
      [
        "✨  Deployment time: 14.16s",
        "Outputs:",
        "Stack.BenchmarkFileCount = 442",
        "Stack.BenchmarkMemoryLimitMb = 512",
        "Stack.BenchmarkProfile = mixed",
        "Stack.BenchmarkTotalBytes = 52904649",
        "Stack.BenchmarkVariant = v1",
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
      schemaVersion: 1,
      runId: "test-run",
      runDate: "2026-05-02",
      providerImplementationCommit: "abc1234",
      region: "ap-southeast-2",
      profile: "mixed",
      series: "forced-unchanged",
      memoryMb: 512,
      phase: "forced-unchanged",
      variant: "v1",
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
});
