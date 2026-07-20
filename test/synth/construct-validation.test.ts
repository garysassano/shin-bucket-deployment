import { join } from "node:path";
import { App, Aws, CfnParameter, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AllowedMethods, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test } from "vitest";
import {
  DestinationWriteRetryJitter,
  ProviderSharing,
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
  test("rejects an invalid provider sharing value", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.data("index.html", "ok")],
          destination: {
            bucket: destinationBucket,
          },
          providerLambda: {
            sharing: "shared" as never,
            localBuild: testLocalProviderBuild(),
          },
        }),
    ).toThrow(/ProviderSharing\.STACK or ProviderSharing\.DEPLOYMENT/);
  });

  test("rejects an invalid failure diagnostics mode", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.data("index.html", "ok")],
          destination: {
            bucket: destinationBucket,
          },
          providerLambda: {
            failureDiagnostics: "full" as never,
            localBuild: testLocalProviderBuild(),
          },
        }),
    ).toThrow(/FailureDiagnostics\.STANDARD or FailureDiagnostics\.DETAILED/);
  });

  test("renders destination ownership without authorizing previous cleanup by default", () => {
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
      destination: {
        bucket: destinationBucket,
        keyPrefix: "/",
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
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
      destination: {
        bucket: destinationBucket,
        keyPrefix: prefix,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
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
        destination: {
          bucket: destinationBucket,
          keyPrefix: "a".repeat(103),
        },
        providerLambda: {
          localBuild: testLocalProviderBuild(),
        },
      });
    }).toThrowError(
      expect.objectContaining({
        code: "ShinBucketDeploymentDestinationKeyPrefixTooLong",
        message: "destination.keyPrefix must be <=102 characters.",
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
        destination: {
          bucket: destinationBucket,
          keyPrefix: prefix,
        },
        providerLambda: {
          localBuild: testLocalProviderBuild(),
        },
      });
    }).toThrowError(
      expect.objectContaining({
        code: "ShinBucketDeploymentDestinationKeyPrefixUnresolved",
        message:
          "destination.keyPrefix must be a concrete string so destination ownership can be validated.",
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
      destination: {
        bucket: destinationBucket,
        keyPrefix: "new-site",
      },
      destinationLifecycle: {
        onChange: {
          deletePreviousObjects: true,
        },
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
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
      destination: {
        bucket: destinationBucket,
        keyPrefix: "new-site",
      },
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
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
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
        destination: {
          bucket: destinationBucket,
        },
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
        destination: {
          bucket: destinationBucket,
        },
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
    ["logRetention", 7, /providerLambda\.logGroup/],
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
    ["shareHandler", false, /providerLambda\.sharing/],
    ["detailedFailureDiagnostics", true, /providerLambda\.failureDiagnostics/],
    ["rustProjectPath", "/tmp/rust", /providerLambda\.localBuild/],
    ["bundling", {}, /providerLambda\.localBuild/],
  ] as const)("rejects unsupported prop %s", (propName, value, pattern) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        [propName]: value,
      } as never);
    }).toThrow(pattern);
  });

  test.each([
    ["destinationBucket", "destination.bucket"],
    ["destinationKeyPrefix", "destination.keyPrefix"],
    ["extract", "sourceProcessing.extract"],
    ["include", "sourceProcessing.include"],
    ["exclude", "sourceProcessing.exclude"],
    ["providerScope", "providerLambda.sharing"],
    ["architecture", "providerLambda.architecture"],
    ["memoryLimit", "providerLambda.memorySize"],
    ["failureDiagnostics", "providerLambda.failureDiagnostics"],
    ["role", "providerLambda.role"],
    ["logGroup", "providerLambda.logGroup"],
    ["vpc", "providerLambda.vpc"],
    ["vpcSubnets", "providerLambda.vpcSubnets"],
    ["securityGroups", "providerLambda.securityGroups"],
    ["localProviderBuild", "providerLambda.localBuild"],
    ["maxParallelTransfers", "transfer.maxConcurrency"],
    ["advancedRuntimeTuning", "transfer.advancedTuning"],
  ] as const)("rejects former root property %s with exact migration guidance", (former, next) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
        [former]: undefined,
      } as never);
    }).toThrow(new RegExp(`${former} has moved to ${next.replaceAll(".", "\\.")}\\.`));
    expect(
      stack.node
        .findAll()
        .some((construct) => construct.node.id.startsWith("ShinBucketDeploymentHandler")),
    ).toBe(false);
  });

  test("rejects malformed required objects before provider creation", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const invalidInputs: ReadonlyArray<readonly [unknown, RegExp]> = [
      [undefined, /props must be an object/],
      [{ destination: { bucket: destinationBucket } }, /sources must be an array/],
      [{ sources: {}, destination: { bucket: destinationBucket } }, /sources must be an array/],
      [{ sources: [] }, /destination must be an object/],
      [{ sources: [], destination: null }, /destination must be an object/],
      [{ sources: [], destination: [] }, /destination must be an object/],
      [{ sources: [], destination: {} }, /destination\.bucket is required/],
    ];

    for (const [index, [input, expected]] of invalidInputs.entries()) {
      expect(() => {
        new ShinBucketDeployment(stack, `Invalid${index}`, input as never);
      }).toThrow(expected);
    }
    expect(
      stack.node
        .findAll()
        .some((construct) => construct.node.id.startsWith("ShinBucketDeploymentHandler")),
    ).toBe(false);
  });

  test("rejects unknown keys in every configuration group", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const invalidGroups: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
      ["props.sorces", { sorces: [] }],
      [
        "destination.keyPreffix",
        { destination: { bucket: destinationBucket, keyPreffix: "site" } },
      ],
      ["sourceProcessing.extrcat", { sourceProcessing: { extrcat: true } }],
      ["providerLambda.memmorySize", { providerLambda: { memmorySize: 2048 } }],
      [
        "providerLambda.localBuild.projectPat",
        { providerLambda: { localBuild: { projectPat: "/tmp/rust" } } },
      ],
      [
        "providerLambda.localBuild.bundling.profille",
        { providerLambda: { localBuild: { bundling: { profille: "release" } } } },
      ],
      [
        "providerLambda.localBuild.bundling.dockerOptions.netwrok",
        {
          providerLambda: {
            localBuild: { bundling: { dockerOptions: { netwrok: "host" } } },
          },
        },
      ],
      [
        "providerLambda.localBuild.bundling.commandHooks.beforeBundle",
        {
          providerLambda: {
            localBuild: { bundling: { commandHooks: { beforeBundle: () => [] } } },
          },
        },
      ],
      ["transfer.maxParallelTransfer", { transfer: { maxParallelTransfer: 4 } }],
      [
        "transfer.advancedTuning.sourceBlockByte",
        { transfer: { advancedTuning: { sourceBlockByte: 1024 } } },
      ],
      [
        "transfer.advancedTuning.destinationWriteRetry.maxAttempt",
        {
          transfer: { advancedTuning: { destinationWriteRetry: { maxAttempt: 4 } } },
        },
      ],
      ["cloudfrontInvalidation.pathz", { cloudfrontInvalidation: { pathz: ["/*"] } }],
      ["destinationLifecycle.onDeply", { destinationLifecycle: { onDeply: {} } }],
      [
        "destinationLifecycle.onDeploy.deleteStaleObject",
        { destinationLifecycle: { onDeploy: { deleteStaleObject: false } } },
      ],
      [
        "destinationLifecycle.onChange.previousBukket",
        { destinationLifecycle: { onChange: { previousBukket: destinationBucket } } },
      ],
      [
        "destinationLifecycle.onDelete.deleteCurrentObject",
        { destinationLifecycle: { onDelete: { deleteCurrentObject: true } } },
      ],
    ];

    for (const [index, [path, invalid]] of invalidGroups.entries()) {
      expect(() => {
        new ShinBucketDeployment(stack, `Unknown${index}`, {
          sources: [Source.data("index.html", "ok")],
          destination: { bucket: destinationBucket },
          ...invalid,
        } as never);
      }).toThrow(
        new RegExp(`Unknown ShinBucketDeployment property ${path.replaceAll(".", "\\.")}`),
      );
    }
  });

  test.each([
    [
      "providerLambda.scope",
      { providerLambda: { scope: ProviderSharing.STACK } },
      /providerLambda\.sharing/,
    ],
    [
      "transfer.maxParallelTransfers",
      { transfer: { maxParallelTransfers: 8 } },
      /transfer\.maxConcurrency/,
    ],
    [
      "transfer.advancedTuning.putObjectRetry",
      { transfer: { advancedTuning: { putObjectRetry: { maxAttempts: 4 } } } },
      /destinationWriteRetry/,
    ],
    [
      "transfer.advancedTuning.sourceWindowMemoryBudgetMb",
      { transfer: { advancedTuning: { sourceWindowMemoryBudgetMb: 256 } } },
      /sourceWindowMemoryBudgetMiB/,
    ],
  ] as const)("rejects replaced nested property %s", (_path, invalid, expected) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        ...invalid,
      } as never);
    }).toThrow(expected);
  });

  test("rejects the obsolete flat destination lifecycle shape", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        destinationLifecycle: {
          deleteDestinationObjectsOnDelete: true,
        },
      } as never);
    }).toThrow(/onDelete\.deleteCurrentObjects/);
  });

  test.each([
    ["onChange.deleteObjects", { onChange: { deleteObjects: true } }, /deletePreviousObjects/],
    ["onChange.fromBucket", { onChange: { fromBucket: true } }, /previousBucket/],
    [
      "onChange.invalidateDistribution",
      { onChange: { invalidateDistribution: true } },
      /invalidatePreviousDistribution/,
    ],
    ["onDelete.deleteObjects", { onDelete: { deleteObjects: true } }, /deleteCurrentObjects/],
  ] as const)("rejects ambiguous destination lifecycle name %s", (_name, lifecycle, expected) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        destinationLifecycle: lifecycle,
      } as never);
    }).toThrow(expected);
  });

  test("rejects previousBucket without deletePreviousObjects", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const previousBucket = new Bucket(stack, "PreviousDest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
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
      destination: {
        bucket: destinationBucket,
      },
      sourceProcessing: {
        extract: false,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    expect(() => app.synth()).toThrow(/marker replacement requires extraction/);
  });

  test("fails synthesis when no deployment source was added", () => {
    const app = new App();
    const stack = new Stack(app, "EmptySourcesStack");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    expect(() => app.synth()).toThrow(
      /requires at least one source; pass a source in sources or call addSource\(\) before synthesis/,
    );
  });

  test("allows an initially empty deployment when addSource is called before synthesis", () => {
    const app = new App();
    const stack = new Stack(app, "AddedSourceStack");
    const destinationBucket = new Bucket(stack, "Dest");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    deployment.addSource(Source.data("index.html", "ok"));

    expect(() => app.synth()).not.toThrow();
    expect(customResourceProperties(stack).SourceBucketNames).toHaveLength(1);
    expect(customResourceProperties(stack).SourceObjectKeys).toHaveLength(1);
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
      destination: {
        bucket: destinationBucket,
      },
      cloudfrontInvalidation: {
        distribution,
        paths: ["/site/index.html", "/site/app.js"],
        waitForCompletion: false,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
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
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    expect(customResourceProperties(stack).OutputObjectKeys).toBe(false);
  });

  test("requests object keys when the output is accessed", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    void deployment.objectKeys;

    expect(customResourceProperties(stack).OutputObjectKeys).toBe(true);
  });

  test("renders runtime tuning properties", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        memorySize: 1024,
        localBuild: testLocalProviderBuild(),
      },
      transfer: {
        maxConcurrency: 7,
        advancedTuning: {
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
      },
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
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        memorySize: memory.valueAsNumber,
        localBuild: testLocalProviderBuild(),
      },
      transfer: {
        advancedTuning: {
          sourceBlockBytes: block.valueAsNumber,
        },
      },
    });

    expect(customResourceProperties(stack).SourceBlockBytes).toEqual({ Ref: "Block" });
  });

  test("rejects invalid runtime tuning values", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        transfer: {
          advancedTuning: {
            sourceGetConcurrency: 0,
          },
        },
      });
    }).toThrow(/sourceGetConcurrency/);

    expect(() => {
      new ShinBucketDeployment(stack, "BadRetryDelay", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        transfer: {
          advancedTuning: {
            destinationWriteRetry: {
              baseDelayMs: 2_000,
              maxDelayMs: 1_000,
            },
          },
        },
      });
    }).toThrow(/maxDelayMs/);

    expect(() => {
      new ShinBucketDeployment(stack, "BadSlowdownRetryDelay", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        transfer: {
          advancedTuning: {
            destinationWriteRetry: {
              slowdownBaseDelayMs: 2_000,
              slowdownMaxDelayMs: 1_000,
            },
          },
        },
      });
    }).toThrow(/slowdownMaxDelayMs/);

    expect(() => {
      new ShinBucketDeployment(stack, "BadRetryJitter", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        transfer: {
          advancedTuning: {
            destinationWriteRetry: {
              jitter: "equal" as never,
            },
          },
        },
      });
    }).toThrow(/DestinationWriteRetryJitter\.FULL or DestinationWriteRetryJitter\.NONE/);

    expect(() => {
      new ShinBucketDeployment(stack, "SmallSourceBlock", {
        sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
        destination: {
          bucket: destinationBucket,
        },
        transfer: {
          advancedTuning: {
            sourceBlockBytes: 29,
          },
        },
      });
    }).toThrow(/sourceBlockBytes must be a safe integer.*30/);

    const invalidCases: Array<{
      readonly id: string;
      readonly props: Partial<ShinBucketDeploymentProps>;
      readonly message: RegExp;
    }> = [
      {
        id: "TooMuchConcurrency",
        props: { transfer: { maxConcurrency: 257 } },
        message: /maxConcurrency.*256/,
      },
      {
        id: "TooManySourceGets",
        props: { transfer: { advancedTuning: { sourceGetConcurrency: 65 } } },
        message: /sourceGetConcurrency.*64/,
      },
      {
        id: "TooManyDestinationWriteAttempts",
        props: {
          transfer: { advancedTuning: { destinationWriteRetry: { maxAttempts: 11 } } },
        },
        message: /maxAttempts.*10/,
      },
      {
        id: "LongRetryDelay",
        props: {
          transfer: {
            advancedTuning: { destinationWriteRetry: { maxDelayMs: 60_001 } },
          },
        },
        message: /maxDelayMs.*60000/,
      },
      {
        id: "BudgetAboveHalf",
        props: {
          providerLambda: { memorySize: 1024 },
          transfer: { advancedTuning: { sourceWindowMemoryBudgetMiB: 513 } },
        },
        message: /must not exceed 50%/,
      },
      {
        id: "WindowBelowBlock",
        props: {
          transfer: { advancedTuning: { sourceWindowBytes: 4 * 1024 * 1024 } },
        },
        message: /sourceWindowBytes must be greater than or equal to .*sourceBlockBytes/,
      },
      {
        id: "ConcurrentBlocksAboveBudget",
        props: {
          transfer: {
            advancedTuning: {
              sourceBlockBytes: 128 * 1024 * 1024,
              sourceGetConcurrency: 5,
            },
          },
        },
        message: /sourceBlockBytes \* .*sourceGetConcurrency/,
      },
      {
        id: "UnsafeInteger",
        props: {
          transfer: {
            advancedTuning: { sourceBlockMergeGapBytes: Number.MAX_SAFE_INTEGER + 1 },
          },
        },
        message: /sourceBlockMergeGapBytes must be a safe integer/,
      },
    ];

    for (const invalid of invalidCases) {
      expect(() => {
        new ShinBucketDeployment(stack, invalid.id, {
          sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
          destination: {
            bucket: destinationBucket,
          },
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
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    void deployment.deployedBucket.bucketArn;

    expect(customResourceProperties(stack).DestinationBucketArn).toMatchObject({
      "Fn::GetAtt": [expect.any(String), "Arn"],
    });
  });
});
