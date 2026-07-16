import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
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
import { join } from "node:path";
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
import type { AssetOptions } from "aws-cdk-lib/aws-s3-assets";
import { afterEach, describe, expect, test } from "vitest";
import { type CatalogedAssetOptions, ShinBucketDeployment, Source } from "../../src";
import { overrideCatalogedSourceFileSystemForTesting } from "../../src/cataloged-source";
import { testBundling } from "../support/bundling";

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
): SynthesizedCatalog {
  const outdir = tempDirectory("shin-catalog-out-");
  const app = new App({ outdir });
  const stack = new Stack(app, "CatalogStack");
  const destinationBucket = new Bucket(stack, "Destination");
  new ShinBucketDeployment(stack, "Deploy", {
    sources: [Source.asset(sourceDirectory, options)],
    destinationBucket,
    bundling: testBundling(),
    ...deploymentProps,
  });
  const assembly = app.synth();
  const manifest = JSON.parse(
    readFileSync(join(assembly.directory, "CatalogStack.assets.json"), "utf8"),
  ) as { files?: Record<string, ManifestAsset> };
  const manifestAsset = Object.values(manifest.files ?? {}).find((asset) => {
    const path = asset.source?.path;
    return (
      asset.source?.packaging === "zip" &&
      path !== undefined &&
      existsSync(join(assembly.directory, path, ".shin", "catalog.v1.json"))
    );
  });
  if (!manifestAsset?.source?.path) {
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

  test("leaves the scratch-directory set unchanged on success and ordinary failure", () => {
    const before = scratchDirectories();
    synthesizeCatalog(writeFixture({ "index.html": "ok" }));
    expect(scratchDirectories()).toEqual(before);

    const invalid = writeFixture({ "index.html": "ok" });
    symlinkSync("index.html", join(invalid, "link.html"));
    expect(() => synthesizeCatalog(invalid)).toThrow(/symbolic links/);
    expect(scratchDirectories()).toEqual(before);
  });

  test("surfaces cleanup errors and aggregates them with construction errors", () => {
    const originalRemove = require("node:fs").rmSync as typeof import("node:fs").rmSync;
    const cleanupError = new Error("induced cleanup failure");
    restoreFileSystem = overrideCatalogedSourceFileSystemForTesting({
      rmSync: (path, options) => {
        if (String(path).includes(SCRATCH_PREFIX)) {
          throw cleanupError;
        }
        return originalRemove(path, options);
      },
    });

    expect(() => synthesizeCatalog(writeFixture({ "index.html": "ok" }))).toThrow(cleanupError);

    const invalid = writeFixture({ "index.html": "ok" });
    symlinkSync("index.html", join(invalid, "link.html"));
    try {
      synthesizeCatalog(invalid);
      throw new Error("expected catalog synthesis to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toHaveLength(2);
    }

    restoreFileSystem();
    restoreFileSystem = undefined;
    for (const entry of scratchDirectories()) {
      cleanupPaths.add(join(tmpdir(), entry));
    }
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
          destinationBucket,
          bundling: testBundling(),
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
        destinationBucket: new Bucket(stack, "Destination"),
        bundling: testBundling(),
      });
    };

    expect(() =>
      destination({ bundling: { image: {} } } as unknown as CatalogedAssetOptions),
    ).toThrow(/does not support bundling/);
    expect(() =>
      destination({ followSymlinks: SymlinkFollowMode.NEVER } as unknown as CatalogedAssetOptions),
    ).toThrow(/does not support followSymlinks/);
    expect(() => destination({ assetHashType: AssetHashType.OUTPUT })).toThrow(
      /does not support AssetHashType\.OUTPUT/,
    );
  });

  test("aligns mixed trusted sources and omits bindings when none can be used", () => {
    const trustedSource = writeFixture({ "trusted.txt": "trusted" });
    const stack = new Stack();
    const sourceBucket = new Bucket(stack, "SourceBucket");
    const destinationBucket = new Bucket(stack, "Destination");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.bucket(sourceBucket, "plain.zip"), Source.asset(trustedSource)],
      destinationBucket,
      bundling: testBundling(),
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
      destinationBucket: new Bucket(untrustedStack, "Destination"),
      bundling: testBundling(),
    });
    expect(customResourceProperties(untrustedStack).SourceCatalogs).toBeUndefined();

    const copyStack = new Stack();
    new ShinBucketDeployment(copyStack, "Deploy", {
      sources: [Source.asset(trustedSource)],
      destinationBucket: new Bucket(copyStack, "Destination"),
      extract: false,
      bundling: testBundling(),
    });
    expect(customResourceProperties(copyStack).SourceCatalogs).toBeUndefined();
  });

  test("keeps equal asset keys with different catalog bindings distinct", () => {
    const first = writeFixture({ "index.html": "first" });
    const second = writeFixture({ "index.html": "second" });
    const stack = new Stack();
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(first, { assetHash: "shared", assetHashType: AssetHashType.CUSTOM })],
      destinationBucket: new Bucket(stack, "Destination"),
      bundling: testBundling(),
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
      destinationBucket: new Bucket(stack, "Destination"),
      bundling: testBundling(),
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
      destinationBucket: new Bucket(stack, "Destination"),
      bundling: testBundling(),
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
