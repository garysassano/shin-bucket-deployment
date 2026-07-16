#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const packageName = "shin-bucket-deployment";
const expectedLibraryFiles = [
  "package/lib/cataloged-source.d.ts",
  "package/lib/cataloged-source.js",
  "package/lib/destination.js",
  "package/lib/errors.d.ts",
  "package/lib/errors.js",
  "package/lib/iam.js",
  "package/lib/index.d.ts",
  "package/lib/index.js",
  "package/lib/provider.js",
  "package/lib/shin-bucket-deployment.d.ts",
  "package/lib/shin-bucket-deployment.js",
  "package/lib/source-config.js",
  "package/lib/stable-json.js",
  "package/lib/validation.js",
].sort();
const requiredFiles = [
  ...expectedLibraryFiles,
  "package/assets/bootstrap-arm64/bootstrap.zip",
  "package/assets/bootstrap-arm64/build-provenance.json",
  "package/assets/bootstrap-x86_64/bootstrap.zip",
  "package/assets/bootstrap-x86_64/build-provenance.json",
  "package/README.md",
  "package/LICENSE",
  "package/package.json",
];
const forbiddenTarballPrefixes = [
  "package/benchmarks/",
  "package/docs/",
  "package/lib/trusted-source-catalog",
  "package/rust/",
  "package/scenarios/",
  "package/src/",
  "package/test/",
];
const forbiddenDeclarationPatterns = [/cargo-lambda-cdk/, /aws-cdk-lib\/core\/lib/];
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ELF_MACHINE_BY_ARCH = {
  arm64: 183,
  x86_64: 62,
};
const TARGET_BY_ARCH = {
  arm64: "aarch64-unknown-linux-gnu",
  x86_64: "x86_64-unknown-linux-gnu",
};
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

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

function parseOptions(args) {
  let packDestination;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--pack-destination") {
      const value = args[index + 1];
      assert(value, "--pack-destination requires a directory path.");
      assert(packDestination === undefined, "--pack-destination may only be specified once.");
      packDestination = resolve(value);
      index++;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return { packDestination };
}

function verifyDeclarations() {
  const declarationFiles = walkFiles(join(repoRoot, "lib")).filter((file) =>
    file.endsWith(".d.ts"),
  );
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

function packTarball(workDir, requestedPackDir) {
  const packDir = requestedPackDir ?? join(workDir, "pack");
  assert(
    !existsSync(packDir) || readdirSync(packDir).length === 0,
    `Pack destination must be empty: ${packDir}`,
  );
  mkdirSync(packDir, { recursive: true });
  const output = run("npm", ["pack", "--pack-destination", packDir], { capture: true });
  const tarballs = readdirSync(packDir).filter((entry) => entry.endsWith(".tgz"));
  assert(
    tarballs.length === 1,
    `Expected one packed tarball, found ${tarballs.length}.\n${output}`,
  );
  return join(packDir, tarballs[0]);
}

function findEndOfCentralDirectory(archive) {
  assert(archive.length >= 22, "Bootstrap archive is too short to be a ZIP file.");
  const minimumOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimumOffset; offset--) {
    if (archive.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }
  throw new Error("Bootstrap archive is missing its ZIP end-of-central-directory record.");
}

function readBootstrapEntry(archivePath, arch) {
  const archive = readFileSync(archivePath);
  const eocdOffset = findEndOfCentralDirectory(archive);
  assert(archive.readUInt16LE(eocdOffset + 4) === 0, `${arch} archive is split across disks.`);
  assert(archive.readUInt16LE(eocdOffset + 6) === 0, `${arch} archive is split across disks.`);
  const entriesOnDisk = archive.readUInt16LE(eocdOffset + 8);
  const entryCount = archive.readUInt16LE(eocdOffset + 10);
  assert(entriesOnDisk === entryCount, `${arch} archive has an inconsistent entry count.`);
  assert(entryCount === 1, `${arch} archive must contain exactly one entry, found ${entryCount}.`);

  const centralSize = archive.readUInt32LE(eocdOffset + 12);
  const centralOffset = archive.readUInt32LE(eocdOffset + 16);
  assert(
    centralOffset + centralSize <= eocdOffset,
    `${arch} archive central directory extends beyond its declared boundary.`,
  );
  assert(
    archive.readUInt32LE(centralOffset) === ZIP_CENTRAL_DIRECTORY_SIGNATURE,
    `${arch} archive has an invalid central-directory record.`,
  );

  const versionMadeBy = archive.readUInt16LE(centralOffset + 4);
  assert(versionMadeBy >>> 8 === 3, `${arch} archive entry was not created with Unix attributes.`);
  const flags = archive.readUInt16LE(centralOffset + 8);
  assert((flags & 1) === 0, `${arch} bootstrap archive must not be encrypted.`);
  const compressionMethod = archive.readUInt16LE(centralOffset + 10);
  const expectedCrc = archive.readUInt32LE(centralOffset + 16);
  const compressedSize = archive.readUInt32LE(centralOffset + 20);
  const uncompressedSize = archive.readUInt32LE(centralOffset + 24);
  const fileNameLength = archive.readUInt16LE(centralOffset + 28);
  const extraLength = archive.readUInt16LE(centralOffset + 30);
  const commentLength = archive.readUInt16LE(centralOffset + 32);
  const externalAttributes = archive.readUInt32LE(centralOffset + 38);
  const localHeaderOffset = archive.readUInt32LE(centralOffset + 42);
  const entryName = archive
    .subarray(centralOffset + 46, centralOffset + 46 + fileNameLength)
    .toString("utf8");

  assert(
    entryName === "bootstrap",
    `${arch} archive entry must be named bootstrap, got ${entryName}.`,
  );
  assert(extraLength === 0, `${arch} archive central entry contains unexpected extra data.`);
  assert(commentLength === 0, `${arch} archive central entry contains an unexpected comment.`);

  const unixMode = externalAttributes >>> 16;
  assert((unixMode & 0o170000) === 0o100000, `${arch} bootstrap is not a regular file.`);
  assert((unixMode & 0o100) !== 0, `${arch} bootstrap is not owner-executable.`);
  assert(
    archive.readUInt32LE(localHeaderOffset) === ZIP_LOCAL_FILE_HEADER_SIGNATURE,
    `${arch} archive has an invalid local-file header.`,
  );

  const localFlags = archive.readUInt16LE(localHeaderOffset + 6);
  const localCompressionMethod = archive.readUInt16LE(localHeaderOffset + 8);
  const localNameLength = archive.readUInt16LE(localHeaderOffset + 26);
  const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
  const localEntryName = archive
    .subarray(localHeaderOffset + 30, localHeaderOffset + 30 + localNameLength)
    .toString("utf8");
  assert(localFlags === flags, `${arch} archive has inconsistent ZIP flags.`);
  assert(
    localCompressionMethod === compressionMethod,
    `${arch} archive has inconsistent compression methods.`,
  );
  assert(localEntryName === entryName, `${arch} archive has inconsistent entry names.`);
  const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
  const compressed = archive.subarray(dataOffset, dataOffset + compressedSize);
  let bootstrap;
  if (compressionMethod === 0) {
    bootstrap = compressed;
  } else if (compressionMethod === 8) {
    bootstrap = inflateRawSync(compressed);
  } else {
    throw new Error(`${arch} bootstrap uses unsupported ZIP compression ${compressionMethod}.`);
  }

  assert(
    bootstrap.length === uncompressedSize,
    `${arch} bootstrap size mismatch: expected ${uncompressedSize}, got ${bootstrap.length}.`,
  );
  assert(crc32(bootstrap) === expectedCrc, `${arch} bootstrap failed its ZIP CRC check.`);
  assert(
    bootstrap.length >= 20 &&
      bootstrap.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])),
    `${arch} bootstrap is not an ELF binary.`,
  );
  assert(bootstrap[4] === 2, `${arch} bootstrap is not a 64-bit ELF binary.`);
  assert(bootstrap[5] === 1, `${arch} bootstrap is not little-endian.`);
  assert(
    bootstrap.readUInt16LE(18) === ELF_MACHINE_BY_ARCH[arch],
    `${arch} bootstrap has ELF machine ${bootstrap.readUInt16LE(18)}; expected ${ELF_MACHINE_BY_ARCH[arch]}.`,
  );

  return bootstrap;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function verifyBootstrapProvenance(archivePath, provenancePath, arch) {
  assert(existsSync(archivePath), `Missing ${arch} bootstrap archive.`);
  assert(existsSync(provenancePath), `Missing ${arch} bootstrap build provenance.`);

  const bootstrap = readBootstrapEntry(archivePath, arch);
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
  assert(provenance.schemaVersion === 1, `${arch} provenance has an unsupported schema.`);
  assert(provenance.architecture === arch, `${arch} provenance has the wrong architecture.`);
  assert(
    provenance.binaryName === "shin-bucket-deployment-handler",
    `${arch} provenance has the wrong binary name.`,
  );
  assert(provenance.target === TARGET_BY_ARCH[arch], `${arch} provenance has the wrong target.`);
  assert(
    SHA256_PATTERN.test(provenance.sourceTreeSha256),
    `${arch} provenance has an invalid source-tree digest.`,
  );
  assert(
    SHA256_PATTERN.test(provenance.buildToolchainSha256),
    `${arch} provenance has an invalid toolchain digest.`,
  );
  assert(
    SHA256_PATTERN.test(provenance.buildEnvironmentSha256),
    `${arch} provenance has an invalid build-environment digest.`,
  );
  assert(
    provenance.bootstrapArchiveSha256 === sha256File(archivePath),
    `${arch} provenance does not match the packaged bootstrap archive.`,
  );
  assert(
    provenance.bootstrapSha256 === createHash("sha256").update(bootstrap).digest("hex"),
    `${arch} provenance does not match the packaged bootstrap binary.`,
  );
}

function verifyTarball(tarball, workDir) {
  const listing = run("tar", ["-tf", tarball], { capture: true })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const requiredFile of requiredFiles) {
    assert(listing.includes(requiredFile), `Packed tarball is missing ${requiredFile}.`);
  }

  const libraryFiles = listing
    .filter((entry) => entry.startsWith("package/lib/") && !entry.endsWith("/"))
    .sort();
  assert(
    JSON.stringify(libraryFiles) === JSON.stringify(expectedLibraryFiles),
    `Packed library file set differs from the allowlist.\n${libraryFiles.join("\n")}`,
  );

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
    const bootstrapDir = join(extractDir, "package", "assets", `bootstrap-${arch}`);
    verifyBootstrapProvenance(
      join(bootstrapDir, "bootstrap.zip"),
      join(bootstrapDir, "build-provenance.json"),
      arch,
    );
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

function verifyStagedProviderArchive(consumerDir, assemblyDir) {
  const manifest = JSON.parse(readFileSync(join(assemblyDir, "ConsumerStack.assets.json"), "utf8"));
  const fileAssets = Object.values(manifest.files ?? {}).filter(
    (asset) => asset.source?.packaging === "file",
  );
  const packagedArchive = join(
    consumerDir,
    "node_modules",
    packageName,
    "assets",
    "bootstrap-arm64",
    "bootstrap.zip",
  );
  const packagedDigest = sha256File(packagedArchive);
  const matchingAssets = fileAssets.filter((asset) => {
    const stagedPath = asset.source?.path;
    return (
      typeof stagedPath === "string" &&
      existsSync(join(assemblyDir, stagedPath)) &&
      sha256File(join(assemblyDir, stagedPath)) === packagedDigest
    );
  });
  assert(
    matchingAssets.length === 1,
    `Expected one exact staged provider archive, found ${matchingAssets.length}.`,
  );
}

function verifyCatalogedConsumerAsset(assemblyDir) {
  const manifest = JSON.parse(readFileSync(join(assemblyDir, "ConsumerStack.assets.json"), "utf8"));
  const catalogAssets = Object.values(manifest.files ?? {}).filter((asset) => {
    const stagedPath = asset.source?.path;
    return (
      asset.source?.packaging === "zip" &&
      typeof stagedPath === "string" &&
      existsSync(join(assemblyDir, stagedPath, ".shin", "catalog.v1.json"))
    );
  });
  assert(
    catalogAssets.length === 1,
    `Expected one cataloged ZIP_DIRECTORY asset, found ${catalogAssets.length}.`,
  );
  const catalogAsset = catalogAssets[0];
  const stagedDirectory = join(assemblyDir, catalogAsset.source.path);
  assert(statSync(stagedDirectory).isDirectory(), "Cataloged asset was not staged as a directory.");
  const catalogBytes = readFileSync(join(stagedDirectory, ".shin", "catalog.v1.json"));
  const catalog = JSON.parse(catalogBytes.toString("utf8"));
  assert(catalog.version === 1, "Cataloged asset did not contain the authenticated v1 schema.");
  assert(
    catalog.entries.length === 1 &&
      catalog.entries[0].path === "index.html" &&
      catalog.entries[0].size === 2 &&
      catalog.entries[0].md5 === "444bcb3a3fcf8389296c49467f27e1d6",
    "Cataloged asset contained unexpected entry metadata.",
  );

  const template = JSON.parse(
    readFileSync(join(assemblyDir, "ConsumerStack.template.json"), "utf8"),
  );
  const deployment = Object.values(template.Resources ?? {}).find(
    (resource) => resource.Type === "AWS::CloudFormation::CustomResource",
  );
  assert(deployment, "Consumer template is missing the Shin custom resource.");
  const sourceCatalogs = deployment.Properties?.SourceCatalogs;
  assert(Array.isArray(sourceCatalogs), "Consumer template is missing SourceCatalogs.");
  assert(
    sourceCatalogs.length === deployment.Properties.SourceBucketNames.length,
    "SourceCatalogs is not aligned with the source arrays.",
  );
  assert(
    sourceCatalogs.length === 1 &&
      sourceCatalogs[0].Version === 1 &&
      sourceCatalogs[0].Sha256 === createHash("sha256").update(catalogBytes).digest("hex"),
    "Consumer template catalog digest does not match the staged catalog bytes.",
  );
}

function verifyConsumerInstall(tarball, workDir) {
  const consumerDir = join(workDir, "consumer");
  mkdirSync(consumerDir, { recursive: true });
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify({ private: true, type: "commonjs" }, null, 2),
  );
  mkdirSync(join(consumerDir, "site"));
  writeFileSync(join(consumerDir, "site", "index.html"), "ok");

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
      `import { ShinBucketDeployment, Source, ValidationError } from "${packageName}";`,
      "",
      "const app = new App();",
      'const stack = new Stack(app, "ConsumerStack");',
      'const bucket = new Bucket(stack, "Bucket");',
      'new ShinBucketDeployment(stack, "Deploy", {',
      '  sources: [Source.asset("site")],',
      "  destinationBucket: bucket,",
      "  shareHandler: false,",
      "});",
      "app.synth();",
      'const validationError: ValidationError = new ValidationError("ConsumerValidation", "expected", stack);',
      'if (validationError.code !== "ConsumerValidation") throw new Error("ValidationError export is invalid");',
      "",
    ].join("\n"),
  );
  run("npx", ["tsc", "--noEmit"], { cwd: consumerDir });

  const synthLines = [
    'const assert = require("node:assert/strict");',
    'const { App, Stack } = require("aws-cdk-lib");',
    'const { Template } = require("aws-cdk-lib/assertions");',
    'const { Bucket } = require("aws-cdk-lib/aws-s3");',
    `const { ShinBucketDeployment, Source, ValidationError } = require("${packageName}");`,
    "",
    `const app = new App({ outdir: ${JSON.stringify(join(workDir, "cdk.out-cjs"))} });`,
    'const stack = new Stack(app, "ConsumerStack");',
    'const bucket = new Bucket(stack, "Bucket");',
    'new ShinBucketDeployment(stack, "Deploy", {',
    '  sources: [Source.asset("site")],',
    "  destinationBucket: bucket,",
    '  destinationKeyPrefix: "shared",',
    "});",
    'new ShinBucketDeployment(stack, "IsolatedDeploy", {',
    '  sources: [Source.data("index.txt", "isolated")],',
    "  destinationBucket: bucket,",
    '  destinationKeyPrefix: "isolated",',
    "  shareHandler: false,",
    "});",
    'assert.equal(Object.keys(Template.fromStack(stack).findResources("AWS::Lambda::Function")).length, 2);',
    "app.synth();",
    'const validationStack = new Stack(app, "ValidationStack");',
    'const validationBucket = new Bucket(validationStack, "Bucket");',
    "let validationError;",
    "try {",
    '  new ShinBucketDeployment(validationStack, "Deploy", {',
    '    sources: [Source.data("index.txt", "ok")],',
    "    destinationBucket: validationBucket,",
    '    distributionPaths: ["/*"],',
    "  });",
    "} catch (error) {",
    "  validationError = error;",
    "}",
    "assert.ok(validationError instanceof ValidationError);",
    'assert.equal(validationError.name, "ValidationError");',
    'assert.equal(validationError.code, "DistributionSpecifiedDistributionPathsSpecified");',
    'assert.equal(validationError.constructPath, "ValidationStack/Deploy");',
    "",
  ];
  writeFileSync(join(consumerDir, "synth.cjs"), synthLines.join("\n"));
  run("node", ["synth.cjs"], { cwd: consumerDir });
  verifyStagedProviderArchive(consumerDir, join(workDir, "cdk.out-cjs"));
  verifyCatalogedConsumerAsset(join(workDir, "cdk.out-cjs"));

  writeFileSync(
    join(consumerDir, "synth.mjs"),
    [
      'import assert from "node:assert/strict";',
      'import { App, Stack } from "aws-cdk-lib";',
      'import { Template } from "aws-cdk-lib/assertions";',
      'import { Bucket } from "aws-cdk-lib/aws-s3";',
      `import { ShinBucketDeployment, Source, ValidationError } from "${packageName}";`,
      "",
      `const app = new App({ outdir: ${JSON.stringify(join(workDir, "cdk.out-esm"))} });`,
      'const stack = new Stack(app, "ConsumerStack");',
      'const bucket = new Bucket(stack, "Bucket");',
      'new ShinBucketDeployment(stack, "Deploy", {',
      '  sources: [Source.asset("site")],',
      "  destinationBucket: bucket,",
      '  destinationKeyPrefix: "shared",',
      "});",
      'new ShinBucketDeployment(stack, "IsolatedDeploy", {',
      '  sources: [Source.data("index.txt", "isolated")],',
      "  destinationBucket: bucket,",
      '  destinationKeyPrefix: "isolated",',
      "  shareHandler: false,",
      "});",
      'assert.equal(Object.keys(Template.fromStack(stack).findResources("AWS::Lambda::Function")).length, 2);',
      "app.synth();",
      'const validationStack = new Stack(app, "ValidationStack");',
      'const validationBucket = new Bucket(validationStack, "Bucket");',
      "let validationError;",
      "try {",
      '  new ShinBucketDeployment(validationStack, "Deploy", {',
      '    sources: [Source.data("index.txt", "ok")],',
      "    destinationBucket: validationBucket,",
      '    distributionPaths: ["/*"],',
      "  });",
      "} catch (error) {",
      "  validationError = error;",
      "}",
      "assert.ok(validationError instanceof ValidationError);",
      'assert.equal(validationError.name, "ValidationError");',
      'assert.equal(validationError.code, "DistributionSpecifiedDistributionPathsSpecified");',
      'assert.equal(validationError.constructPath, "ValidationStack/Deploy");',
      "",
    ].join("\n"),
  );
  run("node", ["synth.mjs"], { cwd: consumerDir });
  verifyStagedProviderArchive(consumerDir, join(workDir, "cdk.out-esm"));
  verifyCatalogedConsumerAsset(join(workDir, "cdk.out-esm"));
}

function main() {
  const options = parseOptions(process.argv.slice(2));
  const workDir = mkdtempSync(join(tmpdir(), "shin-package-"));
  try {
    for (const arch of ["arm64", "x86_64"]) {
      const bootstrapDir = join(repoRoot, "assets", `bootstrap-${arch}`);
      verifyBootstrapProvenance(
        join(bootstrapDir, "bootstrap.zip"),
        join(bootstrapDir, "build-provenance.json"),
        arch,
      );
    }
    run("pnpm", ["build:package"]);
    verifyDeclarations();
    const tarball = packTarball(workDir, options.packDestination);
    verifyTarball(tarball, workDir);
    verifyConsumerInstall(tarball, workDir);
    console.log(`Verified ${packageName} package smoke test.`);
    if (options.packDestination) {
      console.log(`TARBALL=${tarball}`);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
