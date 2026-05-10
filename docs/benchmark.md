# Benchmark

This page is the human-readable benchmark snapshot for `ShinBucketDeployment`. Benchmarks measure efficiency and compare with upstream AWS CDK `BucketDeployment`; correctness verification lives in `docs/verification.md`. Full sanitized benchmark history is append-only JSONL in `docs/benchmark-history.jsonl`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-benchmark/SKILL.md`.

## Document Ownership

This file owns benchmark context and the latest sanitized human-readable performance snapshot.

`docs/benchmark-history.jsonl` owns the append-only sanitized benchmark record across runs. Before replacing the `Current Results` section here, make sure the previous and new run records are present there.

`docs/verification.md` owns correctness verification status. Benchmark records may inform investigation, but they are not correctness verification evidence; benchmark timing and memory data belongs here or in `docs/benchmark-history.jsonl`.

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
- basic deploy/update/destroy sanity needed to trust timing data; detailed correctness coverage lives in `docs/verification.md`

Benchmark runs should answer these questions:

- How fast is cold create for different bundle shapes?
- How fast is unchanged redeploy?
- How much work is done for sparse same-size updates?
- How much work is done for pruned updates?
- How much unchanged redeploy time is spent reading and hashing existing ZIP entries because no source MD5 catalog is available?
- How effective is source block coalescing?
- Which phase dominates total deployment time: CDK, CloudFormation, provider planning, source reads, hashing, uploads, deletes, or invalidation?

## Current Harness

The `benchmark-assets` example generates deterministic static-site bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either this construct or the upstream AWS CDK `BucketDeployment`; the benchmark implementation is the only intended comparison dimension. Rust uses its normal `Source.asset` path, including the embedded catalog optimization, while AWS uses upstream `Source.asset`.

```bash
SHIN_BENCH_PROFILE=mixed SHIN_BENCH_VARIANT=v1 SHIN_BENCH_STACK_SUFFIX=RunA pnpm example deploy benchmark-assets
SHIN_BENCH_STACK_SUFFIX=RunA pnpm example destroy benchmark-assets
SHIN_BENCH_PROFILE=mixed SHIN_BENCH_VARIANT=v1 SHIN_BENCH_STACK_SUFFIX=RunA pnpm example deploy benchmark-assets-aws
SHIN_BENCH_STACK_SUFFIX=RunA pnpm example destroy benchmark-assets-aws
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SHIN_BENCH_PROFILE` | `mixed` | Asset shape: `tiny-many`, `mixed`, or `large-few`. |
| `SHIN_BENCH_VARIANT` | `v1` | Asset variant: `v1`, `v2`, or `pruned`. |
| `SHIN_BENCH_IMPLEMENTATION` | `rust` | Deployment implementation: `rust` or `aws`. The `benchmark-assets-aws` example sets this to `aws`. |
| `SHIN_BENCH_STACK_SUFFIX` | none | Adds a suffix to the benchmark stack name so multiple runs can coexist. |
| `SHIN_BENCH_DESTINATION_PREFIX` | `benchmark-site` | Destination prefix inside the generated bucket. |
| `SHIN_BENCH_MEMORY_LIMIT_MB` | `1024` | Provider Lambda memory size in MiB. Use distinct stack suffixes when comparing memory sizes. |
| `SHIN_BENCH_MAX_PARALLEL_TRANSFERS` | `8` | Rust provider `maxParallelTransfers` setting for transfer concurrency sweeps. |
| `SHIN_BENCH_PRUNE` | `true` | Set to `false` to disable prune. |
| `SHIN_BENCH_WAIT` | `true` | Present for property toggling; the benchmark stack currently has no CloudFront distribution. |

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

## Methodology Summary

The benchmark harness measures deterministic static-site bundles across create, unchanged, sparse-update, and prune-update phases. Paired Rust-vs-AWS comparison runs must use the same region, profile, variants, destination prefix, memory setting, and repetition count. The latest full workflow is maintained in `.agents/skills/shin-benchmark/SKILL.md`.

The 1024 MiB setting is the preferred default because earlier `large-few` runs showed much faster cold-create provider duration than 512 MiB while keeping billed compute cost in the same range. Memory comparison runs should still include 512, 1024, and 2048 MiB when measuring runtime tuning changes.

## Provider Telemetry

Rust benchmark rows may include the sanitized `shin_deployment_summary` object emitted by the provider. The summary contains aggregate timings, counters, bytes, source range-read stats, and `PutObject` diagnostics, and intentionally omits bucket names, object keys, account IDs, distribution IDs, URLs, and ETags.

`source.blockWaits` is an aggregate count of times a ZIP entry reader could not immediately read a planned source block. Newer provider builds split this into `source.blockWaitsFetching` for readers waiting on an in-flight ranged `GetObject` and `source.blockWaitsCapacity` for readers waiting for source-window memory capacity. `source.blockRefetches` counts replay claims that needed a source block after it had already been released; newer builds also expose `source.replayClaimsAfterRelease`, `source.activeReadersHighWater`, and `source.residentBytesHighWater` to distinguish replay timing from S3 retry/throttle behavior.

Generate Markdown tables and SVG charts from committed or scratch JSONL records:

```bash
pnpm benchmark:report -- --run-id 2026-05-02-large-few-memory-matrix
```

The report groups records by profile, phase, implementation, and memory size. It includes medians, p90, min/max, compact Rust-vs-AWS insight tables, grouped per-phase metric details, and generated SVG visual summaries when paired implementation records exist.

Do not commit `.benchmark-runs/` raw output. Commit only curated aggregate results that do not include sensitive resource identifiers.

## History

Every committed benchmark result is represented as sanitized records in `docs/benchmark-history.jsonl`. Use `null` for unavailable JSONL fields and do not invent values. The latest collection and documentation workflow is maintained in `.agents/skills/shin-benchmark/SKILL.md`.

## Current Results

| Field | Value |
| --- | --- |
| Run date | 2026-05-10 |
| Provider implementation commit | `b74e03d` (`Refine README positioning copy`) |
| Result documentation commit | Pending |
| Region | `ap-southeast-2` |
| Implementation | `rust` |
| Profile | `tiny-many` |
| Baseline variant | `v1` |
| Bundle | 2,584 files, 8,178,618 bytes |
| Provider memory | 1024 MiB |
| Swept setting | `maxParallelTransfers`: 8, 16, 32, 64 |
| Cleanup | All benchmark stacks destroyed after telemetry collection |
| Notes | Rust-only cold-create tuning sweep for the many-small-files profile. All inputs were held constant except `maxParallelTransfers`. Rows include CloudWatch REPORT metrics and sanitized `shin_deployment_summary` counters in `docs/benchmark-history.jsonl`. |

Parallel transfer score table:

| Parallel transfers | Provider duration | Billed duration | Init duration | Max memory | Provider speedup vs 8 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 14.261 s | 14.425 s | 0.163 s | 77 MiB | baseline |
| 16 | 6.874 s | 7.048 s | 0.174 s | 85 MiB | 2.07x faster, 51.8% lower |
| 32 | 3.695 s | 3.830 s | 0.135 s | 96 MiB | 3.86x faster, 74.1% lower |
| 64 | 3.530 s | 3.709 s | 0.178 s | 119 MiB | 4.04x faster, 75.2% lower |

End-to-end timings:

| Parallel transfers | CDK deploy time | Local wall time | CDK delta vs 8 | Local delta vs 8 |
| ---: | ---: | ---: | ---: | ---: |
| 8 | 74.03 s | 118.35 s | baseline | baseline |
| 16 | 67.69 s | 108.92 s | 8.6% lower | 8.0% lower |
| 32 | 66.68 s | 128.05 s | 9.9% lower | 8.2% higher |
| 64 | 67.32 s | 109.94 s | 9.1% lower | 7.1% lower |

Provider summary highlights:

| Parallel transfers | Plan | Destination list | Transfer | Uploaded objects | Uploaded bytes | Source fetched bytes | Block waits | Refetches |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 284 ms | 32 ms | 13,896 ms | 2,585 | 8,178,712 | 856,765 | 72 | 0 |
| 16 | 288 ms | 35 ms | 6,501 ms | 2,585 | 8,178,712 | 856,765 | 117 | 0 |
| 32 | 221 ms | 32 ms | 3,378 ms | 2,585 | 8,178,712 | 856,765 | 262 | 0 |
| 64 | 239 ms | 37 ms | 3,202 ms | 2,585 | 8,178,712 | 1,639,389 | 439 | 1 |

The provider transfer phase improved strongly from 8 to 32 parallel transfers, then mostly plateaued at 64. The 64-worker run was only 0.165 s faster than 32 in provider duration, but used 23 MiB more peak memory and had one source block refetch, so 32 looks like the better speed/memory balance for this single-run tiny-many cold-create sweep. End-to-end CDK deploy time improved by about 9-10% from 8 to 32/64 because CloudFormation and CDK overhead dominate once provider transfer time falls below roughly 4 seconds.
