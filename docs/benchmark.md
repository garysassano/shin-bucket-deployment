# Benchmark

This page is the human-readable benchmark snapshot for `RustBucketDeployment`. Full sanitized benchmark history is append-only JSONL in `docs/benchmark-history.jsonl`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in the repo-local agent skill at `.agents/skills/rbd-benchmark-verification/SKILL.md`.

## Document Ownership

This file owns benchmark context and the latest sanitized human-readable performance snapshot.

`docs/benchmark-history.jsonl` owns the append-only sanitized benchmark record across runs. Before replacing the `Current Results` section here, make sure the previous and new run records are present there.

`docs/verification.md` owns correctness verification status. Verification may reference benchmark-backed coverage, but benchmark timing and memory data belongs here or in `docs/benchmark-history.jsonl`.

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

The `benchmark-assets` example generates deterministic static-site bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either this construct or the upstream AWS CDK `BucketDeployment`; the benchmark implementation is the only intended comparison dimension. Rust uses its normal `Source.asset` path, including the embedded catalog optimization, while AWS uses upstream `Source.asset`.

```bash
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=RunA pnpm example deploy benchmark-assets
RBD_BENCH_STACK_SUFFIX=RunA pnpm example destroy benchmark-assets
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=RunA pnpm example deploy benchmark-assets-aws
RBD_BENCH_STACK_SUFFIX=RunA pnpm example destroy benchmark-assets-aws
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RBD_BENCH_PROFILE` | `mixed` | Asset shape: `tiny-many`, `mixed`, or `large-few`. |
| `RBD_BENCH_VARIANT` | `v1` | Asset variant: `v1`, `v2`, or `pruned`. |
| `RBD_BENCH_IMPLEMENTATION` | `rust` | Deployment implementation: `rust` or `aws`. The `benchmark-assets-aws` example sets this to `aws`. |
| `RBD_BENCH_STACK_SUFFIX` | none | Adds a suffix to the benchmark stack name so multiple runs can coexist. |
| `RBD_BENCH_DESTINATION_PREFIX` | `benchmark-site` | Destination prefix inside the generated bucket. |
| `RBD_BENCH_MEMORY_LIMIT_MB` | `1024` | Provider Lambda memory size in MiB. Use distinct stack suffixes when comparing memory sizes. |
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

## Methodology Summary

The benchmark harness measures deterministic static-site bundles across create, unchanged, sparse-update, and prune-update phases. Paired Rust-vs-AWS comparison runs must use the same region, profile, variants, destination prefix, memory setting, and repetition count. The latest full workflow is maintained in `.agents/skills/rbd-benchmark-verification/SKILL.md`.

The 1024 MiB setting is the preferred default because earlier `large-few` runs showed much faster cold-create provider duration than 512 MiB while keeping billed compute cost in the same range. Memory comparison runs should still include 512, 1024, and 2048 MiB when measuring runtime tuning changes.

## Provider Telemetry

Rust benchmark rows may include the sanitized `rbd_deployment_summary` object emitted by the provider. The summary contains aggregate timings, counters, bytes, source range-read stats, and `PutObject` diagnostics, and intentionally omits bucket names, object keys, account IDs, distribution IDs, URLs, and ETags.

Generate Markdown tables and text bar charts from committed or scratch JSONL records:

```bash
pnpm benchmark:report -- --run-id 2026-05-02-large-few-memory-matrix
```

The report groups records by profile, phase, implementation, and memory size. It includes medians, p90, min/max, compact Rust-vs-AWS insight tables, grouped per-phase metric details, and text visual summaries when paired implementation records exist.

Do not commit `.benchmark-runs/` raw output. Commit only curated aggregate results that do not include sensitive resource identifiers.

## History

Every committed benchmark result is represented as sanitized records in `docs/benchmark-history.jsonl`. Use `null` for unavailable JSONL fields and do not invent values. The latest collection and documentation workflow is maintained in `.agents/skills/rbd-benchmark-verification/SKILL.md`.

## Current Results

| Field | Value |
| --- | --- |
| Run date | 2026-05-09 |
| Provider implementation commit | `69ad582` (`use bucket grants for destination writes`) |
| Result documentation commit | Pending |
| Region | `ap-southeast-2` |
| Implementations | `rust`, `aws` |
| Profile | `tiny-many` |
| Baseline variant | `v1` |
| Baseline bundle | 2,584 files, 8,178,618 bytes |
| Comparison variants | `v2`: 2,584 files, 8,178,618 bytes; `pruned`: 2,325 files, 7,332,858 bytes |
| Provider memory | 1024 MiB |
| Cleanup | All benchmark stacks destroyed after collection |
| Notes | Paired Rust/AWS comparison for the many-small-files profile. Forced unchanged rows used `RBD_BENCH_WAIT=false` on a stack with no CloudFront distribution. Rust rows include sanitized provider summary counters in `docs/benchmark-history.jsonl`. |

RustBucketDeployment vs AWS BucketDeployment insight table:

| Phase | Provider duration | Local wall time | CDK deploy time | Max memory |
| --- | ---: | ---: | ---: | ---: |
| Cold create | 14.259 s vs 27.316 s (1.916x faster) | 138.37 s vs 160.91 s (1.163x faster) | 70.89 s vs 90.82 s (1.281x faster) | 79 MiB vs 212 MiB (62.736% lower) |
| Forced unchanged | 0.46 s vs 28.264 s (61.443x faster) | 57.93 s vs 86.4 s (1.491x faster) | 14.19 s vs 46.06 s (3.246x faster) | 89 MiB vs 214 MiB (58.411% lower) |
| Sparse update | 0.622 s vs 28.76 s (46.238x faster) | 66.53 s vs 108.05 s (1.624x faster) | 14.14 s vs 46.23 s (3.269x faster) | 89 MiB vs 214 MiB (58.411% lower) |
| Prune update | 15.758 s vs 28.356 s (1.799x faster) | 88.43 s vs 107.79 s (1.219x faster) | 34.14 s vs 46.08 s (1.35x faster) | 95 MiB vs 214 MiB (55.607% lower) |

Detailed per-phase metric comparisons are generated from `docs/benchmark-history.jsonl` using `pnpm benchmark:report`. The visual summaries below show the actual amount saved by RustBucketDeployment instead of plotting two overlapping construct series.

Provider duration saved by RustBucketDeployment:

```text
cold-create 1024           | ##############                 13.057 s faster (1.916x AWS/Rust)
forced-unchanged 1024      | ############################## 27.804 s faster (61.443x AWS/Rust)
sparse-update 1024         | ############################## 28.138 s faster (46.238x AWS/Rust)
prune-update 1024          | #############                  12.598 s faster (1.799x AWS/Rust)
```

Local wall time saved by RustBucketDeployment:

```text
cold-create 1024           | ################               22.54 s faster (1.163x AWS/Rust)
forced-unchanged 1024      | #####################          28.47 s faster (1.491x AWS/Rust)
sparse-update 1024         | ############################## 41.52 s faster (1.624x AWS/Rust)
prune-update 1024          | ##############                 19.36 s faster (1.219x AWS/Rust)
```

CDK deploy time saved by RustBucketDeployment:

```text
cold-create 1024           | ###################            19.93 s faster (1.281x AWS/Rust)
forced-unchanged 1024      | ############################## 31.87 s faster (3.246x AWS/Rust)
sparse-update 1024         | ############################## 32.09 s faster (3.269x AWS/Rust)
prune-update 1024          | ###########                    11.94 s faster (1.35x AWS/Rust)
```

Max memory saved by RustBucketDeployment:

```text
cold-create 1024           | ############################## 133 MiB lower (2.684x AWS/Rust)
forced-unchanged 1024      | ############################   125 MiB lower (2.404x AWS/Rust)
sparse-update 1024         | ############################   125 MiB lower (2.404x AWS/Rust)
prune-update 1024          | ###########################    119 MiB lower (2.253x AWS/Rust)
```

Provider summary highlights:

| Implementation | Phase | Uploaded objects | Skipped objects | Deleted objects | Uploaded bytes | Source fetched bytes |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Rust | Cold create | 2,585 | 0 | 0 | 8,178,712 | 856,771 |
| Rust | Forced unchanged | 0 | 2,585 | 0 | 0 | 74,147 |
| Rust | Sparse update | 3 | 2,582 | 0 | 20,806 | 74,943 |
| Rust | Prune update | 2,326 | 0 | 259 | 7,332,956 | 770,804 |

These results validate the many-small-files path at the 1024 MiB default. The highest reported Rust memory in this paired run was 95 MB, compared with 214 MB for upstream AWS `BucketDeployment`. Rust provider duration was lower in every measured phase, with the largest relative gains on unchanged and sparse updates where the embedded catalog avoided per-object source hashing.
