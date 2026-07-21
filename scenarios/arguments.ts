import type { ParsedArgs, ScenarioAction, ScenarioMode } from "./types";

const VERIFY_OPTIONS = new Set(["concurrency", "groups"]);
const BENCHMARK_OPTIONS = new Set([
  "asset-profiles",
  "implementations",
  "transfer-max-concurrency",
  "lambda-memory-mb",
]);

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const separatorIndex = argv.indexOf("--");
  const runnerArgs = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
  const cdkArgs = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
  const [modeValue, actionValue, maybeName, ...rest] = runnerArgs;

  if (!isMode(modeValue)) {
    throw new Error(`Unknown scenario mode: ${modeValue ?? "<missing>"}.`);
  }
  if (!isAction(actionValue)) {
    throw new Error(`Unknown scenario action: ${actionValue ?? "<missing>"}.`);
  }

  const name = maybeName?.startsWith("--") ? undefined : maybeName;
  const optionArgs = name === undefined && maybeName !== undefined ? [maybeName, ...rest] : rest;
  const runnerOptions = parseRunnerOptions(optionArgs, modeValue);

  if (actionValue === "list") {
    if (name !== undefined || runnerOptions.size > 0 || cdkArgs.length > 0) {
      throw new Error(
        "The list action does not accept a scenario name, options, or CDK arguments.",
      );
    }
  } else if (modeValue === "benchmark" && name === undefined) {
    throw new Error("Benchmark actions require a scenario name.");
  }
  if (modeValue === "verify" && name !== undefined && runnerOptions.has("groups")) {
    throw new Error("Choose either a verification name or --groups, not both.");
  }

  return {
    mode: modeValue,
    action: actionValue,
    ...(name === undefined ? {} : { name }),
    runnerOptions,
    cdkArgs,
  };
}

function parseRunnerOptions(args: readonly string[], mode: ScenarioMode): Map<string, string> {
  const allowed = mode === "verify" ? VERIFY_OPTIONS : BENCHMARK_OPTIONS;
  const options = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined || !arg.startsWith("--") || arg === "--") {
      throw new Error(`Unexpected argument: ${arg ?? "<missing>"}.`);
    }

    const inlineSeparator = arg.indexOf("=");
    const name = arg.slice(2, inlineSeparator === -1 ? undefined : inlineSeparator);
    if (!allowed.has(name)) {
      throw new Error(`Unknown ${mode} option: --${name}.`);
    }
    if (options.has(name)) {
      throw new Error(`Duplicate option: --${name}.`);
    }

    const value = inlineSeparator === -1 ? args[index + 1] : arg.slice(inlineSeparator + 1);
    if (value === undefined || value === "" || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}.`);
    }
    options.set(name, value);
    if (inlineSeparator === -1) {
      index += 1;
    }
  }
  return options;
}

function isMode(value: string | undefined): value is ScenarioMode {
  return value === "verify" || value === "benchmark";
}

function isAction(value: string | undefined): value is ScenarioAction {
  return value === "list" || value === "synth" || value === "deploy" || value === "destroy";
}
