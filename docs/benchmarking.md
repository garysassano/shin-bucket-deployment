# Benchmarking

Use the `benchmark-assets` example to compare deployment behavior across branches with the same generated static-site bundle.

Keep this benchmark harness identical on both branches before comparing results. Commit it once and cherry-pick that commit onto `crc32` and `pre-crc32`, or run both branch builds from a common branch that only changes the Rust provider implementation.

## Asset Profiles

The generator writes deterministic files under `.benchmark-assets/`, which is ignored by git.

| Profile | Shape | Intended signal |
| --- | --- | --- |
| `tiny-many` | Thousands of small JS, CSS, and JSON files. | Shows whether per-object API overhead dominates. |
| `mixed` | SPA-like bundle with JS chunks, source maps, JSON, media, and fonts. | Best default for realistic static-site behavior. |
| `large-few` | Fewer large JS, map, and media files. | Shows whether CRC32 avoids expensive local hashing. |

Variants:

| Variant | Behavior |
| --- | --- |
| `v1` | Baseline bundle. |
| `v2` | Same file set and sizes, with a few changed files. |
| `pruned` | Removes about ten percent of files. |

## Commands

Build the current branch:

```sh
pnpm build
```

Deploy the mixed baseline:

```sh
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v1 \
RBD_BENCH_STACK_SUFFIX=Crc32 \
pnpm example deploy benchmark-assets
```

Redeploy unchanged:

```sh
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v1 \
RBD_BENCH_WAIT=false \
RBD_BENCH_STACK_SUFFIX=Crc32 \
pnpm example deploy benchmark-assets
```

Toggle `RBD_BENCH_WAIT` between `true` and `false` for repeated unchanged redeploys. The benchmark stack has no CloudFront distribution, so this changes the custom resource properties without changing the S3 source or destination.

Redeploy with same-size content changes:

```sh
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=v2 \
RBD_BENCH_STACK_SUFFIX=Crc32 \
pnpm example deploy benchmark-assets
```

Redeploy with pruning:

```sh
RBD_BENCH_PROFILE=mixed \
RBD_BENCH_VARIANT=pruned \
RBD_BENCH_STACK_SUFFIX=Crc32 \
pnpm example deploy benchmark-assets
```

Destroy:

```sh
RBD_BENCH_STACK_SUFFIX=Crc32 pnpm example destroy benchmark-assets
```

Repeat the same sequence on the comparison branch with a different `RBD_BENCH_STACK_SUFFIX`, for example `PreCrc32`.

## What To Record

For each run, record:

- branch name and commit
- profile and variant
- CloudFormation deploy wall time
- provider Lambda duration, billed duration, and max memory from logs
- S3 request shape if request metrics are enabled: list, head, put, get, delete, bytes uploaded, bytes downloaded
- whether the run is cold create, unchanged redeploy, same-size update, or prune update

Run each unchanged redeploy at least five times and compare median plus p90. The first deploy mostly measures upload throughput and asset publishing; unchanged redeploys are the main signal for the CRC32 versus MD5/ETag decision.

## Initial AWS Result

Run date: 2026-04-26. Profile: `mixed`. Variant: `v1`. Bundle: 442 files, 52,904,649 bytes. Both test stacks were destroyed after the run.

| Branch | Provider cold create | Unchanged update 1 | Unchanged update 2 | Max memory |
| --- | ---: | ---: | ---: | ---: |
| `crc32` | 40.63 s | 3.00 s | 3.37 s | 100 MB |
| `pre-crc32` | 55.85 s | 1.83 s | 1.81 s | 158 MB |

On this mixed bundle, CRC32 improved cold-create provider duration and memory, but unchanged redeploys were slower than the MD5/ETag path. The likely reason is that the CRC32 path pays one checksum-mode `HeadObject` per unchanged object, while the old path hashes the local zip entries directly. This points toward a size threshold before using remote checksum reads.
