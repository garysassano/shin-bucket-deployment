import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { bootstrapProvenanceManifest } from "./build-bootstrap.mjs";

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
  assert.equal(
    manifest.bootstrapSha256,
    createHash("sha256").update("provider-binary").digest("hex"),
  );
  assert.equal(
    manifest.bootstrapArchiveSha256,
    createHash("sha256").update("provider-archive").digest("hex"),
  );
});
