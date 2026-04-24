import { join } from "node:path";
import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { expect, test } from "vitest";
import { RustBucketDeployment, Source } from "../src";
import { testBundling } from "./test-bundling";

test("renders a Rust-backed custom resource", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new RustBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket,
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Runtime: "provided.al2023",
    Handler: "bootstrap",
    Architectures: ["arm64"],
  });

  template.hasResourceProperties("Custom::RustBucketDeployment", {
    DestinationBucketName: {
      Ref: Match.anyValue(),
    },
    Extract: true,
    Prune: true,
  });
}, 120_000);

test("reuses a shared handler for compatible deployments in the same stack", () => {
  const stack = new Stack();
  const firstBucket = new Bucket(stack, "FirstDest");
  const secondBucket = new Bucket(stack, "SecondDest");

  const first = new RustBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: firstBucket,
    bundling: testBundling(),
  });

  const second = new RustBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: secondBucket,
    bundling: testBundling(),
  });

  expect(first.handlerFunction).toBe(second.handlerFunction);

  const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
  expect(Object.keys(lambdaFunctions)).toHaveLength(1);
});

test("creates separate handlers when the provider configuration differs", () => {
  const stack = new Stack();
  const firstBucket = new Bucket(stack, "FirstDest");
  const secondBucket = new Bucket(stack, "SecondDest");

  const first = new RustBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: firstBucket,
    bundling: testBundling(),
  });

  const second = new RustBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: secondBucket,
    memoryLimit: 1024,
    bundling: testBundling(),
  });

  expect(first.handlerFunction).not.toBe(second.handlerFunction);

  const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
  expect(Object.keys(lambdaFunctions)).toHaveLength(2);
});
