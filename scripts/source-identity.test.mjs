import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildEnvironmentSha256, collectSourceIdentity } from "./source-identity.mjs";

test("source identity binds tracked contents, untracked contents, modes, and exclusions", () => {
  const repository = mkdtempSync(join(tmpdir(), "shin-source-identity-"));
  const source = join(repository, "source.txt");
  const untracked = join(repository, "untracked.txt");
  const evidence = join(repository, "results.jsonl");
  execFileSync("git", ["init", "--quiet"], { cwd: repository });
  writeFileSync(source, "initial\n");
  writeFileSync(evidence, "initial row\n");
  execFileSync("git", ["add", "source.txt", "results.jsonl"], { cwd: repository });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Benchmark Test",
      "-c",
      "user.email=benchmark@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "initial",
    ],
    { cwd: repository },
  );

  const clean = collectSourceIdentity(repository);
  assert.equal(clean.dirty, false);
  writeFileSync(source, "first change\n");
  const firstTrackedChange = collectSourceIdentity(repository);
  writeFileSync(source, "second change\n");
  const secondTrackedChange = collectSourceIdentity(repository);
  assert.equal(firstTrackedChange.dirty, true);
  assert.notEqual(firstTrackedChange.sourceTreeSha256, secondTrackedChange.sourceTreeSha256);

  execFileSync("git", ["checkout", "--", "source.txt"], { cwd: repository });
  execFileSync("git", ["update-index", "--assume-unchanged", "source.txt"], { cwd: repository });
  writeFileSync(source, "hidden tracked change\n");
  assert.equal(collectSourceIdentity(repository).dirty, true);
  execFileSync("git", ["update-index", "--no-assume-unchanged", "source.txt"], {
    cwd: repository,
  });

  writeFileSync(untracked, "first untracked contents\n");
  const firstUntrackedChange = collectSourceIdentity(repository);
  writeFileSync(untracked, "second untracked contents\n");
  const secondUntrackedChange = collectSourceIdentity(repository);
  assert.notEqual(firstUntrackedChange.sourceTreeSha256, secondUntrackedChange.sourceTreeSha256);
  chmodSync(untracked, 0o755);
  assert.notEqual(
    secondUntrackedChange.sourceTreeSha256,
    collectSourceIdentity(repository).sourceTreeSha256,
  );

  const beforeEvidence = collectSourceIdentity(repository, [evidence]);
  writeFileSync(evidence, "first row\n");
  assert.deepEqual(collectSourceIdentity(repository, [evidence]), beforeEvidence);
  writeFileSync(evidence, "second row\n");
  assert.deepEqual(collectSourceIdentity(repository, [evidence]), beforeEvidence);
});

test("build environment identity includes external tool and configuration locations", () => {
  const clean = buildEnvironmentSha256({});
  for (const name of ["CARGO_HOME", "RUSTUP_HOME", "ZIG_GLOBAL_CACHE_DIR", "ZIG_LOCAL_CACHE_DIR"]) {
    assert.notEqual(buildEnvironmentSha256({ [name]: "/alternate" }), clean);
  }
  assert.equal(buildEnvironmentSha256({ UNRELATED: "value" }), clean);
});
