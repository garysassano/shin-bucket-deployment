import { readFileSync } from "node:fs";
import { join } from "node:path";
import { App, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { expect, test } from "vitest";
import { RustBucketDeployment, Source } from "../src";
import { testBundling } from "./test-bundling";

interface FileAssetManifestEntry {
  displayName?: string;
  source?: {
    path?: string;
  };
}

test("renders a Rust-backed custom resource", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new RustBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket,
    bundling: testBundling(),
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::Lambda::Function", {
    Runtime: "provided.al2023",
    Handler: "bootstrap",
    Architectures: ["arm64"],
    MemorySize: 512,
  });

  template.hasResourceProperties("Custom::RustBucketDeployment", {
    DestinationBucketName: {
      Ref: Match.anyValue(),
    },
    Extract: true,
    Prune: true,
    AvailableMemoryMb: 512,
  });
}, 120_000);

test("Source.asset emits an embedded catalog for directory assets", () => {
  const app = new App({ outdir: join(__dirname, "..", "cdk.out.test-catalog") });
  const stack = new Stack(app, "CatalogStack");
  const destinationBucket = new Bucket(stack, "Dest");

  new RustBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
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

  expect(fileAsset).toBeDefined();
  const sourcePath = fileAsset?.source?.path;
  expect(sourcePath).toBeDefined();
  const zip = readFileSync(join(assembly.directory, sourcePath as string));
  expect(zip.includes(Buffer.from(".s3-unspool/catalog.v1.json"))).toBe(true);
});

test("reuses a shared handler for compatible deployments in the same stack", () => {
  const stack = new Stack();
  const firstBucket = new Bucket(stack, "FirstDest");
  const secondBucket = new Bucket(stack, "SecondDest");

  const first = new RustBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: firstBucket,
    bundling: testBundling(),
  });

  const second = new RustBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
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

  const first = new RustBucketDeployment(stack, "FirstDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: firstBucket,
    bundling: testBundling(),
  });

  const second = new RustBucketDeployment(stack, "SecondDeploy", {
    sources: [Source.asset(join(__dirname, "fixtures", "my-website"))],
    destinationBucket: secondBucket,
    memoryLimit: 1024,
    bundling: testBundling(),
  });

  expect(first.handlerFunction).not.toBe(second.handlerFunction);

  const lambdaFunctions = Template.fromStack(stack).findResources("AWS::Lambda::Function");
  expect(Object.keys(lambdaFunctions)).toHaveLength(2);
});
