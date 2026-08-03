# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

Superseded decision write-ups and all pre-schema-v5 result rows live in `archive/` and are not current evidence.

<!-- benchmark-ci:start -->
## Latest canonical benchmark

Collected 2026-08-03 from source commit `5256226`. Five sequential repetitions of the `mixed` profile (442 files, ~50 MB) across all four phases, at three Lambda configurations, against upstream AWS CDK `BucketDeployment` in `eu-central-1`. 120 sanitized rows; raw AWS output remains outside git.

| Field | Value |
| --- | --- |
| Region | `eu-central-1` |
| Configurations | 1024 MiB / 32, 2048 MiB / 64, 4096 MiB / 128 |
| Sanitized rows | 120 |
| Cleanup | all benchmark stacks destroyed and confirmed absent |

Provider duration, median over `n=5` with `[Q1, Q3]`:

| Config | Phase | Shin s | AWS s | AWS/Shin |
| --- | --- | ---: | ---: | ---: |
| 1024 / 32 | `cold-create` | 1.267 [1.249, 1.291] | 9.73 [9.64, 9.77] | 7.7x |
| 1024 / 32 | `unchanged-update` | 0.324 [0.316, 0.336] | 10.07 [9.93, 10.27] | 31.1x |
| 1024 / 32 | `changed-update` | 0.552 [0.456, 0.573] | 10.18 [9.85, 10.23] | 18.4x |
| 1024 / 32 | `pruned-update` | 1.187 [1.092, 1.236] | 10.04 [9.75, 10.15] | 8.5x |
| 2048 / 64 | `cold-create` | 0.802 [0.792, 0.806] | 5.74 [5.69, 5.82] | 7.2x |
| 2048 / 64 | `unchanged-update` | 0.262 [0.261, 0.270] | 5.67 [5.64, 5.71] | 21.6x |
| 2048 / 64 | `changed-update` | 0.411 [0.385, 0.474] | 5.53 [5.33, 5.63] | 13.5x |
| 2048 / 64 | `pruned-update` | 1.138 [1.069, 1.168] | 5.62 [5.61, 5.74] | 4.9x |
| 4096 / 128 | `cold-create` | 0.782 [0.757, 0.801] | 5.51 [5.43, 5.53] | 7.0x |
| 4096 / 128 | `unchanged-update` | 0.284 [0.280, 0.294] | 5.63 [5.51, 5.66] | 19.8x |
| 4096 / 128 | `changed-update` | 0.464 [0.440, 0.474] | 5.65 [5.61, 5.66] | 12.2x |
| 4096 / 128 | `pruned-update` | 1.162 [1.118, 1.262] | 5.48 [5.45, 5.68] | 4.7x |

Median peak memory on create: Shin 93 / 105 / 126 MiB against upstream's flat ~275 MiB.

All 60 Shin rows reported zero source `getRetries`/`getErrors`, zero `putObject` throttles and retries, and zero transfer failures, cancellations, or panics.

The [generated report](../benchmarks/ci-report.md) has quartiles, end-to-end timings, and per-phase deltas. [Provider telemetry](../benchmarks/ci-telemetry.md) has the sanitized diagnostic tables.

![mixed 2048 MiB max concurrency 64 benchmark](../benchmarks/snapshots/mixed-2048mib-64.svg)
<!-- benchmark-ci:end -->

## Reading the canonical result

Memory scaling saturates well before 4096 MiB. Moving 1024 to 2048 cuts Shin cold-create 37% (1.267 s to 0.802 s); 2048 to 4096 buys a further 2.5% (0.802 s to 0.782 s) while peak memory rises from 105 to 126 MiB. Upstream shows the same knee, so part of this is workload-driven rather than a Shin property. On this profile 2048 MiB / 64 is the value configuration.

`pruned-update` is consistently Shin's weakest phase relative to upstream (4.7x-8.5x, against 19x-31x on `unchanged-update`). That is the phase carrying stale-object deletion, whose list-then-delete pagination is fully serialized and whose deletes have no provider-owned retry. Treat it as the highest-value optimization target rather than as measurement noise.

## Exploratory sweep: fixed concurrency 128

`configs/concurrency-128-memory-sweep.json`, Shin only, one repetition, decision run `concurrency-128-memory-sweep`. Not performance-acceptance evidence.

| Config | cold-create | unchanged | changed | pruned |
| --- | ---: | ---: | ---: | ---: |
| 1024 / 128 | 1.495 | 0.315 | 0.509 | 1.177 |
| 2048 / 128 | 0.946 | 0.271 | 0.385 | 1.146 |
| 3072 / 128 | 56.005 | 0.264 | 0.423 | 1.011 |

Raising concurrency to 128 does not pay off on this workload: 1024 / 128 cold-create (1.495 s) is slower than 1024 / 32 (1.267 s), and 2048 / 128 (0.946 s) is slower than 2048 / 64 (0.802 s).

### Request-body starvation under aggregate load

The 3072 / 128 `cold-create` cell took 56.005 s against roughly 1 s for every comparable cell. It is the only row in the ledger with a `putObject` failure, and the cause is neither throttling nor memory exhaustion: peak memory was 128 MiB of 3072 available and `throttledAttempts` is zero.

The provider recorded 27 failed attempts, all `ServiceError` / `RequestTimeout`, each failing after about 55 s having emitted **zero** body bytes, with producers parked in `reading-source` and up to 10 waiters on an 8 MiB local source window. With 128 uploads in flight the source read pipeline could not keep every request body fed, so S3 closed the idle PUTs. Provider-owned retries then completed all 442 objects: correctness held and only latency suffered.

This did not reproduce. Re-running 3072 / 128 alone with `concurrency: 1` (decision run `concurrency-128-isolation`) gave 0.999 s cold-create and zero failures. The distinguishing factor is aggregate load: the sweep ran three 128-transfer configurations concurrently, roughly 384 uploads in flight across the account, where the canonical matrix runs 32 + 64 + 128. The sweep config is therefore pinned to `concurrency: 1`, and benchmark concurrency should not be combined with high per-run transfer concurrency.

Two consequences worth carrying forward. Bounding `MaxParallelTransfers` by Lambda memory would not have prevented this, because memory was never the constraint; the binding resource is the source read pipeline's ability to feed N concurrent request bodies. And a `RequestTimeout` with zero bytes emitted is the signature to look for, distinct from the `SlowDown` throttling signature.

### Targeted source-window fix revalidation

Collected 2026-08-03 from source commit `1c0eae6`, run
`4d22afb5-6ff5-4673-a1a4-77350f1390c6`. This was one approved, sequential
`large-few` cold-create sample at 2048 MiB / `maxConcurrency` 128, paired with
the same-memory upstream AWS CDK baseline. It targets the configuration that had
previously exhausted retries and failed its deployment; it is availability
revalidation, not a replacement for the five-repetition canonical matrix.

| Metric | Shin | AWS CDK |
| --- | ---: | ---: |
| Provider duration | 1.275 s | 4.975 s |
| Billed duration | 1.390 s | 5.508 s |
| Peak memory | 176 MiB | 435 MiB |
| Destination upload failures / retries / throttles | 0 / 0 / 0 | not exposed |

The fixed provider completed all 32 uploads and emitted no source GET error or
retry. Its source scheduler reached all eight configured GET slots, retained
63.8 MiB at high water (approximately the new eight-block feed floor), and
fetched 84,643,592 bytes for the 84,644,928-byte archive with no replay refetch.
This sample no longer exhibits the one-block collapse or zero-byte
`RequestTimeout` signature. Both benchmark stacks were destroyed and confirmed
absent. A single clean sample confirms the reproduced failure configuration but
does not establish a general optimum for memory or transfer concurrency.


## Methodology

Methodology v2 is the only methodology. It requires five sequential repetitions, opaque UUID run and sample identities, a clean Git tree, exact package/CDK/provider identities, Lambda architecture, deployed code and Shin bootstrap SHA-256 values, phase-local execution-environment memory scope, and verified cleanup. A scratch resume manifest binds the source, normalized config, phases, destination, and exact sample matrix, while a two-phase ledger digest distinguishes runner persistence from preexisting or external evidence edits. Binary fixtures use deterministic SHA-256 counter bytes and a per-file digest manifest; retained files in prune phases are byte-identical to their baseline versions. AWS CDK rows use `parallel: null`; comparison pairing does not treat Shin parallelism as an upstream input.

Diagnostics are always on: a run cannot opt out of detailed failure diagnostics.

AWS evidence remains approval-gated. Run one complete repetition per selected variant first, report elapsed time and the preliminary signal, agree a wall-clock cap, and only then resume repetitions 2–5 with the printed run UUID. Completed sanitized rows are persisted incrementally; raw AWS output remains outside the repository. The cap is enforced before stacks and between phases, at external-command granularity: an active CDK/AWS command may finish after the nominal deadline, after which cleanup begins. Signals terminate the active process group and also route the active stack through cleanup.

## Where To Look

| Artifact | Purpose |
| --- | --- |
| `benchmarks/README.md` | Human-viewable benchmark snapshot and links to committed SVG charts. |
| `benchmarks/results.jsonl` | Structured sanitized benchmark result rows used by reports and profile snapshots. |
| `benchmarks/configs/` | Curated benchmark run matrices. |
| `benchmarks/src/` | Benchmark runner, collector, table renderer, report renderer, and profile-snapshot renderer. |

## Reading Results

Use `benchmarks/README.md` for the visual snapshot, then the generated report and telemetry files for quartiles, per-phase deltas, and provider diagnostics: runtime timings, provider phase timing, object work, transfer-scheduler completion/cancellation, source range-read diagnostics, bytes/memory windows, consumed body replays, and `PutObject` pressure.

Regenerate the Shin telemetry tables from the JSONL source with:

```bash
pnpm benchmark:telemetry-table -- --run-id <uuid>
```

Generate filtered comparison reports with:

```bash
pnpm benchmark:comparison-report -- --run-id <uuid> --asset-profile mixed --lambda-memory-mb 2048 --transfer-max-concurrency 64
```

Rendering validates every required field and the exact matrix from the canonical config before it emits a report, telemetry table, or README snapshot; missing, duplicate, dirty, incomplete, or unplanned cells fail rendering. Tables report `n`, median, Q1, Q3, and IQR.

## Methodology Summary

The benchmark harness measures deterministic static-site bundles across create, unchanged, changed-update, and pruned-update phases. Paired Shin-vs-AWS comparison runs must use the same region, asset profile, states, destination prefix, memory setting, and repetition count.

The `assets` benchmark scenario generates deterministic bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either `ShinBucketDeployment` or upstream AWS CDK `BucketDeployment`; the implementation is the intended comparison dimension.

## Telemetry Notes

Shin rows carry sanitized `shin_deployment_summary` telemetry at schema v5. It separates deployment work status from callback delivery, logical transfer objects from source and destination upload wire attempts, and deletion SDK calls from inferred object outcomes. It also exposes consumed body replays, typed throttling/errors, cancellations, invocation-global source memory, destination metadata/page high-water, callback attempts, bounded sanitized `PutObject` SDK/service classifications with correlated body/source failure groups, and a `copyObject` section carrying direct-copy retry and throttle counters. Use `docs/architecture.md` for exact diagnostics meanings.

Do not infer S3 throttling from source block waits alone. Source S3 pressure requires source `getRetries` or `getErrors`; destination S3 throttling requires `putObject.throttledAttempts` or retry evidence for extracted uploads, and `copyObject.throttledAttempts` or retry evidence for direct copies.

Do not commit `.benchmark-runs/` or other raw AWS output. Commit only sanitized result rows, Markdown/SVG render outputs, configs, source, and tests.
