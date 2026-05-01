# Benchmarking

This document defines the benchmark strategy for `RustBucketDeployment`. The goal is not just elapsed time; it is to explain deployment behavior at every step and produce comparable evidence across code changes.

## Goals

Measure each deployment phase:

- local CDK build and synth time
- CDK asset publishing time
- CloudFormation custom resource time
- provider Lambda cold start and handler duration
- source ZIP planning time
- destination listing time
- skip-decision time
- source ranged-read count and bytes
- decompression/hash time
- destination `PutObject`, `CopyObject`, `DeleteObjects`, and CloudFront calls
- destination bytes uploaded/copied/deleted
- memory high-water mark and billed duration
- correctness of final destination state

Benchmark runs should answer these questions:

- How fast is cold create for different bundle shapes?
- How fast is unchanged redeploy?
- How much work is done for sparse same-size updates?
- How much work is done for pruned updates?
- How much unchanged redeploy time is spent reading and hashing existing ZIP entries because no source MD5 catalog is available?
- How effective is source block coalescing?
- Which phase dominates total deployment time: CDK, CloudFormation, provider planning, source reads, hashing, uploads, deletes, or invalidation?

## Current Harness

The `benchmark-assets` example generates deterministic static-site bundles under `.benchmark-assets/`, which is ignored by git.

```bash
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=RunA pnpm example deploy benchmark-assets
RBD_BENCH_STACK_SUFFIX=RunA pnpm example destroy benchmark-assets
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RBD_BENCH_PROFILE` | `mixed` | Asset shape: `tiny-many`, `mixed`, or `large-few`. |
| `RBD_BENCH_VARIANT` | `v1` | Asset variant: `v1`, `v2`, or `pruned`. |
| `RBD_BENCH_STACK_SUFFIX` | none | Adds a suffix to the benchmark stack name so multiple runs can coexist. |
| `RBD_BENCH_DESTINATION_PREFIX` | `benchmark-site` | Destination prefix inside the generated bucket. |
| `RBD_BENCH_PRUNE` | `true` | Set to `false` to disable prune. |
| `RBD_BENCH_WAIT` | `true` | Present for property toggling; the benchmark stack currently has no CloudFront distribution. |

Asset profiles:

| Profile | Shape | Signal |
| --- | --- | --- |
| `tiny-many` | Thousands of small JS, CSS, and JSON files. | Per-object overhead, list/skip scaling, many small uploads. |
| `mixed` | SPA-like bundle with chunks, source maps, JSON, media, and fonts. | Default realistic static-site profile. |
| `large-few` | Fewer large JS, source map, and media files. | Range reads, decompression, hash, upload streaming, block coalescing. |

Variants:

| Variant | Behavior | Signal |
| --- | --- | --- |
| `v1` | Baseline bundle. | Cold create and unchanged redeploy baseline. |
| `v2` | Same file set and sizes, with a few changed files. | Sparse same-size update behavior. |
| `pruned` | Removes about ten percent of files. | Delete planning and prune behavior. |

## Minimum Run Matrix

Run this matrix for every performance-significant provider change:

| Phase | Profile | Variant sequence | Repetitions | Required evidence |
| --- | --- | --- | ---: | --- |
| Cold create | `tiny-many`, `mixed`, `large-few` | `v1` | 3 | Provider duration, memory, request counts, bytes written. |
| Unchanged redeploy | `tiny-many`, `mixed`, `large-few` | `v1` -> `v1` | 5 | Skip counters, destination writes near zero, median/p90. |
| Sparse update | `mixed`, `large-few` | `v1` -> `v2` | 3 | Changed count, skipped count, source bytes read, destination bytes written. |
| Prune update | `tiny-many`, `mixed` | `v1` -> `pruned` | 3 | Deleted count, delete request batches, retained object validation. |
| No-prune update | `mixed` | `v1` -> `pruned` with `RBD_BENCH_PRUNE=false` | 1 | Removed source keys remain in destination. |
| Prefix update | `mixed` | `v1` to new prefix | 1 | Old prefix cleanup behavior when `retainOnDelete=false`. |
| Delete cleanup | `mixed` | destroy after deploy | 1 | Destination cleanup and stack destroy success. |

Use a unique `RBD_BENCH_STACK_SUFFIX` per comparison branch or run group.

## Standard Command Sequence

Build first:

```bash
pnpm build
```

Cold create:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v1 \
RBD_BENCH_STACK_SUFFIX=BenchA \
pnpm example deploy benchmark-assets
```

Unchanged redeploy:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v1 \
RBD_BENCH_STACK_SUFFIX=BenchA \
pnpm example deploy benchmark-assets
```

Sparse same-size update:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v2 \
RBD_BENCH_STACK_SUFFIX=BenchA \
pnpm example deploy benchmark-assets
```

Prune update:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=pruned \
RBD_BENCH_STACK_SUFFIX=BenchA \
pnpm example deploy benchmark-assets
```

Destroy:

```bash
RBD_BENCH_STACK_SUFFIX=BenchA pnpm example destroy benchmark-assets
```

## Data To Record

For every run:

- branch name
- commit SHA
- provider binary build mode and target architecture
- AWS region
- stack suffix
- profile and variant
- generated file count and total bytes
- phase: cold create, unchanged redeploy, sparse update, prune update, destroy
- local wall time around the `pnpm example deploy` command
- CDK reported deploy time
- CloudFormation custom resource elapsed time
- Lambda duration, billed duration, init duration if present, and max memory
- provider summary counters when available
- destination object inspection summary
- cleanup status

Provider summary counters should include:

- source archives planned
- source ZIP bytes and central-directory bytes read
- source range request count
- coalesced source block count
- source block cache hits/misses/evictions
- planned entries
- filtered entries
- marker entries
- destination objects listed
- missing marker-free direct uploads
- MD5 hash attempts/skips/uploads
- marker replacement skips/uploads
- `extract=false` copy skips/copies
- conditional put attempts/successes/conflicts
- uploaded object count and bytes
- copied object count and bytes
- prune delete count and batches
- CloudFront invalidation id and wait duration when applicable

## Instrumentation Plan

The current docs and examples can drive benchmark deployments, but the provider still needs structured telemetry before the benchmark is thorough enough.

Add a per-invocation deployment stats object in the Rust provider:

- initialize it when the handler starts processing a request
- pass it through planning, destination listing, transfer, delete, and invalidation paths
- increment counters close to the AWS SDK call or CPU work being measured
- record phase durations with `Instant`
- emit one sanitized JSON summary line at the end of each successful or failed request
- include no bucket names, object keys, account IDs, distribution IDs, URLs, or ETags in the summary line

Recommended log shape:

```json
{
  "event": "rbd_deployment_summary",
  "requestType": "Update",
  "extract": true,
  "prune": true,
  "sourceArchives": 1,
  "plannedEntries": 442,
  "filteredEntries": 0,
  "destinationObjects": 442,
  "missingDirectUploads": 0,
  "md5HashAttempts": 442,
  "md5Skips": 430,
  "uploads": 12,
  "uploadBytes": 10485760,
  "sourceRangeRequests": 38,
  "sourceBytesRead": 12582912,
  "deleteObjects": 0,
  "durationMs": 812
}
```

This should be emitted with `tracing::info!` as structured fields if possible, or as a single JSON string if that is easier to parse reliably from CloudWatch Logs.

## Benchmark Runner Plan

After provider telemetry exists, add a repository runner that automates the matrix:

- builds the project once
- deploys each profile/variant sequence with unique stack suffixes
- captures local wall time
- collects CloudFormation stack events for the custom resource timing
- queries CloudWatch Logs for provider summary lines and Lambda REPORT lines
- optionally queries S3 object state for key-count and spot content validation
- writes sanitized JSONL under an ignored output directory such as `.benchmark-runs/`
- prints a Markdown summary table for commit-to-commit comparison

Do not commit `.benchmark-runs/` raw output. Commit only curated aggregate results that do not include sensitive resource identifiers.

## Comparison Method

For branch comparisons:

1. Use the same benchmark harness commit on both branches.
2. Use the same AWS region and account.
3. Build from a clean working tree when possible.
4. Use separate stack suffixes, for example `MainA` and `ExperimentA`.
5. Run cold creates before unchanged updates for each branch.
6. Run unchanged redeploys at least five times.
7. Compare median and p90 for repeated phases.
8. Compare provider counters before drawing conclusions from elapsed time.
9. Destroy all stacks after collecting evidence.

## Historical Results

These results are retained only as historical context. They predate the latest ranged no-disk engine transition and should not be treated as current performance claims.

Run date: 2026-04-26. Profile: `mixed`. Variant: `v1`. Bundle: 442 files, 52,904,649 bytes.

| Branch | Provider cold create | Unchanged update 1 | Unchanged update 2 | Max memory |
| --- | ---: | ---: | ---: | ---: |
| `crc32` | 40.63 s | 3.00 s | 3.37 s | 100 MB |
| `pre-crc32` | 55.85 s | 1.83 s | 1.81 s | 158 MB |

Follow-up run date: 2026-04-26. Branch: `v2`. Commit: `f767885`. Profile: `mixed`. Variant: `v1`. Bundle: 442 files, 52,904,649 bytes.

| Run | CDK deploy time | Local wall time | Provider duration | Billed duration | Max memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold create | 60.57 s | 91.48 s | 2.636 s | 2.809 s | 113 MB |
| Unchanged 1 | 16.17 s | 23.03 s | 0.793 s | 0.793 s | 113 MB |
| Unchanged 2 | 21.48 s | 27.15 s | 0.740 s | 0.741 s | 113 MB |
| Unchanged 3 | 21.89 s | 27.53 s | 0.748 s | 0.749 s | 113 MB |
| Unchanged 4 | 22.42 s | 27.24 s | 0.743 s | 0.743 s | 113 MB |
| Unchanged 5 | 23.10 s | 28.82 s | 0.739 s | 0.739 s | 113 MB |

Unchanged redeploy summary:

| Metric | Median | p90 |
| --- | ---: | ---: |
| CDK deploy time | 21.89 s | 23.10 s |
| Local wall time | 27.24 s | 28.82 s |
| Provider duration | 0.743 s | 0.793 s |
| Billed duration | 0.743 s | 0.793 s |

The key lesson from those runs was that raw elapsed time is ambiguous without provider counters. A run can look slower because it hashes local ranges, waits on CloudFormation, publishes assets, or performs destination writes. The next benchmark iteration must capture those counters directly.
