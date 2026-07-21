import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type RunningProcess,
  type StartProcess,
  executeScenarioPlan,
  verificationPrincipalArn,
} from "../scenarios/execute";
import type { RunnableScenarioAction, ScenarioPlan, ScenarioRun } from "../scenarios/types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("scenario executor", () => {
  it("accepts assumed-role session principals without reconstructing role paths", () => {
    expect(
      verificationPrincipalArn(
        "arn:aws:sts::111122223333:assumed-role/VerifierRole/workflow-session",
      ),
    ).toBe("arn:aws:sts::111122223333:assumed-role/VerifierRole/workflow-session");
    expect(
      verificationPrincipalArn(
        "arn:aws-us-gov:sts::111122223333:assumed-role/VerifierRole/workflow-session",
      ),
    ).toBe("arn:aws-us-gov:sts::111122223333:assumed-role/VerifierRole/workflow-session");
  });

  it("accepts IAM role and user principals and rejects unrelated identities", () => {
    expect(verificationPrincipalArn("arn:aws:iam::111122223333:role/path/VerifierRole")).toBe(
      "arn:aws:iam::111122223333:role/path/VerifierRole",
    );
    expect(verificationPrincipalArn("arn:aws:iam::111122223333:user/VerifierUser")).toBe(
      "arn:aws:iam::111122223333:user/VerifierUser",
    );
    expect(() => verificationPrincipalArn("arn:aws:iam::111122223333:root")).toThrow(
      "unexpected identity",
    );
  });

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

  it("runs a configured verifier after a successful deployment", async () => {
    const commands: Array<{
      command: string;
      args: readonly string[];
      verifierPrincipal?: string;
    }> = [];
    const baseScenario = run("verified");
    const scenario: ScenarioRun = {
      ...baseScenario,
      definition: {
        ...baseScenario.definition,
        stackName: "VerifiedStack",
        postDeployVerifier: "state.js",
        grantVerifierRead: true,
      },
    };

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [scenario] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        resolveAwsPrincipalArn: () =>
          "arn:aws:sts::111122223333:assumed-role/VerifierRole/workflow-session",
        startProcess: (_run, command, args, options) => {
          commands.push({
            command,
            args,
            ...(options.env.SHIN_VERIFY_PRINCIPAL_ARN
              ? { verifierPrincipal: options.env.SHIN_VERIFY_PRINCIPAL_ARN }
              : {}),
          });
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(commands).toEqual([
      {
        command: "pnpm",
        args: expect.arrayContaining([
          "deploy",
          "--outputs-file",
          "/repo/.verification-assets/outputs/VerifiedStack.json",
        ]),
        verifierPrincipal: "arn:aws:sts::111122223333:assumed-role/VerifierRole/workflow-session",
      },
      {
        command: "node",
        args: [
          "/repo/dist/scenarios/verifiers/state.js",
          "--stack-name",
          "VerifiedStack",
          "--scenario-name",
          "verified",
          "--outputs-file",
          "/repo/.verification-assets/outputs/VerifiedStack.json",
        ],
      },
    ]);
  });

  it("creates the persistent outputs directory before deployment", async () => {
    const events: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [verifiedRun("directory")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: (path) => path !== "/repo/.verification-assets/outputs",
        ensureDirectory: (path) => events.push(`mkdir:${path}`),
        startProcess: (_run, command) => {
          events.push(command);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(events).toEqual(["mkdir:/repo/.verification-assets/outputs", "pnpm", "node"]);
  });

  it("shares one output file across ordered phases of the same stack", async () => {
    const outputFiles: string[] = [];
    const initial = verifiedRun("initial");
    const updated: ScenarioRun = {
      ...verifiedRun("updated"),
      definition: { ...verifiedRun("updated").definition, stackName: initial.definition.stackName },
    };

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [initial, updated] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command, args) => {
          if (command === "pnpm") {
            const index = args.indexOf("--outputs-file");
            const path = index === -1 ? undefined : args[index + 1];
            if (path) outputFiles.push(path);
          }
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(outputFiles).toEqual([
      "/repo/.verification-assets/outputs/initial.json",
      "/repo/.verification-assets/outputs/initial.json",
    ]);
  });

  it("fails before deployment when the verifier principal cannot be resolved", async () => {
    const commands: string[] = [];
    const logs: string[] = [];
    const baseScenario = verifiedRun("principal-fails");
    const scenario: ScenarioRun = {
      ...baseScenario,
      definition: { ...baseScenario.definition, grantVerifierRead: true },
    };

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [scenario] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        resolveAwsPrincipalArn: () => {
          throw new Error("simulated STS failure");
        },
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: (message) => logs.push(message),
      },
    );

    expect(status).toBe(1);
    expect(commands).toEqual([]);
    expect(logs).toContain("Unable to identify the AWS principal for post-deploy verification.");
  });

  it("reports verifier failure as scenario failure", async () => {
    const commands: string[] = [];
    const scenario = verifiedRun("verifier-fails");

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [scenario] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(command === "node" ? 9 : 0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(9);
    expect(commands).toEqual(["pnpm", "node"]);
  });

  it("fails a deployment when its configured verifier is missing", async () => {
    const commands: string[] = [];
    const logs: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [verifiedRun("missing-verifier")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: (path) => !path.includes("/verifiers/"),
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: (message) => logs.push(message),
      },
    );

    expect(status).toBe(1);
    expect(commands).toEqual(["pnpm"]);
    expect(logs).toContain(
      "Built post-deploy verifier not found: /repo/dist/scenarios/verifiers/state.js",
    );
  });

  it("does not run a verifier after a failed deployment", async () => {
    const commands: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [verifiedRun("deploy-fails")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(4), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(4);
    expect(commands).toEqual(["pnpm"]);
  });

  it("runs a configured verifier after destroy and forwards saved outputs", async () => {
    const commands: Array<{ command: string; args: readonly string[] }> = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [cleanupRun("cleaned")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command, args) => {
          commands.push({ command, args });
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(commands).toEqual([
      {
        command: "pnpm",
        args: expect.arrayContaining(["destroy", "--force"]),
      },
      {
        command: "node",
        args: [
          "/repo/dist/scenarios/verifiers/absent.js",
          "--stack-name",
          "cleaned",
          "--scenario-name",
          "cleaned",
          "--outputs-file",
          "/repo/.verification-assets/outputs/cleaned.json",
        ],
      },
    ]);
  });

  it("runs cleanup verification without outputs after a failed or partial deployment", async () => {
    const verifierArgs: Array<readonly string[]> = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [cleanupRun("partial")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: (path) => path !== "/repo/.verification-assets/outputs/partial.json",
        startProcess: (_run, command, args) => {
          if (command === "node") verifierArgs.push(args);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(verifierArgs).toEqual([
      [
        "/repo/dist/scenarios/verifiers/absent.js",
        "--stack-name",
        "partial",
        "--scenario-name",
        "partial",
      ],
    ]);
  });

  it("reports cleanup verifier failure as scenario failure", async () => {
    const commands: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [cleanupRun("cleanup-fails")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(command === "node" ? 8 : 0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(8);
    expect(commands).toEqual(["pnpm", "node"]);
  });

  it("does not run cleanup verification after stack destroy fails", async () => {
    const commands: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [cleanupRun("destroy-fails")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(6), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(6);
    expect(commands).toEqual(["pnpm"]);
  });

  it.each([
    "synth",
    "destroy",
  ] as const)("does not run a verifier for a successful %s action", async (action) => {
    const commands: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [verifiedRun(action, action)] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(commands).toEqual(["pnpm"]);
  });

  it("cancels a running post-deploy verifier", async () => {
    const controller = new AbortController();
    const terminated: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [verifiedRun("cancel-verifier")] }] },
      {
        repositoryRoot: "/repo",
        pathExists: () => true,
        signal: controller.signal,
        startProcess: (_run, command) => {
          if (command === "pnpm") {
            return { completion: Promise.resolve(0), terminate() {} };
          }
          queueMicrotask(() => controller.abort());
          return deferredProcess("verifier", terminated);
        },
        log: () => {},
      },
    );

    expect(status).toBe(130);
    expect(terminated).toEqual(["verifier"]);
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

function run(name: string, action: RunnableScenarioAction = "deploy"): ScenarioRun {
  return {
    mode: "verify",
    action,
    name,
    definition: { file: `${name}.js`, root: "scenarios", stackName: name },
    cdkArgs: [],
    env: {},
  };
}

function verifiedRun(name: string, action: RunnableScenarioAction = "deploy"): ScenarioRun {
  const baseScenario = run(name, action);
  return {
    ...baseScenario,
    definition: {
      ...baseScenario.definition,
      postDeployVerifier: "state.js",
    },
  };
}

function cleanupRun(name: string): ScenarioRun {
  const baseScenario = run(name, "destroy");
  return {
    ...baseScenario,
    definition: {
      ...baseScenario.definition,
      postDestroyVerifier: "absent.js",
    },
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
