import { describe, expect, it } from "vitest";
import { type RunningProcess, type StartProcess, executeScenarioPlan } from "../scenarios/execute";
import type { ScenarioPlan, ScenarioRun } from "../scenarios/types";

describe("scenario executor", () => {
  it("cancels parallel siblings after the first failure and prints cleanup commands", async () => {
    const started: string[] = [];
    const terminated: string[] = [];
    const logs: string[] = [];
    const startProcess: StartProcess = (run) => {
      started.push(run.name);
      if (run.name === "fails") {
        return { completion: Promise.resolve(7), terminate() {} };
      }
      return deferredProcess(run.name, terminated);
    };

    const status = await executeScenarioPlan(parallelPlan(), {
      repositoryRoot: "/repo",
      pathExists: () => true,
      startProcess,
      log: (message) => logs.push(message),
    });

    expect(status).toBe(7);
    expect(started).toEqual(["fails", "sibling"]);
    expect(terminated).toEqual(["sibling"]);
    expect(logs).toContain("Cleanup commands for stacks that may remain:");
    expect(logs).toContain("  pnpm verify destroy fails");
    expect(logs).toContain("  pnpm verify destroy sibling");
    expect(started).not.toContain("never-started");
  });

  it("cancels a running process when the caller signals termination", async () => {
    const controller = new AbortController();
    const terminated: string[] = [];
    const startProcess: StartProcess = (run) => {
      queueMicrotask(() => controller.abort());
      return deferredProcess(run.name, terminated);
    };

    const status = await executeScenarioPlan(
      {
        concurrency: 1,
        groups: [{ runs: [run("signal")], cleanupCommand: "pnpm verify destroy signal" }],
      },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        signal: controller.signal,
        startProcess,
        log: () => {},
      },
    );

    expect(status).toBe(130);
    expect(terminated).toEqual(["signal"]);
  });
});

function parallelPlan(): ScenarioPlan {
  return {
    concurrency: 2,
    groups: [
      { runs: [run("fails")], cleanupCommand: "pnpm verify destroy fails" },
      { runs: [run("sibling")], cleanupCommand: "pnpm verify destroy sibling" },
      { runs: [run("never-started")], cleanupCommand: "pnpm verify destroy never-started" },
    ],
  };
}

function run(name: string): ScenarioRun {
  return {
    mode: "verify",
    action: "deploy",
    name,
    definition: { file: `${name}.js`, root: "scenarios", stackName: name },
    cdkArgs: [],
    env: {},
  };
}

function deferredProcess(name: string, terminated: string[]): RunningProcess {
  let resolveCompletion: ((status: number) => void) | undefined;
  const completion = new Promise<number>((resolve) => {
    resolveCompletion = resolve;
  });
  return {
    completion,
    terminate(): void {
      terminated.push(name);
      resolveCompletion?.(143);
    },
  };
}
