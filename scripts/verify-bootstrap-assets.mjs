#!/usr/bin/env node

import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ARCHITECTURES = ["arm64", "x86_64"];
const REQUIRED_FILES = ["bootstrap.zip", "build-provenance.json"];

export function assertBootstrapAssetsPresent(repositoryRoot) {
  const missing = REQUIRED_ARCHITECTURES.flatMap((architecture) =>
    REQUIRED_FILES.map((file) => `assets/bootstrap-${architecture}/${file}`).filter((path) => {
      const absolutePath = resolve(repositoryRoot, path);
      return !existsSync(absolutePath) || !statSync(absolutePath).isFile();
    }),
  );
  if (missing.length === 0) return;

  throw new Error(
    `Required provider bootstrap assets are missing:\n${missing.map((path) => `- ${path}`).join("\n")}\n` +
      `Run \`pnpm build:bootstrap\` to build both architectures before running the full check.`,
  );
}

function main() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  assertBootstrapAssetsPresent(repositoryRoot);
  console.log("Verified required provider bootstrap assets are present.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
