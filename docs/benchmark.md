# Benchmark

This page is the human-readable benchmark snapshot for `ShinBucketDeployment`. Benchmarks measure efficiency across selected Lambda configs and, when useful, compare with upstream AWS CDK `BucketDeployment`; correctness verification lives in `docs/verification.md`. Sanitized benchmark result rows for the current curated benchmark set live in `benchmarks/results.jsonl`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-benchmark/SKILL.md`.

## Document Ownership

This file owns benchmark context and the latest sanitized human-readable performance snapshot.

`benchmarks/results.jsonl` owns the sanitized benchmark records used by reports and charts. It is not append-only history; replace or prune it when the benchmark snapshot changes.

`docs/verification.md` owns correctness verification status. Benchmark records may inform investigation, but they are not correctness verification evidence; benchmark timing and memory data belongs here or in `benchmarks/results.jsonl`.

README benchmark snapshot SVGs, result rows, report rendering, and local snapshot render tooling live under `benchmarks/`. Treat `docs/benchmark.md` as the narrative page and `benchmarks/results.jsonl` as structured chart/report input.

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

The `assets` benchmark scenario generates deterministic static-site bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either this construct or the upstream AWS CDK `BucketDeployment`; the benchmark implementation is the only intended comparison dimension. Shin uses its normal `Source.asset` path, including the embedded catalog optimization, while AWS uses upstream `Source.asset`.

```bash
AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
pnpm benchmark:run-assets -- \
  --config benchmarks/configs/tiny-many-shin-aws-2048-4096.json
```

Curated benchmark matrices should live as committed JSON files under `benchmarks/configs/`. The runner accepts CLI overrides such as `--lambda-configs`, `--run-token`, `--last-updated`, `--scratch-root`, and `--concurrency`, but the config file is the source of truth for profile, Lambda configs, implementations, phases, region, output file, and destination prefix. `runToken` is only for scratch paths and stack suffixes; committed result rows are upserted by benchmark dimensions.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SHIN_BENCH_PROFILE` | `mixed` | Asset shape: `tiny-many`, `mixed`, or `large-few`. |
| `SHIN_BENCH_STATE` | `baseline` | Asset state: `baseline`, `changed`, or `pruned`. |
| `SHIN_BENCH_IMPLEMENTATION` | `shin` | Deployment implementation: `shin` or `aws`. The benchmark runner sets this from `--implementations`. |
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

States:

| State | Behavior | Signal |
| --- | --- | --- |
| `baseline` | Baseline bundle. | Cold create and unchanged redeploy baseline. |
| `changed` | Same file set and sizes, with a few changed files. | Sparse same-size update behavior. |
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

The benchmark harness measures deterministic static-site bundles across create, unchanged, sparse-update, and prune-update phases. Paired Shin-vs-AWS comparison runs must use the same region, profile, states, destination prefix, memory setting, and repetition count. The latest full workflow is maintained in `.agents/skills/shin-benchmark/SKILL.md`.

The 1024 MiB setting is the preferred conservative default because earlier `large-few` runs showed much faster cold-create provider duration than 512 MiB while keeping billed compute cost in the same range. For many-small-file cold creates, benchmark `maxParallelTransfers` alongside memory because the best observed 1024 MiB setting was 32 transfers, while 2048 MiB was needed for a clear 64-transfer improvement. Memory comparison runs should still include 512, 1024, and 2048 MiB when measuring runtime tuning changes.

## Provider Telemetry

Shin benchmark rows may include the sanitized `shin_deployment_summary` object emitted by the provider. The summary contains aggregate timings, counters, bytes, source range-read stats, and `PutObject` diagnostics, and intentionally omits bucket names, object keys, account IDs, distribution IDs, URLs, and ETags.

`source.blockWaits` is an aggregate count of times a ZIP entry reader could not immediately read a planned source block. Newer provider builds split this into `source.blockWaitsFetching` for readers waiting on an in-flight ranged `GetObject` and `source.blockWaitsCapacity` for readers waiting for source-window memory capacity. `source.blockRefetches` counts replay claims that needed a source block after it had already been released; newer builds also expose `source.replayClaimsAfterRelease`, `source.activeReadersHighWater`, and `source.residentBytesHighWater` to distinguish replay timing from S3 retry/throttle behavior.

Generate Markdown tables and SVG charts from committed or scratch JSONL records:

```bash
pnpm benchmark:report -- --profile tiny-many --memory-mb 2048 --parallel 64
```

The report groups records by profile, phase, implementation, memory size, and parallel setting. It includes medians, p90, min/max, compact Shin-vs-AWS insight tables, grouped per-phase metric details, and generated SVG visual summaries when paired implementation records exist.

Do not commit `.benchmark-runs/` raw output. Commit only curated aggregate results that do not include sensitive resource identifiers.

## Result Rows

Committed benchmark results are represented as sanitized current-result records in `benchmarks/results.jsonl`. Rows are upserted by `profile`, `memoryMb`, `parallel`, `implementation`, `phase`, and `state`; use `lastUpdated` for the row refresh date. Use `null` for unavailable JSONL fields and do not invent values. The latest collection and documentation workflow is maintained in `.agents/skills/shin-benchmark/SKILL.md`.

## Current Results

| Field | Value |
| --- | --- |
| Run date | 2026-05-14 |
| Run ID | `2026-05-14-shin-aws-tiny-many-2048-64-4096-128` |
| Provider implementation commit | `1dbf9a7` (`rework scenario and benchmark workflows`) |
| Result documentation commit | Pending |
| Region | `ap-southeast-2` |
| Implementation | Paired `shin` and upstream AWS CDK `BucketDeployment` |
| Profile | `tiny-many` |
| States | `baseline`, `changed`, and `pruned` |
| Bundle | Baseline/changed: 2,584 files, 8,178,618 bytes; pruned: 2,325 files, 7,332,858 bytes |
| Provider memory | 2048 and 4096 MiB |
| Shin parallelism | 2048 MiB used `maxParallelTransfers: 64`; 4096 MiB used `maxParallelTransfers: 128` |
| Cleanup | All benchmark stacks destroyed after telemetry collection |
| Notes | Paired Shin/AWS comparison for the many-small-files profile. Each row has one repetition and includes CloudWatch REPORT metrics; Shin rows also include sanitized `shin_deployment_summary` counters in `benchmarks/results.jsonl`. |

Paired comparison summary:

| Phase | Memory | Provider duration | Local wall time | CDK deploy time | Max memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| `cold-create` | 2048 MiB | Shin 2.074 s vs AWS 13.974 s, 6.74x faster | Shin 131.105 s vs AWS 132.566 s, 1.01x faster | Shin 73.33 s vs AWS 78.11 s, 1.07x faster | Shin 122 MiB vs AWS 216 MiB |
| `forced-unchanged` | 2048 MiB | Shin 0.416 s vs AWS 14.349 s, 34.49x faster | Shin 59.360 s vs AWS 77.273 s, 1.30x faster | Shin 15.75 s vs AWS 29.59 s, 1.88x faster | Shin 150 MiB vs AWS 216 MiB |
| `sparse-update` | 2048 MiB | Shin 0.616 s vs AWS 14.404 s, 23.38x faster | Shin 76.166 s vs AWS 94.392 s, 1.24x faster | Shin 18.02 s vs AWS 31.38 s, 1.74x faster | Shin 181 MiB vs AWS 216 MiB |
| `prune-update` | 2048 MiB | Shin 2.959 s vs AWS 14.116 s, 4.77x faster | Shin 82.044 s vs AWS 96.835 s, 1.18x faster | Shin 24.08 s vs AWS 32.23 s, 1.34x faster | Shin 219 MiB vs AWS 216 MiB |
| `cold-create` | 4096 MiB | Shin 1.370 s vs AWS 15.365 s, 11.22x faster | Shin 130.051 s vs AWS 121.002 s, 1.08x slower | Shin 67.55 s vs AWS 75.69 s, 1.12x faster | Shin 169 MiB vs AWS 216 MiB |
| `forced-unchanged` | 4096 MiB | Shin 0.424 s vs AWS 15.479 s, 36.51x faster | Shin 67.210 s vs AWS 79.084 s, 1.18x faster | Shin 17.73 s vs AWS 31.57 s, 1.78x faster | Shin 177 MiB vs AWS 217 MiB |
| `sparse-update` | 4096 MiB | Shin 0.651 s vs AWS 15.792 s, 24.26x faster | Shin 73.820 s vs AWS 90.657 s, 1.23x faster | Shin 18.17 s vs AWS 30.25 s, 1.67x faster | Shin 231 MiB vs AWS 218 MiB |
| `prune-update` | 4096 MiB | Shin 2.191 s vs AWS 15.034 s, 6.86x faster | Shin 67.999 s vs AWS 75.654 s, 1.11x faster | Shin 17.45 s vs AWS 29.12 s, 1.67x faster | Shin 352 MiB vs AWS 218 MiB |

Shin provider summary highlights:

| Memory / parallel | Phase | Plan | Destination list | Transfer | Delete | Uploaded / skipped / deleted objects | Uploaded bytes | Source fetched bytes | Waits fetch / capacity | Refetches | Replay after release | Active readers high-water | Resident bytes high-water | Put retries/throttles |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2048 MiB / 64 | `cold-create` | 234 ms | 30 ms | 1,765 ms | 0 ms | 2,585 / 0 / 0 | 8,178,716 | 856,774 | 492 / 0 | 0 | 0 | 2 | 782,630 | 0 / 0 |
| 2048 MiB / 64 | `forced-unchanged` | 110 ms | 257 ms | 1 ms | 0 ms | 0 / 2,585 / 0 | 0 | 74,144 | 0 / 0 | 0 | 0 | 1 | 74,144 | 0 / 0 |
| 2048 MiB / 64 | `sparse-update` | 208 ms | 233 ms | 120 ms | 0 ms | 3 / 2,582 / 0 | 20,809 | 74,938 | 43 / 0 | 0 | 0 | 2 | 74,135 | 0 / 0 |
| 2048 MiB / 64 | `prune-update` | 234 ms | 254 ms | 1,599 ms | 822 ms | 2,326 / 0 / 259 | 7,332,954 | 770,797 | 548 / 0 | 0 | 0 | 2 | 703,941 | 0 / 0 |
| 4096 MiB / 128 | `cold-create` | 217 ms | 35 ms | 1,065 ms | 0 ms | 2,585 / 0 / 0 | 8,178,716 | 856,774 | 939 / 0 | 0 | 0 | 3 | 782,630 | 0 / 0 |
| 4096 MiB / 128 | `forced-unchanged` | 113 ms | 263 ms | 1 ms | 0 ms | 0 / 2,585 / 0 | 0 | 74,144 | 0 / 0 | 0 | 0 | 1 | 74,144 | 0 / 0 |
| 4096 MiB / 128 | `sparse-update` | 220 ms | 268 ms | 113 ms | 0 ms | 3 / 2,582 / 0 | 20,809 | 74,938 | 53 / 0 | 0 | 0 | 2 | 74,135 | 0 / 0 |
| 4096 MiB / 128 | `prune-update` | 173 ms | 268 ms | 886 ms | 821 ms | 2,326 / 0 / 259 | 7,332,954 | 770,797 | 592 / 0 | 0 | 0 | 3 | 703,941 | 0 / 0 |

The 4096 MiB / 128-worker Shin run improved provider duration over the 2048 MiB / 64-worker run for `cold-create` and `prune-update`, but used more memory and did not improve the small `forced-unchanged` or `sparse-update` handler paths. Across both Shin configs, diagnostics showed no source refetches, no replay-after-release claims, no source-window capacity waits, and no destination `PutObject` retries or throttles; all source block waits were waits on in-flight ranged reads, not S3 throttling evidence.

End-to-end local wall times remain dominated by CDK asset work and one-run AWS control-plane variance. In this run, 4096 MiB Shin had a faster CDK deploy time than AWS for `cold-create` but a slower measured local wall time, so use provider duration and repeated runs when making fine-grained tuning decisions.
