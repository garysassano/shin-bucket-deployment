#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(__dirname, "..");
const baselineRef = optionValue("--baseline-ref") ?? mergeBase();
const assembliesOnly = process.argv.includes("--assemblies-only");
const scratchRoot = mkdtempSync(join(tmpdir(), "shin-typescript-contract-"));
const baselineRoot = join(scratchRoot, "baseline");
const createdCurrentArchives = [];

try {
  run("git", ["worktree", "add", "--detach", baselineRoot, baselineRef], repositoryRoot);
  run("pnpm", ["install", "--offline", "--frozen-lockfile"], baselineRoot);
  prepareBootstrapArchives(baselineRoot);
  prepareBootstrapArchives(repositoryRoot);

  buildContract(baselineRoot);
  buildContract(repositoryRoot);

  const verificationTemplateCount = compareAssemblyTrees(".verification-assets/cdk.out");
  const benchmarkTemplateCount = compareAssemblyTrees(".benchmark-assets/cdk.out");
  if (assembliesOnly) {
    console.log(
      `Synthesis contract matches ${baselineRef}: ${verificationTemplateCount} verification templates, ` +
        `${benchmarkTemplateCount} benchmark templates.`,
    );
  } else {
    const declarationCount = comparePublicDeclarations();
    await compareRuntimeExports();
    comparePackageEntrypoints();
    console.log(
      `TypeScript refactor contract matches ${baselineRef}: ${declarationCount} declarations, ` +
        `${verificationTemplateCount} verification templates, ${benchmarkTemplateCount} benchmark templates.`,
    );
  }
} finally {
  run("git", ["worktree", "remove", "--force", baselineRoot], repositoryRoot, true);
  rmSync(scratchRoot, { recursive: true, force: true });
  for (const archive of createdCurrentArchives) {
    rmSync(archive, { force: true });
  }
}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function mergeBase() {
  const candidates = ["origin/main", "main"];
  for (const candidate of candidates) {
    const result = spawnSync("git", ["merge-base", candidate, "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    if (result.status === 0) {
      return result.stdout.trim();
    }
  }
  throw new Error("Unable to determine the refactor baseline. Pass --baseline-ref explicitly.");
}

function run(command, args, cwd, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      CI: "true",
      CDK_DEFAULT_ACCOUNT: "111111111111",
      CDK_DEFAULT_REGION: "eu-central-1",
    },
    encoding: "utf8",
    stdio: allowFailure ? "pipe" : "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
  }
  return result;
}

function prepareBootstrapArchives(root) {
  for (const architecture of ["arm64", "x86_64"]) {
    const relativeArchive = join("assets", `bootstrap-${architecture}`, "bootstrap.zip");
    const currentArchive = join(repositoryRoot, relativeArchive);
    const archive = join(root, relativeArchive);
    if (existsSync(archive)) {
      continue;
    }
    mkdirSync(dirname(archive), { recursive: true });
    writeFileSync(
      archive,
      existsSync(currentArchive)
        ? readFileSync(currentArchive)
        : Buffer.from(`typescript refactor contract bootstrap ${architecture}\n`),
    );
    if (root === repositoryRoot) {
      createdCurrentArchives.push(archive);
    }
  }
}

function buildContract(root) {
  for (const generated of ["dist", "lib", ".verification-assets", ".benchmark-assets"]) {
    rmSync(join(root, generated), { recursive: true, force: true });
  }
  run("pnpm", ["build"], root);
  run("pnpm", ["build:package"], root);
  run("pnpm", ["verify", "synth"], root);
  run("pnpm", ["benchmark:synth"], root);
}

function comparePublicDeclarations() {
  const baselineDeclarations = walk(join(baselineRoot, "lib"), (path) => path.endsWith(".d.ts"));
  const publicPaths = [
    "cataloged-source.d.ts",
    "errors.d.ts",
    "index.d.ts",
    "shin-bucket-deployment.d.ts",
  ];
  const baselinePaths = baselineDeclarations
    .map((path) => relative(join(baselineRoot, "lib"), path))
    .sort();
  compareValue("baseline public declaration set", publicPaths, baselinePaths);
  for (const relativePath of publicPaths) {
    const baselineFile = join(baselineRoot, "lib", relativePath);
    const currentFile = join(repositoryRoot, "lib", relativePath);
    if (!existsSync(currentFile)) {
      throw new Error(`Current package is missing baseline declaration ${relativePath}.`);
    }
    compareBytes(`declaration ${relativePath}`, baselineFile, currentFile);
  }
  return publicPaths.length;
}

function compareAssemblyTrees(relativeRoot) {
  const baselineDirectory = join(baselineRoot, relativeRoot);
  const currentDirectory = join(repositoryRoot, relativeRoot);
  const include = (path) => {
    const name = basename(path);
    return (
      path.endsWith(".template.json") ||
      path.endsWith(".assets.json") ||
      name === "manifest.json" ||
      name === "tree.json"
    );
  };
  const baselinePaths = walk(baselineDirectory, include)
    .map((path) => relative(baselineDirectory, path))
    .sort();
  const currentPaths = walk(currentDirectory, include)
    .map((path) => relative(currentDirectory, path))
    .sort();
  compareValue(`${relativeRoot} assembly contract file set`, baselinePaths, currentPaths);
  const templateCount = baselinePaths.filter((path) => path.endsWith(".template.json")).length;
  if (templateCount === 0) {
    throw new Error(`${relativeRoot} emitted no templates.`);
  }
  for (const path of baselinePaths) {
    compareValue(
      `${relativeRoot}/${path}`,
      JSON.parse(readFileSync(join(baselineDirectory, path), "utf8")),
      JSON.parse(readFileSync(join(currentDirectory, path), "utf8")),
    );
  }
  return templateCount;
}

async function compareRuntimeExports() {
  const baselineCommonJs = Object.keys(
    await importCommonJs(join(baselineRoot, "lib", "index.js")),
  ).sort();
  const currentCommonJs = Object.keys(
    await importCommonJs(join(repositoryRoot, "lib", "index.js")),
  ).sort();
  compareValue("CommonJS runtime exports", baselineCommonJs, currentCommonJs);

  const baselineEsm = Object.keys(
    await import(pathToFileURL(join(baselineRoot, "lib", "index.js"))),
  ).sort();
  const currentEsm = Object.keys(
    await import(pathToFileURL(join(repositoryRoot, "lib", "index.js"))),
  ).sort();
  compareValue("ESM runtime exports", baselineEsm, currentEsm);
}

async function importCommonJs(path) {
  const namespace = await import(pathToFileURL(path));
  return namespace.default ?? namespace;
}

function comparePackageEntrypoints() {
  const baseline = JSON.parse(readFileSync(join(baselineRoot, "package.json"), "utf8"));
  const current = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
  compareValue(
    "package entrypoints",
    {
      main: baseline.main,
      types: baseline.types,
      exports: baseline.exports,
      engines: baseline.engines,
    },
    {
      main: current.main,
      types: current.types,
      exports: current.exports,
      engines: current.engines,
    },
  );
}

function walk(root, include) {
  if (!existsSync(root)) {
    throw new Error(`Expected generated directory does not exist: ${root}`);
  }
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path, include));
    } else if (include(path)) {
      files.push(path);
    }
  }
  return files.sort();
}

function compareBytes(label, baselinePath, currentPath) {
  if (!readFileSync(baselinePath).equals(readFileSync(currentPath))) {
    throw new Error(`${label} differs from baseline.`);
  }
}

function compareValue(label, baseline, current) {
  if (JSON.stringify(baseline) !== JSON.stringify(current)) {
    throw new Error(`${label} differs from baseline.`);
  }
}
