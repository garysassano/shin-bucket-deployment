# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

Provider-summary schema-5 result rows, their generated reports, and their chart live in `archive/` and are not current evidence.

<!-- benchmark-ci:start -->

## Latest Canonical Benchmark

No completed provider-summary schema-6 canonical run is published. The active ledger holds repetition 1 only, so reports, telemetry tables, and charts will be regenerated from a completed approved run. Archived schema-5 evidence is not used for current claims.
<!-- benchmark-ci:end -->

## Methodology

Methodology v2 is the only methodology. It requires five sequential repetitions, opaque UUID run and sample identities, a clean Git tree, exact package/CDK/provider identities, Lambda architecture, deployed code and Shin bootstrap SHA-256 values, phase-local execution-environment memory scope, and verified cleanup. A scratch resume manifest binds the source, normalized config, phases, destination, and exact sample matrix, while a two-phase ledger digest distinguishes runner persistence from preexisting or external evidence edits. Binary fixtures use deterministic SHA-256 counter bytes and a per-file digest manifest; retained files in stale-deletion phases are byte-identical to their baseline versions. AWS CDK rows use `parallel: null`; comparison pairing does not treat Shin parallelism as an upstream input.

Diagnostics are always on: a run cannot opt out of detailed failure diagnostics.

AWS evidence remains approval-gated. Run one complete repetition per selected variant first, report elapsed time and the preliminary signal, agree a wall-clock cap, and only then resume repetitions 2–5 with the printed run UUID. Completed sanitized rows are persisted incrementally; raw AWS output remains outside the repository. The cap is enforced before stacks and between phases, at external-command granularity: an active CDK/AWS command may finish after the nominal deadline, after which cleanup begins. Signals terminate the active process group and also route the active stack through cleanup.

## Where To Look

| Artifact                   | Purpose                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `benchmarks/README.md`     | Benchmark runbook and current publication state.                                             |
| `benchmarks/results.jsonl` | Structured sanitized current benchmark result rows used by reports and profile snapshots.    |
| `benchmarks/configs/`      | Curated benchmark run matrices.                                                              |
| `benchmarks/src/`          | Benchmark runner, collector, table renderer, report renderer, and profile-snapshot renderer. |

## Reading Results

When a schema-6 run is published, use its generated report and telemetry files for quartiles, per-phase deltas, and provider diagnostics: runtime timings, provider phase timing, object work, transfer-scheduler completion/cancellation, source range-read diagnostics, bytes/memory windows, consumed body replays, and destination-write pressure.

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

Shin rows require sanitized `shin_deployment_summary` telemetry at schema v6. It separates deployment work status from callback delivery, logical transfer objects from source and destination upload wire attempts, and deletion SDK calls from inferred object outcomes. It also exposes consumed body replays, typed throttling/errors, cancellations, invocation-global source memory and release anomalies, destination metadata/page high-water, callback attempts, bounded sanitized `PutObject` SDK/service classifications with correlated body/source failure groups, and direct-copy retry and throttle counters. Use `docs/architecture.md` for exact diagnostics meanings.

Do not infer S3 throttling from source block waits alone. Source S3 pressure requires source `getRetries` or `getErrors`; destination S3 throttling requires `putObject.throttledAttempts` or retry evidence for extracted uploads, and `copyObject.throttledAttempts` or retry evidence for direct copies.

Do not commit `.benchmark-runs/` or other raw AWS output. Commit only sanitized result rows, Markdown/SVG render outputs, configs, source, and tests.

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
