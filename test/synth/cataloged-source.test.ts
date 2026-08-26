import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  App,
  AssetHashType,
  DefaultStackSynthesizer,
  type FileAssetLocation,
  type FileAssetSource,
  IgnoreMode,
  Stack,
  SymlinkFollowMode,
} from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Asset, type AssetOptions } from "aws-cdk-lib/aws-s3-assets";
import { afterEach, describe, expect, test } from "vitest";
import { type CatalogedAssetOptions, ShinBucketDeployment, Source } from "../../src";
import {
  catalogedSourceStagingDirectory,
  overrideCatalogedSourceFileSystemForTesting,
} from "../../src/cataloged-source";
import { testLocalProviderBuild } from "../support/bundling";

const SCRATCH_PREFIX = "shin-bucket-deployment-catalog-";

interface ManifestAsset {
  displayName?: string;
  source?: {
    deployTime?: boolean;
    path?: string;
    packaging?: string;
  };
}

interface SynthesizedCatalog {
  readonly app: App;
  readonly stack: Stack;
  readonly assemblyDirectory: string;
  readonly outdir: string;
  readonly catalogDirectory: string;
  readonly catalog: string;
  readonly catalogSha256: string;
  readonly assetHash: string;
  readonly manifestAsset: ManifestAsset;
}

class RecordingSynthesizer extends DefaultStackSynthesizer {
  public readonly fileAssets: FileAssetSource[] = [];

  public override addFileAsset(asset: FileAssetSource): FileAssetLocation {
    this.fileAssets.push(asset);
    return super.addFileAsset(asset);
  }
}

const cleanupPaths = new Set<string>();
let restoreFileSystem: (() => void) | undefined;

afterEach(() => {
  restoreFileSystem?.();
  restoreFileSystem = undefined;
  for (const path of cleanupPaths) {
    rmSync(path, { recursive: true, force: true });
  }
  cleanupPaths.clear();
});

function tempDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  cleanupPaths.add(directory);
  return directory;
}

function writeFixture(files: Record<string, string | Buffer>): string {
  const directory = tempDirectory("shin-catalog-fixture-");
  for (const [path, bytes] of Object.entries(files)) {
    const absolutePath = join(directory, ...path.split("/"));
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, bytes);
  }
  return directory;
}

function customResourceProperties(stack: Stack): Record<string, unknown> {
  const template = Template.fromStack(stack).toJSON() as {
    Resources?: Record<string, unknown>;
  };
  const resource = Object.values(template.Resources ?? {}).find(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "Type" in candidate &&
      candidate.Type === "AWS::CloudFormation::CustomResource",
  ) as { Properties?: Record<string, unknown> } | undefined;
  if (!resource?.Properties) {
    throw new Error("Shin custom resource not found");
  }
  return resource.Properties;
}

function synthesizeCatalog(
  sourceDirectory: string,
  options?: CatalogedAssetOptions,
  deploymentProps: Partial<ConstructorParameters<typeof ShinBucketDeployment>[2]> = {},
  appContext?: Record<string, unknown>,
): SynthesizedCatalog {
  const outdir = tempDirectory("shin-catalog-out-");
  const app = new App({ outdir, context: appContext });
  const stack = new Stack(app, "CatalogStack");
  const destinationBucket = new Bucket(stack, "Destination");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(sourceDirectory, options)],
    destination: {
      bucket: destinationBucket,
    },
    providerLambda: {
      localBuild: testLocalProviderBuild(),
    },
    ...deploymentProps,
  });
  const assembly = app.synth();
  const manifest = JSON.parse(
    readFileSync(join(assembly.directory, "CatalogStack.assets.json"), "utf8"),
  ) as { files?: Record<string, ManifestAsset> };
  const manifestAssetEntry = Object.entries(manifest.files ?? {}).find(([, asset]) => {
    const path = asset.source?.path;
    return (
      asset.source?.packaging === "zip" &&
      path !== undefined &&
      existsSync(join(assembly.directory, path, ".shin", "catalog.v1.json"))
    );
  });
  const [assetHash, manifestAsset] = manifestAssetEntry ?? [];
  if (!assetHash || !manifestAsset?.source?.path) {
    throw new Error("Cataloged directory asset not found");
  }
  const catalogDirectory = join(assembly.directory, manifestAsset.source.path);
  const catalog = readFileSync(join(catalogDirectory, ".shin", "catalog.v1.json"), "utf8");
  return {
    app,
    stack,
    assemblyDirectory: assembly.directory,
    outdir,
    catalogDirectory,
    catalog,
    catalogSha256: createHash("sha256").update(catalog).digest("hex"),
    assetHash,
    manifestAsset,
  };
}

function catalogEntries(synthesized: SynthesizedCatalog): Array<{
  path: string;
  size: number;
  md5: string;
}> {
  return JSON.parse(synthesized.catalog).entries;
}

function scratchDirectories(): string[] {
  return readdirSync(tmpdir())
    .filter((entry) => entry.startsWith(SCRATCH_PREFIX))
    .sort();
}

function linkError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`link failed: ${code}`), { code });
}

function childMaxRssKb(sourceDirectory: string): number {
  const outdir = tempDirectory("shin-catalog-memory-out-");
  const resultPath = join(outdir, "result.json");
  const child = spawnSync(
    process.execPath,
    [
      join(__dirname, "..", "support", "cataloged-memory-child.cjs"),
      sourceDirectory,
      outdir,
      resultPath,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "" },
      maxBuffer: 1024 * 1024,
    },
  );
  if (child.status !== 0) {
    throw new Error(`catalog memory child failed:\n${child.stdout}\n${child.stderr}`);
  }
  if (!existsSync(resultPath)) {
    throw new Error(
      `catalog memory child produced no result (status ${child.status}): ${child.stderr}`,
    );
  }
  return JSON.parse(readFileSync(resultPath, "utf8")).maxRssKb;
}

describe("cataloged directory assets", () => {
  test("writes compact deterministic v1 entries in UTF-8 byte order", () => {
    const source = writeFixture({
      "z.txt": "z",
      "ä.txt": "unicode",
      "a.txt": "hello",
    });

    const synthesized = synthesizeCatalog(source);

    expect(synthesized.catalog).toBe(
      '{"version":1,"entries":[{"path":"a.txt","size":5,"md5":"5d41402abc4b2a76b9719d911017c592"},{"path":"z.txt","size":1,"md5":"fbade9e36a3f36d3d676c1b808451dd7"},{"path":"ä.txt","size":7,"md5":"8ab3b19e134f01fbaf94b8e15f3df090"}]}',
    );
    expect(synthesized.manifestAsset.source?.packaging).toBe("zip");
    expect(customResourceProperties(synthesized.stack).SourceCatalogs).toEqual([
      { Version: 1, Sha256: synthesized.catalogSha256 },
    ]);
  });

  test("changes the catalog binding when content, size, or normalized path changes", () => {
    const content = synthesizeCatalog(writeFixture({ "file.txt": "one" })).catalogSha256;
    const changedContent = synthesizeCatalog(writeFixture({ "file.txt": "two" })).catalogSha256;
    const changedSize = synthesizeCatalog(writeFixture({ "file.txt": "three" })).catalogSha256;
    const changedPath = synthesizeCatalog(writeFixture({ "nested/file.txt": "one" })).catalogSha256;

    expect(new Set([content, changedContent, changedSize, changedPath])).toHaveLength(4);
  });

  test("derives a stable collision-resistant asset identity from content, paths, and options", () => {
    const source = writeFixture({ "file.txt": "line one\n" });
    const initial = synthesizeCatalog(source).assetHash;
    expect(synthesizeCatalog(source).assetHash).toBe(initial);

    writeFileSync(join(source, "file.txt"), "line one\r\n");
    expect(synthesizeCatalog(source).assetHash).not.toBe(initial);

    const changedPath = synthesizeCatalog(writeFixture({ "nested/file.txt": "line one\n" }));
    expect(changedPath.assetHash).not.toBe(initial);

    const exclusions = writeFixture({ "keep.txt": "keep", "drop.txt": "drop" });
    const included = synthesizeCatalog(exclusions).assetHash;
    const excluded = synthesizeCatalog(exclusions, { exclude: ["drop.txt"] }).assetHash;
    expect(excluded).not.toBe(included);
    writeFileSync(join(exclusions, "drop.txt"), "changed but still excluded");
    expect(synthesizeCatalog(exclusions, { exclude: ["drop.txt"] }).assetHash).toBe(excluded);

    const glob = synthesizeCatalog(exclusions, {
      exclude: ["drop.txt"],
      ignoreMode: IgnoreMode.GLOB,
    }).assetHash;
    const git = synthesizeCatalog(exclusions, {
      exclude: ["drop.txt"],
      ignoreMode: IgnoreMode.GIT,
    }).assetHash;
    expect(git).not.toBe(glob);

    const salted = synthesizeCatalog(
      source,
      undefined,
      {},
      {
        "@aws-cdk/core:assetHashSalt": "different application salt",
      },
    ).assetHash;
    const unsalted = synthesizeCatalog(source).assetHash;
    expect(salted).not.toBe(unsalted);
    expect(
      synthesizeCatalog(source, undefined, {}, { "@aws-cdk/core:assetHashSalt": "" }).assetHash,
    ).toBe(unsalted);
  });

  test("keeps chmod-only changes out of the cataloged asset identity", () => {
    if (process.platform === "win32") {
      return;
    }
    const source = writeFixture({ "file.txt": "same bytes" });
    const file = join(source, "file.txt");
    const before = synthesizeCatalog(source).assetHash;

    chmodSync(file, 0o755);

    expect(synthesizeCatalog(source).assetHash).toBe(before);
  });

  test("applies glob, Git, and Docker ignores once while always adding the generated catalog", () => {
    const source = writeFixture({
      "keep.txt": "keep",
      "drop.tmp": "drop",
      "ignored/drop.txt": "drop",
      "ignored/keep.txt": "keep nested",
      ".shin/source-only.txt": "source metadata",
    });

    const glob = synthesizeCatalog(source, {
      exclude: ["*.tmp", ".shin/**"],
      ignoreMode: IgnoreMode.GLOB,
    });
    expect(catalogEntries(glob).map((entry) => entry.path)).toEqual([
      "ignored/drop.txt",
      "ignored/keep.txt",
      "keep.txt",
    ]);
    expect(existsSync(join(glob.catalogDirectory, ".shin", "catalog.v1.json"))).toBe(true);

    for (const ignoreMode of [IgnoreMode.GIT, IgnoreMode.DOCKER]) {
      const synthesized = synthesizeCatalog(source, {
        exclude: ["ignored/*", "!ignored/keep.txt", ".shin/**"],
        ignoreMode,
      });
      expect(catalogEntries(synthesized).map((entry) => entry.path)).toEqual([
        "drop.tmp",
        "ignored/keep.txt",
        "keep.txt",
      ]);
    }
  });

  test("rejects normalized collisions and included reserved metadata paths", () => {
    const collision = writeFixture({ "a\\b.txt": "first", "a/b.txt": "second" });
    expect(() => synthesizeCatalog(collision)).toThrow(/normalize to the same entry/);

    for (const reserved of [".shin/catalog.v1.json", ".shin/catalog.v2.json"]) {
      const source = writeFixture({ [reserved]: "not metadata" });
      expect(() => synthesizeCatalog(source)).toThrow(/reserved metadata path/);
    }
  });

  test("rejects included symlinks and special files", () => {
    const symlinkSource = writeFixture({ "target.txt": "target" });
    symlinkSync("target.txt", join(symlinkSource, "link.txt"));
    expect(() => synthesizeCatalog(symlinkSource)).toThrow(/symbolic links/);

    if (process.platform !== "win32") {
      const specialSource = writeFixture({ "regular.txt": "regular" });
      const fifo = join(specialSource, "named-pipe");
      const result = spawnSync("mkfifo", [fifo], { encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      expect(() => synthesizeCatalog(specialSource)).toThrow(/only supports regular files/);
    }
  });

  test("falls back from allowed hard-link errors and propagates unexpected errors", () => {
    const source = writeFixture({ "index.html": "ok" });
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      linkSync: () => {
        throw linkError("EXDEV");
      },
    });

    const copied = synthesizeCatalog(source);
    expect(catalogEntries(copied)).toEqual([
      { path: "index.html", size: 2, md5: "444bcb3a3fcf8389296c49467f27e1d6" },
    ]);
    restoreFileSystem();
    restoreFileSystem = undefined;

    const unexpected = linkError("EIO");
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      linkSync: (sourcePath) => {
        if (String(sourcePath).includes("shin-catalog-fixture-")) {
          throw unexpected;
        }
        throw unexpected;
      },
    });
    expect(() => synthesizeCatalog(source)).toThrow(unexpected);
  });

  test("detects a source file changing while it is hashed", () => {
    const source = writeFixture({ "large.bin": Buffer.alloc(128 * 1024, 0x61) });
    const sourceFile = join(source, "large.bin");
    const originalRead = require("node:fs").readSync as typeof import("node:fs").readSync;
    let changed = false;
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      readSync: ((fd, buffer, offset, length, position) => {
        const read = originalRead(fd, buffer, offset, length, position);
        if (!changed && read > 0 && offset === 0 && length === 64 * 1024) {
          changed = true;
          appendFileSync(sourceFile, "changed");
        }
        return read;
      }) as typeof import("node:fs").readSync,
    });

    expect(() => synthesizeCatalog(source)).toThrow(
      /changed while hashing or staging|size changed/,
    );
  });

  test("never asks the filesystem to read more than 64 KiB for Shin hashing", () => {
    const source = writeFixture({ "large.bin": Buffer.alloc(2 * 1024 * 1024, 0x61) });
    const originalRead = require("node:fs").readSync as typeof import("node:fs").readSync;
    const requested: number[] = [];
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      readSync: ((fd, buffer, offset, length, position) => {
        requested.push(length);
        return originalRead(fd, buffer, offset, length, position);
      }) as typeof import("node:fs").readSync,
    });

    synthesizeCatalog(source);

    expect(Math.max(...requested)).toBeLessThanOrEqual(64 * 1024);
  });

  test("does not buffer a complete 256 MiB source file in Shin", () => {
    const small = writeFixture({ "large.bin": "small" });
    const large = writeFixture({ "large.bin": "" });
    truncateSync(join(large, "large.bin"), 256 * 1024 * 1024);

    const smallRssKb = childMaxRssKb(small);
    const largeRssKb = childMaxRssKb(large);

    expect(largeRssKb - smallRssKb).toBeLessThan(64 * 1024);
  }, 120_000);

  test("reuses a deterministic staging directory across binds and refreshes it", () => {
    const source = writeFixture({ "index.html": "ok" });
    const linkedDestinations: string[] = [];
    const originalLink = require("node:fs").linkSync as typeof import("node:fs").linkSync;
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      linkSync: (from, to) => {
        linkedDestinations.push(String(to));
        return originalLink(from, to);
      },
    });

    synthesizeCatalog(source);
    const firstBindLinks = linkedDestinations.length;
    expect(firstBindLinks).toBeGreaterThan(0);
    const firstDestination = linkedDestinations[0];
    if (firstDestination === undefined) {
      throw new Error("expected at least one cataloged link destination");
    }
    const stagingDirectory = dirname(firstDestination);

    // A second bind of the same source lands in the same staging directory, so
    // CDK's process-global AssetStaging cache can hit instead of re-walking,
    // re-hashing, and re-copying the tree.
    synthesizeCatalog(source);
    expect(linkedDestinations.length).toBe(2 * firstBindLinks);
    for (const destination of linkedDestinations.slice(firstBindLinks)) {
      expect(dirname(destination)).toBe(stagingDirectory);
    }

    // A different source gets its own staging directory.
    synthesizeCatalog(writeFixture({ "other.html": "other" }));
    const lastDestination = linkedDestinations.at(-1);
    if (lastDestination === undefined) {
      throw new Error("expected at least one cataloged link destination");
    }
    expect(dirname(lastDestination)).not.toBe(stagingDirectory);

    restoreFileSystem();
    restoreFileSystem = undefined;
    for (const entry of scratchDirectories()) {
      cleanupPaths.add(join(tmpdir(), entry));
    }
  });

  test("uses a new custom identity for a tree changed between two binds in one app", () => {
    // The generated identity participates in CDK's cache key, so changed
    // content gets a fresh staged ZIP without clearing unrelated cache entries.
    const source = writeFixture({ "index.html": "one" });
    const outdir = tempDirectory("shin-catalog-change-out-");
    const app = new App({ outdir });
    const stack = new Stack(app, "CatalogStack");
    const destinationBucket = new Bucket(stack, "Destination");

    new ShinBucketDeployment(stack, "DeployOne", {
      sources: [Source.asset(source)],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });
    writeFileSync(join(source, "index.html"), "two");
    new ShinBucketDeployment(stack, "DeployTwo", {
      sources: [Source.asset(source)],
      destination: { bucket: destinationBucket },
      providerLambda: { localBuild: testLocalProviderBuild() },
    });

    app.synth();
    const manifest = JSON.parse(readFileSync(join(outdir, "CatalogStack.assets.json"), "utf8")) as {
      files?: Record<string, ManifestAsset>;
    };
    const catalogedAssets = Object.entries(manifest.files ?? {}).filter(([, asset]) => {
      const path = asset.source?.path;
      return (
        asset.source?.packaging === "zip" &&
        path !== undefined &&
        existsSync(join(outdir, path, ".shin", "catalog.v1.json"))
      );
    });
    expect(catalogedAssets).toHaveLength(2);
    const [firstHash, secondHash] = catalogedAssets.map(([hash]) => hash);
    expect(secondHash).not.toBe(firstHash);
  });

  test("does not evict an unrelated asset when a catalog source changes", () => {
    const source = writeFixture({ "index.html": "one" });
    const unrelated = writeFixture({ "unrelated.txt": "one" });
    const outdir = tempDirectory("shin-catalog-cache-out-");
    const app = new App({ outdir });
    const stack = new Stack(app, "CatalogCacheStack");
    const handlerRole = new Role(stack, "HandlerRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    const firstUnrelated = new Asset(stack, "UnrelatedOne", { path: unrelated });
    const firstCatalog = Source.asset(source).bind(stack, { handlerRole });

    writeFileSync(join(source, "index.html"), "two");
    const secondCatalog = Source.asset(source).bind(stack, { handlerRole });
    writeFileSync(join(unrelated, "unrelated.txt"), "two");
    const secondUnrelated = new Asset(stack, "UnrelatedTwo", { path: unrelated });

    expect(secondCatalog.zipObjectKey).not.toBe(firstCatalog.zipObjectKey);
    // CDK assumes one source path is immutable during a synthesis process.
    // Reusing the first hash after this deliberate probe proves Shin did not
    // clear the process-global cache while updating the catalog source.
    expect(secondUnrelated.assetHash).toBe(firstUnrelated.assetHash);
  });

  test("derives one staging directory per source path and option set", () => {
    const source = writeFixture({ "index.html": "ok" });
    const other = writeFixture({ "index.html": "ok" });

    const first = catalogedSourceStagingDirectory(source);
    expect(first).toContain(SCRATCH_PREFIX);
    expect(catalogedSourceStagingDirectory(source)).toBe(first);
    expect(catalogedSourceStagingDirectory(source, { exclude: ["*.map"] })).not.toBe(first);
    expect(catalogedSourceStagingDirectory(source, { exclude: ["*.map", "*.tmp"] })).not.toBe(
      catalogedSourceStagingDirectory(source, { exclude: ["*.tmp", "*.map"] }),
    );
    expect(catalogedSourceStagingDirectory(other)).not.toBe(first);
  });

  test("recovers from a failed bind because the next bind wipes the staging directory", () => {
    const source = writeFixture({ "index.html": "ok" });
    const invalid = writeFixture({ "index.html": "ok" });
    symlinkSync("index.html", join(invalid, "link.html"));

    const first = synthesizeCatalog(source);
    // A failed bind leaves its staging directory behind (it is the cache), but
    // the next bind of the same source wipes and re-materializes it.
    expect(() => synthesizeCatalog(invalid)).toThrow(/symbolic links/);
    expect(synthesizeCatalog(source).catalogSha256).toBe(first.catalogSha256);

    for (const entry of scratchDirectories()) {
      cleanupPaths.add(join(tmpdir(), entry));
    }
  });

  test("surfaces staging-directory wipe failures as bind errors", () => {
    const originalRemove = require("node:fs").rmSync as typeof import("node:fs").rmSync;
    const wipeError = new Error("induced wipe failure");
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      rmSync: (path, options) => {
        if (String(path).includes(SCRATCH_PREFIX)) {
          throw wipeError;
        }
        return originalRemove(path, options);
      },
    });

    expect(() => synthesizeCatalog(writeFixture({ "index.html": "ok" }))).toThrow(wipeError);
    restoreFileSystem();
    restoreFileSystem = undefined;
  });

  test("fails before scratch creation when asset staging is disabled", () => {
    const source = writeFixture({ "index.html": "ok" });
    const before = scratchDirectories();
    const app = new App({ context: { "aws:cdk:disable-asset-staging": true } });
    const stack = new Stack(app, "DisabledStaging");
    const destinationBucket = new Bucket(stack, "Destination");

    expect(
      () =>
        new ShinBucketDeployment(stack, "Deploy", {
          sources: [Source.asset(source)],
          destination: {
            bucket: destinationBucket,
          },
          providerLambda: {
            localBuild: testLocalProviderBuild(),
          },
        }),
    ).toThrow(/requires CDK asset staging/);
    expect(scratchDirectories()).toEqual(before);
  });

  test("rejects catalog-incompatible options with clear runtime errors", () => {
    const source = writeFixture({ "index.html": "ok" });
    const destination = (sourceOptions: CatalogedAssetOptions) => {
      const stack = new Stack();
      return new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.asset(source, sourceOptions)],
        destination: {
          bucket: new Bucket(stack, "Destination"),
        },
        providerLambda: {
          localBuild: testLocalProviderBuild(),
        },
      });
    };

    expect(() =>
      destination({ bundling: { image: {} } } as unknown as CatalogedAssetOptions),
    ).toThrow(/does not support bundling/);
    expect(() =>
      destination({ followSymlinks: SymlinkFollowMode.NEVER } as unknown as CatalogedAssetOptions),
    ).toThrow(/does not support followSymlinks/);
    for (const assetHashType of [AssetHashType.SOURCE, AssetHashType.OUTPUT]) {
      expect(() => destination({ assetHashType })).toThrow(/collision-resistant custom identity/);
    }
    expect(() => destination({ assetHashType: AssetHashType.CUSTOM })).toThrow(
      /requires assetHash/,
    );
  });

  test("aligns mixed trusted sources and omits bindings when none can be used", () => {
    const trustedSource = writeFixture({ "trusted.txt": "trusted" });
    const stack = new Stack();
    const sourceBucket = new Bucket(stack, "SourceBucket");
    const destinationBucket = new Bucket(stack, "Destination");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.bucket(sourceBucket, "plain.zip"), Source.asset(trustedSource)],
      destination: {
        bucket: destinationBucket,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });
    deployment.addSource(Source.data("generated.txt", "generated"));

    const catalogs = customResourceProperties(stack).SourceCatalogs as Array<
      Record<string, unknown>
    >;
    expect(catalogs).toHaveLength(3);
    expect(catalogs[0]).toEqual({});
    expect(catalogs[1]).toEqual({
      Version: 1,
      Sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(catalogs[2]).toEqual({});

    const untrustedStack = new Stack();
    new ShinBucketDeployment(untrustedStack, "Deploy", {
      sources: [Source.bucket(new Bucket(untrustedStack, "Source"), "plain.zip")],
      destination: {
        bucket: new Bucket(untrustedStack, "Destination"),
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });
    expect(customResourceProperties(untrustedStack).SourceCatalogs).toBeUndefined();

    const copyStack = new Stack();
    new ShinBucketDeployment(copyStack, "Deploy", {
      sources: [Source.asset(trustedSource)],
      destination: {
        bucket: new Bucket(copyStack, "Destination"),
      },
      sourceProcessing: {
        extract: false,
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });
    expect(customResourceProperties(copyStack).SourceCatalogs).toBeUndefined();
  });

  test("keeps equal asset keys with different catalog bindings distinct", () => {
    const first = writeFixture({ "index.html": "first" });
    const second = writeFixture({ "index.html": "second" });
    const stack = new Stack();
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(first, { assetHash: "shared", assetHashType: AssetHashType.CUSTOM })],
      destination: {
        bucket: new Bucket(stack, "Destination"),
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });
    deployment.addSource(
      Source.asset(second, { assetHash: "shared", assetHashType: AssetHashType.CUSTOM }),
    );

    const properties = customResourceProperties(stack);
    expect(properties.SourceObjectKeys).toHaveLength(2);
    const catalogs = properties.SourceCatalogs as Array<{ Sha256: string }>;
    expect(catalogs).toHaveLength(2);
    expect(catalogs[0]?.Sha256).not.toBe(catalogs[1]?.Sha256);
  });

  test("delegates embeddedCatalog:false to the upstream untrusted asset path", () => {
    const source = writeFixture({ "index.html": "ok" });
    const stack = new Stack();
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(source, { embeddedCatalog: false })],
      destination: {
        bucket: new Bucket(stack, "Destination"),
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });

    expect(customResourceProperties(stack).SourceCatalogs).toBeUndefined();
  });

  test("forwards custom hashing, display-name, and deploy-time publication options", () => {
    const source = writeFixture({ "index.html": "ok" });
    const outdir = tempDirectory("shin-catalog-recording-");
    const synthesizer = new RecordingSynthesizer();
    const app = new App({ outdir });
    const stack = new Stack(app, "RecordingStack", { synthesizer });
    const reader = new Role(stack, "Reader", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    const sourceKmsKey = new Key(stack, "SourceKmsKey");
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [
        Source.asset(source, {
          assetHash: "consumer-controlled-hash",
          assetHashType: AssetHashType.CUSTOM,
          deployTime: true,
          displayName: "public display name",
          readers: [reader],
          sourceKMSKey: sourceKmsKey,
        }),
      ],
      destination: {
        bucket: new Bucket(stack, "Destination"),
      },
      providerLambda: {
        localBuild: testLocalProviderBuild(),
      },
    });
    app.synth();

    expect(synthesizer.fileAssets).toContainEqual(
      expect.objectContaining({
        deployTime: true,
        displayName: "public display name",
        packaging: "zip",
        sourceHash: "92bed59fe2ca72bc089045963143d403c710a3b4dcda487a7131e150613e04ca",
      }),
    );
    Template.fromStack(stack).resourceCountIs("AWS::IAM::Policy", 2);
  });

  test("accepts the upstream shorthand for a caller-controlled custom hash", () => {
    const source = writeFixture({ "index.html": "ok" });
    const explicitType = synthesizeCatalog(source, {
      assetHash: "consumer-controlled-hash",
      assetHashType: AssetHashType.CUSTOM,
    });
    const inferredType = synthesizeCatalog(source, {
      assetHash: "consumer-controlled-hash",
    });

    expect(inferredType.assetHash).toBe(explicitType.assetHash);
  });
});

function typecheckCatalogedOptions(): void {
  const bundling = {} as AssetOptions["bundling"];
  // @ts-expect-error cataloged assets reject bundling at compile time
  Source.asset("directory", { embeddedCatalog: true, bundling });
  // @ts-expect-error cataloged assets reject symlink following at compile time
  Source.asset("directory", { followSymlinks: SymlinkFollowMode.NEVER });
  Source.asset("directory", { embeddedCatalog: false, bundling });
  Source.asset("directory", {
    embeddedCatalog: false,
    followSymlinks: SymlinkFollowMode.NEVER,
  });
}

void typecheckCatalogedOptions;
