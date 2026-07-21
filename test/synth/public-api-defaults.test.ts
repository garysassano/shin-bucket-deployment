import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  DEFAULT_FAILURE_DIAGNOSTICS,
  DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB,
  DEFAULT_TRANSFER_MAX_CONCURRENCY,
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
    `@default DEFAULT_TRANSFER_MAX_CONCURRENCY (${DEFAULT_TRANSFER_MAX_CONCURRENCY})`,
  );
  expect(publicSource).toContain(
    "@default DEFAULT_FAILURE_DIAGNOSTICS (FailureDiagnostics.STANDARD)",
  );
  expect(providerSource).toContain("config.memorySize ?? DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB");
  expect(providerSource).toContain("config.failureDiagnostics ?? DEFAULT_FAILURE_DIAGNOSTICS");
  expect(rustSource).toContain(
    `DEFAULT_TRANSFER_MAX_CONCURRENCY: usize = ${DEFAULT_TRANSFER_MAX_CONCURRENCY};`,
  );
  expect(DEFAULT_FAILURE_DIAGNOSTICS).toBe(FailureDiagnostics.STANDARD);
});

test("binds the current verification snapshot to the package version", () => {
  const repositoryRoot = join(__dirname, "..", "..");
  const manifest = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8")) as {
    version: string;
  };
  const verification = readFileSync(join(repositoryRoot, "docs", "verification.md"), "utf8");
  const currentSnapshot = verification.match(
    /## Current Snapshot\n(?<snapshot>[\s\S]*?)\n## Current Coverage/,
  )?.groups?.snapshot;

  expect(currentSnapshot, "docs/verification.md Current Snapshot section").toBeDefined();
  expect(currentSnapshot).toContain(`shin-bucket-deployment@${manifest.version}`);
});
