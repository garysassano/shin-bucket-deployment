import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
import { runCommand } from "../../benchmarks/src/execution";
import {
  type BenchmarkSourceMetadata,
  packageIntegrity,
  sourceStatusLines,
} from "../../benchmarks/src/metadata";
import {
  benchmarkMethodologyVersion,
  isCanonicalBenchmarkRecord,
  selectBenchmarkRun,
} from "../../benchmarks/src/model";
import { completedSampleIds, upsertBenchmarkRecord } from "../../benchmarks/src/persistence";
import { createBenchmarkPlan, wallClockCapReached } from "../../benchmarks/src/plan";
import { openResumeSession } from "../../benchmarks/src/resume";
import { validateMethodologyV2Run } from "../../benchmarks/src/validation";

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

  test("rejects non-opaque run identities", () => {
    expect(() => parseBenchmarkRunOptions(["--run-id", "friendly-label"])).toThrow("UUID");
  });

  test("plans repetitions sequentially and deduplicates AWS across Shin parallel settings", () => {
    const options: BenchmarkRunOptions = {
      ...parseBenchmarkRunOptions([
        "--run-id",
        "00000000-0000-4000-a000-000000000001",
        "--repetitions",
        "2",
      ]),
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
    expect(plan.every((run) => /^[0-9a-f-]{36}$/.test(run.sampleId))).toBe(true);
  });

  test("stops before another stack when the wall-clock cap is reached", () => {
    expect(wallClockCapReached(1_000, 1, 60_999)).toBe(false);
    expect(wallClockCapReached(1_000, 1, 61_000)).toBe(true);
  });

  test("terminates an active command when the benchmark is interrupted", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-signal-"));
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    await expect(
      runCommand({
        command: process.execPath,
        args: ["-e", "setInterval(() => {}, 1000)"],
        logFile: join(dir, "child.log"),
        signal: controller.signal,
      }),
    ).rejects.toThrow("failed");
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
    expect(isCanonicalBenchmarkRecord(canonicalAwsRecord())).toBe(true);
    expect(() =>
      validateMethodologyV2Run([canonicalAwsRecord()], parseBenchmarkRunOptions([])),
    ).toThrow("missing planned sample/phase");
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

  test("binds resume to source, configuration, and runner-owned ledger changes", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "shin-benchmark-resume-"));
    const scratchRoot = join(repositoryRoot, "..", `scratch-${Date.now()}`);
    mkdirSync(scratchRoot, { recursive: true });
    const outputFile = join(repositoryRoot, "results.jsonl");
    const options: BenchmarkRunOptions = {
      ...parseBenchmarkRunOptions(["--run-id", "00000000-0000-4000-a000-000000000002"]),
      outputFile,
      scratchRoot,
    };
    const metadata = sourceMetadata();
    const first = openResumeSession({ options, sourceMetadata: metadata, repositoryRoot });
    expect(first.gitDirty).toBe(false);
    first.persist([{ runId: options.runId, phase: "pending" }]);

    const resumed = openResumeSession({
      options,
      sourceMetadata: { ...metadata, gitDirty: true, changedPaths: [" M results.jsonl"] },
      repositoryRoot,
    });
    expect(resumed.gitDirty).toBe(false);
    expect(() =>
      openResumeSession({
        options,
        sourceMetadata: { ...metadata, providerBootstrapSha256: "b".repeat(64) },
        repositoryRoot,
      }),
    ).toThrow("identity mismatch");
    expect(() =>
      openResumeSession({
        options: { ...options, destinationPrefix: "different" },
        sourceMetadata: metadata,
        repositoryRoot,
      }),
    ).toThrow("identity mismatch");
    expect(() =>
      openResumeSession({
        options: { ...options, startRepetition: 2, repetitions: 5 },
        sourceMetadata: metadata,
        repositoryRoot,
      }),
    ).toThrow("outside the canonical");
    writeFileSync(outputFile, `${readFileSync(outputFile, "utf8")}{}\n`);
    expect(() => openResumeSession({ options, sourceMetadata: metadata, repositoryRoot })).toThrow(
      "changed outside",
    );
  });
});

function sourceMetadata(): BenchmarkSourceMetadata {
  return {
    commit: "commit",
    subject: "subject",
    gitDirty: false,
    changedPaths: [],
    providerPackageName: "shin-bucket-deployment",
    providerPackageVersion: "1.0.0",
    cdkCliVersion: "1.0.0",
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    providerBootstrapSha256: "a".repeat(64),
  };
}

function canonicalAwsRecord() {
  return {
    resultSchemaVersion: 2,
    methodologyVersion: 2,
    runId: "00000000-0000-4000-a000-000000000001",
    sampleId: "00000000-0000-5000-a000-000000000001",
    snapshotDate: "2026-01-01",
    repetition: 1,
    providerPackageName: "aws-cdk-lib",
    providerPackageVersion: "1.0.0",
    providerArchitecture: "arm64",
    providerCodeSha256: "code",
    gitDirty: false,
    cdkCliVersion: "1.0.0",
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    executionEnvironmentFresh: true,
    memoryMeasurementScope: "phase-local" as const,
    region: "eu-central-1",
    implementation: "aws",
    profile: "tiny-many",
    memoryMb: 1024,
    parallel: null,
    phase: "cold-create",
    state: "baseline",
    fileCount: 1,
    totalBytes: 1,
    cdkDeploySeconds: 1,
    localWallSeconds: 1,
    providerDurationSeconds: 1,
    billedDurationSeconds: 1,
    maxMemoryMb: 1,
    providerInvoked: true,
    cleanup: "all benchmark stacks destroyed",
  };
}
