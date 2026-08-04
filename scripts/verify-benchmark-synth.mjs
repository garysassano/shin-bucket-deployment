import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".benchmark-assets", "cdk.out", "benchmark");
const templates = files(root).filter((path) => path.endsWith(".template.json"));
if (templates.length !== 2) {
  throw new Error(`Expected two benchmark templates, found ${templates.length}.`);
}

const implementations = new Set();
for (const path of templates) {
  const template = JSON.parse(readFileSync(path, "utf8"));
  const implementation = path.includes("AwsBucketDeployment") ? "aws" : "shin";
  const resourceType =
    implementation === "aws"
      ? "Custom::CDKBucketDeployment"
      : "AWS::CloudFormation::CustomResource";
  const customResources = Object.values(template.Resources ?? {}).filter(
    (resource) => resource?.Type === resourceType,
  );
  if (customResources.length !== 1) {
    throw new Error(`Expected one ${resourceType} in ${path}, found ${customResources.length}.`);
  }
  if (customResources[0].Properties?.DeploymentNonce !== "no-aws-synth-invocation") {
    throw new Error(`Benchmark deployment nonce is missing from ${path}.`);
  }
  const handlerId = customResources[0].Properties?.ServiceToken?.["Fn::GetAtt"]?.[0];
  const handler = template.Resources?.[handlerId];
  if (typeof handlerId !== "string" || handler?.Type !== "AWS::Lambda::Function") {
    throw new Error(`Benchmark provider service token is invalid in ${path}.`);
  }
  const expectedLogicalPrefix =
    implementation === "aws" ? "CustomCDKBucketDeployment" : "ShinBucketDeploymentHandler";
  if (!handlerId.includes(expectedLogicalPrefix)) {
    throw new Error(`Benchmark provider logical ID is unexpected in ${path}.`);
  }
  const expectedRuntime = implementation === "aws" ? "python3.13" : "provided.al2023";
  const expectedHandler = implementation === "aws" ? "index.handler" : "bootstrap";
  if (
    handler.Properties?.MemorySize !== 1024 ||
    handler.Properties?.Runtime !== expectedRuntime ||
    handler.Properties?.Handler !== expectedHandler ||
    handler.Properties?.Environment?.Variables?.SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN !==
      "no-aws-synth"
  ) {
    throw new Error(`Benchmark provider runtime contract is invalid in ${path}.`);
  }
  const detailedDiagnostics =
    handler.Properties?.Environment?.Variables?.SHIN_DETAILED_FAILURE_DIAGNOSTICS;
  if (
    (implementation === "shin" && detailedDiagnostics !== "true") ||
    (implementation === "aws" && detailedDiagnostics !== undefined)
  ) {
    throw new Error(`Benchmark provider detailed diagnostics contract is invalid in ${path}.`);
  }
  if (
    implementation === "shin" &&
    JSON.stringify(handler.Properties?.Architectures) !== JSON.stringify(["arm64"])
  ) {
    throw new Error(`Shin benchmark provider architecture is invalid in ${path}.`);
  }
  if (implementation === "shin") {
    assertProviderAcceptsEveryProperty(customResources[0].Properties ?? {}, path);
  }
  implementations.add(implementation);
}

/**
 * The provider decodes `ResourceProperties` with `deny_unknown_fields`, so a property the
 * template emits but the request does not declare fails the deployment at runtime — on Create
 * and on Delete, which wedges the stack. Synthesis and unit tests both miss it: CDK injects
 * envelope keys the templates carry but hand-built test payloads never do. Reading the accepted
 * names back out of the request struct keeps this honest without duplicating the field list.
 */
function assertProviderAcceptsEveryProperty(properties, path) {
  const accepted = acceptedRequestProperties();
  const rejected = Object.keys(properties).filter((key) => !accepted.has(key));
  if (rejected.length > 0) {
    throw new Error(
      `Shin provider would reject ${rejected.join(", ")} at deploy time in ${path}. ` +
        "Declare it in RawDeploymentRequest or stop emitting it.",
    );
  }
}

function acceptedRequestProperties() {
  const source = readFileSync(join(process.cwd(), "rust", "src", "request.rs"), "utf8");
  const struct = source.match(/pub\(crate\) struct RawDeploymentRequest \{([\s\S]*?)\n\}/);
  if (struct === null) {
    throw new Error("Could not locate RawDeploymentRequest to read its accepted properties.");
  }
  const fields = [...struct[1].matchAll(/^\s*pub\(crate\) ([a-z0-9_]+):/gm)].map(
    (match) => match[1],
  );
  if (fields.length === 0) {
    throw new Error("Parsed no fields from RawDeploymentRequest; the guard would be vacuous.");
  }
  // `#[serde(rename_all = "PascalCase")]` on the struct.
  return new Set(
    fields.map((field) =>
      field
        .split("_")
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(""),
    ),
  );
}

if (!implementations.has("shin") || !implementations.has("aws")) {
  throw new Error("Benchmark synth must cover both Shin and upstream AWS CDK.");
}

console.log("Verified no-AWS Shin and upstream benchmark templates.");

function files(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
