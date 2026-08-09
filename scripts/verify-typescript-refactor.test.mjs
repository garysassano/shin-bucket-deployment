import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  collectAssemblyDifferences,
  evaluateSynthesisContract,
  prepareBootstrapArchives,
} from "./verify-typescript-refactor.mjs";

const RELATIVE_ROOT = "out";

function writeTree(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

function fixturePair(baselineFiles, currentFiles) {
  const baseline = mkdtempSync(join(tmpdir(), "shin-contract-baseline-"));
  const current = mkdtempSync(join(tmpdir(), "shin-contract-current-"));
  writeTree(baseline, baselineFiles);
  writeTree(current, currentFiles);
  return { baseline, current };
}

test("strict mode fails when synthesis differs", () => {
  const { baseline, current } = fixturePair(
    { "a.template.json": JSON.stringify({ Resources: { A: {} } }) },
    { "a.template.json": JSON.stringify({ Resources: { A: { Changed: true } } }) },
  );
  const differences = collectAssemblyDifferences(baseline, current, RELATIVE_ROOT);
  assert.throws(
    () => evaluateSynthesisContract(differences, undefined),
    (error) => {
      assert.match(error.message, /Synthesis differs from baseline/);
      assert.match(error.message, /out\/a\.template\.json/);
      return true;
    },
  );
});

test("acknowledgement mode passes when the observed changed labels equal the manifest", () => {
  const { baseline, current } = fixturePair(
    {
      "a.template.json": JSON.stringify({ Resources: { A: {} } }),
      "b.template.json": JSON.stringify({ Resources: { B: {} } }),
    },
    {
      "a.template.json": JSON.stringify({ Resources: { A: { Changed: true } } }),
      "b.template.json": JSON.stringify({ Resources: { B: {} } }),
    },
  );
  const differences = collectAssemblyDifferences(baseline, current, RELATIVE_ROOT);
  assert.deepEqual(
    differences.map(({ label }) => label),
    ["out/a.template.json"],
  );
  assert.doesNotThrow(() =>
    evaluateSynthesisContract(differences, {
      "out/a.template.json": "renamed resource A",
    }),
  );
});

test("acknowledgement mode fails when the manifest lists a label that did not change", () => {
  const { baseline, current } = fixturePair(
    { "a.template.json": JSON.stringify({ Resources: { A: {} } }) },
    { "a.template.json": JSON.stringify({ Resources: { A: {} } }) },
  );
  const differences = collectAssemblyDifferences(baseline, current, RELATIVE_ROOT);
  assert.deepEqual(differences, []);
  assert.throws(
    () =>
      evaluateSynthesisContract(differences, {
        "out/a.template.json": "expected a change that never happened",
      }),
    (error) => {
      assert.match(error.message, /listed in the expected changes manifest but did not change/);
      assert.match(error.message, /out\/a\.template\.json/);
      return true;
    },
  );
});

test("acknowledgement mode fails when a change is not listed in the manifest", () => {
  const { baseline, current } = fixturePair(
    { "a.template.json": JSON.stringify({ Resources: { A: {} } }) },
    { "a.template.json": JSON.stringify({ Resources: { A: { Changed: true } } }) },
  );
  const differences = collectAssemblyDifferences(baseline, current, RELATIVE_ROOT);
  assert.throws(
    () => evaluateSynthesisContract(differences, {}),
    (error) => {
      assert.match(error.message, /changed but not listed in the expected changes manifest/);
      assert.match(error.message, /out\/a\.template\.json/);
      return true;
    },
  );
});

test("the accumulated report names every differing label, not just the first", () => {
  const { baseline, current } = fixturePair(
    {
      "a.template.json": JSON.stringify({ Resources: { A: {} } }),
      "b.template.json": JSON.stringify({ Resources: { B: {} } }),
      "c.template.json": JSON.stringify({ Resources: { C: {} } }),
      "d.template.json": JSON.stringify({ Resources: { D: {} } }),
    },
    {
      "a.template.json": JSON.stringify({ Resources: { A: { Changed: true } } }),
      "b.template.json": JSON.stringify({ Resources: { B: {} } }),
      "c.template.json": JSON.stringify({ Resources: { C: { Changed: true } } }),
      "d.template.json": JSON.stringify({ Resources: { D: {} } }),
    },
  );
  const differences = collectAssemblyDifferences(baseline, current, RELATIVE_ROOT);
  assert.deepEqual(
    differences.map(({ label }) => label),
    ["out/a.template.json", "out/c.template.json"],
  );
  assert.throws(
    () => evaluateSynthesisContract(differences, undefined),
    (error) => {
      for (const label of ["out/a.template.json", "out/c.template.json"]) {
        assert.ok(error.message.includes(label), `message must name ${label}`);
      }
      assert.match(error.message, /2 place\(s\)/);
      return true;
    },
  );
});

test("acknowledgement mode rejects manifest entries without a non-empty reason", () => {
  const differences = [];
  for (const manifest of [
    { "out/a.template.json": "" },
    { "out/a.template.json": "   " },
    { "out/a.template.json": null },
    { "out/a.template.json": 42 },
  ]) {
    assert.throws(
      () => evaluateSynthesisContract(differences, manifest),
      /reason must be a non-empty string/,
    );
  }
  assert.throws(
    () => evaluateSynthesisContract(differences, ["out/a.template.json"]),
    /must be a JSON object/,
  );
});

test("acknowledgement mode reports both mismatch directions in one message", () => {
  const { baseline, current } = fixturePair(
    { "a.template.json": JSON.stringify({ Resources: { A: {} } }) },
    { "a.template.json": JSON.stringify({ Resources: { A: { Changed: true } } }) },
  );
  const differences = collectAssemblyDifferences(baseline, current, RELATIVE_ROOT);
  assert.throws(
    () =>
      evaluateSynthesisContract(differences, {
        "out/b.template.json": "expected a change that never happened",
      }),
    (error) => {
      assert.match(error.message, /listed in the expected changes manifest but did not change/);
      assert.match(error.message, /out\/b\.template\.json/);
      assert.match(error.message, /out\/a\.template\.json/);
      return true;
    },
  );
});

// The buggy line only runs for the current repository root, so the tracking
// array must be exercised with root === repoRoot. Passing an unrelated temp
// root skips it entirely and tests nothing.
test("prepareBootstrapArchives records the fallback archives it creates", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shin-contract-bootstrap-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const created = [];

  assert.doesNotThrow(() => prepareBootstrapArchives(root, created, root));

  assert.equal(created.length, 2, "both architectures should be recorded for cleanup");
  for (const architecture of ["arm64", "x86_64"]) {
    const archive = join(root, "assets", `bootstrap-${architecture}`, "bootstrap.zip");
    assert.ok(existsSync(archive), `expected a staged ${architecture} archive`);
    assert.ok(created.includes(archive), `expected ${architecture} to be tracked for cleanup`);
  }
});

test("prepareBootstrapArchives does not record archives staged outside the repository", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shin-contract-baseline-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const created = [];

  prepareBootstrapArchives(root, created, join(root, "elsewhere"));

  assert.deepEqual(created, [], "a baseline worktree's archives are not ours to delete");
});

// The CLI calls this with defaults, so the default expressions must resolve.
// This is the shape that actually broke: with the tracking array declared
// inside main(), evaluating the default threw
// "ReferenceError: createdCurrentArchives is not defined" on the first call.
test("prepareBootstrapArchives resolves its defaults the way the CLI calls it", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shin-contract-defaults-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  assert.doesNotThrow(() => prepareBootstrapArchives(root));
});
