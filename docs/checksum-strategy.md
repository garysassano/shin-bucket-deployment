# Checksum Strategy

`RustBucketDeployment` uses S3 checksums and zip entry metadata to skip unchanged objects without extracting the full archive or hashing every file on every deployment.

## Marker-free zip entries

For `extract=true` sources without deploy-time markers, the source archive already contains the identity needed for each file:

- normalized archive path
- uncompressed size
- zip entry CRC32

The destination prefix is listed once with `ListObjectsV2`. The list response provides each object's key, size, `ETag`, checksum algorithms, and checksum type. When a destination object has the same size and advertises `CRC32` with `FULL_OBJECT`, the provider issues a targeted `HeadObject` with `ChecksumMode::Enabled` to read the actual `ChecksumCRC32` value. These checksum reads run inside the same bounded transfer task pool as fallback hashing and uploads.

The provider skips a marker-free entry when:

- destination size equals the zip entry uncompressed size
- destination checksum type is `FULL_OBJECT`
- destination `ChecksumCRC32` equals the zip entry CRC32 encoded as base64 big-endian bytes

If the object is missing, the size differs, or the CRC32 differs, the provider streams the zip entry to `PutObject` once. Missing entries use `If-None-Match: *`; changed existing entries use `If-Match` with the ETag observed during destination listing. The upload includes the zip entry CRC32 as `x-amz-checksum-crc32`, so S3 validates the object during upload and stores the checksum for future deployments.

If checksum metadata is unavailable or checksum-mode `HeadObject` cannot be used, the provider falls back to the older `ETag` path: it reads the zip entry in chunks, computes MD5, compares it with the destination `ETag`, and only reopens the archive entry for upload if changed.

## Entries with deploy-time markers

Zip CRC32 cannot be used directly for entries with deploy-time marker replacement because the uploaded bytes differ from the archive bytes.

For marker sources, the provider:

- reads the entry into memory
- applies marker replacement
- computes MD5 for compatibility with the existing `ETag` skip path
- computes CRC32 for the final replaced bytes
- sends the final CRC32 with `PutObject`

This keeps marker uploads validated by S3 while preserving the existing skip behavior for replacement-expanded content.

## `extract=false`

For `extract=false`, source objects are copied with `CopyObject`. The provider sets the copy checksum algorithm to `CRC32` so copied destination objects get checksum metadata when S3 can produce it.

The skip decision for `extract=false` still uses the source object's `ETag` from `HeadObject` and the destination `ETag` from `ListObjectsV2`.

## Tradeoffs

CRC32 is not a cryptographic identity. The provider compares both CRC32 and object size to avoid obvious false matches, and uses this only as a deployment skip optimization.

Checksum reads may require extra permissions for some encrypted objects. In particular, `HeadObject` with checksum mode can require KMS permissions for SSE-KMS objects. When checksum reads fail, the provider falls back to the MD5/`ETag` path instead of failing the deployment.
