import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertCompleteSamples,
  comparisonGroupKey,
  summarize,
} from "../../benchmarks/src/aggregate";
import { parseCliOptions } from "../../benchmarks/src/cli";
import { type BenchmarkRunOptions, parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import { packageIntegrity, sourceStatusLines } from "../../benchmarks/src/metadata";
import {
  benchmarkMethodologyVersion,
  isCanonicalBenchmarkRecord,
  selectBenchmarkRun,
} from "../../benchmarks/src/model";
import { completedSampleIds, upsertBenchmarkRecord } from "../../benchmarks/src/persistence";
import { createBenchmarkPlan, wallClockCapReached } from "../../benchmarks/src/plan";

const usage = (): never => {
  throw new Error("usage");
};

describe("benchmark methodology v2", () => {
  test("rejects unknown, duplicate, missing, and empty CLI options", () => {
    expect(() => parseCliOptions(["--unknown", "x"], ["known"], usage)).toThrow("usage");
    expect(() => parseCliOptions(["--known", "x", "--known", "y"], ["known"], usage)).toThrow(
      "usage",
    );
    expect(() => parseCliOptions(["--known"], ["known"], usage)).toThrow("usage");
    expect(() => parseCliOptions(["--known="], ["known"], usage)).toThrow("usage");
  });

  test("defaults to five sequential methodology-v2 repetitions", () => {
    const options = parseBenchmarkRunOptions([]);
    expect(options).toMatchObject({ methodologyVersion: 2, repetitions: 5, concurrency: 1 });
    expect(options.runId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("rejects benchmark concurrency above one", () => {
    expect(() => parseBenchmarkRunOptions(["--concurrency", "2"])).toThrow("sequential execution");
  });

  test("plans repetitions sequentially and deduplicates AWS across Shin parallel settings", () => {
    const options: BenchmarkRunOptions = {
      ...parseBenchmarkRunOptions(["--run-id", "run", "--repetitions", "2"]),
      assetProfiles: ["tiny-many"],
      lambdaConfigs: [
        { memoryMb: 1024, parallel: 16 },
        { memoryMb: 1024, parallel: 32 },
      ],
      implementations: ["shin", "aws"],
    };
    const plan = createBenchmarkPlan(options);
    expect(plan).toHaveLength(6);
    expect(plan.map((run) => [run.repetition, run.implementation, run.parallel])).toEqual([
      [1, "shin", 16],
      [1, "aws", null],
      [1, "shin", 32],
      [2, "shin", 16],
      [2, "aws", null],
      [2, "shin", 32],
    ]);
    expect(new Set(plan.map((run) => run.sampleId)).size).toBe(plan.length);
  });

  test("stops before another stack when the wall-clock cap is reached", () => {
    expect(wallClockCapReached(1_000, 1, 60_999)).toBe(false);
    expect(wallClockCapReached(1_000, 1, 61_000)).toBe(true);
  });

  test("calculates median, quartiles, and IQR with interpolation", () => {
    expect(summarize([5, 1, 4, 2, 3])).toEqual({
      count: 5,
      median: 3,
      q1: 2,
      q3: 4,
      iqr: 2,
      min: 1,
      max: 5,
    });
    expect(summarize([1, 2, 3, 4])).toMatchObject({ median: 2.5, q1: 1.75, q3: 3.25, iqr: 1.5 });
  });

  test("enforces exactly five complete samples", () => {
    expect(() =>
      assertCompleteSamples([{ count: 4, implementation: "shin", phase: "cold", profile: "tiny" }]),
    ).toThrow("expected n=5");
  });

  test("pairs AWS and Shin independently of parallel", () => {
    expect(comparisonGroupKey({ profile: "tiny", phase: "cold", memoryMb: 1024 })).toBe(
      ["tiny", "cold", 1024].join("\0"),
    );
  });

  test("treats absent methodology as v1 and only completed v2 as canonical", () => {
    expect(benchmarkMethodologyVersion({})).toBe(1);
    expect(
      isCanonicalBenchmarkRecord({ methodologyVersion: 2, gitDirty: false, cleanup: "pending" }),
    ).toBe(false);
    expect(
      isCanonicalBenchmarkRecord({
        methodologyVersion: 2,
        gitDirty: false,
        cleanup: "all benchmark stacks destroyed",
      }),
    ).toBe(true);
  });

  test("selects the latest completed run instead of aggregating different runs", () => {
    expect(selectBenchmarkRun([{ runId: "older" }, { runId: "latest" }])).toEqual([
      { runId: "latest" },
    ]);
    expect(selectBenchmarkRun([{ runId: "older" }, { runId: "latest" }], "older")).toEqual([
      { runId: "older" },
    ]);
  });

  test("binds the upstream package to its exact lockfile integrity", () => {
    const lockfile = readFileSync(join(process.cwd(), "pnpm-lock.yaml"), "utf8");
    expect(packageIntegrity(lockfile, "aws-cdk-lib", "2.260.0")).toMatch(/^sha512-/);
  });

  test("does not mark a resumed run dirty only because its sanitized output changed", () => {
    expect(
      sourceStatusLines(
        " M benchmarks/results.jsonl\n M benchmarks/src/model.ts\n",
        process.cwd(),
        "benchmarks/results.jsonl",
      ),
    ).toEqual([" M benchmarks/src/model.ts"]);
  });

  test("atomically upserts pending cleanup state without rewriting unrelated history", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-persistence-"));
    const output = join(dir, "results.jsonl");
    writeFileSync(output, `${JSON.stringify({ phase: "history", profile: "old" })}\n`);
    const identity = {
      methodologyVersion: 2,
      runId: "run",
      sampleId: "sample",
      repetition: 1,
      implementation: "shin",
      profile: "tiny-many",
      memoryMb: 1024,
      parallel: 32,
      phase: "cold-create",
      state: "baseline",
    } as const;
    upsertBenchmarkRecord(output, { ...identity, cleanup: "benchmark cleanup pending" });
    upsertBenchmarkRecord(output, { ...identity, cleanup: "all benchmark stacks destroyed" });
    const rows = readFileSync(output, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as unknown);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ phase: "history" });
    expect(rows[1]).toMatchObject({ cleanup: "all benchmark stacks destroyed" });
    expect(completedSampleIds(output, "run", ["cold-create"])).toEqual(new Set(["sample"]));
  });
});
