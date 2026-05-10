# s3-unspool Parity

This document tracks how `ShinBucketDeployment` maps `s3-unspool` ideas into the CDK custom-resource deployment model.

## Comparison Baseline

| Field | Value |
| --- | --- |
| `s3-unspool` version | `0.1.0-beta.6` |
| `s3-unspool` commit | `a699d18` (`refactor: improve Rust interface API (#24)`) |
| Local checkout | `/Users/sassanog/git/s3-unspool` |
| Last parity review | 2026-05-08 |

This matrix is point-in-time documentation. Re-check it when `s3-unspool` changes options, reports, scheduler behavior, or conditional-write semantics.

## Implemented

| `s3-unspool` behavior | `ShinBucketDeployment` status |
| --- | --- |
| Read source ZIPs with S3 ranged `GetObject` requests | Implemented for `extract=true`. |
| Avoid full ZIP download | Implemented. The provider reads central-directory and entry ranges instead of loading the whole archive. |
| Avoid Lambda `/tmp` archive extraction | Implemented. Source archives and extracted entries are not staged on disk. |
| Separate source and destination S3 clients | Implemented. Source ranged reads and destination writes use separate SDK clients. |
| Coalesce source byte spans into larger blocks | Implemented with advanced `sourceBlockBytes` and `sourceBlockMergeGapBytes` tuning. |
| Bound resident source block memory | Implemented with advanced `sourceWindowBytes` tuning or an adaptive memory-derived window. |
| Prefetch source blocks | Implemented with advanced or memory-derived `sourceGetConcurrency` tuning. |
| Track reader claims and release blocks | Implemented. Blocks stay resident while claimed and are released after active readers finish. |
| Retryable entry upload bodies | Implemented. ZIP entry bodies can be reopened from source blocks, and replay claims are added for retries and hash-then-upload paths. |
| Decompress ZIP entries from ranged source data | Implemented for stored and deflated entries. |
| Validate ZIP entry output size and CRC32 | Implemented for hashing, marker replacement input, catalog loading, and upload streaming. |
| Small bounded entry streaming buffers | Implemented with the same defaults as the local `s3-unspool` extraction path: 64 KiB entry read buffers, 256 KiB S3 body chunks, and 1 MiB body pipe capacity. |
| Destination prefix list as comparison input | Implemented. Destination `ListObjectsV2` drives skip and prune decisions. |
| Destination size short-circuit | Implemented. Existing objects with different listed size upload without pre-hashing. |
| Embedded MD5 catalog runtime support | Implemented. Existing `.shin/catalog.v1.json` entries are consumed. |
| Cataloged asset production | Implemented for local directory `Source.asset` inputs through this construct's `Source` wrapper. |
| Catalog sparse skip | Implemented. Marker-free files with catalog MD5 and matching destination size/ETag are skipped without reading entry data. |
| Destination write preconditions | Implemented for extracted uploads. Missing destination keys use `If-None-Match: *`; existing keys with listed `ETag`s use `If-Match`; existing keys without usable `ETag`s fall back to plain `PutObject`. |
| `PutObject` retry/backoff | Implemented with capped retry delays, full/no jitter, and a shared throttle cooldown. |
| Runtime tuning surface | Implemented for transfer concurrency, source block/window settings, source GET concurrency, and PUT retry policy. |
| Adaptive source tuning | Implemented. Source GET concurrency and source block window default from the provider Lambda memory size. |
| Structured diagnostics counters | Implemented as provider logs for source GET attempts/retries/errors, bytes/amplification, block hits/waits/releases/refetches, split wait reasons, replay-claim counters, resident source-window high-water, active reader and active GET high-water, conditional write conflicts, and PUT retry/failure counters. |
| `DestinationCleanup` policy | Mapped to CDK `prune`: `prune=true` behaves like `DeleteExtra`; `prune=false` behaves like `KeepExtra`. |
| `ComparisonMode` policy | Mapped to fixed `CatalogThenHash` behavior for marker-free ZIP entries. There is no public force-hash mode. |
| `ConflictPolicy` policy | Mapped to CloudFormation fail-fast behavior. Conditional destination write conflicts are counted in the sanitized provider summary and fail the custom-resource request instead of being reported and continued. |
| `AdaptiveSourceWindow` | Implemented as equivalent internal memory-derived source-window sizing. Public CDK users set `memoryLimit`; low-level overrides remain under `advancedRuntimeTuning`. |
| Read-only option accessors | Not applicable. This construct exposes synthesized CloudFormation properties instead of a public Rust `SyncOptions` value. |

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
| Tuning surface | Normal runtime tuning is intentionally small: `memoryLimit` plus `maxParallelTransfers`. Source block/window and retry internals are grouped under `advancedRuntimeTuning` as escape hatches, not as prominent top-level props. |
| Asset production | Cataloged ZIPs are produced by this construct's `Source.asset` wrapper for local directories. `s3-unspool` can produce catalogs through its own upload/build tooling. |
| Marker replacement | Catalog MD5s are ignored for marker sources because final bytes are only known at deploy time. |

## Partial Or Missing

| `s3-unspool` capability | Current state | Reason or next step |
| --- | --- | --- |
| Cataloged CDK asset bundling | Missing. | The cataloged wrapper does not run CDK `bundling`; use a prebuilt directory or `embeddedCatalog: false`. |
| Cataloged symlink handling | Missing. | Symlinks are rejected until follow/materialization semantics are implemented. |

## Catalog Packaging Limits

Cataloged `Source.asset` packaging has these current limits:

- Local directory assets are cataloged by default.
- Local `.zip` files and `Source.bucket` archives are not rewritten.
- Caller-provided ZIPs still benefit from catalog skips if they already contain `.shin/catalog.v1.json`.
- CDK asset `bundling` is not executed by the cataloged wrapper.
- Symlinks are rejected by cataloged packaging.
- The wrapper writes a temporary ZIP during synth/package time on the local machine.
- The embedded catalog changes the staged ZIP bytes and therefore the CDK asset hash compared with upstream CDK packaging.
- Catalog MD5s apply only to marker-free files.

Use `Source.asset(path, { embeddedCatalog: false })` to opt out of cataloged packaging and use upstream CDK asset behavior.

## Verification

Local verification currently covers:

- Rust compile and unit tests for ranged entry reads, decompression, CRC validation, catalog parsing, destination planning, and marker replacement.
- TypeScript synthesis tests for custom-resource properties and cataloged asset output.
- TypeScript build, typecheck, lint, and Vitest suite.

AWS verification on 2026-05-02 covered catalog sparse skips, source prefetch behavior, and changed-object overwrite behavior with the `large-few` benchmark profile at 512, 1024, and 2048 MiB. The detailed sanitized records live in `docs/benchmark-history.jsonl`.
