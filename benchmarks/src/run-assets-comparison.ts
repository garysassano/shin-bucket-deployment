import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type GeneratedBundle, ensureBenchmarkAssets, verifyBenchmarkAssets } from "./assets";
import { type CollectBenchmarkOptions, collectBenchmarkResult } from "./collect-results";
import {
  type BenchmarkRunOptions,
  type PhaseConfig,
  assertBenchmarkExecutionAuthorized,
  benchmarkConfigurationSha256,
  parseBenchmarkRunOptions,
} from "./config";
import { runCommand, sleep } from "./execution";
import {
  type BenchmarkSourceMetadata,
  assertBenchmarkSourceMetadataUnchanged,
  collectBenchmarkSourceMetadata,
} from "./metadata";
import {
  type BenchmarkImplementation,
  type BenchmarkResultRecord,
  methodologyV2RecordErrors,
} from "./model";
import { completedSampleIds } from "./persistence";
import { type PlannedBenchmarkRun, createBenchmarkPlan, wallClockCapReached } from "./plan";
import { type ResumeSession, openResumeSession } from "./resume";

type PhaseEvidence = {
  readonly options: CollectBenchmarkOptions;
  readonly record: BenchmarkResultRecord;
};

type StackResource = {
  readonly LogicalResourceId?: string;
  readonly PhysicalResourceId?: string;
  readonly ResourceType?: string;
};

type ProviderRuntimeMetadata = {
  readonly architecture: string;
  readonly codeSha256: string;
  readonly logGroup: string;
  readonly memorySizeMb: number;
  readonly runtime: string;
  readonly handler: string;
  readonly executionEnvironmentToken: string | undefined;
  readonly executionEnvironmentFresh: boolean;
};

class WallClockCapError extends Error {}

async function main(signal: AbortSignal): Promise<void> {
  const options = parseBenchmarkRunOptions(process.argv.slice(2));
  assertBenchmarkExecutionAuthorized(options);
  console.log(`benchmark run id: ${options.runId}`);
  console.log(`benchmark snapshot date: ${options.snapshotDate}`);
  console.log(`benchmark scratch root: ${options.scratchRoot}`);
  mkdirSync(options.scratchRoot, { recursive: true });
  const resumeManifestExists = existsSync(join(options.scratchRoot, "benchmark-run-manifest.json"));
  if (options.methodologyVersion === 2 && options.startRepetition === 1 && !resumeManifestExists) {
    await runCommand({
      command: "node",
      args: [
        "scripts/build-bootstrap.mjs",
        "--benchmark",
        "--evidence-output",
        options.outputFile,
        "arm64",
      ],
      logFile: join(options.scratchRoot, "provider-build.log"),
      quiet: false,
      appendElapsed: false,
      signal,
    });
  }
  const bundles = new Map<string, GeneratedBundle>();
  const states = [...new Set(options.phases.map((phase) => phase.assetState))];
  for (const assetProfile of options.assetProfiles) {
    for (const state of states) {
      bundles.set(assetKey(assetProfile, state), ensureBenchmarkAssets({ assetProfile, state }));
    }
  }
  const sourceMetadata = await collectBenchmarkSourceMetadata(process.cwd(), options.outputFile);
  const resumeSession = openResumeSession({ options, sourceMetadata });
  if (
    options.methodologyVersion === 2 &&
    (resumeSession.gitDirty || sourceMetadata.providerBootstrapBuildDirty)
  ) {
    resumeSession.close();
    throw new Error(
      "Methodology-v2 benchmark evidence requires clean source and bootstrap build provenance.",
    );
  }
  try {
    const completed = completedSampleIds(
      options.outputFile,
      options.runId,
      options.phases.map((phase) => phase.name),
      options.methodologyVersion,
    );
    const runs = createBenchmarkPlan(options).filter((run) => !completed.has(run.sampleId));
    if (completed.size > 0) {
      console.log(`resuming with ${completed.size} completed sample(s)`);
    }
    if (options.startRepetition === 2) {
      for (const sample of createBenchmarkPlan({
        ...options,
        startRepetition: 1,
        repetitions: 1,
      })) {
        if (!completed.has(sample.sampleId)) {
          throw new Error(
            "Repetitions 2-5 require a complete cleanup-qualified repetition-1 smoke.",
          );
        }
      }
    }

    const startedAtMs = Date.now();
    for (const run of runs) {
      if (wallClockCapReached(startedAtMs, options.maxWallClockMinutes)) {
        console.log("benchmark wall-clock cap reached; no additional stack will be started");
        break;
      }
      await assertSourceUnchanged(sourceMetadata, options);
      try {
        await runBenchmarkStack({
          sourceMetadata,
          options,
          run,
          resumeSession,
          bundles,
          signal,
          startedAtMs,
        });
      } catch (error) {
        if (error instanceof WallClockCapError) {
          console.log(
            "benchmark wall-clock cap reached between phases; active stack was cleaned up",
          );
          break;
        }
        throw error;
      }
    }
    console.log(`wrote sanitized benchmark rows to ${options.outputFile}`);
  } finally {
    resumeSession.close();
  }
}

async function runBenchmarkStack(args: {
  readonly run: PlannedBenchmarkRun;
  readonly sourceMetadata: BenchmarkSourceMetadata;
  readonly options: BenchmarkRunOptions;
  readonly resumeSession: ResumeSession;
  readonly bundles: ReadonlyMap<string, GeneratedBundle>;
  readonly signal: AbortSignal;
  readonly startedAtMs: number;
}): Promise<PhaseEvidence[]> {
  const { sourceMetadata, options, run, resumeSession, bundles, signal, startedAtMs } = args;
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
  const preexistingStackId = await assertOwnedStackOrAbsent({
    stackName,
    region: options.region,
    runId: options.runId,
    sampleId: run.sampleId,
    outputFile: join(scratch, "preflight-stack.json"),
    signal,
  });
  if (preexistingStackId !== null) {
    console.log(`${label}: removing owned stack left by an interrupted attempt`);
    await deleteOwnedStack(preexistingStackId, options.region, scratch);
    await verifyStackDeleted(stackName, options.region);
  }

  const evidence: PhaseEvidence[] = [];
  let runError: unknown;
  try {
    for (const phase of options.phases) {
      if (wallClockCapReached(startedAtMs, options.maxWallClockMinutes)) {
        throw new WallClockCapError("Benchmark wall-clock cap reached before the next phase.");
      }
      if (signal.aborted) {
        throw signal.reason ?? new Error("Benchmark interrupted.");
      }
      await assertSourceUnchanged(sourceMetadata, options);
      const bundle = expectedBundle(bundles, run, phase);
      assertAssetsUnchanged(bundle);
      console.log(`${label}: ${phase.name}`);
      const phaseStartedAt = Date.now();
      const deployLog = join(scratch, `${phase.name}.deploy.log`);
      await runWithFailedDeployEvidence({
        deploy: async () => {
          await runCommand({
            command: "pnpm",
            args: benchmarkDeployArgs(cdkOutput, options.runId, run.sampleId),
            env: benchmarkEnv({ options, phase, run, stackSuffix }),
            logFile: deployLog,
            quiet: true,
            signal,
          });
        },
        capture: async () => {
          await captureFailedDeployTelemetry({
            implementation: run.implementation,
            region: options.region,
            stackName,
            scratch,
            phaseName: phase.name,
            startTimeMs: phaseStartedAt,
            signal,
          });
        },
      });

      const reportFile = join(scratch, `${phase.name}.report.json`);
      const summaryFile = join(scratch, `${phase.name}.summary.json`);
      const handler = await benchmarkHandlerName({
        implementation: run.implementation,
        region: options.region,
        stackName,
        scratchFile: join(scratch, `${phase.name}.resources.json`),
        signal,
      });
      const runtimeMetadata = await providerRuntimeMetadata({
        functionName: handler,
        outputFile: join(scratch, `${phase.name}.function.json`),
        region: options.region,
        signal,
      });
      assertProviderRuntimeMetadata({
        metadata: runtimeMetadata,
        implementation: run.implementation,
        memoryMb: run.memoryMb,
        executionEnvironmentToken: `${options.runToken}:${run.repetition}:${phase.name}`,
        providerBootstrapArchiveSha256: sourceMetadata.providerBootstrapArchiveSha256,
      });
      await writeLogEvents({
        filterPattern: "REPORT",
        outputFile: reportFile,
        region: options.region,
        logGroup: runtimeMetadata.logGroup,
        requireEvents: true,
        startTimeMs: phaseStartedAt,
        signal,
      });
      if (run.implementation === "shin") {
        await writeLogEvents({
          filterPattern: "shin_deployment_summary",
          outputFile: summaryFile,
          region: options.region,
          logGroup: runtimeMetadata.logGroup,
          requireEvents: true,
          startTimeMs: phaseStartedAt,
          signal,
        });
      }
      assertAssetsUnchanged(bundle);

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
          ? {
              providerBootstrapSha256: sourceMetadata.providerBootstrapSha256,
              providerBootstrapArchiveSha256: sourceMetadata.providerBootstrapArchiveSha256,
              providerBootstrapProvenanceSha256: sourceMetadata.providerBootstrapProvenanceSha256,
              providerBootstrapBuildDirty: sourceMetadata.providerBootstrapBuildDirty,
              providerBootstrapCargoVersion: sourceMetadata.providerBootstrapCargoVersion,
              providerBootstrapRustcVersion: sourceMetadata.providerBootstrapRustcVersion,
              providerBootstrapCargoLambdaVersion:
                sourceMetadata.providerBootstrapCargoLambdaVersion,
              providerBootstrapZigVersion: sourceMetadata.providerBootstrapZigVersion,
              providerBootstrapBuildToolchainSha256:
                sourceMetadata.providerBootstrapBuildToolchainSha256,
              providerBootstrapBuildEnvironmentSha256:
                sourceMetadata.providerBootstrapBuildEnvironmentSha256,
            }
          : {}),
        gitDirty: resumeSession.gitDirty,
        cdkCliVersion: sourceMetadata.cdkCliVersion,
        cdkCliInstalledSha256: sourceMetadata.cdkCliInstalledSha256,
        awsCdkLibVersion: sourceMetadata.awsCdkLibVersion,
        awsCdkLibIntegrity: sourceMetadata.awsCdkLibIntegrity,
        awsCdkLibInstalledSha256: sourceMetadata.awsCdkLibInstalledSha256,
        constructsInstalledSha256: sourceMetadata.constructsInstalledSha256,
        executionEnvironmentFresh: runtimeMetadata.executionEnvironmentFresh,
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
        benchmarkConfigSha256: benchmarkConfigurationSha256(options),
        assetManifestSha256: bundle.assetManifestSha256,
        sourceCount: bundle.sourceCount,
        dependencyLockSha256: sourceMetadata.dependencyLockSha256,
        applicationBuildSha256: sourceMetadata.applicationBuildSha256,
        installedDependenciesSha256: sourceMetadata.installedDependenciesSha256,
        nodeVersion: sourceMetadata.nodeVersion,
        pnpmVersion: sourceMetadata.pnpmVersion,
        executionEnvironmentSha256: sourceMetadata.executionEnvironmentSha256,
        sourceTreeSha256: sourceMetadata.sourceTreeSha256,
        fileCount: bundle.fileCount,
        totalBytes: bundle.totalBytes,
        providerRuntime: runtimeMetadata.runtime,
        providerHandler: runtimeMetadata.handler,
        persist: false,
      };
      const record = collectBenchmarkResult(collectOptions);
      evidence.push({ options: collectOptions, record });
      resumeSession.persist([record]);
    }
  } catch (error) {
    runError = error;
  }

  let cleanupError: unknown;
  try {
    const stackId = await assertOwnedStackOrAbsent({
      stackName,
      region: options.region,
      runId: options.runId,
      sampleId: run.sampleId,
      outputFile: join(scratch, "cleanup-stack.json"),
    });
    if (stackId !== null) {
      console.log(`${label}: destroy`);
      await deleteOwnedStack(stackId, options.region, scratch);
    }
    await verifyStackDeleted(stackName, options.region);
  } catch (error) {
    cleanupError = error;
  }

  if (cleanupError === undefined) {
    await assertSourceUnchanged(sourceMetadata, options);
    for (const bundle of bundles.values()) assertAssetsUnchanged(bundle);
    const qualifiedRecords = evidence.map(({ record }) => ({
      ...record,
      cleanup: "all benchmark stacks destroyed",
    }));
    for (const record of qualifiedRecords) {
      const errors = options.methodologyVersion === 2 ? methodologyV2RecordErrors(record) : [];
      if (errors.length > 0) {
        throw new Error(`Refusing to qualify invalid benchmark evidence: ${errors.join("; ")}`);
      }
    }
    resumeSession.persist(qualifiedRecords);
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

export function benchmarkDeployArgs(cdkOutput: string, runId: string, sampleId: string): string[] {
  return [
    "exec",
    "cdk",
    "deploy",
    "--app",
    `node ${JSON.stringify(resolve("dist", "benchmarks", "apps", "assets-app.js"))}`,
    "--output",
    cdkOutput,
    // Keep failed create resources available for telemetry capture; owned-stack cleanup follows.
    "--no-rollback",
    "--require-approval",
    "never",
    ...benchmarkStackTags(runId, sampleId),
  ];
}

export async function runWithFailedDeployEvidence(args: {
  readonly deploy: () => Promise<void>;
  readonly capture: () => Promise<void>;
}): Promise<void> {
  try {
    await args.deploy();
  } catch (deployError) {
    try {
      await args.capture();
    } catch (captureError) {
      throw new Error(
        `${errorText(deployError)}; failed benchmark telemetry capture also failed: ${errorText(captureError)}`,
        { cause: deployError },
      );
    }
    throw deployError;
  }
}

export function failedPhaseEvidencePaths(scratch: string, phaseName: string) {
  const prefix = join(scratch, `${phaseName}.failed`);
  return {
    resources: `${prefix}.resources.json`,
    function: `${prefix}.function.json`,
    report: `${prefix}.report.json`,
    summary: `${prefix}.summary.json`,
  } as const;
}

async function captureFailedDeployTelemetry(args: {
  readonly implementation: BenchmarkImplementation;
  readonly region: string;
  readonly stackName: string;
  readonly scratch: string;
  readonly phaseName: string;
  readonly startTimeMs: number;
  readonly signal: AbortSignal;
}): Promise<void> {
  const paths = failedPhaseEvidencePaths(args.scratch, args.phaseName);
  const handler = await benchmarkHandlerName({
    implementation: args.implementation,
    region: args.region,
    stackName: args.stackName,
    scratchFile: paths.resources,
    signal: args.signal,
  });
  const metadata = await providerRuntimeMetadata({
    functionName: handler,
    outputFile: paths.function,
    region: args.region,
    signal: args.signal,
  });
  const captures = [
    writeLogEvents({
      filterPattern: "REPORT",
      outputFile: paths.report,
      region: args.region,
      logGroup: metadata.logGroup,
      requireEvents: true,
      startTimeMs: args.startTimeMs,
      signal: args.signal,
    }),
  ];
  if (args.implementation === "shin") {
    captures.push(
      writeLogEvents({
        filterPattern: "shin_deployment_summary",
        outputFile: paths.summary,
        region: args.region,
        logGroup: metadata.logGroup,
        requireEvents: true,
        startTimeMs: args.startTimeMs,
        signal: args.signal,
      }),
    );
  }
  const results = await Promise.allSettled(captures);
  const errors = results.flatMap((result) =>
    result.status === "rejected" ? [errorText(result.reason)] : [],
  );
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export function benchmarkStackTags(runId: string, sampleId: string): string[] {
  return ["--tags", `ShinBenchmarkRun=${runId}`, "--tags", `ShinBenchmarkSample=${sampleId}`];
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
    NODE_OPTIONS: "",
    NODE_PATH: "",
    AWS_DEFAULT_REGION: options.region,
    AWS_REGION: options.region,
    SHIN_BENCH_DESTINATION_PREFIX: options.destinationPrefix,
    SHIN_BENCH_IMPLEMENTATION: run.implementation,
    SHIN_BENCH_INVOCATION_TOKEN: `${options.runToken}:${run.repetition}:${phase.name}`,
    SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN: `${options.runToken}:${run.repetition}:${phase.name}`,
    SHIN_BENCH_RUN_OWNER: options.runId,
    SHIN_BENCH_SAMPLE_OWNER: run.sampleId,
    SHIN_BENCH_TRUST_ASSETS: "true",
    SHIN_BENCH_VERIFY_ASSETS_ONLY: "false",
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
  readonly signal: AbortSignal;
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
    signal: args.signal,
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
  const matches = candidates.filter((resource) =>
    (resource.LogicalResourceId ?? "").includes(
      args.implementation === "shin" ? "ShinBucketDeploymentHandler" : "CustomCDKBucketDeployment",
    ),
  );
  if (matches.length !== 1 || !matches[0]?.PhysicalResourceId) {
    throw new Error(
      `Expected exactly one ${args.implementation} benchmark handler for ${args.stackName}, found ${matches.length}.`,
    );
  }
  return matches[0].PhysicalResourceId;
}

async function providerRuntimeMetadata(args: {
  readonly functionName: string;
  readonly outputFile: string;
  readonly region: string;
  readonly signal: AbortSignal;
}): Promise<ProviderRuntimeMetadata> {
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
    signal: args.signal,
  });
  const parsed = JSON.parse(readFileSync(args.outputFile, "utf8")) as {
    Architectures?: string[];
    CodeSha256?: string;
    MemorySize?: number;
    Runtime?: string;
    Handler?: string;
    Environment?: { Variables?: Record<string, string> };
    LoggingConfig?: { LogGroup?: string };
  };
  const architecture = parsed.Architectures?.[0];
  const executionEnvironmentToken =
    parsed.Environment?.Variables?.SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN;
  const logGroup = providerLogGroupName(parsed);
  if (
    !architecture ||
    !parsed.CodeSha256 ||
    !parsed.MemorySize ||
    !parsed.Runtime ||
    !parsed.Handler
  ) {
    throw new Error("Provider configuration did not include required runtime metadata.");
  }
  return {
    architecture,
    codeSha256: parsed.CodeSha256,
    logGroup,
    memorySizeMb: parsed.MemorySize,
    runtime: parsed.Runtime,
    handler: parsed.Handler,
    executionEnvironmentToken,
    executionEnvironmentFresh: executionEnvironmentToken !== undefined,
  };
}

async function writeLogEvents(args: {
  readonly filterPattern: string;
  readonly outputFile: string;
  readonly region: string;
  readonly logGroup: string;
  readonly requireEvents: boolean;
  readonly startTimeMs: number;
  readonly signal: AbortSignal;
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
        args.logGroup,
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
      signal: args.signal,
    });
    if (status === 0) {
      const parsed = JSON.parse(readFileSync(args.outputFile, "utf8")) as { events?: unknown[] };
      if (!args.requireEvents || (parsed.events?.length ?? 0) > 0) {
        return;
      }
    }
    await sleep(attempt * 2500, args.signal);
  }
  throw new Error(`No ${args.filterPattern} log events found for benchmark handler.`);
}

export function providerLogGroupName(configuration: {
  readonly LoggingConfig?: { readonly LogGroup?: string };
}): string {
  const logGroup = configuration.LoggingConfig?.LogGroup;
  if (typeof logGroup !== "string" || logGroup.length === 0) {
    throw new Error("Provider configuration did not include its CloudWatch log group.");
  }
  return logGroup;
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
    assertStackNotFoundOutput(scratchFile, stackName);
    return;
  }
  throw new Error(`Benchmark stack still exists after destroy: ${stackName}`);
}

async function assertOwnedStackOrAbsent(args: {
  readonly stackName: string;
  readonly region: string;
  readonly runId: string;
  readonly sampleId: string;
  readonly outputFile: string;
  readonly signal?: AbortSignal;
}): Promise<string | null> {
  const status = await describeStack(args.stackName, args.region, args.outputFile, args.signal);
  if (status !== 0) {
    assertStackNotFoundOutput(args.outputFile, args.stackName);
    return null;
  }
  const parsed = JSON.parse(readFileSync(args.outputFile, "utf8")) as {
    Stacks?: Array<{ StackId?: string; Tags?: Array<{ Key?: string; Value?: string }> }>;
  };
  const stack = parsed.Stacks?.[0];
  const tags = new Map((stack?.Tags ?? []).map((tag) => [tag.Key, tag.Value]));
  if (
    tags.get("ShinBenchmarkRun") !== args.runId ||
    tags.get("ShinBenchmarkSample") !== args.sampleId
  ) {
    throw new Error(`Refusing to destroy unowned benchmark stack ${args.stackName}.`);
  }
  if (!stack?.StackId) throw new Error("Owned benchmark stack did not include a stack ID.");
  return stack.StackId;
}

async function deleteOwnedStack(stackId: string, region: string, scratch: string): Promise<void> {
  await runCommand({
    command: "aws",
    args: ["cloudformation", "delete-stack", "--region", region, "--stack-name", stackId],
    logFile: join(scratch, "destroy.log"),
    quiet: true,
    appendElapsed: false,
  });
  await runCommand({
    command: "aws",
    args: [
      "cloudformation",
      "wait",
      "stack-delete-complete",
      "--region",
      region,
      "--stack-name",
      stackId,
    ],
    logFile: join(scratch, "destroy-wait.log"),
    quiet: true,
    appendElapsed: false,
  });
}

async function describeStack(
  stackName: string,
  region: string,
  outputFile: string,
  signal?: AbortSignal,
): Promise<number> {
  return await runCommand({
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
    logFile: outputFile,
    quiet: true,
    allowFailure: true,
    appendElapsed: false,
    signal,
  });
}

function assertStackNotFoundOutput(path: string, stackName: string): void {
  const output = readFileSync(path, "utf8");
  if (!output.includes("ValidationError") || !output.includes("does not exist")) {
    throw new Error(`Could not verify benchmark stack absence for ${stackName}.`);
  }
}

export function assertProviderRuntimeMetadata(args: {
  readonly metadata: ProviderRuntimeMetadata;
  readonly implementation: BenchmarkImplementation;
  readonly memoryMb: number;
  readonly executionEnvironmentToken: string;
  readonly providerBootstrapArchiveSha256: string;
}): void {
  const { metadata } = args;
  if (metadata.memorySizeMb !== args.memoryMb) {
    throw new Error("Deployed provider memory does not match the benchmark plan.");
  }
  if (metadata.executionEnvironmentToken !== args.executionEnvironmentToken) {
    throw new Error("Deployed provider freshness token does not match the benchmark phase.");
  }
  if (!/^[A-Za-z0-9+/]{43}=$/.test(metadata.codeSha256)) {
    throw new Error("Deployed provider CodeSha256 is invalid.");
  }
  if (args.implementation === "shin") {
    if (
      metadata.architecture !== "arm64" ||
      metadata.runtime !== "provided.al2023" ||
      metadata.handler !== "bootstrap"
    ) {
      throw new Error("Deployed Shin provider runtime metadata is unexpected.");
    }
    if (
      Buffer.from(metadata.codeSha256, "base64").toString("hex") !==
      args.providerBootstrapArchiveSha256
    ) {
      throw new Error(
        "Deployed Shin provider code does not match the benchmark bootstrap archive.",
      );
    }
  } else if (
    metadata.architecture !== "x86_64" ||
    metadata.runtime !== "python3.13" ||
    metadata.handler !== "index.handler"
  ) {
    throw new Error("Deployed upstream provider runtime metadata is unexpected.");
  }
}

function expectedBundle(
  bundles: ReadonlyMap<string, GeneratedBundle>,
  run: PlannedBenchmarkRun,
  phase: PhaseConfig,
): GeneratedBundle {
  const bundle = bundles.get(assetKey(run.assetProfile, phase.assetState));
  if (!bundle) throw new Error("Missing planned benchmark asset bundle.");
  return bundle;
}

function assertAssetsUnchanged(expected: GeneratedBundle): void {
  const current = verifyBenchmarkAssets({
    assetProfile: expected.profile,
    state: expected.state,
  });
  if (current.assetManifestSha256 !== expected.assetManifestSha256) {
    throw new Error(`Benchmark asset identity changed for ${expected.profile}/${expected.state}.`);
  }
}

function assetKey(profile: string, state: string): string {
  return `${profile}\0${state}`;
}

async function assertSourceUnchanged(
  expected: BenchmarkSourceMetadata,
  options: BenchmarkRunOptions,
): Promise<void> {
  assertBenchmarkSourceMetadataUnchanged({
    expected,
    current: await collectBenchmarkSourceMetadata(process.cwd(), options.outputFile),
    repositoryRoot: process.cwd(),
    evidenceOutputFile: options.outputFile,
    requireClean: options.methodologyVersion === 2,
  });
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
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (require.main === module) {
  const controller = new AbortController();
  const onSignal = (): void => controller.abort(new Error("Benchmark interrupted."));
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  main(controller.signal)
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = controller.signal.aborted ? 130 : 1;
    })
    .finally(() => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
    });
}
