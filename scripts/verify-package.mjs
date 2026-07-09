#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packageName = "shin-bucket-deployment";
const requiredFiles = [
  "package/lib/index.js",
  "package/lib/index.d.ts",
  "package/lib/shin-bucket-deployment.js",
  "package/lib/shin-bucket-deployment.d.ts",
  "package/assets/bootstrap-arm64/bootstrap",
  "package/assets/bootstrap-x86_64/bootstrap",
  "package/README.md",
  "package/LICENSE",
  "package/package.json",
];
const forbiddenTarballPrefixes = [
  "package/benchmarks/",
  "package/docs/",
  "package/rust/",
  "package/scenarios/",
  "package/src/",
  "package/test/",
];
const forbiddenDeclarationPatterns = [/cargo-lambda-cdk/, /aws-cdk-lib\/core\/lib/];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(" ")}\n${output}`);
  }

  return result.stdout;
}

function walkFiles(root) {
  const entries = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walkFiles(path));
    } else {
      entries.push(path);
    }
  }
  return entries;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyDeclarations() {
  const declarationFiles = walkFiles(join(repoRoot, "lib")).filter((file) => file.endsWith(".d.ts"));
  assert(declarationFiles.length > 0, "No package declaration files were emitted.");

  for (const file of declarationFiles) {
    const contents = readFileSync(file, "utf8");
    for (const pattern of forbiddenDeclarationPatterns) {
      assert(!pattern.test(contents), `${file} contains forbidden reference ${pattern}`);
    }
    assert(!contents.includes("sourceMappingURL"), `${file} references an unpublished source map.`);
  }

  for (const file of walkFiles(join(repoRoot, "lib")).filter((entry) => entry.endsWith(".js"))) {
    const contents = readFileSync(file, "utf8");
    assert(!contents.includes("sourceMappingURL"), `${file} references an unpublished source map.`);
  }
}

function packTarball(workDir) {
  const packDir = join(workDir, "pack");
  mkdirSync(packDir, { recursive: true });
  const output = run("npm", ["pack", "--pack-destination", packDir], { capture: true });
  const tarballs = readdirSync(packDir).filter((entry) => entry.endsWith(".tgz"));
  assert(tarballs.length === 1, `Expected one packed tarball, found ${tarballs.length}.\n${output}`);
  return join(packDir, tarballs[0]);
}

function verifyTarball(tarball, workDir) {
  const listing = run("tar", ["-tf", tarball], { capture: true })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const requiredFile of requiredFiles) {
    assert(listing.includes(requiredFile), `Packed tarball is missing ${requiredFile}.`);
  }

  for (const entry of listing) {
    assert(!entry.endsWith(".map"), `Packed tarball includes source map ${entry}.`);
    for (const prefix of forbiddenTarballPrefixes) {
      assert(!entry.startsWith(prefix), `Packed tarball includes forbidden path ${entry}.`);
    }
  }

  const extractDir = join(workDir, "extract");
  mkdirSync(extractDir, { recursive: true });
  run("tar", ["-xzf", tarball, "-C", extractDir]);

  for (const arch of ["arm64", "x86_64"]) {
    const bootstrap = join(extractDir, "package", "assets", `bootstrap-${arch}`, "bootstrap");
    assert(existsSync(bootstrap), `Missing ${arch} bootstrap in extracted tarball.`);
    assert((statSync(bootstrap).mode & 0o111) !== 0, `${arch} bootstrap is not executable.`);
  }

  const packedPackageJson = JSON.parse(
    readFileSync(join(extractDir, "package", "package.json"), "utf8"),
  );
  assert(
    packedPackageJson.repository.url.includes("github.com/garysassano/shin-bucket-deployment"),
    "Packed package metadata does not point at the current repository.",
  );
  assert(packedPackageJson.engines.node === ">=22.0.0", "Packed package has wrong Node engine.");
}

function verifyConsumerInstall(tarball, workDir) {
  const consumerDir = join(workDir, "consumer");
  mkdirSync(consumerDir, { recursive: true });
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify({ private: true, type: "commonjs" }, null, 2),
  );

  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball,
      "aws-cdk-lib@2.257.0",
      "constructs@10.6.0",
      "typescript@6.0.3",
    ],
    { cwd: consumerDir },
  );

  assert(
    !existsSync(join(consumerDir, "node_modules", "cargo-lambda-cdk")),
    "Consumer install unexpectedly installed cargo-lambda-cdk.",
  );

  writeFileSync(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "commonjs",
          moduleResolution: "node",
          ignoreDeprecations: "6.0",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ["index.ts"],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(consumerDir, "index.ts"),
    [
      'import { App, Stack } from "aws-cdk-lib";',
      'import { Bucket } from "aws-cdk-lib/aws-s3";',
      `import { ShinBucketDeployment, Source } from "${packageName}";`,
      "",
      "const app = new App();",
      'const stack = new Stack(app, "ConsumerStack");',
      'const bucket = new Bucket(stack, "Bucket");',
      'new ShinBucketDeployment(stack, "Deploy", {',
      '  sources: [Source.data("index.html", "ok")],',
      "  destinationBucket: bucket,",
      "});",
      "app.synth();",
      "",
    ].join("\n"),
  );
  run("npx", ["tsc", "--noEmit"], { cwd: consumerDir });

  writeFileSync(
    join(consumerDir, "synth.cjs"),
    [
      'const { App, Stack } = require("aws-cdk-lib");',
      'const { Bucket } = require("aws-cdk-lib/aws-s3");',
      `const { ShinBucketDeployment, Source } = require("${packageName}");`,
      "",
      "const app = new App();",
      'const stack = new Stack(app, "ConsumerStack");',
      'const bucket = new Bucket(stack, "Bucket");',
      'new ShinBucketDeployment(stack, "Deploy", {',
      '  sources: [Source.data("index.html", "ok")],',
      "  destinationBucket: bucket,",
      "});",
      "app.synth();",
      "",
    ].join("\n"),
  );
  run("node", ["synth.cjs"], { cwd: consumerDir });
}

function main() {
  const workDir = mkdtempSync(join(tmpdir(), "shin-package-"));
  try {
    chmodSync(join(repoRoot, "assets", "bootstrap-arm64", "bootstrap"), 0o755);
    chmodSync(join(repoRoot, "assets", "bootstrap-x86_64", "bootstrap"), 0o755);
    run("pnpm", ["build:package"]);
    verifyDeclarations();
    const tarball = packTarball(workDir);
    verifyTarball(tarball, workDir);
    verifyConsumerInstall(tarball, workDir);
    console.log(`Verified ${packageName} package smoke test.`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
