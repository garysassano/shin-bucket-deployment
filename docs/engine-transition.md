# Engine Transition

This document records the provider engine change from temporary-file ZIP handling
to ranged, no-disk ZIP handling, and explains how that relates to the
`s3-unspool` architecture.

## Before

For `extract=true`, the provider used this runtime shape:

1. Download each source ZIP from S3 with `GetObject`.
2. Write the full ZIP to Lambda `/tmp`.
3. Open `ZipArchive` from the temporary file.
4. Walk ZIP entries and build the deployment manifest.
5. List the destination prefix once with `ListObjectsV2`.
6. For each planned ZIP entry, reopen the temporary archive file.
7. Use CRC32 checksum metadata, or fall back to local MD5 hashing, to decide whether to skip.
8. Stream changed entries to S3 from the temporary archive file.

This avoided extracting every file to disk, but it still required the whole ZIP to
fit in Lambda ephemeral storage and it reread the archive from `/tmp` during
hashing and uploads.

## After

For `extract=true`, the provider now uses this runtime shape:

1. Read source ZIP metadata with `HeadObject`.
2. Read the ZIP central directory through ranged S3 `GetObject` requests.
3. Walk central-directory entries and build the deployment manifest.
4. List the destination prefix once with `ListObjectsV2`.
5. Use the existing CRC32 checksum metadata path, or ranged MD5 fallback, to decide whether to skip.
6. Stream changed entries to S3 from ranged source reads without storing the full ZIP.

This removes Lambda `/tmp` from the extract path and removes the requirement for
the full source ZIP to fit in Lambda memory. Replacement-expanded entries still
must fit in memory because their final bytes must be known after marker
substitution.

The implementation uses a shared coalesced source block store for extraction
work. Planned entries are converted into source byte blocks, adjacent spans are
merged across small gaps, and entry readers consume slices from the shared block
store instead of each reader issuing independent range requests.
## Taken From s3-unspool

The change intentionally adopts these `s3-unspool` ideas:

- Avoid writing the source archive to local disk.
- Avoid loading the full source archive into memory.
- Read ZIP central-directory metadata through ranged S3 reads.
- Treat the ZIP as the deployment source instead of extracting a working directory.
- Reopen entry streams from S3 ranges so upload bodies are retryable.
- Use separate S3 clients for source reads and destination writes.
- Coalesce adjacent source entry spans into shared source blocks.
- Use conditional `PutObject` writes for extracted uploads.
- Preserve bounded per-entry streaming for marker-free uploads instead of materializing every output file.
- Keep the destination listing as the central comparison input.

These were good fits for the current custom resource because they improve the
engine without changing the CDK-facing API.

## Not Taken

These `s3-unspool` behaviors were not implemented in this step:

| Behavior | Why not taken now | Cost |
| --- | --- | --- |
| Embedded `.s3-unspool/catalog.v1.json` MD5 catalog | CDK `Source.asset`, `Source.data`, JSON, and YAML sources are currently produced by CDK asset packaging. Adding a catalog means changing or wrapping asset production, not just the Lambda handler. | Costly for sparse unchanged updates because unchanged entries may still need checksum `HeadObject` or MD5 fallback work. |
| Metadata-only skip from catalog MD5 and destination ETag | This depends on the embedded catalog above. | Costly when many files are unchanged and no S3 CRC32 metadata is usable. |

## Embedded Catalog Problem

The `.s3-unspool/catalog.v1.json` file is an embedded manifest inside the source
ZIP. It stores the MD5 of each file's final uncompressed bytes:

```json
{
  "version": 1,
  "entries": [
    { "path": "index.html", "md5": "eacf331f0ffc35d4b482f1d15a887d3b" },
    { "path": "assets/app.js", "md5": "9a0364b9e99bb480dd25e1f0284c8555" }
  ]
}
```

This matters because normal S3 single-part object ETags are MD5 hashes. If the
catalog says `index.html` has MD5 `abc...` and `ListObjectsV2` says the existing
destination object has ETag `abc...`, the extractor can skip `index.html`
without reading or decompressing that ZIP entry.

ZIP metadata alone cannot provide that comparison. The ZIP central directory
contains each entry's CRC32 and uncompressed size, not its MD5. CRC32 cannot be
converted into MD5. To compute MD5, the extractor must read the actual
uncompressed file bytes, which means reading and decompressing the ZIP entry.

The catalog avoids that deploy-time work only because it is created earlier,
when the ZIP is packaged. At packaging time, the packager reads the original
local files before compression. It can compute MD5 while streaming each file into
the ZIP, collect `{ path, md5 }` records, and then append
`.s3-unspool/catalog.v1.json` as another ZIP entry.

```text
Packaging time:
  local file bytes -> compute MD5 -> write file into ZIP -> record path + MD5
  after all files -> write .s3-unspool/catalog.v1.json into ZIP

Deployment time:
  range-read ZIP central directory -> locate catalog entry
  range-read and decompress only the small catalog entry
  compare catalog MD5s with destination ETags from ListObjectsV2
  skip unchanged entries without decompressing them
```

The problem for this CDK construct is that the source ZIPs are currently produced
by CDK asset packaging through `Source.asset`, `Source.data`, `Source.jsonData`,
and `Source.yamlData`. Those ZIPs do not include the `s3-unspool` catalog. Once
the Lambda provider receives a normal ZIP without the catalog, it is too late to
derive the missing MD5 manifest cheaply. The Lambda would have to decompress and
hash entries, which is exactly the work the catalog is meant to avoid.

There is also a CDK-specific complication: deploy-time marker replacement changes
the bytes after packaging. A catalog produced from the original packaged file
would describe the pre-replacement bytes, not the final uploaded bytes. Catalog
skipping is therefore straightforward for marker-free assets, but marker entries
still need deploy-time replacement and hashing.

The practical implication is that matching `s3-unspool`'s fastest sparse-update
path requires changing the asset packaging stage, not just the Lambda extraction
stage. The construct would need to create or wrap source ZIPs so marker-free
entries include a valid embedded MD5 catalog.

## CDK Compatibility Tradeoffs

Preserving CDK `BucketDeployment`-style behavior affected the engine design.

| CDK feature | Impact on engine | Tradeoff assessment |
| --- | --- | --- |
| Deploy-time marker replacement | Archive CRC32 and any source catalog digest do not describe the final uploaded bytes after replacement. Marker entries still need to be materialized after ranged extraction, replaced, hashed, and uploaded as final bytes. | Acceptable. Marker sources are usually small config/runtime files. Costly only if users apply markers to large assets. |
| Multiple sources with later sources overriding earlier keys | The provider still builds a manifest across sources before destination pruning and upload decisions. | Acceptable. This preserves expected CDK source ordering. |
| Include/exclude filters | Filters remain applied while walking ZIP entries. | Acceptable. Low overhead and required for compatibility. |
| S3 metadata and content-type handling | Upload and copy requests still apply CDK metadata options. | Acceptable. This is product behavior `s3-unspool` does not try to provide. |
| `extract=false` copy mode | Copy mode remains on the existing `CopyObject` path. | Acceptable. It is a separate mode and not part of ZIP extraction. |
| `prune` and `retainOnDelete` | Destination listing and delete planning remain provider-owned. | Acceptable. The destination listing is already needed for skip decisions. |
| CloudFront invalidation | Runs after S3 deployment exactly as before. | Acceptable. It is outside the extraction engine. |
| CDK asset packaging | Existing CDK source binding remains unchanged. | Acceptable for compatibility, costly for `s3-unspool`-style catalog performance. |

## Performance Implications

The new engine should improve over the old provider when `/tmp` I/O was visible:

- No archive write to Lambda `/tmp`.
- No archive reread from Lambda `/tmp`.
- No ephemeral-storage sizing requirement for the ZIP.
- Source ZIP size is no longer bounded by Lambda memory.
- Retryable upload bodies can be rebuilt from S3 ranges.
- Source ranged `GetObject` traffic and destination `PutObject` traffic use separate S3 clients.
- Adjacent planned source entry spans are coalesced into shared ranged source blocks.
- Extracted uploads use `If-None-Match: *` for missing keys and `If-Match` for listed existing keys.

The new engine does not yet match the fastest `s3-unspool` sparse-update path:

- Without an embedded catalog, unchanged files cannot always be skipped from metadata alone.
- The CRC32 skip path can still require checksum-mode `HeadObject` calls.
- The shared block store is simpler than `s3-unspool`'s production scheduler and may refetch evicted blocks under memory pressure.

## Bottom Line

The tradeoff made here is acceptable for CDK compatibility and removes the old
disk and full-ZIP-memory dependencies while preserving existing construct
behavior.

The remaining expensive `s3-unspool` feature to copy, if needed, is embedded
cataloged asset production. Cataloged assets are the next most important
improvement for sparse updates because they let unchanged files be skipped from
metadata alone.
