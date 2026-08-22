import type { Stack } from "aws-cdk-lib";
import type { MarkersConfig, SourceConfig } from "aws-cdk-lib/aws-s3-deployment";
import { trustedSourceCatalog } from "./cataloged-source";

export function sourceCatalogs(
  sources: readonly SourceConfig[],
  extract: boolean | undefined,
): Array<Record<string, unknown>> | undefined {
  if (extract === false) {
    return undefined;
  }
  const catalogs = sources.map((source) => trustedSourceCatalog(source));
  if (!catalogs.some((catalog) => catalog !== undefined)) {
    return undefined;
  }
  return catalogs.map((catalog) => catalog ?? {});
}

/**
 * Collects one per-source entry, preserving source order.
 *
 * A single source contributes an entry only when it actually carries one, so
 * the common marker-free deployment sends no array at all. With several
 * sources the arrays must stay index-aligned with `sources` -- the provider
 * pairs `source_markers[i]` and `source_markers_config[i]` with archive `i` --
 * so a source without a value contributes an empty placeholder rather than
 * being skipped.
 *
 * `sourceMarkers` and `sourceMarkersConfig` were byte-identical apart from the
 * field they read, over exactly the two arrays the provider zips together;
 * sharing the walk keeps them from drifting out of alignment independently.
 */
function perSourceEntries<T extends object>(
  sources: readonly SourceConfig[],
  select: (source: SourceConfig) => T | undefined,
): T[] {
  return sources.reduce<T[]>((acc, source) => {
    const value = select(source);
    if (value) {
      acc.push(value);
    } else if (sources.length > 1) {
      acc.push({} as T);
    }
    return acc;
  }, []);
}

export function sourceMarkers(sources: readonly SourceConfig[]): Array<Record<string, unknown>> {
  return perSourceEntries(sources, (source) => source.markers);
}

export function sourceMarkersConfig(sources: readonly SourceConfig[]): MarkersConfig[] {
  return perSourceEntries(sources, (source) => source.markersConfig);
}

export function sourceConfigEqual(stack: Stack, a: SourceConfig, b: SourceConfig): boolean {
  const resolveName = (config: SourceConfig) =>
    JSON.stringify(stack.resolve(config.bucket.bucketName));
  const aCatalog = trustedSourceCatalog(a);
  const bCatalog = trustedSourceCatalog(b);
  return (
    resolveName(a) === resolveName(b) &&
    a.zipObjectKey === b.zipObjectKey &&
    aCatalog?.Version === bCatalog?.Version &&
    aCatalog?.Sha256 === bCatalog?.Sha256 &&
    a.markers === undefined &&
    b.markers === undefined
  );
}
