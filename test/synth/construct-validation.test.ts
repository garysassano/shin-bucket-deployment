import { join } from "node:path";
import { App, Aws, CfnParameter, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AllowedMethods, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test } from "vitest";
import {
  DestinationWriteRetryJitter,
  ShinBucketDeployment,
  type ShinBucketDeploymentProps,
  Source,
  type ValidationError,
} from "../../src";
import { testLocalProviderBuild } from "../support/bundling";

function customResourceProperties(stack: Stack) {
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties: Record<string, unknown> }>;
  };

  const resource = Object.values(template.Resources).find(
    (candidate) => candidate.Type === "AWS::CloudFormation::CustomResource",
  );

  if (!resource) {
    throw new Error("Shin custom resource not found");
  }

  return resource.Properties;
}

describe("ShinBucketDeployment validation and option coverage", () => {
  test("rejects an invalid provider scope", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.data("index.html", "ok")],
          destinationBucket,
          providerScope: "shared" as never,
          localProviderBuild: testLocalProviderBuild(),
        }),
    ).toThrow(/ProviderScope\.STACK or ProviderScope\.DEPLOYMENT/);
  });

  test("rejects an invalid failure diagnostics mode", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.data("index.html", "ok")],
          destinationBucket,
          failureDiagnostics: "full" as never,
          localProviderBuild: testLocalProviderBuild(),
        }),
    ).toThrow(/FailureDiagnostics\.STANDARD or FailureDiagnostics\.DETAILED/);
  });

  test("renders destination ownership without authorizing previous cleanup by default", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      localProviderBuild: testLocalProviderBuild(),
    });

    const properties = customResourceProperties(stack);
    const destinationOwnerId = properties.DestinationOwnerId;
    expect(destinationOwnerId).toEqual(expect.stringMatching(/^[a-f0-9]{8}$/));
    Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
      Tags: Match.arrayWith([
        {
          Key: `aws-cdk:cr-owned:${destinationOwnerId}`,
          Value: "true",
        },
      ]),
    });
    expect(customResourceProperties(stack).DeletePreviousObjectsOnChange).toBeUndefined();
    expect(customResourceProperties(stack).InvalidatePreviousDistributionOnChange).toBeUndefined();
    expect(customResourceProperties(stack).DeleteCurrentObjectsOnDelete).toBe(false);
    expect(customResourceProperties(stack).DeleteStaleObjectsOnDeployment).toBe(true);
  });

  test("canonicalizes a slash destination prefix to root ownership", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destinationBucket,
      destinationKeyPrefix: "/",
      localProviderBuild: testLocalProviderBuild(),
    });

    const properties = customResourceProperties(stack);
    expect(properties.DestinationBucketKeyPrefix).toBe("/");
    Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
      Tags: Match.arrayWith([
        {
          Key: `aws-cdk:cr-owned:${properties.DestinationOwnerId}`,
          Value: "true",
        },
      ]),
    });
  });

  test("accepts a 102-character destination prefix", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const prefix = "a".repeat(102);

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destinationBucket,
      destinationKeyPrefix: prefix,
      localProviderBuild: testLocalProviderBuild(),
    });

    const properties = customResourceProperties(stack);
    Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
      Tags: Match.arrayWith([
        {
          Key: `aws-cdk:cr-owned:${prefix}:${properties.DestinationOwnerId}`,
          Value: "true",
        },
      ]),
    });
  });

  test("rejects a destination prefix longer than 102 characters with a specific code", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destinationBucket,
        destinationKeyPrefix: "a".repeat(103),
        localProviderBuild: testLocalProviderBuild(),
      });
    }).toThrowError(
      expect.objectContaining({
        code: "ShinBucketDeploymentDestinationKeyPrefixTooLong",
        message: "destinationKeyPrefix must be <=102 characters.",
      }) as ValidationError,
    );
  });

  test("rejects an unresolved destination prefix before creating provider resources", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const prefix = new CfnParameter(stack, "Prefix").valueAsString;

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destinationBucket,
        destinationKeyPrefix: prefix,
        localProviderBuild: testLocalProviderBuild(),
      });
    }).toThrowError(
      expect.objectContaining({
        code: "ShinBucketDeploymentDestinationKeyPrefixUnresolved",
        message:
          "destinationKeyPrefix must be a concrete string so destination ownership can be validated.",
      }) as ValidationError,
    );
    expect(stack.node.findAll().some((construct) => construct.node.id === "CustomResource")).toBe(
      false,
    );
  });

  test("infers the previous prefix and defaults unchanged resources", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      destinationKeyPrefix: "new-site",
      destinationLifecycle: {
        onChange: {
          deletePreviousObjects: true,
        },
      },
      localProviderBuild: testLocalProviderBuild(),
    });

    const previousDestinationAuthorization = customResourceProperties(stack)
      .DeletePreviousObjectsOnChange as {
      DestinationBucketName: { Ref: string };
      DestinationBucketKeyPrefix?: string;
    };
    expect(previousDestinationAuthorization).toEqual({
      DestinationBucketName: {
        Ref: expect.stringMatching(/^Dest/),
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:DeleteObject",
            Resource: {
              "Fn::Join": [
                "",
                Match.arrayWith([
                  Match.objectLike({
                    "Fn::GetAtt": [
                      previousDestinationAuthorization.DestinationBucketName.Ref,
                      "Arn",
                    ],
                  }),
                  "/*",
                ]),
              ],
            },
          }),
          Match.objectLike({
            Action: "s3:ListBucket",
            Resource: {
              "Fn::GetAtt": [previousDestinationAuthorization.DestinationBucketName.Ref, "Arn"],
            },
          }),
        ]),
      },
    });
  });

  test("renders and authorizes explicitly changed destination resources", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const previousBucket = new Bucket(stack, "PreviousDest");
    const previousDistribution = new Distribution(stack, "PreviousDistribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(previousBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      destinationKeyPrefix: "new-site",
      destinationLifecycle: {
        onDeploy: {
          deleteStaleObjects: false,
        },
        onChange: {
          deletePreviousObjects: true,
          previousBucket,
          invalidatePreviousDistribution: previousDistribution,
        },
        onDelete: {
          deleteCurrentObjects: true,
        },
      },
      localProviderBuild: testLocalProviderBuild(),
    });

    const previousDestinationAuthorization = customResourceProperties(stack)
      .DeletePreviousObjectsOnChange as {
      DestinationBucketName: { Ref: string };
    };
    expect(previousDestinationAuthorization).toEqual({
      DestinationBucketName: {
        Ref: expect.stringMatching(/^PreviousDest/),
      },
    });
    expect(customResourceProperties(stack).InvalidatePreviousDistributionOnChange).toEqual({
      Ref: expect.stringMatching(/^PreviousDistribution/),
    });
    expect(customResourceProperties(stack).DeleteCurrentObjectsOnDelete).toBe(true);
    expect(customResourceProperties(stack).DeleteStaleObjectsOnDeployment).toBe(false);

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:DeleteObject",
            Resource: {
              "Fn::Join": [
                "",
                Match.arrayWith([
                  Match.objectLike({
                    "Fn::GetAtt": [
                      previousDestinationAuthorization.DestinationBucketName.Ref,
                      "Arn",
                    ],
                  }),
                  "/*",
                ]),
              ],
            },
          }),
          Match.objectLike({
            Action: "s3:ListBucket",
            Resource: {
              "Fn::GetAtt": [previousDestinationAuthorization.DestinationBucketName.Ref, "Arn"],
            },
          }),
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

  test("throws when cloudfront invalidation omits its distribution", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        cloudfrontInvalidation: { paths: ["/index.html"] } as never,
      });
    }).toThrow(/cloudfrontInvalidation\.distribution is required/);
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
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        cloudfrontInvalidation: {
          distribution,
          paths: ["index.html"],
        },
      });
    }).toThrow(/Every cloudfrontInvalidation\.paths entry must start with "\/"/);
  });

  test.each([
    ["accessControl", "public-read", /does not support accessControl/],
    ["cacheControl", [], /does not support cacheControl/],
    ["contentDisposition", "inline", /does not support contentDisposition/],
    ["contentEncoding", "gzip", /does not support contentEncoding/],
    ["contentLanguage", "en", /does not support contentLanguage/],
    ["contentType", "text/plain", /does not support contentType/],
    ["metadata", { release: "stable" }, /does not support metadata/],
    ["serverSideEncryption", "AES256", /does not support serverSideEncryption/],
    ["serverSideEncryptionAwsKmsKeyId", "key", /serverSideEncryptionAwsKmsKeyId/],
    ["storageClass", "STANDARD", /does not support storageClass/],
    ["websiteRedirectLocation", "/index.html", /does not support websiteRedirectLocation/],
    ["useEfs", true, /does not support useEfs/],
    ["signContent", true, /does not support signContent/],
    ["logRetention", 7, /legacy logRetention prop/],
    ["ephemeralStorageSize", {}, /does not support ephemeralStorageSize/],
    [
      "serverSideEncryptionCustomerAlgorithm",
      "AES256",
      /does not support serverSideEncryptionCustomerAlgorithm/,
    ],
    ["expires", { toString: (): string => "tomorrow" }, /does not support expires/],
    ["prune", false, /destinationLifecycle\.onDeploy\.deleteStaleObjects/],
    ["retainOnDelete", false, /destinationLifecycle\.onChange\.deletePreviousObjects/],
    ["distributionPaths", ["/*"], /cloudfrontInvalidation/],
    ["outputObjectKeys", false, /objectKeys property is accessed/],
    ["shareHandler", false, /ProviderScope/],
    ["detailedFailureDiagnostics", true, /FailureDiagnostics/],
    ["rustProjectPath", "/tmp/rust", /localProviderBuild/],
    ["bundling", {}, /localProviderBuild/],
  ] as const)("rejects unsupported prop %s", (propName, value, pattern) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        [propName]: value,
      } as never);
    }).toThrow(pattern);
  });

  test("rejects replaced advanced runtime tuning names", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          sourceWindowMemoryBudgetMb: 256,
          putObjectRetry: { maxAttempts: 4 },
        },
      } as never);
    }).toThrow(/destinationWriteRetry and sourceWindowMemoryBudgetMiB/);
  });

  test("rejects the obsolete flat destination lifecycle shape", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        destinationLifecycle: {
          deleteDestinationObjectsOnDelete: true,
        },
      } as never);
    }).toThrow(/onChange\.deletePreviousObjects/);
  });

  test.each([
    ["onChange.deleteObjects", { onChange: { deleteObjects: true } }],
    ["onChange.fromBucket", { onChange: { fromBucket: true } }],
    ["onChange.invalidateDistribution", { onChange: { invalidateDistribution: true } }],
    ["onDelete.deleteObjects", { onDelete: { deleteObjects: true } }],
  ] as const)("rejects ambiguous destination lifecycle name %s", (_name, lifecycle) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        destinationLifecycle: lifecycle,
      } as never);
    }).toThrow(/onChange\.deletePreviousObjects/);
  });

  test("rejects previousBucket without deletePreviousObjects", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const previousBucket = new Bucket(stack, "PreviousDest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        destinationLifecycle: {
          onChange: {
            previousBucket,
          },
        },
      });
    }).toThrow(/previousBucket requires deletePreviousObjects=true/);
  });

  test("fails synthesis when extract=false is combined with deploy-time markers", () => {
    const app = new App();
    const stack = new Stack(app, "ValidationStack");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("runtime/plain.txt", `region=${Aws.REGION}`)],
      destinationBucket,
      extract: false,
      localProviderBuild: testLocalProviderBuild(),
    });

    expect(() => app.synth()).toThrow(/marker replacement requires extraction/);
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

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      cloudfrontInvalidation: {
        distribution,
        paths: ["/site/index.html", "/site/app.js"],
        waitForCompletion: false,
      },
      localProviderBuild: testLocalProviderBuild(),
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::CloudFormation::CustomResource", {
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

  test("does not request object keys when the output is unused", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      localProviderBuild: testLocalProviderBuild(),
    });

    expect(customResourceProperties(stack).OutputObjectKeys).toBe(false);
  });

  test("requests object keys when the output is accessed", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      localProviderBuild: testLocalProviderBuild(),
    });

    void deployment.objectKeys;

    expect(customResourceProperties(stack).OutputObjectKeys).toBe(true);
  });

  test("renders runtime tuning properties", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      memoryLimit: 1024,
      maxParallelTransfers: 7,
      advancedRuntimeTuning: {
        sourceBlockBytes: 4 * 1024 * 1024,
        sourceBlockMergeGapBytes: 64 * 1024,
        sourceGetConcurrency: 3,
        sourceWindowBytes: 32 * 1024 * 1024,
        sourceWindowMemoryBudgetMiB: 512,
        destinationWriteRetry: {
          maxAttempts: 4,
          baseDelayMs: 100,
          maxDelayMs: 1_000,
          slowdownBaseDelayMs: 2_000,
          slowdownMaxDelayMs: 20_000,
          jitter: DestinationWriteRetryJitter.NONE,
        },
      },
      localProviderBuild: testLocalProviderBuild(),
    });

    expect(customResourceProperties(stack)).toMatchObject({
      MaxParallelTransfers: 7,
      SourceBlockBytes: 4 * 1024 * 1024,
      SourceBlockMergeGapBytes: 64 * 1024,
      SourceGetConcurrency: 3,
      SourceWindowBytes: 32 * 1024 * 1024,
      SourceWindowMemoryBudgetMb: 512,
      PutObjectMaxAttempts: 4,
      PutObjectRetryBaseDelayMs: 100,
      PutObjectRetryMaxDelayMs: 1_000,
      PutObjectSlowdownRetryBaseDelayMs: 2_000,
      PutObjectSlowdownRetryMaxDelayMs: 20_000,
      PutObjectRetryJitter: "none",
    });
  });

  test("defers unresolved numeric tuning to provider validation", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const memory = new CfnParameter(stack, "Memory", { type: "Number" });
    const block = new CfnParameter(stack, "Block", { type: "Number" });

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      memoryLimit: memory.valueAsNumber,
      advancedRuntimeTuning: {
        sourceBlockBytes: block.valueAsNumber,
      },
      localProviderBuild: testLocalProviderBuild(),
    });

    expect(customResourceProperties(stack).SourceBlockBytes).toEqual({ Ref: "Block" });
  });

  test("rejects invalid runtime tuning values", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          sourceGetConcurrency: 0,
        },
      });
    }).toThrow(/sourceGetConcurrency/);

    expect(() => {
      new ShinBucketDeployment(stack, "BadRetryDelay", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          destinationWriteRetry: {
            baseDelayMs: 2_000,
            maxDelayMs: 1_000,
          },
        },
      });
    }).toThrow(/maxDelayMs/);

    expect(() => {
      new ShinBucketDeployment(stack, "BadSlowdownRetryDelay", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          destinationWriteRetry: {
            slowdownBaseDelayMs: 2_000,
            slowdownMaxDelayMs: 1_000,
          },
        },
      });
    }).toThrow(/slowdownMaxDelayMs/);

    expect(() => {
      new ShinBucketDeployment(stack, "BadRetryJitter", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          destinationWriteRetry: {
            jitter: "equal" as never,
          },
        },
      });
    }).toThrow(/DestinationWriteRetryJitter\.FULL or DestinationWriteRetryJitter\.NONE/);

    expect(() => {
      new ShinBucketDeployment(stack, "SmallSourceBlock", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destinationBucket,
        advancedRuntimeTuning: {
          sourceBlockBytes: 29,
        },
      });
    }).toThrow(/sourceBlockBytes must be a safe integer.*30/);

    const invalidCases: Array<{
      readonly id: string;
      readonly props: Partial<ShinBucketDeploymentProps>;
      readonly message: RegExp;
    }> = [
      {
        id: "TooManyTransfers",
        props: { maxParallelTransfers: 257 },
        message: /maxParallelTransfers.*256/,
      },
      {
        id: "TooManySourceGets",
        props: { advancedRuntimeTuning: { sourceGetConcurrency: 65 } },
        message: /sourceGetConcurrency.*64/,
      },
      {
        id: "TooManyDestinationWriteAttempts",
        props: { advancedRuntimeTuning: { destinationWriteRetry: { maxAttempts: 11 } } },
        message: /maxAttempts.*10/,
      },
      {
        id: "LongRetryDelay",
        props: { advancedRuntimeTuning: { destinationWriteRetry: { maxDelayMs: 60_001 } } },
        message: /maxDelayMs.*60000/,
      },
      {
        id: "BudgetAboveHalf",
        props: {
          memoryLimit: 1024,
          advancedRuntimeTuning: { sourceWindowMemoryBudgetMiB: 513 },
        },
        message: /must not exceed 50%/,
      },
      {
        id: "WindowBelowBlock",
        props: { advancedRuntimeTuning: { sourceWindowBytes: 4 * 1024 * 1024 } },
        message: /sourceWindowBytes must be greater than or equal to sourceBlockBytes/,
      },
      {
        id: "ConcurrentBlocksAboveBudget",
        props: {
          advancedRuntimeTuning: {
            sourceBlockBytes: 128 * 1024 * 1024,
            sourceGetConcurrency: 5,
          },
        },
        message: /sourceBlockBytes \* sourceGetConcurrency/,
      },
      {
        id: "UnsafeInteger",
        props: {
          advancedRuntimeTuning: { sourceBlockMergeGapBytes: Number.MAX_SAFE_INTEGER + 1 },
        },
        message: /sourceBlockMergeGapBytes must be a safe integer/,
      },
    ];

    for (const invalid of invalidCases) {
      expect(() => {
        new ShinBucketDeployment(stack, invalid.id, {
          sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
          destinationBucket,
          ...invalid.props,
        });
      }).toThrow(invalid.message);
    }
  });

  test("requests DestinationBucketArn when deployedBucket is accessed", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      localProviderBuild: testLocalProviderBuild(),
    });

    void deployment.deployedBucket.bucketArn;

    expect(customResourceProperties(stack).DestinationBucketArn).toMatchObject({
      "Fn::GetAtt": [expect.any(String), "Arn"],
    });
  });
});
