import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32 } from "node:zlib";
import { App, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { afterEach, expect, it } from "vitest";
import { decodeListingKeyZipFixture } from "../scenarios/apps/listing-key-zip-fixture";
import {
  LISTING_EDGE_KEYS,
  LISTING_EXCLUDED_KEY,
  listingKeyBody,
} from "../scenarios/listing-key-fixture";
import { ShinBucketDeployment, Source } from "../src";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

it.each([
  ["filters", ["runtime/listing/"], true],
  ["stale-object-cleanup-initial", ["runtime/listing/keep/", "runtime/listing/stale/"], true],
  ["stale-object-cleanup-updated", ["runtime/listing/keep/"], false],
] as const)(
  "preserves every exact key and body in the %s file asset",
  (phase, prefixes, excluded) => {
    const archivePath = decodeListingKeyZipFixture(phase);
    const archive = readFileSync(archivePath);
    const expected = new Map<string, string>();
    for (const key of LISTING_EDGE_KEYS) {
      for (const prefix of prefixes) expected.set(prefix + key, listingKeyBody(key));
    }
    if (excluded) expected.set(LISTING_EXCLUDED_KEY, "excluded synthetic key\n");
    expect(readStoredZip(archive)).toEqual(expected);
    for (const prefix of prefixes) {
      expect(expected.get(`${prefix}carriage\rreturn.txt`)).not.toEqual(
        expected.get(`${prefix}carriage\nreturn.txt`),
      );
    }

    const outdir = mkdtempSync(join(tmpdir(), "shin-listing-fixture-"));
    directories.push(outdir);
    const app = new App({ outdir });
    const stack = new Stack(app, "Fixture");
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.asset(archivePath)],
      destination: { bucket: new Bucket(stack, "Destination") },
    });
    app.synth();
    const manifest = JSON.parse(readFileSync(join(outdir, "Fixture.assets.json"), "utf8")) as {
      files: Record<string, { source: { path: string; packaging: string } }>;
    };
    const asset = Object.values(manifest.files).find(
      ({ source }) =>
        source.path.endsWith(".zip") && readFileSync(join(outdir, source.path)).equals(archive),
    );
    expect(asset?.source.packaging).toBe("file");
  },
);

// Independent ZIP reader: check central/local agreement, CRC and exact UTF-8 bytes.
function readStoredZip(archive: Buffer): Map<string, string> {
  const end = archive.length - 22;
  expect(archive.readUInt32LE(end)).toBe(0x06054b50);
  const count = archive.readUInt16LE(end + 10);
  let central = archive.readUInt32LE(end + 16);
  const entries = new Map<string, string>();
  for (let index = 0; index < count; index += 1) {
    expect(archive.readUInt32LE(central)).toBe(0x02014b50);
    expect(archive.readUInt16LE(central + 10)).toBe(0);
    const size = archive.readUInt32LE(central + 24);
    expect(archive.readUInt32LE(central + 20)).toBe(size);
    const nameLength = archive.readUInt16LE(central + 28);
    const name = archive.subarray(central + 46, central + 46 + nameLength);
    const local = archive.readUInt32LE(central + 42);
    expect(archive.readUInt32LE(local)).toBe(0x04034b50);
    expect(archive.readUInt16LE(local + 8)).toBe(0);
    expect(archive.readUInt16LE(local + 26)).toBe(nameLength);
    expect(archive.subarray(local + 30, local + 30 + nameLength)).toEqual(name);
    const start = local + 30 + nameLength + archive.readUInt16LE(local + 28);
    const body = archive.subarray(start, start + size);
    expect(archive.readUInt32LE(central + 16)).toBe(crc32(body));
    expect(archive.readUInt32LE(local + 14)).toBe(crc32(body));
    const key = new TextDecoder("utf-8", { fatal: true }).decode(name);
    expect(entries.has(key)).toBe(false);
    entries.set(key, new TextDecoder("utf-8", { fatal: true }).decode(body));
    central +=
      46 + nameLength + archive.readUInt16LE(central + 30) + archive.readUInt16LE(central + 32);
  }
  expect(central).toBe(end);
  return entries;
}
