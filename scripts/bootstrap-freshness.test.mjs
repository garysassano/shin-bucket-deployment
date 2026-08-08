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
import { collectProviderBuildInputIdentity } from "./source-identity.mjs";

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ELF_MACHINE_BY_ARCH = { arm64: 183, x86_64: 62 };

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

function stageArchive(root, arch, { providerInputSha256, archive = undefined, dirty = false }) {
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
  writeFileSync(
    join(directory, "build-provenance.json"),
    `${JSON.stringify(
      {
        architecture: arch,
        binaryName: "shin-bucket-deployment-handler",
        sourceCommit: "0".repeat(40),
        sourceDirty: dirty,
        sourceTreeSha256: "0".repeat(64),
        providerInputSha256,
        providerInputDirty: dirty,
        bootstrapSha256: sha256(bootstrap),
        bootstrapArchiveSha256: sha256(zip),
      },
      null,
      2,
    )}\n`,
  );
}

function currentDigest(root) {
  return collectProviderBuildInputIdentity(root).providerInputSha256;
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
  stageArchive(root, "arm64", { providerInputSha256: currentDigest(root) });

  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});

test("passes when only some architectures are staged and they are all fresh", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: currentDigest(root) });
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

test("refuses a provider-input mismatch and names the architecture, both digests, the fix, and the escape hatch", (t) => {
  const root = makeRepo(t);
  const recorded = "0".repeat(64);
  stageArchive(root, "arm64", { providerInputSha256: recorded });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /Refusing to deploy a stale prebuilt provider bootstrap \(arm64\)/);
  assert.match(error.message, /provider inputs hashing to 000000000000/);
  assert.match(
    error.message,
    new RegExp(`current provider inputs hash to ${currentDigest(root).slice(0, 12)}`),
  );
  assert.match(error.message, /pnpm prebuild:bootstrap/);
  assert.match(error.message, new RegExp(`${STALE_BOOTSTRAP_ESCAPE_HATCH}=1`));
});

test("refuses when any staged architecture is stale, not only the first", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: currentDigest(root) });
  stageArchive(root, "x86_64", { providerInputSha256: "1".repeat(64) });

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /\(x86_64\)/);
  assert.match(error.message, /111111111111/);
});

test("checks only the architectures the caller selects", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });
  stageArchive(root, "x86_64", { providerInputSha256: currentDigest(root) });

  // Only x86_64 is fresh, and only x86_64 is selected, so the deploy is fine.
  assert.doesNotThrow(() =>
    assertStagedBootstrapFreshness({ repositoryRoot: root, architectures: ["x86_64"] }),
  );
  assert.throws(
    () => assertStagedBootstrapFreshness({ repositoryRoot: root, architectures: ["arm64"] }),
    /\(arm64\)/,
  );
  assert.throws(() => assertStagedBootstrapFreshness({ repositoryRoot: root }), /\(arm64\)/);
});

test("refuses a staged archive whose build provenance is missing", (t) => {
  const root = makeRepo(t);
  mkdirSync(join(root, "assets", "bootstrap-arm64"), { recursive: true });
  writeFileSync(
    join(root, "assets", "bootstrap-arm64", "bootstrap.zip"),
    providerArchiveZip(ELF_MACHINE_BY_ARCH.arm64),
  );

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /build-provenance\.json is missing/);
  assert.match(error.message, /pnpm prebuild:bootstrap/);
});

test("refuses an archive whose provenance predates provider-input digests", (t) => {
  const root = makeRepo(t);
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });
  const directory = join(root, "assets", "bootstrap-arm64");
  const manifest = JSON.parse(readFileSync(join(directory, "build-provenance.json"), "utf8"));
  delete manifest.providerInputSha256;
  writeFileSync(join(directory, "build-provenance.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /does not record a providerInputSha256/);
});

test("refuses a replaced archive even when the provenance records matching source digests", (t) => {
  const root = makeRepo(t);
  const digest = currentDigest(root);
  // Stage a fresh archive, then swap its bytes while leaving the provenance
  // file intact: the recorded provider-input digest still matches, so only
  // the archive-byte check can catch the replacement.
  stageArchive(root, "arm64", { providerInputSha256: digest });
  const differentBootstrap = elfBytes(ELF_MACHINE_BY_ARCH.arm64);
  differentBootstrap[40] ^= 0xff;
  const swapped = providerArchiveZip(ELF_MACHINE_BY_ARCH.arm64, differentBootstrap);
  writeFileSync(join(root, "assets", "bootstrap-arm64", "bootstrap.zip"), swapped);

  const error = captureError(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
  assert.match(error.message, /does not match the bootstrapArchiveSha256 recorded/);
});

test("passes a digest-matching archive built from a dirty tree", (t) => {
  const root = makeRepo(t);
  const digest = currentDigest(root);
  stageArchive(root, "arm64", { providerInputSha256: digest, dirty: true });

  assert.doesNotThrow(() => assertStagedBootstrapFreshness({ repositoryRoot: root }));
});

test("refuses when the current source tree cannot be verified", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shin-freshness-nogit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  stageArchive(root, "arm64", { providerInputSha256: "0".repeat(64) });

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
