import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App, Aspects, CfnParameter, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Key } from "aws-cdk-lib/aws-kms";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { Bucket, BucketEncryption, BucketNamespace, CfnBucket } from "aws-cdk-lib/aws-s3";
import type { IConstruct } from "constructs";
import { expect, test } from "vitest";
import { ShinBucketDeployment, Source } from "../../src";
import { testBundling } from "../support/bundling";
import { ensurePrebuiltBootstrapAssets } from "../support/prebuilt-assets";

interface FileAssetManifestEntry {
  displayName?: string;
  source?: {
    packaging?: string;
    path?: string;
  };
}

function customResourceProperties(stack: Stack): Record<string, unknown> {
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }>;
  };
  const resource = Object.values(template.Resources).find(
    (candidate) => candidate.Type === "Custom::ShinBucketDeployment",
  );
  if (!resource?.Properties) {
    throw new Error("Custom::ShinBucketDeployment resource not found");
  }
  return resource.Properties;
}

test("renders a Rust-backed custom resource", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket,
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Runtime: "provided.al2023",
    Handler: "bootstrap",
    Architectures: ["arm64"],
    MemorySize: 1024,
    Timeout: 900,
  });

  template.hasResourceProperties("Custom::ShinBucketDeployment", {
    ServiceTimeout: "900",
    DestinationBucketName: {
      Ref: Match.anyValue(),
    },
    Extract: true,
    DeleteStaleObjectsOnDeployment: true,
    DestinationChecksumStrategy: "sse-s3-etag",
  });
}, 120_000);

test("uses the packaged arm64 prebuilt provider by default", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "provided.al2023",
      Handler: "bootstrap",
      Architectures: ["arm64"],
    });
  } finally {
    cleanup();
  }
});

test("uses the packaged x86_64 prebuilt provider when requested", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      architecture: Architecture.X86_64,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "provided.al2023",
      Handler: "bootstrap",
      Architectures: ["x86_64"],
    });
  } finally {
    cleanup();
  }
});

test("stages the packaged provider archive byte-for-byte as a file asset", () => {
  const cleanupAssets = ensurePrebuiltBootstrapAssets();
  const outdir = mkdtempSync(join(tmpdir(), "shin-prebuilt-synth-"));
  try {
    const app = new App({ outdir });
    const stack = new Stack(app, "PrebuiltStack");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destinationBucket,
    });

    const assembly = app.synth();
    const assetManifest = JSON.parse(
      readFileSync(join(assembly.directory, "PrebuiltStack.assets.json"), "utf8"),
    ) as { files?: Record<string, FileAssetManifestEntry> };
    const expectedArchive = readFileSync(
      join(__dirname, "..", "..", "assets", "bootstrap-arm64", "bootstrap.zip"),
    );
    const matchingAssets = Object.values(assetManifest.files ?? {}).filter((asset) => {
      const sourcePath = asset.source?.path;
      return (
        asset.source?.packaging === "file" &&
        sourcePath !== undefined &&
        readFileSync(join(assembly.directory, sourcePath)).equals(expectedArchive)
      );
    });

    expect(matchingAssets).toHaveLength(1);
  } finally {
    cleanupAssets();
    rmSync(outdir, { recursive: true, force: true });
  }
});

test("reuses a shared prebuilt handler for compatible deployments", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    const stack = new Stack();
    const firstBucket = new Bucket(stack, "FirstDest");
    const secondBucket = new Bucket(stack, "SecondDest");

    const first = new ShinBucketDeployment(stack, "FirstDeploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket: firstBucket,
    });

    const second = new ShinBucketDeployment(stack, "SecondDeploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket: secondBucket,
    });

    expect(first.handlerFunction).toBe(second.handlerFunction);

    const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
    expect(Object.keys(lambdaFunctions)).toHaveLength(1);
  } finally {
    cleanup();
  }
});

test("Source.asset emits an embedded catalog for directory assets", () => {
  const outdir = mkdtempSync(join(tmpdir(), "shin-catalog-synth-"));
  try {
    const app = new App({ outdir });
    const stack = new Stack(app, "CatalogStack");
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destinationBucket,
      bundling: testBundling(),
    });

    const assembly = app.synth();
    const assetManifest = JSON.parse(
      readFileSync(join(assembly.directory, "CatalogStack.assets.json"), "utf8"),
    ) as { files?: Record<string, FileAssetManifestEntry> };
    const fileAsset = Object.values(assetManifest.files ?? {}).find(
      (asset) => asset.displayName === "Deploy/CatalogedAsset1",
    );

    expect(fileAsset?.source?.packaging).toBe("zip");
    const sourcePath = fileAsset?.source?.path;
    expect(sourcePath).toBeDefined();
    const stagedDirectory = join(assembly.directory, sourcePath as string);
    expect(statSync(stagedDirectory).isDirectory()).toBe(true);
    const catalog = readFileSync(join(stagedDirectory, ".shin", "catalog.v1.json"), "utf8");
    expect(catalog).toBe(
      '{"version":1,"entries":[{"path":"app.js","size":24,"md5":"acac2891f40463e08c034c81928ec97b"},{"path":"index.html","size":173,"md5":"4cd451e9f36c4d198898712cbeeea359"}]}',
    );
    expect(customResourceProperties(stack).SourceCatalogs).toEqual([
      {
        Version: 1,
        Sha256: createHash("sha256").update(catalog).digest("hex"),
      },
    ]);
  } finally {
    rmSync(outdir, { recursive: true, force: true });
  }
});

test("reuses a shared handler for compatible deployments in the same stack", () => {
  const stack = new Stack();
  const firstBucket = new Bucket(stack, "FirstDest");
  const secondBucket = new Bucket(stack, "SecondDest");

  const first = new ShinBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket: firstBucket,
    bundling: testBundling(),
  });

  const second = new ShinBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
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

  const first = new ShinBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket: firstBucket,
    bundling: testBundling(),
  });

  const second = new ShinBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket: secondBucket,
    memoryLimit: 2048,
    bundling: testBundling(),
  });

  expect(first.handlerFunction).not.toBe(second.handlerFunction);

  const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
  expect(Object.keys(lambdaFunctions)).toHaveLength(2);
});

test("scopes destination object permissions to the destination prefix", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket,
    destinationKeyPrefix: "site",
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith(["s3:GetObject", "s3:PutObject", "s3:Abort*"]),
          Resource: {
            "Fn::Join": [
              "",
              Match.arrayWith([
                Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
                "/site/*",
              ]),
            ],
          },
        }),
        Match.objectLike({
          Action: "s3:DeleteObject*",
          Resource: {
            "Fn::Join": [
              "",
              Match.arrayWith([
                Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
                "/site/*",
              ]),
            ],
          },
        }),
        Match.objectLike({
          Action: "s3:ListBucket",
          Condition: {
            StringEquals: {
              "s3:prefix": "site/",
            },
          },
        }),
        Match.objectLike({
          Action: "s3:GetBucketTagging",
          Resource: Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
        }),
      ]),
    },
  });
  const rendered = JSON.stringify(template.toJSON());
  expect(rendered).not.toContain("s3:GetObjectAcl");
  expect(rendered).not.toContain("s3:GetBucketAcl");
  expect(rendered).not.toContain("s3:PutObjectAcl");
});

test.each([
  ["default", undefined, "sse-s3-etag"],
  ["S3 managed", BucketEncryption.S3_MANAGED, "sse-s3-etag"],
  ["KMS", BucketEncryption.KMS, "kms-sha256"],
  ["KMS managed", BucketEncryption.KMS_MANAGED, "kms-sha256"],
  ["DSSE", BucketEncryption.DSSE, "kms-sha256"],
  ["DSSE managed", BucketEncryption.DSSE_MANAGED, "kms-sha256"],
] as const)("derives the destination checksum strategy for %s encryption", (_, encryption, expected) => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", encryption ? { encryption } : {});

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket,
    bundling: testBundling(),
  });

  expect(customResourceProperties(stack).DestinationChecksumStrategy).toBe(expected);
});

test("grants checksum-mode access to the AWS-managed S3 KMS key", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", {
    encryption: BucketEncryption.KMS_MANAGED,
  });
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket,
    bundling: testBundling(),
  });

  Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith(["kms:Decrypt", "kms:GenerateDataKey"]),
          Condition: {
            "ForAnyValue:StringEquals": {
              "kms:ResourceAliases": "alias/aws/s3",
            },
            StringEquals: {
              "kms:ViaService": Match.anyValue(),
            },
          },
          Effect: "Allow",
          Resource: Match.anyValue(),
        }),
      ]),
    },
  });
});

test("resolves destination encryption lazily after L1 mutation", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket,
    bundling: testBundling(),
  });

  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  resource.bucketEncryption = {
    serverSideEncryptionConfiguration: [
      { serverSideEncryptionByDefault: { sseAlgorithm: "aws:kms" } },
    ],
  };

  expect(customResourceProperties(stack).DestinationChecksumStrategy).toBe("kms-sha256");
});

test("resolves destination encryption after an Aspect mutation", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket,
    bundling: testBundling(),
  });

  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  Aspects.of(stack).add({
    visit(node: IConstruct) {
      if (node === resource) {
        resource.bucketEncryption = {
          serverSideEncryptionConfiguration: [
            { serverSideEncryptionByDefault: { sseAlgorithm: "aws:kms" } },
          ],
        };
      }
    },
  });

  expect(customResourceProperties(stack).DestinationChecksumStrategy).toBe("kms-sha256");
});

test("rejects unknown and uninspectable destination encryption", () => {
  const unknownStack = new Stack();
  const unknownBucket = new Bucket(unknownStack, "Dest");
  new ShinBucketDeployment(unknownStack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket: unknownBucket,
    bundling: testBundling(),
  });
  const resource = unknownBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  resource.bucketEncryption = {
    serverSideEncryptionConfiguration: [
      { serverSideEncryptionByDefault: { sseAlgorithm: "future:algorithm" } },
    ],
  };
  expect(() => customResourceProperties(unknownStack)).toThrow(/AES256, aws:kms, or aws:kms:dsse/);

  const importedStack = new Stack();
  const imported = Bucket.fromBucketName(importedStack, "Imported", "imported-bucket");
  expect(
    () =>
      new ShinBucketDeployment(importedStack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destinationBucket: imported as Bucket,
        bundling: testBundling(),
      }),
  ).toThrow(/CDK-created Bucket/);
});

test.each([
  "multiple rules",
  "tokenized algorithm",
] as const)("rejects %s in destination encryption", (configuration) => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket,
    bundling: testBundling(),
  });
  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  resource.bucketEncryption = {
    serverSideEncryptionConfiguration:
      configuration === "multiple rules"
        ? [
            { serverSideEncryptionByDefault: { sseAlgorithm: "AES256" } },
            { serverSideEncryptionByDefault: { sseAlgorithm: "aws:kms" } },
          ]
        : [
            {
              serverSideEncryptionByDefault: {
                sseAlgorithm: new CfnParameter(stack, "Algorithm").valueAsString,
              },
            },
          ],
  };

  expect(() => customResourceProperties(stack)).toThrow(/one inspectable default encryption rule/);
});

test("rejects an L1-injected customer KMS key without a matching L2 grant", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destinationBucket,
    bundling: testBundling(),
  });
  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  resource.bucketEncryption = {
    serverSideEncryptionConfiguration: [
      {
        serverSideEncryptionByDefault: {
          kmsMasterKeyId: new CfnParameter(stack, "InjectedKeyArn").valueAsString,
          sseAlgorithm: "aws:kms",
        },
      },
    ],
  };

  expect(() => customResourceProperties(stack)).toThrow(/match destinationBucket\.encryptionKey/);
});

test("supports account-regional destination buckets", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", {
    bucketNamePrefix: "shin-regression",
    bucketNamespace: BucketNamespace.ACCOUNT_REGIONAL,
  });

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket,
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }>;
  };

  const destinationBucketEntry = Object.entries(template.Resources).find(
    ([, resource]) =>
      resource.Type === "AWS::S3::Bucket" &&
      resource.Properties?.BucketNamePrefix === "shin-regression",
  );
  expect(destinationBucketEntry).toBeDefined();

  if (!destinationBucketEntry) {
    throw new Error("Account-regional destination bucket not found");
  }

  const [destinationBucketLogicalId, destinationBucketResource] = destinationBucketEntry;
  expect(destinationBucketResource.Properties).toMatchObject({
    BucketNamePrefix: "shin-regression",
    BucketNamespace: "account-regional",
  });

  const deploymentResource = Object.values(template.Resources).find(
    (resource) => resource.Type === "Custom::ShinBucketDeployment",
  );
  expect(deploymentResource?.Properties).toMatchObject({
    DestinationBucketName: {
      Ref: destinationBucketLogicalId,
    },
  });
});

test("keeps delete and list permissions scoped when current object deletion is enabled", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket,
    destinationKeyPrefix: "site",
    destinationLifecycle: {
      onDelete: {
        deleteObjects: true,
      },
    },
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: "s3:DeleteObject*",
          Resource: {
            "Fn::Join": [
              "",
              Match.arrayWith([
                Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
                "/site/*",
              ]),
            ],
          },
        }),
        Match.objectLike({
          Action: "s3:ListBucket",
          Condition: {
            StringEquals: {
              "s3:prefix": "site/",
            },
          },
        }),
      ]),
    },
  });
});

test("grants destination KMS permissions when the destination bucket is encrypted", () => {
  const stack = new Stack();
  const key = new Key(stack, "Key");
  const destinationBucket = new Bucket(stack, "Dest", {
    encryption: BucketEncryption.KMS,
    encryptionKey: key,
  });

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destinationBucket,
    destinationKeyPrefix: "site",
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith([
            "kms:Decrypt",
            "kms:DescribeKey",
            "kms:Encrypt",
            "kms:ReEncrypt*",
            "kms:GenerateDataKey*",
          ]),
          Resource: {
            "Fn::GetAtt": ["Key961B73FD", "Arn"],
          },
        }),
      ]),
    },
  });
});
