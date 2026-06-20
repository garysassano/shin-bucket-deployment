#!/usr/bin/env node
// Build the Rust provider `bootstrap` binary for both Lambda architectures and
// stage them under `assets/bootstrap-<arch>/bootstrap` so they can be shipped
// inside the published npm package. Consumers then use the prebuilt binary and
// do not need a Rust toolchain.
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
// directory cargo-lambda writes the artifact to.
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
    throw new Error(`Unknown architecture: ${arch}. Expected one of ${Object.keys(ARCH_TARGETS).join(", ")}`);
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
  ]);

  // cargo-lambda places the renamed `bootstrap` under
  // target/lambda/<binaryName>/bootstrap regardless of target triple.
  const candidates = [
    join(repoRoot, "rust", "target", "lambda", binaryName, "bootstrap"),
    join(repoRoot, "rust", "target", config.target, "release", "bootstrap"),
  ];
  const builtBootstrap = candidates.find((candidate) => existsSync(candidate));
  if (!builtBootstrap) {
    throw new Error(
      `Could not find built bootstrap for ${arch}. Looked in:\n${candidates.join("\n")}`,
    );
  }

  const outDir = join(repoRoot, "assets", `bootstrap-${config.lambdaDir}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "bootstrap");
  copyFileSync(builtBootstrap, outFile);
  console.log(`Staged ${arch} bootstrap -> ${outFile}`);
}

function main() {
  const requested = process.argv.slice(2);
  const arches = requested.length > 0 ? requested : Object.keys(ARCH_TARGETS);
  for (const arch of arches) {
    buildArch(arch);
  }
}

main();
