import { join } from "node:path";
import { isBenchmarkAssetProfile, isBenchmarkImplementation } from "../benchmarks/src/model";
import {
  BENCHMARK_SCENARIOS,
  VERIFY_DEFAULT_GROUPS,
  VERIFY_DEFAULT_ORDER,
  VERIFY_DESTROY_ORDER,
  verifyScenarioEntry,
} from "./catalog";
import type {
  BenchmarkConfig,
  ParsedArgs,
  RunnableScenarioAction,
  ScenarioDefinition,
  ScenarioEntry,
  ScenarioPlan,
  ScenarioRun,
  ScenarioRunGroup,
} from "./types";

const DEFAULT_VERIFY_CONCURRENCY = 4;
const DEFAULT_VERIFY_SYNTH_CONCURRENCY = 1;

export function createScenarioPlan(
  args: ParsedArgs & { readonly action: RunnableScenarioAction },
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): ScenarioPlan {
  if (args.mode === "verify") {
    return createVerifyPlan(args, environment);
  }
  return createBenchmarkPlan(args, environment);
}

export function scenarioAppPath(repositoryRoot: string, definition: ScenarioDefinition): string {
  return join(repositoryRoot, "dist", definition.root, "apps", definition.file);
}

export function scenarioOutputsPath(repositoryRoot: string, run: ScenarioRun): string {
  const scratchRoot = run.mode === "verify" ? ".verification-assets" : ".benchmark-assets";
  return join(
    repositoryRoot,
    scratchRoot,
    "outputs",
    `${safePathPart(run.definition.stackName)}.json`,
  );
}

export function scenarioCdkArgs(repositoryRoot: string, run: ScenarioRun): string[] {
  const appCommand = `node ${JSON.stringify(scenarioAppPath(repositoryRoot, run.definition))}`;
  const args = [
    "exec",
    "cdk",
    run.action,
    "--app",
    appCommand,
    "--output",
    cdkOutputDir(repositoryRoot, run.mode, run.name),
  ];
  if (run.action === "deploy") {
    args.push("--require-approval", "never");
  } else if (run.action === "destroy") {
    args.push("--force");
  }
  args.push(...run.cdkArgs);
  return args;
}

function createVerifyPlan(
  args: ParsedArgs & { readonly action: RunnableScenarioAction },
  environment: Readonly<NodeJS.ProcessEnv>,
): ScenarioPlan {
  const groups = verificationScenarioGroups(args.action, args.name).map((entries) => ({
    runs: entries.map(([name, definition]) => ({
      mode: "verify" as const,
      action: args.action,
      name,
      definition,
      cdkArgs: args.cdkArgs,
      env: definition.env ?? {},
    })),
    ...(args.action === "deploy"
      ? { cleanupCommand: cleanupCommand(entries.at(-1)?.[0], args.cdkArgs) }
      : {}),
  }));

  return {
    groups,
    concurrency: parseVerifyConcurrency(args.action, args.runnerOptions, environment),
  };
}

function createBenchmarkPlan(
  args: ParsedArgs & { readonly action: RunnableScenarioAction },
  environment: Readonly<NodeJS.ProcessEnv>,
): ScenarioPlan {
  const entry = benchmarkScenario(args.name);
  const configs = benchmarkConfigs(args.runnerOptions);
  const groups: ScenarioRunGroup[] = benchmarkRunConfigs(args.action, configs).map((config) => ({
    runs: [
      {
        mode: "benchmark",
        action: args.action,
        name: benchmarkLabel(entry[0], config),
        definition: entry[1],
        cdkArgs: args.cdkArgs,
        env: benchmarkEnv(config, configs.length, environment),
      },
    ],
    ...(args.action === "deploy"
      ? {
          cleanupCommand: benchmarkCleanupCommand(
            entry[0],
            config,
            configs.length,
            environment,
            args.cdkArgs,
          ),
        }
      : {}),
  }));
  return { groups, concurrency: 1 };
}

function verificationScenarioGroups(
  action: RunnableScenarioAction,
  name: string | undefined,
): ScenarioEntry[][] {
  if (name !== undefined) {
    return [[verifyScenarioEntry(name)]];
  }
  if (action === "deploy") {
    return VERIFY_DEFAULT_GROUPS.map((group) => group.map(verifyScenarioEntry));
  }
  const names = action === "destroy" ? VERIFY_DESTROY_ORDER : VERIFY_DEFAULT_ORDER;
  return names.map((scenarioName) => [verifyScenarioEntry(scenarioName)]);
}

function benchmarkScenario(name: string | undefined): ScenarioEntry {
  if (name === undefined) {
    throw new Error("Benchmark actions require a scenario name.");
  }
  const definition = BENCHMARK_SCENARIOS[name as keyof typeof BENCHMARK_SCENARIOS];
  if (definition === undefined) {
    throw new Error(`Unknown benchmark scenario: ${name}`);
  }
  return [name, definition];
}

function benchmarkConfigs(options: ReadonlyMap<string, string>): BenchmarkConfig[] {
  const assetProfiles = listOption(options, "asset-profiles", [undefined]);
  const implementations = listOption(options, "implementations", ["shin"]);
  const parallelValues = listOption(options, "transfer-max-concurrency", [undefined]);
  const memoryValues = listOption(options, "lambda-memory-mb", [undefined]);
  const configs: BenchmarkConfig[] = [];

  for (const implementation of implementations) {
    if (!isBenchmarkImplementation(implementation)) {
      throw new Error(`Unsupported benchmark implementation: ${implementation}`);
    }
    for (const assetProfile of assetProfiles) {
      if (assetProfile !== undefined && !isBenchmarkAssetProfile(assetProfile)) {
        throw new Error(`Unsupported benchmark asset profile: ${assetProfile}`);
      }
      for (const memoryMb of memoryValues) {
        for (const parallel of parallelValues) {
          configs.push({ assetProfile, implementation, memoryMb, parallel });
        }
      }
    }
  }
  return configs;
}

function listOption(
  options: ReadonlyMap<string, string>,
  name: string,
  defaultValue: Array<string | undefined>,
): Array<string | undefined> {
  const value = options.get(name);
  if (value === undefined) {
    return defaultValue;
  }
  const values = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error(`--${name} must contain at least one value.`);
  }
  return values;
}

function benchmarkEnv(
  config: BenchmarkConfig,
  configCount: number,
  environment: Readonly<NodeJS.ProcessEnv>,
): Record<string, string> {
  return {
    ...(config.assetProfile === undefined ? {} : { SHIN_BENCH_ASSET_PROFILE: config.assetProfile }),
    SHIN_BENCH_IMPLEMENTATION: config.implementation,
    ...(config.parallel === undefined
      ? {}
      : { SHIN_BENCH_TRANSFER_MAX_CONCURRENCY: config.parallel }),
    ...(config.memoryMb === undefined ? {} : { SHIN_BENCH_LAMBDA_MEMORY_MB: config.memoryMb }),
    ...(environment.SHIN_BENCH_STACK_SUFFIX !== undefined || configCount === 1
      ? {}
      : { SHIN_BENCH_STACK_SUFFIX: benchmarkStackSuffix(config) }),
  };
}

function benchmarkStackSuffix(config: BenchmarkConfig): string {
  return `-${[config.implementation, config.assetProfile, config.memoryMb, config.parallel]
    .filter(isDefined)
    .map((part) => part.replace(/[^A-Za-z0-9-]/g, "-"))
    .join("-")}`;
}

function benchmarkLabel(name: string, config: BenchmarkConfig): string {
  return [name, config.implementation, config.assetProfile, config.memoryMb, config.parallel]
    .filter(isDefined)
    .join("/");
}

function benchmarkRunConfigs(
  action: RunnableScenarioAction,
  configs: BenchmarkConfig[],
): BenchmarkConfig[] {
  if (action !== "destroy") {
    return configs;
  }
  const seen = new Set<string>();
  return configs.filter((config) => {
    const key = [config.implementation, config.assetProfile, config.memoryMb, config.parallel].join(
      "|",
    );
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function parseVerifyConcurrency(
  action: RunnableScenarioAction,
  options: ReadonlyMap<string, string>,
  environment: Readonly<NodeJS.ProcessEnv>,
): number {
  const raw = options.get("concurrency") ?? environment.SHIN_VERIFY_CONCURRENCY;
  if (raw === undefined || raw === "") {
    return action === "synth" ? DEFAULT_VERIFY_SYNTH_CONCURRENCY : DEFAULT_VERIFY_CONCURRENCY;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Verify concurrency must be a positive integer.");
  }
  return value;
}

function cleanupCommand(name: string | undefined, cdkArgs: readonly string[]): string {
  if (name === undefined) {
    throw new Error("Cannot create a cleanup command for an empty scenario group.");
  }
  return `pnpm verify destroy ${shellQuote(name)}${forwardedArgs(cdkArgs)}`;
}

function benchmarkCleanupCommand(
  name: string,
  config: BenchmarkConfig,
  configCount: number,
  environment: Readonly<NodeJS.ProcessEnv>,
  cdkArgs: readonly string[],
): string {
  const suffix =
    environment.SHIN_BENCH_STACK_SUFFIX ??
    (configCount === 1 ? undefined : benchmarkStackSuffix(config));
  const envPrefix = suffix === undefined ? "" : `SHIN_BENCH_STACK_SUFFIX=${shellQuote(suffix)} `;
  const options = [
    "--implementations",
    config.implementation,
    ...(config.assetProfile === undefined ? [] : ["--asset-profiles", config.assetProfile]),
    ...(config.memoryMb === undefined ? [] : ["--lambda-memory-mb", config.memoryMb]),
    ...(config.parallel === undefined ? [] : ["--transfer-max-concurrency", config.parallel]),
  ];
  return `${envPrefix}pnpm benchmark destroy ${shellQuote(name)} ${options
    .map(shellQuote)
    .join(" ")}${forwardedArgs(cdkArgs)}`;
}

function forwardedArgs(cdkArgs: readonly string[]): string {
  return cdkArgs.length === 0 ? "" : ` -- ${cdkArgs.map(shellQuote).join(" ")}`;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function cdkOutputDir(repositoryRoot: string, mode: string, name: string): string {
  const scratchRoot = mode === "verify" ? ".verification-assets" : ".benchmark-assets";
  return join(repositoryRoot, scratchRoot, "cdk.out", mode, safePathPart(name));
}

function safePathPart(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "-");
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
