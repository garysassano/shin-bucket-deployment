import { Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test } from "vitest";
import { ShinBucketDeployment, Source, ValidationError } from "../../src";

describe("ValidationError", () => {
  test("is exported with a stable public contract", () => {
    const stack = new Stack(undefined, "ValidationStack");
    const destinationBucket = new Bucket(stack, "Bucket");

    let failure: unknown;
    try {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.txt", "ok")],
        destinationBucket,
        distributionPaths: ["/*"],
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(ValidationError);
    expect(failure).toMatchObject({
      name: "ValidationError",
      code: "DistributionSpecifiedDistributionPathsSpecified",
      constructPath: "ValidationStack/Deploy",
    });
  });
});
