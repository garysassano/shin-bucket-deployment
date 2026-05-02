# s3-unspool Parity

This document tracks how `RustBucketDeployment` maps `s3-unspool` ideas into the CDK custom-resource deployment model.

## Implemented

| `s3-unspool` behavior | `RustBucketDeployment` status |
| --- | --- |
| Read source ZIPs with S3 ranged `GetObject` requests | Implemented for `extract=true`. |
| Avoid full ZIP download | Implemented. The provider reads central-directory and entry ranges instead of loading the whole archive. |
| Avoid Lambda `/tmp` archive extraction | Implemented. Source archives and extracted entries are not staged on disk. |
| Separate source and destination S3 clients | Implemented. Source ranged reads and destination writes use separate SDK clients. |
| Coalesce source byte spans into larger blocks | Implemented with configurable `sourceBlockBytes` and `sourceBlockMergeGapBytes`. |
| Bound resident source block memory | Implemented with configurable `sourceWindowBytes` or an adaptive memory-derived window. |
| Prefetch source blocks | Implemented with configurable or memory-derived `sourceGetConcurrency`. |
| Track reader claims and release blocks | Implemented. Blocks stay resident while claimed and are released after active readers finish. |
| Retryable entry upload bodies | Implemented. ZIP entry bodies can be reopened from source blocks, and replay claims are added for retries and hash-then-upload paths. |
| Decompress ZIP entries from ranged source data | Implemented for stored and deflated entries. |
| Validate ZIP entry output size and CRC32 | Implemented for hashing, marker replacement input, catalog loading, and upload streaming. |
| Destination prefix list as comparison input | Implemented. Destination `ListObjectsV2` drives skip and prune decisions. |
| Destination size short-circuit | Implemented. Existing objects with different listed size upload without pre-hashing. |
| Embedded MD5 catalog runtime support | Implemented. Existing `.s3-unspool/catalog.v1.json` entries are consumed. |
| Cataloged asset production | Implemented for local directory `Source.asset` inputs through this construct's `Source` wrapper. |
| Catalog sparse skip | Implemented. Marker-free files with catalog MD5 and matching destination size/ETag are skipped without reading entry data. |
| Conditional destination writes | Implemented for extracted uploads with `If-None-Match` and `If-Match`. |
| Conditional conflict surfacing | Implemented. 409/412 and known conditional errors fail the deployment instead of overwriting. |
| `PutObject` retry/backoff | Implemented with capped retry delays and longer throttle-aware delays. |
| Runtime tuning surface | Implemented for transfer concurrency, source block/window settings, source GET concurrency, and PUT retry delays. |
| Adaptive source tuning | Implemented. Source GET concurrency and source block window default from the provider Lambda memory size. |
| Structured diagnostics counters | Implemented as provider logs for source GET attempts/retries/errors, bytes/amplification, block hits/waits/releases/refetches, active GET high-water, and PUT retry/failure counters. |

## CDK-Specific Behavior Preserved

| CDK behavior | Status |
| --- | --- |
| Multiple source precedence | Preserved by building one deployment manifest; later sources overwrite earlier relative keys. |
| Deploy-time markers | Preserved. Marker entries are decompressed, validated, materialized, replaced, hashed, and uploaded when changed. |
| `extract=false` | Preserved as a separate `CopyObject` path. |
| `include` / `exclude` | Preserved while walking ZIP entries and destination prune candidates. |
| `prune` | Preserved through destination listing and batched `DeleteObjects`. |
| `retainOnDelete` | Preserved through existing delete lifecycle behavior. |
| S3 metadata props | Preserved for upload and copy requests. |
| CloudFront invalidation | Preserved after S3 deployment. |
| `deployedBucket` and `objectKeys` | Preserved through custom-resource response data. |

## Intentional Differences

| Area | Difference |
| --- | --- |
| Public API | This is a CDK construct, not a standalone S3 sync library or CLI. |
| Report model | The provider returns CloudFormation custom-resource responses, not a full `s3-unspool` operation report. |
| Tuning surface | Runtime tuning is exposed as CDK props on `RustBucketDeployment`, not as a standalone `s3-unspool` CLI/API options object. |
| Asset production | Cataloged ZIPs are produced by this construct's `Source.asset` wrapper for local directories. `s3-unspool` can produce catalogs through its own upload/build tooling. |
| Marker replacement | Catalog MD5s are ignored for marker sources because final bytes are only known at deploy time. |

## Partial Or Missing

| `s3-unspool` capability | Current state | Reason or next step |
| --- | --- | --- |
| Full `PutObject` retry policy surface | Partial. Attempts and capped delay values are configurable, but retry jitter and shared destination PUT throttling are not implemented. | Add only if benchmark or live throttling data shows value. |
| Cataloged CDK asset bundling | Missing. | The cataloged wrapper does not run CDK `bundling`; use a prebuilt directory or `embeddedCatalog: false`. |
| Cataloged symlink handling | Missing. | Symlinks are rejected until follow/materialization semantics are implemented. |

## Catalog Packaging Limits

Cataloged `Source.asset` packaging has these current limits:

- Local directory assets are cataloged by default.
- Local `.zip` files and `Source.bucket` archives are not rewritten.
- Caller-provided ZIPs still benefit from catalog skips if they already contain `.s3-unspool/catalog.v1.json`.
- CDK asset `bundling` is not executed by the cataloged wrapper.
- Symlinks are rejected by cataloged packaging.
- The wrapper writes a temporary ZIP during synth/package time on the local machine.
- The embedded catalog changes the staged ZIP bytes and therefore the CDK asset hash compared with upstream CDK packaging.
- Catalog MD5s apply only to marker-free files.

Use `Source.asset(path, { embeddedCatalog: false })` to opt out of cataloged packaging and use upstream CDK asset behavior.

## Validation

Local validation currently covers:

- Rust compile and unit tests for ranged entry reads, decompression, CRC validation, catalog parsing, destination planning, and marker replacement.
- TypeScript synthesis tests for custom-resource properties and cataloged asset output.
- TypeScript build, typecheck, lint, and Vitest suite.

AWS validation still needs a post-change rerun for catalog sparse skips, source prefetch behavior, and conditional conflict handling.
