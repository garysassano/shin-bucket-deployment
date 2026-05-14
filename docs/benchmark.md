# Benchmark

This page is the human-readable benchmark snapshot for `ShinBucketDeployment`. Benchmarks measure efficiency and compare with upstream AWS CDK `BucketDeployment`; correctness verification lives in `docs/verification.md`. Full sanitized benchmark history is append-only JSONL in `docs/benchmark-history.jsonl`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-benchmark/SKILL.md`.

## Document Ownership

This file owns benchmark context and the latest sanitized human-readable performance snapshot.

`docs/benchmark-history.jsonl` owns the append-only sanitized benchmark record across runs. Before replacing the `Current Results` section here, make sure the previous and new run records are present there.

`docs/verification.md` owns correctness verification status. Benchmark records may inform investigation, but they are not correctness verification evidence; benchmark timing and memory data belongs here or in `docs/benchmark-history.jsonl`.

README benchmark snapshot SVGs and local snapshot render tooling live under `benchmarks/`. Keep the human benchmark page and sanitized append-only history in `docs/` so they stay next to the rest of the documentation; treat `benchmarks/` as generated benchmark support assets and tooling, not as the source of truth for sanitized evidence.

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

The `benchmark-assets` example generates deterministic static-site bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either this construct or the upstream AWS CDK `BucketDeployment`; the benchmark implementation is the only intended comparison dimension. Shin uses its normal `Source.asset` path, including the embedded catalog optimization, while AWS uses upstream `Source.asset`.

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
| `SHIN_BENCH_IMPLEMENTATION` | `shin` | Deployment implementation: `shin` or `aws`. The `benchmark-assets-aws` example sets this to `aws`. |
| `SHIN_BENCH_STACK_SUFFIX` | none | Adds a suffix to the benchmark stack name so multiple runs can coexist. |
| `SHIN_BENCH_DESTINATION_PREFIX` | `benchmark-site` | Destination prefix inside the generated bucket. |
| `SHIN_BENCH_MEMORY_LIMIT_MB` | `1024` | Provider Lambda memory size in MiB. Use distinct stack suffixes when comparing memory sizes. |
| `SHIN_BENCH_MAX_PARALLEL_TRANSFERS` | `8` | Shin provider `maxParallelTransfers` setting for transfer concurrency sweeps. |
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

## Advised Runtime Settings

The construct default remains `memoryLimit: 1024` with `maxParallelTransfers: 8` because it is conservative, broadly tested, and already faster than 512 MiB for large-file create work. For deployments dominated by many small file uploads, the 2026-05-10 `tiny-many` cold-create sweep shows that higher transfer parallelism is the main tuning lever, and 2048 MiB only pays off once parallelism reaches 64.

| Workload signal | Advised setting | Evidence baseline | Why |
| --- | --- | --- | --- |
| General static-site deployment, unknown shape, or low tuning appetite | `memoryLimit: 1024`, `maxParallelTransfers: 8` | Default and paired Shin-vs-AWS runs | Conservative memory budget with low observed RSS and no retry/throttle pressure in committed benchmark rows. |
| Large-few assets where transfer throughput matters but file count is modest | `memoryLimit: 1024`, `maxParallelTransfers: 8` | 2026-05-02 `large-few` memory matrix | 1024 MiB cut cold-create provider duration from 1.876 s at 512 MiB to 0.941 s, while 2048 MiB improved further to 0.674 s only for a smaller absolute gain. |
| Many-small-file cold create with higher throughput needs | `memoryLimit: 1024`, `maxParallelTransfers: 32` | 2026-05-10 `tiny-many` 1024 MiB parallel sweep | Provider duration fell from 14.261 s at parallel 8 to 3.695 s at parallel 32; parallel 64 was only 3.530 s and introduced one source block refetch in that run. |
| Many-small-file cold create where minimum provider duration is worth more Lambda memory | `memoryLimit: 2048`, `maxParallelTransfers: 64` | 2026-05-10 `tiny-many` 2048 MiB parallel sweep | Provider duration reached 2.120 s with no source refetches, no source capacity waits, and no destination `PutObject` retries or throttles. |

Treat these as starting points, not universal limits. Re-run a sweep for unusually large archives, unusually high file counts, changed AWS regions, or any workload showing source `getRetries`/`getErrors`, source capacity waits, or destination `putObject` retries/throttles.

## Methodology Summary

The benchmark harness measures deterministic static-site bundles across create, unchanged, sparse-update, and prune-update phases. Paired Shin-vs-AWS comparison runs must use the same region, profile, variants, destination prefix, memory setting, and repetition count. The latest full workflow is maintained in `.agents/skills/shin-benchmark/SKILL.md`.

The 1024 MiB setting is the preferred conservative default because earlier `large-few` runs showed much faster cold-create provider duration than 512 MiB while keeping billed compute cost in the same range. For many-small-file cold creates, benchmark `maxParallelTransfers` alongside memory because the best observed 1024 MiB setting was 32 transfers, while 2048 MiB was needed for a clear 64-transfer improvement. Memory comparison runs should still include 512, 1024, and 2048 MiB when measuring runtime tuning changes.

## Provider Telemetry

Shin benchmark rows may include the sanitized `shin_deployment_summary` object emitted by the provider. The summary contains aggregate timings, counters, bytes, source range-read stats, and `PutObject` diagnostics, and intentionally omits bucket names, object keys, account IDs, distribution IDs, URLs, and ETags.

`source.blockWaits` is an aggregate count of times a ZIP entry reader could not immediately read a planned source block. Newer provider builds split this into `source.blockWaitsFetching` for readers waiting on an in-flight ranged `GetObject` and `source.blockWaitsCapacity` for readers waiting for source-window memory capacity. `source.blockRefetches` counts replay claims that needed a source block after it had already been released; newer builds also expose `source.replayClaimsAfterRelease`, `source.activeReadersHighWater`, and `source.residentBytesHighWater` to distinguish replay timing from S3 retry/throttle behavior.

Generate Markdown tables and SVG charts from committed or scratch JSONL records:

```bash
pnpm benchmark:report -- --run-id 2026-05-02-large-few-memory-matrix
```

The report groups records by profile, phase, implementation, and memory size. It includes medians, p90, min/max, compact Shin-vs-AWS insight tables, grouped per-phase metric details, and generated SVG visual summaries when paired implementation records exist.

Do not commit `.benchmark-runs/` raw output. Commit only curated aggregate results that do not include sensitive resource identifiers.

## History

Every committed benchmark result is represented as sanitized records in `docs/benchmark-history.jsonl`. Use `null` for unavailable JSONL fields and do not invent values. The latest collection and documentation workflow is maintained in `.agents/skills/shin-benchmark/SKILL.md`.

## Current Results

| Field | Value |
| --- | --- |
| Run date | 2026-05-10 |
| Provider implementation commit | `4aed47a` (`expand source block diagnostics`) |
| Result documentation commit | Pending |
| Region | `ap-southeast-2` |
| Implementation | `shin` |
| Profile | `tiny-many` |
| Baseline variant | `v1` |
| Bundle | 2,584 files, 8,178,618 bytes |
| Provider memory | 1024 and 2048 MiB |
| Swept setting | `maxParallelTransfers`: 8, 16, 32, 64 |
| Cleanup | All benchmark stacks destroyed after telemetry collection |
| Notes | Shin-only cold-create tuning sweep for the many-small-files profile. The latest 2048 MiB run held all inputs constant except `maxParallelTransfers` and is compared with the earlier 1024 MiB sweep. Rows include CloudWatch REPORT metrics and sanitized `shin_deployment_summary` counters in `docs/benchmark-history.jsonl`. |

2048 MiB parallel transfer score table:

| Parallel transfers | Provider duration | Billed duration | Init duration | Max memory | Provider speedup vs 8 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 14.876 s | 15.029 s | 0.152 s | 82 MiB | baseline |
| 16 | 6.828 s | 6.968 s | 0.140 s | 84 MiB | 2.18x faster, 54.1% lower |
| 32 | 3.699 s | 3.834 s | 0.134 s | 96 MiB | 4.02x faster, 75.1% lower |
| 64 | 2.120 s | 2.287 s | 0.166 s | 121 MiB | 7.02x faster, 85.8% lower |

1024 vs 2048 MiB provider comparison:

| Parallel transfers | 1024 MiB provider | 2048 MiB provider | 2048 delta | 2048 relative | 1024 max memory | 2048 max memory |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 14.261 s | 14.876 s | +0.615 s | 4.3% higher | 77 MiB | 82 MiB |
| 16 | 6.874 s | 6.828 s | -0.046 s | 0.7% lower | 85 MiB | 84 MiB |
| 32 | 3.695 s | 3.699 s | +0.004 s | 0.1% higher | 96 MiB | 96 MiB |
| 64 | 3.530 s | 2.120 s | -1.410 s | 39.9% lower | 119 MiB | 121 MiB |

2048 MiB end-to-end timings:

| Parallel transfers | CDK deploy time | Local wall time | CDK delta vs 8 | Local delta vs 8 |
| ---: | ---: | ---: | ---: | ---: |
| 8 | 74.40 s | 171.96 s | baseline | baseline |
| 16 | 65.45 s | 106.39 s | 12.0% lower | 38.1% lower |
| 32 | 65.47 s | 103.69 s | 12.0% lower | 39.7% lower |
| 64 | 64.39 s | 102.41 s | 13.5% lower | 40.4% lower |

2048 MiB provider summary highlights:

| Parallel transfers | Plan | Destination list | Transfer | Uploaded objects | Uploaded bytes | Source fetched bytes | Block waits | Fetch waits | Capacity waits | Refetches | Replay after release | Active readers high-water | Resident bytes high-water | Put retries/throttles |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 238 ms | 28 ms | 14,562 ms | 2,585 | 8,178,712 | 856,765 | 46 | 46 | 0 | 0 | 0 | 2 | 782,624 | 0 / 0 |
| 16 | 224 ms | 40 ms | 6,513 ms | 2,585 | 8,178,712 | 856,765 | 142 | 142 | 0 | 0 | 0 | 2 | 782,624 | 0 / 0 |
| 32 | 211 ms | 35 ms | 3,403 ms | 2,585 | 8,178,712 | 856,765 | 238 | 238 | 0 | 0 | 0 | 2 | 782,624 | 0 / 0 |
| 64 | 203 ms | 38 ms | 1,823 ms | 2,585 | 8,178,712 | 856,765 | 458 | 458 | 0 | 0 | 0 | 2 | 782,624 | 0 / 0 |

At 2048 MiB, the provider transfer phase continued to improve through 64 parallel transfers for this many-small-files cold-create sweep. The 64-worker run was 1.579 s faster than 32 in CloudWatch provider duration, with peak memory rising from 96 MiB to 121 MiB. Compared with the earlier 1024 MiB sweep, 2048 MiB materially changed only the 64-worker result: 2.120 s instead of 3.530 s, while 8, 16, and 32 were effectively flat. The expanded diagnostics show no source block refetches, no replay claims after release, no source-window capacity waits, and no destination put retries or throttles in the 2048 MiB sweep; all source block waits were waiting on in-flight ranged reads.
