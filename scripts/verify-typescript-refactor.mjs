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
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(__dirname, "..");
// Module scope: prepareBootstrapArchives() records fallback archives it creates so
// the caller can delete them, and that helper is not nested inside main().
const createdCurrentArchives = [];

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}

async function main() {
  const baselineRef = optionValue("--baseline-ref") ?? mergeBase();
  const assembliesOnly = process.argv.includes("--assemblies-only");
  const expectChangesPath = optionValue("--expect-changes");
  const scratchRoot = mkdtempSync(join(tmpdir(), "shin-typescript-contract-"));
  const baselineRoot = join(scratchRoot, "baseline");

  try {
    run("git", ["worktree", "add", "--detach", baselineRoot, baselineRef], repositoryRoot);
    run("pnpm", ["install", "--offline", "--frozen-lockfile"], baselineRoot);
    prepareBootstrapArchives(baselineRoot);
    prepareBootstrapArchives(repositoryRoot);

    buildContract(baselineRoot);
    buildContract(repositoryRoot);

    const verification = compareAssemblyTrees(".verification-assets/cdk.out");
    const benchmark = compareAssemblyTrees(".benchmark-assets/cdk.out");
    const assemblyDifferences = [...verification.differences, ...benchmark.differences];
    const expectedChanges =
      expectChangesPath === undefined ? undefined : loadExpectedChanges(expectChangesPath);
    evaluateSynthesisContract(assemblyDifferences, expectedChanges);

    if (assembliesOnly) {
      console.log(
        `Synthesis contract matches ${baselineRef}: ${verification.templateCount} verification templates, ` +
          `${benchmark.templateCount} benchmark templates.`,
      );
    } else {
      const declarationCount = comparePublicDeclarations();
      await compareRuntimeExports();
      comparePackageEntrypoints();
      console.log(
        `TypeScript refactor contract matches ${baselineRef}: ${declarationCount} declarations, ` +
          `${verification.templateCount} verification templates, ${benchmark.templateCount} benchmark templates.`,
      );
    }
  } finally {
    run("git", ["worktree", "remove", "--force", baselineRoot], repositoryRoot, true);
    rmSync(scratchRoot, { recursive: true, force: true });
    for (const archive of createdCurrentArchives) {
      rmSync(archive, { force: true });
    }
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

/**
 * Stages a bootstrap archive for each architecture under `root`, recording any
 * fallback it creates under the current repository so the caller can delete it.
 *
 * `created` and `repoRoot` are parameters rather than closed-over module state
 * because this helper is not nested inside `main()`. When the tracking array
 * was declared inside `main()`, this function threw
 * `ReferenceError: createdCurrentArchives is not defined` -- but only in a
 * checkout without prebuilt archives, since the loop skips an architecture whose
 * archive already exists and CI always has both from the Bootstrap jobs.
 */
export function prepareBootstrapArchives(
  root,
  created = createdCurrentArchives,
  repoRoot = repositoryRoot,
) {
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
    if (root === repoRoot) {
      created.push(archive);
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
  const baselinePaths = publicDeclarationPaths(baselineRoot);
  const currentPaths = publicDeclarationPaths(repositoryRoot);
  compareValue("public declaration set", baselinePaths, currentPaths);
  for (const relativePath of baselinePaths) {
    const baselineFile = join(baselineRoot, "lib", relativePath);
    const currentFile = join(repositoryRoot, "lib", relativePath);
    compareBytes(`declaration ${relativePath}`, baselineFile, currentFile);
  }
  return baselinePaths.length;
}

function publicDeclarationPaths(root) {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (!Array.isArray(manifest.files)) {
    throw new Error("package.json files must be an array for declaration contract verification.");
  }
  const explicit = new Set(
    manifest.files
      .filter(
        (path) => typeof path === "string" && path.startsWith("lib/") && path.endsWith(".d.ts"),
      )
      .map((path) => path.slice("lib/".length)),
  );
  const includesAllDeclarations = manifest.files.some(
    (path) => typeof path === "string" && path === "lib/**/*.d.ts",
  );
  if (includesAllDeclarations) {
    for (const path of walk(join(root, "lib"), (path) => path.endsWith(".d.ts"))) {
      explicit.add(relative(join(root, "lib"), path));
    }
  }
  if (explicit.size === 0) {
    throw new Error("package.json files publishes no TypeScript declarations.");
  }
  for (const relativePath of explicit) {
    if (!existsSync(join(root, "lib", relativePath))) {
      throw new Error(`Published declaration does not exist: lib/${relativePath}.`);
    }
  }
  return [...explicit].sort();
}

function compareAssemblyTrees(relativeRoot) {
  const baselineDirectory = join(baselineRoot, relativeRoot);
  const currentDirectory = join(repositoryRoot, relativeRoot);
  const differences = collectAssemblyDifferences(baselineDirectory, currentDirectory, relativeRoot);
  const templateCount = walk(baselineDirectory, (path) => path.endsWith(".template.json")).length;
  if (templateCount === 0) {
    throw new Error(`${relativeRoot} emitted no templates.`);
  }
  return { differences, templateCount };
}

export function collectAssemblyDifferences(baselineDirectory, currentDirectory, relativeRoot) {
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
  const paths = [...new Set([...baselinePaths, ...currentPaths])].sort();
  const differences = [];
  for (const path of paths) {
    const baselineFile = join(baselineDirectory, path);
    const currentFile = join(currentDirectory, path);
    const baselineExists = existsSync(baselineFile);
    const currentExists = existsSync(currentFile);
    const label = `${relativeRoot}/${path}`;
    if (!baselineExists) {
      differences.push({ label, detail: "added" });
    } else if (!currentExists) {
      differences.push({ label, detail: "removed" });
    } else if (!sameJson(baselineFile, currentFile)) {
      differences.push({ label, detail: "contents differ" });
    }
  }
  return differences;
}

function loadExpectedChanges(relativePath) {
  const manifestPath = resolve(repositoryRoot, relativePath);
  if (!existsSync(manifestPath)) {
    throw new Error(`--expect-changes manifest does not exist: ${relativePath}`);
  }
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      `--expect-changes manifest is not valid JSON: ${relativePath} (${error.message})`,
    );
  }
}

export function evaluateSynthesisContract(differences, expectedChanges) {
  if (expectedChanges === undefined) {
    if (differences.length === 0) {
      return;
    }
    throw new Error(
      `${formatAssemblyDifferences(differences)}\n` +
        "Acknowledge intentional synthesis changes in contract/expected-synthesis-changes.json " +
        "and pass --expect-changes, or keep the synthesis byte-identical.",
    );
  }
  const problems = [];
  if (
    expectedChanges === null ||
    typeof expectedChanges !== "object" ||
    Array.isArray(expectedChanges)
  ) {
    throw new Error(
      "Expected synthesis changes manifest must be a JSON object mapping each changed label " +
        "to a non-empty reason string.",
    );
  }
  for (const [label, reason] of Object.entries(expectedChanges)) {
    if (typeof reason !== "string" || reason.trim() === "") {
      problems.push(`${label}: reason must be a non-empty string`);
    }
  }
  const observed = new Set(differences.map(({ label }) => label));
  const expected = new Set(Object.keys(expectedChanges));
  for (const difference of differences) {
    if (!expected.has(difference.label)) {
      problems.push(
        `${difference.label}: changed but not listed in the expected changes manifest (${difference.detail})`,
      );
    }
  }
  for (const label of expected) {
    if (!observed.has(label)) {
      problems.push(`${label}: listed in the expected changes manifest but did not change`);
    }
  }
  if (problems.length > 0) {
    throw new Error(
      "Expected synthesis changes do not match observed changes:\n" +
        problems.map((problem) => `  - ${problem}`).join("\n"),
    );
  }
}

function formatAssemblyDifferences(differences) {
  return (
    `Synthesis differs from baseline in ${differences.length} place(s):\n` +
    differences.map(({ label, detail }) => `  - ${label} (${detail})`).join("\n")
  );
}

function sameJson(baselinePath, currentPath) {
  return (
    JSON.stringify(JSON.parse(readFileSync(baselinePath, "utf8"))) ===
    JSON.stringify(JSON.parse(readFileSync(currentPath, "utf8")))
  );
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
