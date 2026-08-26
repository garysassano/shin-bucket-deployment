import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { assertBootstrapAssetsPresent } from "./verify-bootstrap-assets.mjs";

test("wires the explicit build command and the preflight first in the full check", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts["build:bootstrap"], "node scripts/build-bootstrap.mjs");
  assert.equal(
    packageJson.scripts["verify:bootstrap-assets"],
    "node scripts/verify-bootstrap-assets.mjs",
  );
  assert.match(packageJson.scripts.check, /^pnpm verify:bootstrap-assets && /);
  assert.equal(packageJson.scripts["prebuild:bootstrap"], undefined);
  assert.equal(packageJson.scripts["verify:synthesis-contract"], undefined);
});

function makeRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "shin-bootstrap-assets-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  return root;
}

function stage(root, architecture, file) {
  const path = join(root, "assets", `bootstrap-${architecture}`, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "fixture\n");
}

function stageCompleteAssets(root) {
  for (const architecture of ["arm64", "x86_64"]) {
    stage(root, architecture, "bootstrap.zip");
    stage(root, architecture, "build-provenance.json");
  }
}

test("passes when both bootstrap archives and provenance files are present", (t) => {
  const root = makeRoot(t);
  stageCompleteAssets(root);
  assert.doesNotThrow(() => assertBootstrapAssetsPresent(root));
});

test("fails early with the build command when an archive is missing", (t) => {
  const root = makeRoot(t);
  stageCompleteAssets(root);
  rmSync(join(root, "assets", "bootstrap-arm64", "bootstrap.zip"));

  assert.throws(
    () => assertBootstrapAssetsPresent(root),
    (error) => {
      assert.match(error.message, /assets\/bootstrap-arm64\/bootstrap\.zip/);
      assert.match(error.message, /pnpm build:bootstrap/);
      return true;
    },
  );
});

test("fails early with the build command when provenance is missing", (t) => {
  const root = makeRoot(t);
  stageCompleteAssets(root);
  rmSync(join(root, "assets", "bootstrap-x86_64", "build-provenance.json"));

  assert.throws(
    () => assertBootstrapAssetsPresent(root),
    (error) => {
      assert.match(error.message, /assets\/bootstrap-x86_64\/build-provenance\.json/);
      assert.match(error.message, /pnpm build:bootstrap/);
      return true;
    },
  );
});
