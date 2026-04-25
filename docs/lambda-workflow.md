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
  F --> G["Read source zip into memory"]
  G --> H["Open ZipArchive from in-memory bytes"]
  H --> I["Walk zip entries"]
  I --> J{"Entry is file and passes filters?"}
  J -->|No| I
  J -->|Yes| K["Add planned ZipEntry with archive index and entry index"]
  K --> I

  E -->|false| L["For each source object: HeadObject source"]
  L --> M["Record source ETag as expected content hash"]
  M --> N["Add planned CopyObject"]

  I --> O["List destination prefix with ListObjectsV2"]
  N --> O
  O --> P["Record destination key to ETag map"]
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
  Z --> AA["Open ZipArchive from in-memory archive bytes"]
  AA --> AB["Read planned entry"]
  AB --> AC{"Source has deploy-time markers?"}

  AC -->|Yes| AD["Read full entry into memory"]
  AD --> AE["Apply marker replacement"]
  AE --> AF["MD5 final replaced bytes"]
  AF --> AG{"MD5 equals destination ETag?"}
  AG -->|Yes| AH["Skip PutObject"]
  AG -->|No| AI["PutObject from in-memory replaced bytes"]

  AC -->|No| AJ["Read entry in 8 MiB chunks"]
  AJ --> AK["Compute MD5 without building full object buffer"]
  AK --> AL{"MD5 equals destination ETag?"}
  AL -->|Yes| AM["Skip PutObject"]
  AL -->|No| AN["Create retryable S3 body from source archive and entry index"]
  AN --> AO["Stream entry to S3 in 8 MiB chunks"]

  AI --> AP["Run uploads with up to 8 parallel transfers"]
  AO --> AP
  AH --> AP
  AM --> AP

  Y --> AQ{"prune=true?"}
  AP --> AQ
  AQ -->|Yes| AR["Delete queued keys with DeleteObjects in 1000-key chunks"]
  AQ -->|No| AS["Deployment complete"]
  AR --> AS
```

## ETag Decision Path

```mermaid
flowchart LR
  A["Planned object"] --> B["Destination ListObjectsV2 ETag"]
  B --> C{"Expected content ETag available?"}
  C -->|No| D["Upload or copy"]
  C -->|Yes| E{"Expected ETag equals destination ETag?"}
  E -->|Yes| F["Skip upload or copy"]
  E -->|No| D

  G["extract=false"] --> H["Expected ETag from source HeadObject"]
  I["extract=true without markers"] --> J["Expected ETag from MD5 of zip entry bytes"]
  K["extract=true with markers"] --> L["Expected ETag from MD5 after replacement"]

  H --> A
  J --> A
  L --> A
```

## Current Runtime Notes

- Source zip archives are downloaded into Lambda memory and then opened as `ZipArchive` readers.
- Plain zip entries are hashed in 8 MiB chunks. If changed, the upload stream reopens the entry from the in-memory archive and sends one 8 MiB chunk at a time.
- The upload stream is retryable because the body can be rebuilt from the retained in-memory source archive.
- Zip entries with deploy-time replacements are still fully materialized in memory after replacement, because the final bytes must be known before computing the ETag and uploading.
- The handler does not extract the archive to disk and does not stage zip entries in `/tmp`.
- Copy and upload transfers are bounded by `MAX_PARALLEL_TRANSFERS = 8`.
- `prune=true` lists the destination prefix and deletes destination objects that are not in the planned source set.
- CloudFront invalidation is created after S3 deployment or delete handling; if waiting is enabled, the handler polls until completion or timeout.
