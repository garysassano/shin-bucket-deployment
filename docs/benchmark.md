# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

Provider-summary schema-5 result rows, their generated reports, and their chart live in `archive/` and are not current evidence.

## Runtime dependency BEFORE baseline

Run `ab9ac956-af55-40a0-9139-23bace5acb4c` is the complete BEFORE baseline for the M03 runtime dependency refresh. It measured clean `main` commit `339da0427002b56614c8dd54ab33c403cc5af1d4`, before the runtime change in `b499009c157b468fb521bec0de683bf03acdeaa4`. The run records retain decision `stabilization-runtime-dependencies-20260905`, comparison variant `before`, exact provider provenance, and cleanup status.

The baseline includes 240 samples: Shin and upstream AWS CDK `BucketDeployment`, three profiles, two Lambda configurations, four phases, and five repetitions per cell. Shin used `DETAILED` diagnostics. All 60 planned stacks reached `DELETE_COMPLETE`, and independent cleanup probes confirmed that all 60 captured buckets no longer existed, with no cleanup errors.

The generated comparisons below describe this baseline only. M03 performance acceptance remains pending comparable completed AFTER evidence, review of the before/after results and telemetry, and publication of both validated ledgers on `main`. The earlier incomplete attempt is excluded. Repetitions ran concurrently, so local wall and CDK deployment times must not be compared directly with older sequential runs.

<!-- benchmark-ci:start -->

## Latest CI benchmark

The latest complete canonical five-repetition run was collected by GitHub Actions on 2026-09-05 from source commit `339da04`. It contains five independently collected parallel repetitions of all canonical profiles across all four phases. The sanitized run UUID is `ab9ac956-af55-40a0-9139-23bace5acb4c`; raw AWS output remains outside git.

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Region                | `eu-central-1`                                             |
| Lambda configurations | 1024 MiB / 32 Shin transfers, 2048 MiB / 64 Shin transfers |
| Sanitized rows        | 240                                                        |
| Cleanup               | destroyed                                                  |

| Profile     |  MiB | Max concurrency | Phase              |   n | Provider s, Shin / AWS | AWS/Shin | Local wall s, Shin / AWS | Max MiB, Shin / AWS |
| ----------- | ---: | --------------: | ------------------ | --: | ---------------------: | -------: | -----------------------: | ------------------: |
| `large-few` | 1024 |              32 | `cold-create`      |   5 |              2 / 9.429 |   4.715x |          71.923 / 77.685 |           126 / 447 |
| `large-few` | 1024 |              32 | `unchanged-update` |   5 |          0.239 / 9.447 |  39.527x |          35.099 / 43.903 |            32 / 447 |
| `large-few` | 1024 |              32 | `changed-update`   |   5 |          0.493 / 9.472 |  19.213x |          38.442 / 50.504 |            41 / 447 |
| `large-few` | 1024 |              32 | `pruned-update`    |   5 |           0.511 / 8.96 |  17.534x |          40.944 / 49.825 |            39 / 416 |
| `large-few` | 2048 |              64 | `cold-create`      |   5 |          1.162 / 5.163 |   4.443x |          77.189 / 71.583 |           193 / 447 |
| `large-few` | 2048 |              64 | `unchanged-update` |   5 |          0.222 / 5.171 |  23.293x |          33.359 / 38.646 |            32 / 447 |
| `large-few` | 2048 |              64 | `changed-update`   |   5 |           0.419 / 5.24 |  12.506x |          40.057 / 43.148 |            40 / 447 |
| `large-few` | 2048 |              64 | `pruned-update`    |   5 |          0.454 / 4.948 |  10.899x |           39.76 / 44.456 |            40 / 417 |
| `mixed`     | 1024 |              32 | `cold-create`      |   5 |          1.262 / 9.866 |   7.818x |          70.977 / 79.957 |           107 / 281 |
| `mixed`     | 1024 |              32 | `unchanged-update` |   5 |          0.28 / 10.283 |  36.725x |          33.557 / 44.943 |            33 / 281 |
| `mixed`     | 1024 |              32 | `changed-update`   |   5 |          0.402 / 10.35 |  25.746x |          38.957 / 49.331 |            37 / 281 |
| `mixed`     | 1024 |              32 | `pruned-update`    |   5 |         1.071 / 10.179 |   9.504x |          38.451 / 62.992 |            38 / 273 |
| `mixed`     | 2048 |              64 | `cold-create`      |   5 |          0.827 / 5.747 |   6.949x |          70.185 / 74.439 |           117 / 283 |
| `mixed`     | 2048 |              64 | `unchanged-update` |   5 |          0.261 / 5.887 |  22.556x |          33.054 / 38.515 |            33 / 282 |
| `mixed`     | 2048 |              64 | `changed-update`   |   5 |          0.359 / 5.758 |  16.039x |          39.151 / 43.873 |            37 / 282 |
| `mixed`     | 2048 |              64 | `pruned-update`    |   5 |          1.024 / 5.643 |   5.511x |          34.409 / 44.295 |            37 / 275 |
| `tiny-many` | 1024 |              32 | `cold-create`      |   5 |         2.607 / 26.425 |  10.136x |          72.051 / 97.331 |            57 / 219 |
| `tiny-many` | 1024 |              32 | `unchanged-update` |   5 |         0.468 / 26.875 |  57.425x |          33.749 / 62.479 |            35 / 212 |
| `tiny-many` | 1024 |              32 | `changed-update`   |   5 |         0.583 / 26.869 |  46.087x |          39.926 / 69.843 |            36 / 214 |
| `tiny-many` | 1024 |              32 | `pruned-update`    |   5 |          1.35 / 26.667 |  19.753x |          38.567 / 70.315 |            35 / 213 |
| `tiny-many` | 2048 |              64 | `cold-create`      |   5 |         1.515 / 15.324 |  10.115x |          70.928 / 82.337 |            69 / 223 |
| `tiny-many` | 2048 |              64 | `unchanged-update` |   5 |         0.483 / 15.216 |  31.503x |          33.326 / 49.231 |            35 / 222 |
| `tiny-many` | 2048 |              64 | `changed-update`   |   5 |         0.564 / 15.344 |  27.206x |          38.792 / 54.421 |            36 / 222 |
| `tiny-many` | 2048 |              64 | `pruned-update`    |   5 |         1.306 / 14.844 |  11.366x |           39.79 / 54.325 |            36 / 219 |

The [complete generated report](../benchmarks/ci-report.md) includes quartiles, end-to-end timings, and per-phase deltas. [Provider telemetry](../benchmarks/ci-telemetry.md) contains the sanitized Shin diagnostic tables.

![Latest large-few CI benchmark](../benchmarks/snapshots/ci-large-few-1024mib-32.svg)

![Latest large-few CI benchmark](../benchmarks/snapshots/ci-large-few-2048mib-64.svg)

![Latest mixed CI benchmark](../benchmarks/snapshots/ci-mixed-1024mib-32.svg)

![Latest mixed CI benchmark](../benchmarks/snapshots/ci-mixed-2048mib-64.svg)

![Latest tiny-many CI benchmark](../benchmarks/snapshots/ci-tiny-many-1024mib-32.svg)

![Latest tiny-many CI benchmark](../benchmarks/snapshots/ci-tiny-many-2048mib-64.svg)

<!-- benchmark-ci:end -->

## Local catalog synthesis

The repeatable `pnpm benchmark:catalog-synth` harness measures synthesis-time directory asset preparation without AWS. It generates the canonical `large-few` input (144,167,470 bytes across 32 files) and `tiny-many` input (8,178,618 bytes across 2,584 files), applies one exclusion to each (`assets/maps/**` and `assets/css/**` respectively), stages one unrelated asset, warms each profile/implementation pair once, alternates Shin/upstream order, and records five measured child processes per pair. Wall time covers unrelated asset construction, source binding, and `app.synth()`. On Linux, process `rchar` from `/proc/self/io` records bytes returned by reads, including cache-served reads rather than only physical storage I/O; peak RSS comes from Node process resource usage.

The accepted 2026-08-26 comparison used Node.js 24.19.0 and `aws-cdk-lib` 2.260.0 on clean commits. `94bf295` is the measured baseline with the harness but before the implementation; `e7f9d98` is the candidate. Upstream AWS CDK `Source.asset` was measured in both runs to expose run-to-run drift. Values are medians of five repetitions.

| Profile     | Metric                | Baseline Shin | Candidate Shin | Shin delta | Upstream, baseline / candidate |
| ----------- | --------------------- | ------------: | -------------: | ---------: | -----------------------------: |
| `large-few` | wall time             |      394.9 ms |       337.1 ms |     -14.6% |               147.3 / 146.0 ms |
| `large-few` | Linux process `rchar` |     370.92 MB |      247.86 MB |     -33.2% |             124.80 / 124.80 MB |
| `large-few` | peak RSS              |    129.77 MiB |     125.00 MiB |      -3.7% |            129.77 / 125.00 MiB |
| `tiny-many` | wall time             |      717.1 ms |       675.8 ms |      -5.8% |               446.7 / 436.4 ms |
| `tiny-many` | Linux process `rchar` |      25.64 MB |       17.59 MB |     -31.4% |                 9.80 / 9.79 MB |
| `tiny-many` | peak RSS              |    150.78 MiB |     133.64 MiB |     -11.4% |            129.77 / 127.98 MiB |

The read-byte reduction is approximately one included-tree pass in both profiles: Shin now computes the catalog MD5 and collision-resistant asset SHA-256 during the same file read and no longer asks CDK to source-fingerprint the materialized tree. CDK still performs its staging copy, so this is not a zero-copy path. The cache probe changed from `catalogIdentityChanged=true, unrelatedCacheRetained=false` on the baseline to both values `true` on the candidate, proving changed catalog content gets a fresh asset identity without the previous process-global cache clear. Upstream remains faster because it does not generate or authenticate Shin's catalog and does not perform Shin's materialization and stability checks; this change removes the redundant fingerprint work rather than that required feature cost.

## Local destination-key allocation

The planner's normal 442-entry Criterion fixture remains the regression guard for canonical workloads. The `plan_entries/key_lifecycle_100000` group adds a fixed-width 100,000-key profile that builds the real deployment manifest and derives the real ZIP transfer plans. `pnpm rust:bench:allocations` runs the same lifecycle for five samples under the dev-only `allocation-counter` allocator and reports median allocation count, total allocated bytes, peak live bytes, and Linux process high-water RSS. Fixture construction and one warm-up run are outside the measured allocation samples; RSS is the deliberately conservative whole-process high-water mark.

The acceptance threshold was fixed before changing the key representation: the 100,000-key candidate must reduce both total allocated bytes and peak live bytes by at least 10%, reduce process peak RSS by at least 5%, and avoid a timing regression greater than 3% in either the 100,000-key group or the existing 442-entry groups. A candidate that misses those bounds is rejected as benchmark noise; a candidate that passes still requires the plan's comparable upstream and exact-main AWS evidence before it is performance-accepted.

The 2026-08-26 comparison measured clean baseline commit `bcff5b4` against unmerged candidate commit `18936b1`. The candidate stored each relative key only as the manifest map key; it did not introduce `Arc`, `Rc`, `Cow`, or a compatibility path.

| Local metric                       |   Baseline |  Candidate |  Delta |
| ---------------------------------- | ---------: | ---------: | -----: |
| 100,000-key total allocations      |    816,188 |    616,188 | -24.5% |
| 100,000-key peak live allocations  |    616,173 |    516,173 | -16.2% |
| 100,000-key total allocated bytes  | 95,680,528 | 84,411,648 | -11.8% |
| 100,000-key peak live bytes        | 74,603,824 | 66,834,944 | -10.4% |
| 100,000-key process peak RSS       | 91,044 KiB | 82,124 KiB |  -9.8% |
| 100,000-key Criterion mean         |  90.065 ms |  85.152 ms |  -5.5% |
| 442-entry untrusted Criterion mean |   3.777 ms |   3.978 ms |  +5.3% |

The allocation and large-fixture targets passed, but the candidate was rejected because the existing 442-entry untrusted group exceeded the timing guard. A 200-sample focused rerun measured a statistically significant `+4.38%` to `+6.25%` change, so the implementation was removed instead of adding representation complexity or accepting a normal-workload regression. No provider change survived and therefore no AWS comparison or exact-main runtime evidence was warranted.

## Historical exploratory sweep: large-few memory scaling to 10240 MiB

This section preserves an older diagnostic observation, not a current-provider comparison. Its Shin samples are outside the active ledger; consult the [benchmark archive](../archive/README.md) and Git history for the original evidence.

Collected 2026-08-13 from source commit `fe19000` (provider `fe19000`) as a one-repetition Shin-only sweep of the `large-few` profile at 2048 MiB / 64, 4096 MiB / 128, and 10240 MiB / 128 in `eu-central-1`. Sanitized run UUID `d6932e4a-0459-4c1a-bfbd-4a7cfaf55d32`; cleanup `destroyed`. This probes whether the 10240 MiB tier (and the account's 3000 Mbps network-bandwidth quota) changes the transfer shape.

| Phase              | 2048 / 64 | 4096 / 128 | 10240 / 128 |
| ------------------ | --------: | ---------: | ----------: |
| `cold-create`      |   1.379 s |    0.939 s |     1.015 s |
| `unchanged-update` |   0.298 s |    0.408 s |     0.324 s |
| `changed-update`   |   0.648 s |    0.554 s |     0.577 s |
| `pruned-update`    |   0.709 s |    0.724 s |     0.604 s |

Cold-create transfers 144.2 MB in 32 objects; the transfer span is 1030 ms / 617 ms / 687 ms, so effective PUT throughput is ≈ 1120 Mbps / ≈ 1870 Mbps / ≈ 1680 Mbps — none of the configurations approaches 3000 Mbps, and summed `transferPutWait` is ~100% of summed `transferTaskTotal` at every tier (S3 PUT completion wait, overlapped across tasks). There is no throttling or retry evidence anywhere in the run: `putObject.throttledAttempts = 0` and `source.getThrottledAttempts = 0` in all samples. Provider peak memory stays near 200 MiB at all tiers because the source archive already fits resident at 2048 MiB; the 10240 MiB tier adds no measurable benefit over 4096 MiB on this profile.

A second one-repetition run the same day (`262cfe8a-94c9-4efb-a653-fd23f2e047e6`, provider `56e43b4`, cleanup `destroyed`) tried the `tiny-many` profile at 10240 MiB / 64. Cold-create uploads 2584 objects (8.2 MB) in 1.63 s end to end, of which the transfer span is 1.243 s: ~2079 PUT/s against that transfer span, an average summed task wait of 28.9 ms, `inFlightHighWater = 64`, and again zero throttling or retries. That matches the canonical 2048 MiB / 64 median (1.53 s across five repetitions) — the profile is S3 PUT round-trip-latency bound, not bandwidth or memory bound, so the 10240 MiB tier adds nothing there either.

## Methodology

The current canonical publication workflow requires five independent repetitions collected in parallel, opaque UUID run and sample identities, a clean Git tree, exact package/CDK/provider identities, Lambda architecture, deployed code and Shin bootstrap SHA-256 values, phase-local execution-environment memory scope, and verified cleanup. GitHub Actions builds the measured provider once, gives that exact artifact to five repetition jobs, and aggregates only after all five complete. Evidence lives in two JSONL files: `benchmarks/runs.jsonl` holds one record per (runId × implementation) with everything constant across that run's samples, grouped into `config`/`environment`/`cdk`/`provider` (including Shin `provider.implementationCommit` and `provider.bootstrap`); `benchmarks/results.jsonl` holds one record per sample with only what varies — about 18 fields plus the provider summary. Fields that are absent are omitted, never written as null. Each shard manifest binds the source, normalized config, phases, destination, exact sample matrix, and ledger digests. The aggregator rejects identity drift, missing or duplicate repetitions, differing run records, modified ledgers, incomplete cleanup, and unplanned cells before writing the deterministic complete ledger. Binary fixtures use deterministic SHA-256 counter bytes and a per-file digest manifest; retained files in stale-deletion phases are byte-identical to their baseline versions. AWS CDK samples omit `parallel`, `detailedFailureDiagnostics`, and the provider summary; comparison pairing does not treat Shin parallelism as an upstream input.

Counters, phase timings, and aggregate high-water marks are always on. Retained per-attempt state, bounded string capture, and per-attempt allocations require `FailureDiagnostics.DETAILED`. Benchmarks always select `DETAILED` and cannot opt out, so they include costs absent from the `STANDARD` consumer default.

The current `benchmarks/configs/canonical.json` selects `mixed` at 1024 MiB / 32, 2048 MiB / 64, and 4096 MiB / 128, with three concurrent stacks per repetition and five parallel repetition jobs. The latest published run above used the earlier sequential three-profile, two-configuration matrix. Its recorded configuration and timing scope remain authoritative for those measurements.

AWS evidence remains approval-gated. Agree the matrix and a per-repetition wall-clock cap before dispatching the full workflow. Each repetition persists sanitized rows incrementally and verifies its own cleanup; raw AWS output remains outside the repository. The cap is enforced before stacks and between phases, at external-command granularity: an active CDK/AWS command may finish after the nominal deadline, after which cleanup begins. Signals terminate the active process group and also route the active stack through cleanup.

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
pnpm benchmark:telemetry-table -- --run-id <uuid> --config <matching-config.json> --scratch-root <external-run-directory>
```

Generate filtered comparison reports with:

```bash
pnpm benchmark:comparison-report -- --run-id <uuid> --config <matching-config.json> --scratch-root <external-run-directory> --asset-profile mixed --lambda-memory-mb 2048 --transfer-max-concurrency 64
```

Publication validates every required field, the selected configuration's exact matrix, and the external manifest before emitting a report, telemetry table, or README snapshot; missing, duplicate, dirty, incomplete, or unplanned cells fail publication. Select the configuration that produced the run, which may differ from today's canonical matrix. For local inspection of existing ledgers without the publication manifest, replace `--scratch-root` with `--preview true` and write the output to external scratch. Preview can include incomplete matrices and does not establish acceptance. Tables report `n`, median, Q1, Q3, and IQR.

## Methodology Summary

The benchmark harness measures deterministic static-site bundles across create, unchanged, changed-update, and stale-deletion-update phases. Paired Shin-vs-AWS comparison runs must use the same region, asset profile, states, destination prefix, memory setting, and repetition count.

The `assets` benchmark scenario generates deterministic bundles under `.benchmark-assets/`, which is ignored by git. The same stack definition can instantiate either `ShinBucketDeployment` or upstream AWS CDK `BucketDeployment`; the implementation is the intended comparison dimension.

## Telemetry Notes

Shin samples require sanitized `shin_deployment_summary` telemetry under the current diagnostics contract; the provider emits no constant `schemaVersion` marker, so the event discriminator plus strict field-shape validation is the only gate. The summary separates deployment work status from callback delivery, logical transfer objects from source and destination upload wire attempts, and deletion SDK calls from inferred object outcomes. It also exposes consumed body replays, typed throttling/errors, cancellations, invocation-global source memory and release anomalies, destination metadata/page high-water, callback attempts, bounded sanitized `PutObject` SDK/service classifications with correlated body/source failure groups, and direct-copy retry and throttle counters. Use `docs/architecture.md` for exact diagnostics meanings.

Do not infer S3 throttling from source block waits alone. Source S3 pressure requires source `getRetries` or `getErrors`; destination S3 throttling requires `putObject.throttledAttempts` or retry evidence for extracted uploads, and `copyObject.throttledAttempts` or retry evidence for direct copies.

Do not commit `.benchmark-runs/` or other raw AWS output. Commit only sanitized result rows, Markdown/SVG render outputs, configs, source, and tests.

## Current Ledger State

The active ledger contains six run records and 624 samples: the latest paired run `673c7141-7632-4cc4-866f-3e5a2dea1ccf` has two run records and 240 samples, and four retained upstream AWS CDK runs contribute another 384 samples. The current Shin run records `provider.implementationCommit` as `a1ab4fddf317c73d03650410b237c89dda69663d`. Later implementation changes are not measured by those samples.

Older Shin rows, including the `cd8953b` samples from run `62f8ad5d`, are archived because they predate the required deletion retry/throttle telemetry. They are historical evidence, not a second active schema, and missing counters must not be reconstructed. `pnpm build` followed by `pnpm verify:ledger` validates the committed run/sample ledgers; it does not certify a new performance result.

The latest generated report and telemetry above are the current comparison. The older analysis below explains previous decisions only; its percentages, bottleneck interpretations, and sweep outcomes must not be attributed to the current provider or mixed with the latest run into a new comparison.

## Historical Performance Interpretation

_Historical analysis of run `62f8ad5d` (2026-08-10 publish, provider `cd8953b`, three profiles, five repetitions each, configurations 1024 MiB/32 and 2048 MiB/64). Medians were derived from the then-current rows on 2026-08-12. Those Shin rows now live in the archive and are superseded as the active comparison by the 2026-08-26 run above. References to the matrix and telemetry in this section describe that historical experiment._

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

- **Plan is S3 metadata-latency bound, not CPU and not bandwidth — the former residual is now split.** Across all 120 historical Shin rows, the five-way plan partition closes to a ~0 residual (±2 ms rounding): `planSourceHeads` (per-source `HeadObject`) is ~36–59% of plan at the per-config median, `planDirectory` ~21–49%, `planCatalog` ~11–29%, and `planEntries`/`planValidation` ≈ 0. Heads show a first-S3-call latency signature — the first metadata call of an invocation costs several times the later ones, consistent with connection establishment — so overlapping source planning cannot remove it for the common single-source deployment (the P-7 reassessment). The lever would be priming the S3 client before or concurrently with the first real request. Allocation work in `planner.rs` is not a viable direction on this evidence.
- **Transfer — the largest single cost — is dominated by the destination PUT span, and its CPU share is not separately identifiable.** Across the 90 historical rows that performed upload work, `transferPutWait` (the destination PUT/upload span, including retries) is ≈ 100% of summed `transferTaskTotal` at the median; `transferPrepare` (comparison pass) ≈ 0 and source-fetch waits ≈ 0. `transferTaskTotal` sums across 32–64 concurrent tasks, so this is a summed-task share, not a wall-clock partition (unchanged-update rows transfer nothing and are excluded from the share). The PUT span mixes destination network wait with any streaming CPU performed while the request body is generated, and the current instrument does not separate those two — it localizes the cost to the PUT span, not to the network alone. The levers are destination per-object round-trip cost and concurrency, not memory.
- **Delete is service-bound.** A pruned update deletes its stale keys in a single `DeleteObjects` call with zero retries; the ~570–710 ms on `mixed`/`tiny-many` (and ~60–65 ms on `large-few`, which deletes far fewer keys) is fixed per-call service latency with no provider-side lever.
- **Memory capacity is not a constraint on the canonical profiles.** Peak usage is ~57–182 MiB against 1024–2048 MiB configured. Caveat: half of configured memory is the invocation-global ZIP-planning and source-block budget (`large-few` at 2048 MiB already shows the budget effect at 182 MiB), so multi-GiB archives use materially more; these figures are specific to the canonical profile sizes.
- **The concurrency ceiling is memory-dependent, not fixed at 64.** The 64 default and the construct's validation warning rest on the superseded `3a1fe594` run, where 128 slowed cold-create by 18% at both 1024 MiB and 2048 MiB. Those Shin rows were archived with the transfer sub-timings schema change, so the committed ledger holds no 2048/128 rows and can no longer reproduce that 18% figure. The 2026-08-13 exploratory sweep then measured `large-few` cold-create at 4096 MiB / 128 as 0.939 s against 1.379 s at 2048 MiB / 64 in the same run — about 32% faster — so 128 is not universally bad, and the ceiling tracks available memory. That sweep varied memory and concurrency together on one repetition each, so it does not isolate 128 at a fixed memory size. The knee between 32 and 64 remains unmeasured.
- **Per-object cost dominates at canonical sizes; bandwidth is not the observed ceiling.** Effective destination throughput during cold-create transfer at 2048 MiB / 64 rises monotonically with mean object size: `tiny-many` (8.2 MB across 2,584 objects) manages ~56 Mbps, `mixed` (52.9 MB / 442) ~654 Mbps, `large-few` (144.2 MB / 32) ~1,142 Mbps. The profile with the fewest bytes has the _slowest_ transfer, which is a per-object cost signature rather than a bandwidth one. Note that the `large-few` figure counts destination writes only and already exceeds the 625 Mbps that AWS documents as the 2 GB baseline for its scalable-bandwidth feature, so these runs were not capped at that figure — most plausibly because ~1-second transfers sit inside burst rather than sustained behaviour. Do not treat 625 Mbps as the operative ceiling for this configuration, and do not infer a bandwidth-bound floor from it.
- **The scalable-bandwidth feature is unevaluated here.** AWS Lambda scalable network bandwidth (announced 2026-08) scales from 625 Mbps at 2 GB to 3,000 Mbps at 10 GB for functions outside a VPC with at least 2 GB of memory, opt-in by requesting the "network bandwidth per execution environment" quota through Service Quotas, at no additional charge, in all commercial regions. The canonical matrix does not exercise it. The 2026-08-13 exploratory sweep does: on `large-few` it reaches the 10240 MiB tier and measures ≈ 1120 / 1870 / 1680 Mbps at 2048/64, 4096/128, and 10240/128, so no tier approaches the 3,000 Mbps figure and 10240 MiB is no faster than 4096 MiB. On that one-repetition evidence bandwidth is not the binding constraint on these profiles, which is consistent with the per-object cost signature above — treat further high-memory bandwidth sweeps as low value until the per-object cost that actually dominates is addressed.

### What the canonical matrix cannot answer

The two canonical points (1024/32, 2048/64) vary memory and concurrency together, so the 31–44% cold-create improvement is not attributable between 2× vCPU and 2× concurrency. The 2026-08-13 exploratory sweep answered part of this and is recorded above: a large-bytes profile gains nothing above 4096 MiB, and 128 concurrent transfers beat 64 at 4096 MiB on `large-few`. Open questions, in value order: whether the 4096/128 gain survives more than one repetition and which of its two axes produces it (a 4096/64 point would isolate it), and where the concurrency knee sits between 32 and 64. Whether transfer is CPU-bound at higher memory is not answered by the transfer sub-timings: they localize the cost to the PUT span but cannot split destination network wait from streaming CPU, so a memory sweep at fixed concurrency remains the only direct test of that axis. These questions require separately selected diagnostic configurations. A diagnostic AWS run used to evaluate a change must retain its validated sanitized run/sample evidence under the same persistence policy; a non-canonical matrix is not permission to keep completed decision evidence only in scratch.

## Measurement Cadence

- **Upstream AWS CDK `BucketDeployment` baselines are certified per chosen `aws-cdk-lib` release**, not continuously: the committed baseline was measured on `2.260.0` (run records carry `cdk.libVersion`). Re-measure the upstream side only when deliberately certifying a newer release; otherwise reuse the pinned baseline rather than re-paying its AWS cost.
- **Shin rows are re-measured after merging a performance-relevant provider change or before a release**, per the `AGENTS.md` benchmark policy: implementation first, then a maintainer-approved AWS session, then the sanitized rows land through an evidence PR identifying the measured `main` commit.
- **Diagnostic AWS sweeps used to evaluate a change require committed sanitized evidence**, including the measured configuration, run/sample identities, provider provenance, telemetry, and confirmed cleanup. Publish these through an evidence PR. Local experiments such as catalog synthesis and allocation microbenchmarks remain distinctly labeled local evidence.
- **Incomplete runs are recovery evidence.** Retain scratch manifests and raw captures for recovery; `cleanup: partial` cannot establish completed acceptance, and missing values must be omitted rather than filled with `null`.

## Historical Destination-Cleanup Attribution

This section preserves the 2026-08-05 attribution review of older decision runs. Their original evidence is available through the archive and Git history; it is not a current comparison.

The P-4/P-6/R-1 destination-cleanup decision run (`95f84950`, five repetitions at
`b281f03`, `mixed` 2048/64) reported planning rising from a 171 ms median to
273 ms against the `20313b6` baseline (`9af64d64`), and concluded the rise
"coincides with the new per-key stale-key retention path but this run does not
isolate its cause." A follow-up attribution review (2026-08-05) now isolates it,
using the then-committed sanitized rows plus a host micro-measurement:

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
  S3 round-trips plus the uninstrumented residual; see "Historical Performance Interpretation"
  above.]_
