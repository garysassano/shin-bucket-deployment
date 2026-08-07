import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { crc32 } from "node:zlib";
import { verifyBootstrapProvenance } from "./verify-package.mjs";

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ELF_MACHINE_BY_ARCH = { arm64: 183, x86_64: 62 };
const TARGET_BY_ARCH = {
  arm64: "aarch64-unknown-linux-gnu",
  x86_64: "x86_64-unknown-linux-gnu",
};

function elfBytes(machine) {
  const elf = Buffer.alloc(64);
  elf[0] = 0x7f;
  elf.write("ELF", 1, "latin1");
  elf[4] = 2; // 64-bit
  elf[5] = 1; // little-endian
  elf.writeUInt16LE(machine, 18);
  return elf;
}

/** Minimal stored-entry ZIP with one entry, Unix attributes, no comment. */
function storedZip(entryName, content) {
  const crc = crc32(content);
  const name = Buffer.from(entryName);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(ZIP_LOCAL_FILE_HEADER, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0, 8); // stored
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(content.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER, 0);
  central.writeUInt16LE((3 << 8) | 20, 4); // made by Unix
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0, 8); // stored
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(content.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE((0o100755 << 16) >>> 0, 38); // regular, owner-executable
  central.writeUInt32LE(0, 42); // local header offset
  const centralDirectory = Buffer.concat([central, name]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(local.length + name.length + content.length, 16);
  return Buffer.concat([local, name, content, centralDirectory, eocd]);
}

test("accepts a build provenance manifest without the schemaVersion marker", () => {
  const dir = mkdtempSync(join(tmpdir(), "shin-verify-provenance-"));
  for (const arch of ["arm64", "x86_64"]) {
    const bootstrap = elfBytes(ELF_MACHINE_BY_ARCH[arch]);
    const archivePath = join(dir, `${arch}.zip`);
    const provenancePath = join(dir, `${arch}.json`);
    const archive = storedZip("bootstrap", bootstrap);
    writeFileSync(archivePath, archive);
    writeFileSync(
      provenancePath,
      JSON.stringify({
        architecture: arch,
        binaryName: "shin-bucket-deployment-handler",
        target: TARGET_BY_ARCH[arch],
        sourceCommit: "9".repeat(40),
        sourceDirty: false,
        sourceTreeSha256: "a".repeat(64),
        applicationBuildSha256: "b".repeat(64),
        cargoVersion: "cargo 1.0.0",
        rustcVersion: "rustc 1.0.0",
        cargoLambdaVersion: "cargo-lambda 1.0.0",
        zigVersion: "1.0.0",
        buildToolchainSha256: "c".repeat(64),
        buildEnvironmentSha256: "d".repeat(64),
        bootstrapSha256: createHash("sha256").update(bootstrap).digest("hex"),
        bootstrapArchiveSha256: createHash("sha256").update(archive).digest("hex"),
      }),
    );
    verifyBootstrapProvenance(archivePath, provenancePath, arch);
  }
});

test("verify-package still rejects a provenance whose digests do not match", () => {
  const dir = mkdtempSync(join(tmpdir(), "shin-verify-provenance-bad-"));
  const bootstrap = elfBytes(ELF_MACHINE_BY_ARCH.arm64);
  const archivePath = join(dir, "arm64.zip");
  const provenancePath = join(dir, "arm64.json");
  const archive = storedZip("bootstrap", bootstrap);
  writeFileSync(archivePath, archive);
  writeFileSync(
    provenancePath,
    JSON.stringify({
      architecture: "arm64",
      binaryName: "shin-bucket-deployment-handler",
      target: TARGET_BY_ARCH.arm64,
      sourceTreeSha256: "a".repeat(64),
      buildToolchainSha256: "c".repeat(64),
      buildEnvironmentSha256: "d".repeat(64),
      bootstrapSha256: createHash("sha256").update(bootstrap).digest("hex"),
      bootstrapArchiveSha256: "0".repeat(64),
    }),
  );
  assert.throws(
    () => verifyBootstrapProvenance(archivePath, provenancePath, "arm64"),
    /does not match the packaged bootstrap archive/,
  );
});
