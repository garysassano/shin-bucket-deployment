import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type BenchmarkAssetProfile = "tiny-many" | "mixed" | "large-few";
export type BenchmarkAssetVariant = "v1" | "v2" | "pruned";

type FileSpec = {
  readonly path: string;
  readonly size: number;
  readonly kind: "text" | "json" | "binary";
};

type GeneratedBundle = {
  readonly root: string;
  readonly profile: BenchmarkAssetProfile;
  readonly variant: BenchmarkAssetVariant;
  readonly fileCount: number;
  readonly totalBytes: number;
};

const DEFAULT_PROFILE: BenchmarkAssetProfile = "mixed";
const DEFAULT_VARIANT: BenchmarkAssetVariant = "v1";
const BINARY_CHUNK_BYTES = 1024 * 1024;

export function ensureBenchmarkAssets(options?: {
  readonly profile?: string;
  readonly variant?: string;
  readonly outputRoot?: string;
}): GeneratedBundle {
  const profile = parseProfile(options?.profile ?? process.env.RBD_BENCH_PROFILE);
  const variant = parseVariant(options?.variant ?? process.env.RBD_BENCH_VARIANT);
  const outputRoot = options?.outputRoot ?? join(process.cwd(), ".benchmark-assets");
  const root = join(outputRoot, profile, variant);
  const markerPath = join(root, ".generated.json");
  const specs = buildSpecs(profile, variant);
  const totalBytes = specs.reduce((sum, spec) => sum + spec.size, 0);

  if (existsSync(markerPath)) {
    return { root, profile, variant, fileCount: specs.length, totalBytes };
  }

  rmSync(root, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });

  for (const spec of specs) {
    const filePath = join(root, spec.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, renderFile(spec, profile, variant));
  }

  writeFileSync(
    markerPath,
    `${JSON.stringify({ profile, variant, fileCount: specs.length, totalBytes }, null, 2)}\n`,
  );

  return { root, profile, variant, fileCount: specs.length, totalBytes };
}

function buildSpecs(profile: BenchmarkAssetProfile, variant: BenchmarkAssetVariant): FileSpec[] {
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

  if (variant === "pruned") {
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
  variant: BenchmarkAssetVariant,
): Buffer {
  const seed = seedFor(spec.path, profile, variant);

  if (spec.kind === "binary") {
    return renderBinary(spec.size, seed);
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

function renderBinary(size: number, seed: number): Buffer {
  const output = Buffer.alloc(size);
  let state = seed || 0x12345678;
  for (let offset = 0; offset < size; offset += BINARY_CHUNK_BYTES) {
    const end = Math.min(size, offset + BINARY_CHUNK_BYTES);
    for (let index = offset; index < end; index++) {
      state = nextState(state);
      output[index] = state & 0xff;
    }
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
  return minSize + ((index * 1103515245 + 12345) >>> 0) % span;
}

function seedFor(
  path: string,
  profile: BenchmarkAssetProfile,
  variant: BenchmarkAssetVariant,
): number {
  const variantSalt = variant === "v1" ? "stable" : variant === "v2" ? changedSalt(path) : "pruned";
  return hash(`${profile}:${variantSalt}:${path}`);
}

function changedSalt(path: string): string {
  if (
    path === "asset-manifest.json" ||
    path.includes("route-0007") ||
    path.includes("vendor-0001") ||
    path.includes("image-0003") ||
    path.includes("page-0011")
  ) {
    return "changed";
  }
  return "stable";
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

function nextState(state: number): number {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

function parseProfile(value: string | undefined): BenchmarkAssetProfile {
  if (value === "tiny-many" || value === "mixed" || value === "large-few") {
    return value;
  }
  return DEFAULT_PROFILE;
}

function parseVariant(value: string | undefined): BenchmarkAssetVariant {
  if (value === "v1" || value === "v2" || value === "pruned") {
    return value;
  }
  return DEFAULT_VARIANT;
}

if (require.main === module) {
  const bundle = ensureBenchmarkAssets();
  console.log(
    `Generated ${bundle.fileCount} files (${bundle.totalBytes} bytes) at ${bundle.root}`,
  );
}
