import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ensureBenchmarkAssets } from "./assets";
import { type CollectBenchmarkOptions, collectBenchmarkResult } from "./collect-results";
import { type BenchmarkRunOptions, type PhaseConfig, parseBenchmarkRunOptions } from "./config";
import { runCommand, sleep } from "./execution";
import { type BenchmarkSourceMetadata, collectBenchmarkSourceMetadata } from "./metadata";
import type { BenchmarkImplementation, BenchmarkResultRecord } from "./model";
import { completedSampleIds, upsertBenchmarkRecords } from "./persistence";
import { type PlannedBenchmarkRun, createBenchmarkPlan, wallClockCapReached } from "./plan";

type PhaseEvidence = {
  readonly options: CollectBenchmarkOptions;
  readonly record: BenchmarkResultRecord;
};

type StackResource = {
  readonly LogicalResourceId?: string;
  readonly PhysicalResourceId?: string;
  readonly ResourceType?: string;
};

async function main(): Promise<void> {
  const options = parseBenchmarkRunOptions(process.argv.slice(2));
  console.log(`benchmark run id: ${options.runId}`);
  mkdirSync(options.scratchRoot, { recursive: true });
  const sourceMetadata = await collectBenchmarkSourceMetadata(process.cwd(), options.outputFile);
  const completed = completedSampleIds(
    options.outputFile,
    options.runId,
    options.phases.map((phase) => phase.name),
  );
  const runs = createBenchmarkPlan(options).filter((run) => !completed.has(run.sampleId));
  if (completed.size > 0) {
    console.log(`resuming with ${completed.size} completed sample(s)`);
  }
  const states = [...new Set(options.phases.map((phase) => phase.assetState))];
  for (const assetProfile of options.assetProfiles) {
    for (const state of states) {
      ensureBenchmarkAssets({ assetProfile, state });
    }
  }

  const startedAtMs = Date.now();
  for (const run of runs) {
    if (wallClockCapReached(startedAtMs, options.maxWallClockMinutes)) {
      console.log("benchmark wall-clock cap reached; no additional stack will be started");
      break;
    }
    await runBenchmarkStack({ sourceMetadata, options, run });
  }
  console.log(`wrote sanitized benchmark rows to ${options.outputFile}`);
}

async function runBenchmarkStack(args: {
  readonly run: PlannedBenchmarkRun;
  readonly sourceMetadata: BenchmarkSourceMetadata;
  readonly options: BenchmarkRunOptions;
}): Promise<PhaseEvidence[]> {
  const { sourceMetadata, options, run } = args;
  const label = `${run.implementation}-${run.assetProfile}-${run.memoryMb}-${run.parallel ?? "na"}-r${run.repetition}`;
  const stackSuffix = stackSuffixFor({ options, run });
  const stackName = `${
    run.implementation === "shin"
      ? "ShinBucketDeploymentBenchmarkAssetsDemo"
      : "AwsBucketDeploymentBenchmarkAssetsDemo"
  }${stackSuffix}`;
  const scratch = join(options.scratchRoot, label);
  const cdkOutput = join(scratch, "cdk.out");
  mkdirSync(scratch, { recursive: true });

  const evidence: PhaseEvidence[] = [];
  let runError: unknown;
  try {
    for (const phase of options.phases) {
      console.log(`${label}: ${phase.name}`);
      const phaseStartedAt = Date.now();
      const deployLog = join(scratch, `${phase.name}.deploy.log`);
      await runCommand({
        command: "pnpm",
        args: [
          "exec",
          "cdk",
          "deploy",
          "--app",
          `node ${JSON.stringify(resolve("dist", "benchmarks", "apps", "assets-app.js"))}`,
          "--output",
          cdkOutput,
          "--require-approval",
          "never",
        ],
        env: benchmarkEnv({ options, phase, run, stackSuffix }),
        logFile: deployLog,
        quiet: true,
      });

      const reportFile = join(scratch, `${phase.name}.report.json`);
      const summaryFile = join(scratch, `${phase.name}.summary.json`);
      const handler = await benchmarkHandlerName({
        implementation: run.implementation,
        region: options.region,
        stackName,
        scratchFile: join(scratch, `${phase.name}.resources.json`),
      });
      const runtimeMetadata = await providerRuntimeMetadata({
        functionName: handler,
        outputFile: join(scratch, `${phase.name}.function.json`),
        region: options.region,
      });
      await writeLogEvents({
        filterPattern: "REPORT",
        outputFile: reportFile,
        region: options.region,
        handler,
        requireEvents: true,
        startTimeMs: phaseStartedAt,
      });
      if (run.implementation === "shin") {
        await writeLogEvents({
          filterPattern: "shin_deployment_summary",
          outputFile: summaryFile,
          region: options.region,
          handler,
          requireEvents: true,
          startTimeMs: phaseStartedAt,
        });
      }

      const collectOptions: CollectBenchmarkOptions = {
        logFile: deployLog,
        reportFile,
        ...(run.implementation === "shin" ? { summaryFile } : {}),
        outputFile: options.outputFile,
        resultSchemaVersion: 2,
        methodologyVersion: options.methodologyVersion,
        runId: options.runId,
        sampleId: run.sampleId,
        snapshotDate: options.snapshotDate,
        phase: phase.name,
        ...(run.implementation === "shin" ? { commit: sourceMetadata.commit } : {}),
        ...(run.implementation === "shin" ? { subject: sourceMetadata.subject } : {}),
        providerPackageName:
          run.implementation === "shin" ? sourceMetadata.providerPackageName : "aws-cdk-lib",
        providerPackageVersion:
          run.implementation === "shin"
            ? sourceMetadata.providerPackageVersion
            : sourceMetadata.awsCdkLibVersion,
        providerArchitecture: runtimeMetadata.architecture,
        providerCodeSha256: runtimeMetadata.codeSha256,
        ...(run.implementation === "shin"
          ? { providerBootstrapSha256: sourceMetadata.providerBootstrapSha256 }
          : {}),
        gitDirty: sourceMetadata.gitDirty,
        cdkCliVersion: sourceMetadata.cdkCliVersion,
        awsCdkLibVersion: sourceMetadata.awsCdkLibVersion,
        awsCdkLibIntegrity: sourceMetadata.awsCdkLibIntegrity,
        executionEnvironmentFresh: true,
        memoryMeasurementScope: "phase-local",
        region: options.region,
        implementation: run.implementation,
        assetProfile: run.assetProfile,
        memoryMb: run.memoryMb,
        parallel: run.parallel,
        state: phase.assetState,
        cleanup: "benchmark cleanup pending",
        decisionRunId: options.decisionRunId,
        comparisonVariant: options.comparisonVariant,
        repetition: run.repetition,
      };
      const record = collectBenchmarkResult(collectOptions);
      evidence.push({ options: collectOptions, record });
    }
  } catch (error) {
    runError = error;
  }

  let cleanupError: unknown;
  try {
    console.log(`${label}: destroy`);
    await runCommand({
      command: "pnpm",
      args: [
        "exec",
        "cdk",
        "destroy",
        "--app",
        `node ${JSON.stringify(resolve("dist", "benchmarks", "apps", "assets-app.js"))}`,
        "--output",
        cdkOutput,
        "--force",
      ],
      env: benchmarkEnv({
        options,
        phase: {
          assetState: options.phases.at(-1)?.assetState ?? "baseline",
          cloudfrontWait: false,
          name: "destroy",
          deleteStaleObjects: options.phases.at(-1)?.deleteStaleObjects ?? true,
        },
        run,
        stackSuffix,
      }),
      logFile: join(scratch, "destroy.log"),
      quiet: true,
    });
    await verifyStackDeleted(stackName, options.region);
  } catch (error) {
    cleanupError = error;
  }

  if (cleanupError === undefined) {
    upsertBenchmarkRecords(
      options.outputFile,
      evidence.map(({ record }) => ({ ...record, cleanup: "all benchmark stacks destroyed" })),
    );
  }
  if (runError !== undefined && cleanupError !== undefined) {
    throw new Error(
      `${errorText(runError)}; benchmark cleanup also failed: ${errorText(cleanupError)}`,
    );
  }
  if (runError !== undefined) {
    throw runError;
  }
  if (cleanupError !== undefined) {
    throw cleanupError;
  }
  return evidence;
}

function benchmarkEnv(args: {
  readonly run: PlannedBenchmarkRun;
  readonly options: BenchmarkRunOptions;
  readonly phase: PhaseConfig;
  readonly stackSuffix: string;
}): NodeJS.ProcessEnv {
  const { options, phase, run, stackSuffix } = args;
  return {
    ...process.env,
    AWS_DEFAULT_REGION: options.region,
    AWS_REGION: options.region,
    SHIN_BENCH_DESTINATION_PREFIX: options.destinationPrefix,
    SHIN_BENCH_IMPLEMENTATION: run.implementation,
    SHIN_BENCH_INVOCATION_TOKEN: `${options.runToken}:${run.repetition}:${phase.name}`,
    SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN: `${options.runToken}:${run.repetition}:${phase.name}`,
    ...(run.parallel === null
      ? {}
      : { SHIN_BENCH_LAMBDA_MAX_PARALLEL_TRANSFERS: String(run.parallel) }),
    SHIN_BENCH_LAMBDA_MEMORY_MB: String(run.memoryMb),
    SHIN_BENCH_ASSET_STATE: phase.assetState,
    SHIN_BENCH_ASSET_PROFILE: run.assetProfile,
    SHIN_BENCH_DELETE_STALE_OBJECTS: String(phase.deleteStaleObjects),
    ...(phase.deleteCurrentObjectsOnDelete === undefined
      ? {}
      : {
          SHIN_BENCH_DELETE_CURRENT_OBJECTS_ON_DELETE: String(phase.deleteCurrentObjectsOnDelete),
        }),
    SHIN_BENCH_STACK_SUFFIX: stackSuffix,
    SHIN_BENCH_WAIT_FOR_CLOUDFRONT: String(phase.cloudfrontWait),
  };
}

async function benchmarkHandlerName(args: {
  readonly implementation: BenchmarkImplementation;
  readonly region: string;
  readonly stackName: string;
  readonly scratchFile: string;
}): Promise<string> {
  await runCommand({
    command: "aws",
    args: [
      "cloudformation",
      "describe-stack-resources",
      "--region",
      args.region,
      "--stack-name",
      args.stackName,
      "--output",
      "json",
    ],
    logFile: args.scratchFile,
    quiet: true,
    appendElapsed: false,
  });
  const parsed = JSON.parse(readFileSync(args.scratchFile, "utf8")) as {
    StackResources?: StackResource[];
  };
  const functions = (parsed.StackResources ?? []).filter(
    (resource) => resource.ResourceType === "AWS::Lambda::Function",
  );
  const candidates = functions.filter((resource) => {
    const text = `${resource.LogicalResourceId ?? ""} ${resource.PhysicalResourceId ?? ""}`;
    return !text.includes("AutoDeleteObjects");
  });
  const preferred =
    args.implementation === "shin"
      ? candidates.find((resource) =>
          `${resource.LogicalResourceId ?? ""} ${resource.PhysicalResourceId ?? ""}`.includes(
            "ShinBucketDeploymentHandler",
          ),
        )
      : undefined;
  const selected = preferred ?? candidates[0];
  if (!selected?.PhysicalResourceId) {
    throw new Error(`Could not identify benchmark handler for ${args.stackName}.`);
  }
  return selected.PhysicalResourceId;
}

async function providerRuntimeMetadata(args: {
  readonly functionName: string;
  readonly outputFile: string;
  readonly region: string;
}): Promise<{ readonly architecture: string; readonly codeSha256: string }> {
  await runCommand({
    command: "aws",
    args: [
      "lambda",
      "get-function-configuration",
      "--region",
      args.region,
      "--function-name",
      args.functionName,
      "--output",
      "json",
    ],
    logFile: args.outputFile,
    quiet: true,
    appendElapsed: false,
  });
  const parsed = JSON.parse(readFileSync(args.outputFile, "utf8")) as {
    Architectures?: string[];
    CodeSha256?: string;
  };
  const architecture = parsed.Architectures?.[0];
  if (!architecture || !parsed.CodeSha256) {
    throw new Error("Provider configuration did not include architecture and CodeSha256.");
  }
  return { architecture, codeSha256: parsed.CodeSha256 };
}

async function writeLogEvents(args: {
  readonly filterPattern: string;
  readonly outputFile: string;
  readonly region: string;
  readonly handler: string;
  readonly requireEvents: boolean;
  readonly startTimeMs: number;
}): Promise<void> {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const status = await runCommand({
      command: "aws",
      args: [
        "logs",
        "filter-log-events",
        "--region",
        args.region,
        "--log-group-name",
        `/aws/lambda/${args.handler}`,
        "--filter-pattern",
        args.filterPattern,
        "--start-time",
        String(args.startTimeMs),
        "--output",
        "json",
      ],
      logFile: args.outputFile,
      quiet: true,
      allowFailure: true,
      appendElapsed: false,
    });
    if (status === 0) {
      const parsed = JSON.parse(readFileSync(args.outputFile, "utf8")) as { events?: unknown[] };
      if (!args.requireEvents || (parsed.events?.length ?? 0) > 0) {
        return;
      }
    }
    await sleep(attempt * 2500);
  }
  throw new Error(`No ${args.filterPattern} log events found for benchmark handler.`);
}

async function verifyStackDeleted(stackName: string, region: string): Promise<void> {
  const scratchFile = join(tmpdir(), `shin-benchmark-${safeName(stackName)}-deleted.json`);
  const status = await runCommand({
    command: "aws",
    args: [
      "cloudformation",
      "describe-stacks",
      "--region",
      region,
      "--stack-name",
      stackName,
      "--output",
      "json",
    ],
    logFile: scratchFile,
    quiet: true,
    allowFailure: true,
    appendElapsed: false,
  });
  if (status !== 0) {
    const output = readFileSync(scratchFile, "utf8");
    if (!output.includes("does not exist")) {
      throw new Error(`Could not verify benchmark stack cleanup for ${stackName}.`);
    }
    return;
  }
  const parsed = JSON.parse(readFileSync(scratchFile, "utf8")) as {
    Stacks?: Array<{ StackStatus?: string }>;
  };
  const statusText = parsed.Stacks?.[0]?.StackStatus;
  if (statusText !== "DELETE_COMPLETE") {
    throw new Error(`Benchmark stack cleanup did not complete for ${stackName}: ${statusText}`);
  }
}

function stackSuffixFor(args: {
  readonly run: PlannedBenchmarkRun;
  readonly options: BenchmarkRunOptions;
}): string {
  const dateToken = safeName(args.options.snapshotDate).replace(/-/g, "");
  const runToken = `${dateToken}-${shortHash(args.options.runToken)}`;
  return `-${runToken}-${safeName(args.run.assetProfile)}-${args.run.implementation}-${args.run.memoryMb}-${args.run.parallel ?? "na"}-r${args.run.repetition}`;
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 48);
}

function shortHash(value: string): string {
  let state = 2166136261;
  for (const char of value) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return (state >>> 0).toString(36).slice(0, 6).padStart(6, "0");
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
