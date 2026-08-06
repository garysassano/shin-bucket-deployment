import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { AssetHashType, AssetStaging, IgnoreStrategy } from "aws-cdk-lib";
import type { IBucket } from "aws-cdk-lib/aws-s3";
import { Asset, type AssetOptions } from "aws-cdk-lib/aws-s3-assets";
import {
  Source as CdkSource,
  type DeploymentSourceContext,
  type ISource,
  type JsonProcessingOptions,
  type MarkersConfig,
  type SourceConfig,
} from "aws-cdk-lib/aws-s3-deployment";
import { DISABLE_ASSET_STAGING_CONTEXT } from "aws-cdk-lib/cx-api";
import type { Construct } from "constructs";
import { ValidationError } from "./errors";

const CATALOG_PATH = ".shin/catalog.v1.json";
const RESERVED_CATALOG_PATHS = new Set([CATALOG_PATH, ".shin/catalog.v2.json"]);
const CATALOG_VERSION = 1;
const CATALOG_MAX_BYTES = 64 * 1024 * 1024;
const FILE_READ_BYTES = 64 * 1024;
const TEMP_DIRECTORY_PREFIX = "shin-bucket-deployment-catalog-";
const LINK_COPY_FALLBACK_ERRORS = new Set([
  "EACCES",
  "EMLINK",
  "ENOSYS",
  "ENOTSUP",
  "EOPNOTSUPP",
  "EPERM",
  "EXDEV",
]);

// CDK's `AssetStaging` keeps a process-global cache keyed by the staged source
// path (plus hash options). Cataloged materialization must therefore stage at a
// *deterministic* path per source directory, or every bind would miss that
// cache and re-walk, re-hash, and re-copy the tree. The path is keyed by the
// resolved source path and the options that change the materialized tree
// (`exclude` / `ignoreMode`), and is scoped to this process so concurrent
// processes (test workers, parallel synthesizers) cannot interleave wipes of
// the same directory.
const nextCatalogedAssetIds = new WeakMap<Construct, number>();

// CDK's `AssetStaging` cache is keyed by staged path + options only, not by
// content. The deterministic staging directory makes that cache hit across
// binds of an unchanged tree (the TS-P1 win), but a tree that changed between
// binds in one process would otherwise serve the previous bind's stale hash
// and staged ZIP. The catalog SHA-256 covers every materialized byte, so a
// change is detected by comparing it with the last bind's value; on change,
// the process-global asset cache is dropped before staging.
const lastCatalogShaByStagingDirectory = new Map<string, string>();

interface CatalogedSourceFileSystem {
  readonly linkSync: typeof fs.linkSync;
  readonly readSync: typeof fs.readSync;
  readonly rmSync: typeof fs.rmSync;
}

let catalogedSourceFileSystem: CatalogedSourceFileSystem = {
  linkSync: fs.linkSync,
  readSync: fs.readSync,
  rmSync: fs.rmSync,
};

interface TrustedSourceCatalog {
  readonly Version: 1;
  readonly Sha256: string;
}

const trustedSourceCatalogs = new WeakMap<SourceConfig, TrustedSourceCatalog>();

/** @internal */
export function trustedSourceCatalog(config: SourceConfig): TrustedSourceCatalog | undefined {
  return trustedSourceCatalogs.get(config);
}

/** @internal */
export function overrideCatalogedSourceFileSystemForTesting(
  overrides: Partial<CatalogedSourceFileSystem>,
): () => void {
  const previous = catalogedSourceFileSystem;
  catalogedSourceFileSystem = { ...catalogedSourceFileSystem, ...overrides };
  return () => {
    catalogedSourceFileSystem = previous;
  };
}

type CatalogedOptions = Omit<AssetOptions, "bundling" | "followSymlinks"> & {
  /**
   * Include and authenticate the embedded `.shin/catalog.v1.json` optimization catalog.
   * @default true
   */
  readonly embeddedCatalog?: true;
  readonly bundling?: never;
  readonly followSymlinks?: never;
};

type UpstreamAssetOptions = AssetOptions & {
  /**
   * Delegate the asset directly to the upstream CDK asset implementation.
   */
  readonly embeddedCatalog: false;
};

export type CatalogedAssetOptions = CatalogedOptions | UpstreamAssetOptions;

/**
 * Deployment source helpers compatible with `aws-cdk-lib/aws-s3-deployment`.
 *
 * Bucket, data, JSON, and YAML sources delegate directly to CDK. Directory
 * assets additionally use Shin's authenticated catalog by default; any
 * upstream `ISource` can still be passed to `ShinBucketDeployment` without
 * using this class.
 */
export class Source {
  /**
   * Use a ZIP archive already stored in S3.
   *
   * The source delegates to CDK and does not claim an authenticated Shin
   * catalog. Ensure the provider role can read the source bucket and its KMS
   * key, when applicable.
   *
   * @param bucket Bucket containing the source ZIP.
   * @param zipObjectKey Object key of the source ZIP.
   */
  public static bucket(bucket: IBucket, zipObjectKey: string): ISource {
    return CdkSource.bucket(bucket, zipObjectKey);
  }

  /**
   * Use a local directory or ZIP archive as a deployment source.
   *
   * Local directories include an authenticated `.shin/catalog.v1.json` by
   * default. Cataloged packaging requires CDK asset staging, rejects symlinks
   * and non-regular files, does not run CDK bundling, and changes the staged
   * ZIP bytes compared with upstream packaging. Pass `embeddedCatalog:false`
   * to delegate packaging to CDK when bundling or symlink handling is needed;
   * that fallback remains deployable but cannot use trusted catalog skips.
   * Local ZIP files always delegate to CDK and must come from a trusted
   * producer.
   *
   * @param path Path to a local directory or ZIP archive.
   * @param options Asset and authenticated-catalog options.
   */
  public static asset(path: string, options?: CatalogedAssetOptions): ISource {
    if (options?.embeddedCatalog === false) {
      const { embeddedCatalog: _, ...assetOptions } = options;
      return CdkSource.asset(path, assetOptions);
    }

    return {
      bind(scope: Construct, context?: DeploymentSourceContext): SourceConfig {
        if (!context) {
          throw new ValidationError(
            "ShinBucketDeploymentCatalogedSourceContext",
            "Use Source.asset() through ShinBucketDeployment.sources or addSource(); binding a cataloged asset directly requires a deployment source context.",
            scope,
          );
        }

        const sourcePath = resolve(path);
        if (!fs.existsSync(sourcePath)) {
          throw new ValidationError(
            "ShinBucketDeploymentCatalogedSourceMissing",
            `Asset path does not exist: ${sourcePath}`,
            scope,
          );
        }

        validateCatalogedOptions(scope, options);
        const sourceStat = fs.lstatSync(sourcePath);
        if (sourceStat.isSymbolicLink()) {
          throw new ValidationError(
            "ShinBucketDeploymentCatalogedSourceSymlink",
            `Cataloged Source.asset does not support symbolic links: ${sourcePath}`,
            scope,
          );
        }
        if (!sourceStat.isDirectory()) {
          if (!sourceStat.isFile()) {
            throw new ValidationError(
              "ShinBucketDeploymentCatalogedSourceRegularFile",
              `Cataloged Source.asset requires a directory or regular ZIP file: ${sourcePath}`,
              scope,
            );
          }
          const { embeddedCatalog: _, ...assetOptions } = options ?? {};
          return CdkSource.asset(path, assetOptions).bind(scope, context);
        }

        if (scope.node.tryGetContext(DISABLE_ASSET_STAGING_CONTEXT)) {
          throw new ValidationError(
            "ShinBucketDeploymentCatalogedSourceRequiresAssetStaging",
            `Cataloged Source.asset requires CDK asset staging; remove the ${DISABLE_ASSET_STAGING_CONTEXT} context setting or pass embeddedCatalog:false.`,
            scope,
          );
        }

        const stagingDirectory = catalogedSourceStagingDirectory(sourcePath, options);
        // Wipe the previous materialization first so files removed or renamed in
        // the source tree cannot linger in the staged directory. The directory
        // itself is deliberately kept (it is the AssetStaging cache key); only
        // its contents are refreshed per bind.
        catalogedSourceFileSystem.rmSync(stagingDirectory, { recursive: true, force: true });
        const materialized = materializeCatalogedDirectory(sourcePath, stagingDirectory, options);
        const previousCatalogSha = lastCatalogShaByStagingDirectory.get(stagingDirectory);
        if (previousCatalogSha !== undefined && previousCatalogSha !== materialized.catalogSha256) {
          // The tree changed since the last bind of this staging directory;
          // drop CDK's process-global asset cache so the Asset below cannot
          // reuse the stale hash and staged ZIP.
          AssetStaging.clearAssetHashCache();
        }
        lastCatalogShaByStagingDirectory.set(stagingDirectory, materialized.catalogSha256);
        const asset = new Asset(scope, `CatalogedAsset${nextCatalogedAssetId(scope)}`, {
          path: materialized.directory,
          assetHash: options?.assetHash,
          assetHashType: options?.assetHashType,
          readers: options?.readers,
          deployTime: options?.deployTime,
          sourceKMSKey: options?.sourceKMSKey,
          displayName: options?.displayName,
        });
        validateSnapshots(materialized.snapshots);
        asset.grantRead(context.handlerRole);
        const config: SourceConfig = {
          bucket: asset.bucket,
          zipObjectKey: asset.s3ObjectKey,
        };
        trustedSourceCatalogs.set(
          config,
          Object.freeze({
            Version: CATALOG_VERSION,
            Sha256: materialized.catalogSha256,
          }),
        );
        return config;
      },
    };
  }

  /**
   * Deploy one UTF-8 string object, including deploy-time CDK token values.
   *
   * @param objectKey Destination key relative to `destination.keyPrefix`.
   * @param data Object contents.
   * @param markersConfig Marker replacement options.
   */
  public static data(objectKey: string, data: string, markersConfig?: MarkersConfig): ISource {
    return CdkSource.data(objectKey, data, markersConfig);
  }

  /**
   * Serialize and deploy one JSON object, including deploy-time CDK token values.
   *
   * @param objectKey Destination key relative to `destination.keyPrefix`.
   * @param obj JSON-serializable value.
   * @param jsonProcessingOptions JSON token-processing options.
   */
  public static jsonData(
    objectKey: string,
    obj: unknown,
    jsonProcessingOptions?: JsonProcessingOptions,
  ): ISource {
    return CdkSource.jsonData(objectKey, obj, jsonProcessingOptions);
  }

  /**
   * Serialize and deploy one YAML object, including deploy-time CDK token values.
   *
   * @param objectKey Destination key relative to `destination.keyPrefix`.
   * @param obj JSON-serializable value to format as YAML.
   */
  public static yamlData(objectKey: string, obj: unknown): ISource {
    return CdkSource.yamlData(objectKey, obj);
  }

  private constructor() {}
}

interface CatalogEntry {
  readonly path: string;
  readonly size: number;
  readonly md5: string;
}

interface SourceFile {
  readonly absolutePath: string;
  readonly catalogPath: string;
}

interface StableFileMetadata {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly mode: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
}

interface FileSnapshot {
  readonly sourcePath: string;
  readonly materializedPath: string;
  readonly source: StableFileMetadata;
  readonly materialized: StableFileMetadata;
}

interface MaterializedDirectory {
  readonly directory: string;
  readonly catalogSha256: string;
  readonly snapshots: FileSnapshot[];
}

function validateCatalogedOptions(scope: Construct, options?: CatalogedOptions): void {
  const runtimeOptions = options as AssetOptions | undefined;
  if (runtimeOptions?.bundling) {
    throw new ValidationError(
      "ShinBucketDeploymentCatalogedSourceBundling",
      "Cataloged Source.asset does not support bundling; pass embeddedCatalog:false to use CDK bundling.",
      scope,
    );
  }
  if (runtimeOptions?.followSymlinks !== undefined) {
    throw new ValidationError(
      "ShinBucketDeploymentCatalogedSourceFollowSymlinks",
      "Cataloged Source.asset does not support followSymlinks; pass embeddedCatalog:false to use CDK symlink handling.",
      scope,
    );
  }
  if (runtimeOptions?.assetHashType === AssetHashType.OUTPUT) {
    throw new ValidationError(
      "ShinBucketDeploymentCatalogedSourceOutputHash",
      "Cataloged Source.asset does not support AssetHashType.OUTPUT because cataloged assets are not bundled.",
      scope,
    );
  }
}

function materializeCatalogedDirectory(
  sourcePath: string,
  tempDir: string,
  options?: CatalogedOptions,
): MaterializedDirectory {
  const directory = join(tempDir, "asset");
  // The deterministic staging parent is kept across binds but wiped at the
  // start of each bind, so it may not exist on the first bind (or after an
  // OS temp cleanup). Create it explicitly so the parent matches the 0o700
  // asset subdirectory (a recursive mkdir alone would leave the parent at the
  // umask default; the hard-linked copies themselves live in the 0o700 leaf,
  // so this is parity with the old mkdtempSync behavior rather than a content
  // exposure fix).
  fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(directory, { mode: 0o700 });
  const files = collectAssetFiles(sourcePath, options);
  const readBuffer = Buffer.allocUnsafe(FILE_READ_BYTES);
  const catalogEntries: CatalogEntry[] = [];
  const snapshots: FileSnapshot[] = [];

  for (const file of files) {
    const destinationPath = join(directory, ...file.catalogPath.split("/"));
    fs.mkdirSync(dirname(destinationPath), { recursive: true, mode: 0o700 });
    const sourceBefore = requireRegularFile(file.absolutePath, "source");
    materializeFile(file.absolutePath, destinationPath);
    const materializedBefore = requireRegularFile(destinationPath, "materialized");
    const { bytes, md5 } = hashFile(destinationPath, readBuffer);
    const sourceAfter = requireRegularFile(file.absolutePath, "source");
    const materializedAfter = requireRegularFile(destinationPath, "materialized");

    requireUnchanged(file.absolutePath, sourceBefore, sourceAfter);
    requireUnchanged(destinationPath, materializedBefore, materializedAfter);
    if (bytes !== materializedAfter.size) {
      throw new Error(
        `Cataloged Source.asset file size changed while hashing: ${file.absolutePath}`,
      );
    }
    if (bytes > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(
        `Cataloged Source.asset file is too large to represent safely: ${file.absolutePath}`,
      );
    }

    catalogEntries.push({ path: file.catalogPath, size: Number(bytes), md5 });
    snapshots.push({
      sourcePath: file.absolutePath,
      materializedPath: destinationPath,
      source: sourceAfter,
      materialized: materializedAfter,
    });
  }

  const catalogSha256 = writeCatalog(directory, catalogEntries);
  return { directory, catalogSha256, snapshots };
}

function collectAssetFiles(sourcePath: string, options?: CatalogedOptions): SourceFile[] {
  const ignore = IgnoreStrategy.fromCopyOptions(options ?? {}, sourcePath);
  const result: SourceFile[] = [];
  const normalizedPaths = new Map<string, string>();

  // Iterative walk: recursion depth would otherwise track directory nesting
  // depth, which is unbounded for adversarial or generated trees.
  const pendingDirectories: string[] = [sourcePath];
  while (pendingDirectories.length > 0) {
    const directory = pendingDirectories.pop() as string;
    const names = fs.readdirSync(directory).sort(compareUtf8);
    for (const name of names) {
      const absolutePath = join(directory, name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isDirectory()) {
        if (!ignore.completelyIgnores(absolutePath)) {
          pendingDirectories.push(absolutePath);
        }
        continue;
      }
      if (ignore.ignores(absolutePath)) {
        continue;
      }
      if (stat.isSymbolicLink()) {
        throw new Error(`Cataloged Source.asset does not support symbolic links: ${absolutePath}`);
      }
      if (!stat.isFile()) {
        throw new Error(`Cataloged Source.asset only supports regular files: ${absolutePath}`);
      }

      const catalogPath = normalizeCatalogPath(relative(sourcePath, absolutePath));
      if (RESERVED_CATALOG_PATHS.has(catalogPath)) {
        throw new Error(`Cataloged Source.asset input uses reserved metadata path: ${catalogPath}`);
      }
      const collision = normalizedPaths.get(catalogPath);
      if (collision !== undefined) {
        throw new Error(
          `Cataloged Source.asset paths normalize to the same entry: ${collision} and ${absolutePath}`,
        );
      }
      normalizedPaths.set(catalogPath, absolutePath);
      result.push({ absolutePath, catalogPath });
    }
  }

  result.sort((left, right) => compareUtf8(left.catalogPath, right.catalogPath));
  return result;
}

function normalizeCatalogPath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const parts: string[] = [];
  for (const part of normalized.split("/")) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      throw new Error(`Invalid asset path for catalog entry: ${path}`);
    }
    parts.push(part);
  }
  if (parts.length === 0) {
    throw new Error(`Invalid empty asset path for catalog entry: ${path}`);
  }
  return parts.join("/");
}

function materializeFile(sourcePath: string, destinationPath: string): void {
  try {
    catalogedSourceFileSystem.linkSync(sourcePath, destinationPath);
  } catch (error) {
    if (!isLinkFallbackError(error)) {
      throw error;
    }
    fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
  }
}

function isLinkFallbackError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    LINK_COPY_FALLBACK_ERRORS.has(error.code)
  );
}

function hashFile(path: string, buffer: Buffer): { bytes: bigint; md5: string } {
  const md5 = createHash("md5");
  const fd = fs.openSync(path, fs.constants.O_RDONLY);
  let bytes = 0n;
  try {
    for (;;) {
      const read = catalogedSourceFileSystem.readSync(fd, buffer, 0, buffer.length, null);
      if (read === 0) {
        break;
      }
      md5.update(buffer.subarray(0, read));
      bytes += BigInt(read);
    }
  } finally {
    fs.closeSync(fd);
  }
  return { bytes, md5: md5.digest("hex") };
}

function writeCatalog(directory: string, entries: CatalogEntry[]): string {
  const catalogDirectory = join(directory, ".shin");
  fs.mkdirSync(catalogDirectory, { recursive: true, mode: 0o700 });
  const catalogPath = join(directory, ...CATALOG_PATH.split("/"));
  const fd = fs.openSync(
    catalogPath,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    0o600,
  );
  const sha256 = createHash("sha256");
  let catalogBytes = 0;

  const append = (value: string): void => {
    const bytes = Buffer.from(value, "utf8");
    if (catalogBytes + bytes.length > CATALOG_MAX_BYTES) {
      throw new Error(`Cataloged Source.asset catalog exceeds the ${CATALOG_MAX_BYTES} byte limit`);
    }
    let offset = 0;
    while (offset < bytes.length) {
      offset += fs.writeSync(fd, bytes, offset, bytes.length - offset);
    }
    sha256.update(bytes);
    catalogBytes += bytes.length;
  };

  try {
    append(`{"version":${CATALOG_VERSION},"entries":[`);
    entries.forEach((entry, index) => {
      if (index > 0) {
        append(",");
      }
      append(`{"path":${JSON.stringify(entry.path)},"size":${entry.size},"md5":"${entry.md5}"}`);
    });
    append("]}");
  } finally {
    fs.closeSync(fd);
  }

  return sha256.digest("hex");
}

function requireRegularFile(path: string, label: string): StableFileMetadata {
  const stat = fs.lstatSync(path, { bigint: true });
  if (!stat.isFile()) {
    throw new Error(`Cataloged Source.asset ${label} is not a regular file: ${path}`);
  }
  return stableMetadata(stat);
}

function stableMetadata(stat: fs.BigIntStats): StableFileMetadata {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
  };
}

function requireUnchanged(
  path: string,
  before: StableFileMetadata,
  after: StableFileMetadata,
): void {
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.mode !== after.mode ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs
  ) {
    throw new Error(`Cataloged Source.asset file changed while hashing or staging: ${path}`);
  }
}

function validateSnapshots(snapshots: FileSnapshot[]): void {
  for (const snapshot of snapshots) {
    requireUnchanged(
      snapshot.sourcePath,
      snapshot.source,
      requireRegularFile(snapshot.sourcePath, "source"),
    );
    requireUnchanged(
      snapshot.materializedPath,
      snapshot.materialized,
      requireRegularFile(snapshot.materializedPath, "materialized"),
    );
  }
}

/**
 * Deterministic staging directory for one cataloged source.
 *
 * Keyed by the resolved source path and the options that change the
 * materialized tree (`exclude`, `ignoreMode`), so repeated binds of the same
 * source land at the same path and hit CDK's process-global `AssetStaging`
 * cache instead of re-walking, re-hashing, and re-copying the tree. Scoped to
 * this process so concurrent processes cannot interleave materialization.
 *
 * @internal
 */
export function catalogedSourceStagingDirectory(
  sourcePath: string,
  options?: CatalogedOptions,
): string {
  const key = JSON.stringify({
    sourcePath,
    exclude: [...(options?.exclude ?? [])].sort(),
    ignoreMode: options?.ignoreMode,
  });
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return join(tmpdir(), `${TEMP_DIRECTORY_PREFIX}${process.pid}-${digest}`);
}

function nextCatalogedAssetId(scope: Construct): number {
  const next = (nextCatalogedAssetIds.get(scope) ?? 0) + 1;
  nextCatalogedAssetIds.set(scope, next);
  return next;
}

function compareUtf8(left: string, right: string): number {
  // String comparison orders UTF-16 code units. That agrees with code-point
  // order (and therefore with UTF-8 byte order) for ASCII, BMP characters
  // below U+E000, and astral planes, but diverges for BMP characters in
  // U+E000–U+FFFF versus astral characters (a high surrogate 0xD800–0xDBFF
  // sorts below e.g. U+FFFD in UTF-16 while its code point sorts above). The
  // previous Buffer-per-comparison form produced true UTF-8 byte order at the
  // cost of two allocations per comparison. The catalog is consumed as a
  // SHA-verified blob, so only the exact sort of such mixed trees differs;
  // both orderings are deterministic. The lone-surrogate case (invalid UTF-8
  // filename) behaves the same way: Buffer.from would replace the surrogate
  // with U+FFFD, while string comparison keeps the surrogate value.
  return left < right ? -1 : left > right ? 1 : 0;
}
