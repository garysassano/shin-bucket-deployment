# Benchmarking

This document defines the benchmark strategy for `RustBucketDeployment`. The goal is not just elapsed time; it is to explain deployment behavior at every step and produce comparable evidence across code changes.

## Document Ownership

This file owns benchmark methodology, benchmark harness usage, required snapshot schema, and the latest sanitized performance snapshot.

`docs/benchmark-history.jsonl` owns the append-only sanitized benchmark record across runs. Before replacing the `Current Results` section here, make sure the previous and new run records are present there.

`docs/validation.md` owns correctness validation status and AWS functional runbooks. Validation may reference benchmark-backed coverage, but benchmark timing and memory data belongs here or in `docs/benchmark-history.jsonl`.

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
| `RBD_BENCH_MEMORY_LIMIT_MB` | `512` | Provider Lambda memory size in MiB. Use distinct stack suffixes when comparing memory sizes. |
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
RBD_BENCH_MEMORY_LIMIT_MB=512 \
pnpm example deploy benchmark-assets
```

Unchanged redeploy with a provider invocation:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v1 \
RBD_BENCH_STACK_SUFFIX=BenchA \
RBD_BENCH_MEMORY_LIMIT_MB=512 \
RBD_BENCH_WAIT=false \
pnpm example deploy benchmark-assets
```

The benchmark stack has no CloudFront distribution, so toggling `RBD_BENCH_WAIT=false` forces a custom-resource property update without changing deployment behavior. If `RBD_BENCH_WAIT` is left at the default on a byte-identical redeploy, CDK reports no changes and the provider Lambda is not invoked.

Sparse same-size update:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v2 \
RBD_BENCH_STACK_SUFFIX=BenchA \
RBD_BENCH_MEMORY_LIMIT_MB=512 \
pnpm example deploy benchmark-assets
```

Prune update:

```bash
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=pruned \
RBD_BENCH_STACK_SUFFIX=BenchA \
RBD_BENCH_MEMORY_LIMIT_MB=512 \
pnpm example deploy benchmark-assets
```

Destroy:

```bash
RBD_BENCH_STACK_SUFFIX=BenchA RBD_BENCH_MEMORY_LIMIT_MB=512 pnpm example destroy benchmark-assets
```

The 512 MiB setting is the preferred default because the current benchmark matrix showed close to 2x provider-duration improvement over 256 MiB for cold create and prune while keeping billed cost in the same range. Memory comparison runs should repeat the standard sequence with one suffix per memory size, for example `Mem256`, `Mem512`, and `Mem1024`, and set `RBD_BENCH_MEMORY_LIMIT_MB` to `256`, `512`, and `1024` respectively.

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
- provider summary counters from the sanitized `rbd_deployment_summary` log line
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
- put attempts/retries/throttles/failures
- uploaded object count and bytes
- copied object count and bytes
- prune delete count and batches
- CloudFront invalidation id and wait duration when applicable

## Provider Telemetry

The provider maintains a per-invocation deployment stats object:

- initialize it when the handler starts processing a request
- pass it through planning, destination listing, transfer, delete, and invalidation paths
- increment counters close to the AWS SDK call or CPU work being measured
- record phase durations with `Instant`
- emit one sanitized JSON summary line at the end of each successful or failed request
- include no bucket names, object keys, account IDs, distribution IDs, URLs, or ETags in the summary line

The provider emits this as a single sanitized `rbd_deployment_summary` JSON object per custom-resource request. Shape:

```json
{
  "event": "rbd_deployment_summary",
  "requestType": "Update",
  "status": "success",
  "extract": true,
  "prune": true,
  "availableMemoryMb": 512,
  "maxParallelTransfers": 8,
  "durationMs": 812,
  "phaseMs": {
    "plan": 120,
    "destinationList": 180,
    "transfer": 470,
    "delete": 42,
    "cloudfront": 0,
    "oldPrefixDelete": 0
  },
  "counts": {
    "sourceArchives": 1,
    "plannedEntries": 442,
    "filteredEntries": 0,
    "markerEntries": 0,
    "destinationObjects": 442,
    "deleteObjects": 0,
    "deleteBatches": 0,
    "uploadedObjects": 12,
    "skippedObjects": 430,
    "copiedObjects": 0,
    "md5HashAttempts": 442,
    "md5Skips": 430,
    "catalogSkips": 0
  },
  "bytes": {
    "sourceZip": 1063997,
    "uploaded": 10485760,
    "copied": 0
  },
  "source": {
    "plannedBlocks": 38,
    "plannedBytes": 12582912,
    "fetchedBlocks": 38,
    "fetchedBytes": 12582912,
    "getAttempts": 38,
    "getRetries": 0,
    "getErrors": 0,
    "blockHits": 442,
    "blockMisses": 0,
    "blockRefetches": 0,
    "blockWaits": 12
  },
  "putObject": {
    "failedAttempts": 0,
    "retryAttempts": 0,
    "throttledAttempts": 0,
    "retryWaitMs": 0,
    "throttleCooldownWaits": 0,
    "throttleCooldownWaitMs": 0
  }
}
```

The summary intentionally omits bucket names, object keys, account IDs, distribution IDs, URLs, and ETags.

## Benchmark Runner Plan

The current collector can append sanitized phase records to `docs/benchmark-history.jsonl` from command logs, CloudWatch `REPORT` files, and optional provider summary JSONL. A future runner should automate the full matrix end-to-end:

```bash
pnpm benchmark:collect \
  --log-file /tmp/rbd-aws-validation-20260502/benchmark-memory/mem512-create-v1.log \
  --report-file /tmp/rbd-aws-validation-20260502/benchmark-memory/report-example.json \
  --run-id 2026-05-02-mixed-memory-matrix \
  --run-date 2026-05-02 \
  --phase cold-create \
  --series full-create-update-prune \
  --commit 345efe0 \
  --subject "simplify runtime tuning props" \
  --region ap-southeast-2
```

- builds the project once
- deploys each profile/variant sequence with unique stack suffixes
- captures local wall time
- collects CloudFormation stack events for the custom resource timing
- queries CloudWatch Logs for provider summary lines and Lambda REPORT lines
- optionally queries S3 object state for key-count and spot content validation
- writes sanitized JSONL under an ignored output directory such as `.benchmark-runs/`
- prints a Markdown summary table for commit-to-commit comparison

Do not commit `.benchmark-runs/` raw output. Commit only curated aggregate results that do not include sensitive resource identifiers.

## Result Storage Schema

Every committed benchmark result must be represented as sanitized records in `docs/benchmark-history.jsonl`. This file keeps a human-readable summary of only the latest run.

`docs/benchmark-history.jsonl` is append-only JSONL with one JSON object per measured phase. Each object uses this schema:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Schema version, currently `1`. |
| `runId` | Stable identifier grouping related phase rows. |
| `runDate` | ISO date, for example `2026-05-02`. |
| `providerImplementationCommit` | Commit measured by the provider Lambda. |
| `providerImplementationSubject` | Short commit subject, when known. |
| `resultDocumentationCommit` | Commit that first recorded the sanitized result, or `null` until committed. |
| `region` | AWS region only, not account information. |
| `profile` | Benchmark asset profile. |
| `series` | Logical run series, for example `full-create-update-prune` or `forced-unchanged`. |
| `memoryMb` | Provider Lambda memory size in MiB. |
| `phase` | Measured phase name. |
| `variant` | Asset variant, or `null` when not applicable. |
| `fileCount` | Source file count for the phase, or `null` when not applicable. |
| `totalBytes` | Source total bytes for the phase, or `null` when not applicable. |
| `cdkDeploySeconds` | CDK-reported deploy time, or `null` when unavailable. |
| `localWallSeconds` | Local wall time around the command, or `null` when unavailable. |
| `providerDurationSeconds` | Provider Lambda duration from the `REPORT` line, or `null` when not invoked. |
| `billedDurationSeconds` | Provider Lambda billed duration, or `null` when not invoked. |
| `initDurationSeconds` | Lambda init duration, or `null` when unavailable. |
| `maxMemoryMb` | Lambda max memory from the `REPORT` line, or `null` when not invoked. |
| `providerInvoked` | Whether the provider Lambda was invoked for this phase. |
| `cleanup` | Cleanup status for the run group, when known. |
| `notes` | Short caveats, without resource identifiers. |

Use `null` for unavailable JSONL fields. Do not invent values.

The latest human-readable snapshot in this file uses a metadata table and result tables derived from those JSONL records.

Metadata table:

| Field | Value |
| --- | --- |
| Run date | ISO date, for example `2026-05-02` |
| Provider implementation commit | Commit measured by the provider Lambda |
| Result documentation commit | Commit that first recorded the sanitized result, or blank until committed |
| Region | AWS region only, not account information |
| Profile | Benchmark asset profile |
| Baseline variant | Baseline asset variant |
| Baseline bundle | File count and total bytes |
| Comparison variants | Variant names and file counts/bytes when measured |
| Provider memory | Memory settings included in the run |
| Cleanup | Stack cleanup outcome |
| Notes | Short caveats, for example missing fields or forced update behavior |

Result table columns:

| Memory | Phase | Variant | CDK deploy time | Local wall time | Provider duration | Billed duration | Init duration | Max memory |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Leave unavailable Markdown cells empty. Use `not invoked` only when CloudFormation/CDK intentionally did not invoke the provider for that phase. Use `n/a` only when a field does not apply to the phase.

When a new benchmark run becomes the latest result:

1. Append sanitized phase records for the new run to `docs/benchmark-history.jsonl`.
2. If the previous `Current Results` were not already recorded in JSONL, add them before replacing the human-readable summary.
3. Replace `Current Results` in this file with a human-readable summary of the new run using the metadata and result table shapes above.
4. Confirm raw logs remain outside git and only sanitized aggregate data is committed.
5. Record whether all benchmark stacks were destroyed.

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

## Current Results

| Field | Value |
| --- | --- |
| Run date | 2026-05-02 |
| Provider implementation commit | `345efe0` (`simplify runtime tuning props`) |
| Result documentation commit | `f8dd502` (`document benchmark memory results`) |
| Region | `ap-southeast-2` |
| Profile | `mixed` |
| Baseline variant | `v1` |
| Baseline bundle | 442 files, 52,904,649 bytes |
| Comparison variants | `v2`: 442 files, 52,904,649 bytes; `pruned`: 397 files, 48,185,955 bytes |
| Provider memory | 256, 512, and 1024 MiB |
| Cleanup | All benchmark stacks destroyed after collection |
| Notes | The no-change redeploy rows did not invoke the provider; forced unchanged rows used `RBD_BENCH_WAIT=false` on a stack with no CloudFront distribution. |

Full create/update/prune sequence:

| Memory | Phase | Variant | CDK deploy time | Local wall time | Provider duration | Billed duration | Init duration | Max memory |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 256 MiB | Cold create | `v1` | 65.91 s | 116.98 s | 4.355 s | 4.524 s | 0.168 s | 74 MB |
| 256 MiB | No-change redeploy | `v1` | 0.00 s | 25.96 s | not invoked | not invoked | n/a | n/a |
| 256 MiB | Sparse update | `v2` | 14.27 s | 63.44 s | 0.593 s | 0.594 s | n/a | 74 MB |
| 256 MiB | Prune update | `pruned` | 22.14 s | 68.88 s | 4.082 s | 4.083 s | n/a | 74 MB |
| 256 MiB | Destroy | n/a | n/a | 37.78 s | 0.052 s | 0.053 s | n/a | 74 MB |
| 512 MiB | Cold create | `v1` | 66.04 s | 106.83 s | 2.362 s | 2.527 s | 0.165 s | 68 MB |
| 512 MiB | No-change redeploy | `v1` | 0.00 s | 26.53 s | not invoked | not invoked | n/a | n/a |
| 512 MiB | Sparse update | `v2` | 14.30 s | 57.86 s | 0.461 s | 0.462 s | n/a | 68 MB |
| 512 MiB | Prune update | `pruned` | 20.26 s | 63.87 s | 2.690 s | 2.691 s | n/a | 70 MB |
| 512 MiB | Destroy | n/a | n/a | 44.15 s | 0.046 s | 0.046 s | n/a | 72 MB |
| 1024 MiB | Cold create | `v1` | 65.89 s | 107.88 s | 2.166 s | 2.336 s | 0.170 s | 62 MB |
| 1024 MiB | No-change redeploy | `v1` | 0.00 s | 26.28 s | not invoked | not invoked | n/a | n/a |
| 1024 MiB | Sparse update | `v2` | 14.28 s | 57.54 s | 0.408 s | 0.409 s | n/a | 64 MB |
| 1024 MiB | Prune update | `pruned` | 22.14 s | 65.83 s | 2.276 s | 2.276 s | n/a | 74 MB |
| 1024 MiB | Destroy | n/a | n/a | 43.73 s | 0.045 s | 0.046 s | n/a | 74 MB |

Forced unchanged provider runs, using `RBD_BENCH_WAIT=false` on the second `v1` deploy:

| Memory | Phase | Variant | CDK deploy time | Local wall time | Provider duration | Billed duration | Init duration | Max memory |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 256 MiB | Cold create | `v1` | 66.35 s | 107.48 s | 4.089 s | 4.219 s | 0.129 s | 76 MB |
| 256 MiB | Forced unchanged | `v1` | 14.21 s | 72.88 s | 0.264 s | 0.264 s | n/a | 76 MB |
| 256 MiB | Destroy | n/a | n/a | 44.79 s | 0.053 s | 0.054 s | n/a | 76 MB |
| 512 MiB | Cold create | `v1` | 66.15 s | 107.63 s | 2.270 s | 2.405 s | 0.135 s | 68 MB |
| 512 MiB | Forced unchanged | `v1` | 14.16 s | 57.72 s | 0.212 s | 0.212 s | n/a | 68 MB |
| 512 MiB | Destroy | n/a | n/a | 43.99 s | 0.051 s | 0.051 s | n/a | 68 MB |
| 1024 MiB | Cold create | `v1` | 65.61 s | 106.86 s | 1.946 s | 2.074 s | 0.128 s | 64 MB |
| 1024 MiB | Forced unchanged | `v1` | 14.20 s | 57.56 s | 0.222 s | 0.223 s | n/a | 64 MB |
| 1024 MiB | Destroy | n/a | n/a | 44.03 s | 0.048 s | 0.049 s | n/a | 64 MB |

These results validate that the ranged, no-disk ZIP path stays comfortably below 256 MiB for the `mixed` profile. The highest reported memory across this matrix was 76 MB. Newer provider builds emit sanitized summary counters for detailed phase attribution; these historical rows predate that summary line.
