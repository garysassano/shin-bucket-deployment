import { join } from "node:path";
import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { expect, test } from "vitest";
import {
  REQUIRED_PAYLOAD_PATHS,
  assertPayloadPaths,
  assertPayloadTree,
  assertPayloadWithinSynthShape,
} from "../../scripts/synth-payload-shape.mjs";
import { DestinationWriteRetryJitter, ShinBucketDeployment, Source } from "../../src";
import { testLocalProviderBuild } from "../support/bundling";

test("default deployment emits properties that conform to the wire contract", () => {
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

  assertPayloadTree(propertiesOf(stack));
  assertPayloadPaths(propertiesOf(stack));
});

test("the emitted payload carries the load-bearing advanced-tuning paths", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.data("index.html", "ok")],
    destination: { bucket: destinationBucket },
    transfer: {
      maxConcurrency: 8,
      advancedTuning: {
        sourceBlockBytes: 4096,
        sourceWindowMemoryBudgetMiB: 512,
        destinationWriteRetry: {
          maxAttempts: 3,
          jitter: DestinationWriteRetryJitter.NONE,
        },
      },
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
  });

  const properties = propertiesOf(stack);
  assertPayloadTree(properties);
  for (const path of REQUIRED_PAYLOAD_PATHS) {
    expect(nodeAt(properties, path)).toBeDefined();
  }
  // The optional nested tuning fields are the ones no verification scenario
  // configures, so pin their exact wire names here: serde PascalCase would
  // render `SourceWindowMemoryBudgetMib` without the explicit rename, and
  // `MaxAttempts` must reach the decoder under its own name.
  expect(nodeAt(properties, ["Transfer", "AdvancedTuning"])).toMatchObject({
    SourceBlockBytes: 4096,
    SourceWindowMemoryBudgetMiB: 512,
    DestinationWriteRetry: {
      MaxAttempts: 3,
      Jitter: "none",
    },
  });
});

test("the wire contract rejects payloads with undeclared keys", () => {
  expect(() =>
    assertPayloadWithinSynthShape({
      SourceBucketNames: ["assets"],
      SourceObjectKeys: ["site.zip"],
      Destination: { BucketName: "destination" },
      SourceProcessing: { MaxUncompressedEntryBytes: 1024, MaxCompressionRatio: 100 },
      DestinationLifecycle: {
        OnDeploy: {},
        OnChange: {},
        OnDelete: {},
      },
      CloudfrontInvalidation: {},
      Transfer: { AdvancedTuning: { DestinationWriteRetry: {} } },
      DestinationOwnerId: "owner",
      SourceWindowMemoryBudgetMib: 512,
    }),
  ).toThrow(/SourceWindowMemoryBudgetMib/);
});

test("the wire contract rejects payloads missing required keys", () => {
  expect(() =>
    assertPayloadWithinSynthShape({
      SourceBucketNames: ["assets"],
      SourceObjectKeys: ["site.zip"],
      Destination: { BucketName: "destination" },
      SourceProcessing: { MaxUncompressedEntryBytes: 1024, MaxCompressionRatio: 100 },
      DestinationLifecycle: {
        OnDeploy: {},
        OnChange: {},
        OnDelete: {},
      },
      CloudfrontInvalidation: {},
      Transfer: { AdvancedTuning: { DestinationWriteRetry: {} } },
      DestinationOwnerId: "owner",
    }),
  ).not.toThrow();

  expect(() =>
    assertPayloadWithinSynthShape({
      SourceBucketNames: ["assets"],
      SourceObjectKeys: ["site.zip"],
      // Destination is required by the decoder and must be emitted.
      SourceProcessing: { MaxUncompressedEntryBytes: 1024, MaxCompressionRatio: 100 },
      DestinationLifecycle: {
        OnDeploy: {},
        OnChange: {},
        OnDelete: {},
      },
      CloudfrontInvalidation: {},
      Transfer: { AdvancedTuning: { DestinationWriteRetry: {} } },
      DestinationOwnerId: "owner",
    }),
  ).toThrow(/Destination/);
});

function propertiesOf(stack: Stack): Record<string, unknown> {
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type?: string; Properties?: Record<string, unknown> }>;
  };
  const resource = Object.values(template.Resources).find(
    (candidate) => (candidate as { Type?: string }).Type === "AWS::CloudFormation::CustomResource",
  ) as { Properties?: Record<string, unknown> } | undefined;
  if (!resource?.Properties) {
    throw new Error("Shin custom resource not found");
  }
  return resource.Properties;
}

function nodeAt(value: Record<string, unknown>, path: readonly string[]): unknown {
  let node: unknown = value;
  for (const segment of path) {
    if (node === null || typeof node !== "object" || !(segment in node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}
