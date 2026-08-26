import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App, Aspects, CfnParameter, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AllowedMethods, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Bucket, BucketEncryption, BucketNamespace, CfnBucket } from "aws-cdk-lib/aws-s3";
import type { IConstruct } from "constructs";
import { expect, test } from "vitest";
import {
  DEFAULT_MAX_COMPRESSION_RATIO,
  DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES,
  FailureDiagnostics,
  ProviderSharing,
  ShinBucketDeployment,
  Source,
} from "../../src";
import {
  destinationVersioningWarnings,
  inspectDestinationBucket,
  validateDestinationEncryption,
} from "../../src/destination";
import { renderHandlerConfigHashInput } from "../../src/provider";
import { stableStringify } from "../../src/stable-json";
import { testLocalProviderBuild } from "../support/bundling";
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
    (candidate) => candidate.Type === "AWS::CloudFormation::CustomResource",
  );
  if (!resource?.Properties) {
    throw new Error("Shin custom resource not found");
  }
  return resource.Properties;
}

test("renders a Rust-backed custom resource", () => {
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

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Runtime: "provided.al2023",
    Handler: "bootstrap",
    Architectures: ["arm64"],
    MemorySize: 2048,
    Timeout: 900,
  });

  template.hasResourceProperties("AWS::CloudFormation::CustomResource", {
    ServiceTimeout: "900",
    Destination: {
      BucketName: {
        Ref: Match.anyValue(),
      },
    },
    SourceProcessing: {
      Extract: true,
      MaxUncompressedEntryBytes: DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES,
      MaxCompressionRatio: DEFAULT_MAX_COMPRESSION_RATIO,
    },
    DestinationLifecycle: {
      OnDeploy: {
        DeleteStaleObjects: true,
      },
    },
  });
}, 120_000);

test("uses the packaged arm64 prebuilt provider by default", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");

    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destination: {
        bucket: destinationBucket,
      },
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
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        architecture: Architecture.X86_64,
      },
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
      destination: {
        bucket: destinationBucket,
      },
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

test("reuses a shared prebuilt handler for identical provider configuration", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    const stack = new Stack();
    const firstBucket = new Bucket(stack, "FirstDest");
    const secondBucket = new Bucket(stack, "SecondDest");

    const first = new ShinBucketDeployment(stack, "FirstDeploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destination: {
        bucket: firstBucket,
      },
    });

    const second = new ShinBucketDeployment(stack, "SecondDeploy", {
      sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
      destination: {
        bucket: secondBucket,
      },
      providerLambda: {
        sharing: ProviderSharing.STACK,
      },
    });

    expect(first.handlerFunction).toBe(second.handlerFunction);

    const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
    expect(Object.keys(lambdaFunctions)).toHaveLength(1);
  } finally {
    cleanup();
  }
});

test("binds shared prebuilt handler identity to the package version and archive bytes", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: {
        bucket: destinationBucket,
      },
    });
    const manifest = JSON.parse(
      readFileSync(join(__dirname, "..", "..", "package.json"), "utf8"),
    ) as { version: string };
    const bootstrapArchive = readFileSync(
      join(__dirname, "..", "..", "assets", "bootstrap-arm64", "bootstrap.zip"),
    );
    const handlerHash = createHash("sha256")
      .update(
        stableStringify({
          architecture: "arm64",
          failureDiagnostics: FailureDiagnostics.STANDARD,
          handlerSource: {
            kind: "prebuilt",
            packageVersion: manifest.version,
            architecture: "arm64",
            bootstrapArchiveSha256: createHash("sha256").update(bootstrapArchive).digest("hex"),
          },
          memoryLimit: 2048,
          stack: stack.node.addr,
        }),
      )
      .digest("hex")
      .slice(0, 16);

    expect(deployment.handlerFunction.node.id).toBe(`ShinBucketDeploymentHandler${handlerHash}`);
  } finally {
    cleanup();
  }
});

test("freezes the canonical handler hash input across the public API regrouping", () => {
  const stack = new Stack();
  const serialized = renderHandlerConfigHashInput(
    stack,
    {
      memorySize: 2048,
      failureDiagnostics: FailureDiagnostics.DETAILED,
      localBuild: {
        bundling: {
          environment: { B: "2", A: "1" },
          forcedDockerBundling: true,
        },
      },
    },
    Architecture.X86_64,
    {
      kind: "compile",
      packageVersion: "0.9.0",
      manifestPath: "/repo/rust/Cargo.toml",
    },
  );

  expect(serialized).toBe(
    `{"architecture":"x86_64","bundling":{"environment":{"A":"1","B":"2"},"forcedDockerBundling":true},"failureDiagnostics":"detailed","handlerSource":{"kind":"compile","manifestPath":"/repo/rust/Cargo.toml","packageVersion":"0.9.0"},"memoryLimit":2048,"stack":"${stack.node.addr}"}`,
  );
});

test("keeps every provider Lambda identity member in canonical handler selection", () => {
  const stack = new Stack();
  const vpc = new Vpc(stack, "Vpc", { maxAzs: 2, natGateways: 0 });
  const securityGroup = new SecurityGroup(stack, "SecurityGroup", { vpc });
  const role = new Role(stack, "Role", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
  });
  const logGroup = new LogGroup(stack, "LogGroup");
  const sourceIdentity = {
    kind: "compile",
    packageVersion: "0.9.0",
    manifestPath: "/repo/rust/Cargo.toml",
  };
  const render = (
    config: Parameters<typeof renderHandlerConfigHashInput>[1] = {},
    architecture = Architecture.ARM_64,
    handlerSource: Record<string, string> = sourceIdentity,
  ) => renderHandlerConfigHashInput(stack, config, architecture, handlerSource);
  const baseline = render();
  const variants = [
    render({ memorySize: 3072 }),
    render({ failureDiagnostics: FailureDiagnostics.DETAILED }),
    render({ role }),
    render({ logGroup }),
    render({ vpc }),
    render({ vpcSubnets: { subnetType: SubnetType.PUBLIC } }),
    render({ securityGroups: [securityGroup] }),
    render({ localBuild: { bundling: { environment: { BUILD: "variant" } } } }),
    render({}, Architecture.X86_64),
    render({}, Architecture.ARM_64, { ...sourceIdentity, packageVersion: "0.9.1" }),
  ];

  expect(variants).toHaveLength(new Set(variants).size);
  for (const variant of variants) {
    expect(variant).not.toBe(baseline);
  }
});

test("canonicalizes provider security group identity independently of caller order", () => {
  const stack = new Stack();
  const vpc = new Vpc(stack, "Vpc", { maxAzs: 2, natGateways: 0 });
  const firstGroup = new SecurityGroup(stack, "FirstGroup", { vpc });
  const secondGroup = new SecurityGroup(stack, "SecondGroup", { vpc });
  const handlerSource = {
    kind: "compile",
    packageVersion: "0.9.0",
    manifestPath: "/repo/rust/Cargo.toml",
  };

  const first = renderHandlerConfigHashInput(
    stack,
    { securityGroups: [firstGroup, secondGroup] },
    Architecture.ARM_64,
    handlerSource,
  );
  const reversed = renderHandlerConfigHashInput(
    stack,
    { securityGroups: [secondGroup, firstGroup] },
    Architecture.ARM_64,
    handlerSource,
  );

  expect(first).toBe(reversed);
  expect(JSON.parse(first)).toMatchObject({
    securityGroups: [firstGroup.node.addr, secondGroup.node.addr].sort(),
  });
});

test("detailed failure diagnostics are opt-in and select a distinct shared handler", () => {
  const stack = new Stack();
  const defaultDeployment = new ShinBucketDeployment(stack, "DefaultDeploy", {
    sources: [Source.data("default.txt", "default")],
    destination: {
      bucket: new Bucket(stack, "DefaultDest"),
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });
  const diagnosticDeployment = new ShinBucketDeployment(stack, "DiagnosticDeploy", {
    sources: [Source.data("diagnostic.txt", "diagnostic")],
    destination: {
      bucket: new Bucket(stack, "DiagnosticDest"),
    },
    providerLambda: {
      failureDiagnostics: FailureDiagnostics.DETAILED,
      localBuild: testLocalProviderBuild(),
    },
  });

  expect(defaultDeployment.handlerFunction).not.toBe(diagnosticDeployment.handlerFunction);
  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Environment: Match.absent(),
  });
  Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        RUST_BACKTRACE: "1",
        SHIN_DETAILED_FAILURE_DIAGNOSTICS: "true",
      },
    },
  });
});

test("Source.asset emits an embedded catalog for directory assets", () => {
  const outdir = mkdtempSync(join(tmpdir(), "shin-catalog-synth-"));
  try {
    const app = new App({ outdir });
    const stack = new Stack(app, "CatalogStack");
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

test("reuses a shared handler for identical provider configuration in the same stack", () => {
  const stack = new Stack();
  const firstBucket = new Bucket(stack, "FirstDest");
  const secondBucket = new Bucket(stack, "SecondDest");

  const first = new ShinBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: firstBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  const second = new ShinBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: secondBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  expect(first.handlerFunction).toBe(second.handlerFunction);

  const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
  expect(Object.keys(lambdaFunctions)).toHaveLength(1);
});

test("reuses a shared handler when provider security groups have reversed caller order", () => {
  const stack = new Stack();
  const vpc = new Vpc(stack, "Vpc", { maxAzs: 2, natGateways: 0 });
  const firstGroup = new SecurityGroup(stack, "FirstGroup", { vpc });
  const secondGroup = new SecurityGroup(stack, "SecondGroup", { vpc });

  const first = new ShinBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.data("first.txt", "first")],
    destination: { bucket: new Bucket(stack, "FirstDest") },
    providerLambda: {
      vpc,
      securityGroups: [firstGroup, secondGroup],
      localBuild: testLocalProviderBuild(),
    },
  });
  const second = new ShinBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.data("second.txt", "second")],
    destination: { bucket: new Bucket(stack, "SecondDest") },
    providerLambda: {
      vpc,
      securityGroups: [secondGroup, firstGroup],
      localBuild: testLocalProviderBuild(),
    },
  });

  expect(first.handlerFunction).toBe(second.handlerFunction);
  expect(
    Object.keys(Template.fromStack(stack).findResources("AWS::Lambda::Function")),
  ).toHaveLength(1);
});

test("keeps every transfer setting request-scoped while sharing one handler", () => {
  const stack = new Stack();
  const first = new ShinBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.data("first.txt", "first")],
    destination: { bucket: new Bucket(stack, "FirstDest") },
    providerLambda: { localBuild: testLocalProviderBuild() },
    transfer: {
      maxConcurrency: 3,
      advancedTuning: { sourceBlockBytes: 4 * 1024 * 1024 },
    },
  });
  const second = new ShinBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.data("second.txt", "second")],
    destination: { bucket: new Bucket(stack, "SecondDest") },
    providerLambda: { localBuild: testLocalProviderBuild() },
    transfer: {
      maxConcurrency: 9,
      advancedTuning: { sourceBlockBytes: 8 * 1024 * 1024 },
    },
  });

  expect(first.handlerFunction).toBe(second.handlerFunction);
  const resources = Template.fromStack(stack).toJSON().Resources as Record<
    string,
    { Type: string; Properties: Record<string, unknown> }
  >;
  const requestSettings = Object.values(resources)
    .filter((resource) => resource.Type === "AWS::CloudFormation::CustomResource")
    .map((resource) => ({
      maxConcurrency: (resource.Properties.Transfer as { MaxConcurrency?: unknown }).MaxConcurrency,
      sourceBlockBytes: (
        resource.Properties.Transfer as { AdvancedTuning: { SourceBlockBytes?: unknown } }
      ).AdvancedTuning.SourceBlockBytes,
    }))
    .sort((left, right) => Number(left.maxConcurrency) - Number(right.maxConcurrency));
  expect(requestSettings).toEqual([
    { maxConcurrency: 3, sourceBlockBytes: 4 * 1024 * 1024 },
    { maxConcurrency: 9, sourceBlockBytes: 8 * 1024 * 1024 },
  ]);
});

test("keeps omitted and explicit stack-scoped provider templates identical", () => {
  function synth(sharing: ProviderSharing.STACK | undefined): Record<string, unknown> {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", "ok")],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        ...(sharing === undefined ? {} : { sharing }),
        localBuild: testLocalProviderBuild(),
      },
    });
    return Template.fromStack(stack).toJSON();
  }

  expect(synth(ProviderSharing.STACK)).toEqual(synth(undefined));
});

test("treats an empty providerLambda group as exact omission", () => {
  const cleanup = ensurePrebuiltBootstrapAssets();
  try {
    function synth(providerLambda: Record<string, never> | undefined): {
      readonly handlerId: string;
      readonly template: Record<string, unknown>;
    } {
      const stack = new Stack();
      const deployment = new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: new Bucket(stack, "Dest") },
        ...(providerLambda === undefined ? {} : { providerLambda }),
      });
      return {
        handlerId: deployment.handlerFunction.node.id,
        template: Template.fromStack(stack).toJSON(),
      };
    }

    const omitted = synth(undefined);
    const empty = synth({});
    expect(empty.handlerId).toBe(omitted.handlerId);
    expect(empty.template).toEqual(omitted.template);
  } finally {
    cleanup();
  }
});

test("creates separate handlers when the provider configuration differs", () => {
  const stack = new Stack();
  const firstBucket = new Bucket(stack, "FirstDest");
  const secondBucket = new Bucket(stack, "SecondDest");

  const first = new ShinBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: firstBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  const second = new ShinBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: secondBucket,
    },
    providerLambda: {
      memorySize: 3072,
      localBuild: testLocalProviderBuild(),
    },
  });

  expect(first.handlerFunction).not.toBe(second.handlerFunction);

  const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
  expect(Object.keys(lambdaFunctions)).toHaveLength(2);
});

test("isolates functions, generated roles, and destination policies per deployment", () => {
  const stack = new Stack();
  const sharedFirstBucket = new Bucket(stack, "SharedFirstDest");
  const sharedSecondBucket = new Bucket(stack, "SharedSecondDest");
  const isolatedFirstBucket = new Bucket(stack, "IsolatedFirstDest");
  const isolatedSecondBucket = new Bucket(stack, "IsolatedSecondDest");

  const sharedFirst = new ShinBucketDeployment(stack, "SharedFirstDeploy", {
    sources: [Source.data("index.html", "shared-first")],
    destination: {
      bucket: sharedFirstBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });
  const sharedSecond = new ShinBucketDeployment(stack, "SharedSecondDeploy", {
    sources: [Source.data("index.html", "shared-second")],
    destination: {
      bucket: sharedSecondBucket,
    },
    providerLambda: {
      sharing: ProviderSharing.STACK,
      localBuild: testLocalProviderBuild(),
    },
  });
  const isolatedFirst = new ShinBucketDeployment(stack, "IsolatedFirstDeploy", {
    sources: [Source.data("index.html", "isolated-first")],
    destination: {
      bucket: isolatedFirstBucket,
    },
    providerLambda: {
      sharing: ProviderSharing.DEPLOYMENT,
      localBuild: testLocalProviderBuild(),
    },
  });
  const isolatedSecond = new ShinBucketDeployment(stack, "IsolatedSecondDeploy", {
    sources: [Source.data("index.html", "isolated-second")],
    destination: {
      bucket: isolatedSecondBucket,
    },
    providerLambda: {
      sharing: ProviderSharing.DEPLOYMENT,
      localBuild: testLocalProviderBuild(),
    },
  });

  expect(sharedFirst.handlerFunction).toBe(sharedSecond.handlerFunction);
  expect(sharedFirst.handlerRole).toBe(sharedSecond.handlerRole);
  expect(isolatedFirst.handlerFunction).not.toBe(sharedFirst.handlerFunction);
  expect(isolatedSecond.handlerFunction).not.toBe(sharedFirst.handlerFunction);
  expect(isolatedFirst.handlerFunction).not.toBe(isolatedSecond.handlerFunction);
  expect(isolatedFirst.handlerRole).not.toBe(sharedFirst.handlerRole);
  expect(isolatedSecond.handlerRole).not.toBe(sharedFirst.handlerRole);
  expect(isolatedFirst.handlerRole).not.toBe(isolatedSecond.handlerRole);

  const template = Template.fromStack(stack);
  expect(Object.keys(template.findResources("AWS::Lambda::Function"))).toHaveLength(3);
  expect(Object.keys(template.findResources("AWS::IAM::Role"))).toHaveLength(3);

  const policies = Object.values(template.findResources("AWS::IAM::Policy")).map((policy) =>
    JSON.stringify(policy),
  );
  const sharedPolicy = policies.find((policy) => policy.includes("SharedFirstDest"));
  const isolatedFirstPolicy = policies.find((policy) => policy.includes("IsolatedFirstDest"));
  const isolatedSecondPolicy = policies.find((policy) => policy.includes("IsolatedSecondDest"));

  expect(sharedPolicy).toContain("SharedSecondDest");
  expect(sharedPolicy).not.toContain("IsolatedFirstDest");
  expect(sharedPolicy).not.toContain("IsolatedSecondDest");
  expect(isolatedFirstPolicy).not.toContain("SharedFirstDest");
  expect(isolatedFirstPolicy).not.toContain("SharedSecondDest");
  expect(isolatedFirstPolicy).not.toContain("IsolatedSecondDest");
  expect(isolatedSecondPolicy).not.toContain("SharedFirstDest");
  expect(isolatedSecondPolicy).not.toContain("SharedSecondDest");
  expect(isolatedSecondPolicy).not.toContain("IsolatedFirstDest");
});

test("keeps shared handlers scoped to their CDK stack", () => {
  const app = new App();
  const firstStack = new Stack(app, "FirstStack");
  const secondStack = new Stack(app, "SecondStack");
  const first = new ShinBucketDeployment(firstStack, "Deploy", {
    sources: [Source.data("index.html", "first")],
    destination: {
      bucket: new Bucket(firstStack, "Dest"),
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });
  const second = new ShinBucketDeployment(secondStack, "Deploy", {
    sources: [Source.data("index.html", "second")],
    destination: {
      bucket: new Bucket(secondStack, "Dest"),
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  expect(first.handlerFunction).not.toBe(second.handlerFunction);
  expect(first.handlerFunction.node.scope).toBe(firstStack);
  expect(second.handlerFunction.node.scope).toBe(secondStack);
});

test("gives each handler replacement a distinct destination owner", () => {
  function synthPhase(memoryLimit: number) {
    const app = new App();
    const stack = new Stack(app, "ReplacementStack");
    const destinationBucket = new Bucket(stack, "Dest");
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", `memory=${memoryLimit}`)],
      destination: {
        bucket: destinationBucket,
      },
      destinationLifecycle: { onDelete: { deleteCurrentObjects: true } },
      providerLambda: {
        memorySize: memoryLimit,
        localBuild: testLocalProviderBuild(),
      },
    });

    const resources = Template.fromStack(stack).toJSON().Resources as Record<
      string,
      { Type: string; Properties: Record<string, unknown> }
    >;
    const entry = Object.entries(resources).find(
      ([, resource]) => resource.Type === "AWS::CloudFormation::CustomResource",
    );
    if (!entry) {
      throw new Error("Shin custom resource not found");
    }
    return { logicalId: entry[0], properties: entry[1].Properties };
  }

  const initial = synthPhase(1024);
  const replacement = synthPhase(2048);

  expect(replacement.logicalId).not.toBe(initial.logicalId);
  expect(replacement.properties.DestinationOwnerId).not.toBe(initial.properties.DestinationOwnerId);
  expect((replacement.properties.Destination as { BucketName: unknown }).BucketName).toEqual(
    (initial.properties.Destination as { BucketName: unknown }).BucketName,
  );
  expect(replacement.properties.ServiceToken).not.toEqual(initial.properties.ServiceToken);
  expect(
    (
      replacement.properties.DestinationLifecycle as {
        OnDelete: { DeleteCurrentObjects: unknown };
      }
    ).OnDelete.DeleteCurrentObjects,
  ).toBe(true);
});

test("keeps an isolated handler and service token stable across configuration updates", () => {
  function synthPhase(memoryLimit: number) {
    const app = new App();
    const stack = new Stack(app, "IsolatedUpdateStack");
    const destinationBucket = new Bucket(stack, "Dest");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.html", `memory=${memoryLimit}`)],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        sharing: ProviderSharing.DEPLOYMENT,
        memorySize: memoryLimit,
        localBuild: testLocalProviderBuild(),
      },
    });
    const resources = Template.fromStack(stack).toJSON().Resources as Record<
      string,
      { Type: string; Properties: Record<string, unknown> }
    >;
    const customResource = Object.entries(resources).find(
      ([, resource]) => resource.Type === "AWS::CloudFormation::CustomResource",
    );
    if (!customResource) throw new Error("Shin custom resource not found");
    const handler = Object.entries(resources).find(
      ([, resource]) =>
        resource.Type === "AWS::Lambda::Function" && resource.Properties.Handler === "bootstrap",
    );
    if (!handler) throw new Error("Shin handler not found");
    return {
      customResourceLogicalId: customResource[0],
      customResourceProperties: customResource[1].Properties,
      handlerLogicalId: handler[0],
      handlerNodeId: deployment.handlerFunction.node.id,
    };
  }

  const initial = synthPhase(1024);
  const updated = synthPhase(2048);

  expect(updated.handlerNodeId).toBe("ShinBucketDeploymentHandler");
  expect(updated.handlerLogicalId).toBe(initial.handlerLogicalId);
  expect(updated.customResourceLogicalId).toBe(initial.customResourceLogicalId);
  expect(updated.customResourceProperties.ServiceToken).toEqual(
    initial.customResourceProperties.ServiceToken,
  );
  expect(updated.customResourceProperties.DestinationOwnerId).toBe(
    initial.customResourceProperties.DestinationOwnerId,
  );
});

test("scopes destination object permissions to the destination prefix", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: destinationBucket,
      keyPrefix: "site",
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith(["s3:GetObject", "s3:PutObject"]),
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
          Action: "s3:DeleteObject",
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
  expect(rendered).not.toContain("s3:PutObjectLegalHold");
  expect(rendered).not.toContain("s3:PutObjectRetention");
  expect(rendered).not.toContain("s3:PutObjectTagging");
  expect(rendered).not.toContain("s3:PutObjectVersionTagging");
  expect(rendered).not.toContain("s3:Abort");
});

test.each([
  ["default", undefined],
  ["S3 managed", BucketEncryption.S3_MANAGED],
] as const)("accepts %s destination encryption", (_, encryption) => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", encryption ? { encryption } : {});

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  expect(() => customResourceProperties(stack)).not.toThrow();
});

test.each([
  ["KMS", BucketEncryption.KMS],
  ["KMS managed", BucketEncryption.KMS_MANAGED],
  ["DSSE", BucketEncryption.DSSE],
  ["DSSE managed", BucketEncryption.DSSE_MANAGED],
] as const)("refuses a %s destination bucket", (_, encryption) => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", { encryption });

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  expect(() => customResourceProperties(stack)).toThrow(/must use SSE-S3 \(AES256\)/);
});

test("never asks for KMS permissions on the provider role", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const rendered = JSON.stringify(Template.fromStack(stack).toJSON());

  // SSE-S3 needs no key access, so an SSE-S3-only construct must not grant any.
  expect(rendered).not.toContain("kms:Decrypt");
  expect(rendered).not.toContain("kms:GenerateDataKey");
  expect(rendered).not.toContain("alias/aws/s3");
});

// The refusal has to survive escape hatches. CDK keeps `addPropertyOverride` values out
// of the typed L1 model and merges them only while rendering, so a check that read
// `CfnBucket.bucketEncryption` would see the pre-override `AES256` and wave KMS through.
test("refuses a bucket switched to KMS by direct L1 mutation", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
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

  expect(() => customResourceProperties(stack)).toThrow(/must use SSE-S3 \(AES256\)/);
});

test("refuses a bucket switched to KMS by a late property override", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  resource.addPropertyOverride("BucketEncryption", {
    ServerSideEncryptionConfiguration: [
      { ServerSideEncryptionByDefault: { SSEAlgorithm: "aws:kms" } },
    ],
  });

  expect(() => customResourceProperties(stack)).toThrow(/must use SSE-S3 \(AES256\)/);
});

test("refuses a bucket whose algorithm is replaced by a nested override", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", {
    encryption: BucketEncryption.S3_MANAGED,
  });
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  // The typed property still reports AES256 after this override.
  expect(
    Stack.of(stack).resolve(resource.bucketEncryption).serverSideEncryptionConfiguration[0]
      .serverSideEncryptionByDefault.sseAlgorithm,
  ).toBe("AES256");
  resource.addPropertyOverride(
    "BucketEncryption.ServerSideEncryptionConfiguration.0.ServerSideEncryptionByDefault.SSEAlgorithm",
    "aws:kms",
  );

  expect(() => customResourceProperties(stack)).toThrow(/must use SSE-S3 \(AES256\)/);
});

// CDK invokes `_toCloudFormation` on every CfnElement during synthesis, so it cannot
// quietly vanish without breaking CDK generally. A coordinated future refactor of the
// method and its caller could still break this construct's direct call, and so could a
// change to the rendered envelope. Either way the failure must name that cause.
test("reports a distinct error when the CDK rendering envelope changes shape", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  // Structurally malformed: the `Resources` envelope is gone entirely. A wrong
  // resource `Type` is deliberately not used here, because a consumer can produce
  // that state themselves via `addOverride("Type", ...)`.
  (resource as unknown as Record<string, unknown>)._toCloudFormation = () => ({
    Resource: { Dest: { Type: "AWS::S3::Bucket" } },
  });

  expect(() => customResourceProperties(stack)).toThrowError(
    expect.objectContaining({
      code: "ShinBucketDeploymentCdkRenderingUnsupported",
    }) as Error,
  );
});

test("preserves the original failure when CDK rendering throws", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  const cause = new TypeError("rendering contract changed");
  (resource as unknown as Record<string, unknown>)._toCloudFormation = () => {
    throw cause;
  };

  // Called directly rather than through synthesis, because CDK's own traversal
  // would hit the broken method first and raise its own error.
  let thrown: unknown;
  try {
    inspectDestinationBucket(stack, resource);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toMatchObject({ code: "ShinBucketDeploymentCdkRenderingUnsupported" });
  expect((thrown as { cause?: unknown }).cause).toBe(cause);
});

test("shares one explicit destination render across inspection consumers", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", {
    encryption: BucketEncryption.S3_MANAGED,
    versioned: true,
  });
  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  const originalRender = resource._toCloudFormation.bind(resource);
  let renderCount = 0;
  (resource as unknown as Record<string, unknown>)._toCloudFormation = () => {
    renderCount += 1;
    return originalRender();
  };

  const inspection = inspectDestinationBucket(stack, resource);
  validateDestinationEncryption(stack, inspection);
  expect(destinationVersioningWarnings(inspection)).toHaveLength(1);
  expect(renderCount).toBe(1);
});

// A retyped resource is something a consumer can do with the public `addOverride`,
// so it must read as an unsupported bucket configuration, not as CDK drift.
test("treats a publicly retyped destination resource as unsupported configuration", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const resource = destinationBucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new Error("expected destination CfnBucket");
  }
  resource.addOverride("Type", "AWS::S3::SomethingElse");

  expect(() => customResourceProperties(stack)).toThrowError(
    expect.objectContaining({
      code: "ShinBucketDeploymentDestinationEncryptionUnsupported",
    }) as Error,
  );
});

test("refuses a bucket switched to KMS by an Aspect", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: {
      bucket: destinationBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
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

  expect(() => customResourceProperties(stack)).toThrow(/must use SSE-S3 \(AES256\)/);
});

test("rejects unknown and uninspectable destination encryption", () => {
  const unknownStack = new Stack();
  const unknownBucket = new Bucket(unknownStack, "Dest");
  new ShinBucketDeployment(unknownStack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: {
      bucket: unknownBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
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
  expect(() => customResourceProperties(unknownStack)).toThrow(
    /inspectable default encryption rule using AES256/,
  );

  const importedStack = new Stack();
  const imported = Bucket.fromBucketName(importedStack, "Imported", "imported-bucket");
  expect(
    () =>
      new ShinBucketDeployment(importedStack, "Deploy", {
        sources: [Source.data("index.html", "ok")],
        destination: {
          bucket: imported as Bucket,
        },
        providerLambda: {
          localBuild: testLocalProviderBuild(),
        },
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
    destination: {
      bucket: destinationBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
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

test("refuses an L1-injected customer KMS key", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: {
      bucket: destinationBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
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

  expect(() => customResourceProperties(stack)).toThrow(/must use SSE-S3 \(AES256\)/);
});

test("supports account-regional destination buckets", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest", {
    bucketNamePrefix: "shin-regression",
    bucketNamespace: BucketNamespace.ACCOUNT_REGIONAL,
  });

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: destinationBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
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
    (resource) => resource.Type === "AWS::CloudFormation::CustomResource",
  );
  expect(deploymentResource?.Properties).toMatchObject({
    Destination: {
      BucketName: {
        Ref: destinationBucketLogicalId,
      },
    },
  });
});

test("keeps delete and list permissions scoped when current object deletion is enabled", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: {
      bucket: destinationBucket,
      keyPrefix: "site",
    },
    destinationLifecycle: {
      onDelete: {
        deleteCurrentObjects: true,
      },
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

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

test("omits delete and ownership-read permissions when all deletion is disabled", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: {
      bucket: destinationBucket,
      keyPrefix: "site",
    },
    destinationLifecycle: {
      onDeploy: { deleteStaleObjects: false },
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  const rendered = JSON.stringify(Template.fromStack(stack).findResources("AWS::IAM::Policy"));
  expect(rendered).not.toContain("s3:DeleteObject");
  expect(rendered).not.toContain("s3:GetBucketTagging");
});

test("keeps explicit same-bucket previous cleanup broad and deliberate", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: {
      bucket: destinationBucket,
      keyPrefix: "site/current",
    },
    destinationLifecycle: {
      onDeploy: { deleteStaleObjects: false },
      onChange: { deletePreviousObjects: true },
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
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
                Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
                "/*",
              ]),
            ],
          },
        }),
        Match.objectLike({
          Action: "s3:ListBucket",
          Resource: Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
        }),
        Match.objectLike({
          Action: "s3:GetBucketTagging",
          Resource: Match.objectLike({ "Fn::GetAtt": Match.arrayWith(["DestC383B82A", "Arn"]) }),
        }),
      ]),
    },
  });
});

test("limits cross-bucket cleanup authority to the explicitly authorized previous bucket", () => {
  const stack = new Stack();
  const previousBucket = new Bucket(stack, "PreviousDest");
  const destinationBucket = new Bucket(stack, "CurrentDest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: {
      bucket: destinationBucket,
      keyPrefix: "site/current",
    },
    destinationLifecycle: {
      onDeploy: { deleteStaleObjects: false },
      onChange: {
        deletePreviousObjects: true,
        previousBucket,
      },
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  const policies = Template.fromStack(stack).findResources("AWS::IAM::Policy") as Record<
    string,
    { Properties: { PolicyDocument: { Statement: Array<Record<string, unknown>> } } }
  >;
  const statements = Object.values(policies).flatMap(
    ({ Properties }) => Properties.PolicyDocument.Statement,
  );
  const deleteStatements = statements.filter(({ Action }) => Action === "s3:DeleteObject");
  const ownershipStatements = statements.filter(({ Action }) => Action === "s3:GetBucketTagging");

  expect(deleteStatements).toHaveLength(1);
  expect(JSON.stringify(deleteStatements)).toContain("PreviousDest");
  expect(JSON.stringify(deleteStatements)).not.toContain("CurrentDest");
  expect(ownershipStatements).toHaveLength(1);
  expect(JSON.stringify(ownershipStatements)).toContain("PreviousDest");
});

/**
 * Collects everything a resource depends on, following both explicit `DependsOn`
 * and the implicit dependencies CloudFormation derives from `Ref`/`Fn::GetAtt`.
 */
function transitiveDependencies(
  resources: Record<string, { DependsOn?: string | string[]; Properties?: unknown }>,
  start: string,
): Set<string> {
  const referenced = (node: unknown, into: Set<string>): void => {
    if (Array.isArray(node)) {
      for (const item of node) referenced(item, into);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "Ref" && typeof value === "string") into.add(value);
      else if (key === "Fn::GetAtt" && Array.isArray(value) && typeof value[0] === "string") {
        into.add(value[0]);
      } else referenced(value, into);
    }
  };

  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    const resource = resources[current];
    if (!resource) continue;
    const next = new Set<string>();
    const dependsOn = resource.DependsOn;
    if (typeof dependsOn === "string") next.add(dependsOn);
    else if (Array.isArray(dependsOn)) for (const id of dependsOn) next.add(id);
    referenced(resource.Properties, next);
    for (const id of next) if (!seen.has(id)) queue.push(id);
  }
  seen.delete(start);
  return seen;
}

// The custom resource must not be created before the role policy that grants it
// source, destination, and KMS access, or the provider starts and immediately
// fails with AccessDenied. Nothing previously locked that ordering in.
test("orders the custom resource after the provider role's default policy", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<
      string,
      { Type: string; DependsOn?: string | string[]; Properties?: unknown }
    >;
  };
  const entries = Object.entries(template.Resources);
  const findId = (type: string): string => {
    const match = entries.filter(([, resource]) => resource.Type === type);
    expect(match).toHaveLength(1);
    const found = match[0];
    if (!found) throw new Error(`no ${type} in template`);
    return found[0];
  };

  const customResource = findId("AWS::CloudFormation::CustomResource");
  const defaultPolicy = findId("AWS::IAM::Policy");
  const role = findId("AWS::IAM::Role");

  // Direct or transitive is fine; CloudFormation honours both. Assert the closure
  // first, then each individual link, so a break reports which one gave way rather
  // than just that the ordering was lost.
  const dependencies = transitiveDependencies(template.Resources, customResource);
  expect(dependencies).toContain(defaultPolicy);
  expect(dependencies).toContain(role);

  const handler = findId("AWS::Lambda::Function");
  // Link 1: the custom resource reaches the handler through its ServiceToken.
  expect(transitiveDependencies(template.Resources, customResource)).toContain(handler);
  // Link 2: the handler is ordered after the policy that grants it access.
  const handlerDependsOn = template.Resources[handler]?.DependsOn;
  expect(Array.isArray(handlerDependsOn) ? handlerDependsOn : [handlerDependsOn]).toContain(
    defaultPolicy,
  );
});

// `@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy` makes
// `Function.addToRolePolicy` emit standalone policies instead of extending the
// role's default policy. Exercise current Get/Put/Delete, previous Delete,
// list/tag, and CloudFront permissions together and require every resulting
// policy to precede the custom resource under either feature-flag value.
test.each([
  false,
  true,
])("orders the custom resource after every provider policy (createNewPolicies=%s)", (createNewPolicies) => {
  const app = new App({
    context: {
      "@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy": createNewPolicies,
    },
  });
  const stack = new Stack(app, "S");
  const destinationBucket = new Bucket(stack, "Dest");
  const previousBucket = new Bucket(stack, "PreviousDest");
  const distribution = new Distribution(stack, "Distribution", {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
  });
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    cloudfrontInvalidation: { distribution, paths: ["/*"] },
    destinationLifecycle: {
      onChange: { deletePreviousObjects: true, previousBucket },
      onDelete: { deleteCurrentObjects: true },
    },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<
      string,
      { Type: string; DependsOn?: string | string[]; Properties?: unknown }
    >;
  };
  const customResource = Object.entries(template.Resources).find(
    ([, resource]) => resource.Type === "AWS::CloudFormation::CustomResource",
  )?.[0];
  if (!customResource) throw new Error("no custom resource in template");

  const policyEntries = Object.entries(template.Resources).filter(
    ([, resource]) => resource.Type === "AWS::IAM::Policy",
  );
  // Routing grants through the role collapses them into the default policy, so
  // the flag no longer splits them out. The invariant that matters either way is
  // that every synthesized policy precedes the custom resource.
  expect(policyEntries.length).toBeGreaterThan(0);
  expect(JSON.stringify(policyEntries)).toContain("PreviousDest");

  const dependencies = transitiveDependencies(template.Resources, customResource);
  for (const [policyId] of policyEntries) {
    expect(dependencies).toContain(policyId);
  }
});

// N-1: the destination `s3:GetObject` grant is load-bearing. The provider's
// copy-identity reconciliation probes destination objects with `HeadObject`
// (extract:false copies and marker entries), and S3 authorizes `HeadObject`
// via `s3:GetObject`. A plan that proposed trimming this grant was refuted;
// this test pins the grant so a future cleanup cannot silently drop it.
test("keeps the destination s3:GetObject grant for HeadObject identity reconciliation", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const template = Template.fromStack(stack).toJSON() as {
    Resources?: Record<string, unknown>;
  };
  const rendered = JSON.stringify(template);
  expect(rendered).toContain("s3:GetObject");
  expect(rendered).toContain("s3:PutObject");

  const policies = Object.values(template.Resources ?? {}).filter(
    (resource) => (resource as { Type?: string }).Type === "AWS::IAM::Policy",
  );
  const statementActions = policies.flatMap((policy) => {
    const statements = (policy as { Properties?: { PolicyDocument?: { Statement?: unknown } } })
      .Properties?.PolicyDocument?.Statement;
    return Array.isArray(statements)
      ? statements.flatMap((statement) => {
          const actions = (statement as { Action?: string | string[] }).Action;
          return Array.isArray(actions) ? actions : actions ? [actions] : [];
        })
      : [];
  });
  expect(statementActions).toContain("s3:GetObject");
});

// T-2: addSource must not bind (and therefore stage) a source object that is
// already part of the deployment. Binding materializes catalogs and creates
// Asset constructs, so a duplicate bound first would leave orphan staged
// assets behind.
test("addSource skips binding for a source object already in the deployment", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  const deployment = new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("first.txt", "first")],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const duplicate = Source.data("duplicate.txt", "duplicate");
  deployment.addSource(duplicate);
  deployment.addSource(duplicate);

  const template = Template.fromStack(stack).toJSON() as {
    Resources?: Record<string, unknown>;
  };
  const customResource = Object.values(template.Resources ?? {}).find(
    (resource) => (resource as { Type?: string }).Type === "AWS::CloudFormation::CustomResource",
  ) as { Properties?: { SourceObjectKeys?: string[] } } | undefined;
  // Only the constructor source and the single addSource instance are kept;
  // the re-added duplicate was skipped before binding, so no third source ZIP
  // was created or staged.
  expect(customResource?.Properties?.SourceObjectKeys).toHaveLength(2);
});

test("constructor and incremental source binding synthesize the same template", () => {
  const synthesize = (incremental: boolean): Record<string, unknown> => {
    const app = new App();
    const stack = new Stack(app, "Stack");
    const destinationBucket = new Bucket(stack, "Dest");
    const first = Source.data("first.txt", "first");
    const second = Source.data("second.txt", "second");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: incremental ? [first] : [first, second],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });
    if (incremental) {
      deployment.addSource(second);
    }
    return Template.fromStack(stack).toJSON() as Record<string, unknown>;
  };

  expect(synthesize(true)).toEqual(synthesize(false));
});

test("addSource skips binding for a source object already passed in sources", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  const shared = Source.data("shared.txt", "shared");
  const deployment = new ShinBucketDeployment(stack, "Deploy", {
    sources: [shared],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  deployment.addSource(shared);

  const template = Template.fromStack(stack).toJSON() as {
    Resources?: Record<string, unknown>;
  };
  const customResource = Object.values(template.Resources ?? {}).find(
    (resource) => (resource as { Type?: string }).Type === "AWS::CloudFormation::CustomResource",
  ) as { Properties?: { SourceObjectKeys?: string[] } } | undefined;
  expect(customResource?.Properties?.SourceObjectKeys).toHaveLength(1);
});

// T-10: with waitForCompletion:false the provider only creates invalidations
// and never polls, so the role must not receive cloudfront:GetInvalidation.
test("grants cloudfront:GetInvalidation only when waiting for completion", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  const distribution = new Distribution(stack, "Distribution", {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
  });

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    cloudfrontInvalidation: { distribution, paths: ["/*"], waitForCompletion: false },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const template = Template.fromStack(stack).toJSON() as {
    Resources?: Record<string, unknown>;
  };
  const rendered = JSON.stringify(template);
  expect(rendered).toContain("cloudfront:CreateInvalidation");
  expect(rendered).not.toContain("cloudfront:GetInvalidation");
});

test("grants cloudfront:GetInvalidation when waiting is the default", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  const distribution = new Distribution(stack, "Distribution", {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
  });

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    cloudfrontInvalidation: { distribution, paths: ["/*"] },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const rendered = JSON.stringify(Template.fromStack(stack).toJSON());
  expect(rendered).toContain("cloudfront:GetInvalidation");
  expect(rendered).toContain("cloudfront:CreateInvalidation");
});
