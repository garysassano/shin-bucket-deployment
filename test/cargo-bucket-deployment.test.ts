import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { test } from "vitest";
import { CargoBucketDeployment, Source } from "../src";

test("renders a Rust-backed custom resource", () => {
  const stack = new cdk.Stack();
  const destinationBucket = new s3.Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(path.join(__dirname, "fixtures", "my-website"))],
    destinationBucket,
    architecture: lambda.Architecture.X86_64,
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
