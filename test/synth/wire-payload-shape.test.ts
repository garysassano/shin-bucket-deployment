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

test("the synth guard rejects wrong-typed literal leaves", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });
  const properties = propertiesOf(stack);
  const destination = properties.Destination as Record<string, unknown>;
  const sourceProcessing = properties.SourceProcessing as Record<string, unknown>;

  // A construct bug emitting a number where a string belongs must fail at
  // synthesis, not at deploy time in the Rust decoder.
  expect(() =>
    assertPayloadTree({ ...properties, Destination: { ...destination, BucketName: 123 } }),
  ).toThrow(/Destination\.BucketName/);
  expect(() => assertPayloadTree({ ...properties, DestinationOwnerId: false })).toThrow(
    /DestinationOwnerId/,
  );
  expect(() =>
    assertPayloadTree({
      ...properties,
      SourceMarkers: [{ runtime: 42 }],
    }),
  ).toThrow(/SourceMarkers/);
  expect(() =>
    assertPayloadTree({
      ...properties,
      SourceMarkers: [{ runtime: 42 }],
    }),
  ).toThrow(/runtime/);
  // null is not a valid value for an optional-only leaf...
  expect(() =>
    assertPayloadTree({
      ...properties,
      SourceProcessing: { ...sourceProcessing, Extract: null },
    }),
  ).toThrow(/SourceProcessing\.Extract/);
});

test("the synth guard accepts CloudFormation token leaves", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });
  const properties = propertiesOf(stack);
  const destination = properties.Destination as Record<string, unknown>;
  const sourceProcessing = properties.SourceProcessing as Record<string, unknown>;

  // The construct emits bucket names and ARNs as tokens; they must not be
  // type-checked as literals.
  expect(destination.BucketName).toMatchObject({ Ref: expect.any(String) });
  expect(() =>
    assertPayloadTree({
      ...properties,
      DestinationBucketArn: { "Fn::GetAtt": ["Dest", "Arn"] },
      SourceMarkers: [{ runtime: { Ref: "Marker" } }],
      SourceProcessing: {
        ...sourceProcessing,
        MaxUncompressedEntryBytes: { Ref: "Bytes" },
      },
    }),
  ).not.toThrow();
});

test("the synth guard rejects malformed intrinsics instead of skipping leaf validation", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });
  const properties = propertiesOf(stack);
  const destination = properties.Destination as Record<string, unknown>;
  const sourceProcessing = properties.SourceProcessing as Record<string, unknown>;

  // `{ Ref: 123 }` and `{ "Fn::Join": "not-an-array" }` are not token shapes
  // template syntax allows; they must fail loudly, not ride the token hole
  // past the wire-contract leaf check.
  expect(() =>
    assertPayloadTree({
      ...properties,
      Destination: { ...destination, BucketName: { Ref: 123 } },
    }),
  ).toThrow(/Malformed CloudFormation intrinsic Ref/);
  expect(() =>
    assertPayloadTree({
      ...properties,
      SourceProcessing: {
        ...sourceProcessing,
        MaxUncompressedEntryBytes: { "Fn::Join": "not-an-array" },
      },
    }),
  ).toThrow(/Malformed CloudFormation intrinsic Fn::Join/);
  expect(() =>
    assertPayloadTree({
      ...properties,
      Destination: {
        ...destination,
        BucketName: { "Fn::GetAtt": "JustOneSegment" },
      },
    }),
  ).not.toThrow();
});

test("the synth guard accepts every intrinsic form the construct can emit", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });
  const properties = propertiesOf(stack);
  const sourceProcessing = properties.SourceProcessing as Record<string, unknown>;

  expect(() =>
    assertPayloadTree({
      ...properties,
      SourceProcessing: {
        ...sourceProcessing,
        MaxUncompressedEntryBytes: { "Fn::Join": ["", ["1", "0", "2", "4"]] },
        MaxCompressionRatio: { Ref: "Ratio" },
      },
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Fn::Sub placeholder syntax is intentional.
      SourceMarkers: [{ runtime: { "Fn::Sub": ["prefix-${suffix}", { suffix: { Ref: "S" } }] } }],
    }),
  ).not.toThrow();
});

test("the template schema requires the reserved envelope keys the construct always renders", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(join(__dirname, "..", "fixtures", "my-website"))],
    destination: { bucket: destinationBucket },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });
  const properties = propertiesOf(stack);
  expect(properties.ServiceToken).toBeDefined();
  expect(properties.ServiceTimeout).toBeDefined();

  // The runtime schema (what the provider decodes) tolerates their absence...
  const plainPayload = {
    SourceBucketNames: ["assets"],
    SourceObjectKeys: ["site.zip"],
    Destination: { BucketName: "destination" },
    SourceProcessing: { MaxUncompressedEntryBytes: 1024, MaxCompressionRatio: 100 },
    DestinationLifecycle: { OnDeploy: {}, OnChange: {}, OnDelete: {} },
    CloudfrontInvalidation: {},
    Transfer: { AdvancedTuning: { DestinationWriteRetry: {} } },
    DestinationOwnerId: "owner",
  };
  expect(() => assertPayloadWithinSynthShape(plainPayload)).not.toThrow();
  // ...but the template schema (what the construct emits) requires them.
  expect(() => assertPayloadTree(plainPayload)).toThrow(/ServiceToken/);
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
