import { join } from "node:path";
import { App, Aws, CfnParameter, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  Source as CdkSource,
  type ISource,
  MarkerEncoding,
  type SourceConfig,
} from "aws-cdk-lib/aws-s3-deployment";
import { expect, test } from "vitest";
import { ShinBucketDeployment, Source } from "../../src";
import { testLocalProviderBuild } from "../support/bundling";

type WireMarker = { Marker: string; Value: unknown; Encoding: string };

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

function deploy(sources: ISource[], extract?: boolean): Stack {
  const stack = new Stack();
  new ShinBucketDeployment(stack, "Deploy", {
    sources,
    destination: { bucket: new Bucket(stack, "Dest") },
    sourceProcessing: extract === undefined ? undefined : { extract },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });
  return stack;
}

function sourceMarkers(stack: Stack): WireMarker[][] {
  return customResourceProperties(stack).SourceMarkers as WireMarker[][];
}

function encodings(markers: WireMarker[] | undefined): string[] {
  if (markers === undefined) {
    throw new Error("source marker list not found");
  }
  return markers.map((marker) => marker.Encoding);
}

test("renders Source.data markers as LITERAL with their CloudFormation values", () => {
  const stack = deploy([
    Source.data(
      "runtime/plain.txt",
      `region=${Aws.REGION}\nstack=${Aws.STACK_NAME}\nregion-again=${Aws.REGION}`,
    ),
  ]);

  const [markers] = sourceMarkers(stack);
  expect(encodings(markers)).toEqual(["LITERAL", "LITERAL", "LITERAL"]);
  expect(markers?.map((marker) => marker.Value)).toEqual([
    { Ref: "AWS::Region" },
    { Ref: "AWS::StackName" },
    { Ref: "AWS::Region" },
  ]);
  expect(customResourceProperties(stack).SourceMarkersConfig).toBeUndefined();
});

test("resolves jsonEscape to UNQUOTED_JSON_VALUE for Source.data markers", () => {
  const stack = deploy([
    Source.data("runtime/from-data-escaped.json", `{"specialValue":"${Aws.STACK_NAME}"}`, {
      jsonEscape: true,
    }),
  ]);

  expect(encodings(sourceMarkers(stack)[0])).toEqual(["UNQUOTED_JSON_VALUE"]);
});

test("escapes Source.jsonData strings as contents and lists as complete JSON values", () => {
  const stack = new Stack();
  const ports = new CfnParameter(stack, "Ports", { type: "CommaDelimitedList" });
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [
      Source.jsonData("runtime/config.json", {
        stackName: Aws.STACK_NAME,
        ports: ports.valueAsList,
      }),
    ],
    destination: { bucket: new Bucket(stack, "Dest") },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  const [markers] = sourceMarkers(stack);
  expect(markers).toEqual([
    expect.objectContaining({ Value: { Ref: "AWS::StackName" }, Encoding: "UNQUOTED_JSON_VALUE" }),
    expect.objectContaining({ Value: { Ref: "Ports" }, Encoding: "JSON_VALUE" }),
  ]);
});

test("renders Source.yamlData strings as YAML_STRING and lists as JSON_VALUE", () => {
  const stack = new Stack();
  const ports = new CfnParameter(stack, "Ports", { type: "CommaDelimitedList" });
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [
      Source.yamlData("runtime/config.yaml", {
        stackName: Aws.STACK_NAME,
        ports: ports.valueAsList,
      }),
    ],
    destination: { bucket: new Bucket(stack, "Dest") },
    providerLambda: { localBuild: testLocalProviderBuild() },
  });

  expect(encodings(sourceMarkers(stack)[0])).toEqual(["YAML_STRING", "JSON_VALUE"]);
});

test("rejects a deploy-time value used as a Source.yamlData mapping key", () => {
  expect(() =>
    deploy([Source.yamlData("runtime/config.yaml", { nested: { [Aws.STACK_NAME]: "value" } })]),
  ).toThrow(/mapping key at \$\.nested\[/);
});

test("keeps upstream jsonData without escaping on the LITERAL path", () => {
  const stack = deploy([
    CdkSource.jsonData("runtime/raw.json", { stackName: Aws.STACK_NAME }, { escape: false }),
  ]);

  expect(encodings(sourceMarkers(stack)[0])).toEqual(["LITERAL"]);
});

test("aligns marker lists with sources and leaves marker-free sources empty", () => {
  const stack = deploy([
    Source.asset(join(__dirname, "..", "fixtures", "my-website")),
    Source.data("runtime/plain.txt", `region=${Aws.REGION}`),
    Source.data("runtime/static.txt", "no deploy-time values"),
    Source.jsonData("runtime/escaped.json", { stackName: Aws.STACK_NAME }),
    Source.yamlData("runtime/config.yaml", { stackName: Aws.STACK_NAME }),
  ]);

  const markers = sourceMarkers(stack);
  expect(markers.map(encodings)).toEqual([
    [],
    ["LITERAL"],
    [],
    ["UNQUOTED_JSON_VALUE"],
    ["YAML_STRING"],
  ]);
});

test("sends no marker array when no source has a deploy-time value", () => {
  const stack = deploy([
    Source.asset(join(__dirname, "..", "fixtures", "my-website")),
    Source.data("runtime/static.txt", "no deploy-time values"),
  ]);

  expect(customResourceProperties(stack)).not.toHaveProperty("SourceMarkers");
});

test("allows token-free Source.data without extraction", () => {
  const synth = (source: ISource) => () => customResourceProperties(deploy([source], false));

  expect(synth(Source.data("runtime/static.txt", "no deploy-time values"))).not.toThrow();
  expect(synth(Source.data("runtime/plain.txt", `region=${Aws.REGION}`))).toThrow(
    /marker replacement requires extraction/,
  );
});

test("rejects a marker encoding the provider does not implement at synthesis", () => {
  const inner = Source.data("runtime/plain.txt", `region=${Aws.REGION}`);
  const futureEncoding: ISource = {
    bind(scope, context): SourceConfig {
      const config = inner.bind(scope, context);
      const [marker] = Object.keys(config.markers ?? {});
      return {
        ...config,
        markersConfig: {
          markerEncodings: { [marker as string]: "TOML_STRING" as MarkerEncoding },
        },
      };
    },
  };
  const stack = deploy([futureEncoding]);

  expect(() => App.of(stack)?.synth()).toThrow(/requests encoding "TOML_STRING"/);
  expect(Object.values(MarkerEncoding)).not.toContain("TOML_STRING");
});
