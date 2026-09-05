import { type App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { expect, test, vi } from "vitest";

const captured = vi.hoisted(() => ({ apps: [] as App[] }));
vi.mock("aws-cdk-lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("aws-cdk-lib")>();
  return {
    ...actual,
    App: class extends actual.App {
      constructor(...args: ConstructorParameters<typeof App>) {
        super(...args);
        captured.apps.push(this);
      }
    },
  };
});

test.each([
  ["filters", () => import("../../scenarios/apps/content/filters-app.js")],
  [
    "stale cleanup initial",
    () => import("../../scenarios/apps/updates/stale-object-cleanup-initial-app.js"),
  ],
  [
    "stale cleanup updated",
    () => import("../../scenarios/apps/updates/stale-object-cleanup-updated-app.js"),
  ],
])("%s uses Shin to delete exact listing keys before the bucket", async (_name, load) => {
  await load();
  const app = captured.apps.at(-1);
  if (!app) throw new Error("Scenario did not create an app");
  const stack = app.node.children.find(Stack.isStack);
  if (!stack) throw new Error("Scenario did not create a stack");
  const template = Template.fromStack(stack);
  template.resourceCountIs("Custom::S3AutoDeleteObjects", 0);
  const [bucketId] = Object.keys(template.findResources("AWS::S3::Bucket"));
  const resources = template.findResources("AWS::CloudFormation::CustomResource");
  const deployment = Object.values(resources).find((resource) => resource.Properties.Destination);
  expect(deployment).toBeDefined();
  expect(deployment?.Properties.Destination.BucketName).toEqual({ Ref: bucketId });
  expect(deployment?.Properties.DestinationLifecycle.OnDelete.DeleteCurrentObjects).toBe(true);
  const policies = template.findResources("AWS::IAM::Policy");
  const deletePolicies = Object.entries(policies).filter(([, policy]) =>
    JSON.stringify(policy.Properties.PolicyDocument).includes("s3:DeleteObject"),
  );
  expect(deletePolicies.length).toBeGreaterThan(0);
  for (const [policyId] of deletePolicies) {
    expect(deployment?.DependsOn).toContain(policyId);
  }
});
