import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as s3 from "aws-cdk-lib/aws-s3";
import { test } from "vitest";
import { CargoBucketDeployment, Source } from "../src";

test("renders source markers for jsonData sources", () => {
  const stack = new cdk.Stack();
  const destinationBucket = new s3.Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.asset(path.join(__dirname, "fixtures", "my-website")),
      Source.jsonData(
        "runtime/config.json",
        {
          stackName: cdk.Aws.STACK_NAME,
          region: cdk.Aws.REGION,
        },
        { escape: true },
      ),
    ],
    destinationBucket,
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("Custom::CargoBucketDeployment", {
    SourceMarkers: Match.anyValue(),
    SourceMarkersConfig: Match.arrayWith([
      Match.objectLike({}),
      Match.objectLike({ jsonEscape: true }),
    ]),
    Extract: true,
    Prune: true,
  });
});
