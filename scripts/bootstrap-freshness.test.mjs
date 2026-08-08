import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  STALE_BOOTSTRAP_ESCAPE_HATCH,
  assertStagedBootstrapFreshness,
} from "./bootstrap-freshness.mjs";
import { collectSourceIdentity } from "./source-identity.mjs";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${String(result.stderr ?? "").trim()}`);
  }
}

/** A one-commit git fixture whose whole-tree digest is computable in-process. */
function makeRepo(t) {
  const root = mkdtempSync(join(tmpdir(), "shin-freshness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  run("git", ["-c", "init.defaultBranch=main", "init", "-q"], root);
  run("git", ["config", "user.email", "freshness@test"], root);
  run("git", ["config", "user.name", "Freshness Test"], root);
  // The real repository ignores `assets/` so staging an archive never changes
  // the source-tree digest; mirror that in the fixture.
  writeFileSync(join(root, ".gitignore"), "assets\n");
  mkdirSync(join(root, "rust"), { recursive: true });
  writeFileSync(join(root, "rust", "lib.rs"), "// fixture\n");
  run("git", ["add", "."], root);
  run("git", ["commit", "-q", "-m", "fixture"], root);
  return root;
}

function stageArchive(root, arch, { digest, dirty = false }) {
  const directory = join(root, "assets", `bootstrap-${arch}`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "bootstrap.zip"), "staged-archive");
  writeFileSync(
    join(directory, "build-provenance.json"),
    `${JSON.stringify(
      {
        architecture: arch,
        binaryName: "shin-bucket-deployment-handler",
        sourceCommit: "0".repeat(40),
        sourceDirty: dirty,
        sourceTreeSha256: digest,
      },
      null,
      2,
    )}\n`,
  );
}

function currentDigest(root) {
  return collectSourceIdentity(root).sourceTreeSha256;
}

function captureError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected the freshness check to refuse");
}

test("passes when the staged archive was built from the current source tree", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { digest: currentDigest(root) });

  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});

test("passes when only some architectures are staged and they are all fresh", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { digest: currentDigest(root) });
  // An architecture directory without an archive means the construct compiles
  // for that architecture and must not be gated.
  mkdirSync(join(root, "assets", "bootstrap-x86_64"), { recursive: true });
  writeFileSync(join(root, "assets", "bootstrap-x86_64", "README.txt"), "no archive");

  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});

test("passes when no archive is staged at all", (t) => {
  const root = makeRepo(t);
  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});

test("refuses a mismatch and names the architecture, both digests, the fix, and the escape hatch", (t) => {
  const root = makeRepo(t);
  const recorded = "0".repeat(64);
  stageArchive(root, "arm64", { digest: recorded });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /Refusing to deploy a stale prebuilt provider bootstrap \(arm64\)/);
  assert.match(error.message, /built from source tree 000000000000/);
  assert.match(
    error.message,
    new RegExp(`current source tree hashes to ${currentDigest(root).slice(0, 12)}`),
  );
  assert.match(error.message, /pnpm prebuild:bootstrap/);
  assert.match(error.message, new RegExp(`${STALE_BOOTSTRAP_ESCAPE_HATCH}=1`));
});

test("refuses when any staged architecture is stale, not only the first", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { digest: currentDigest(root) });
  stageArchive(root, "x86_64", { digest: "1".repeat(64) });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /\(x86_64\)/);
  assert.match(error.message, /111111111111/);
});

test("refuses a staged archive whose build provenance is missing", (t) => {
  const root = makeRepo(t);
  mkdirSync(join(root, "assets", "bootstrap-arm64"), { recursive: true });
  writeFileSync(join(root, "assets", "bootstrap-arm64", "bootstrap.zip"), "staged-archive");

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /build-provenance\.json is missing/);
  assert.match(error.message, /pnpm prebuild:bootstrap/);
});

test("refuses an archive built from a dirty source tree even when the digest matches", (t) => {
  const root = makeRepo(t);
  const digest = currentDigest(root);
  stageArchive(root, "arm64", { digest, dirty: true });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /built from a dirty source tree/);
  assert.match(error.message, /sourceDirty: true/);
});

test("refuses when the current source tree cannot be verified", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shin-freshness-nogit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  stageArchive(root, "arm64", { digest: "0".repeat(64) });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /Unable to verify the staged provider bootstrap/);
  assert.match(error.message, /Refusing to deploy an unverifiable archive/);
});

test("the escape hatch overrides a stale archive", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { digest: "0".repeat(64) });

  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      env: { [STALE_BOOTSTRAP_ESCAPE_HATCH]: "1" },
    }),
  );
});

test("the escape hatch also overrides a missing provenance file", (t) => {
  const root = makeRepo(t);
  mkdirSync(join(root, "assets", "bootstrap-arm64"), { recursive: true });
  writeFileSync(join(root, "assets", "bootstrap-arm64", "bootstrap.zip"), "staged-archive");

  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      env: { [STALE_BOOTSTRAP_ESCAPE_HATCH]: "true" },
    }),
  );
});

test("the escape hatch is not enabled by empty, zero, or false values", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { digest: "0".repeat(64) });

  for (const value of ["", "0", "false", "FALSE"]) {
    assert.throws(
      () =>
        assertStagedBootstrapFreshness({
          repositoryRoot: root,
          env: { [STALE_BOOTSTRAP_ESCAPE_HATCH]: value },
        }),
      /Refusing to deploy a stale prebuilt provider bootstrap/,
      `value ${JSON.stringify(value)} must not enable the escape hatch`,
    );
  }
});

test("non-bootstrap directories under assets are ignored", (t) => {
  const root = makeRepo(t);
  mkdirSync(join(root, "assets", "scratch"), { recursive: true });
  writeFileSync(join(root, "assets", "scratch", "bootstrap.zip"), "not-a-provider-archive");

  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});
