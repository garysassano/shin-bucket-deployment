# s3-unspool Parity

This document tracks how `ShinBucketDeployment` maps `s3-unspool` ideas into the CDK custom-resource deployment model.

## Comparison Baseline

| Field | Value |
| --- | --- |
| `s3-unspool` version | `0.1.0-beta.6` |
| `s3-unspool` commit | `a699d18` (`refactor: improve Rust interface API (#24)`) |
| Last parity review | 2026-07-12 |

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
| Destination prefix list as comparison input | Implemented. Destination `ListObjectsV2` drives skip and stale-object deletion decisions. |
| Destination size short-circuit | Implemented. Existing objects with different listed size upload without pre-hashing. |
| Embedded MD5 catalog runtime support | Implemented only for template-authenticated `.shin/catalog.v1.json` entries. Unbound catalog contents are ignored. |
| Cataloged asset production | Implemented for local directory `Source.asset` inputs with an exact catalog SHA-256 binding in the CloudFormation template. |
| Catalog sparse skip | Implemented for default/SSE-S3 destinations. Marker-free files with authenticated catalog size/MD5 and matching destination size/ETag are skipped without reading entry data. KMS/DSSE destinations do not treat encrypted ETags as plaintext MD5. |
| Destination write preconditions | Implemented for extracted uploads. Missing destination keys use `If-None-Match: *`; existing keys with listed `ETag`s use `If-Match`; existing keys without usable `ETag`s fall back to plain `PutObject`. Ambiguous conflicts require exact length plus streamed MD5/ETag for SSE-S3 or stored `FULL_OBJECT` SHA-256 for KMS/DSSE. |
| `PutObject` retry/backoff | Implemented with one SDK attempt per typed application attempt, retryable-error classification, capped delays, full/no jitter, and a shared throttle cooldown. |
| Runtime tuning surface | Implemented for transfer concurrency, source block/window settings, source GET concurrency, and PUT retry policy. |
| Adaptive source tuning | Implemented. Source GET concurrency and source block window default from the provider Lambda memory size. |
| Structured diagnostics counters | Implemented as provider logs for source GET attempts/retries/errors, bytes/amplification, block hits/waits/releases/refetches, split wait reasons, replay-claim counters, resident source-window high-water, active reader and active GET high-water, conditional write conflicts, and PUT retry/failure counters. |
| `DestinationCleanup` policy | Mapped to `destinationLifecycle.onDeploy.deleteStaleObjects`: `true` behaves like `DeleteExtra`; `false` behaves like `KeepExtra`. |
| `ComparisonMode` policy | Mapped to authenticated-catalog-then-hash behavior for marker-free ZIP entries on SSE-S3 destinations. KMS/DSSE destinations avoid a destination-comparison pass; trusted source MD5 is still validated. There is no public trust or force-hash mode. |
| `ConflictPolicy` policy | Mapped to strategy-specific exact content convergence followed by CloudFormation fail-fast behavior. SSE-S3 uses ordinary `HeadObject` length/ETag proof; KMS/DSSE uses checksum-mode length/full-object-SHA-256 proof. Every other conflict is counted and fails the custom-resource request. |
| `AdaptiveSourceWindow` | Implemented as equivalent internal memory-derived source-window sizing. Public CDK users set `memoryLimit`; low-level overrides remain under `advancedRuntimeTuning`. |
| Read-only option accessors | Not applicable. This construct exposes synthesized CloudFormation properties instead of a public Rust `SyncOptions` value. |

## CDK-Specific Behavior Preserved

| CDK behavior | Status |
| --- | --- |
| Multiple source precedence | Preserved by building one deployment manifest; later sources overwrite earlier relative keys. |
| Deploy-time markers | Preserved. Each marker entry is decompressed, validated, materialized, replaced, size-bounded, and uploaded when changed. There is no separate global preflight pass. |
| `extract=false` | Preserved as a separate `CopyObject` path. |
| `include` / `exclude` | Preserved while walking ZIP entries and stale-object deletion candidates. |
| `destinationLifecycle.onDeploy.deleteStaleObjects` | Maps the upstream `prune` behavior to destination listing and batched `DeleteObjects`. |
| `destinationLifecycle.onChange` / `onDelete` | Separately opts into deleting old objects, invalidating a changed old distribution, or deleting destination objects on Delete. Old-object deletion derives the old prefix from `OldResourceProperties`; changed old resources are explicit synthesis-time inputs. |
| S3 metadata props | Intentionally omitted. PUT and COPY infer `Content-Type` from the final key; cache, encryption, storage, and lifecycle behavior belongs to CloudFront or bucket configuration. |
| CloudFront invalidation | Preserved after S3 deployment. |
| `deployedBucket` and `objectKeys` | Preserved through custom-resource response data. |

## Intentional Differences

| Area | Difference |
| --- | --- |
| Public API | This is a CDK construct, not a standalone S3 sync library or CLI. The destination is a concrete CDK-created `Bucket` so synthesis can inspect encryption and choose a sound checksum strategy. |
| Report model | The provider returns CloudFormation custom-resource responses, not a full `s3-unspool` operation report. |
| Tuning surface | Normal runtime tuning is intentionally small: `memoryLimit` plus `maxParallelTransfers`. Source block/window and retry internals are grouped under `advancedRuntimeTuning` as escape hatches, not as prominent top-level props. |
| Asset production | Trusted catalogs are produced only by this construct's `Source.asset` wrapper for local directories. Arbitrary ZIP producers cannot opt into trust. `s3-unspool` can produce catalogs through its own upload/build tooling, but those catalogs are untrusted here. |
| Marker replacement | Catalog MD5s validate marker input, but final bytes are only known at deploy time. Marker output remains whole-entry materialized until the streaming replacement design lands. |

## Partial Or Missing

| `s3-unspool` capability | Current state | Reason or next step |
| --- | --- | --- |
| Cataloged CDK asset bundling | Missing. | The cataloged wrapper does not run CDK `bundling`; use a prebuilt directory or `embeddedCatalog: false`. |
| Cataloged symlink handling | Missing. | Symlinks are rejected until follow/materialization semantics are implemented. |

## Catalog Packaging Limits

Cataloged `Source.asset` packaging has these current limits:

- Local directory assets are cataloged by default.
- Local `.zip` files and `Source.bucket` archives are not rewritten.
- Caller-provided ZIP catalogs are excluded as reserved metadata but never enable sparse skips because they have no template binding.
- CDK asset `bundling` is not executed by the cataloged wrapper.
- Symlinks and non-regular files are rejected by cataloged packaging.
- The wrapper uses 64 KiB reads to materialize a temporary directory, then CDK owns ZIP and ZIP64 creation.
- CDK asset staging is required so the temporary materialization can be removed after synchronous staging.
- The embedded catalog changes the staged ZIP bytes and therefore the CDK asset hash compared with upstream CDK packaging.
- Authenticated catalog MD5s enable sparse skips only for marker-free files; trusted bytes are still checked whenever an entry is read.

Use `Source.asset(path, { embeddedCatalog: false })` to opt out of cataloged packaging and use upstream CDK asset behavior.

## Verification

Local verification currently covers:

- Rust compile and unit tests for ranged entry reads, strategy-selected CRC/MD5/SHA-256 work, strict catalog authentication and mapping, exact strategy-specific lost-response reconciliation, request preflight, destination planning, ZIP64 metadata, and bounded marker replacement.
- TypeScript synthesis tests for encryption-strategy derivation, unsupported metadata API rejection, bounded materialization, cleanup, custom-resource bindings and IAM, and CDK `ZIP_DIRECTORY` asset output.
- TypeScript build, typecheck, lint, and Vitest suite.

The latest sanitized correctness status, including which provider architecture ran in AWS, is maintained in [verification](./verification.md). Historical performance rows remain in `benchmarks/results.jsonl` and are not correctness evidence.
