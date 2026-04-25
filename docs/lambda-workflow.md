# Lambda Workflow

This document shows the current runtime workflow for the `RustBucketDeployment` provider Lambda.

## GitHub Theme Support

The diagrams below use GitHub-flavored Markdown Mermaid code blocks instead of static images, so GitHub renders them in the viewer's current light or dark theme. If these diagrams are ever exported to image files, use GitHub's theme-aware `<picture>` pattern:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="diagram-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="diagram-light.png">
  <img alt="Workflow diagram" src="diagram-light.png">
</picture>
```

## Handler Overview

```mermaid
flowchart TD
  A["Lambda cold start"] --> B["Load AWS config"]
  B --> C["Create shared clients: S3, CloudFront, HTTP"]
  C --> D["Register lambda_runtime service_fn"]
  D --> E["Receive CloudFormation custom resource event"]
  E --> F["Deserialize event into typed CloudFormation request"]
  F --> G{"Request type"}

  G -->|Create| H["Generate new PhysicalResourceId"]
  G -->|Update| I["Reuse existing PhysicalResourceId"]
  G -->|Delete| J["Reuse existing PhysicalResourceId"]

  H --> K["Parse ResourceProperties into DeploymentRequest"]
  I --> K
  J --> K

  K --> L{"Delete and retainOnDelete=false?"}
  L -->|Yes| M["Check bucket ownership tag"]
  M --> N{"Bucket owned by this custom resource?"}
  N -->|No| O["Delete destination prefix"]
  N -->|Yes| P["Skip delete prefix"]
  L -->|No| Q{"Create or Update?"}
  O --> Q
  P --> Q

  Q -->|Yes| R["Run S3 deployment"]
  Q -->|No| S["Skip S3 deployment"]

  R --> T{"Distribution configured?"}
  S --> T
  T -->|Yes| U["Create CloudFront invalidation"]
  U --> V{"waitForDistributionInvalidation?"}
  V -->|Yes| W["Poll GetInvalidation until Completed or timeout"]
  V -->|No| X["Return after CreateInvalidation"]
  T -->|No| Y["Skip CloudFront"]

  W --> Z{"Update and destination changed and retainOnDelete=false?"}
  X --> Z
  Y --> Z
  Z -->|Yes| AA["Delete old destination prefix"]
  Z -->|No| AB["Build response data"]
  AA --> AB

  AB --> AC["PUT SUCCESS response to CloudFormation ResponseURL"]
  F -. "parse or runtime error" .-> AD["Build FAILED response with error chain"]
  K -. "deployment error" .-> AD
  R -. "S3 error" .-> AD
  U -. "CloudFront error" .-> AD
  W -. "timeout" .-> AD
  AD --> AE["PUT FAILED response to CloudFormation ResponseURL"]
```

## S3 Deployment Workflow

```mermaid
flowchart TD
  A["deploy(state, request)"] --> B["Validate source array lengths"]
  B --> C["Compile include and exclude glob filters"]
  C --> D["Build object metadata from request"]
  D --> E{"extract?"}

  E -->|true| F["For each source object: GetObject source zip"]
  F --> G["Stream source zip to /tmp"]
  G --> H["Open ZipArchive from temporary file"]
  H --> I["Walk zip entries"]
  I --> J{"Entry is file and passes filters?"}
  J -->|No| I
  J -->|Yes| K["Add planned ZipEntry with archive index, entry index, CRC32, and size"]
  K --> I

  E -->|false| L["For each source object: HeadObject source"]
  L --> M["Record source ETag as expected content hash"]
  M --> N["Add planned CopyObject"]

  I --> O["List destination prefix with ListObjectsV2"]
  N --> O
  O --> P["Record destination key to size, checksum hints, and ETag map"]
  O --> Q{"prune=true and destination key missing from plan?"}
  Q -->|Yes| R["Queue key for DeleteObjects"]
  Q -->|No| S["Keep key"]
  R --> T{"extract?"}
  S --> T

  T -->|false| U["Build copy plans"]
  U --> V{"Source ETag matches destination ETag?"}
  V -->|Yes| W["Skip CopyObject"]
  V -->|No| X["CopyObject with MetadataDirective=REPLACE"]
  X --> Y["Run copies with up to 8 parallel transfers"]
  W --> Y

  T -->|true| Z["Group zip entries by source archive"]
  Z --> AA["Open ZipArchive from temporary archive file"]
  AA --> AB["Read planned entry"]
  AB --> AC{"Source has deploy-time markers?"}

  AC -->|Yes| AD["Read full entry into memory"]
  AD --> AE["Apply marker replacement"]
  AE --> AF["MD5 and CRC32 final replaced bytes"]
  AF --> AG{"MD5 equals destination ETag?"}
  AG -->|Yes| AH["Skip PutObject"]
  AG -->|No| AI["PutObject replaced bytes with x-amz-checksum-crc32"]

  AC -->|No| AJ{"Destination size and CRC32 metadata can be checked?"}
  AJ -->|Yes| AK["HeadObject with ChecksumMode=Enabled"]
  AK --> AL{"ChecksumCRC32 equals zip CRC32?"}
  AL -->|Yes| AM["Skip PutObject"]
  AL -->|No| AN["Create retryable S3 body with x-amz-checksum-crc32"]
  AJ -->|No| AO["Fallback: read entry in 8 MiB chunks and compute MD5"]
  AO --> AP{"MD5 equals destination ETag?"}
  AP -->|Yes| AM
  AP -->|No| AN
  AN --> AQ["Stream entry to S3 in 8 MiB chunks"]

  AI --> AR["Run uploads with up to 8 parallel transfers"]
  AQ --> AR
  AH --> AR
  AM --> AR

  Y --> AS{"prune=true?"}
  AR --> AS
  AS -->|Yes| AT["Delete queued keys with DeleteObjects in 1000-key chunks"]
  AS -->|No| AU["Deployment complete"]
  AT --> AU
```

## Skip Decision Path

```mermaid
flowchart LR
  A["Planned object"] --> B["Destination ListObjectsV2 metadata"]
  B --> C{"Marker-free zip entry with destination CRC32 FULL_OBJECT and matching size?"}
  C -->|Yes| D["HeadObject with ChecksumMode=Enabled"]
  D --> E{"ChecksumCRC32 equals zip CRC32?"}
  E -->|Yes| F["Skip upload"]
  E -->|No| G["Upload"]
  C -->|No| H{"ETag fallback available?"}
  H -->|Yes| I{"Expected ETag equals destination ETag?"}
  I -->|Yes| F
  I -->|No| G
  H -->|No| G

  J["extract=false"] --> K["Expected ETag from source HeadObject"]
  L["extract=true without markers"] --> M["Expected CRC32 + size from zip central directory"]
  N["extract=true with markers"] --> O["Expected ETag from MD5 after replacement"]

  K --> A
  M --> A
  O --> A
```

## File Upload Handling

The destination objects are listed once per deployment after the source plan is built. Key, size, checksum algorithm/type, and `ETag` metadata are stored in memory as a key-to-metadata map, not as upload payloads.

```mermaid
flowchart TD
  A["Start S3 deployment"] --> B{"extract?"}

  B -->|true| C["Stream source zip to /tmp"]
  C --> D["Walk archive entries"]
  D --> E["Build source manifest: relative key -> zip entry location"]

  B -->|false| F["HeadObject each source object"]
  F --> G["Build source manifest: relative key -> source object + source ETag"]

  E --> H["List destination prefix once with ListObjectsV2"]
  G --> H
  H --> I["Store destination objects in memory"]
  I --> J["HashMap: relative key -> size, checksum hints, ETag"]
  J --> K{"Planned item type"}

  K -->|CopyObject extract=false| L["Read expected ETag from source HeadObject"]
  L --> M{"Expected ETag equals destination ETag?"}
  M -->|Yes| N["Skip CopyObject"]
  M -->|No| O["CopyObject source to destination"]

  K -->|Zip entry without markers| P{"Destination size matches and advertises CRC32 FULL_OBJECT?"}
  P -->|Yes| Q["HeadObject with ChecksumMode=Enabled"]
  Q --> R{"ChecksumCRC32 equals zip CRC32?"}
  R -->|Yes| T["Skip PutObject"]
  R -->|No| U["Create retryable upload body with x-amz-checksum-crc32"]
  P -->|No| V["Fallback: read entry in 8 MiB chunks and compute MD5"]
  V --> W{"MD5 equals destination ETag?"}
  W -->|Yes| T
  W -->|No| U
  U --> X["Stream PutObject body from temporary archive file"]

  K -->|Zip entry with markers| Y["Read full entry into memory"]
  Y --> Z["Apply marker replacement"]
  Z --> AA["Compute MD5 and CRC32 of replaced bytes"]
  AA --> AB{"MD5 equals destination ETag?"}
  AB -->|Yes| AC["Skip PutObject"]
  AB -->|No| AD["PutObject replaced bytes with x-amz-checksum-crc32"]

  O --> AE["Transfer concurrency bounded to 8"]
  X --> AE
  AD --> AE
  N --> AF["Item complete"]
  T --> AF
  AC --> AF
  AE --> AF
```

For plain zip entries, the handler prefers zip CRC32 plus uncompressed size against S3 full-object CRC32 metadata. When that is available, unchanged entries are skipped without decompressing the entry. If checksum metadata is unavailable, it falls back to reading chunks to compute MD5, compares against the destination ETag map, and only if changed creates a streaming `PutObject` body that emits 8 MiB chunks. With 8 active upload streams, the queued chunk payloads are bounded by the transfer concurrency.

## Current Runtime Notes

- Source zip archives are streamed to temporary files in Lambda `/tmp` and then opened as `ZipArchive` readers.
- Plain zip entries use zip CRC32 and S3 checksum metadata when available. If changed, the upload stream reopens the entry from the temporary archive file and sends one 8 MiB chunk at a time with `x-amz-checksum-crc32`.
- The upload stream is retryable because the body can be rebuilt from the retained temporary source archive.
- Zip entries with deploy-time replacements are still fully materialized in memory after replacement, because the final bytes must be known before computing the ETag/CRC32 and uploading.
- The handler does not extract the archive to disk and does not stage individual zip entries in `/tmp`.
- Copy and upload transfers are bounded by `MAX_PARALLEL_TRANSFERS = 8`.
- `prune=true` lists the destination prefix and deletes destination objects that are not in the planned source set.
- CloudFront invalidation is created after S3 deployment or delete handling; if waiting is enabled, the handler polls until completion or timeout.
