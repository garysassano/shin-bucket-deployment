import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../scenarios/arguments";
import { createScenarioPlan, scenarioAppPath, scenarioCdkArgs } from "../scenarios/plan";
import type { ParsedArgs, RunnableScenarioAction } from "../scenarios/types";

describe("scenario planner", () => {
  it("preserves ordered deploy chains and stack cleanup targets", () => {
    const plan = planFor(["verify", "deploy", "--concurrency", "3"]);
    const cleanupGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "stale-object-cleanup-initial",
    );
    const deletionGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "object-deletion-initial",
    );

    expect(plan.concurrency).toBe(3);
    expect(cleanupGroup?.runs.map(({ name }) => name)).toEqual([
      "stale-object-cleanup-initial",
      "stale-object-cleanup-updated",
    ]);
    expect(cleanupGroup?.runs.map(({ definition }) => definition.stackName)).toEqual([
      "ShinBucketDeploymentStaleObjectCleanupDemo",
      "ShinBucketDeploymentStaleObjectCleanupDemo",
    ]);
    expect(cleanupGroup?.cleanupCommand).toBe("pnpm verify destroy stale-object-cleanup-updated");
    expect(deletionGroup?.runs.map(({ name }) => name)).toEqual([
      "object-deletion-initial",
      "object-deletion-updated",
      "object-deletion-bucket-only",
    ]);
  });

  it("uses final update phases in the default destroy order", () => {
    const names = planFor(["verify", "destroy"]).groups.flatMap(({ runs }) =>
      runs.map(({ name }) => name),
    );

    expect(names).toContain("stale-object-cleanup-updated");
    expect(names).not.toContain("stale-object-cleanup-initial");
    expect(names).toContain("object-deletion-bucket-only");
    expect(names).not.toContain("object-deletion-updated");
  });

  it("normalizes verification and benchmark application paths centrally", () => {
    const verifyRun = planFor(["verify", "synth", "simple"]).groups[0]?.runs[0];
    const benchmarkRun = planFor(["benchmark", "synth", "assets"]).groups[0]?.runs[0];

    expect(verifyRun).toBeDefined();
    expect(benchmarkRun).toBeDefined();
    if (verifyRun === undefined || benchmarkRun === undefined) {
      throw new Error("Expected verification and benchmark runs.");
    }
    expect(scenarioAppPath("/repo", verifyRun.definition)).toBe(
      join("/repo", "dist", "scenarios", "apps", "basic/simple-app.js"),
    );
    expect(scenarioAppPath("/repo", benchmarkRun.definition)).toBe(
      join("/repo", "dist", "benchmarks", "apps", "assets-app.js"),
    );
  });

  it("builds exact CDK arguments and forwards trailing arguments", () => {
    const run = planFor([
      "verify",
      "deploy",
      "simple",
      "--",
      "--parameters",
      "Example:Value=hello world",
    ]).groups[0]?.runs[0];

    expect(run).toBeDefined();
    if (run === undefined) {
      throw new Error("Expected a planned run.");
    }
    expect(scenarioCdkArgs("/repo", run)).toEqual([
      "exec",
      "cdk",
      "deploy",
      "--app",
      'node "/repo/dist/scenarios/apps/basic/simple-app.js"',
      "--output",
      "/repo/.verification-assets/cdk.out/verify/simple",
      "--require-approval",
      "never",
      "--parameters",
      "Example:Value=hello world",
    ]);
    expect(
      planFor(["verify", "deploy", "simple", "--", "--parameters", "Example:Value=hello world"])
        .groups[0]?.cleanupCommand,
    ).toBe("pnpm verify destroy simple -- --parameters 'Example:Value=hello world'");
  });

  it("expands benchmark configurations in stable order", () => {
    const plan = planFor([
      "benchmark",
      "deploy",
      "assets",
      "--asset-profiles",
      "tiny-many,mixed",
      "--implementations",
      "shin,aws",
      "--lambda-memory-mb",
      "1024",
    ]);

    expect(plan.concurrency).toBe(1);
    expect(plan.groups.map(({ runs }) => runs[0]?.name)).toEqual([
      "assets/shin/tiny-many/1024",
      "assets/shin/mixed/1024",
      "assets/aws/tiny-many/1024",
      "assets/aws/mixed/1024",
    ]);
    expect(plan.groups.map(({ cleanupCommand }) => cleanupCommand)).toEqual([
      "SHIN_BENCH_STACK_SUFFIX=-shin-tiny-many-1024 pnpm benchmark destroy assets --implementations shin --asset-profiles tiny-many --lambda-memory-mb 1024",
      "SHIN_BENCH_STACK_SUFFIX=-shin-mixed-1024 pnpm benchmark destroy assets --implementations shin --asset-profiles mixed --lambda-memory-mb 1024",
      "SHIN_BENCH_STACK_SUFFIX=-aws-tiny-many-1024 pnpm benchmark destroy assets --implementations aws --asset-profiles tiny-many --lambda-memory-mb 1024",
      "SHIN_BENCH_STACK_SUFFIX=-aws-mixed-1024 pnpm benchmark destroy assets --implementations aws --asset-profiles mixed --lambda-memory-mb 1024",
    ]);
  });
});

function planFor(argv: string[]) {
  const args = parseArgs(argv) as ParsedArgs & { readonly action: RunnableScenarioAction };
  return createScenarioPlan(args, {});
}
