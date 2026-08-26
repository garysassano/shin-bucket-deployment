import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32 } from "node:zlib";
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
      assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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
        assertDeployableBootstrap: () => {},
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

  it("refuses to start any deployment when the staged bootstrap is stale", async () => {
    const commands: string[] = [];
    const logs: string[] = [];
    const gatedArchitectures: string[][] = [];
    const expected =
      "Refusing to deploy a stale prebuilt provider bootstrap (arm64).\n" +
      "Run `pnpm build:bootstrap`";

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [verifiedRun("stale")] }] },
      {
        repositoryRoot: "/repo",
        assertDeployableBootstrap: (_root, architectures) => {
          gatedArchitectures.push([...architectures]);
          throw new Error(
            "Refusing to deploy a stale prebuilt provider bootstrap (arm64).\n" +
              "Run `pnpm build:bootstrap` to rebuild the staged archives.",
          );
        },
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: (message) => logs.push(message),
      },
    );

    expect(status).toBe(1);
    expect(commands).toEqual([]);
    expect(gatedArchitectures).toEqual([["arm64"]]);
    expect(logs.join("\n")).toContain(expected);
  });

  it("gates only the provider architectures the plan can deploy", async () => {
    const gatedArchitectures: string[][] = [];
    const status = await executeScenarioPlan(
      {
        concurrency: 1,
        groups: [
          {
            runs: [
              {
                ...verifiedRun("arm64-only"),
                definition: {
                  ...verifiedRun("arm64-only").definition,
                  providerArchitectures: ["arm64", "x86_64"],
                },
              },
              {
                ...verifiedRun("local"),
                definition: { ...verifiedRun("local").definition, providerArchitectures: [] },
              },
            ],
          },
        ],
      },
      {
        repositoryRoot: "/repo",
        assertDeployableBootstrap: (_root, architectures) => {
          gatedArchitectures.push([...architectures]);
        },
        pathExists: () => true,
        startProcess: () => ({ completion: Promise.resolve(0), terminate() {} }),
        log: () => {},
      },
    );

    expect(status).toBe(0);
    // The local-build run declares no prebuilt archive; only the union of the
    // architectures the other run can deploy is gated.
    expect(gatedArchitectures).toEqual([["arm64", "x86_64"]]);
  });

  it("does not gate benchmark deploys that use the upstream AWS implementation", async () => {
    const gateCalls: string[][] = [];
    const status = await executeScenarioPlan(
      {
        concurrency: 1,
        groups: [
          {
            runs: [
              {
                ...verifiedRun("aws-benchmark"),
                mode: "benchmark",
                env: { SHIN_BENCH_IMPLEMENTATION: "aws" },
              },
            ],
          },
        ],
      },
      {
        repositoryRoot: "/repo",
        assertDeployableBootstrap: (_root, architectures) => {
          gateCalls.push([...architectures]);
        },
        pathExists: () => true,
        startProcess: () => ({ completion: Promise.resolve(0), terminate() {} }),
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(gateCalls).toEqual([]);
  });

  it("forwards the plan's architecture selection to the real freshness gate", async () => {
    const root = freshnessFixture();
    const logs: string[] = [];
    const commands: string[] = [];
    const status = await executeScenarioPlan(
      {
        concurrency: 1,
        groups: [
          {
            runs: [
              {
                ...verifiedRun("arm64-only"),
                definition: {
                  ...verifiedRun("arm64-only").definition,
                  providerArchitectures: ["arm64"],
                },
              },
            ],
          },
        ],
      },
      {
        repositoryRoot: root,
        pathExists: () => true,
        startProcess: (_run, command) => {
          commands.push(command);
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: (message) => logs.push(message),
      },
    );

    // The fixture stages only a stale x86_64 archive. The real adapter must
    // hand the plan's ["arm64"] selection to the gate, which then checks
    // nothing; if the adapter dropped the selection (the pre-fix bug), the
    // gate would inspect every staged archive, find the stale x86_64 one,
    // and refuse the deploy.
    expect(status).toBe(0);
    expect(commands.length).toBeGreaterThan(0);
    expect(logs.join("\n")).not.toContain("Refusing to deploy a stale prebuilt");
  });

  it("the real freshness gate refuses a stale archive for a selected architecture", async () => {
    const root = freshnessFixture();
    const logs: string[] = [];
    const status = await executeScenarioPlan(
      {
        concurrency: 1,
        groups: [
          {
            runs: [
              {
                ...verifiedRun("stale"),
                definition: {
                  ...verifiedRun("stale").definition,
                  providerArchitectures: ["x86_64"],
                },
              },
            ],
          },
        ],
      },
      {
        repositoryRoot: root,
        // The fixture provenance records a zeroed recipe; supply the current
        // recipe through the runner's identity seam so the real gate refuses
        // hermetically. Deriving it would spawn cargo/rustc/cargo-lambda/zig/
        // rustup, and this Node-level gate must not require a Rust toolchain.
        bootstrapFreshnessIdentity: {
          providerInputSha256: "0".repeat(64),
          buildToolchainSha256: "1".repeat(64),
          buildEnvironmentSha256: "0".repeat(64),
        },
        pathExists: () => true,
        startProcess: () => ({ completion: Promise.resolve(0), terminate() {} }),
        log: (message) => logs.push(message),
      },
    );

    expect(status).toBe(1);
    expect(logs.join("\n")).toContain(
      "Refusing to deploy a stale prebuilt provider bootstrap (x86_64)",
    );
    expect(logs.join("\n")).toContain("Run `pnpm build:bootstrap`");
  });

  it("logs a visible notice when every deploy run declares no prebuilt architecture", async () => {
    const root = freshnessFixture();
    const logs: string[] = [];
    const status = await executeScenarioPlan(
      {
        concurrency: 1,
        groups: [
          {
            runs: [
              {
                ...verifiedRun("local"),
                definition: {
                  ...verifiedRun("local").definition,
                  providerArchitectures: [],
                },
              },
            ],
          },
        ],
      },
      {
        repositoryRoot: root,
        pathExists: () => true,
        startProcess: () => ({ completion: Promise.resolve(0), terminate() {} }),
        log: (message) => logs.push(message),
      },
    );

    expect(status).toBe(0);
    expect(logs.join("\n")).toContain("No prebuilt provider architecture is gated");
  });

  it("does not run the bootstrap freshness gate for destroy actions", async () => {
    const gateCalls: string[] = [];

    const status = await executeScenarioPlan(
      { concurrency: 1, groups: [{ runs: [cleanupRun("clean")] }] },
      {
        repositoryRoot: "/repo",
        assertDeployableBootstrap: (root) => gateCalls.push(root),
        pathExists: () => true,
        startProcess: (_run, _command) => {
          return { completion: Promise.resolve(0), terminate() {} };
        },
        log: () => {},
      },
    );

    expect(status).toBe(0);
    expect(gateCalls).toEqual([]);
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

const fixtureRoots: string[] = [];
afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * A repository fixture for the real freshness-gate path: a one-commit git
 * repo that carries copies of the exact scripts the runner's adapter imports
 * at runtime, plus a stale x86_64 archive (every recorded digest is garbage).
 * The gate refuses that archive whenever x86_64 is selected, and ignores it
 * whenever another architecture is.
 */
function freshnessFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "shin-execute-gate-"));
  fixtureRoots.push(root);
  execFileSync("git", ["-c", "init.defaultBranch=main", "init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "gate@test"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Gate Test"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), "assets\n");
  mkdirSync(join(root, "rust"), { recursive: true });
  writeFileSync(join(root, "rust", "lib.rs"), "// fixture\n");
  writeFileSync(join(root, "mise.toml"), '[tools]\nrust = "1.0.0"\n');
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });

  mkdirSync(join(root, "scripts"), { recursive: true });
  for (const script of ["bootstrap-freshness.mjs", "source-identity.mjs", "verify-package.mjs"]) {
    copyFileSync(join(__dirname, "..", "scripts", script), join(root, "scripts", script));
  }

  stageStaleArchive(root, "x86_64");
  return root;
}

function stageStaleArchive(root: string, arch: string): void {
  const directory = join(root, "assets", `bootstrap-${arch}`);
  mkdirSync(directory, { recursive: true });
  const machine = arch === "arm64" ? 183 : 62;
  const elf = Buffer.alloc(64);
  elf[0] = 0x7f;
  elf.write("ELF", 1, "latin1");
  elf[4] = 2;
  elf[5] = 1;
  elf.writeUInt16LE(machine, 18);
  const crc = crc32(elf);
  const name = Buffer.from("bootstrap");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(elf.length, 18);
  local.writeUInt32LE(elf.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE((3 << 8) | 20, 4);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(elf.length, 20);
  central.writeUInt32LE(elf.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE((0o100755 << 16) >>> 0, 38);
  const centralDirectory = Buffer.concat([central, name]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(local.length + name.length + elf.length, 16);
  const zip = Buffer.concat([local, name, elf, centralDirectory, eocd]);
  writeFileSync(join(directory, "bootstrap.zip"), zip);
  const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");
  writeFileSync(
    join(directory, "build-provenance.json"),
    `${JSON.stringify(
      {
        architecture: arch,
        binaryName: "shin-bucket-deployment-handler",
        sourceCommit: "0".repeat(40),
        sourceDirty: false,
        sourceTreeSha256: "0".repeat(64),
        providerInputSha256: "0".repeat(64),
        buildToolchainSha256: "0".repeat(64),
        buildEnvironmentSha256: "0".repeat(64),
        providerInputDirty: false,
        bootstrapSha256: sha256(elf),
        bootstrapArchiveSha256: sha256(zip),
      },
      null,
      2,
    )}\n`,
  );
}
