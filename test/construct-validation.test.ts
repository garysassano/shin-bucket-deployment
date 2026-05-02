import { join } from "node:path";
import { App, Aws, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AllowedMethods, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test } from "vitest";
import { RustBucketDeployment, Source } from "../src";
import { testBundling } from "./test-bundling";

function customResourceProperties(stack: Stack) {
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties: Record<string, unknown> }>;
  };

  const resource = Object.values(template.Resources).find(
    (candidate) => candidate.Type === "Custom::RustBucketDeployment",
  );

  if (!resource) {
    throw new Error("Custom::RustBucketDeployment resource not found");
  }

  return resource.Properties;
}

describe("RustBucketDeployment validation and option coverage", () => {
  test("throws when distributionPaths are provided without a distribution", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new RustBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        distributionPaths: ["/index.html"],
      });
    }).toThrow(/Distribution must be specified/);
  });

  test("throws when a distribution path does not start with a slash", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const distribution = new Distribution(stack, "Distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    expect(() => {
      new RustBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        distribution,
        distributionPaths: ["index.html"],
      });
    }).toThrow(/Distribution paths must start with "\/"/);
  });

  test.each([
    ["useEfs", true, /does not support useEfs/],
    ["signContent", true, /does not support signContent/],
    [
      "serverSideEncryptionCustomerAlgorithm",
      "AES256",
      /does not support serverSideEncryptionCustomerAlgorithm/,
    ],
    ["expires", { toString: (): string => "tomorrow" }, /does not support expires/],
  ] as const)("rejects unsupported prop %s", (propName, value, pattern) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new RustBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        [propName]: value,
      } as never);
    }).toThrow(pattern);
  });

  test("fails synthesis when extract=false is combined with deploy-time markers", () => {
    const app = new App();
    const stack = new Stack(app, "ValidationStack");
    const destinationBucket = new Bucket(stack, "Dest");

    new RustBucketDeployment(stack, "Deploy", {
      sources: [Source.data("runtime/plain.txt", `region=${Aws.REGION}`)],
      destinationBucket,
      extract: false,
      bundling: testBundling(),
    });

    expect(() => app.synth()).toThrow(/sources with deploy-time values must be extracted/);
  });

  test("renders CloudFront properties and permissions", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const distribution = new Distribution(stack, "Distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new RustBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
      destinationBucket,
      distribution,
      distributionPaths: ["/site/index.html", "/site/app.js"],
      waitForDistributionInvalidation: false,
      bundling: testBundling(),
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("Custom::RustBucketDeployment", {
      DistributionId: {
        Ref: Match.anyValue(),
      },
      DistributionPaths: ["/site/index.html", "/site/app.js"],
      WaitForDistributionInvalidation: false,
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ["cloudfront:GetInvalidation", "cloudfront:CreateInvalidation"],
            Resource: {
              "Fn::Join": Match.anyValue(),
            },
          }),
        ]),
      },
    });
  });

  test("renders OutputObjectKeys=false when disabled", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new RustBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
      destinationBucket,
      outputObjectKeys: false,
      bundling: testBundling(),
    });

    expect(customResourceProperties(stack).OutputObjectKeys).toBe(false);
  });

  test("renders runtime tuning properties", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new RustBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
      destinationBucket,
      memoryLimit: 1024,
      maxParallelTransfers: 7,
      advancedRuntimeTuning: {
        sourceBlockBytes: 4 * 1024 * 1024,
        sourceBlockMergeGapBytes: 64 * 1024,
        sourceGetConcurrency: 3,
        sourceWindowBytes: 32 * 1024 * 1024,
        sourceWindowMemoryBudgetMb: 768,
        putObjectRetry: {
          maxAttempts: 4,
          baseDelayMs: 100,
          maxDelayMs: 1_000,
          slowdownBaseDelayMs: 2_000,
          slowdownMaxDelayMs: 20_000,
          jitter: "none",
        },
      },
      bundling: testBundling(),
    });

    expect(customResourceProperties(stack)).toMatchObject({
      AvailableMemoryMb: 1024,
      MaxParallelTransfers: 7,
      SourceBlockBytes: 4 * 1024 * 1024,
      SourceBlockMergeGapBytes: 64 * 1024,
      SourceGetConcurrency: 3,
      SourceWindowBytes: 32 * 1024 * 1024,
      SourceWindowMemoryBudgetMb: 768,
      PutObjectMaxAttempts: 4,
      PutObjectRetryBaseDelayMs: 100,
      PutObjectRetryMaxDelayMs: 1_000,
      PutObjectSlowdownRetryBaseDelayMs: 2_000,
      PutObjectSlowdownRetryMaxDelayMs: 20_000,
      PutObjectRetryJitter: "none",
    });
  });

  test("rejects invalid runtime tuning values", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new RustBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          sourceGetConcurrency: 0,
        },
      });
    }).toThrow(/sourceGetConcurrency/);

    expect(() => {
      new RustBucketDeployment(stack, "BadRetryDelay", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          putObjectRetry: {
            baseDelayMs: 2_000,
            maxDelayMs: 1_000,
          },
        },
      });
    }).toThrow(/maxDelayMs/);

    expect(() => {
      new RustBucketDeployment(stack, "BadSlowdownRetryDelay", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          putObjectRetry: {
            slowdownBaseDelayMs: 2_000,
            slowdownMaxDelayMs: 1_000,
          },
        },
      });
    }).toThrow(/slowdownMaxDelayMs/);

    expect(() => {
      new RustBucketDeployment(stack, "BadRetryJitter", {
        sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          putObjectRetry: {
            jitter: "equal" as never,
          },
        },
      });
    }).toThrow(/jitter/);
  });

  test("requests DestinationBucketArn when deployedBucket is accessed", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const deployment = new RustBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
      destinationBucket,
      bundling: testBundling(),
    });

    void deployment.deployedBucket.bucketArn;

    expect(customResourceProperties(stack).DestinationBucketArn).toMatchObject({
      "Fn::GetAtt": [expect.any(String), "Arn"],
    });
  });
});
