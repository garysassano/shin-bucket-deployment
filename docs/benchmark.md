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

## Current Snapshot

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
