import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../scenarios/arguments";
import {
  createScenarioPlan,
  scenarioAppPath,
  scenarioCdkArgs,
  scenarioOutputsPath,
} from "../scenarios/plan";
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
    const replacementGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "replacement-safety-initial",
    );
    const coTenantGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "co-tenant-protection-initial",
    );
    const childParentRetentionGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "child-parent-retention-initial",
    );
    const childParentCleanupGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "child-parent-cleanup-initial",
    );
    const crossBucketGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "cross-bucket-change-initial",
    );
    const handlerIsolationGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "handler-isolation",
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
    const defaultRetentionGroup = plan.groups.find(
      ({ runs }) => runs[0]?.name === "default-retention-initial",
    );
    expect(defaultRetentionGroup?.runs.map(({ name }) => name)).toEqual([
      "default-retention-initial",
      "default-retention-updated",
      "default-retention-bucket-only",
    ]);
    expect(defaultRetentionGroup?.cleanupCommand).toBe(
      "pnpm verify destroy default-retention-bucket-only",
    );
    expect(replacementGroup?.runs.map(({ name }) => name)).toEqual([
      "replacement-safety-initial",
      "replacement-safety-updated",
    ]);
    expect(replacementGroup?.cleanupCommand).toBe("pnpm verify destroy replacement-safety-updated");
    expect(coTenantGroup?.runs.map(({ name }) => name)).toEqual([
      "co-tenant-protection-initial",
      "co-tenant-protection-updated",
    ]);
    expect(childParentRetentionGroup?.runs.map(({ name }) => name)).toEqual([
      "child-parent-retention-initial",
      "child-parent-retention-updated",
    ]);
    expect(childParentCleanupGroup?.runs.map(({ name }) => name)).toEqual([
      "child-parent-cleanup-initial",
      "child-parent-cleanup-updated",
    ]);
    expect(crossBucketGroup?.runs.map(({ name }) => name)).toEqual([
      "cross-bucket-change-initial",
      "cross-bucket-change-updated",
    ]);
    expect(
      plan.groups
        .find(({ runs }) => runs[0]?.name === "cloudfront-sync-initial")
        ?.runs.map(({ name }) => name),
    ).toEqual(["cloudfront-sync-initial", "cloudfront-sync-updated"]);
    expect(
      plan.groups
        .find(({ runs }) => runs[0]?.name === "cloudfront-async-initial")
        ?.runs.map(({ name }) => name),
    ).toEqual(["cloudfront-async-initial", "cloudfront-async-updated"]);
    expect(handlerIsolationGroup?.runs.map(({ name }) => name)).toEqual(["handler-isolation"]);
  });

  it("uses final update phases in the default destroy order", () => {
    const names = planFor(["verify", "destroy"]).groups.flatMap(({ runs }) =>
      runs.map(({ name }) => name),
    );

    expect(names).toContain("stale-object-cleanup-updated");
    expect(names).not.toContain("stale-object-cleanup-initial");
    expect(names).toContain("default-retention-bucket-only");
    expect(names).not.toContain("default-retention-updated");
    expect(names).toContain("object-deletion-bucket-only");
    expect(names).not.toContain("object-deletion-updated");
    expect(names).toContain("replacement-safety-updated");
    expect(names).not.toContain("replacement-safety-initial");
    expect(names).toContain("co-tenant-protection-updated");
    expect(names).not.toContain("co-tenant-protection-initial");
    expect(names).toContain("child-parent-retention-updated");
    expect(names).not.toContain("child-parent-retention-initial");
    expect(names).toContain("child-parent-cleanup-updated");
    expect(names).not.toContain("child-parent-cleanup-initial");
    expect(names).toContain("cross-bucket-change-updated");
    expect(names).not.toContain("cross-bucket-change-initial");
    expect(names).toContain("handler-isolation");
    expect(names).toContain("cloudfront-sync-updated");
    expect(names).not.toContain("cloudfront-sync-initial");
    expect(names).toContain("cloudfront-async-updated");
    expect(names).not.toContain("cloudfront-async-initial");
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
    expect(scenarioOutputsPath("/repo", run)).toBe(
      "/repo/.verification-assets/outputs/ShinBucketDeploymentSimpleDemo.json",
    );
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
