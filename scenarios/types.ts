import type { BenchmarkImplementation } from "../benchmarks/src/model";

export type ScenarioMode = "verify" | "benchmark";
export type ScenarioAction = "list" | "synth" | "deploy" | "destroy";
export type RunnableScenarioAction = Exclude<ScenarioAction, "list">;

export type ScenarioDefinition = {
  readonly file: string;
  readonly root: "benchmarks" | "scenarios";
  readonly stackName: string;
  readonly postDeployVerifier?: string;
};

export type ScenarioEntry = readonly [name: string, definition: ScenarioDefinition];

export type ParsedArgs = {
  readonly mode: ScenarioMode;
  readonly action: ScenarioAction;
  readonly name?: string;
  readonly runnerOptions: ReadonlyMap<string, string>;
  readonly cdkArgs: readonly string[];
};

export type BenchmarkConfig = {
  readonly assetProfile?: string;
  readonly implementation: BenchmarkImplementation;
  readonly memoryMb?: string;
  readonly parallel?: string;
};

export type ScenarioRun = {
  readonly mode: ScenarioMode;
  readonly action: RunnableScenarioAction;
  readonly name: string;
  readonly definition: ScenarioDefinition;
  readonly cdkArgs: readonly string[];
  readonly env: Readonly<Record<string, string>>;
};

export type ScenarioRunGroup = {
  readonly runs: readonly ScenarioRun[];
  readonly cleanupCommand?: string;
};

export type ScenarioPlan = {
  readonly groups: readonly ScenarioRunGroup[];
  readonly concurrency: number;
};
