#!/usr/bin/env node
// Build the Rust provider ZIP for both Lambda architectures and stage it under
// `assets/bootstrap-<arch>/bootstrap.zip` so it can be shipped inside the
// published npm package. Keeping the executable inside the ZIP preserves its
// Unix mode through npm packaging.
//
// Usage:
//   node scripts/build-bootstrap.mjs            # build arm64 + x86_64
//   node scripts/build-bootstrap.mjs arm64      # build a single architecture
//   node scripts/build-bootstrap.mjs x86_64
//
// Requires `cargo-lambda` on PATH.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const manifestPath = join(repoRoot, "rust", "Cargo.toml");
const binaryName = "shin-bucket-deployment-handler";

// Map our public architecture names to cargo-lambda --target triples and the
// directory used by the public package.
const ARCH_TARGETS = {
  arm64: {
    target: "aarch64-unknown-linux-gnu",
    lambdaDir: "arm64",
  },
  x86_64: {
    target: "x86_64-unknown-linux-gnu",
    lambdaDir: "x86_64",
  },
};

function run(command, args) {
  const printable = [command, ...args].join(" ");
  console.log(`> ${printable}`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd: repoRoot });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${printable}`);
  }
}

function buildArch(arch) {
  const config = ARCH_TARGETS[arch];
  if (!config) {
    throw new Error(
      `Unknown architecture: ${arch}. Expected one of ${Object.keys(ARCH_TARGETS).join(", ")}`,
    );
  }

  run("cargo", [
    "lambda",
    "build",
    "--release",
    "--manifest-path",
    manifestPath,
    "--bin",
    binaryName,
    "--target",
    config.target,
    "--output-format",
    "zip",
    "--lambda-dir",
    join(repoRoot, "rust", "target", "lambda-packages", arch),
  ]);

  const builtArchive = join(
    repoRoot,
    "rust",
    "target",
    "lambda-packages",
    arch,
    binaryName,
    "bootstrap.zip",
  );
  if (!existsSync(builtArchive)) {
    throw new Error(`Could not find built bootstrap archive for ${arch}: ${builtArchive}`);
  }

  const outDir = join(repoRoot, "assets", `bootstrap-${config.lambdaDir}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "bootstrap.zip");
  copyFileSync(builtArchive, outFile);
  console.log(`Staged ${arch} bootstrap archive -> ${outFile}`);
}

function main() {
  const requested = process.argv.slice(2);
  const arches = requested.length > 0 ? requested : Object.keys(ARCH_TARGETS);
  for (const arch of arches) {
    buildArch(arch);
  }
}

main();
