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
  const functions = Object.values(template.Resources ?? {}).filter(
    (resource) => resource?.Type === "AWS::Lambda::Function",
  );
  const hasFreshnessToken = functions.some(
    (resource) =>
      resource.Properties?.Environment?.Variables?.SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN ===
      "no-aws-synth",
  );
  if (!hasFreshnessToken) {
    throw new Error(`Benchmark provider freshness token missing from ${path}.`);
  }
  implementations.add(path.includes("AwsBucketDeployment") ? "aws" : "shin");
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
