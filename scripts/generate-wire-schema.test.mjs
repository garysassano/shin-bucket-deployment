import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderWireSchema } from "./generate-wire-schema.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, "generate-wire-schema.mjs");
const artifactPath = join(__dirname, "..", "contract", "wire-schema.json");

test("renderWireSchema is deterministic", () => {
  assert.equal(renderWireSchema(), renderWireSchema());
});

test("the committed artifact matches the wire contract schema", () => {
  const committed = readFileSync(artifactPath, "utf8");
  assert.equal(committed, renderWireSchema());
});

test("--check fails when the artifact drifted and passes when it matches", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "shin-wire-schema-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const scratch = join(directory, "wire-schema.json");

  writeFileSync(scratch, '{"drifted": true}\n');
  const drifted = spawnSync("node", [scriptPath, "--check", "--artifact", scratch], {
    encoding: "utf8",
  });
  assert.notEqual(drifted.status, 0, "a drifted artifact must fail the gate");
  assert.match(drifted.stderr, /drifted from the wire contract schema/);

  writeFileSync(scratch, renderWireSchema());
  const matching = spawnSync("node", [scriptPath, "--check", "--artifact", scratch], {
    encoding: "utf8",
  });
  assert.equal(matching.status, 0, "a matching artifact must pass the gate");
});

test("--check fails when the artifact is missing", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "shin-wire-schema-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const result = spawnSync(
    "node",
    [scriptPath, "--check", "--artifact", join(directory, "missing.json")],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0, "a missing artifact must fail the gate");
  assert.match(result.stderr, /is missing/);
});
