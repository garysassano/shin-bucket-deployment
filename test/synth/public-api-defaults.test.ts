import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  DEFAULT_FAILURE_DIAGNOSTICS,
  DEFAULT_MAX_PARALLEL_TRANSFERS,
  DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB,
  FailureDiagnostics,
} from "../../src";

test("keeps public JSDoc defaults bound to the exported source constants", () => {
  const publicSource = readFileSync(
    join(__dirname, "..", "..", "src", "shin-bucket-deployment.ts"),
    "utf8",
  );
  const providerSource = readFileSync(join(__dirname, "..", "..", "src", "provider.ts"), "utf8");
  const rustSource = readFileSync(
    join(__dirname, "..", "..", "rust", "src", "s3", "mod.rs"),
    "utf8",
  );

  expect(publicSource).toContain(
    `@default DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB (${DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB})`,
  );
  expect(publicSource).toContain(
    `@default DEFAULT_MAX_PARALLEL_TRANSFERS (${DEFAULT_MAX_PARALLEL_TRANSFERS})`,
  );
  expect(publicSource).toContain(
    "@default DEFAULT_FAILURE_DIAGNOSTICS (FailureDiagnostics.STANDARD)",
  );
  expect(providerSource).toContain("config.memorySize ?? DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB");
  expect(providerSource).toContain("config.failureDiagnostics ?? DEFAULT_FAILURE_DIAGNOSTICS");
  expect(rustSource).toContain(
    `DEFAULT_MAX_PARALLEL_TRANSFERS: usize = ${DEFAULT_MAX_PARALLEL_TRANSFERS};`,
  );
  expect(DEFAULT_FAILURE_DIAGNOSTICS).toBe(FailureDiagnostics.STANDARD);
});
