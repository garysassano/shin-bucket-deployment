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
    implementation === "aws" ? "Custom::CDKBucketDeployment" : "Custom::ShinBucketDeployment";
  const customResources = Object.values(template.Resources ?? {}).filter(
    (resource) => resource?.Type === resourceType,
  );
  if (customResources.length !== 1) {
    throw new Error(`Expected one ${resourceType} in ${path}, found ${customResources.length}.`);
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
  if (
    implementation === "shin" &&
    JSON.stringify(handler.Properties?.Architectures) !== JSON.stringify(["arm64"])
  ) {
    throw new Error(`Shin benchmark provider architecture is invalid in ${path}.`);
  }
  implementations.add(implementation);
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
