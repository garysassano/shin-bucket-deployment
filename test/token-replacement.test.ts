import { join } from "node:path";
import { Aws, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { test } from "vitest";
import { CargoBucketDeployment, Source } from "../src";

test("renders source markers for jsonData sources", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.asset(join(__dirname, "fixtures", "my-website")),
      Source.jsonData(
        "runtime/config.json",
        {
          stackName: Aws.STACK_NAME,
          region: Aws.REGION,
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
