import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { AssetHashType, IgnoreStrategy } from "aws-cdk-lib";
import type { IRole } from "aws-cdk-lib/aws-iam";
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
            literalString("ShinBucketDeploymentCatalogedSourceContext"),
            "Use Source.asset() through ShinBucketDeployment.sources or addSource(); binding a cataloged asset directly requires a deployment source context.",
            scope,
          );
        }

        const sourcePath = resolve(path);
        if (!fs.existsSync(sourcePath)) {
          throw new ValidationError(
            literalString("ShinBucketDeploymentCatalogedSourceMissing"),
            `Asset path does not exist: ${sourcePath}`,
            scope,
          );
        }

        validateCatalogedOptions(scope, options);
        const sourceStat = fs.lstatSync(sourcePath);
        if (sourceStat.isSymbolicLink()) {
          throw new ValidationError(
            literalString("ShinBucketDeploymentCatalogedSourceSymlink"),
            `Cataloged Source.asset does not support symbolic links: ${sourcePath}`,
            scope,
          );
        }
        if (!sourceStat.isDirectory()) {
          if (!sourceStat.isFile()) {
            throw new ValidationError(
              literalString("ShinBucketDeploymentCatalogedSourceRegularFile"),
              `Cataloged Source.asset requires a directory or regular ZIP file: ${sourcePath}`,
              scope,
            );
          }
          const { embeddedCatalog: _, ...assetOptions } = options ?? {};
          return CdkSource.asset(path, assetOptions).bind(scope, context);
        }

        if (scope.node.tryGetContext(DISABLE_ASSET_STAGING_CONTEXT)) {
          throw new ValidationError(
            literalString("ShinBucketDeploymentCatalogedSourceRequiresAssetStaging"),
            `Cataloged Source.asset requires CDK asset staging; remove the ${DISABLE_ASSET_STAGING_CONTEXT} context setting or pass embeddedCatalog:false.`,
            scope,
          );
        }

        const tempDir = fs.mkdtempSync(join(tmpdir(), TEMP_DIRECTORY_PREFIX));
        return withTemporaryDirectory(tempDir, () => {
          const materialized = materializeCatalogedDirectory(sourcePath, tempDir, options);
          let id = 1;
          while (scope.node.tryFindChild(`CatalogedAsset${id}`)) {
            id++;
          }
          const asset = new Asset(scope, `CatalogedAsset${id}`, {
            path: materialized.directory,
            assetHash: options?.assetHash,
            assetHashType: options?.assetHashType,
            readers: options?.readers,
            deployTime: options?.deployTime,
            sourceKMSKey: options?.sourceKMSKey,
            displayName: options?.displayName,
          });
          validateSnapshots(materialized.snapshots);
          asset.grantRead(context.handlerRole as IRole);
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
        });
      },
    };
  }

  /**
   * Deploy one UTF-8 string object, including deploy-time CDK token values.
   *
   * @param objectKey Destination key relative to `destinationKeyPrefix`.
   * @param data Object contents.
   * @param markersConfig Marker replacement options.
   */
  public static data(objectKey: string, data: string, markersConfig?: MarkersConfig): ISource {
    return CdkSource.data(objectKey, data, markersConfig);
  }

  /**
   * Serialize and deploy one JSON object, including deploy-time CDK token values.
   *
   * @param objectKey Destination key relative to `destinationKeyPrefix`.
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
   * @param objectKey Destination key relative to `destinationKeyPrefix`.
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
      literalString("ShinBucketDeploymentCatalogedSourceBundling"),
      "Cataloged Source.asset does not support bundling; pass embeddedCatalog:false to use CDK bundling.",
      scope,
    );
  }
  if (runtimeOptions?.followSymlinks !== undefined) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentCatalogedSourceFollowSymlinks"),
      "Cataloged Source.asset does not support followSymlinks; pass embeddedCatalog:false to use CDK symlink handling.",
      scope,
    );
  }
  if (runtimeOptions?.assetHashType === AssetHashType.OUTPUT) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentCatalogedSourceOutputHash"),
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

  const visit = (directory: string): void => {
    const names = fs.readdirSync(directory).sort(compareUtf8);
    for (const name of names) {
      const absolutePath = join(directory, name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isDirectory()) {
        if (!ignore.completelyIgnores(absolutePath)) {
          visit(absolutePath);
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
  };

  visit(sourcePath);
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

function withTemporaryDirectory<T>(tempDir: string, operation: () => T): T {
  let result: T | undefined;
  let operationError: unknown;
  try {
    result = operation();
  } catch (error) {
    operationError = error;
  }

  let cleanupError: unknown;
  try {
    catalogedSourceFileSystem.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    cleanupError = error;
  }

  if (operationError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [operationError, cleanupError],
      "Cataloged Source.asset construction and temporary-directory cleanup both failed",
    );
  }
  if (operationError !== undefined) {
    throw operationError;
  }
  if (cleanupError !== undefined) {
    throw cleanupError;
  }
  return result as T;
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function literalString(value: string): string {
  return value;
}
