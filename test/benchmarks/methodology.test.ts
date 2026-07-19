import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  aggregateMetric,
  assertCompleteSamples,
  comparisonGroupKey,
  summarize,
} from "../../benchmarks/src/aggregate";
import { parseCliOptions } from "../../benchmarks/src/cli";
import {
  type BenchmarkRunOptions,
  assertBenchmarkExecutionAuthorized,
  benchmarkConfigurationSha256,
  parseBenchmarkRunOptions,
} from "../../benchmarks/src/config";
import { runCommand } from "../../benchmarks/src/execution";
import {
  type BenchmarkSourceMetadata,
  assertBenchmarkSourceMetadataUnchanged,
  assertBootstrapBuildProvenance,
  packageIntegrity,
  sourceStatusLines,
} from "../../benchmarks/src/metadata";
import {
  type BenchmarkResultRecord,
  benchmarkMethodologyVersion,
  isCanonicalBenchmarkRecord,
  methodologyV2RecordErrors,
  readBenchmarkResultRecords,
  selectBenchmarkRun,
} from "../../benchmarks/src/model";
import { completedSampleIds, upsertBenchmarkRecord } from "../../benchmarks/src/persistence";
import { createBenchmarkPlan, wallClockCapReached } from "../../benchmarks/src/plan";
import { openResumeSession } from "../../benchmarks/src/resume";
import {
  assertPreexistingStackMayBeRemoved,
  assertPreservedStackWasRemoved,
  assertProviderRuntimeMetadata,
  benchmarkDeployArgs,
  benchmarkProviderBuildArgs,
  benchmarkStackCleanupDisposition,
  benchmarkStackTags,
  failedPhaseEvidencePaths,
  providerLogGroupName,
  readPreservationManifest,
  removePreservationManifest,
  runWithFailedDeployEvidence,
  writePreservationManifest,
} from "../../benchmarks/src/run-assets-comparison";
import {
  selectValidatedBenchmarkPreview,
  selectValidatedBenchmarkRun,
  validateMethodologyV2Run,
} from "../../benchmarks/src/validation";

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
    expect(options).toMatchObject({
      methodologyVersion: 2,
      repetitions: 5,
      concurrency: 1,
      preserveOnFailure: false,
      detailedFailureDiagnostics: true,
    });
    expect(options.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => assertBenchmarkExecutionAuthorized(options)).toThrow("wall-clock cap");
  });

  test("parses failed-stack preservation as an execution control", () => {
    const preserved = parseBenchmarkRunOptions(["--preserve-on-failure", "true"]);
    expect(preserved.preserveOnFailure).toBe(true);
    expect(() => parseBenchmarkRunOptions(["--preserve-on-failure", "sometimes"])).toThrow(
      "true or false",
    );

    const baseline = parseBenchmarkRunOptions(["--run-id", "00000000-0000-4000-a000-000000000015"]);
    expect(benchmarkConfigurationSha256({ ...baseline, preserveOnFailure: true })).toBe(
      benchmarkConfigurationSha256(baseline),
    );
  });

  test("allows diagnostics-off only as an explicit methodology-v1 control", () => {
    const disabled = parseBenchmarkRunOptions([
      "--methodology-version",
      "1",
      "--detailed-failure-diagnostics",
      "false",
    ]);
    expect(disabled.detailedFailureDiagnostics).toBe(false);
    expect(() => parseBenchmarkRunOptions(["--detailed-failure-diagnostics", "false"])).toThrow(
      "Methodology-v2 benchmarks require detailed failure diagnostics",
    );
    expect(() =>
      parseBenchmarkRunOptions([
        "--methodology-version",
        "1",
        "--detailed-failure-diagnostics",
        "sometimes",
      ]),
    ).toThrow("true or false");

    const enabled = parseBenchmarkRunOptions([
      "--methodology-version",
      "1",
      "--run-id",
      "00000000-0000-4000-a000-000000000017",
    ]);
    expect(benchmarkConfigurationSha256(disabled)).not.toBe(benchmarkConfigurationSha256(enabled));
  });

  test("selects clean or current-tree provider provenance by methodology", () => {
    expect(
      benchmarkProviderBuildArgs({
        methodologyVersion: 2,
        outputFile: "/tmp/methodology-v2.jsonl",
      }),
    ).toEqual([
      "scripts/build-bootstrap.mjs",
      "--benchmark",
      "--evidence-output",
      "/tmp/methodology-v2.jsonl",
      "arm64",
    ]);
    expect(
      benchmarkProviderBuildArgs({
        methodologyVersion: 1,
        outputFile: "/tmp/methodology-v1.jsonl",
      }),
    ).toEqual([
      "scripts/build-bootstrap.mjs",
      "--benchmark-current-tree",
      "--evidence-output",
      "/tmp/methodology-v1.jsonl",
      "arm64",
    ]);
  });

  test("arms, transitions, parses, and removes scratch-only preservation manifests", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-preservation-"));
    const manifestFile = join(dir, "preserved-stack.json");
    const base = {
      schemaVersion: 1 as const,
      stackName: "benchmark-stack",
      region: "eu-central-1",
      runId: "00000000-0000-4000-a000-000000000001",
      sampleId: "00000000-0000-5000-a000-000000000001",
      implementation: "shin" as const,
      assetProfile: "large-few",
      memoryMb: 1024,
      parallel: 32,
      sourceWindowBytes: null,
    };

    writePreservationManifest(manifestFile, { ...base, status: "preservation-intent" });
    expect(readPreservationManifest(manifestFile)).toEqual({
      ...base,
      status: "preservation-intent",
    });
    writePreservationManifest(manifestFile, {
      ...base,
      status: "preserved-after-failure",
    });
    expect(readPreservationManifest(manifestFile).status).toBe("preserved-after-failure");
    expect(() => assertPreexistingStackMayBeRemoved(true, manifestFile)).toThrow(
      "refusing automatic deletion",
    );
    expect(() => assertPreexistingStackMayBeRemoved(false, manifestFile)).not.toThrow();

    removePreservationManifest(manifestFile);
    expect(existsSync(manifestFile)).toBe(false);
  });

  test("rejects malformed preservation manifests", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-preservation-invalid-"));
    const manifestFile = join(dir, "preserved-stack.json");
    writeFileSync(
      manifestFile,
      JSON.stringify({ schemaVersion: 1, status: "unexpected", stackName: "stack" }),
    );
    expect(() => readPreservationManifest(manifestFile)).toThrow("Invalid preserved-stack");
  });

  test("resume refuses a preserved stack and clears intent only after verified absence", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-preservation-resume-"));
    const manifestFile = join(dir, "preserved-stack.json");
    writePreservationManifest(manifestFile, {
      schemaVersion: 1,
      status: "preservation-intent",
      stackName: "benchmark-stack",
      region: "eu-central-1",
      runId: "run",
      sampleId: "sample",
      implementation: "shin",
      assetProfile: "large-few",
      memoryMb: 1024,
      parallel: 32,
      sourceWindowBytes: 134217728,
    });
    const controller = new AbortController();
    await expect(
      assertPreservedStackWasRemoved({
        manifestFile,
        expectedStackName: "benchmark-stack",
        expectedRegion: "eu-central-1",
        signal: controller.signal,
        describe: async () => 0,
      }),
    ).rejects.toThrow("still preserved");
    expect(existsSync(manifestFile)).toBe(true);

    await expect(
      assertPreservedStackWasRemoved({
        manifestFile,
        expectedStackName: "benchmark-stack",
        expectedRegion: "eu-central-1",
        signal: controller.signal,
        describe: async (_stack, _region, outputFile) => {
          writeFileSync(outputFile, "verified missing");
          return 255;
        },
        assertNotFound: (outputFile, stackName) => {
          expect(stackName).toBe("benchmark-stack");
          expect(readFileSync(outputFile, "utf8")).toBe("verified missing");
        },
      }),
    ).resolves.toBeUndefined();
    expect(existsSync(manifestFile)).toBe(false);
  });

  test("missing preservation manifest is a no-op but a preexisting stack fails closed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-preservation-missing-"));
    const manifestFile = join(dir, "preserved-stack.json");
    await expect(
      assertPreservedStackWasRemoved({
        manifestFile,
        expectedStackName: "benchmark-stack",
        expectedRegion: "eu-central-1",
        signal: new AbortController().signal,
        describe: async () => {
          throw new Error("must not describe without a manifest");
        },
      }),
    ).resolves.toBeUndefined();
    expect(() => assertPreexistingStackMayBeRemoved(true, manifestFile)).toThrow(
      "refusing automatic deletion",
    );
  });

  test("requires explicit approval for the smoke and repetitions 2-5", () => {
    const base = [
      "--run-id",
      "00000000-0000-4000-a000-000000000010",
      "--max-wall-clock-minutes",
      "60",
    ];
    expect(() =>
      assertBenchmarkExecutionAuthorized(
        parseBenchmarkRunOptions([...base, "--start-repetition", "1", "--repetitions", "1"]),
      ),
    ).not.toThrow();
    expect(() =>
      assertBenchmarkExecutionAuthorized(
        parseBenchmarkRunOptions([...base, "--start-repetition", "1", "--repetitions", "5"]),
      ),
    ).toThrow("approved");
    expect(() =>
      assertBenchmarkExecutionAuthorized(
        parseBenchmarkRunOptions([
          ...base,
          "--start-repetition",
          "2",
          "--repetitions",
          "4",
          "--approved-through-repetition",
          "5",
        ]),
      ),
    ).not.toThrow();
  });

  test("configuration identity covers measurement inputs but not execution controls", () => {
    const base = parseBenchmarkRunOptions([
      "--run-id",
      "00000000-0000-4000-a000-000000000011",
      "--max-wall-clock-minutes",
      "60",
    ]);
    const digest = benchmarkConfigurationSha256(base);
    expect(
      benchmarkConfigurationSha256({
        ...base,
        runId: "00000000-0000-4000-a000-000000000012",
        runToken: "00000000-0000-4000-a000-000000000012",
        startRepetition: 2,
        repetitions: 4,
        approvedThroughRepetition: 5,
        maxWallClockMinutes: 120,
        outputFile: "other.jsonl",
        scratchRoot: "/tmp/other",
      }),
    ).toBe(digest);
    expect(benchmarkConfigurationSha256({ ...base, destinationPrefix: "other" })).not.toBe(digest);
    expect(benchmarkConfigurationSha256({ ...base, phases: [...base.phases].reverse() })).not.toBe(
      digest,
    );
    expect(
      benchmarkConfigurationSha256({
        ...base,
        lambdaConfigs: [{ memoryMb: 1024, parallel: 32, sourceWindowBytes: null }],
      }),
    ).not.toBe(digest);
    expect(
      benchmarkConfigurationSha256({
        ...base,
        lambdaConfigs: [{ memoryMb: 1024, parallel: 32, sourceWindowBytes: 134217728 }],
      }),
    ).not.toBe(digest);
  });

  test("rejects benchmark concurrency above one", () => {
    expect(() => parseBenchmarkRunOptions(["--concurrency", "2"])).toThrow("sequential execution");
  });

  test("rejects non-opaque run identities", () => {
    expect(() => parseBenchmarkRunOptions(["--run-id", "friendly-label"])).toThrow("UUID");
  });

  test("rejects invalid snapshot dates and evidence labels", () => {
    expect(() => parseBenchmarkRunOptions(["--snapshot-date", "2026-02-30"])).toThrow("YYYY-MM-DD");
    expect(() => parseBenchmarkRunOptions(["--decision-run-id", "contains spaces"])).toThrow(
      "unsupported characters",
    );
    expect(() => parseBenchmarkRunOptions(["--comparison-variant", "variant/one"])).toThrow(
      "unsupported characters",
    );
  });

  test("plans repetitions sequentially and deduplicates AWS across Shin concurrency settings", () => {
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

  test("plans adaptive and 128 MiB source windows as distinct Shin samples", () => {
    const options: BenchmarkRunOptions = {
      ...parseBenchmarkRunOptions([
        "--run-id",
        "00000000-0000-4000-a000-000000000016",
        "--repetitions",
        "1",
      ]),
      assetProfiles: ["large-few"],
      lambdaConfigs: [
        { memoryMb: 1024, parallel: 32, sourceWindowBytes: null },
        { memoryMb: 1024, parallel: 32, sourceWindowBytes: 134217728 },
      ],
      implementations: ["shin", "aws"],
    };

    const plan = createBenchmarkPlan(options);
    expect(plan).toHaveLength(3);
    expect(plan.map((run) => [run.implementation, run.parallel, run.sourceWindowBytes])).toEqual([
      ["shin", 32, null],
      ["aws", null, undefined],
      ["shin", 32, 134217728],
    ]);
    expect(new Set(plan.map((run) => run.sampleId)).size).toBe(3);

    const phase = options.phases[0];
    if (phase === undefined) throw new Error("diagnostic plan requires a cold-create phase");
    const shinRecords = plan
      .filter((sample) => sample.implementation === "shin")
      .map((sample) => canonicalRecord(options, sample, phase));
    expect(shinRecords.map((record) => record.sourceWindowBytes)).toEqual([null, 134217728]);
    expect(
      aggregateMetric(shinRecords, "providerDurationSeconds").map((aggregate) => [
        aggregate.sourceWindowBytes,
        aggregate.count,
      ]),
    ).toEqual([
      [null, 1],
      [134217728, 1],
    ]);
  });

  test("stops before another stack when the wall-clock cap is reached", () => {
    expect(wallClockCapReached(1_000, 1, 60_999)).toBe(false);
    expect(wallClockCapReached(1_000, 1, 61_000)).toBe(true);
  });

  test("uses the provider log group returned by Lambda configuration", () => {
    expect(providerLogGroupName({ LoggingConfig: { LogGroup: "/benchmark/provider-logs" } })).toBe(
      "/benchmark/provider-logs",
    );
    expect(() => providerLogGroupName({})).toThrow("CloudWatch log group");
  });

  test("passes each CDK stack tag with its own option", () => {
    expect(benchmarkStackTags("run", "sample")).toEqual([
      "--tags",
      "ShinBenchmarkRun=run",
      "--tags",
      "ShinBenchmarkSample=sample",
    ]);
  });

  test("retains a failed benchmark stack until telemetry capture and owned cleanup", () => {
    expect(benchmarkDeployArgs("cdk.out", "run", "sample")).toContain("--no-rollback");
    expect(
      benchmarkStackCleanupDisposition({
        stackExists: true,
        runFailed: true,
        preserveOnFailure: true,
      }),
    ).toBe("preserve");
    expect(
      benchmarkStackCleanupDisposition({
        stackExists: true,
        runFailed: false,
        preserveOnFailure: true,
      }),
    ).toBe("delete");
    expect(
      benchmarkStackCleanupDisposition({
        stackExists: false,
        runFailed: true,
        preserveOnFailure: true,
      }),
    ).toBe("verify-absent");
  });

  test("enforces exact deployed provider runtime contracts", () => {
    const base = {
      codeSha256: Buffer.from("a".repeat(64), "hex").toString("base64"),
      logGroup: "/benchmark/provider-logs",
      memorySizeMb: 1024,
      executionEnvironmentToken: "run:1:cold-create",
      executionEnvironmentFresh: true,
      detailedFailureDiagnosticsEnvironment: undefined,
    };
    expect(() =>
      assertProviderRuntimeMetadata({
        implementation: "shin",
        memoryMb: 1024,
        executionEnvironmentToken: "run:1:cold-create",
        providerBootstrapArchiveSha256: "a".repeat(64),
        detailedFailureDiagnostics: true,
        metadata: {
          ...base,
          architecture: "arm64",
          runtime: "provided.al2023",
          handler: "bootstrap",
          detailedFailureDiagnosticsEnvironment: "true",
        },
      }),
    ).not.toThrow();

    for (const value of [undefined, "false", "TRUE"] as const) {
      expect(() =>
        assertProviderRuntimeMetadata({
          implementation: "shin",
          memoryMb: 1024,
          executionEnvironmentToken: "run:1:cold-create",
          providerBootstrapArchiveSha256: "a".repeat(64),
          detailedFailureDiagnostics: true,
          metadata: {
            ...base,
            architecture: "arm64",
            runtime: "provided.al2023",
            handler: "bootstrap",
            detailedFailureDiagnosticsEnvironment: value,
          },
        }),
      ).toThrow("detailed failure diagnostics");
    }

    expect(() =>
      assertProviderRuntimeMetadata({
        implementation: "shin",
        memoryMb: 1024,
        executionEnvironmentToken: "run:1:cold-create",
        providerBootstrapArchiveSha256: "a".repeat(64),
        detailedFailureDiagnostics: false,
        metadata: {
          ...base,
          architecture: "arm64",
          runtime: "provided.al2023",
          handler: "bootstrap",
          detailedFailureDiagnosticsEnvironment: undefined,
        },
      }),
    ).not.toThrow();

    expect(() =>
      assertProviderRuntimeMetadata({
        implementation: "aws",
        memoryMb: 1024,
        executionEnvironmentToken: "run:1:cold-create",
        providerBootstrapArchiveSha256: "a".repeat(64),
        detailedFailureDiagnostics: true,
        metadata: {
          ...base,
          architecture: "x86_64",
          runtime: "python3.13",
          handler: "index.handler",
          detailedFailureDiagnosticsEnvironment: "true",
        },
      }),
    ).toThrow("unexpectedly enables Shin diagnostics");
    expect(() =>
      assertProviderRuntimeMetadata({
        implementation: "aws",
        memoryMb: 1024,
        executionEnvironmentToken: "run:1:cold-create",
        providerBootstrapArchiveSha256: "a".repeat(64),
        detailedFailureDiagnostics: true,
        metadata: {
          ...base,
          architecture: "arm64",
          runtime: "python3.13",
          handler: "index.handler",
          detailedFailureDiagnosticsEnvironment: undefined,
        },
      }),
    ).toThrow("upstream provider runtime");
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

  test("preserves every prior command log when a scratch path is reused", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-attempt-log-"));
    const logFile = join(dir, "cold-create.deploy.log");

    for (const value of ["first", "second", "third"]) {
      await runCommand({
        command: process.execPath,
        args: ["-e", `process.stdout.write(${JSON.stringify(value)})`],
        logFile,
        quiet: true,
        appendElapsed: false,
      });
    }

    expect(readFileSync(logFile, "utf8")).toBe("third");
    expect(readFileSync(join(dir, "cold-create.deploy.attempt-1.log"), "utf8")).toBe("first");
    expect(readFileSync(join(dir, "cold-create.deploy.attempt-2.log"), "utf8")).toBe("second");
    expect(existsSync(join(dir, "cold-create.deploy.attempt-3.log"))).toBe(false);
  });

  test("captures failed-deploy evidence before rethrowing the deploy error", async () => {
    const order: string[] = [];
    const deployError = new Error("deploy failed");

    await expect(
      runWithFailedDeployEvidence({
        deploy: async () => {
          order.push("deploy");
          throw deployError;
        },
        capture: async () => {
          order.push("capture");
        },
      }),
    ).rejects.toBe(deployError);
    expect(order).toEqual(["deploy", "capture"]);
  });

  test("retains both failed-deploy and telemetry errors", async () => {
    const deployError = new Error("deploy failed");

    await expect(
      runWithFailedDeployEvidence({
        deploy: async () => {
          throw deployError;
        },
        capture: async () => {
          throw new Error("telemetry failed");
        },
      }),
    ).rejects.toMatchObject({
      message: "deploy failed; failed benchmark telemetry capture also failed: telemetry failed",
      cause: deployError,
    });
  });

  test("uses failure-specific scratch paths for failed-deploy telemetry", () => {
    expect(failedPhaseEvidencePaths("/scratch/sample", "cold-create")).toEqual({
      resources: "/scratch/sample/cold-create.failed.resources.json",
      function: "/scratch/sample/cold-create.failed.function.json",
      report: "/scratch/sample/cold-create.failed.report.json",
      events: "/scratch/sample/cold-create.failed.events.json",
      putObjectFailures: "/scratch/sample/cold-create.failed.put-object-failures.json",
      summary: "/scratch/sample/cold-create.failed.summary.json",
    });
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
    const aws = comparisonGroupKey({ profile: "tiny", phase: "cold", memoryMb: 1024 });
    const adaptive = comparisonGroupKey({
      profile: "tiny",
      phase: "cold",
      memoryMb: 1024,
      sourceWindowBytes: null,
    });
    const explicit = comparisonGroupKey({
      profile: "tiny",
      phase: "cold",
      memoryMb: 1024,
      sourceWindowBytes: 134217728,
    });
    expect(aws).toBe(["tiny", "cold", 1024].join("\0"));
    expect(adaptive).toBe(aws);
    expect(explicit).toBe(aws);
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

  test("keeps committed methodology-v2 rows without source-window metadata valid", () => {
    const rows = readBenchmarkResultRecords(
      join(process.cwd(), "benchmarks", "results.jsonl"),
    ).filter((record) => record.methodologyVersion === 2);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((record) => !Object.hasOwn(record, "sourceWindowBytes"))).toBe(true);
    expect(rows.flatMap((record) => methodologyV2RecordErrors(record))).toEqual([]);
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

  test("preserves porcelain status columns when filtering the active ledger", () => {
    expect(
      sourceStatusLines(" M benchmarks/results.jsonl\n", process.cwd(), "benchmarks/results.jsonl"),
    ).toEqual([]);
  });

  test("rejects source, dependency, bootstrap, account, or dirty-state drift", () => {
    const repositoryRoot = "/repository";
    const expected = sourceMetadata();
    expect(() =>
      assertBenchmarkSourceMetadataUnchanged({
        expected,
        current: { ...expected, changedPaths: [" M src/index.ts"], gitDirty: true },
        repositoryRoot,
        evidenceOutputFile: "benchmarks/results.jsonl",
      }),
    ).toThrow("became dirty");
    expect(() =>
      assertBenchmarkSourceMetadataUnchanged({
        expected,
        current: { ...expected, credentialAccountSha256: "f".repeat(64) },
        repositoryRoot,
        evidenceOutputFile: "benchmarks/results.jsonl",
      }),
    ).toThrow("credential account changed");
    expect(() =>
      assertBenchmarkSourceMetadataUnchanged({
        expected,
        current: {
          ...expected,
          changedPaths: [" M benchmarks/results.jsonl"],
          gitDirty: true,
        },
        repositoryRoot,
        evidenceOutputFile: "benchmarks/results.jsonl",
      }),
    ).not.toThrow();
  });

  test("binds the ignored provider archive to source and toolchain provenance", () => {
    const expected = {
      schemaVersion: 1,
      architecture: "arm64",
      binaryName: "shin-bucket-deployment-handler",
      target: "aarch64-unknown-linux-gnu",
      sourceCommit: "commit",
      sourceDirty: false,
      sourceTreeSha256: "c".repeat(64),
      applicationBuildSha256: "7".repeat(64),
      cargoVersion: "cargo 1.0.0",
      rustcVersion: "rustc 1.0.0",
      cargoLambdaVersion: "cargo-lambda 1.0.0",
      zigVersion: "1.0.0",
      buildToolchainSha256: "8".repeat(64),
      buildEnvironmentSha256: "d".repeat(64),
      bootstrapSha256: "a".repeat(64),
      bootstrapArchiveSha256: "b".repeat(64),
    };
    const args = {
      provenance: expected,
      commit: "commit",
      sourceDirty: false,
      sourceTreeSha256: "c".repeat(64),
      applicationBuildSha256: "7".repeat(64),
      cargoVersion: "cargo 1.0.0",
      rustcVersion: "rustc 1.0.0",
      cargoLambdaVersion: "cargo-lambda 1.0.0",
      zigVersion: "1.0.0",
      buildToolchainSha256: "8".repeat(64),
      buildEnvironmentSha256: "d".repeat(64),
      bootstrapSha256: "a".repeat(64),
      bootstrapArchiveSha256: "b".repeat(64),
    };
    expect(() => assertBootstrapBuildProvenance(args)).not.toThrow();
    expect(() =>
      assertBootstrapBuildProvenance({
        ...args,
        provenance: { ...expected, sourceCommit: "other" },
      }),
    ).toThrow("provenance does not match");
    for (const provenance of [
      { ...expected, sourceTreeSha256: "e".repeat(64) },
      { ...expected, applicationBuildSha256: "6".repeat(64) },
      { ...expected, zigVersion: "2.0.0" },
      { ...expected, buildToolchainSha256: "9".repeat(64) },
      { ...expected, buildEnvironmentSha256: "f".repeat(64) },
    ]) {
      expect(() => assertBootstrapBuildProvenance({ ...args, provenance })).toThrow(
        "provenance does not match",
      );
    }
    expect(() =>
      assertBootstrapBuildProvenance({
        ...args,
        provenance: { ...expected, bootstrapArchiveSha256: "c".repeat(64) },
      }),
    ).toThrow("provenance does not match");
  });

  test("allows stable dirty methodology-v1 source but rejects drift", () => {
    const expected = {
      ...sourceMetadata(),
      gitDirty: true,
      changedPaths: [" M src/index.ts"],
    };
    expect(() =>
      assertBenchmarkSourceMetadataUnchanged({
        expected,
        current: expected,
        repositoryRoot: "/repository",
        evidenceOutputFile: "benchmarks/results.jsonl",
        requireClean: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertBenchmarkSourceMetadataUnchanged({
        expected,
        current: { ...expected, changedPaths: [" M src/other.ts"] },
        repositoryRoot: "/repository",
        evidenceOutputFile: "benchmarks/results.jsonl",
        requireClean: false,
      }),
    ).toThrow("source changes drifted");
    expect(() =>
      assertBenchmarkSourceMetadataUnchanged({
        expected,
        current: { ...expected, sourceTreeSha256: "0".repeat(64) },
        repositoryRoot: "/repository",
        evidenceOutputFile: "benchmarks/results.jsonl",
        requireClean: false,
      }),
    ).toThrow("source, dependencies, bootstrap, or credential account changed");
  });

  test("atomically upserts pending cleanup state without rewriting unrelated history", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-persistence-"));
    const output = join(dir, "results.jsonl");
    writeFileSync(output, `${JSON.stringify({ phase: "history", profile: "old" })}\n`);
    const identity = {
      methodologyVersion: 1,
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
    expect(completedSampleIds(output, "run", ["cold-create"], 1)).toEqual(new Set(["sample"]));
  });

  test("only resumes complete methodology-v2 samples with valid provenance", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-benchmark-completed-"));
    const output = join(dir, "results.jsonl");
    const record = canonicalAwsRecord();
    writeFileSync(output, `${JSON.stringify(record)}\n`);
    expect(completedSampleIds(output, record.runId, [record.phase], 2)).toEqual(
      new Set([record.sampleId]),
    );

    const { sourceTreeSha256: _sourceTreeSha256, ...invalid } = record;
    writeFileSync(output, `${JSON.stringify(invalid)}\n`);
    expect(() => completedSampleIds(output, record.runId, [record.phase], 2)).toThrow(
      "invalid sourceTreeSha256",
    );
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
    const manifest = JSON.parse(
      readFileSync(join(scratchRoot, "benchmark-run-manifest.json"), "utf8"),
    );
    expect(manifest).toMatchObject({
      identity: {
        version: 2,
        source: {
          sourceTreeSha256: metadata.sourceTreeSha256,
          providerBootstrapProvenanceSha256: metadata.providerBootstrapProvenanceSha256,
          providerBootstrapBuildDirty: false,
          providerBootstrapCargoVersion: metadata.providerBootstrapCargoVersion,
          providerBootstrapRustcVersion: metadata.providerBootstrapRustcVersion,
          providerBootstrapCargoLambdaVersion: metadata.providerBootstrapCargoLambdaVersion,
          providerBootstrapZigVersion: metadata.providerBootstrapZigVersion,
          providerBootstrapBuildToolchainSha256: metadata.providerBootstrapBuildToolchainSha256,
          providerBootstrapBuildEnvironmentSha256: metadata.providerBootstrapBuildEnvironmentSha256,
        },
      },
    });
    first.persist([{ runId: options.runId, phase: "pending" }]);
    expect(() => openResumeSession({ options, sourceMetadata: metadata, repositoryRoot })).toThrow(
      "lock already exists",
    );
    first.close();

    const resumed = openResumeSession({
      options,
      sourceMetadata: { ...metadata, gitDirty: true, changedPaths: [" M results.jsonl"] },
      repositoryRoot,
    });
    expect(resumed.gitDirty).toBe(false);
    resumed.close();
    expect(() =>
      openResumeSession({
        options,
        sourceMetadata: { ...metadata, providerBootstrapSha256: "b".repeat(64) },
        repositoryRoot,
      }),
    ).toThrow("identity mismatch");
    for (const [field, value] of [
      ["sourceTreeSha256", "0".repeat(64)],
      ["providerBootstrapProvenanceSha256", "1".repeat(64)],
      ["providerBootstrapBuildDirty", true],
      ["providerBootstrapCargoVersion", "cargo 2.0.0"],
      ["providerBootstrapRustcVersion", "rustc 2.0.0"],
      ["providerBootstrapCargoLambdaVersion", "cargo-lambda 2.0.0"],
      ["providerBootstrapZigVersion", "2.0.0"],
      ["providerBootstrapBuildToolchainSha256", "9".repeat(64)],
      ["providerBootstrapBuildEnvironmentSha256", "2".repeat(64)],
    ] as const) {
      expect(() =>
        openResumeSession({
          options,
          sourceMetadata: { ...metadata, [field]: value },
          repositoryRoot,
        }),
      ).toThrow("identity mismatch");
    }
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

  test("requires the recorded ledger digest for methodology-v2 publication", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "shin-benchmark-publication-"));
    const scratchRoot = join(repositoryRoot, "scratch");
    mkdirSync(scratchRoot, { recursive: true });
    const outputFile = join(repositoryRoot, "results.jsonl");
    const options: BenchmarkRunOptions = {
      ...parseBenchmarkRunOptions(["--run-id", "00000000-0000-4000-a000-000000000004"]),
      outputFile,
      scratchRoot,
    };
    const session = openResumeSession({
      options,
      sourceMetadata: sourceMetadata(),
      repositoryRoot,
    });
    session.persist([{ runId: options.runId, phase: "pending" }]);
    session.close();
    const records = createBenchmarkPlan(options).flatMap((sample) =>
      options.phases.map((phase) => canonicalRecord(options, sample, phase)),
    );
    sessionWrite(records);
    expect(() =>
      selectValidatedBenchmarkRun({
        records,
        methodologyVersion: 2,
        runId: options.runId,
        inputFile: outputFile,
        scratchRoot,
      }),
    ).toThrow("changed after its recorded run session");

    function sessionWrite(nextRecords: readonly BenchmarkResultRecord[]): void {
      writeFileSync(
        outputFile,
        `${nextRecords.map((record) => JSON.stringify(record)).join("\n")}\n`,
      );
    }
  });

  test("reconstructs complete and preview validation from recorded run metadata", () => {
    const runId = "00000000-0000-4000-a000-000000000003";
    const options = parseBenchmarkRunOptions([
      "--config",
      "benchmarks/configs/methodology-v2-1024-32.json",
      "--run-id",
      runId,
      "--snapshot-date",
      "2026-01-01",
      "--decision-run-id",
      "ci-decision",
      "--comparison-variant",
      "current",
    ]);
    const records = createBenchmarkPlan(options).flatMap((sample) =>
      options.phases.map((phase) => canonicalRecord(options, sample, phase)),
    );
    expect(selectValidatedBenchmarkRun({ records, methodologyVersion: 2, runId })).toHaveLength(80);
    const previewRecords = records.filter((record) => record.repetition === 1);
    expect(
      selectValidatedBenchmarkPreview({
        records: previewRecords,
        methodologyVersion: 2,
        runId,
      }),
    ).toHaveLength(16);
    expect(() =>
      selectValidatedBenchmarkRun({
        records: previewRecords,
        methodologyVersion: 2,
        runId,
      }),
    ).toThrow("missing planned sample/phase");
    expect(() =>
      selectValidatedBenchmarkPreview({
        records: previewRecords.slice(1),
        methodologyVersion: 2,
        runId,
      }),
    ).toThrow("incomplete preview sample/phase");
    expect(() =>
      selectValidatedBenchmarkRun({
        records: records.map((record, index) =>
          index === 0 ? { ...record, billedDurationSeconds: null } : record,
        ),
        methodologyVersion: 2,
        runId,
      }),
    ).toThrow("missing billedDurationSeconds");
    expect(() =>
      validateMethodologyV2Run(
        records.map((record, index) =>
          index === 0 ? { ...record, sourceTreeSha256: "0".repeat(64) } : record,
        ),
        options,
      ),
    ).toThrow("inconsistent run metadata field sourceTreeSha256");
    const firstShin = records.findIndex((record) => record.implementation === "shin");
    for (const [field, value] of [
      ["providerBootstrapProvenanceSha256", "0".repeat(64)],
      ["providerBootstrapBuildDirty", true],
      ["providerBootstrapCargoVersion", "cargo 2.0.0"],
      ["providerBootstrapRustcVersion", "rustc 2.0.0"],
      ["providerBootstrapCargoLambdaVersion", "cargo-lambda 2.0.0"],
      ["providerBootstrapZigVersion", "2.0.0"],
      ["providerBootstrapBuildToolchainSha256", "0".repeat(64)],
      ["providerBootstrapBuildEnvironmentSha256", "0".repeat(64)],
    ] as const) {
      const changed = records.map((record, index) =>
        index === firstShin ? { ...record, [field]: value } : record,
      ) as BenchmarkResultRecord[];
      expect(() => validateMethodologyV2Run(changed, options)).toThrow(
        `inconsistent Shin provider field ${field}`,
      );
    }
  });

  test("accepts a complete canonical ledger backed by its resume manifest", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "shin-benchmark-complete-publication-"));
    const outputFile = join(repositoryRoot, "results.jsonl");
    const scratchRoot = join(repositoryRoot, "scratch");
    const runId = "00000000-0000-4000-a000-000000000005";
    const options: BenchmarkRunOptions = {
      ...parseBenchmarkRunOptions([
        "--config",
        "benchmarks/configs/methodology-v2-1024-32.json",
        "--run-id",
        runId,
        "--snapshot-date",
        "2026-01-01",
        "--decision-run-id",
        "ci-decision",
        "--comparison-variant",
        "current",
      ]),
      outputFile,
      scratchRoot,
    };
    mkdirSync(scratchRoot, { recursive: true });
    const records = createBenchmarkPlan(options).flatMap((sample) =>
      options.phases.map((phase) => canonicalRecord(options, sample, phase)),
    );
    const session = openResumeSession({
      options,
      sourceMetadata: sourceMetadata(),
      repositoryRoot,
    });
    session.persist(records);
    session.close();

    expect(
      selectValidatedBenchmarkRun({
        records: readBenchmarkResultRecords(outputFile),
        methodologyVersion: 2,
        runId,
        configFile: "benchmarks/configs/methodology-v2-1024-32.json",
        inputFile: outputFile,
        scratchRoot,
      }),
    ).toHaveLength(80);
  });
});

function sourceMetadata(): BenchmarkSourceMetadata {
  return {
    commit: "commit",
    subject: "subject",
    gitDirty: false,
    sourceTreeSha256: "6".repeat(64),
    changedPaths: [],
    providerPackageName: "shin-bucket-deployment",
    providerPackageVersion: "1.0.0",
    cdkCliVersion: "1.0.0",
    cdkCliInstalledSha256: "c".repeat(64),
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    awsCdkLibInstalledSha256: "d".repeat(64),
    constructsInstalledSha256: "f".repeat(64),
    dependencyLockSha256: "1".repeat(64),
    applicationBuildSha256: "2".repeat(64),
    installedDependenciesSha256: "9".repeat(64),
    nodeVersion: "v24.0.0",
    pnpmVersion: "11.0.0",
    executionEnvironmentSha256: "0".repeat(64),
    providerBootstrapSha256: "a".repeat(64),
    providerBootstrapArchiveSha256: "3".repeat(64),
    providerBootstrapProvenanceSha256: "5".repeat(64),
    providerBootstrapBuildDirty: false,
    providerBootstrapCargoVersion: "cargo 1.0.0",
    providerBootstrapRustcVersion: "rustc 1.0.0",
    providerBootstrapCargoLambdaVersion: "cargo-lambda 1.0.0",
    providerBootstrapZigVersion: "1.0.0",
    providerBootstrapBuildToolchainSha256: "8".repeat(64),
    providerBootstrapBuildEnvironmentSha256: "7".repeat(64),
    credentialAccountSha256: "e".repeat(64),
    credentialIdentitySha256: "4".repeat(64),
  };
}

function canonicalAwsRecord() {
  const archiveSha256 = "a".repeat(64);
  return {
    resultSchemaVersion: 2,
    methodologyVersion: 2,
    runId: "00000000-0000-4000-a000-000000000001",
    sampleId: "00000000-0000-5000-a000-000000000001",
    snapshotDate: "2026-01-01",
    decisionRunId: null,
    comparisonVariant: null,
    repetition: 1,
    benchmarkConfigSha256: "1".repeat(64),
    assetManifestSha256: "2".repeat(64),
    dependencyLockSha256: "3".repeat(64),
    applicationBuildSha256: "4".repeat(64),
    installedDependenciesSha256: "6".repeat(64),
    nodeVersion: "v24.0.0",
    pnpmVersion: "11.0.0",
    executionEnvironmentSha256: "7".repeat(64),
    sourceTreeSha256: "5".repeat(64),
    providerImplementationCommit: null,
    providerImplementationSubject: null,
    providerPackageName: "aws-cdk-lib",
    providerPackageVersion: "1.0.0",
    providerArchitecture: "x86_64",
    providerRuntime: "python3.13",
    providerHandler: "index.handler",
    providerCodeSha256: codeSha256(archiveSha256),
    providerBootstrapSha256: null,
    providerBootstrapArchiveSha256: null,
    providerBootstrapProvenanceSha256: null,
    providerBootstrapBuildDirty: null,
    providerBootstrapCargoVersion: null,
    providerBootstrapRustcVersion: null,
    providerBootstrapCargoLambdaVersion: null,
    providerBootstrapZigVersion: null,
    providerBootstrapBuildToolchainSha256: null,
    providerBootstrapBuildEnvironmentSha256: null,
    gitDirty: false,
    cdkCliVersion: "1.0.0",
    cdkCliInstalledSha256: "c".repeat(64),
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    awsCdkLibInstalledSha256: "d".repeat(64),
    constructsInstalledSha256: "f".repeat(64),
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
    initDurationSeconds: 0.1,
    maxMemoryMb: 1,
    providerInvoked: true,
    cleanup: "all benchmark stacks destroyed",
    resultDocumentationCommit: null,
    notes: null,
    providerSummary: null,
  };
}

function canonicalRecord(
  options: BenchmarkRunOptions,
  sample: ReturnType<typeof createBenchmarkPlan>[number],
  phase: BenchmarkRunOptions["phases"][number],
) {
  const shin = sample.implementation === "shin";
  const archiveSha256 = shin ? "a".repeat(64) : "b".repeat(64);
  return {
    resultSchemaVersion: 2,
    methodologyVersion: 2,
    runId: options.runId,
    sampleId: sample.sampleId,
    snapshotDate: options.snapshotDate,
    decisionRunId: options.decisionRunId ?? null,
    comparisonVariant: options.comparisonVariant ?? null,
    repetition: sample.repetition,
    benchmarkConfigSha256: benchmarkConfigurationSha256(options),
    assetManifestSha256: assetManifestSha256(sample.assetProfile, phase.assetState),
    dependencyLockSha256: "1".repeat(64),
    applicationBuildSha256: "2".repeat(64),
    installedDependenciesSha256: "7".repeat(64),
    nodeVersion: "v24.0.0",
    pnpmVersion: "11.0.0",
    executionEnvironmentSha256: "8".repeat(64),
    sourceTreeSha256: "3".repeat(64),
    providerImplementationCommit: shin ? "9".repeat(40) : null,
    providerImplementationSubject: shin ? "subject" : null,
    providerPackageName: shin ? "shin-bucket-deployment" : "aws-cdk-lib",
    providerPackageVersion: "1.0.0",
    providerArchitecture: shin ? "arm64" : "x86_64",
    providerRuntime: shin ? "provided.al2023" : "python3.13",
    providerHandler: shin ? "bootstrap" : "index.handler",
    providerCodeSha256: codeSha256(archiveSha256),
    providerBootstrapSha256: shin ? "a".repeat(64) : null,
    providerBootstrapArchiveSha256: shin ? archiveSha256 : null,
    providerBootstrapProvenanceSha256: shin ? "4".repeat(64) : null,
    providerBootstrapBuildDirty: shin ? false : null,
    providerBootstrapCargoVersion: shin ? "cargo 1.0.0" : null,
    providerBootstrapRustcVersion: shin ? "rustc 1.0.0" : null,
    providerBootstrapCargoLambdaVersion: shin ? "cargo-lambda 1.0.0" : null,
    providerBootstrapZigVersion: shin ? "1.0.0" : null,
    providerBootstrapBuildToolchainSha256: shin ? "6".repeat(64) : null,
    providerBootstrapBuildEnvironmentSha256: shin ? "5".repeat(64) : null,
    gitDirty: false,
    cdkCliVersion: "1.0.0",
    cdkCliInstalledSha256: "c".repeat(64),
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    awsCdkLibInstalledSha256: "d".repeat(64),
    constructsInstalledSha256: "f".repeat(64),
    executionEnvironmentFresh: true,
    memoryMeasurementScope: "phase-local" as const,
    resultDocumentationCommit: null,
    region: options.region,
    implementation: sample.implementation,
    profile: sample.assetProfile,
    memoryMb: sample.memoryMb,
    parallel: sample.parallel,
    detailedFailureDiagnostics: shin ? options.detailedFailureDiagnostics : null,
    ...(Object.hasOwn(sample, "sourceWindowBytes")
      ? { sourceWindowBytes: sample.sourceWindowBytes ?? null }
      : {}),
    phase: phase.name,
    state: phase.assetState,
    fileCount: 1,
    totalBytes: 1,
    cdkDeploySeconds: 1,
    localWallSeconds: 1,
    providerDurationSeconds: 1,
    billedDurationSeconds: 1,
    initDurationSeconds: 0.1,
    maxMemoryMb: 1,
    providerInvoked: true,
    cleanup: "all benchmark stacks destroyed",
    notes: null,
    providerSummary: shin
      ? providerSummary(sample.memoryMb, sample.parallel as number, phase.name === "cold-create")
      : null,
  };
}

function providerSummary(memoryMb: number, parallel: number, create: boolean) {
  return {
    event: "shin_deployment_summary",
    schemaVersion: 4,
    requestType: create ? "Create" : "Update",
    deploymentStatus: "success",
    extract: true,
    destinationChecksumStrategy: "sse-s3-etag",
    deleteStaleObjectsOnDeployment: true,
    availableMemoryMb: memoryMb,
    maxParallelTransfers: parallel,
    detailedFailureDiagnosticsEnabled: true,
    durationMs: 1,
    phaseMs: zeroFields([
      "plan",
      "destinationList",
      "transfer",
      "delete",
      "cloudfront",
      "oldPrefixDelete",
      "callback",
    ]),
    counts: {
      ...zeroFields([
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
      skippedObjects: 1,
    },
    bytes: zeroFields(["sourceZip", "uploaded", "copied"]),
    transfer: zeroFields([
      "scheduledObjects",
      "completedObjects",
      "failedObjects",
      "cancelledObjects",
      "panickedObjects",
      "inFlightHighWater",
    ]),
    markerReplacement: {
      strategy: "planning-plus-retryable-stream",
      semantics: "leftmost-longest-non-recursive",
      plannedPassesPerUpload: 2,
      planningPasses: 0,
      uploadPasses: 0,
    },
    catalog: zeroFields([
      "trustedArchives",
      "untrustedArchives",
      "trustedEntries",
      "fallbackHashAttempts",
      "sparseSkips",
    ]),
    source: zeroFields([
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
    putObject: {
      ...zeroFields([
        "wireAttempts",
        "failedAttempts",
        "retryAttempts",
        "throttledAttempts",
        "retryWaitMs",
        "throttleCooldownWaits",
        "throttleCooldownWaitMs",
      ]),
      failuresBySdkErrorKind: {},
      failuresByServiceCode: {},
      failureStates: [],
      failureStateOverflowAttempts: 0,
    },
    deleteObject: zeroFields([
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

function zeroFields(names: readonly string[]): Record<string, number> {
  return Object.fromEntries(names.map((name) => [name, 0]));
}

function assetManifestSha256(profile: string, state: string): string {
  return createHash("sha256").update(`${profile}\0${state}`).digest("hex");
}

function codeSha256(hexDigest: string): string {
  return Buffer.from(hexDigest, "hex").toString("base64");
}
