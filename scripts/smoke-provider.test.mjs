import assert from "node:assert/strict";
import test from "node:test";
import { crc32 } from "node:zlib";
import {
  SMOKE_ENTRIES,
  buildCreateEvent,
  buildSourceZip,
  expectedDestinationKeys,
} from "./smoke-provider.mjs";

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;

/** Minimal ZIP reader sufficient to verify the smoke archive round-trips. */
function readZipEntries(buffer) {
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== ZIP_LOCAL_FILE_HEADER) {
      break;
    }
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const expectedCrc = buffer.readUInt32LE(offset + 14);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.push({ name, method, data, expectedCrc });
    offset = dataStart + compressedSize;
  }
  return entries;
}

test("buildSourceZip produces a valid stored-entry archive", () => {
  const archive = buildSourceZip(SMOKE_ENTRIES);

  const entries = readZipEntries(archive);
  assert.deepEqual(
    entries.map((entry) => entry.name),
    SMOKE_ENTRIES.map((entry) => entry.path),
  );
  for (const [index, entry] of entries.entries()) {
    assert.equal(entry.method, 0, `${entry.name} must be stored, not compressed`);
    const expected = Buffer.from(String(SMOKE_ENTRIES[index].content), "utf8");
    assert.ok(entry.data.equals(expected), `${entry.name} bytes must round-trip`);
    assert.equal(entry.expectedCrc, crc32(expected) >>> 0, `${entry.name} CRC32`);
  }

  const endOffset = archive.length - 22;
  assert.equal(archive.readUInt32LE(endOffset), ZIP_END_OF_CENTRAL_DIRECTORY);
  assert.equal(archive.readUInt16LE(endOffset + 8), SMOKE_ENTRIES.length);
  assert.equal(archive.readUInt16LE(endOffset + 10), SMOKE_ENTRIES.length);

  const centralOffset = archive.readUInt32LE(endOffset + 16);
  assert.equal(archive.readUInt32LE(centralOffset), ZIP_CENTRAL_DIRECTORY_HEADER);
});

test("buildCreateEvent uses the strict provider contract", () => {
  const event = buildCreateEvent();

  assert.equal(event.RequestType, "Create");
  assert.equal(event.ResourceType, "AWS::CloudFormation::CustomResource");
  assert.match(event.ResponseURL, /^https:\/\//);
  assert.equal(event.ResourceProperties.DestinationBucketName, "shin-smoke-destination");
  assert.equal(event.ResourceProperties.SourceBucketNames.length, 1);
  assert.equal(event.ResourceProperties.SourceObjectKeys.length, 1);

  const declared = [
    "DeleteStaleObjectsOnDeployment",
    "DestinationBucketName",
    "DestinationOwnerId",
    "Extract",
    "MaxCompressionRatio",
    "MaxUncompressedEntryBytes",
    "OutputObjectKeys",
    "ServiceToken",
    "SourceBucketNames",
    "SourceObjectKeys",
  ];
  assert.deepEqual(Object.keys(event.ResourceProperties).sort(), declared);
  for (const key of declared) {
    assert.notEqual(event.ResourceProperties[key], undefined, `${key} must be set`);
  }
});

test("the callback response URL passes the provider's host validation shape", () => {
  // The provider only accepts https URLs whose host matches the CloudFormation
  // response bucket/region pattern. The fake `us-east-99` region keeps the
  // host shape valid while making any direct connection fail at DNS.
  const url = new URL(buildCreateEvent().ResponseURL);
  assert.equal(url.protocol, "https:");
  assert.match(url.hostname, /^cloudformation-custom-resource-response-useast99\.s3\./);
  assert.match(url.hostname, /\.amazonaws\.com$/);
  assert.equal(url.port, "");
});

test("expectedDestinationKeys reflects the deployed object set", () => {
  assert.deepEqual(expectedDestinationKeys(SMOKE_ENTRIES), ["assets/app.js", "index.html"]);
});
