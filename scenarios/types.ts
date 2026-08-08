import type { BenchmarkImplementation } from "../benchmarks/src/model";

export type ScenarioMode = "verify" | "benchmark";
export type ScenarioAction = "list" | "synth" | "deploy" | "destroy";
export type RunnableScenarioAction = Exclude<ScenarioAction, "list">;

export type ScenarioDefinition = {
  readonly file: string;
  readonly root: "benchmarks" | "scenarios";
  readonly stackName: string;
  readonly postDeployVerifier?: string;
  readonly postDestroyVerifier?: string;
  readonly grantVerifierRead?: boolean;
  readonly env?: Readonly<Record<string, string>>;
  /**
   * The provider architectures this scenario can deploy with a prebuilt
   * archive. The runner refuses a stale staged archive for exactly these
   * architectures before any deployment starts, so a scenario that compiles
   * the provider from source (`providerLambda.localBuild`) or deploys no Shin
   * provider must declare `[]`, and a scenario that selects a non-default
   * architecture must declare that architecture here. Omitted means the
   * construct default: the prebuilt `arm64` archive when one is staged.
   *
   * The scenario app itself decides `providerLambda.architecture` and
   * `localBuild` at synthesis, which the runner cannot observe before the app
   * runs, so this catalog field is where that knowledge lives.
   */
  readonly providerArchitectures?: readonly string[];
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
