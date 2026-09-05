import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ListingKeyZipFixture =
  | "filters"
  | "stale-object-cleanup-initial"
  | "stale-object-cleanup-updated";

/** Prebuilt ZIPs preserve CR/LF names that the CDK CLI directory glob omits. */
export function decodeListingKeyZipFixture(name: ListingKeyZipFixture): string {
  const encodedPath = resolve("scenarios", "fixtures", "listing-keys", `${name}.zip.b64`);
  const outputPath = resolve(".verification-assets", "listing-keys", `${name}.zip`);
  const decoded = Buffer.from(readFileSync(encodedPath, "utf8").trim(), "base64");
  if (!existsSync(outputPath) || !readFileSync(outputPath).equals(decoded)) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, decoded);
  }
  return outputPath;
}
