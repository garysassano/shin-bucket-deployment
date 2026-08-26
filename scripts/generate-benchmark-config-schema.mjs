#!/usr/bin/env node
// Generates the committed asset benchmark configuration schema from the
// authoritative Zod model and validates every committed configuration.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { format } from "prettier";
import { z } from "zod";
import { benchmarkConfigSchema } from "../dist/benchmarks/src/config.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDirectory, "..");
const artifactPath = join(repoRoot, "benchmarks", "schemas", "asset-benchmark-config.schema.json");
const configDirectory = join(repoRoot, "benchmarks", "configs");

export function renderBenchmarkConfigSchema() {
  const jsonSchema = z.toJSONSchema(benchmarkConfigSchema, {
    target: "draft-2020-12",
    io: "input",
  });
  return format(JSON.stringify(jsonSchema), { parser: "json" });
}

function validateCommittedConfigs(jsonSchema) {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validateJsonSchema = ajv.compile(jsonSchema);
  const configFiles = readdirSync(configDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();

  for (const name of configFiles) {
    const path = join(configDirectory, name);
    const config = JSON.parse(readFileSync(path, "utf8"));
    const zodResult = benchmarkConfigSchema.safeParse(config);
    if (!zodResult.success) {
      throw new Error(`${name} failed runtime Zod validation: ${z.prettifyError(zodResult.error)}`);
    }
    if (!validateJsonSchema(config)) {
      throw new Error(
        `${name} failed generated JSON Schema validation: ${ajv.errorsText(
          validateJsonSchema.errors,
        )}`,
      );
    }
  }

  return configFiles.length;
}

async function main() {
  const check = process.argv.includes("--check");
  const rendered = await renderBenchmarkConfigSchema();
  const jsonSchema = JSON.parse(rendered);
  const configCount = validateCommittedConfigs(jsonSchema);

  if (check) {
    let committed;
    try {
      committed = readFileSync(artifactPath, "utf8");
    } catch {
      throw new Error(
        `${artifactPath} is missing. Generate it with ` +
          "`pnpm benchmark:config-schema` and commit the artifact.",
      );
    }
    if (rendered !== committed) {
      throw new Error(
        `${artifactPath} drifted from benchmarks/src/config.ts. ` +
          "Regenerate it with `pnpm benchmark:config-schema` and commit both changes.",
      );
    }
    console.log(`Benchmark config schema and ${configCount} committed configs are valid.`);
    return;
  }

  writeFileSync(artifactPath, rendered);
  console.log(`Regenerated the benchmark config schema and validated ${configCount} configs.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
