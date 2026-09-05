import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/aws-benchmark.yml", import.meta.url),
  "utf8",
);
const stage = step("Stage sanitized repetition evidence");
const upload = step("Upload sanitized repetition evidence");

test("failed repetition artifact steps run after failure without requiring absent evidence", () => {
  for (const block of [stage, upload]) {
    assert.match(block, /if: \$\{\{ always\(\) && env\.EVIDENCE_ROOT != '' \}\}/);
  }
  assert.match(upload, /if-no-files-found: ignore/);
});

for (const files of [
  [],
  ["benchmark-run-manifest.json"],
  ["benchmark-run-manifest.json", "results.jsonl", "runs.jsonl"],
]) {
  test(`stages only existing sanitized repetition files (${files.length} present)`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "shin-evidence-stage-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const evidence = join(root, "evidence");
    const scratch = join(evidence, "scratch");
    mkdirSync(scratch, { recursive: true });
    writeFileSync(join(scratch, "deploy.log"), "raw diagnostic output must stay in scratch");
    writeFileSync(join(evidence, "unrelated.json"), "not a sanitized ledger");
    for (const file of files) {
      const directory = file === "benchmark-run-manifest.json" ? scratch : evidence;
      writeFileSync(join(directory, file), `fixture ${file}\n`);
    }
    const script = stage.split("        run: |\n")[1];
    assert.ok(script, "workflow must have a staging script");
    execFileSync("bash", ["-euo", "pipefail", "-c", script], {
      env: {
        ...process.env,
        RUNNER_TEMP: root,
        EVIDENCE_ROOT: evidence,
        RESULTS_FILE: join(evidence, "results.jsonl"),
        SCRATCH_ROOT: scratch,
      },
    });
    const staged = join(root, "benchmark-shard");
    assert.deepEqual(readdirSync(staged).sort(), files.toSorted());
    for (const file of files)
      assert.equal(readFileSync(join(staged, file), "utf8"), `fixture ${file}\n`);
  });
}

function step(name) {
  const block = workflow.split(`      - name: ${name}\n`)[1]?.split("\n      - name:")[0];
  assert.ok(block, `workflow step ${name} must exist`);
  return block;
}
