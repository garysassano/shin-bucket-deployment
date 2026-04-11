import { join } from "node:path";
import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { test } from "vitest";
import { CargoBucketDeployment, Source } from "../src";
import { testBundling } from "./test-bundling";

test("renders a Rust-backed custom resource", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket,
    architecture: Architecture.X86_64,
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Runtime: "provided.al2023",
    Handler: "bootstrap",
  });

  template.hasResourceProperties("Custom::CargoBucketDeployment", {
    DestinationBucketName: {
      Ref: Match.anyValue(),
    },
    Extract: true,
    Prune: true,
  });
}, 120_000);
