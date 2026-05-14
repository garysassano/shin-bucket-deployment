import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

type ScenarioMode = "verify" | "benchmark";
type ScenarioAction = "list" | "synth" | "deploy" | "destroy";
type BenchmarkImplementation = "shin" | "aws";

type ScenarioDefinition = {
  readonly file: string;
  readonly appRoot?: "benchmarks" | "scenarios";
};

type ScenarioEntry = readonly [string, ScenarioDefinition];

type ParsedArgs = {
  readonly mode: ScenarioMode;
  readonly action: ScenarioAction;
  readonly name?: string;
  readonly runnerOptions: Map<string, string>;
  readonly cdkArgs: string[];
};

type BenchmarkConfig = {
  readonly implementation: BenchmarkImplementation;
  readonly profile?: string;
  readonly state?: string;
  readonly memoryMb?: string;
  readonly parallel?: string;
};

const VERIFY_SCENARIOS = {
  simple: { file: "basic/simple-app.js" },
  "root-prefix": { file: "basic/root-prefix-app.js" },
  "marker-replacement": { file: "metadata/marker-replacement-app.js" },
  "metadata-and-filters": { file: "metadata/metadata-and-filters-app.js" },
  "source-overwrite-order": { file: "metadata/source-overwrite-order-app.js" },
  "prune-update-v1": { file: "updates/prune-update-v1-app.js" },
  "prune-update-v2": { file: "updates/prune-update-v2-app.js" },
  "prune-disabled-v1": { file: "updates/prune-disabled-v1-app.js" },
  "prune-disabled-v2": { file: "updates/prune-disabled-v2-app.js" },
  "retain-on-delete-v1": { file: "retention/retain-on-delete-v1-app.js" },
  "retain-on-delete-v2": { file: "retention/retain-on-delete-v2-app.js" },
  "extract-false": { file: "basic/extract-false-app.js" },
  "delete-cleanup-v1": { file: "retention/delete-cleanup-v1-app.js" },
  "delete-cleanup-v2": { file: "retention/delete-cleanup-v2-app.js" },
  "delete-cleanup-bucket-only": {
    file: "retention/delete-cleanup-bucket-only-app.js",
  },
  "large-archive": { file: "scale/large-archive-app.js" },
  "kms-destination": { file: "security/kms-destination-app.js" },
  "cloudfront-wait": { file: "cloudfront/cloudfront-wait-app.js" },
  "cloudfront-no-wait": { file: "cloudfront/cloudfront-no-wait-app.js" },
} as const satisfies Record<string, ScenarioDefinition>;

const BENCHMARK_SCENARIOS = {
  assets: { appRoot: "benchmarks", file: "apps/assets-app.js" },
} as const satisfies Record<string, ScenarioDefinition>;

const VERIFY_DEFAULT_ORDER = Object.keys(VERIFY_SCENARIOS);
const VERIFY_DEFAULT_GROUPS = [
  ["simple"],
  ["root-prefix"],
  ["marker-replacement"],
  ["metadata-and-filters"],
  ["source-overwrite-order"],
  ["prune-update-v1", "prune-update-v2"],
  ["prune-disabled-v1", "prune-disabled-v2"],
  ["retain-on-delete-v1", "retain-on-delete-v2"],
  ["extract-false"],
  ["delete-cleanup-v1", "delete-cleanup-v2", "delete-cleanup-bucket-only"],
  ["large-archive"],
  ["kms-destination"],
  ["cloudfront-wait"],
  ["cloudfront-no-wait"],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof typeof VERIFY_SCENARIOS>>;
const VERIFY_DESTROY_ORDER = [
  "simple",
  "root-prefix",
  "marker-replacement",
  "metadata-and-filters",
  "prune-update-v2",
  "prune-disabled-v2",
  "retain-on-delete-v2",
  "extract-false",
  "delete-cleanup-bucket-only",
  "source-overwrite-order",
  "large-archive",
  "kms-destination",
  "cloudfront-wait",
  "cloudfront-no-wait",
];
const DEFAULT_VERIFY_CONCURRENCY = 4;

function printUsage(): void {
  console.error(
    "Usage: pnpm scenario <verify|benchmark> <list|synth|deploy|destroy> [name] [runner options] [-- extra cdk args]",
  );
  console.error("");
  console.error("Verification runs every default verification scenario when name is omitted:");
  console.error("  pnpm verify synth");
  console.error("  pnpm verify deploy --concurrency 4");
  console.error("  pnpm verify destroy --concurrency 4");
  console.error("  pnpm verify deploy cloudfront-wait -- --parameters Stack:Name=value");
  console.error("");
  console.error("Benchmarks run selected configs for the named benchmark scenario:");
  console.error(
    "  pnpm benchmark deploy assets --profiles tiny-many,mixed --states baseline --memory-mb 1024,2048 --parallel 8,32 --implementations shin,aws",
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const separatorIndex = argv.indexOf("--");
  const runnerArgs = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const cdkArgs = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  const [mode, action, maybeName, ...rest] = runnerArgs;

  if (!isMode(mode) || !isAction(action)) {
    printUsage();
    process.exit(1);
  }

  const name = maybeName?.startsWith("--") ? undefined : maybeName;
  const optionArgs = name === undefined ? [maybeName, ...rest].filter(isDefined) : rest;
  return { mode, action, name, runnerOptions: parseRunnerOptions(optionArgs), cdkArgs };
}

function parseRunnerOptions(args: string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      printUsage();
      process.exit(1);
    }

    const inlineSeparator = arg.indexOf("=");
    if (inlineSeparator !== -1) {
      options.set(arg.slice(2, inlineSeparator), arg.slice(inlineSeparator + 1));
      continue;
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      printUsage();
      process.exit(1);
    }
    options.set(arg.slice(2), value);
    index += 1;
  }
  return options;
}

function isMode(value: string | undefined): value is ScenarioMode {
  return value === "verify" || value === "benchmark";
}

function isAction(value: string | undefined): value is ScenarioAction {
  return value === "list" || value === "synth" || value === "deploy" || value === "destroy";
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function listScenarios(mode: ScenarioMode): void {
  const scenarios = mode === "verify" ? VERIFY_SCENARIOS : BENCHMARK_SCENARIOS;
  console.log(`Available ${mode} scenarios:`);
  for (const [name, scenario] of Object.entries(scenarios)) {
    console.log(`- ${name}: ${scenario.file}`);
  }
}

function verificationScenarioGroups(
  action: Exclude<ScenarioAction, "list">,
  name: string | undefined,
): ScenarioEntry[][] {
  if (name === undefined) {
    if (action === "deploy") {
      return VERIFY_DEFAULT_GROUPS.map((group) => group.map(verifyScenarioEntry));
    }

    const names = action === "destroy" ? VERIFY_DESTROY_ORDER : VERIFY_DEFAULT_ORDER;
    return names.map((scenarioName) => [verifyScenarioEntry(scenarioName)]);
  }

  const scenario = VERIFY_SCENARIOS[name as keyof typeof VERIFY_SCENARIOS];
  if (!scenario) {
    console.error(`Unknown verify scenario: ${name}`);
    listScenarios("verify");
    process.exit(1);
  }
  return [[[name, scenario]]];
}

function verifyScenarioEntry(name: string): ScenarioEntry {
  return [name, VERIFY_SCENARIOS[name as keyof typeof VERIFY_SCENARIOS]];
}

function benchmarkScenario(name: string | undefined): [string, ScenarioDefinition] {
  if (name === undefined) {
    printUsage();
    process.exit(1);
  }

  const scenario = BENCHMARK_SCENARIOS[name as keyof typeof BENCHMARK_SCENARIOS];
  if (!scenario) {
    console.error(`Unknown benchmark scenario: ${name}`);
    listScenarios("benchmark");
    process.exit(1);
  }
  return [name, scenario];
}

function benchmarkConfigs(options: Map<string, string>): BenchmarkConfig[] {
  const implementations = listOption(options, "implementations", ["shin"]);
  const profiles = listOption(options, "profiles", [undefined]);
  const states = listOption(options, "states", [undefined]);
  const memories = listOption(options, "memory-mb", [undefined]);
  const parallels = listOption(options, "parallel", [undefined]);
  const configs: BenchmarkConfig[] = [];

  for (const implementation of implementations) {
    if (implementation !== "shin" && implementation !== "aws") {
      throw new Error(`Unsupported benchmark implementation: ${implementation}`);
    }
    for (const profile of profiles) {
      for (const state of states) {
        for (const memoryMb of memories) {
          for (const parallel of parallels) {
            configs.push({ implementation, profile, state, memoryMb, parallel });
          }
        }
      }
    }
  }
  return configs;
}

function listOption(
  options: Map<string, string>,
  name: string,
  defaultValue: Array<string | undefined>,
): Array<string | undefined> {
  const value = options.get(name);
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function benchmarkEnv(config: BenchmarkConfig, configCount: number): Record<string, string> {
  return {
    SHIN_BENCH_IMPLEMENTATION: config.implementation,
    ...(process.env.SHIN_BENCH_STACK_SUFFIX !== undefined || configCount === 1
      ? {}
      : { SHIN_BENCH_STACK_SUFFIX: benchmarkStackSuffix(config) }),
    ...(config.profile === undefined ? {} : { SHIN_BENCH_PROFILE: config.profile }),
    ...(config.state === undefined ? {} : { SHIN_BENCH_STATE: config.state }),
    ...(config.memoryMb === undefined ? {} : { SHIN_BENCH_MEMORY_LIMIT_MB: config.memoryMb }),
    ...(config.parallel === undefined
      ? {}
      : { SHIN_BENCH_MAX_PARALLEL_TRANSFERS: config.parallel }),
  };
}

function benchmarkStackSuffix(config: BenchmarkConfig): string {
  return `-${[config.implementation, config.profile, config.memoryMb, config.parallel]
    .filter(isDefined)
    .map((part) => part.replace(/[^A-Za-z0-9-]/g, "-"))
    .join("-")}`;
}

function benchmarkLabel(name: string, config: BenchmarkConfig): string {
  return [
    name,
    config.implementation,
    config.profile,
    config.state,
    config.memoryMb,
    config.parallel,
  ]
    .filter(isDefined)
    .join("/");
}

function benchmarkRunConfigs(
  action: Exclude<ScenarioAction, "list">,
  configs: BenchmarkConfig[],
): BenchmarkConfig[] {
  if (action !== "destroy") {
    return configs;
  }

  const seen = new Set<string>();
  return configs.filter((config) => {
    const key = [config.implementation, config.profile, config.memoryMb, config.parallel].join("|");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function runScenario(
  mode: ScenarioMode,
  action: Exclude<ScenarioAction, "list">,
  name: string,
  scenario: ScenarioDefinition,
  cdkArgs: string[],
  env: Record<string, string> = {},
): Promise<number> {
  const appPath = join(
    process.cwd(),
    "dist",
    scenario.appRoot ?? "scenarios",
    "apps",
    scenario.file,
  );
  const appCommand = `node ${JSON.stringify(appPath)}`;
  if (!existsSync(appPath)) {
    console.error(`Built ${mode} scenario app not found: ${appPath}`);
    console.error("Run `pnpm build` first.");
    return 1;
  }

  console.error(`${action} ${mode} scenario ${name}`);
  const args = ["exec", "cdk", action, "--app", appCommand];
  if (action === "deploy") {
    args.push("--require-approval", "never");
  }
  if (action === "destroy") {
    args.push("--force");
  }
  args.push(...cdkArgs);

  return await new Promise<number>((resolve) => {
    const child = spawn("pnpm", args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("close", (status) => resolve(status ?? 1));
    child.on("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
  });
}

async function runScenarioGroup(
  mode: ScenarioMode,
  action: Exclude<ScenarioAction, "list">,
  group: ScenarioEntry[],
  cdkArgs: string[],
): Promise<number> {
  for (const [scenarioName, scenario] of group) {
    const status = await runScenario(mode, action, scenarioName, scenario, cdkArgs);
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

async function runScenarioGroups(
  mode: ScenarioMode,
  action: Exclude<ScenarioAction, "list">,
  groups: ScenarioEntry[][],
  cdkArgs: string[],
  concurrency: number,
): Promise<number> {
  let nextGroupIndex = 0;
  let firstFailure = 0;

  const workers = Array.from({ length: Math.min(concurrency, groups.length) }, async () => {
    while (firstFailure === 0 && nextGroupIndex < groups.length) {
      const group = groups[nextGroupIndex];
      nextGroupIndex += 1;
      const status = await runScenarioGroup(mode, action, group, cdkArgs);
      if (status !== 0 && firstFailure === 0) {
        firstFailure = status;
      }
    }
  });

  await Promise.all(workers);
  return firstFailure;
}

function parseVerifyConcurrency(options: Map<string, string>): number {
  const raw = options.get("concurrency") ?? process.env.SHIN_VERIFY_CONCURRENCY;
  if (raw === undefined || raw === "") {
    return DEFAULT_VERIFY_CONCURRENCY;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Verify concurrency must be a positive integer.");
  }
  return value;
}

async function main(): Promise<void> {
  const { mode, action, name, runnerOptions, cdkArgs } = parseArgs(process.argv.slice(2));

  if (action === "list") {
    listScenarios(mode);
    return;
  }

  if (mode === "verify") {
    const status = await runScenarioGroups(
      mode,
      action,
      verificationScenarioGroups(action, name),
      cdkArgs,
      parseVerifyConcurrency(runnerOptions),
    );
    if (status !== 0) {
      process.exit(status);
    }
    return;
  }

  const [scenarioName, scenario] = benchmarkScenario(name);
  const configs = benchmarkConfigs(runnerOptions);
  for (const config of benchmarkRunConfigs(action, configs)) {
    const status = await runScenario(
      mode,
      action,
      benchmarkLabel(scenarioName, config),
      scenario,
      cdkArgs,
      benchmarkEnv(config, configs.length),
    );
    if (status !== 0) {
      process.exit(status);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
