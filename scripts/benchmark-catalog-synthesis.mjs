import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const PROFILE_OPTIONS = {
  "large-few": { exclude: ["assets/maps/**"] },
  "tiny-many": { exclude: ["assets/css/**"] },
};

if (process.argv[2] === "--worker") {
  runMeasurementWorker(process.argv[3], process.argv[4], process.argv[5]);
} else if (process.argv[2] === "--cache-worker") {
  runCacheWorker();
} else {
  runBenchmark();
}

function runBenchmark() {
  const repetitions = parseRepetitions(process.argv.slice(2));
  const { ensureBenchmarkAssets } = require("../dist/benchmarks/src/assets.js");
  const profiles = Object.entries(PROFILE_OPTIONS).map(([profile, options]) => {
    const bundle = ensureBenchmarkAssets({ assetProfile: profile, state: "baseline" });
    const sourceRoot = bundle.sourceRoots[0];
    if (sourceRoot === undefined || bundle.sourceRoots.length !== 1) {
      throw new Error(`Expected one source root for ${profile}.`);
    }
    return { profile, options, bundle, sourceRoot };
  });

  const samples = [];
  for (const { profile, sourceRoot } of profiles) {
    for (const implementation of ["shin", "aws"]) {
      runWorker("--worker", implementation, profile, sourceRoot);
    }
    for (let repetition = 1; repetition <= repetitions; repetition++) {
      const implementations = repetition % 2 === 0 ? ["aws", "shin"] : ["shin", "aws"];
      for (const implementation of implementations) {
        samples.push({
          profile,
          implementation,
          repetition,
          ...runWorker("--worker", implementation, profile, sourceRoot),
        });
      }
    }
  }

  const summary = profiles.flatMap(({ profile, options, bundle }) =>
    ["shin", "aws"].map((implementation) => {
      const selected = samples.filter(
        (sample) => sample.profile === profile && sample.implementation === implementation,
      );
      return {
        profile,
        implementation,
        sourceFileCount: bundle.fileCount,
        sourceBytes: bundle.totalBytes,
        exclude: options.exclude,
        wallMsMedian: median(selected.map((sample) => sample.wallMs)),
        linuxRcharBytesMedian: nullableMedian(selected.map((sample) => sample.linuxRcharBytes)),
        maxRssMiBMedian: median(selected.map((sample) => sample.maxRssMiB)),
      };
    }),
  );

  const result = {
    commit: git("rev-parse", "HEAD"),
    dirty: git("status", "--porcelain").length > 0,
    nodeVersion: process.version,
    cdkVersion: require("aws-cdk-lib/package.json").version,
    repetitions,
    warmupsPerCase: 1,
    summary,
    cacheProbe: runWorker("--cache-worker"),
    samples,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function runMeasurementWorker(implementation, profile, sourceRoot) {
  if ((implementation !== "shin" && implementation !== "aws") || !(profile in PROFILE_OPTIONS)) {
    throw new Error("Invalid catalog synthesis benchmark worker arguments.");
  }
  if (!sourceRoot) {
    throw new Error("Catalog synthesis benchmark worker needs a source root.");
  }

  const { App, Stack } = require("aws-cdk-lib");
  const { Role, ServicePrincipal } = require("aws-cdk-lib/aws-iam");
  const { Asset } = require("aws-cdk-lib/aws-s3-assets");
  const { Source: AwsSource } = require("aws-cdk-lib/aws-s3-deployment");
  const { Source: ShinSource } = require("../dist/src/index.js");
  const scratch = mkdtempSync(join(tmpdir(), "shin-catalog-synth-benchmark-"));
  const outdir = join(scratch, "cdk.out");
  const unrelated = join(scratch, "unrelated");
  mkdirSync(unrelated);
  writeFileSync(join(unrelated, "unrelated.txt"), "unrelated asset\n");

  try {
    const app = new App({ outdir });
    const stack = new Stack(app, "CatalogSynthesisBenchmark");
    const handlerRole = new Role(stack, "HandlerRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    const beforeIo = linuxProcessIo();
    const started = performance.now();
    new Asset(stack, "UnrelatedAsset", { path: unrelated });
    const source = implementation === "shin" ? ShinSource : AwsSource;
    source.asset(sourceRoot, PROFILE_OPTIONS[profile]).bind(stack, { handlerRole });
    app.synth();
    const wallMs = performance.now() - started;
    const afterIo = linuxProcessIo();
    const maxRssMiB = process.resourceUsage().maxRSS / 1024;
    process.stdout.write(
      `${JSON.stringify({
        wallMs,
        linuxRcharBytes:
          beforeIo === undefined || afterIo === undefined ? null : afterIo.rchar - beforeIo.rchar,
        maxRssMiB,
      })}\n`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    cleanupCatalogScratchForProcess();
  }
}

function runCacheWorker() {
  const { App, Stack } = require("aws-cdk-lib");
  const { Role, ServicePrincipal } = require("aws-cdk-lib/aws-iam");
  const { Asset } = require("aws-cdk-lib/aws-s3-assets");
  const { Source } = require("../dist/src/index.js");
  const scratch = mkdtempSync(join(tmpdir(), "shin-catalog-cache-benchmark-"));
  const sourceRoot = join(scratch, "source");
  const unrelated = join(scratch, "unrelated");
  mkdirSync(sourceRoot);
  mkdirSync(unrelated);
  writeFileSync(join(sourceRoot, "index.html"), "catalog one\n");
  writeFileSync(join(unrelated, "unrelated.txt"), "unrelated one\n");

  try {
    const app = new App({ outdir: join(scratch, "cdk.out") });
    const stack = new Stack(app, "CatalogCacheProbe");
    const handlerRole = new Role(stack, "HandlerRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    const firstUnrelated = new Asset(stack, "UnrelatedOne", { path: unrelated });
    const firstCatalog = Source.asset(sourceRoot).bind(stack, { handlerRole });
    writeFileSync(join(sourceRoot, "index.html"), "catalog two\n");
    const secondCatalog = Source.asset(sourceRoot).bind(stack, { handlerRole });
    writeFileSync(join(unrelated, "unrelated.txt"), "unrelated two\n");
    const secondUnrelated = new Asset(stack, "UnrelatedTwo", { path: unrelated });
    process.stdout.write(
      `${JSON.stringify({
        catalogIdentityChanged: firstCatalog.zipObjectKey !== secondCatalog.zipObjectKey,
        unrelatedCacheRetained: firstUnrelated.assetHash === secondUnrelated.assetHash,
      })}\n`,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    cleanupCatalogScratchForProcess();
  }
}

function runWorker(...args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" },
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Catalog synthesis benchmark worker failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return JSON.parse(result.stdout);
}

function parseRepetitions(args) {
  const index = args.indexOf("--repetitions");
  if (index === -1) {
    return 5;
  }
  const repetitions = Number(args[index + 1]);
  if (!Number.isSafeInteger(repetitions) || repetitions < 1 || repetitions > 20) {
    throw new Error("--repetitions must be an integer from 1 through 20.");
  }
  return repetitions;
}

function median(values) {
  if (values.length === 0) {
    throw new Error("Cannot calculate the median of an empty sample.");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function nullableMedian(values) {
  const present = values.filter((value) => value !== null);
  return present.length === 0 ? null : median(present);
}

function linuxProcessIo() {
  if (process.platform !== "linux") {
    return undefined;
  }
  const fields = Object.fromEntries(
    readFileSync("/proc/self/io", "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split(": ")),
  );
  const rchar = Number(fields.rchar);
  return Number.isSafeInteger(rchar) ? { rchar } : undefined;
}

function cleanupCatalogScratchForProcess() {
  const prefix = `shin-bucket-deployment-catalog-${process.pid}-`;
  for (const entry of readdirSync(tmpdir())) {
    if (entry.startsWith(prefix)) {
      rmSync(join(tmpdir(), entry), { recursive: true, force: true });
    }
  }
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
