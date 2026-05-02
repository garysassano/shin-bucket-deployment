import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { IgnoreStrategy } from "aws-cdk-lib";
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
import { ValidationError } from "aws-cdk-lib/core/lib/errors";
import type { lit } from "aws-cdk-lib/core/lib/private/literal-string";
import type { Construct } from "constructs";

const CATALOG_PATH = ".s3-unspool/catalog.v1.json";
const CATALOG_VERSION = 1;
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION_NEEDED_DEFLATE = 20;
const ZIP_COMPRESSION_DEFLATE = 8;

export interface CatalogedAssetOptions extends AssetOptions {
  /**
   * Include the embedded `.s3-unspool/catalog.v1.json` optimization catalog.
   * @default true
   */
  readonly embeddedCatalog?: boolean;
}

export class Source {
  public static bucket(bucket: IBucket, zipObjectKey: string): ISource {
    return CdkSource.bucket(bucket, zipObjectKey);
  }

  public static asset(path: string, options?: CatalogedAssetOptions): ISource {
    if (options?.embeddedCatalog === false) {
      return CdkSource.asset(path, options);
    }

    return {
      bind(scope: Construct, context?: DeploymentSourceContext): SourceConfig {
        if (!context) {
          throw new ValidationError(
            literalString("RustBucketDeploymentCatalogedSourceContext"),
            "To use Source.asset(), context must be provided",
            scope,
          );
        }

        const sourcePath = resolve(path);
        if (!existsSync(sourcePath)) {
          throw new ValidationError(
            literalString("RustBucketDeploymentCatalogedSourceMissing"),
            `Asset path does not exist: ${sourcePath}`,
            scope,
          );
        }

        if (!statSync(sourcePath).isDirectory()) {
          return CdkSource.asset(path, options).bind(scope, context);
        }

        const zipPath = buildCatalogedAssetZip(sourcePath, options);
        let id = 1;
        while (scope.node.tryFindChild(`CatalogedAsset${id}`)) {
          id++;
        }
        const asset = new Asset(scope, `CatalogedAsset${id}`, {
          ...options,
          path: zipPath,
          assetHashType: options?.assetHashType,
        });
        asset.grantRead(context.handlerRole as IRole);
        return {
          bucket: asset.bucket,
          zipObjectKey: asset.s3ObjectKey,
        };
      },
    };
  }

  public static data(objectKey: string, data: string, markersConfig?: MarkersConfig): ISource {
    return CdkSource.data(objectKey, data, markersConfig);
  }

  public static jsonData(
    objectKey: string,
    obj: unknown,
    jsonProcessingOptions?: JsonProcessingOptions,
  ): ISource {
    return CdkSource.jsonData(objectKey, obj, jsonProcessingOptions);
  }

  public static yamlData(objectKey: string, obj: unknown): ISource {
    return CdkSource.yamlData(objectKey, obj);
  }

  private constructor() {}
}

interface CatalogEntry {
  path: string;
  md5: string;
}

interface ZipEntryRecord {
  path: string;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function buildCatalogedAssetZip(sourcePath: string, options?: CatalogedAssetOptions): string {
  const tempDir = mkdtempSync(join(tmpdir(), "rust-bucket-deployment-catalog-"));
  const zipPath = join(tempDir, `${basename(sourcePath)}.zip`);

  try {
    if (options?.bundling) {
      throw new Error("Cataloged Source.asset does not currently support asset bundling");
    }
    const files = collectAssetFiles(sourcePath, options);
    const writer = new ZipBufferWriter();
    const records: ZipEntryRecord[] = [];
    const catalogEntries: CatalogEntry[] = [];

    for (const file of files) {
      const bytes = readFileSync(file.absolutePath);
      const md5 = createHash("md5").update(bytes).digest("hex");
      catalogEntries.push({ path: file.zipPath, md5 });
      records.push(writer.writeFile(file.zipPath, bytes));
    }

    const catalog = Buffer.from(
      JSON.stringify({ version: CATALOG_VERSION, entries: catalogEntries }),
      "utf8",
    );
    records.push(writer.writeFile(CATALOG_PATH, catalog));
    writer.close(records);
    writeFileSync(zipPath, writer.toBuffer());

    return zipPath;
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function collectAssetFiles(sourcePath: string, options?: CatalogedAssetOptions) {
  const ignore = IgnoreStrategy.fromCopyOptions(options ?? {}, sourcePath);
  const result: Array<{ absolutePath: string; zipPath: string }> = [];

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory).sort()) {
      const absolutePath = join(directory, entry);
      if (ignore.ignores(absolutePath)) {
        continue;
      }
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        throw new Error(
          `Cataloged Source.asset does not currently follow symlinks: ${absolutePath}`,
        );
      }
      if (stat.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (!stat.isFile()) {
        continue;
      }
      const zipPath = normalizeZipPath(relative(sourcePath, absolutePath));
      if (zipPath === CATALOG_PATH) {
        continue;
      }
      result.push({ absolutePath, zipPath });
    }
  };

  visit(sourcePath);
  result.sort((left, right) => left.zipPath.localeCompare(right.zipPath));
  return result;
}

function normalizeZipPath(path: string): string {
  const normalized = path.split(sep).join("/");
  if (normalized.startsWith("/") || normalized.includes("../") || normalized === "..") {
    throw new Error(`Invalid asset path for ZIP entry: ${path}`);
  }
  return normalized;
}

class ZipBufferWriter {
  private chunks: Buffer[] = [];
  private offset = 0;

  public writeFile(path: string, bytes: Buffer): ZipEntryRecord {
    const pathBytes = Buffer.from(path, "utf8");
    const compressed = deflateRaw(bytes);
    const crc32 = crc32Buffer(bytes);
    const localHeaderOffset = this.offset;
    const localHeader = Buffer.alloc(30 + pathBytes.length);
    let cursor = 0;
    localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, cursor);
    cursor += 4;
    localHeader.writeUInt16LE(ZIP_VERSION_NEEDED_DEFLATE, cursor);
    cursor += 2;
    localHeader.writeUInt16LE(0x0800, cursor);
    cursor += 2;
    localHeader.writeUInt16LE(ZIP_COMPRESSION_DEFLATE, cursor);
    cursor += 2;
    localHeader.writeUInt16LE(0, cursor);
    cursor += 2;
    localHeader.writeUInt16LE(0, cursor);
    cursor += 2;
    localHeader.writeUInt32LE(crc32, cursor);
    cursor += 4;
    localHeader.writeUInt32LE(compressed.length, cursor);
    cursor += 4;
    localHeader.writeUInt32LE(bytes.length, cursor);
    cursor += 4;
    localHeader.writeUInt16LE(pathBytes.length, cursor);
    cursor += 2;
    localHeader.writeUInt16LE(0, cursor);
    cursor += 2;
    pathBytes.copy(localHeader, cursor);

    this.push(localHeader);
    this.push(compressed);

    return {
      path,
      crc32,
      compressedSize: compressed.length,
      uncompressedSize: bytes.length,
      localHeaderOffset,
    };
  }

  public close(records: ZipEntryRecord[]) {
    const centralDirectoryOffset = this.offset;
    for (const record of records) {
      this.push(centralDirectoryRecord(record));
    }
    const centralDirectorySize = this.offset - centralDirectoryOffset;
    const eocd = Buffer.alloc(22);
    let cursor = 0;
    eocd.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, cursor);
    cursor += 4;
    eocd.writeUInt16LE(0, cursor);
    cursor += 2;
    eocd.writeUInt16LE(0, cursor);
    cursor += 2;
    eocd.writeUInt16LE(records.length, cursor);
    cursor += 2;
    eocd.writeUInt16LE(records.length, cursor);
    cursor += 2;
    eocd.writeUInt32LE(centralDirectorySize, cursor);
    cursor += 4;
    eocd.writeUInt32LE(centralDirectoryOffset, cursor);
    cursor += 4;
    eocd.writeUInt16LE(0, cursor);
    this.push(eocd);
  }

  public toBuffer(): Buffer {
    return Buffer.concat(this.chunks, this.offset);
  }

  private push(buffer: Buffer) {
    this.chunks.push(buffer);
    this.offset += buffer.length;
  }
}

function centralDirectoryRecord(record: ZipEntryRecord): Buffer {
  const pathBytes = Buffer.from(record.path, "utf8");
  const buffer = Buffer.alloc(46 + pathBytes.length);
  let cursor = 0;
  buffer.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_SIGNATURE, cursor);
  cursor += 4;
  buffer.writeUInt16LE(0x031e, cursor);
  cursor += 2;
  buffer.writeUInt16LE(ZIP_VERSION_NEEDED_DEFLATE, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0x0800, cursor);
  cursor += 2;
  buffer.writeUInt16LE(ZIP_COMPRESSION_DEFLATE, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0, cursor);
  cursor += 2;
  buffer.writeUInt32LE(record.crc32, cursor);
  cursor += 4;
  buffer.writeUInt32LE(record.compressedSize, cursor);
  cursor += 4;
  buffer.writeUInt32LE(record.uncompressedSize, cursor);
  cursor += 4;
  buffer.writeUInt16LE(pathBytes.length, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0, cursor);
  cursor += 2;
  buffer.writeUInt16LE(0, cursor);
  cursor += 2;
  buffer.writeUInt32LE(0, cursor);
  cursor += 4;
  buffer.writeUInt32LE(record.localHeaderOffset, cursor);
  cursor += 4;
  pathBytes.copy(buffer, cursor);
  return buffer;
}

function deflateRaw(bytes: Buffer): Buffer {
  const { deflateRawSync } = require("node:zlib") as typeof import("node:zlib");
  return deflateRawSync(bytes);
}

const CRC32_TABLE = buildCrc32Table();

function crc32Buffer(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

function literalString(value: string): ReturnType<typeof lit> {
  return value as ReturnType<typeof lit>;
}
