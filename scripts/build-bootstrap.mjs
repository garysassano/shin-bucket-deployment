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
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildEnvironmentSha256,
  collectBuildToolchainIdentity,
  collectSourceIdentity,
  directorySha256,
} from "./source-identity.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
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

function run(command, args, cwd = repoRoot, allowFailure = false) {
  const printable = [command, ...args].join(" ");
  console.log(`> ${printable}`);
  const result = spawnSync(command, args, { stdio: "inherit", cwd });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Command failed (${result.status}): ${printable}`);
  }
}

function output(command, args, encoding = "utf8", cwd = repoRoot) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: encoding === null ? undefined : encoding,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${String(result.stderr ?? "").trim()}`);
  }
  return encoding === null ? Buffer.from(result.stdout) : result.stdout.trim();
}

function toolIdentity(root) {
  return {
    ...collectBuildToolchainIdentity(root),
    buildEnvironmentSha256: buildEnvironmentSha256(),
  };
}

function buildArch(
  arch,
  sourceRoot = repoRoot,
  applicationBuildSha256 = undefined,
  excludedPaths = [],
) {
  const config = ARCH_TARGETS[arch];
  if (!config) {
    throw new Error(
      `Unknown architecture: ${arch}. Expected one of ${Object.keys(ARCH_TARGETS).join(", ")}`,
    );
  }

  const sourceBefore = collectSourceIdentity(sourceRoot, excludedPaths);
  const toolsBefore = toolIdentity(sourceRoot);
  const manifestPath = join(sourceRoot, "rust", "Cargo.toml");

  run(
    "cargo",
    [
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
      join(sourceRoot, "rust", "target", "lambda-packages", arch),
    ],
    sourceRoot,
  );

  const builtArchive = join(
    sourceRoot,
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

  const sourceAfter = collectSourceIdentity(sourceRoot, excludedPaths);
  const toolsAfter = toolIdentity(sourceRoot);
  if (JSON.stringify(sourceAfter) !== JSON.stringify(sourceBefore)) {
    throw new Error("Source identity changed while building the provider bootstrap.");
  }
  if (JSON.stringify(toolsAfter) !== JSON.stringify(toolsBefore)) {
    throw new Error("Provider build toolchain changed while building the bootstrap.");
  }

  const outDir = join(repoRoot, "assets", `bootstrap-${config.lambdaDir}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "bootstrap.zip");
  copyFileSync(builtArchive, outFile);
  const archive = readFileSync(outFile);
  const bootstrap = output("unzip", ["-p", outFile, "bootstrap"], null, sourceRoot);
  const provenance = {
    schemaVersion: 1,
    architecture: arch,
    binaryName,
    target: config.target,
    sourceCommit: sourceBefore.commit,
    sourceDirty: sourceBefore.dirty,
    sourceTreeSha256: sourceBefore.sourceTreeSha256,
    applicationBuildSha256,
    ...toolsBefore,
    bootstrapSha256: createHash("sha256").update(bootstrap).digest("hex"),
    bootstrapArchiveSha256: createHash("sha256").update(archive).digest("hex"),
  };
  writeFileSync(join(outDir, "build-provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(`Staged ${arch} bootstrap archive -> ${outFile}`);
}

function main() {
  const benchmarkBuild = process.argv.includes("--benchmark");
  const evidenceOutputIndex = process.argv.indexOf("--evidence-output");
  const evidenceOutput =
    evidenceOutputIndex === -1 ? "benchmarks/results.jsonl" : process.argv[evidenceOutputIndex + 1];
  if (evidenceOutputIndex !== -1 && !evidenceOutput) {
    throw new Error("--evidence-output requires a path.");
  }
  const requested = process.argv
    .slice(2)
    .filter(
      (argument, index, args) =>
        argument !== "--benchmark" &&
        argument !== "--evidence-output" &&
        args[index - 1] !== "--evidence-output",
    );
  const arches = requested.length > 0 ? requested : Object.keys(ARCH_TARGETS);
  if (!benchmarkBuild) {
    for (const arch of arches) buildArch(arch);
    return;
  }
  if (arches.length !== 1 || arches[0] !== "arm64") {
    throw new Error("Benchmark builds must request exactly the arm64 provider.");
  }
  const evidenceRelative = relative(repoRoot, resolve(repoRoot, evidenceOutput));
  const excludedPaths =
    evidenceRelative !== "" &&
    evidenceRelative !== ".." &&
    !evidenceRelative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(evidenceRelative)
      ? [evidenceRelative]
      : [];
  const source = collectSourceIdentity(repoRoot, excludedPaths);
  if (source.dirty) {
    throw new Error("Methodology-v2 provider builds require a clean source tree.");
  }
  const scratch = mkdtempSync(join(tmpdir(), "shin-benchmark-provider-build-"));
  const worktree = join(scratch, "source");
  try {
    run("git", ["worktree", "add", "--detach", worktree, source.commit], repoRoot);
    const detached = collectSourceIdentity(worktree, excludedPaths);
    if (detached.dirty || detached.commit !== source.commit) {
      throw new Error("Detached benchmark build source does not match the approved clean commit.");
    }
    symlinkSync(join(repoRoot, "node_modules"), join(worktree, "node_modules"), "dir");
    run(join(repoRoot, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.build.json"], worktree);
    const applicationBuildSha256 = directorySha256(join(worktree, "dist"));
    if (
      !existsSync(join(repoRoot, "dist")) ||
      directorySha256(join(repoRoot, "dist")) !== applicationBuildSha256
    ) {
      throw new Error(
        "Current benchmark application build does not match the clean source commit.",
      );
    }
    buildArch("arm64", worktree, applicationBuildSha256, excludedPaths);
    if (JSON.stringify(collectSourceIdentity(repoRoot, excludedPaths)) !== JSON.stringify(source)) {
      throw new Error("Repository source identity changed during the detached benchmark build.");
    }
  } finally {
    run("git", ["worktree", "remove", "--force", worktree], repoRoot, true);
    rmSync(scratch, { recursive: true, force: true });
  }
}

main();
