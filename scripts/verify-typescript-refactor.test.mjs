import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  collectAssemblyDifferences,
  evaluateSynthesisContract,
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
