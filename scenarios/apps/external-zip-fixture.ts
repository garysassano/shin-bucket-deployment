import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ExternalZipFixture = "info-zip.zip" | "python-force-zip64.zip";

export function decodeExternalZipFixture(name: ExternalZipFixture): string {
  const encodedPath = resolve("rust", "test-fixtures", "external-zips", `${name}.b64`);
  const outputPath = resolve(".verification-assets", "external-zips", name);
  const decoded = Buffer.from(readFileSync(encodedPath, "utf8").trim(), "base64");
  if (!existsSync(outputPath) || !readFileSync(outputPath).equals(decoded)) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, decoded);
  }
  return outputPath;
}
