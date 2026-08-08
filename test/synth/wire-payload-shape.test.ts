import { join } from "node:path";
import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { test } from "vitest";
import {
  EXPECTED_DEFAULT_PAYLOAD_TREE,
  assertPayloadTree,
} from "../../scripts/synth-payload-shape.mjs";
import { ShinBucketDeployment, Source } from "../../src";
import { testLocalProviderBuild } from "../support/bundling";

test("default deployment emits the complete nested wire key tree", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: destinationBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  assertPayloadTree(propertiesOf(stack), EXPECTED_DEFAULT_PAYLOAD_TREE);
});

function propertiesOf(stack: Stack): Record<string, unknown> {
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type?: string; Properties?: Record<string, unknown> }>;
  };
  const resource = Object.values(template.Resources).find(
    (candidate) => (candidate as { Type?: string }).Type === "AWS::CloudFormation::CustomResource",
  ) as { Properties?: Record<string, unknown> } | undefined;
  if (!resource?.Properties) {
    throw new Error("Shin custom resource not found");
  }
  return resource.Properties;
}
