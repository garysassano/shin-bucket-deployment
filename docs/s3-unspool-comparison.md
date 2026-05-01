# s3-unspool Comparison

This note compares the current `RustBucketDeployment` provider strategy with
[`s3-unspool`](../../s3-unspool), focusing on why `s3-unspool` performs better
for large S3 ZIP deployments and sparse updates.

## Summary

`s3-unspool` treats the ZIP object in S3 as a random-access source. It reads ZIP
metadata and selected entry bytes with ranged `GetObject` requests, lists the
destination prefix once, and skips unchanged files from an embedded MD5 catalog
when available.

The current provider now uses ranged S3 reads for ZIP metadata and entry bodies.
It preserves CDK deployment behavior while removing the older `/tmp` and
full-archive memory paths. It still lacks `s3-unspool`'s embedded cataloged asset
pipeline and shared coalesced block scheduler.

## Strategy Differences

| Area | `s3-unspool` | Current provider |
| --- | --- | --- |
| Source ZIP access | Ranged `GetObject`; ZIP is never fully downloaded | Ranged `GetObject`; ZIP is never fully downloaded |
| Planning | Reads ZIP central directory from S3 ranges | Reads ZIP central directory from S3 ranges |
| Unchanged skip | Embedded catalog MD5 plus destination ETag from one list | CRC32 path may need checksum-mode `HeadObject`; fallback hashes local entry |
| Upload path | Coalesced range blocks feed decompression and `PutObject` directly | Per-entry S3 ranges feed decompression and `PutObject` directly |
| Concurrency | Separate source range GETs, entry workers, and PUT concurrency | Fixed transfer pool of 8 |
| Large archive behavior | Bounded memory; no ephemeral storage dependency | Bounded memory; no ephemeral storage dependency |
| Write safety | Conditional `PutObject` with `If-None-Match` or `If-Match` | Extracted uploads now use conditional `PutObject`; `extract=false` copy mode remains on `CopyObject` |

## s3-unspool Strategy

```mermaid
flowchart TD
  A["S3 source ZIP"] --> B["HeadObject source"]
  B --> C["Range read ZIP central directory"]
  C --> D["Range read embedded MD5 catalog"]
  E["Destination prefix"] --> F["ListObjectsV2 once"]

  C --> G["Build ZIP manifest"]
  D --> H["Attach catalog MD5 to entries"]
  F --> I["Destination key to ETag map"]

  G --> J["Classify entries"]
  H --> J
  I --> J

  J -->|"Catalog MD5 equals destination ETag"| K["Skip without reading entry body"]
  J -->|"Missing or changed"| L["Plan coalesced source byte ranges"]
  J -->|"No catalog fallback"| M["Hash only needed existing entries"]

  M -->|"Unchanged"| K
  M -->|"Changed"| L

  L --> N["Fetch planned ranged blocks"]
  N --> O["Stream ZIP entry from block window"]
  O --> P["Decompress while streaming"]
  P --> Q["Conditional PutObject"]
  Q --> R["Destination object written"]
```

## Current Provider Strategy

```mermaid
flowchart TD
  A["S3 source ZIP"] --> B["HeadObject source"]
  B --> C["Range read ZIP central directory"]
  C --> D["Walk entries and build manifest"]

  F["Destination prefix"] --> G["ListObjectsV2 once"]
  D --> H["Per-entry deployment decision"]
  G --> H

  H --> I{"Entry has deploy-time markers?"}

  I -->|"Yes"| J["Read full entry into memory"]
  J --> K["Apply replacements"]
  K --> L["Compute MD5 and CRC32"]
  L --> M{"MD5 equals destination ETag?"}
  M -->|"Yes"| N["Skip"]
  M -->|"No"| O["PutObject replaced bytes"]

  I -->|"No"| P{"Destination advertises CRC32 FULL_OBJECT and size matches?"}
  P -->|"Yes"| Q["HeadObject with ChecksumMode"]
  Q --> R{"ChecksumCRC32 equals ZIP CRC32?"}
  R -->|"Yes"| N
  R -->|"No"| S["Reopen ZIP entry and stream PutObject"]

  P -->|"No"| T["Read ZIP entry from S3 ranges and compute MD5"]
  T --> U{"MD5 equals destination ETag?"}
  U -->|"Yes"| N
  U -->|"No"| S

  S --> V["PutObject from S3 ranges"]
  O --> W["Destination object written"]
  V --> W
```

## Incremental Update Difference

```mermaid
flowchart LR
  subgraph Unspool["s3-unspool 5 percent update"]
    A1["Read central directory and catalog"] --> A2["List destination once"]
    A2 --> A3["Skip 95 percent from metadata"]
    A3 --> A4["Range read only changed or missing entries"]
    A4 --> A5["Stream conditional PUTs"]
  end

  subgraph RBD["Current RustBucketDeployment"]
    B1["Read central directory with ranges"] --> B2["List destination once"]
    B2 --> B3["Per-entry checksum HeadObject or range hash fallback"]
    B3 --> B4["Stream changed entries from ranges"]
  end
```

## Why s3-unspool Is Faster

- It can skip unchanged cataloged entries before decompression.
- It avoids per-object checksum `HeadObject` calls when catalog MD5 is available.
- It coalesces nearby ZIP byte spans into bounded ranged reads.
- It pipelines source range reads, decompression, and destination writes.
- It can tune source GET concurrency, entry worker concurrency, and PUT concurrency independently.
- It only reads source bytes for changed or missing entries during cataloged sparse updates.

## Practical Implication

The current provider is optimized for compatibility with CDK `BucketDeployment`
features such as deploy-time marker replacement and metadata handling. The
biggest remaining performance opportunity is cataloged source asset production:
carry a stable content catalog in the source archive so unchanged files can be
skipped from destination listing metadata without checksum `HeadObject` calls or
range-hash fallback work.
