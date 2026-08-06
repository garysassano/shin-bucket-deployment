import { join } from "node:path";
import { App, Aws, CfnParameter, RemovalPolicy, Stack, Tags } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import type { IDistributionRef } from "aws-cdk-lib/aws-cloudfront";
import { AllowedMethods, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Role } from "aws-cdk-lib/aws-iam";
import { Bucket, type CfnBucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_MAX_COMPRESSION_RATIO,
  DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES,
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

/** Minimal distribution ref stub for validation-focused tests. */
function distributionRef(distributionId: string): IDistributionRef {
  return { distributionRef: { distributionId } } as unknown as IDistributionRef;
}

describe("ShinBucketDeployment validation and option coverage", () => {
  test("renders strict archive expansion defaults", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    expect(customResourceProperties(stack)).toMatchObject({
      MaxUncompressedEntryBytes: DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES,
      MaxCompressionRatio: DEFAULT_MAX_COMPRESSION_RATIO,
    });
  });

  test("renders explicit archive expansion boundaries", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      sourceProcessing: {
        maxUncompressedEntryBytes: 5 * 1024 * 1024 * 1024,
        maxCompressionRatio: 10_000,
      },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    expect(customResourceProperties(stack)).toMatchObject({
      MaxUncompressedEntryBytes: 5 * 1024 * 1024 * 1024,
      MaxCompressionRatio: 10_000,
    });
  });

  test.each([
    ["maxUncompressedEntryBytes", 0],
    ["maxUncompressedEntryBytes", 5 * 1024 * 1024 * 1024 + 1],
    ["maxUncompressedEntryBytes", 1.5],
    ["maxUncompressedEntryBytes", Number.MAX_SAFE_INTEGER + 1],
    ["maxUncompressedEntryBytes", "1024"],
    ["maxCompressionRatio", 0],
    ["maxCompressionRatio", 10_001],
    ["maxCompressionRatio", 1.5],
    ["maxCompressionRatio", "100"],
  ] as const)("rejects invalid sourceProcessing.%s value %s", (property, value) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, `Deploy${property}${String(value)}`, {
          sources: [Source.data("index.html", "ok")],
          destination: { bucket: destinationBucket },
          sourceProcessing: { [property]: value } as never,
          providerLambda: { localBuild: testLocalProviderBuild() },
        }),
    ).toThrow(new RegExp(`${property}.*inclusive range`));
  });

  test("rejects unknown archive expansion option names", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.data("index.html", "ok")],
          destination: { bucket: destinationBucket },
          sourceProcessing: { maxEntryBytes: 1024 } as never,
          providerLambda: { localBuild: testLocalProviderBuild() },
        }),
    ).toThrow(/Unknown ShinBucketDeployment property sourceProcessing\.maxEntryBytes/);
  });

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

  test.each([
    "site?draft",
    "site#draft",
    "site[preview]",
  ])("rejects destination prefix %s that cannot form an ownership tag key", (keyPrefix) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.data("index.html", "ok")],
          destination: { bucket: destinationBucket, keyPrefix },
          providerLambda: { localBuild: testLocalProviderBuild() },
        }),
    ).toThrowError(
      expect.objectContaining({
        code: "ShinBucketDeploymentDestinationKeyPrefixTagCharacters",
      }) as ValidationError,
    );
  });

  test("accepts the CloudFormation ownership-tag character boundary including Unicode", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const keyPrefix = "ä site_1.:/=+-@";

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket, keyPrefix },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    const properties = customResourceProperties(stack);
    Template.fromStack(stack).hasResourceProperties("AWS::S3::Bucket", {
      Tags: Match.arrayWith([
        {
          Key: `aws-cdk:cr-owned:${keyPrefix}:${properties.DestinationOwnerId}`,
          Value: "true",
        },
      ]),
    });
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

  test("rejects malformed concrete CloudFront distribution references", () => {
    const invalidDistributions: unknown[] = [
      {},
      { distributionRef: {} },
      { distributionRef: { distributionId: "" } },
      { distributionRef: { distributionId: "distribution\nforged" } },
    ];

    for (const [index, distribution] of invalidDistributions.entries()) {
      const stack = new Stack();
      const destinationBucket = new Bucket(stack, `Dest${index}`);

      expect(
        () =>
          new ShinBucketDeployment(stack, `Deploy${index}`, {
            sources: [Source.data("index.html", "ok")],
            destination: { bucket: destinationBucket },
            cloudfrontInvalidation: { distribution, paths: ["/*"] } as never,
          }),
      ).toThrow(/cloudfrontInvalidation\.distribution\.distributionRef/);
    }
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
    }).toThrow(/cloudfrontInvalidation\.paths\[0\] must start with "\/"/);
  });

  test("validates concrete CloudFront invalidation path shapes and limits", () => {
    const invalidPaths: ReadonlyArray<readonly [unknown, RegExp]> = [
      [[], /must contain at least one path/],
      ["/*", /must be an array of strings/],
      [[7], /paths\[0\] must be a string/],
      [[`/${"a".repeat(4_000)}`], /must be <=4000 Unicode characters/],
      // CloudFront does not support `~` for invalidations, URL-encoded or not, so a
      // path containing one would be accepted and then silently invalidate nothing.
      [["/~user/*"], /must not contain "~"/],
      [["/a/%7Euser/*"], /must not contain "~"/],
      [["/a/%7euser/*"], /must not contain "~"/],
      [["/line\nbreak"], /must not contain control characters/],
      [["/delete\u007f"], /must not contain control characters/],
    ];

    for (const [index, [paths, expected]] of invalidPaths.entries()) {
      const stack = new Stack();
      const destinationBucket = new Bucket(stack, `Dest${index}`);
      const distribution = new Distribution(stack, `Distribution${index}`, {
        defaultBehavior: {
          origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      });

      expect(
        () =>
          new ShinBucketDeployment(stack, `Deploy${index}`, {
            sources: [Source.data("index.html", "ok")],
            destination: { bucket: destinationBucket },
            cloudfrontInvalidation: { distribution, paths } as never,
          }),
      ).toThrow(expected);
    }
  });

  test("accepts 4000-character and unresolved CloudFront invalidation paths", () => {
    const app = new App();
    const stack = new Stack(app, "CloudFrontBoundaryStack");
    const destinationBucket = new Bucket(stack, "Dest");
    const distribution = new Distribution(stack, "Distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });
    const unresolvedPath = new CfnParameter(stack, "Path").valueAsString;

    new ShinBucketDeployment(stack, "BoundaryDeploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      cloudfrontInvalidation: { distribution, paths: [`/${"a".repeat(3_999)}`] },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });
    new ShinBucketDeployment(stack, "TokenDeploy", {
      sources: [Source.data("token.html", "ok")],
      destination: { bucket: destinationBucket, keyPrefix: "token" },
      cloudfrontInvalidation: { distribution, paths: [unresolvedPath] },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    expect(() => app.synth()).not.toThrow();
  });

  test("rejects malformed JavaScript leaf values before provider creation", () => {
    const invalidProps: ReadonlyArray<readonly [Record<string, unknown>, RegExp]> = [
      [{ sources: [7] }, /sources\[0\] must implement ISource\.bind/],
      [{ destination: { keyPrefix: 7 } }, /destination\.keyPrefix must be a string/],
      [{ sourceProcessing: { extract: 1 } }, /sourceProcessing\.extract must be a boolean/],
      [{ sourceProcessing: { include: "*.js" } }, /sourceProcessing\.include must be an array/],
      [{ sourceProcessing: { include: [7] } }, /sourceProcessing\.include\[0\] must be a string/],
      [{ sourceProcessing: { exclude: [false] } }, /sourceProcessing\.exclude\[0\]/],
      [{ providerLambda: { memorySize: "1024" } }, /providerLambda\.memorySize/],
      [{ cloudfrontInvalidation: { waitForCompletion: 1 } }, /waitForCompletion must be a boolean/],
      [
        { destinationLifecycle: { onDeploy: { deleteStaleObjects: "false" } } },
        /deleteStaleObjects must be a boolean/,
      ],
      [
        { destinationLifecycle: { onDelete: { deleteCurrentObjects: 1 } } },
        /deleteCurrentObjects must be a boolean/,
      ],
    ];

    for (const [index, [override, expected]] of invalidProps.entries()) {
      const stack = new Stack();
      const destinationBucket = new Bucket(stack, `Dest${index}`);
      const base = {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
      };
      const props = {
        ...base,
        ...override,
        destination: { ...base.destination, ...(override.destination ?? {}) },
      };

      expect(() => new ShinBucketDeployment(stack, `Invalid${index}`, props as never)).toThrow(
        expected,
      );
      expect(
        stack.node
          .findAll()
          .some((construct) => construct.node.id.startsWith("ShinBucketDeploymentHandler")),
      ).toBe(false);
    }
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

  test.each([
    [48, true],
    [49, true],
    [50, false],
  ] as const)("enforces the S3 50-tag limit with %i pre-existing tags", (tagCount, succeeds) => {
    const app = new App();
    const stack = new Stack(app, `TagLimit${tagCount}`);
    const destinationBucket = new Bucket(stack, "Dest");
    for (let index = 0; index < tagCount; index++) {
      Tags.of(destinationBucket).add(`application:${index}`, "true");
    }
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    if (succeeds) {
      expect(() => app.synth()).not.toThrow();
    } else {
      expect(() => app.synth()).toThrow(/51 synthesized tags.*50-tag limit/);
    }
  });

  test("counts stack-aspect and deployment ownership tags together", () => {
    const app = new App();
    const stack = new Stack(app, "SharedTagLimit");
    const destinationBucket = new Bucket(stack, "Dest");
    for (let index = 0; index < 49; index++) {
      Tags.of(stack).add(`stack:${index}`, "true");
    }
    new ShinBucketDeployment(stack, "First", {
      sources: [Source.data("first.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });
    new ShinBucketDeployment(stack, "Second", {
      sources: [Source.data("second.html", "ok")],
      destination: { bucket: destinationBucket, keyPrefix: "second" },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    expect(() => app.synth()).toThrow(/51 synthesized tags.*50-tag limit/);
  });

  test("counts the CDK auto-delete tag in the S3 bucket quota", () => {
    const app = new App();
    const stack = new Stack(app, "AutoDeleteTagLimit");
    const destinationBucket = new Bucket(stack, "Dest", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    for (let index = 0; index < 49; index++) {
      Tags.of(destinationBucket).add(`application:${index}`, "true");
    }
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    expect(() => app.synth()).toThrow(/51 synthesized tags.*50-tag limit/);
  });

  test("deduplicates equivalent ownership tags across CDK and raw tag sources", () => {
    const app = new App();
    const stack = new Stack(app, "DeduplicatedTagLimit");
    const destinationBucket = new Bucket(stack, "Dest");
    for (let index = 0; index < 49; index++) {
      Tags.of(destinationBucket).add(`application:${index}`, "true");
    }
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });
    const customResourceScope = deployment.node.findChild("CustomResource");
    const customResource = customResourceScope.node.children[0];
    if (!customResource) throw new Error("Shin custom resource not found");
    const ownershipTagKey = `aws-cdk:cr-owned:${customResource.node.addr.slice(-8)}`;
    const bucketResource = destinationBucket.node.defaultChild as CfnBucket;
    bucketResource.tagsRaw = [{ key: ownershipTagKey, value: "duplicate" }];

    expect(() => app.synth()).not.toThrow();
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
          // T-10 grant trim: with waitForCompletion:false the provider never
          // polls, so GetInvalidation is not granted. A single granted action
          // renders as a string, not an array.
          Match.objectLike({
            Action: "cloudfront:CreateInvalidation",
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

  test("warns when transfer concurrency exceeds measured guidance", () => {
    const app = new App();
    const stack = new Stack(app, "HighConcurrency");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
      transfer: { maxConcurrency: 65 },
    });

    Annotations.fromStack(stack).hasWarning(
      "/HighConcurrency/Deploy",
      Match.stringLikeRegexp(
        "transfer\\.maxConcurrency=65 is above the current measured guidance ceiling of 64.*128 slowed cold-create by 18%.*benchmarking your workload",
      ),
    );
  });

  test("does not warn at the measured concurrency guidance boundary", () => {
    const app = new App();
    const stack = new Stack(app, "GuidanceBoundary");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
      transfer: { maxConcurrency: 64 },
    });

    Annotations.fromStack(stack).hasNoWarning(
      "/GuidanceBoundary/Deploy",
      Match.stringLikeRegexp("transfer\\.maxConcurrency"),
    );
  });

  test.each([
    undefined,
    "/",
  ])("warns when Delete cleanup selects the whole bucket for root prefix %s", (keyPrefix) => {
    const app = new App();
    const stack = new Stack(app, "RootDelete");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket, keyPrefix },
      destinationLifecycle: { onDelete: { deleteCurrentObjects: true } },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasWarning(
      "/RootDelete/Deploy",
      Match.stringLikeRegexp(
        "deleteCurrentObjects=true with a root destination selects the entire bucket namespace",
      ),
    );
  });

  test("does not warn about Delete cleanup for a bounded prefix", () => {
    const app = new App();
    const stack = new Stack(app, "BoundedDelete");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket, keyPrefix: "site" },
      destinationLifecycle: { onDelete: { deleteCurrentObjects: true } },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasNoWarning(
      "/BoundedDelete/Deploy",
      Match.stringLikeRegexp("selects the entire bucket namespace"),
    );
  });

  test("defers unresolved numeric tuning to provider validation", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const memory = new CfnParameter(stack, "Memory", { type: "Number" });
    const block = new CfnParameter(stack, "Block", { type: "Number" });
    const maxConcurrency = new CfnParameter(stack, "MaxConcurrency", { type: "Number" });
    const maxEntryBytes = new CfnParameter(stack, "MaxEntryBytes", { type: "Number" });
    const maxCompressionRatio = new CfnParameter(stack, "MaxCompressionRatio", {
      type: "Number",
    });

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        memorySize: memory.valueAsNumber,
        localBuild: testLocalProviderBuild(),
      },
      sourceProcessing: {
        maxUncompressedEntryBytes: maxEntryBytes.valueAsNumber,
        maxCompressionRatio: maxCompressionRatio.valueAsNumber,
      },
      transfer: {
        maxConcurrency: maxConcurrency.valueAsNumber,
        advancedTuning: {
          sourceBlockBytes: block.valueAsNumber,
        },
      },
    });

    expect(customResourceProperties(stack).MaxParallelTransfers).toEqual({
      Ref: "MaxConcurrency",
    });
    expect(customResourceProperties(stack).SourceBlockBytes).toEqual({ Ref: "Block" });
    expect(customResourceProperties(stack).MaxUncompressedEntryBytes).toEqual({
      Ref: "MaxEntryBytes",
    });
    expect(customResourceProperties(stack).MaxCompressionRatio).toEqual({
      Ref: "MaxCompressionRatio",
    });
    Annotations.fromStack(stack).hasNoWarning(
      "/Default/Deploy",
      Match.stringLikeRegexp("transfer\\.maxConcurrency"),
    );
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

  test.each([
    [
      "unclosed character class",
      ["assets/[abc"],
      /not a valid include\/exclude pattern: unclosed character class/,
    ],
    ["empty class", ["[]"], /unclosed character class/],
    ["invalid range", ["[z-a]"], /invalid character class range/],
    ["range closed by dash", ["[z--]"], /invalid character class range/],
    ["dangling escape", ["assets\\"], /dangling escape/],
    ["unclosed alternates", ["{a,b"], /unclosed alternates/],
    ["unopened alternates", ["a,b}"], /unopened alternates/],
  ] as const)("rejects an include/exclude glob with an %s at synthesis", (_label, patterns, message) => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
        sourceProcessing: { include: patterns as unknown as string[] },
      });
    }).toThrow(message);
  });

  test("accepts globs the provider's globset parser accepts", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
        sourceProcessing: {
          include: ["**/*.html", "assets/[a-z]/file?.js", "assets/\\[literal\\]", "a{1,2,3}"],
          exclude: ["*.map", "tmp/[!a]/*"],
        },
      });
    }).not.toThrow();
  });

  test("rejects cloudfront invalidation path counts above the CloudFront batch limits", () => {
    const tooManyPaths = Array.from({ length: 3001 }, (_, index) => `/path-${index}`);
    expect(() => {
      const stack = new Stack();
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: new Bucket(stack, "Dest") },
        cloudfrontInvalidation: {
          distribution: distributionRef("E1EXAMPLE"),
          paths: tooManyPaths,
        },
      });
    }).toThrow(/at most 3000 paths/);

    const tooManyWildcards = Array.from({ length: 16 }, (_, index) => `/wild-${index}/*`);
    expect(() => {
      const stack = new Stack();
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: new Bucket(stack, "Dest") },
        cloudfrontInvalidation: {
          distribution: distributionRef("E1EXAMPLE"),
          paths: tooManyWildcards,
        },
      });
    }).toThrow(/at most 15 wildcard paths/);
  });

  test("accepts the CloudFront batch limits at their boundaries", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
        cloudfrontInvalidation: {
          distribution: distributionRef("E1EXAMPLE"),
          paths: [
            ...Array.from({ length: 15 }, (_, index) => `/wild-${index}/*`),
            ...Array.from({ length: 2985 }, (_, index) => `/path-${index}`),
          ],
        },
      });
    }).not.toThrow();
  });

  test("counts only trailing-asterisk paths as CloudFront wildcard paths", () => {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    expect(() => {
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
        cloudfrontInvalidation: {
          distribution: distributionRef("E1EXAMPLE"),
          paths: Array.from({ length: 16 }, (_, index) => `/a*b-${index}`),
        },
      });
    }).not.toThrow();
  });

  test("warns when the destination bucket has versioning enabled", () => {
    const app = new App();
    const stack = new Stack(app, "VersionedDest");
    const destinationBucket = new Bucket(stack, "Dest", { versioned: true });

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasWarning(
      "/VersionedDest/Deploy",
      Match.stringLikeRegexp("versioning enabled.*delete markers.*noncurrent versions"),
    );
  });

  test("warns when versioning is enabled by escape hatch override", () => {
    const app = new App();
    const stack = new Stack(app, "OverriddenVersioning");
    const destinationBucket = new Bucket(stack, "Dest");
    (destinationBucket.node.defaultChild as CfnBucket).addPropertyOverride(
      "VersioningConfiguration",
      { Status: "Enabled" },
    );

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasWarning(
      "/OverriddenVersioning/Deploy",
      Match.stringLikeRegexp("versioning enabled"),
    );
  });

  test("does not warn about versioning for an unversioned destination", () => {
    const app = new App();
    const stack = new Stack(app, "UnversionedDest");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasNoWarning(
      "/UnversionedDest/Deploy",
      Match.stringLikeRegexp("versioning enabled"),
    );
  });

  test("warns that previous-bucket delete grants accumulate on the shared provider role", () => {
    const app = new App();
    const stack = new Stack(app, "SharedRoleDelete");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      destinationLifecycle: { onChange: { deletePreviousObjects: true } },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasWarning(
      "/SharedRoleDelete/Deploy",
      Match.stringLikeRegexp(
        "s3:DeleteObject.*ProviderSharing.DEPLOYMENT.*bucket-wide delete grant",
      ),
    );
  });

  test("does not warn about the shared role when previous-bucket delete is not granted", () => {
    const app = new App();
    const stack = new Stack(app, "NoPreviousDelete");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasNoWarning(
      "/NoPreviousDelete/Deploy",
      Match.stringLikeRegexp("ProviderSharing.DEPLOYMENT"),
    );
  });

  test("does not warn about the shared role with deployment-scoped sharing", () => {
    const app = new App();
    const stack = new Stack(app, "IsolatedDelete");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      destinationLifecycle: { onChange: { deletePreviousObjects: true } },
      providerLambda: {
        sharing: ProviderSharing.DEPLOYMENT,
        localBuild: testLocalProviderBuild(),
      },
    });

    Annotations.fromStack(stack).hasNoWarning(
      "/IsolatedDelete/Deploy",
      Match.stringLikeRegexp("ProviderSharing.DEPLOYMENT"),
    );
  });

  test("warns when grants cannot be attached to an imported provider role", () => {
    const app = new App();
    const stack = new Stack(app, "ImportedRole");
    const destinationBucket = new Bucket(stack, "Dest");
    const importedRole = Role.fromRoleArn(
      stack,
      "ImportedRoleArn",
      "arn:aws:iam::123456789012:role/provider-role",
      { mutable: false, addGrantsToResources: true },
    );

    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: { bucket: destinationBucket },
      providerLambda: { role: importedRole, localBuild: testLocalProviderBuild() },
    });

    Annotations.fromStack(stack).hasWarning(
      `/${deployment.handlerFunction.node.path}`,
      Match.stringLikeRegexp("grant could not be attached.*AccessDenied"),
    );
  });
});
