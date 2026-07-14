import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createScenarioPlan, scenarioAppPath, scenarioCdkArgs } from "./plan";
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
  readonly startProcess?: StartProcess;
  readonly pathExists?: (path: string) => boolean;
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
  const pathExists = options.pathExists ?? existsSync;
  const log = options.log ?? ((message: string) => console.error(message));
  const controller = new AbortController();
  const startedCleanupCommands: string[] = [];
  let nextGroupIndex = 0;
  let firstFailure = 0;
  let externalAborted = false;

  const onExternalAbort = (): void => {
    externalAborted = true;
    controller.abort(options.signal?.reason);
  };
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  if (options.signal?.aborted === true) {
    onExternalAbort();
  }

  const runOne = async (run: ScenarioRun): Promise<number> => {
    const appPath = scenarioAppPath(repositoryRoot, run.definition);
    if (!pathExists(appPath)) {
      log(`Built ${run.mode} scenario app not found: ${appPath}`);
      log("Run `pnpm build` first.");
      return 1;
    }

    log(`${run.action} ${run.mode} scenario ${run.name}`);
    const processHandle = startProcess(run, "pnpm", scenarioCdkArgs(repositoryRoot, run), {
      cwd: repositoryRoot,
      env: { ...process.env, ...run.env },
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
