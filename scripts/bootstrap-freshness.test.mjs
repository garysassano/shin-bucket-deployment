import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { crc32 } from "node:zlib";
import {
  STALE_BOOTSTRAP_ESCAPE_HATCH,
  assertStagedBootstrapFreshness,
} from "./bootstrap-freshness.mjs";
import { buildEnvironmentSha256, collectProviderBuildInputIdentity } from "./source-identity.mjs";

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ELF_MACHINE_BY_ARCH = { arm64: 183, x86_64: 62 };

// A fixed digest standing in for the current build toolchain. The real
// derivation spawns cargo/rustc/cargo-lambda/zig/rustup, and this Node-level
// suite must run without a Rust toolchain; the derivation itself is exercised
// by the real build (`pnpm build:bootstrap`) and deploy (`pnpm verify`)
// paths, not by `pnpm test`.
const FIXTURE_BUILD_TOOLCHAIN_SHA256 = "b".repeat(64);

/** Minimal ELF header the package gate's archive reader accepts. */
function elfBytes(machine) {
  const elf = Buffer.alloc(64);
  elf[0] = 0x7f;
  elf.write("ELF", 1, "latin1");
  elf[4] = 2; // 64-bit
  elf[5] = 1; // little-endian
  elf.writeUInt16LE(machine, 18);
  return elf;
}

/**
 * Minimal stored-entry ZIP with one executable `bootstrap` entry, shaped like
 * the archive the package gate parses: single entry, Unix attributes, no
 * comment, valid CRC and central directory.
 */
function providerArchiveZip(machine, content = elfBytes(machine)) {
  const crc = crc32(content);
  const name = Buffer.from("bootstrap");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(ZIP_LOCAL_FILE_HEADER, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 8); // stored
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(content.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER, 0);
  central.writeUInt16LE((3 << 8) | 20, 4); // made by Unix
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(content.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE((0o100755 << 16) >>> 0, 38);
  central.writeUInt32LE(0, 42);
  const centralDirectory = Buffer.concat([central, name]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(local.length + name.length + content.length, 16);
  return Buffer.concat([local, name, content, centralDirectory, eocd]);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

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
  writeFileSync(join(root, "mise.toml"), '[tools]\nrust = "1.0.0"\n');
  run("git", ["add", "."], root);
  run("git", ["commit", "-q", "-m", "fixture"], root);
  return root;
}

/**
 * The current build recipe of the fixture, supplied to the gate through the
 * `currentIdentity` seam. The provider-input and build-environment digests
 * are derived exactly as the real recipe derives them (git and the bounded
 * build-flag variable list); the build-toolchain digest is the fixed constant
 * above. The gate's comparison logic is the real code — only the toolchain
 * derivation is stubbed, and only here: the deploy path never supplies the
 * seam and always re-derives.
 */
function currentIdentity(root) {
  return {
    providerInputSha256: collectProviderBuildInputIdentity(root).providerInputSha256,
    buildToolchainSha256: FIXTURE_BUILD_TOOLCHAIN_SHA256,
    buildEnvironmentSha256: buildEnvironmentSha256(),
  };
}

function stageArchive(
  root,
  arch,
  {
    providerInputSha256,
    buildToolchainSha256,
    buildEnvironmentSha256,
    archive = undefined,
    dirty = false,
  },
) {
  const directory = join(root, "assets", `bootstrap-${arch}`);
  mkdirSync(directory, { recursive: true });
  const zip = archive ?? providerArchiveZip(ELF_MACHINE_BY_ARCH[arch]);
  writeFileSync(join(directory, "bootstrap.zip"), zip);
  const bootstrap = zip.subarray(
    // Local header (30) + name (9) + stored content; the fixture archive has
    // no extra fields, so the content is exactly this slice.
    30 + "bootstrap".length,
    30 + "bootstrap".length + 64,
  );
  const identity =
    providerInputSha256 === undefined ||
    buildToolchainSha256 === undefined ||
    buildEnvironmentSha256 === undefined
      ? currentIdentity(root)
      : undefined;
  writeFileSync(
    join(directory, "build-provenance.json"),
    `${JSON.stringify(
      {
        architecture: arch,
        binaryName: "shin-bucket-deployment-handler",
        sourceCommit: "0".repeat(40),
        sourceDirty: dirty,
        sourceTreeSha256: "0".repeat(64),
        providerInputSha256: providerInputSha256 ?? identity.providerInputSha256,
        buildToolchainSha256: buildToolchainSha256 ?? identity.buildToolchainSha256,
        buildEnvironmentSha256: buildEnvironmentSha256 ?? identity.buildEnvironmentSha256,
        providerInputDirty: dirty,
        bootstrapSha256: sha256(bootstrap),
        bootstrapArchiveSha256: sha256(zip),
      },
      null,
      2,
    )}\n`,
  );
}

function captureError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected the freshness check to refuse");
}

test("passes when the staged archive was built from the current provider inputs", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", {});

  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
});

test("passes when only some architectures are staged and they are all fresh", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", {});
  // An architecture directory without an archive means the construct compiles
  // for that architecture and must not be gated.
  mkdirSync(join(root, "assets", "bootstrap-x86_64"), { recursive: true });
  writeFileSync(join(root, "assets", "bootstrap-x86_64", "README.txt"), "no archive");

  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
});

test("passes when no archive is staged at all", (t) => {
  const root = makeRepo(t);
  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});

test("refuses a provider-input mismatch and names the architecture, both digests, the fix, and the escape hatch", (t) => {
  const root = makeRepo(t);
  const recorded = "0".repeat(64);
  stageArchive(root, "arm64", { providerInputSha256: recorded });

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /Refusing to deploy a stale prebuilt provider bootstrap \(arm64\)/);
  assert.match(error.message, /provider inputs hashing to 000000000000/);
  assert.match(
    error.message,
    new RegExp(
      `current provider inputs hash to ${currentIdentity(root).providerInputSha256.slice(0, 12)}`,
    ),
  );
  assert.match(error.message, /pnpm build:bootstrap/);
  assert.match(error.message, new RegExp(`${STALE_BOOTSTRAP_ESCAPE_HATCH}=1`));
});

test("refuses when any staged architecture is stale, not only the first", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", {});
  stageArchive(root, "x86_64", { providerInputSha256: "1".repeat(64) });

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /\(x86_64\)/);
  assert.match(error.message, /111111111111/);
});

test("checks only the architectures the caller selects", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });
  stageArchive(root, "x86_64", {});

  // Only x86_64 is fresh, and only x86_64 is selected, so the deploy is fine.
  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      architectures: ["x86_64"],
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.throws(
    () =>
      assertStagedBootstrapFreshness({
        repositoryRoot: root,
        architectures: ["arm64"],
        currentIdentity: currentIdentity(root),
      }),
    /\(arm64\)/,
  );
  assert.throws(
    () =>
      assertStagedBootstrapFreshness({
        repositoryRoot: root,
        currentIdentity: currentIdentity(root),
      }),
    /\(arm64\)/,
  );
});

test("refuses a staged archive whose build provenance is missing", (t) => {
  const root = makeRepo(t);
  mkdirSync(join(root, "assets", "bootstrap-arm64"), { recursive: true });
  writeFileSync(
    join(root, "assets", "bootstrap-arm64", "bootstrap.zip"),
    providerArchiveZip(ELF_MACHINE_BY_ARCH.arm64),
  );

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /build-provenance\.json is missing/);
  assert.match(error.message, /pnpm build:bootstrap/);
});

test("refuses an archive whose provenance predates provider-input digests", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });
  const directory = join(root, "assets", "bootstrap-arm64");
  const manifest = JSON.parse(readFileSync(join(directory, "build-provenance.json"), "utf8"));
  delete manifest.providerInputSha256;
  writeFileSync(join(directory, "build-provenance.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /does not record a providerInputSha256/);
});

test("refuses a replaced archive even when the provenance records matching source digests", (t) => {
  const root = makeRepo(t);
  const digest = currentIdentity(root).providerInputSha256;
  // Stage a fresh archive, then swap its bytes while leaving the provenance
  // file intact: the recorded provider-input digest still matches, so only
  // the archive-byte check can catch the replacement.
  stageArchive(root, "arm64", { providerInputSha256: digest });
  const differentBootstrap = elfBytes(ELF_MACHINE_BY_ARCH.arm64);
  differentBootstrap[40] ^= 0xff;
  const swapped = providerArchiveZip(ELF_MACHINE_BY_ARCH.arm64, differentBootstrap);
  writeFileSync(join(root, "assets", "bootstrap-arm64", "bootstrap.zip"), swapped);

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /does not match the bootstrapArchiveSha256 recorded/);
});

test("passes a digest-matching archive built from a dirty tree", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { dirty: true });

  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
});

test("refuses when the current source tree cannot be verified", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shin-freshness-nogit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // The fixture is not a git repository, so no current identity can be
  // computed; record explicit garbage for every digest so staging itself
  // does not need the identity.
  stageArchive(root, "arm64", {
    providerInputSha256: "0".repeat(64),
    buildToolchainSha256: "0".repeat(64),
    buildEnvironmentSha256: "0".repeat(64),
  });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /Unable to verify the staged provider bootstrap/);
  assert.match(error.message, /Refusing to deploy an unverifiable archive/);
});

test("the escape hatch overrides a stale archive", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });

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
  writeFileSync(
    join(root, "assets", "bootstrap-arm64", "bootstrap.zip"),
    providerArchiveZip(ELF_MACHINE_BY_ARCH.arm64),
  );

  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      env: { [STALE_BOOTSTRAP_ESCAPE_HATCH]: "true" },
    }),
  );
});

test("the escape hatch is not enabled by empty, zero, or false values", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });

  for (const value of ["", "0", "false", "FALSE"]) {
    assert.throws(
      () =>
        assertStagedBootstrapFreshness({
          repositoryRoot: root,
          env: { [STALE_BOOTSTRAP_ESCAPE_HATCH]: value },
          currentIdentity: currentIdentity(root),
        }),
      /Refusing to deploy a stale prebuilt provider bootstrap/,
      `value ${JSON.stringify(value)} must not enable the escape hatch`,
    );
  }
});

test("refuses an archive built with a different build environment", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", {});

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      // The archive recorded the current environment digest; the current
      // recipe now carries RUSTFLAGS, so the build-environment digest differs
      // and the archive is refused.
      currentIdentity: {
        ...currentIdentity(root),
        buildEnvironmentSha256: buildEnvironmentSha256({
          ...process.env,
          RUSTFLAGS: "-C opt-level=0",
        }),
      },
    }),
  );
  assert.match(error.message, /build environment hashing to /);
  assert.match(error.message, /current build environment hash to /);
  assert.match(error.message, /pnpm build:bootstrap/);
});

test("refuses an archive whose recorded build toolchain differs from the current one", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { buildToolchainSha256: "0".repeat(64) });

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /build toolchain hashing to 000000000000/);
  assert.match(error.message, /current build toolchain hash to /);
});

test("refuses an archive whose provenance predates build-recipe digests", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", {});
  const directory = join(root, "assets", "bootstrap-arm64");
  const manifest = JSON.parse(readFileSync(join(directory, "build-provenance.json"), "utf8"));
  delete manifest.buildToolchainSha256;
  delete manifest.buildEnvironmentSha256;
  writeFileSync(join(directory, "build-provenance.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const error = captureError(() =>
    assertStagedBootstrapFreshness({
      repositoryRoot: root,
      currentIdentity: currentIdentity(root),
    }),
  );
  assert.match(error.message, /does not record a buildToolchainSha256/);
});

test("refuses an explicitly empty architecture selection instead of gating nothing", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", {});

  const error = captureError(() =>
    assertStagedBootstrapFreshness({ repositoryRoot: root, architectures: [] }),
  );
  assert.match(error.message, /zero architectures/);
  assert.match(error.message, /silently gate nothing/);
});

test("non-bootstrap directories under assets are ignored", (t) => {
  const root = makeRepo(t);
  mkdirSync(join(root, "assets", "scratch"), { recursive: true });
  writeFileSync(join(root, "assets", "scratch", "bootstrap.zip"), "not-a-provider-archive");

  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});
