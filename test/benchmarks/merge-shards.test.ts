import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import { mergeBenchmarkShards } from "../../benchmarks/src/merge-shards";
import type { BenchmarkSourceMetadata } from "../../benchmarks/src/metadata";
import type { BenchmarkRunRecord, BenchmarkSampleRecord } from "../../benchmarks/src/model";
import { createBenchmarkPlan } from "../../benchmarks/src/plan";
import { openResumeSession } from "../../benchmarks/src/resume";
import { canonicalRecord, canonicalRuns } from "../support/benchmark-records";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("benchmark repetition shard merge", () => {
  test("merges all five repetitions deterministically into publishable evidence", () => {
    const fixture = createShards(5);
    const outputFile = join(fixture.root, "merged", "results.jsonl");
    const scratchRoot = join(fixture.root, "merged", "scratch");

    expect(
      mergeBenchmarkShards({
        configFile: fixture.configFile,
        inputDirectory: fixture.shardsDirectory,
        outputFile,
        runId: fixture.runId,
        scratchRoot,
      }),
    ).toEqual({ repetitions: 5, runs: 2, samples: 40 });
    const firstResults = readFileSync(outputFile, "utf8");
    const firstRuns = readFileSync(join(fixture.root, "merged", "runs.jsonl"), "utf8");

    mergeBenchmarkShards({
      configFile: fixture.configFile,
      inputDirectory: fixture.shardsDirectory,
      outputFile,
      runId: fixture.runId,
      scratchRoot,
    });
    expect(readFileSync(outputFile, "utf8")).toBe(firstResults);
    expect(readFileSync(join(fixture.root, "merged", "runs.jsonl"), "utf8")).toBe(firstRuns);
  });

  test("rejects an incomplete set of repetition artifacts", () => {
    const fixture = createShards(4);
    expect(() =>
      mergeBenchmarkShards({
        configFile: fixture.configFile,
        inputDirectory: fixture.shardsDirectory,
        outputFile: join(fixture.root, "merged", "results.jsonl"),
        runId: fixture.runId,
        scratchRoot: join(fixture.root, "merged", "scratch"),
      }),
    ).toThrow("five independently completed repetition shards");
  });

  test("retained failure evidence cannot satisfy the five-repetition publication gate", () => {
    const fixture = createShards(5);
    rmSync(join(fixture.shardsDirectory, "repetition-5", "results.jsonl"));
    expect(() =>
      mergeBenchmarkShards({
        configFile: fixture.configFile,
        inputDirectory: fixture.shardsDirectory,
        outputFile: join(fixture.root, "merged", "results.jsonl"),
        runId: fixture.runId,
        scratchRoot: join(fixture.root, "merged", "scratch"),
      }),
    ).toThrow("does not contain the exact sanitized set");
  });

  test("all five artifacts still require every planned phase", () => {
    const fixture = createShards(5, true);
    expect(() =>
      mergeBenchmarkShards({
        configFile: fixture.configFile,
        inputDirectory: fixture.shardsDirectory,
        outputFile: join(fixture.root, "merged", "results.jsonl"),
        runId: fixture.runId,
        scratchRoot: join(fixture.root, "merged", "scratch"),
      }),
    ).toThrow("missing planned sample/phase");
  });
});

function createShards(
  count: number,
  incompleteFinalShard = false,
): {
  readonly configFile: string;
  readonly root: string;
  readonly runId: string;
  readonly shardsDirectory: string;
} {
  const root = mkdtempSync(join(tmpdir(), "shin-benchmark-shards-"));
  temporaryDirectories.push(root);
  const shardsDirectory = join(root, "shards");
  mkdirSync(shardsDirectory, { recursive: true });
  const configFile = join(root, "config.json");
  writeFileSync(
    configFile,
    `${JSON.stringify({
      repetitions: 5,
      repetitionParallelism: 5,
      concurrency: 1,
      assetProfiles: ["tiny-many"],
      implementations: ["shin", "aws"],
      lambdaConfigs: [{ memoryMb: 1024, parallel: 32 }],
    })}\n`,
  );
  const runId = randomUUID();
  const metadata = sourceMetadata();

  for (let repetition = 1; repetition <= count; repetition += 1) {
    const shardDirectory = join(shardsDirectory, `repetition-${repetition}`);
    mkdirSync(shardDirectory, { recursive: true });
    const outputFile = join(shardDirectory, "results.jsonl");
    const options = parseBenchmarkRunOptions([
      "--config",
      configFile,
      "--run-id",
      runId,
      "--snapshot-date",
      "2026-08-27",
      "--start-repetition",
      String(repetition),
      "--repetitions",
      "1",
      "--approved-through-repetition",
      "5",
      "--output-file",
      outputFile,
      "--scratch-root",
      shardDirectory,
    ]);
    const samples = createBenchmarkPlan(options).flatMap((sample) =>
      options.phases.map((phase) => canonicalRecord(options, sample, phase)),
    ) as BenchmarkSampleRecord[];
    const runs = canonicalRuns(options) as BenchmarkRunRecord[];
    const session = openResumeSession({
      options,
      sourceMetadata: metadata,
      repositoryRoot: root,
    });
    try {
      session.persist(
        incompleteFinalShard && repetition === count ? samples.slice(1) : samples,
        "destroyed",
        runs,
      );
    } finally {
      session.close();
    }
  }
  return { configFile, root, runId, shardsDirectory };
}

function sourceMetadata(): BenchmarkSourceMetadata {
  return {
    commit: "9".repeat(40),
    subject: "subject",
    gitDirty: false,
    sourceTreeSha256: "3".repeat(64),
    changedPaths: [],
    providerPackageName: "shin-bucket-deployment",
    providerPackageVersion: "1.0.0",
    cdkCliVersion: "1.0.0",
    cdkCliInstalledSha256: "c".repeat(64),
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    awsCdkLibInstalledSha256: "d".repeat(64),
    constructsInstalledSha256: "e".repeat(64),
    dependencyLockSha256: "1".repeat(64),
    applicationBuildSha256: "2".repeat(64),
    installedDependenciesSha256: "7".repeat(64),
    nodeVersion: "v24.0.0",
    pnpmVersion: "11.0.0",
    executionEnvironmentSha256: "8".repeat(64),
    providerBootstrapSha256: "a".repeat(64),
    providerBootstrapArchiveSha256: "a".repeat(64),
    providerBootstrapProvenanceSha256: "4".repeat(64),
    providerBootstrapBuildDirty: false,
    providerBootstrapCargoVersion: "cargo 1.0.0",
    providerBootstrapRustcVersion: "rustc 1.0.0",
    providerBootstrapCargoLambdaVersion: "cargo-lambda 1.0.0",
    providerBootstrapZigVersion: "1.0.0",
    providerBootstrapBuildToolchainSha256: "6".repeat(64),
    providerBootstrapBuildEnvironmentSha256: "5".repeat(64),
    // Independent fixtures must not contend on the account/region run lock.
    credentialAccountSha256: randomBytes(32).toString("hex"),
    credentialIdentitySha256: "4".repeat(64),
  };
}
