import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { test } from "node:test";
import { benchmarkExcludedPaths, bootstrapProvenanceManifest } from "./build-bootstrap.mjs";

test("emits the build provenance manifest without the schemaVersion marker", () => {
  const manifest = bootstrapProvenanceManifest({
    architecture: "arm64",
    binaryName: "shin-bucket-deployment-handler",
    target: "aarch64-unknown-linux-gnu",
    source: {
      commit: "9".repeat(40),
      dirty: false,
      sourceTreeSha256: "a".repeat(64),
    },
    providerInput: {
      providerInputSha256: "e".repeat(64),
      providerInputDirty: false,
    },
    applicationBuildSha256: "b".repeat(64),
    tools: {
      cargoVersion: "cargo 1.0.0",
      rustcVersion: "rustc 1.0.0",
      cargoLambdaVersion: "cargo-lambda 1.0.0",
      zigVersion: "1.0.0",
      buildToolchainSha256: "c".repeat(64),
      buildEnvironmentSha256: "d".repeat(64),
    },
    bootstrapBytes: Buffer.from("provider-binary"),
    archiveBytes: Buffer.from("provider-archive"),
  });

  assert.ok(
    !("schemaVersion" in manifest),
    "emitted provenance must not carry the schemaVersion marker",
  );
  assert.equal(manifest.architecture, "arm64");
  assert.equal(manifest.sourceCommit, "9".repeat(40));
  assert.equal(manifest.providerInputSha256, "e".repeat(64));
  assert.equal(manifest.providerInputDirty, false);
  assert.equal(
    manifest.bootstrapSha256,
    createHash("sha256").update("provider-binary").digest("hex"),
  );
  assert.equal(
    manifest.bootstrapArchiveSha256,
    createHash("sha256").update("provider-archive").digest("hex"),
  );
});

test("benchmark exclusion covers both evidence ledgers inside the repository", () => {
  const root = join("/repo");
  assert.deepEqual(benchmarkExcludedPaths(root, join(root, "benchmarks/results.jsonl")), [
    "benchmarks/results.jsonl",
    "benchmarks/runs.jsonl",
  ]);
});

test("benchmark exclusion omits ledgers outside the repository", () => {
  const root = join("/repo");
  assert.deepEqual(benchmarkExcludedPaths(root, join("/scratch/evidence/results.jsonl")), []);
});
