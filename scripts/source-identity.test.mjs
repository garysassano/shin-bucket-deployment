import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildEnvironmentSha256,
  collectProviderBuildInputIdentity,
  collectSourceIdentity,
} from "./source-identity.mjs";

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

test("provider input identity follows only the files that determine the binary", () => {
  const repository = mkdtempSync(join(tmpdir(), "shin-provider-input-"));
  execFileSync("git", ["init", "--quiet"], { cwd: repository });
  execFileSync("git", ["config", "user.name", "Provider Input Test"], { cwd: repository });
  execFileSync("git", ["config", "user.email", "provider-input@example.invalid"], {
    cwd: repository,
  });
  execFileSync("mkdir", ["-p", "rust/src", "rust/target", "assets"], { cwd: repository });
  writeFileSync(join(repository, ".gitignore"), "target\n");
  writeFileSync(join(repository, "mise.toml"), "rust = \"1.97.1\"\n");
  writeFileSync(join(repository, "rust", "Cargo.toml"), "[package]\n");
  writeFileSync(join(repository, "rust", "Cargo.lock"), "lock\n");
  writeFileSync(join(repository, "rust", "src", "lib.rs"), "// provider\n");
  writeFileSync(join(repository, "rust", "target", "bootstrap"), "build output\n");
  writeFileSync(join(repository, "README.md"), "consumer docs\n");
  execFileSync("git", ["add", "."], { cwd: repository });
  execFileSync("git", ["commit", "--quiet", "-m", "initial"], { cwd: repository });

  const clean = collectProviderBuildInputIdentity(repository);
  assert.equal(clean.providerInputDirty, false);

  // An unrelated tracked file (README) must not change the provider digest.
  writeFileSync(join(repository, "README.md"), "edited docs\n");
  const afterDocs = collectProviderBuildInputIdentity(repository);
  assert.equal(afterDocs.providerInputSha256, clean.providerInputSha256);
  assert.equal(afterDocs.providerInputDirty, false);
  execFileSync("git", ["checkout", "--", "README.md"], { cwd: repository });

  // A rust source change must change the digest and mark the inputs dirty.
  writeFileSync(join(repository, "rust", "src", "lib.rs"), "// provider v2\n");
  const afterSource = collectProviderBuildInputIdentity(repository);
  assert.notEqual(afterSource.providerInputSha256, clean.providerInputSha256);
  assert.equal(afterSource.providerInputDirty, true);
  execFileSync("git", ["checkout", "--", "rust/src/lib.rs"], { cwd: repository });

  // An untracked rust source is a provider input; an untracked stray file is not.
  writeFileSync(join(repository, "rust", "src", "new.rs"), "// untracked module\n");
  const afterUntrackedSource = collectProviderBuildInputIdentity(repository);
  assert.notEqual(afterUntrackedSource.providerInputSha256, clean.providerInputSha256);
  assert.equal(afterUntrackedSource.providerInputDirty, true);
  execFileSync("rm", ["rust/src/new.rs"], { cwd: repository });

  writeFileSync(join(repository, "scratch.txt"), "stray\n");
  const afterStray = collectProviderBuildInputIdentity(repository);
  assert.equal(afterStray.providerInputSha256, clean.providerInputSha256);
  assert.equal(afterStray.providerInputDirty, false);
  execFileSync("rm", ["scratch.txt"], { cwd: repository });

  // Build output under rust/target must not be a provider input.
  writeFileSync(join(repository, "rust", "target", "bootstrap"), "changed build output\n");
  const afterTarget = collectProviderBuildInputIdentity(repository);
  assert.equal(afterTarget.providerInputSha256, clean.providerInputSha256);

  // The toolchain pin is a provider input.
  writeFileSync(join(repository, "mise.toml"), "rust = \"1.98.0\"\n");
  const afterToolchain = collectProviderBuildInputIdentity(repository);
  assert.notEqual(afterToolchain.providerInputSha256, clean.providerInputSha256);
  assert.equal(afterToolchain.providerInputDirty, true);
});
