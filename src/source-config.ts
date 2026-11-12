import type { Stack } from "aws-cdk-lib";
import { MarkerEncoding, type SourceConfig } from "aws-cdk-lib/aws-s3-deployment";
import { trustedSourceCatalog } from "./cataloged-source";

const MARKER_ENCODINGS: ReadonlySet<string> = new Set(Object.values(MarkerEncoding));

/**
 * One deploy-time substitution as the provider receives it: the marker text,
 * the CloudFormation value that replaces it, and the encoding the provider
 * applies to that value before writing it.
 *
 * Upstream `SourceConfig` spreads this over two parallel per-source arrays and
 * leaves the default encoding (derived from `jsonEscape`) to the handler. Shin
 * resolves the effective encoding here, at synthesis, so every marker states
 * exactly how its value is escaped and the provider receives a single array
 * with no implicit defaults.
 */
export interface WireMarker {
  readonly Marker: string;
  readonly Value: unknown;
  readonly Encoding: MarkerEncoding;
}

/** Whether a bound source carries any deploy-time marker. */
export function hasMarkers(source: SourceConfig): boolean {
  return source.markers !== undefined && Object.keys(source.markers).length > 0;
}

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
 * Renders `SourceMarkers`: one marker list per source, index-aligned with
 * `sources`, or nothing when no source carries a marker.
 *
 * The provider pairs `SourceMarkers[i]` with archive `i`, so once any source
 * has markers, marker-free sources contribute an empty list rather than being
 * skipped. A deployment without markers sends no array at all.
 */
export function sourceMarkers(sources: readonly SourceConfig[]): WireMarker[][] | undefined {
  if (!sources.some(hasMarkers)) {
    return undefined;
  }
  return sources.map(markerEntries);
}

function markerEntries(source: SourceConfig): WireMarker[] {
  return Object.entries(source.markers ?? {}).map(([marker, value]) => ({
    Marker: marker,
    Value: value,
    Encoding: effectiveEncoding(source, marker),
  }));
}

/**
 * The encoding upstream's handler would apply to `marker`: its explicit
 * `markerEncodings` entry, otherwise `UNQUOTED_JSON_VALUE` under `jsonEscape`
 * and `LITERAL` without it.
 */
function effectiveEncoding(source: SourceConfig, marker: string): MarkerEncoding {
  const config = source.markersConfig;
  return (
    config?.markerEncodings?.[marker] ??
    (config?.jsonEscape ? MarkerEncoding.UNQUOTED_JSON_VALUE : MarkerEncoding.LITERAL)
  );
}

/**
 * Synthesis-time messages for markers whose requested encoding the provider
 * does not implement, such as one added by a newer `aws-cdk-lib`. Failing here
 * keeps an unknown encoding from reaching a deployment.
 */
export function unsupportedMarkerEncodings(sources: readonly SourceConfig[]): string[] {
  return sources.flatMap((source, index) =>
    Object.keys(source.markers ?? {})
      .map((marker) => [marker, effectiveEncoding(source, marker)] as const)
      .filter(([, encoding]) => !MARKER_ENCODINGS.has(encoding))
      .map(
        ([marker, encoding]) =>
          `Source ${index} marker ${JSON.stringify(marker)} requests encoding ${JSON.stringify(encoding)}, which ShinBucketDeployment does not support; supported encodings are ${[...MARKER_ENCODINGS].join(", ")}.`,
      ),
  );
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
    !hasMarkers(a) &&
    !hasMarkers(b)
  );
}
