# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

Provider-summary schema-5 result rows, their generated reports, and their chart live in `archive/` and are not current evidence.

<!-- benchmark-ci:start -->

## Latest CI benchmark

The latest complete canonical five-repetition run was collected by GitHub Actions on 2026-08-08 from source commit `a9b04c2`. It contains five sequential repetitions of all canonical profiles across all four phases. The sanitized run UUID is `3a1fe594-bc8b-4cf5-af4b-7baca96cb8d5`; raw AWS output remains outside git.

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Region                | `eu-central-1`                                             |
| Lambda configurations | 1024 MiB / 32 Shin transfers, 2048 MiB / 64 Shin transfers |
| Sanitized rows        | 240                                                        |
| Cleanup               | destroyed                                                  |

| Profile     | Phase              |   n | Provider s, Shin / AWS | AWS/Shin | Local wall s, Shin / AWS | Max MiB, Shin / AWS |
| ----------- | ------------------ | --: | ---------------------: | -------: | -----------------------: | ------------------: |
| `large-few` | `cold-create`      |   5 |          2.197 / 9.025 |   4.108x |          73.571 / 78.953 |           113 / 447 |
| `large-few` | `cold-create`      |   5 |          1.407 / 5.273 |   3.748x |           68.686 / 73.25 |           189 / 447 |
| `large-few` | `unchanged-update` |   5 |          0.253 / 9.639 |  38.099x |          36.068 / 46.793 |            33 / 447 |
| `large-few` | `unchanged-update` |   5 |          0.227 / 5.274 |  23.233x |          36.145 / 41.264 |            33 / 447 |
| `large-few` | `changed-update`   |   5 |          0.517 / 9.477 |  18.331x |          36.186 / 56.998 |            40 / 447 |
| `large-few` | `changed-update`   |   5 |           0.515 / 5.25 |  10.194x |          37.699 / 46.789 |            40 / 447 |
| `large-few` | `pruned-update`    |   5 |          0.608 / 8.835 |  14.531x |          41.136 / 47.751 |            39 / 417 |
| `large-few` | `pruned-update`    |   5 |          0.616 / 4.989 |   8.099x |           36.56 / 41.789 |            39 / 417 |
| `mixed`     | `cold-create`      |   5 |          1.306 / 9.959 |   7.626x |          73.401 / 79.448 |           102 / 281 |
| `mixed`     | `cold-create`      |   5 |          0.897 / 5.801 |   6.467x |          73.616 / 73.386 |           114 / 282 |
| `mixed`     | `unchanged-update` |   5 |         0.289 / 10.098 |  34.941x |          37.088 / 46.831 |            34 / 280 |
| `mixed`     | `unchanged-update` |   5 |          0.284 / 5.935 |  20.898x |          36.729 / 41.491 |            33 / 281 |
| `mixed`     | `changed-update`   |   5 |          0.481 / 10.25 |   21.31x |          40.487 / 47.414 |            37 / 280 |
| `mixed`     | `changed-update`   |   5 |          0.523 / 5.889 |   11.26x |          36.177 / 41.426 |            37 / 282 |
| `mixed`     | `pruned-update`    |   5 |          1.206 / 10.35 |   8.582x |          46.107 / 48.499 |            37 / 273 |
| `mixed`     | `pruned-update`    |   5 |          1.211 / 5.568 |   4.598x |          40.332 / 41.846 |            37 / 274 |
| `tiny-many` | `cold-create`      |   5 |         2.675 / 26.184 |   9.788x |         74.425 / 101.137 |            56 / 219 |
| `tiny-many` | `cold-create`      |   5 |         1.635 / 15.228 |   9.314x |          73.208 / 84.824 |            70 / 222 |
| `tiny-many` | `unchanged-update` |   5 |         0.556 / 26.201 |  47.124x |          36.148 / 63.907 |            35 / 213 |
| `tiny-many` | `unchanged-update` |   5 |         0.487 / 15.403 |  31.628x |          36.203 / 52.557 |            35 / 221 |
| `tiny-many` | `changed-update`   |   5 |         0.645 / 27.127 |  42.057x |          36.815 / 63.797 |            36 / 213 |
| `tiny-many` | `changed-update`   |   5 |          0.68 / 15.305 |  22.507x |          40.742 / 53.097 |            36 / 221 |
| `tiny-many` | `pruned-update`    |   5 |         1.473 / 26.598 |  18.057x |          37.068 / 69.948 |            36 / 208 |
| `tiny-many` | `pruned-update`    |   5 |         1.459 / 14.689 |  10.068x |          38.032 / 53.536 |            36 / 219 |

The [complete generated report](../benchmarks/ci-report.md) includes quartiles, end-to-end timings, and per-phase deltas. [Provider telemetry](../benchmarks/ci-telemetry.md) contains the sanitized Shin diagnostic tables.

![Latest large-few CI benchmark](../benchmarks/snapshots/ci-large-few-1024mib-32.svg)

![Latest large-few CI benchmark](../benchmarks/snapshots/ci-large-few-2048mib-64.svg)

![Latest mixed CI benchmark](../benchmarks/snapshots/ci-mixed-1024mib-32.svg)

![Latest mixed CI benchmark](../benchmarks/snapshots/ci-mixed-2048mib-64.svg)

![Latest tiny-many CI benchmark](../benchmarks/snapshots/ci-tiny-many-1024mib-32.svg)

![Latest tiny-many CI benchmark](../benchmarks/snapshots/ci-tiny-many-2048mib-64.svg)

<!-- benchmark-ci:end -->

## Methodology

The canonical methodology is the only methodology. It requires five sequential repetitions, opaque UUID run and sample identities, a clean Git tree, exact package/CDK/provider identities, Lambda architecture, deployed code and Shin bootstrap SHA-256 values, phase-local execution-environment memory scope, and verified cleanup. Evidence lives in two JSONL files: `benchmarks/runs.jsonl` holds one record per (runId × implementation) with everything constant across that run's samples, grouped into `config`/`environment`/`cdk`/`provider` (including `provider.bootstrap`); `benchmarks/results.jsonl` holds one record per sample with only what varies — about 18 fields plus the provider summary. Fields that are absent are omitted, never written as null. A scratch resume manifest binds the source, normalized config, phases, destination, and exact sample matrix, while a two-phase ledger digest distinguishes runner persistence from preexisting or external evidence edits. Binary fixtures use deterministic SHA-256 counter bytes and a per-file digest manifest; retained files in stale-deletion phases are byte-identical to their baseline versions. AWS CDK samples omit `parallel`, `detailedFailureDiagnostics`, and the provider summary; comparison pairing does not treat Shin parallelism as an upstream input.

Diagnostics are always on: a run cannot opt out of detailed failure diagnostics.

AWS evidence remains approval-gated. Run one complete repetition per selected variant first, report elapsed time and the preliminary signal, agree a wall-clock cap, and only then resume repetitions 2–5 with the printed run UUID. Completed sanitized rows are persisted incrementally; raw AWS output remains outside the repository. The cap is enforced before stacks and between phases, at external-command granularity: an active CDK/AWS command may finish after the nominal deadline, after which cleanup begins. Signals terminate the active process group and also route the active stack through cleanup.

## Where To Look

| Artifact                   | Purpose                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `benchmarks/README.md`     | Benchmark runbook and current publication state.                                                                       |
| `benchmarks/results.jsonl` | Structured sanitized sample rows — one per measurement, only what varies — used by reports and profile snapshots.      |
| `benchmarks/runs.jsonl`    | One record per (runId × implementation): constant run provenance grouped into `config`/`environment`/`cdk`/`provider`. |
| `benchmarks/configs/`      | Curated benchmark run matrices.                                                                                        |
| `benchmarks/src/`          | Benchmark runner, collector, table renderer, report renderer, and profile-snapshot renderer.                           |

## Reading Results

When a canonical run is published, use its generated report and telemetry files for quartiles, per-phase deltas, and provider diagnostics: runtime timings, provider phase timing, object work, transfer-scheduler completion/cancellation, source range-read diagnostics, bytes/memory windows, consumed body replays, and destination-write pressure.

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

The benchmark harness measures deterministic static-site bundles across create, unchanged, changed-update, and stale-deletion-update phases. Paired Shin-vs-AWS comparison runs must use the same region, asset profile, states, destination prefix, memory setting, and repetition count.

The `assets` benchmark scenario generates deterministic bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either `ShinBucketDeployment` or upstream AWS CDK `BucketDeployment`; the implementation is the intended comparison dimension.

## Telemetry Notes

Shin samples require sanitized `shin_deployment_summary` telemetry under the current diagnostics contract; the provider emits no constant `schemaVersion` marker, so the event discriminator plus strict field-shape validation is the only gate. The summary separates deployment work status from callback delivery, logical transfer objects from source and destination upload wire attempts, and deletion SDK calls from inferred object outcomes. It also exposes consumed body replays, typed throttling/errors, cancellations, invocation-global source memory and release anomalies, destination metadata/page high-water, callback attempts, bounded sanitized `PutObject` SDK/service classifications with correlated body/source failure groups, and direct-copy retry and throttle counters. Use `docs/architecture.md` for exact diagnostics meanings.

Do not infer S3 throttling from source block waits alone. Source S3 pressure requires source `getRetries` or `getErrors`; destination S3 throttling requires `putObject.throttledAttempts` or retry evidence for extracted uploads, and `copyObject.throttledAttempts` or retry evidence for direct copies.

Do not commit `.benchmark-runs/` or other raw AWS output. Commit only sanitized result rows, Markdown/SVG render outputs, configs, source, and tests.

## Ledger state: `phaseMs` plan sub-timings

The `phaseMs` contract now requires `planCatalog`, `planDirectory`, `planEntries`, and `planValidation` alongside `plan`. The committed `benchmarks/results.jsonl` predates those required members, so every committed shin sample reports four shape errors under `benchmarkSampleRecordErrors` and the ledger is not readable as current evidence until it is repopulated. That invalidation is expected and accepted: the fields are required by the pre-`1.0` contract, they are never synthesized for old rows, and no compatibility reader will be added. The next AWS measurement session writes the new-format rows and replaces the ledger.

## Destination-cleanup follow-up: planning-overhead attribution

The P-4/P-6/R-1 destination-cleanup decision run (`95f84950`, five repetitions at
`b281f03`, `mixed` 2048/64) reported planning rising from a 171 ms median to
273 ms against the `20313b6` baseline (`9af64d64`), and concluded the rise
"coincides with the new per-key stale-key retention path but this run does not
isolate its cause." A follow-up attribution review (2026-08-05) now isolates it,
using only the committed sanitized rows plus a host micro-measurement:

- **The retention path is not the cause.** The implementation PR touched only
  `destination.rs`, `s3/mod.rs`, and `cloudformation.rs` — the source planner is
  byte-identical between the two runs, yet the `plan` phase rose across _all_
  phases, including `cold-create` with an empty destination: 174→284
  (`cold-create`), 159→199 (`unchanged-update`), 170→282 (`changed-update`),
  171→273 (`pruned-update`). The phase the change actually modified
  (`destinationList`) stayed flat at 66→62 ms. Same-day control runs with an
  untouched plan path (P-2 marker evidence, `5bfec7df` vs `7a77a569`) swing the
  `plan` median by 66–107 ms between runs, so the reported +102 ms is
  inter-run platform noise, not a code regression.
- **The per-key retention cost is measurable and tiny.** Host-build
  micro-measurement of the exact listing-loop work (442 keys, 45 stale, empty
  filters) shows the P-6 retention path adds ~16 ns per listed key (53→67 ns
  per key); the second previous-namespace predicate on destination moves adds
  ~58 ns per key. On the 442-object benchmark namespace that is roughly 7–30 µs
  total — five orders of magnitude below the reported delta. A bounded
  regression test now guards the per-key cost.
- **The small-delete latency is service-bound.** Both runs delete exactly 45
  objects in one `DeleteObjects` call with zero retries; the median delete phase
  moved 623→674 ms, which is inside the baseline run's own 620–757 ms spread.
  45 < 1000, so batching is already a single call, and the provider-owned retry
  (R-1) only adds time when the service fails. There is no provider-side lever
  for the fixed per-call latency; treat it as documented service cost.
- **What changed:** the planning loop now shares one prefix strip and one
  manifest lookup between the current-namespace stale predicate and the
  previous-namespace predicate (previously two strips and two lookups per key
  on destination moves). Behavior is identical — an equivalence test proves the
  fused per-key decisions match the standalone predicates for every listing key
  shape. No performance acceptance is claimed for this change: at benchmark
  scale the saving is below run noise, and the real planning cost driver
  remains per-entry source planning (P-9's remaining bullets).
