import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureBenchmarkAssets, renderBenchmarkBinary } from "../../benchmarks/src/assets";

describe("benchmark assets", () => {
  let outputRoot: string;

  beforeAll(() => {
    outputRoot = mkdtempSync(join(tmpdir(), "shin-benchmark-assets-"));
  });

  afterAll(() => {
    rmSync(outputRoot, { force: true, recursive: true });
  });

  it("renders deterministic SHA-256 counter-mode binary data", () => {
    const first = renderBenchmarkBinary(1024 * 1024, 0x12345678);
    const second = renderBenchmarkBinary(first.length, 0x12345678);
    const differentSeed = renderBenchmarkBinary(first.length, 0x12345679);

    expect(second).toEqual(first);
    expect(differentSeed).not.toEqual(first);
  });

  it("produces binary data that does not materially compress", () => {
    const data = renderBenchmarkBinary(1024 * 1024, 0xabcdef01);
    const compressed = gzipSync(data, { level: 9 });

    expect(compressed.length / data.length).toBeGreaterThan(0.99);
  });

  it("regenerates assets when the generator marker version is stale", () => {
    const bundle = ensureBenchmarkAssets({
      assetProfile: "tiny-many",
      state: "baseline",
      outputRoot,
    });
    const markerPath = join(bundle.root, ".generated.json");
    const filePath = join(bundle.root, "robots.txt");
    const expectedContents = readFileSync(filePath);
    const marker = JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;

    writeFileSync(filePath, "stale fixture");
    writeFileSync(markerPath, `${JSON.stringify({ ...marker, generatorVersion: 1 })}\n`);

    ensureBenchmarkAssets({ assetProfile: "tiny-many", state: "baseline", outputRoot });

    expect(readFileSync(filePath)).toEqual(expectedContents);
    expect(JSON.parse(readFileSync(markerPath, "utf8"))).toMatchObject({
      generatorVersion: 3,
      profile: "tiny-many",
      state: "baseline",
    });
  });

  it("regenerates assets whose contents no longer match the marker digest", () => {
    const bundle = ensureBenchmarkAssets({
      assetProfile: "tiny-many",
      state: "baseline",
      outputRoot,
    });
    const filePath = join(bundle.root, "robots.txt");
    const expectedContents = readFileSync(filePath);

    const corrupted = Buffer.alloc(expectedContents.length, 0x78);
    writeFileSync(filePath, corrupted);
    const markerPath = join(bundle.root, ".generated.json");
    const marker = JSON.parse(readFileSync(markerPath, "utf8")) as {
      files: Array<{ path: string; sha256: string }>;
    };
    const entry = marker.files.find((file) => file.path === "robots.txt");
    if (!entry) throw new Error("missing robots.txt marker");
    entry.sha256 = createHash("sha256").update(corrupted).digest("hex");
    writeFileSync(markerPath, JSON.stringify(marker));
    ensureBenchmarkAssets({ assetProfile: "tiny-many", state: "baseline", outputRoot });

    expect(readFileSync(filePath)).toEqual(expectedContents);
  });

  it("keeps every retained prune-state file byte-identical to baseline", () => {
    const baseline = ensureBenchmarkAssets({
      assetProfile: "tiny-many",
      state: "baseline",
      outputRoot,
    });
    const pruned = ensureBenchmarkAssets({
      assetProfile: "tiny-many",
      state: "pruned",
      outputRoot,
    });
    const retainedFiles = listFiles(pruned.root).filter((path) => path !== ".generated.json");

    expect(retainedFiles.length).toBeGreaterThan(0);
    expect(retainedFiles.length).toBeLessThan(baseline.fileCount);
    for (const path of retainedFiles) {
      expect(fileDigest(join(pruned.root, path)), path).toBe(fileDigest(join(baseline.root, path)));
    }
  });
});

function listFiles(root: string, directory = root): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? listFiles(root, path) : [relative(root, path)];
  });
}

function fileDigest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
