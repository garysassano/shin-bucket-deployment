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

export function sourceMarkers(sources: readonly SourceConfig[]): Array<Record<string, unknown>> {
  return sources.reduce(
    (acc, source) => {
      if (source.markers) {
        acc.push(source.markers);
      } else if (sources.length > 1) {
        acc.push({});
      }
      return acc;
    },
    [] as Array<Record<string, unknown>>,
  );
}

export function sourceMarkersConfig(sources: readonly SourceConfig[]): MarkersConfig[] {
  return sources.reduce(
    (acc, source) => {
      if (source.markersConfig) {
        acc.push(source.markersConfig);
      } else if (sources.length > 1) {
        acc.push({});
      }
      return acc;
    },
    [] as Array<MarkersConfig>,
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
    a.markers === undefined &&
    b.markers === undefined
  );
}
