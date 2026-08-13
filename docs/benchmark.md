# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

Provider-summary schema-5 result rows, their generated reports, and their chart live in `archive/` and are not current evidence.

<!-- benchmark-ci:start -->

## Latest CI benchmark

The latest complete canonical five-repetition run was collected by GitHub Actions on 2026-08-10 from source commit `cd8953b`. It contains five sequential repetitions of all canonical profiles across all four phases. The sanitized run UUID is `62f8ad5d-81d9-47a4-ab7e-a5ee35ad16ce`; raw AWS output remains outside git.

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Region                | `eu-central-1`                                             |
| Lambda configurations | 1024 MiB / 32 Shin transfers, 2048 MiB / 64 Shin transfers |
| Sanitized rows        | 240                                                        |
| Cleanup               | destroyed                                                  |

| Profile     | Phase              |   n | Provider s, Shin / AWS | AWS/Shin | Local wall s, Shin / AWS | Max MiB, Shin / AWS |
| ----------- | ------------------ | --: | ---------------------: | -------: | -----------------------: | ------------------: |
| `large-few` | `cold-create`      |   5 |          1.338 / 5.102 |   3.813x |          69.448 / 69.374 |           182 / 447 |
| `large-few` | `cold-create`      |   5 |          2.084 / 9.587 |     4.6x |          69.766 / 74.608 |           116 / 447 |
| `large-few` | `unchanged-update` |   5 |           0.238 / 5.12 |  21.513x |          32.398 / 37.757 |            33 / 447 |
| `large-few` | `unchanged-update` |   5 |           0.266 / 9.33 |  35.075x |          36.774 / 42.996 |            33 / 447 |
| `large-few` | `changed-update`   |   5 |          0.539 / 5.227 |   9.698x |          37.972 / 43.247 |            39 / 447 |
| `large-few` | `changed-update`   |   5 |          0.536 / 9.347 |  17.438x |          36.835 / 47.876 |            39 / 447 |
| `large-few` | `pruned-update`    |   5 |          0.634 / 5.024 |   7.924x |          38.405 / 43.253 |            40 / 417 |
| `large-few` | `pruned-update`    |   5 |          0.562 / 8.964 |   15.95x |          37.083 / 48.855 |            40 / 416 |
| `mixed`     | `cold-create`      |   5 |          0.925 / 5.794 |   6.264x |          70.002 / 74.709 |           117 / 282 |
| `mixed`     | `cold-create`      |   5 |          1.347 / 9.798 |   7.274x |          68.408 / 74.911 |           106 / 281 |
| `mixed`     | `unchanged-update` |   5 |           0.284 / 5.81 |  20.458x |          32.497 / 37.764 |            33 / 282 |
| `mixed`     | `unchanged-update` |   5 |          0.288 / 9.909 |  34.406x |          32.679 / 43.156 |            34 / 280 |
| `mixed`     | `changed-update`   |   5 |          0.503 / 5.907 |  11.744x |          36.732 / 42.147 |            37 / 282 |
| `mixed`     | `changed-update`   |   5 |         0.452 / 10.033 |  22.197x |          36.744 / 48.418 |            37 / 280 |
| `mixed`     | `pruned-update`    |   5 |          1.113 / 5.677 |   5.101x |           37.77 / 42.196 |            39 / 274 |
| `mixed`     | `pruned-update`    |   5 |          1.134 / 9.877 |    8.71x |           36.75 / 47.474 |            37 / 272 |
| `tiny-many` | `cold-create`      |   5 |         1.528 / 14.831 |   9.706x |          69.864 / 80.432 |            65 / 222 |
| `tiny-many` | `cold-create`      |   5 |         2.705 / 25.446 |   9.407x |          70.054 / 96.453 |            57 / 218 |
| `tiny-many` | `unchanged-update` |   5 |         0.474 / 15.146 |  31.954x |          32.614 / 48.675 |            35 / 221 |
| `tiny-many` | `unchanged-update` |   5 |         0.481 / 26.074 |  54.208x |          32.562 / 59.682 |            35 / 211 |
| `tiny-many` | `changed-update`   |   5 |         0.597 / 15.186 |  25.437x |          38.445 / 54.101 |            36 / 221 |
| `tiny-many` | `changed-update`   |   5 |          0.595 / 27.52 |  46.252x |          37.856 / 70.442 |            36 / 210 |
| `tiny-many` | `pruned-update`    |   5 |         1.399 / 14.448 |  10.327x |           38.491 / 49.22 |            36 / 218 |
| `tiny-many` | `pruned-update`    |   5 |          1.33 / 25.947 |  19.509x |          37.563 / 65.085 |            36 / 210 |

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

## Ledger state: repopulated, plan and transfer sub-timings

The `phaseMs` contract requires `planSourceHeads`, `planCatalog`, `planDirectory`, `planEntries`, and `planValidation` alongside `plan`, and `transferTaskTotal`, `transferPrepare`, `transferPutWait`, `transferPrepareSourceWait`, and `transferPutSourceWait` alongside `transfer`. The transfer sub-timings schema addition (branch `t2-transfer-subtimings`) superseded the previous shin rows, which moved to `archive/benchmarks/`; the ledger was then repopulated by the 2026-08-10 publish (`902e2c8`). Run `62f8ad5d` holds 120 fresh Shin rows (three canonical profiles × 1024 MiB/32 and 2048 MiB/64 × five repetitions × four phases, provider `cd8953b`) with the paired same-run AWS CDK `BucketDeployment` rows, alongside the pinned AWS baseline rows from earlier runs. `pnpm verify:ledger` gates the committed ledger in `pnpm check`, so a shape invalidation can no longer hide behind a green gate.

## Performance limits

_Measured conclusions from the repopulated ledger: run `62f8ad5d` (2026-08-10 publish, provider `cd8953b`, three canonical profiles, five repetitions each, configs 1024 MiB/32 and 2048 MiB/64). Medians below are derived per profile directly from the committed rows on 2026-08-12 and supersede the `3a1fe594` conclusions recorded before the transfer sub-timings instrument existed. These are interpretive conclusions about where the construct is bound._

### Where the time goes

Cold-create medians (the dominant phase) per profile and config:

| profile     | config  | cold-create total | plan   | transfer | peak memory |
| ----------- | ------- | ----------------- | ------ | -------- | ----------- |
| `mixed`     | 1024/32 | 1.35 s            | 187 ms | 1071 ms  | 106 MiB     |
| `mixed`     | 2048/64 | 0.93 s            | 206 ms | 647 ms   | 117 MiB     |
| `large-few` | 1024/32 | 2.08 s            | 198 ms | 1812 ms  | 116 MiB     |
| `large-few` | 2048/64 | 1.34 s            | 228 ms | 1010 ms  | 182 MiB     |
| `tiny-many` | 1024/32 | 2.71 s            | 247 ms | 2320 ms  | 57 MiB      |
| `tiny-many` | 2048/64 | 1.53 s            | 264 ms | 1171 ms  | 65 MiB      |

Update phases are small in comparison (plan ~156–284 ms at the per-config median). Unchanged updates transfer nothing; changed and pruned updates transfer only the delta (~96–201 ms and ~94–205 ms at the per-config median). Pruned-update delete is the one large update cost (~570–710 ms on `mixed`/`tiny-many`, ~60–65 ms on `large-few`, which deletes fewer keys). The three dominant costs are cold-create transfer, pruned-update delete, and the plan floor paid by every phase. 2048/64 beats 1024/32 on cold-create by 31% on `mixed`, 36% on `large-few`, and 44% on `tiny-many`.

### Bound-by-phase verdict

- **Plan is S3 metadata-latency bound, not CPU and not bandwidth — the former residual is now split.** Across all 120 committed shin rows, the five-way plan partition closes to a ~0 residual (±2 ms rounding): `planSourceHeads` (per-source `HeadObject`) is ~36–59% of plan at the per-config median, `planDirectory` ~21–49%, `planCatalog` ~11–29%, and `planEntries`/`planValidation` ≈ 0. Heads show a first-S3-call latency signature — the first metadata call of an invocation costs several times the later ones, consistent with connection establishment — so overlapping source planning cannot remove it for the common single-source deployment (the P-7 reassessment). The lever would be priming the S3 client before or concurrently with the first real request. Allocation work in `planner.rs` is not a viable direction on this evidence.
- **Transfer — the largest single cost — is dominated by the destination PUT span, and its CPU share is not separately identifiable.** Across the 90 committed rows that performed upload work, `transferPutWait` (the destination PUT/upload span, including retries) is ≈ 100% of summed `transferTaskTotal` at the median; `transferPrepare` (comparison pass) ≈ 0 and source-fetch waits ≈ 0. `transferTaskTotal` sums across 32–64 concurrent tasks, so this is a summed-task share, not a wall-clock partition (unchanged-update rows transfer nothing and are excluded from the share). The PUT span mixes destination network wait with any streaming CPU performed while the request body is generated, and the current instrument does not separate those two — it localizes the cost to the PUT span, not to the network alone. The levers are destination per-object round-trip cost and concurrency, not memory.
- **Delete is service-bound.** A pruned update deletes its stale keys in a single `DeleteObjects` call with zero retries; the ~570–710 ms on `mixed`/`tiny-many` (and ~60–65 ms on `large-few`, which deletes far fewer keys) is fixed per-call service latency with no provider-side lever.
- **Memory capacity is not a constraint on the canonical profiles.** Peak usage is ~57–182 MiB against 1024–2048 MiB configured. Caveat: half of configured memory is the invocation-global ZIP-planning and source-block budget (`large-few` at 2048 MiB already shows the budget effect at 182 MiB), so multi-GiB archives use materially more; these figures are specific to the canonical profile sizes.
- **Concurrency has a measured ceiling at 64.** 128 slowed cold-create by 18% at both 1024 MiB and 2048 MiB (see the construct's validation warning). The knee between 32 and 64 is unmeasured.
- **Per-object cost dominates at canonical sizes; bandwidth is not the observed ceiling.** Effective destination throughput during cold-create transfer at 2048 MiB / 64 rises monotonically with mean object size: `tiny-many` (8.2 MB across 2,584 objects) manages ~56 Mbps, `mixed` (52.9 MB / 442) ~654 Mbps, `large-few` (144.2 MB / 32) ~1,142 Mbps. The profile with the fewest bytes has the _slowest_ transfer, which is a per-object cost signature rather than a bandwidth one. Note that the `large-few` figure counts destination writes only and already exceeds the 625 Mbps that AWS documents as the 2 GB baseline for its scalable-bandwidth feature, so these runs were not capped at that figure — most plausibly because ~1-second transfers sit inside burst rather than sustained behaviour. Do not treat 625 Mbps as the operative ceiling for this configuration, and do not infer a bandwidth-bound floor from it.
- **The scalable-bandwidth feature is unevaluated here.** AWS Lambda scalable network bandwidth (announced 2026-08) scales from 625 Mbps at 2 GB to 3,000 Mbps at 10 GB for functions outside a VPC with at least 2 GB of memory, opt-in by requesting the "network bandwidth per execution environment" quota through Service Quotas, at no additional charge, in all commercial regions. That quota has not been granted for the benchmark account, so nothing here measures it. Given that the measured throughput above already exceeds the documented 2 GB baseline, the value of a high-memory bandwidth sweep is unproven rather than assumed — treat it as a curiosity experiment until the per-object cost that actually dominates these profiles is addressed.

### What the canonical matrix cannot answer

The two canonical points (1024/32, 2048/64) vary memory and concurrency together, so the 31–44% cold-create improvement is not attributable between 2× vCPU and 2× concurrency. Open questions, in value order: where the concurrency knee sits between 32 and the known-bad 128, and how a large-bytes profile responds to the memory/bandwidth axis with the bandwidth quota enabled. Whether transfer is CPU-bound at higher memory is not answered by the transfer sub-timings: they localize the cost to the PUT span but cannot split destination network wait from streaming CPU, so the memory/bandwidth sweep remains the only direct test of that axis. These require one-off diagnostic configs; the committed ledger accepts only the canonical matrix.

### Measurement cadence

- **Upstream AWS CDK `BucketDeployment` baselines are certified per chosen `aws-cdk-lib` release**, not continuously: the committed baseline was measured on `2.260.0` (run records carry `awsCdkLibVersion`). Re-measure the upstream side only when deliberately certifying a newer release; otherwise reuse the pinned baseline rather than re-paying its AWS cost.
- **Shin rows are re-measured after merging a performance-relevant provider change or before a release**, per the `AGENTS.md` benchmark policy: implementation first, then a maintainer-approved AWS session, then the sanitized rows land through an evidence PR identifying the measured `main` commit.
- **Diagnostic sweeps (non-canonical configs) are one-off maintainer sessions**; their outputs inform docs and defaults but are not committed as ledger evidence.

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
  remains per-entry source planning (P-9's remaining bullets). _[2026-08-09:
  the final clause is refuted by the F-4 plan sub-timings in run `3a1fe594` —
  `planEntries≈0` across all rows. The plan phase is dominated by sequential
  S3 round-trips plus the uninstrumented residual; see "Performance limits"
  above.]_
