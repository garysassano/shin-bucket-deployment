import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { format } from "prettier";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { MAX_BENCHMARK_CONCURRENCY, benchmarkConfigSchema } from "../../benchmarks/src/config";

const artifactPath = join(
  process.cwd(),
  "benchmarks",
  "schemas",
  "asset-benchmark-config.schema.json",
);
const configDirectory = join(process.cwd(), "benchmarks", "configs");

describe("asset benchmark configuration schema", () => {
  test("the committed JSON Schema is generated from the Zod model", async () => {
    const jsonSchema = z.toJSONSchema(benchmarkConfigSchema, {
      target: "draft-2020-12",
      io: "input",
    });
    const rendered = await format(JSON.stringify(jsonSchema), { parser: "json" });
    expect(readFileSync(artifactPath, "utf8")).toBe(rendered);
  });

  test("both validators enforce the benchmark concurrency boundaries", () => {
    const validateJsonSchema = jsonSchemaValidator();

    for (const concurrency of [1, MAX_BENCHMARK_CONCURRENCY]) {
      expect(benchmarkConfigSchema.safeParse({ concurrency }).success).toBe(true);
      expect(validateJsonSchema({ concurrency })).toBe(true);
    }
    for (const concurrency of [0, MAX_BENCHMARK_CONCURRENCY + 1, 1.5]) {
      expect(benchmarkConfigSchema.safeParse({ concurrency }).success).toBe(false);
      expect(validateJsonSchema({ concurrency })).toBe(false);
    }
    expect(benchmarkConfigSchema.safeParse({ unexpected: true }).success).toBe(false);
    expect(validateJsonSchema({ unexpected: true })).toBe(false);
  });

  test("every committed config passes both validators", () => {
    const validateJsonSchema = jsonSchemaValidator();
    const configFiles = readdirSync(configDirectory)
      .filter((name) => name.endsWith(".json"))
      .sort();

    expect(configFiles.length).toBeGreaterThan(0);
    for (const name of configFiles) {
      const config = JSON.parse(readFileSync(join(configDirectory, name), "utf8"));
      expect(benchmarkConfigSchema.safeParse(config), name).toMatchObject({ success: true });
      expect(validateJsonSchema(config), name).toBe(true);
    }
  });
});

function jsonSchemaValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  return ajv.compile(JSON.parse(readFileSync(artifactPath, "utf8")));
}
