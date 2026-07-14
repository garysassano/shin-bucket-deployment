import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  type BenchmarkAssetProfile,
  type BenchmarkAssetState,
  isBenchmarkAssetProfile,
  isBenchmarkAssetState,
} from "./model";

type FileSpec = {
  readonly path: string;
  readonly size: number;
  readonly kind: "text" | "json" | "binary";
};

type GeneratedBundle = {
  readonly root: string;
  readonly sourceRoots: readonly string[];
  readonly profile: BenchmarkAssetProfile;
  readonly state: BenchmarkAssetState;
  readonly fileCount: number;
  readonly totalBytes: number;
};

const DEFAULT_PROFILE: BenchmarkAssetProfile = "mixed";
const DEFAULT_STATE: BenchmarkAssetState = "baseline";
const ASSET_GENERATOR_VERSION = 3;
const SHA256_BYTES = 32;

type GeneratedFileDigest = {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
};

type GenerationMarker = {
  readonly generatorVersion: number;
  readonly profile: BenchmarkAssetProfile;
  readonly state: BenchmarkAssetState;
  readonly fileCount: number;
  readonly totalBytes: number;
  readonly files: readonly GeneratedFileDigest[];
};

export function ensureBenchmarkAssets(options?: {
  readonly assetProfile?: string;
  readonly state?: string;
  readonly outputRoot?: string;
}): GeneratedBundle {
  const profile = parseProfile(options?.assetProfile ?? process.env.SHIN_BENCH_ASSET_PROFILE);
  const state = parseState(options?.state ?? process.env.SHIN_BENCH_ASSET_STATE);
  const outputRoot = options?.outputRoot ?? join(process.cwd(), ".benchmark-assets");
  const root = join(outputRoot, profile, state);
  const markerPath = join(root, ".generated.json");
  const specs = buildSpecs(profile, state);
  const totalBytes = specs.reduce((sum, spec) => sum + spec.size, 0);

  const expectedMarker = {
    generatorVersion: ASSET_GENERATOR_VERSION,
    profile,
    state,
    fileCount: specs.length,
    totalBytes,
  };

  if (markerMatches(root, markerPath, expectedMarker, specs)) {
    return {
      root,
      sourceRoots: sourceRoots(profile, root),
      profile,
      state,
      fileCount: specs.length,
      totalBytes,
    };
  }

  rmSync(root, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });

  const files: GeneratedFileDigest[] = [];
  for (const spec of specs) {
    const filePath = join(root, spec.path);
    mkdirSync(dirname(filePath), { recursive: true });
    const contents = renderFile(spec, profile, state);
    writeFileSync(filePath, contents);
    files.push({ path: spec.path, size: contents.length, sha256: digest(contents) });
  }

  const marker: GenerationMarker = { ...expectedMarker, files };
  writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`);

  return {
    root,
    sourceRoots: sourceRoots(profile, root),
    profile,
    state,
    fileCount: specs.length,
    totalBytes,
  };
}

function buildSpecs(profile: BenchmarkAssetProfile, state: BenchmarkAssetState): FileSpec[] {
  if (profile === "multi-source-prune") {
    const specs: FileSpec[] = [];
    for (let sourceIndex = 0; sourceIndex < 4; sourceIndex++) {
      const source = `source-${String(sourceIndex).padStart(2, "0")}`;
      specs.push({
        path: `${source}/${source}/index.html`,
        size: 8 * 1024,
        kind: "text",
      });
      addSeries(
        specs,
        `${source}/${source}/assets/blob`,
        ".bin",
        320,
        8 * 1024,
        64 * 1024,
        "binary",
      );
    }
    return state === "pruned" ? specs.filter((_, index) => index % 10 === 0) : specs;
  }

  const specs: FileSpec[] = [
    { path: "index.html", size: 24 * 1024, kind: "text" },
    { path: "asset-manifest.json", size: 18 * 1024, kind: "json" },
    { path: "service-worker.js", size: 32 * 1024, kind: "text" },
    { path: "robots.txt", size: 1024, kind: "text" },
  ];

  if (profile === "tiny-many") {
    addSeries(specs, "assets/chunks/chunk", ".js", 1_800, 1024, 6 * 1024, "text");
    addSeries(specs, "assets/data/page", ".json", 700, 512, 3 * 1024, "json");
    addSeries(specs, "assets/css/scope", ".css", 80, 1024, 8 * 1024, "text");
  }

  if (profile === "mixed") {
    addSeries(specs, "assets/chunks/route", ".js", 140, 12 * 1024, 96 * 1024, "text");
    addSeries(specs, "assets/chunks/vendor", ".js", 12, 512 * 1024, 1536 * 1024, "text");
    addSeries(specs, "assets/maps/route", ".js.map", 80, 32 * 1024, 220 * 1024, "json");
    addSeries(specs, "assets/css/scope", ".css", 36, 8 * 1024, 64 * 1024, "text");
    addSeries(specs, "assets/data/page", ".json", 120, 2 * 1024, 24 * 1024, "json");
    addSeries(specs, "assets/media/image", ".webp", 42, 64 * 1024, 768 * 1024, "binary");
    addSeries(specs, "assets/fonts/font", ".woff2", 8, 96 * 1024, 220 * 1024, "binary");
  }

  if (profile === "large-few") {
    addSeries(specs, "assets/chunks/vendor", ".js", 8, 2 * 1024 * 1024, 8 * 1024 * 1024, "text");
    addSeries(specs, "assets/media/hero", ".webp", 12, 2 * 1024 * 1024, 12 * 1024 * 1024, "binary");
    addSeries(specs, "assets/maps/vendor", ".js.map", 8, 1024 * 1024, 4 * 1024 * 1024, "json");
  }

  if (state === "pruned") {
    return specs.filter((_, index) => index % 10 !== 0);
  }

  return specs;
}

function addSeries(
  specs: FileSpec[],
  prefix: string,
  extension: string,
  count: number,
  minSize: number,
  maxSize: number,
  kind: FileSpec["kind"],
): void {
  for (let index = 0; index < count; index++) {
    const width = Math.max(4, String(count).length);
    const name = `${prefix}-${String(index).padStart(width, "0")}.${hashName(prefix, index)}${extension}`;
    specs.push({
      path: name,
      size: sized(index, minSize, maxSize),
      kind,
    });
  }
}

function renderFile(
  spec: FileSpec,
  profile: BenchmarkAssetProfile,
  state: BenchmarkAssetState,
): Buffer {
  const seed = seedFor(spec.path, profile, state);

  if (spec.kind === "binary") {
    return renderBenchmarkBinary(spec.size, seed);
  }

  const text = spec.kind === "json" ? renderJsonText(spec.path, seed) : renderText(spec.path, seed);
  const bytes = Buffer.from(text);
  if (bytes.length >= spec.size) {
    return bytes.subarray(0, spec.size);
  }

  const output = Buffer.alloc(spec.size);
  for (let offset = 0; offset < spec.size; offset += bytes.length) {
    bytes.copy(output, offset);
  }
  return output;
}

export function renderBenchmarkBinary(size: number, seed: number): Buffer {
  const output = Buffer.alloc(size);
  const input = Buffer.allocUnsafe(12);
  input.writeUInt32BE(seed, 0);

  for (let offset = 0, counter = 0; offset < size; offset += SHA256_BYTES, counter++) {
    input.writeBigUInt64BE(BigInt(counter), 4);
    const block = createHash("sha256").update(input).digest();
    block.copy(output, offset, 0, Math.min(SHA256_BYTES, size - offset));
  }
  return output;
}

function renderText(path: string, seed: number): string {
  const token = seed.toString(36);
  return [
    `/* ${path} ${token} */`,
    "import{createElement as h}from'react';",
    `const route="${path}";`,
    `const token="${token}";`,
    "export function render(){return h('main',{className:'route'},route,token);}",
    "export const styles='display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px';",
    "",
  ].join("\n");
}

function renderJsonText(path: string, seed: number): string {
  return `${JSON.stringify(
    {
      path,
      seed,
      title: `Benchmark page ${path}`,
      blocks: Array.from({ length: 16 }, (_, index) => ({
        id: `${path}-${index}`,
        value: (seed + index).toString(36),
      })),
    },
    null,
    2,
  )}\n`;
}

function sized(index: number, minSize: number, maxSize: number): number {
  if (minSize === maxSize) {
    return minSize;
  }
  const span = maxSize - minSize;
  return minSize + (((index * 1103515245 + 12345) >>> 0) % span);
}

function seedFor(path: string, profile: BenchmarkAssetProfile, state: BenchmarkAssetState): number {
  const stateSalt = state === "changed" ? changedSalt(path) : "stable";
  return hash(`${profile}:${stateSalt}:${path}`);
}

function markerMatches(
  root: string,
  markerPath: string,
  expected: Omit<GenerationMarker, "files">,
  specs: readonly FileSpec[],
): boolean {
  if (!existsSync(markerPath)) {
    return false;
  }

  try {
    const marker: unknown = JSON.parse(readFileSync(markerPath, "utf8"));
    if (typeof marker !== "object" || marker === null) {
      return false;
    }
    const candidate = marker as Record<string, unknown>;
    if (
      candidate.generatorVersion === expected.generatorVersion &&
      candidate.profile === expected.profile &&
      candidate.state === expected.state &&
      candidate.fileCount === expected.fileCount &&
      candidate.totalBytes === expected.totalBytes
    ) {
      return filesMatch(root, specs, candidate.files, expected.profile, expected.state);
    }
    return false;
  } catch {
    return false;
  }
}

function filesMatch(
  root: string,
  specs: readonly FileSpec[],
  value: unknown,
  profile: BenchmarkAssetProfile,
  state: BenchmarkAssetState,
): boolean {
  if (!Array.isArray(value) || value.length !== specs.length) {
    return false;
  }

  const expectedPaths = specs.map((spec) => spec.path).sort();
  const actualPaths = listGeneratedFiles(root).sort();
  if (
    expectedPaths.length !== actualPaths.length ||
    expectedPaths.some((path, index) => path !== actualPaths[index])
  ) {
    return false;
  }

  return specs.every((spec, index) => {
    const candidate: unknown = value[index];
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }
    const entry = candidate as Record<string, unknown>;
    const filePath = join(root, spec.path);
    const expectedDigest = digest(renderFile(spec, profile, state));
    return (
      entry.path === spec.path &&
      entry.size === spec.size &&
      typeof entry.sha256 === "string" &&
      entry.sha256 === expectedDigest &&
      statSync(filePath).size === spec.size &&
      digest(readFileSync(filePath)) === expectedDigest
    );
  });
}

function listGeneratedFiles(root: string, directory = root): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (path === join(root, ".generated.json")) {
      return [];
    }
    return statSync(path).isDirectory()
      ? listGeneratedFiles(root, path)
      : [path.slice(root.length + 1)];
  });
}

function digest(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

function changedSalt(path: string): string {
  if (
    path === "asset-manifest.json" ||
    path.includes("route-0007") ||
    path.includes("vendor-0001") ||
    path.includes("image-0003") ||
    path.includes("page-0011") ||
    path.includes("blob-0007")
  ) {
    return "changed";
  }
  return "stable";
}

function sourceRoots(profile: BenchmarkAssetProfile, root: string): readonly string[] {
  if (profile !== "multi-source-prune") {
    return [root];
  }
  return Array.from({ length: 4 }, (_, index) =>
    join(root, `source-${String(index).padStart(2, "0")}`),
  );
}

function hashName(prefix: string, index: number): string {
  return hash(`${prefix}:${index}`).toString(36).slice(0, 8);
}

function hash(value: string): number {
  let state = 2166136261;
  for (const char of value) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function parseProfile(value: string | undefined): BenchmarkAssetProfile {
  if (value === undefined || value === "") {
    return DEFAULT_PROFILE;
  }
  if (isBenchmarkAssetProfile(value)) {
    return value;
  }
  throw new Error(`Unknown benchmark asset profile: ${value}`);
}

function parseState(value: string | undefined): BenchmarkAssetState {
  if (value === undefined || value === "") {
    return DEFAULT_STATE;
  }
  if (isBenchmarkAssetState(value)) {
    return value;
  }
  throw new Error(`Unknown benchmark asset state: ${value}`);
}

if (require.main === module) {
  const bundle = ensureBenchmarkAssets();
  console.log(`Generated ${bundle.fileCount} files (${bundle.totalBytes} bytes) at ${bundle.root}`);
}
