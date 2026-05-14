import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { ensureBenchmarkAssets } from "./assets";
import {
  type BenchmarkResultRecord,
  type CollectBenchmarkOptions,
  benchmarkResultKey,
  collectBenchmarkResult,
} from "./collect-results";

type BenchmarkImplementation = "shin" | "aws";
type BenchmarkProfile = "tiny-many" | "mixed" | "large-few";
type BenchmarkState = "baseline" | "changed" | "pruned";

type LambdaConfig = {
  readonly memoryMb: number;
  readonly parallel: number;
};

type PhaseConfig = {
  readonly phase: string;
  readonly state: BenchmarkState;
  readonly wait: boolean;
};

type RunnerConfig = {
  readonly profiles: BenchmarkProfile[];
  readonly lambdaConfigs: LambdaConfig[];
  readonly implementations: BenchmarkImplementation[];
  readonly region: string;
  readonly outputFile: string;
  readonly scratchRoot?: string;
  readonly runToken?: string;
  readonly snapshotDate?: string;
  readonly concurrency: number;
  readonly destinationPrefix: string;
  readonly phases: PhaseConfig[];
};

type BenchmarkConfig = z.infer<typeof benchmarkConfigSchema>;

type RunOptions = {
  readonly profiles: BenchmarkProfile[];
  readonly lambdaConfigs: LambdaConfig[];
  readonly implementations: BenchmarkImplementation[];
  readonly region: string;
  readonly outputFile: string;
  readonly scratchRoot: string;
  readonly runToken: string;
  readonly snapshotDate: string;
  readonly concurrency: number;
  readonly destinationPrefix: string;
  readonly phases: PhaseConfig[];
};

type PhaseEvidence = {
  readonly options: CollectBenchmarkOptions;
};

type StackResource = {
  readonly LogicalResourceId?: string;
  readonly PhysicalResourceId?: string;
  readonly ResourceType?: string;
};

const DEFAULT_PHASES: PhaseConfig[] = [
  { phase: "cold-create", state: "baseline", wait: true },
  { phase: "forced-unchanged", state: "baseline", wait: false },
  { phase: "sparse-update", state: "changed", wait: true },
  { phase: "prune-update", state: "pruned", wait: true },
];

const CLI_OPTIONS = new Set([
  "config",
  "profiles",
  "lambda-configs",
  "implementations",
  "region",
  "output-file",
  "run-token",
  "snapshot-date",
  "scratch-root",
  "concurrency",
  "destination-prefix",
]);

const nonEmptyStringSchema = z.string().min(1);
const positiveIntegerSchema = z.number().int().positive();
const implementationSchema = z.enum(["shin", "aws"]);
const profileSchema = z.enum(["tiny-many", "mixed", "large-few"]);
const stateSchema = z.enum(["baseline", "changed", "pruned"]);
const lambdaConfigSchema = z.object({
  memoryMb: positiveIntegerSchema,
  parallel: positiveIntegerSchema,
});
const phaseSchema = z.object({
  name: nonEmptyStringSchema,
  state: stateSchema,
  wait: z.boolean(),
});
const benchmarkConfigSchema = z
  .object({
    $schema: nonEmptyStringSchema.optional(),
    runToken: nonEmptyStringSchema.optional(),
    snapshotDate: nonEmptyStringSchema.optional(),
    region: nonEmptyStringSchema.optional(),
    outputFile: nonEmptyStringSchema.optional(),
    scratchRoot: nonEmptyStringSchema.optional(),
    concurrency: positiveIntegerSchema.optional(),
    destinationPrefix: nonEmptyStringSchema.optional(),
    profiles: z.array(profileSchema).nonempty().optional(),
    lambdaConfigs: z.array(lambdaConfigSchema).nonempty().optional(),
    implementations: z.array(implementationSchema).nonempty().optional(),
    phases: z.array(phaseSchema).nonempty().optional(),
  })
  .strict();

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(options.scratchRoot, { recursive: true });
  const rowsFile = join(options.scratchRoot, `${options.runToken}.rows.jsonl`);
  writeFileSync(rowsFile, "");

  const git = await gitMetadata();
  const runs = options.profiles.flatMap((profile) =>
    options.lambdaConfigs.flatMap((lambdaConfig) =>
      options.implementations.map((implementation) => ({
        implementation,
        profile,
        ...lambdaConfig,
      })),
    ),
  );
  const states = [...new Set(options.phases.map((phase) => phase.state))];
  for (const profile of options.profiles) {
    for (const state of states) {
      ensureBenchmarkAssets({ profile, state });
    }
  }

  await runWithConcurrency(runs, options.concurrency, async (run) => {
    const evidence = await runBenchmarkStack({ git, options, run });
    for (const item of evidence) {
      collectBenchmarkResult({ ...item.options, outputFile: rowsFile });
    }
  });

  upsertResultRows({
    outputFile: options.outputFile,
    rowsText: readFileSync(rowsFile, "utf8"),
  });
  console.log(`wrote sanitized benchmark rows to ${options.outputFile}`);
}

async function runBenchmarkStack(args: {
  readonly run: LambdaConfig & {
    readonly implementation: BenchmarkImplementation;
    readonly profile: string;
  };
  readonly git: { readonly commit: string | null; readonly subject: string | null };
  readonly options: RunOptions;
}): Promise<PhaseEvidence[]> {
  const { git, options, run } = args;
  const label = `${run.implementation}-${run.profile}-${run.memoryMb}-${run.parallel}`;
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
      console.log(`${label}: ${phase.phase}`);
      const phaseStartedAt = Date.now();
      const deployLog = join(scratch, `${phase.phase}.deploy.log`);
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

      const reportFile = join(scratch, `${phase.phase}.report.json`);
      const summaryFile = join(scratch, `${phase.phase}.summary.json`);
      const handler = await benchmarkHandlerName({
        implementation: run.implementation,
        region: options.region,
        stackName,
        scratchFile: join(scratch, `${phase.phase}.resources.json`),
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

      evidence.push({
        options: {
          logFile: deployLog,
          reportFile,
          ...(run.implementation === "shin" ? { summaryFile } : {}),
          outputFile: "",
          snapshotDate: options.snapshotDate,
          phase: phase.phase,
          ...(run.implementation === "shin" && git.commit ? { commit: git.commit } : {}),
          ...(run.implementation === "shin" && git.subject ? { subject: git.subject } : {}),
          region: options.region,
          implementation: run.implementation,
          profile: run.profile,
          memoryMb: run.memoryMb,
          parallel: run.parallel,
          state: phase.state,
          cleanup: "all benchmark stacks destroyed",
        },
      });
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
        phase: { phase: "destroy", state: options.phases.at(-1)?.state ?? "baseline", wait: true },
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
  readonly run: LambdaConfig & {
    readonly implementation: BenchmarkImplementation;
    readonly profile: string;
  };
  readonly options: RunOptions;
  readonly phase: PhaseConfig;
  readonly stackSuffix: string;
}): NodeJS.ProcessEnv {
  const { options, phase, run, stackSuffix } = args;
  return {
    ...process.env,
    AWS_REGION: options.region,
    AWS_DEFAULT_REGION: options.region,
    SHIN_BENCH_IMPLEMENTATION: run.implementation,
    SHIN_BENCH_PROFILE: run.profile,
    SHIN_BENCH_STATE: phase.state,
    SHIN_BENCH_STACK_SUFFIX: stackSuffix,
    SHIN_BENCH_MEMORY_LIMIT_MB: String(run.memoryMb),
    SHIN_BENCH_MAX_PARALLEL_TRANSFERS: String(run.parallel),
    SHIN_BENCH_DESTINATION_PREFIX: options.destinationPrefix,
    SHIN_BENCH_WAIT: String(phase.wait),
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

async function runCommand(args: {
  readonly command: string;
  readonly args: string[];
  readonly env?: NodeJS.ProcessEnv;
  readonly logFile: string;
  readonly quiet?: boolean;
  readonly allowFailure?: boolean;
  readonly appendElapsed?: boolean;
}): Promise<number> {
  mkdirSync(dirname(args.logFile), { recursive: true });
  writeFileSync(args.logFile, "");
  const start = Date.now();
  const status = await new Promise<number>((resolve) => {
    const child = spawn(args.command, args.args, {
      cwd: process.cwd(),
      env: args.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => writeChunk(args.logFile, chunk, args.quiet));
    child.stderr.on("data", (chunk: Buffer) => writeChunk(args.logFile, chunk, args.quiet));
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      writeFileSync(args.logFile, `${error.message}\n`, { flag: "a" });
      resolve(1);
    });
  });
  if (args.appendElapsed !== false) {
    const elapsedSeconds = Math.round(((Date.now() - start) / 1000) * 1000) / 1000;
    writeFileSync(args.logFile, `real ${elapsedSeconds}\n`, { flag: "a" });
  }
  if (status !== 0 && !args.allowFailure) {
    throw new Error(`${args.command} ${args.args.join(" ")} failed; see ${args.logFile}`);
  }
  return status;
}

function writeChunk(path: string, chunk: Buffer, quiet: boolean | undefined): void {
  writeFileSync(path, chunk, { flag: "a" });
  if (!quiet) {
    process.stderr.write(chunk);
  }
}

async function gitMetadata(): Promise<{
  readonly commit: string | null;
  readonly subject: string | null;
}> {
  const commit = await commandOutput("git", ["rev-parse", "--short", "HEAD"]);
  const subject = await commandOutput("git", ["log", "-1", "--format=%s"]);
  return { commit, subject };
}

async function commandOutput(command: string, args: string[]): Promise<string | null> {
  const output = await new Promise<{ status: number; text: string }>((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("close", (status) =>
      resolve({ status: status ?? 1, text: Buffer.concat(chunks).toString("utf8").trim() }),
    );
    child.on("error", () => resolve({ status: 1, text: "" }));
  });
  return output.status === 0 && output.text ? output.text : null;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  run: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await run(item);
    }
  });
  await Promise.all(workers);
}

function parseArgs(args: string[]): RunOptions {
  const values = new Map<string, string>();
  const normalizedArgs = args.filter((arg) => arg !== "--");
  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const key = normalizedArgs[index];
    if (!key?.startsWith("--")) {
      usage();
    }
    const inlineIndex = key.indexOf("=");
    if (inlineIndex !== -1) {
      const name = key.slice(2, inlineIndex);
      assertCliOption(name);
      values.set(name, key.slice(inlineIndex + 1));
      continue;
    }
    const value = normalizedArgs[index + 1];
    if (value === undefined || value.startsWith("--")) {
      usage();
    }
    const name = key.slice(2);
    assertCliOption(name);
    values.set(name, value);
    index += 1;
  }

  const config = readConfigFile(values.get("config"));
  const profiles = values.has("profiles")
    ? listValue(required(values, "profiles")).map(parseProfile)
    : config.profiles;
  const lambdaConfigs = values.has("lambda-configs")
    ? listValue(required(values, "lambda-configs")).map(parseLambdaConfig)
    : config.lambdaConfigs;
  const implementations = values.has("implementations")
    ? listValue(required(values, "implementations")).map(parseImplementation)
    : config.implementations;
  const region = values.get("region") ?? config.region;
  const snapshotDate = values.get("snapshot-date") ?? config.snapshotDate ?? today();
  const runToken =
    values.get("run-token") ??
    config.runToken ??
    defaultRunToken(snapshotDate, profiles, lambdaConfigs);
  const scratchRoot = resolve(
    values.get("scratch-root") ??
      config.scratchRoot ??
      join(tmpdir(), "shin-benchmark-runs", runToken),
  );
  const outputFile = values.get("output-file") ?? config.outputFile;
  const concurrency = positiveInteger(
    values.get("concurrency") ?? String(config.concurrency),
    "concurrency",
  );
  const destinationPrefix = values.get("destination-prefix") ?? config.destinationPrefix;
  const phases = config.phases;

  return {
    profiles,
    lambdaConfigs,
    implementations,
    region,
    outputFile,
    scratchRoot,
    runToken,
    snapshotDate,
    concurrency,
    destinationPrefix,
    phases,
  };
}

function readConfigFile(configPath: string | undefined): RunnerConfig {
  if (configPath === undefined) {
    return defaultConfig();
  }

  const filePath = resolve(process.cwd(), configPath);
  const parsed = benchmarkConfigSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
  const defaults = defaultConfig();
  const fileConfig = {
    ...defaults,
    ...(parsed.profiles === undefined ? {} : { profiles: parsed.profiles }),
    ...(parsed.lambdaConfigs === undefined ? {} : { lambdaConfigs: parsed.lambdaConfigs }),
    ...(parsed.implementations === undefined ? {} : { implementations: parsed.implementations }),
    ...(parsed.region === undefined ? {} : { region: parsed.region }),
    ...(parsed.outputFile === undefined ? {} : { outputFile: parsed.outputFile }),
    ...(parsed.scratchRoot === undefined ? {} : { scratchRoot: parsed.scratchRoot }),
    ...(parsed.runToken === undefined ? {} : { runToken: parsed.runToken }),
    ...(parsed.snapshotDate === undefined ? {} : { snapshotDate: parsed.snapshotDate }),
    ...(parsed.destinationPrefix === undefined
      ? {}
      : { destinationPrefix: parsed.destinationPrefix }),
    ...(parsed.concurrency === undefined ? {} : { concurrency: parsed.concurrency }),
    ...(parsed.phases === undefined ? {} : { phases: parsed.phases.map(configPhaseToRunPhase) }),
  };
  return fileConfig;
}

function configPhaseToRunPhase(phase: NonNullable<BenchmarkConfig["phases"]>[number]): PhaseConfig {
  return { phase: phase.name, state: phase.state, wait: phase.wait };
}

function defaultConfig(): RunnerConfig {
  const profiles: BenchmarkProfile[] = ["tiny-many"];
  const lambdaConfigs = [
    { memoryMb: 2048, parallel: 64 },
    { memoryMb: 4096, parallel: 128 },
  ];
  return {
    profiles,
    lambdaConfigs,
    implementations: ["shin", "aws"],
    region: process.env.AWS_REGION ?? "ap-southeast-2",
    outputFile: "benchmarks/results.jsonl",
    concurrency: 1,
    destinationPrefix: "benchmark-site",
    phases: DEFAULT_PHASES,
  };
}

function listValue(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name);
  if (!value) {
    usage();
  }
  return value;
}

function assertCliOption(name: string): void {
  if (!CLI_OPTIONS.has(name)) {
    throw new Error(`Unknown option --${name}.`);
  }
}

function parseLambdaConfig(value: string): LambdaConfig {
  const [memory, parallel] = value.split(":");
  if (!memory || !parallel) {
    usage();
  }
  return {
    memoryMb: positiveInteger(memory, "memory"),
    parallel: positiveInteger(parallel, "parallel"),
  };
}

function parseImplementation(value: string): BenchmarkImplementation {
  if (value === "shin" || value === "aws") {
    return value;
  }
  usage();
}

function parseProfile(value: string): BenchmarkProfile {
  if (value === "tiny-many" || value === "mixed" || value === "large-few") {
    return value;
  }
  usage();
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function defaultRunToken(
  snapshotDate: string,
  profiles: BenchmarkProfile[],
  lambdaConfigs: LambdaConfig[],
): string {
  return `${snapshotDate}-shin-aws-${profiles.join("-")}-${lambdaConfigs
    .map((lambdaConfig) => `${lambdaConfig.memoryMb}-${lambdaConfig.parallel}`)
    .join("-")}`;
}

function upsertResultRows(args: { readonly outputFile: string; readonly rowsText: string }): void {
  const newRows = args.rowsText.split(/\n/).filter((line) => line.trim() !== "");
  const newKeys = new Set(newRows.map(rowBenchmarkKey));
  const retainedRows = existsSync(args.outputFile)
    ? readFileSync(args.outputFile, "utf8")
        .split(/\n/)
        .filter((line) => line.trim() !== "" && !newKeys.has(rowBenchmarkKey(line)))
    : [];
  mkdirSync(dirname(args.outputFile), { recursive: true });
  writeFileSync(args.outputFile, `${[...retainedRows, ...newRows].join("\n")}\n`);
}

function rowBenchmarkKey(line: string): string | null {
  try {
    return benchmarkResultKey(JSON.parse(line) as BenchmarkResultRecord);
  } catch {
    return null;
  }
}

function stackSuffixFor(args: {
  readonly run: LambdaConfig & {
    readonly implementation: BenchmarkImplementation;
    readonly profile: string;
  };
  readonly options: RunOptions;
}): string {
  const dateToken = safeName(args.options.snapshotDate).replace(/-/g, "");
  const runToken = `${dateToken}-${shortHash(args.options.runToken)}`;
  return `-${runToken}-${safeName(args.run.profile)}-${args.run.implementation}-${args.run.memoryMb}-${args.run.parallel}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
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

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/run-assets-comparison.js --config benchmarks/configs/tiny-many-shin-aws-2048-4096.json [--lambda-configs 2048:64,4096:128] [--run-token <id>] [--snapshot-date <YYYY-MM-DD>] [--scratch-root <outside-repo>] [--concurrency 1]",
  );
  process.exit(1);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
