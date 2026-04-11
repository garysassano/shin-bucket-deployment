import { join } from "node:path";
import { Aws, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { expect, test } from "vitest";
import { CargoBucketDeployment, Source } from "../src";
import { testBundling } from "./test-bundling";

function customResourceProperties(stack: Stack) {
  const template = Template.fromStack(stack).toJSON() as {
    Resources: Record<string, { Type: string; Properties: Record<string, unknown> }>;
  };

  const resource = Object.values(template.Resources).find(
    (candidate) => candidate.Type === "Custom::CargoBucketDeployment",
  );

  if (!resource) {
    throw new Error("Custom::CargoBucketDeployment resource not found");
  }

  return resource.Properties;
}

test("renders plain markers for Source.data", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.data(
        "runtime/plain.txt",
        `region=${Aws.REGION}\nstack=${Aws.STACK_NAME}\nregion-again=${Aws.REGION}`,
      ),
    ],
    destinationBucket,
    bundling: testBundling(),
  });

  const properties = customResourceProperties(stack);
  const sourceMarkers = properties.SourceMarkers as Array<Record<string, unknown>>;

  expect(sourceMarkers).toHaveLength(1);
  expect(Object.keys(sourceMarkers[0])).toHaveLength(3);
  expect(properties.SourceMarkersConfig).toBeUndefined();
});

test("renders plain markers for Source.yamlData", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.yamlData("runtime/config.yaml", {
        stackName: Aws.STACK_NAME,
        region: Aws.REGION,
      }),
    ],
    destinationBucket,
    bundling: testBundling(),
  });

  const properties = customResourceProperties(stack);
  const sourceMarkers = properties.SourceMarkers as Array<Record<string, unknown>>;

  expect(sourceMarkers).toHaveLength(1);
  expect(Object.keys(sourceMarkers[0])).toHaveLength(2);
  expect(properties.SourceMarkersConfig).toBeUndefined();
});

test("renders jsonEscape config for Source.data markers", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.data("runtime/from-data-escaped.json", `{"specialValue":"${Aws.STACK_NAME}"}`, {
        jsonEscape: true,
      }),
    ],
    destinationBucket,
    bundling: testBundling(),
  });

  const properties = customResourceProperties(stack);

  expect(properties.SourceMarkersConfig).toEqual([{ jsonEscape: true }]);
});

test("renders source markers for jsonData sources with escape enabled", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.asset(join(__dirname, "fixtures", "my-website")),
      Source.jsonData(
        "runtime/config.json",
        {
          stackName: Aws.STACK_NAME,
          region: Aws.REGION,
        },
        { escape: true },
      ),
    ],
    destinationBucket,
    bundling: testBundling(),
  });

  const properties = customResourceProperties(stack);
  const sourceMarkersConfig = properties.SourceMarkersConfig as Array<Record<string, unknown>>;

  expect(sourceMarkersConfig).toEqual([{}, { jsonEscape: true }]);
});

test("keeps jsonData without escape on the plain replacement path", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.jsonData(
        "runtime/config.json",
        {
          stackName: Aws.STACK_NAME,
        },
        { escape: false },
      ),
    ],
    destinationBucket,
    bundling: testBundling(),
  });

  const properties = customResourceProperties(stack);
  const sourceMarkers = properties.SourceMarkers as Array<Record<string, unknown>>;

  expect(sourceMarkers).toHaveLength(1);
  expect(Object.keys(sourceMarkers[0])).toHaveLength(1);
  expect(properties.SourceMarkersConfig).toEqual([{}]);
});

test("keeps source marker config aligned across mixed source types", () => {
  const stack = new Stack();
  const destinationBucket = new Bucket(stack, "Dest");

  new CargoBucketDeployment(stack, "Deploy", {
    sources: [
      Source.asset(join(__dirname, "fixtures", "my-website")),
      Source.data("runtime/plain.txt", `region=${Aws.REGION}`),
      Source.jsonData(
        "runtime/raw.json",
        {
          stackName: Aws.STACK_NAME,
        },
        { escape: false },
      ),
      Source.jsonData(
        "runtime/escaped.json",
        {
          stackName: Aws.STACK_NAME,
        },
        { escape: true },
      ),
      Source.yamlData("runtime/config.yaml", {
        stackName: Aws.STACK_NAME,
      }),
    ],
    destinationBucket,
    bundling: testBundling(),
  });

  const properties = customResourceProperties(stack);
  const sourceMarkers = properties.SourceMarkers as Array<Record<string, unknown>>;

  expect(sourceMarkers).toHaveLength(5);
  expect(sourceMarkers[0]).toEqual({});
  expect(Object.keys(sourceMarkers[1])).toHaveLength(1);
  expect(Object.keys(sourceMarkers[2])).toHaveLength(1);
  expect(Object.keys(sourceMarkers[3])).toHaveLength(1);
  expect(Object.keys(sourceMarkers[4])).toHaveLength(1);
  expect(properties.SourceMarkersConfig).toEqual([{}, {}, {}, { jsonEscape: true }, {}]);
});
