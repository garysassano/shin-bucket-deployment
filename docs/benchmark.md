# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

## Where To Look

| Artifact | Purpose |
| --- | --- |
| `benchmarks/README.md` | Human-viewable benchmark snapshots and links to committed SVG charts. |
| `benchmarks/telemetry.md` | In-depth Markdown view of Shin provider telemetry grouped by profile, memory, parallelism, and phase. |
| `benchmarks/results.jsonl` | Structured sanitized benchmark result rows used by reports and charts. |
| `benchmarks/configs/` | Curated benchmark run matrices. |
| `benchmarks/src/` | Benchmark runner, collector, table renderer, and report/chart renderers. |

## PR #12 Performance Decision Run

PR #12's encryption-aware change was accepted from a controlled three-repetition AWS run on 2026-07-12. The run used the configured test profile in `eu-central-1`, serialized stacks (`concurrency=1`), 2048 MiB Lambda memory, 32 parallel transfers, identical deterministic assets, and the same four ordered phases for each implementation. Values below are medians from CloudWatch `REPORT` records; memory is peak Lambda memory for the same phase.

The `before` implementation is `8134576`, the universal-checksum PR #12 candidate. The current SSE-S3 implementation is `3bcd033`; the managed-KMS measurements use the provider fix captured by `7a910f4`. Upstream is AWS CDK 2.260.0 `BucketDeployment`. The KMS provider binary was rebuilt from `7a910f4` and staged into the otherwise identical benchmark app.

### SSE-S3 fast path

| Profile | Phase | Provider seconds, before / current / upstream | Current vs before | Upstream / current | Peak MiB, before / current / upstream |
| --- | --- | ---: | ---: | ---: | ---: |
| `tiny-many` | `cold-create` | 2.595 / 2.447 / 14.844 | -5.7% | 6.1x | 105 / 89 / 220 |
| `tiny-many` | `unchanged-update` | 0.426 / 0.354 / 15.208 | -16.9% | 43.0x | 105 / 89 / 220 |
| `tiny-many` | `changed-update` | 0.570 / 0.513 / 14.966 | -10.0% | 29.2x | 105 / 89 / 220 |
| `tiny-many` | `pruned-update` | 4.263 / 3.721 / 14.109 | -12.7% | 3.8x | 142 / 112 / 220 |
| `large-few` | `cold-create` | 1.668 / 1.089 / 4.351 | -34.7% | 4.0x | 231 / 143 / 351 |
| `large-few` | `unchanged-update` | 0.195 / 0.187 / 4.058 | -4.1% | 21.7x | 231 / 143 / 352 |
| `large-few` | `changed-update` | 0.398 / 0.379 / 3.974 | -4.8% | 10.5x | 231 / 143 / 352 |
| `large-few` | `pruned-update` | 1.460 / 1.033 / 3.905 | -29.2% | 3.8x | 231 / 144 / 352 |

All 24 current Shin phase records selected `sse-s3-etag`. They reported zero MD5 comparison-hash attempts, destination PUT retries or throttles, and source GET retries or errors. The unchanged and changed phases used authenticated catalog skips instead of a universal SHA-256 pass; cold and pruned phases calculated MD5 only alongside bytes already being validated and uploaded.

### AWS-managed KMS path

| Phase | Provider seconds, before / current / upstream | Current vs before | Upstream / current | Peak MiB, before / current / upstream |
| --- | ---: | ---: | ---: | ---: |
| `cold-create` | 1.695 / 1.708 / 4.362 | +0.8% | 2.6x | 228 / 233 / 352 |
| `unchanged-update` | 1.523 / 1.489 / 3.907 | -2.2% | 2.6x | 237 / 238 / 352 |
| `changed-update` | 1.482 / 1.532 / 4.038 | +3.4% | 2.6x | 244 / 249 / 353 |
| `pruned-update` | 1.441 / 1.441 / 3.901 | 0.0% | 2.7x | 244 / 249 / 353 |

All 12 current Shin phase records selected `kms-sha256` and reported zero PUT retries or throttles and zero source GET retries or errors. The necessary stored-checksum plus independent-digest work therefore stayed within -2.2% to +3.4% of the original PR #12 provider duration and 0.4% to 2.2% of its median peak memory across the four phases. It still completed provider work about 2.6x to 2.7x faster than upstream.

These rows are decision evidence for the checksum redesign, not a replacement for the repository's canonical snapshot. The temporary before/current and encryption variants do not fit the current JSONL upsert identity without overwriting one another, and broader methodology-v2/CI regression work remains separate. Raw logs and individual rows remain outside git. Every benchmark stack was destroyed, and a final scoped check found none remaining.

## Current Snapshot

> [!CAUTION]
> The committed rows use the original single-sample methodology and are retained as historical evidence while the benchmark harness is revalidated. Do not use them to select production defaults.

| Field | Value |
| --- | --- |
| Snapshot date | 2026-05-15 |
| Region | `ap-southeast-2` |
| Implementations | `shin` and upstream AWS CDK `BucketDeployment` |
| Asset profiles | `tiny-many`, `large-few`, `mixed` |
| Phases | `cold-create`, `unchanged-update`, `changed-update`, `pruned-update` |
| Cleanup | All benchmark stacks destroyed after telemetry collection |
| Raw evidence | Not committed; raw AWS output remains in scratch only |

## Reading Results

Use `benchmarks/README.md` first for visual snapshots. Use `benchmarks/telemetry.md` when you need detailed Shin provider telemetry, including runtime timings, provider phase timing, object work, source range-read diagnostics, bytes/memory windows, and `PutObject` pressure.

Regenerate the Shin telemetry Markdown tables from the JSONL source with:

```bash
pnpm benchmark:telemetry-table
```

Generate filtered comparison reports and SVG charts with:

```bash
pnpm benchmark:comparison-report -- --asset-profile tiny-many --lambda-memory-mb 2048 --lambda-max-parallel-transfers 64
```

## Methodology Summary

The benchmark harness measures deterministic static-site bundles across create, unchanged, changed-update, and pruned-update phases. Paired Shin-vs-AWS comparison runs must use the same region, asset profile, states, destination prefix, memory setting, and repetition count.

The `assets` benchmark scenario generates deterministic bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either `ShinBucketDeployment` or upstream AWS CDK `BucketDeployment`; the implementation is the intended comparison dimension.

## Telemetry Notes

Shin rows may include sanitized `shin_deployment_summary` telemetry. Use `docs/architecture.md` for diagnostics field meanings.

Do not infer S3 throttling from source block waits alone. Source S3 pressure requires source `getRetries` or `getErrors`; destination S3 throttling requires `putObject.throttledAttempts` or retry evidence.

Do not commit `.benchmark-runs/` or other raw AWS output. Commit only sanitized result rows, Markdown/SVG render outputs, configs, source, and tests.
