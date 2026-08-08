import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type * as BootstrapFreshness from "../scripts/bootstrap-freshness.mjs";
import { createScenarioPlan, scenarioAppPath, scenarioCdkArgs, scenarioOutputsPath } from "./plan";
import type { ParsedArgs, ScenarioPlan, ScenarioRun } from "./types";

export type RunningProcess = {
  readonly completion: Promise<number>;
  terminate(): void;
};

export type StartProcess = (
  run: ScenarioRun,
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
) => RunningProcess;

export type ExecutionOptions = {
  readonly repositoryRoot?: string;
  readonly signal?: AbortSignal;
  readonly assertDeployableBootstrap?: (
    repositoryRoot: string,
    architectures: readonly string[],
  ) => void;
  readonly startProcess?: StartProcess;
  readonly resolveAwsPrincipalArn?: () => string;
  readonly pathExists?: (path: string) => boolean;
  readonly ensureDirectory?: (path: string) => void;
  readonly log?: (message: string) => void;
};

export async function executeParsedArgs(
  args: ParsedArgs,
  options: ExecutionOptions = {},
): Promise<number> {
  if (args.action === "list") {
    throw new Error("List actions do not have an execution plan.");
  }
  return executeScenarioPlan(createScenarioPlan({ ...args, action: args.action }), options);
}

export async function executeScenarioPlan(
  plan: ScenarioPlan,
  options: ExecutionOptions = {},
): Promise<number> {
  const repositoryRoot = options.repositoryRoot ?? process.cwd();
  const startProcess = options.startProcess ?? spawnProcess;
  const resolveAwsPrincipalArn = options.resolveAwsPrincipalArn ?? currentAwsPrincipalArn;
  const pathExists = options.pathExists ?? existsSync;
  const ensureDirectory =
    options.ensureDirectory ?? ((path) => mkdirSync(path, { recursive: true }));
  const log = options.log ?? ((message: string) => console.error(message));
  const controller = new AbortController();
  const startedCleanupCommands: string[] = [];
  let nextGroupIndex = 0;
  let firstFailure = 0;
  let externalAborted = false;

  const deployedProviderArchitectures = planDeployedProviderArchitectures(plan);
  if (deployedProviderArchitectures.length > 0) {
    // A deploy that uses a prebuilt provider archive built from different
    // provider inputs or a different build recipe would ship a stale binary
    // silently, so refuse before any process starts. The gate covers exactly
    // the union of `providerArchitectures` the plan's deploy runs declare
    // (see planDeployedProviderArchitectures below): a run whose catalog
    // entry declares `[]` — compiles from source or deploys no Shin provider
    // — contributes nothing, and a benchmark run that deploys upstream
    // AwsBucketDeployment is skipped. A run that omits the field defaults to
    // the prebuilt arm64 archive and is gated.
    try {
      const assertDeployableBootstrap =
        options.assertDeployableBootstrap ?? (await loadBootstrapFreshnessGate(repositoryRoot));
      assertDeployableBootstrap(repositoryRoot, deployedProviderArchitectures);
    } catch (error) {
      log(error instanceof Error ? error.message : String(error));
      return 1;
    }
  } else if (plan.groups.some((group) => group.runs.some(isShinProviderDeployRun))) {
    // Every deploy run declared `providerArchitectures: []`, so the plan
    // asserts no prebuilt archive is needed (compile-from-source or no Shin
    // provider). Say so instead of skipping the gate silently: if any of
    // those runs actually ships a prebuilt archive, the catalog entry is the
    // mistake and it is now visible in the run output.
    log(
      "No prebuilt provider architecture is gated: every deploy run declares " +
        "providerArchitectures: [] (compiles from source or deploys no Shin " +
        "provider). If any run ships a prebuilt archive, declare its " +
        "architectures in the scenario catalog.",
    );
  }

  const onExternalAbort = (): void => {
    externalAborted = true;
    controller.abort(options.signal?.reason);
  };
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  if (options.signal?.aborted === true) {
    onExternalAbort();
  }

  const runProcess = async (
    run: ScenarioRun,
    command: string,
    args: readonly string[],
    extraEnv: Readonly<Record<string, string>> = {},
  ): Promise<number> => {
    if (controller.signal.aborted) {
      return 130;
    }
    const processHandle = startProcess(run, command, args, {
      cwd: repositoryRoot,
      env: { ...process.env, ...run.env, ...extraEnv },
    });
    const terminate = (): void => processHandle.terminate();
    controller.signal.addEventListener("abort", terminate, { once: true });
    if (controller.signal.aborted) {
      terminate();
    }
    try {
      return await processHandle.completion;
    } finally {
      controller.signal.removeEventListener("abort", terminate);
    }
  };

  const runOne = async (run: ScenarioRun): Promise<number> => {
    const appPath = scenarioAppPath(repositoryRoot, run.definition);
    if (!pathExists(appPath)) {
      log(`Built ${run.mode} scenario app not found: ${appPath}`);
      log("Run `pnpm build` first.");
      return 1;
    }

    log(`${run.action} ${run.mode} scenario ${run.name}`);
    let deployEnv: Readonly<Record<string, string>> = {};
    if (run.action === "deploy" && run.definition.grantVerifierRead === true) {
      try {
        deployEnv = { SHIN_VERIFY_PRINCIPAL_ARN: resolveAwsPrincipalArn() };
      } catch {
        log("Unable to identify the AWS principal for post-deploy verification.");
        return 1;
      }
    }
    const cdkArgs = scenarioCdkArgs(repositoryRoot, run);
    const outputsFile = scenarioOutputsPath(repositoryRoot, run);
    if (run.action === "deploy" && run.definition.postDeployVerifier !== undefined) {
      const outputsDirectory = dirname(outputsFile);
      if (!pathExists(outputsDirectory)) {
        ensureDirectory(outputsDirectory);
      }
      cdkArgs.push("--outputs-file", outputsFile);
    }
    const status = await runProcess(run, "pnpm", cdkArgs, deployEnv);
    if (status !== 0) return status;
    const verifier =
      run.action === "deploy"
        ? run.definition.postDeployVerifier
        : run.action === "destroy"
          ? run.definition.postDestroyVerifier
          : undefined;
    if (verifier === undefined) return status;
    const verifierPath = join(repositoryRoot, "dist", "scenarios", "verifiers", verifier);
    if (!pathExists(verifierPath)) {
      log(`Built post-${run.action} verifier not found: ${verifierPath}`);
      return 1;
    }
    log(
      `verify ${run.action === "deploy" ? "deployed state" : "cleanup"} for scenario ${run.name}`,
    );
    const verifierArgs = [
      verifierPath,
      "--stack-name",
      run.definition.stackName,
      "--scenario-name",
      run.name,
    ];
    if (run.action === "deploy" || pathExists(outputsFile)) {
      verifierArgs.push("--outputs-file", outputsFile);
    }
    return runProcess(run, "node", verifierArgs);
  };

  const workers = Array.from(
    { length: Math.min(plan.concurrency, plan.groups.length) },
    async () => {
      while (!controller.signal.aborted && nextGroupIndex < plan.groups.length) {
        const groupIndex = nextGroupIndex;
        nextGroupIndex += 1;
        const group = plan.groups[groupIndex];
        if (group === undefined) {
          throw new Error(`Missing scenario group at index ${groupIndex}.`);
        }
        if (group.cleanupCommand !== undefined) {
          startedCleanupCommands.push(group.cleanupCommand);
        }

        for (const run of group.runs) {
          if (controller.signal.aborted) {
            break;
          }
          const status = await runOne(run);
          if (status !== 0) {
            if (!externalAborted && firstFailure === 0) {
              firstFailure = status;
              controller.abort(new Error(`Scenario ${run.name} failed with status ${status}.`));
            }
            break;
          }
        }
      }
    },
  );

  try {
    await Promise.all(workers);
  } finally {
    options.signal?.removeEventListener("abort", onExternalAbort);
  }

  const status = externalAborted ? 130 : firstFailure || (controller.signal.aborted ? 130 : 0);
  if (status !== 0 && startedCleanupCommands.length > 0) {
    log("Cleanup commands for stacks that may remain:");
    for (const command of new Set(startedCleanupCommands)) {
      log(`  ${command}`);
    }
  }
  return status;
}

/**
 * The provider architectures the plan's deploy runs can ship as prebuilt
 * archives, or `[]` when no run will.
 *
 * The runner builds this from what the plan knows before any app synthesizes:
 *
 * - a benchmark run deploys the Shin provider only when
 *   `SHIN_BENCH_IMPLEMENTATION=shin`; the `aws` implementation uses upstream
 *   `AwsBucketDeployment` and needs no Shin archive.
 * - a verify run uses the construct default (the prebuilt `arm64` archive
 *   when one is staged) unless its catalog entry declares
 *   `providerArchitectures` — the catalog is the only place the runner can
 *   learn that a scenario compiles from source or selects another
 *   architecture, because the app decides `providerLambda.localBuild` and
 *   `providerLambda.architecture` at synthesis.
 */
function planDeployedProviderArchitectures(plan: ScenarioPlan): string[] {
  const architectures = new Set<string>();
  for (const group of plan.groups) {
    for (const run of group.runs) {
      if (!isShinProviderDeployRun(run)) {
        continue;
      }
      for (const architecture of run.definition.providerArchitectures ?? ["arm64"]) {
        architectures.add(architecture);
      }
    }
  }
  return [...architectures];
}

/**
 * Whether the run deploys the Shin provider and can therefore select a
 * prebuilt archive. Benchmark runs that deploy upstream `AwsBucketDeployment`
 * need no Shin archive and are never gated.
 */
function isShinProviderDeployRun(run: ScenarioRun): boolean {
  return (
    run.action === "deploy" &&
    !(run.mode === "benchmark" && run.env.SHIN_BENCH_IMPLEMENTATION === "aws")
  );
}

/**
 * Loads the deploy-time bootstrap freshness gate from the repository's
 * `scripts/` directory. The path is resolved at runtime from the repository
 * root because the compiled runner lives two directory levels down
 * (`dist/scenarios/`), so no single static relative import can reach the
 * module from both the source and the build output.
 */
async function loadBootstrapFreshnessGate(
  repositoryRoot: string,
): Promise<(repositoryRoot: string, architectures: readonly string[]) => void> {
  const module = (await import(
    pathToFileURL(join(repositoryRoot, "scripts", "bootstrap-freshness.mjs")).href
  )) as typeof BootstrapFreshness;
  return (root: string, architectures: readonly string[]) =>
    module.assertStagedBootstrapFreshness({ repositoryRoot: root, architectures });
}

function currentAwsPrincipalArn(): string {
  const result = spawnSync(
    "aws",
    ["sts", "get-caller-identity", "--query", "Arn", "--output", "text", "--no-cli-pager"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("AWS principal lookup failed.");
  }
  return verificationPrincipalArn(result.stdout.trim());
}

export function verificationPrincipalArn(callerArn: string): string {
  if (
    /^arn:(aws|aws-cn|aws-us-gov):(iam::[0-9]{12}:(role|user)\/[A-Za-z0-9+=,.@_/-]+|sts::[0-9]{12}:assumed-role\/[^/\s]+\/[^\s]+)$/.test(
      callerArn,
    )
  ) {
    return callerArn;
  }
  throw new Error("AWS principal lookup returned an unexpected identity.");
}

function spawnProcess(
  _run: ScenarioRun,
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
): RunningProcess {
  const child = spawn(command, args, {
    cwd: options.cwd,
    detached: process.platform !== "win32",
    env: options.env,
    stdio: "inherit",
  });
  return childProcessHandle(child);
}

function childProcessHandle(child: ChildProcess): RunningProcess {
  let settled = false;
  let terminationTimer: NodeJS.Timeout | undefined;
  const completion = new Promise<number>((resolve) => {
    child.on("close", (status) => {
      settled = true;
      if (terminationTimer !== undefined) {
        clearTimeout(terminationTimer);
      }
      resolve(status ?? 1);
    });
    child.on("error", (error) => {
      settled = true;
      if (terminationTimer !== undefined) {
        clearTimeout(terminationTimer);
      }
      console.error(error.message);
      resolve(1);
    });
  });
  return {
    completion,
    terminate(): void {
      if (!settled) {
        signalProcess(child, "SIGTERM");
        terminationTimer = setTimeout(() => {
          if (!settled) {
            signalProcess(child, "SIGKILL");
          }
        }, 5_000);
        terminationTimer.unref();
      }
    },
  };
}

function signalProcess(child: ChildProcess, signal: NodeJS.Signals): void {
  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {}
  }
  child.kill(signal);
}
