# Benchmark

This page is the compact benchmark index for `ShinBucketDeployment`. Benchmarks measure performance and efficiency; correctness verification lives in `docs/verification.md`.

Runbooks, evidence collection rules, schema guidance, and sanitization rules live in `.agents/skills/shin-benchmark/SKILL.md`.

Provider-summary schema-5 result rows, their generated reports, and their chart live in `archive/` and are not current evidence.

## Form-decoding performance review

Retain the [form-decoding correction](listing-key-review.md) with its measured performance tradeoff. Reverting would restore the known confusion between space and literal-plus destination keys. This is a correctness correction, not an optimization or a zero-regression result. No numerical acceptance threshold was prespecified. The decision considers all 24 cells, spread, billing, memory and contemporaneous upstream controls; formal performance acceptance requires this evidence on `main`. Final deployed correctness remains pending the separate full verification suite at `c352d7b`, whose later fixture-cleanup changes do not alter the measured provider.

| Side   | Run UUID                               | Exact measured clean `main` commit         |
| ------ | -------------------------------------- | ------------------------------------------ |
| BEFORE | `61e8b1e5-0ad9-437d-b75f-9c9e640f64c4` | `db54f56ef17836887e8396ee05174c67cd782cd7` |
| AFTER  | `39c2a602-57cb-4370-88d9-9413cb45bf53` | `681d220488ed729a1bdf886a7c107b876bc9040f` |

Both retain decision `stabilization-form-decoding-20260905` and their original `before`/`after` variants. Each contains 240 samples across both implementations, three profiles, two Lambda configurations, four phases and five parallel repetitions, with Shin `DETAILED` diagnostics. All 47 strict comparison identity checks passed. Exact application hashes differ only because the correctness verifier JavaScript changed; the compiled benchmark application is byte-identical. The [complete comparison](../benchmarks/form-decoding-comparison.md) retains every metric, quartile and range, and [before/after telemetry](../benchmarks/form-decoding-telemetry.md) retains every numeric provider-summary field. Independent recomputation of all 6,048 metric/telemetry statistic groups from the sanitized ledgers matched the report.

Provider-duration medians increase in 11 cells, decrease in 12 and remain unchanged in one. The largest absolute increase is tiny-many 1024 MiB cold-create: 2.568→2.747 s, +179 ms / +6.97%. The largest relative increase is tiny-many 1024 MiB changed-update: 0.570→0.629 s, +59 ms / +10.35%. Six increases exceed the report's descriptive 5% flag; this is not an acceptance cutoff. The largest improvement is tiny-many 2048 MiB unchanged-update: 0.488→0.443 s, −45 ms / −9.22%.

Billed medians increase in 13 cells, decrease in ten and remain unchanged in one. Their absolute changes span −41 to +195 ms and percentage changes −6.73% to +8.64%. The largest absolute increase is again tiny-many 1024 MiB cold-create (+7.27% billed); the largest relative increase is tiny-many 2048 MiB changed-update (+57 ms / +8.64%). At fixed memory these percentages also describe allocated GB-second changes, not total deployment cost. Peak-memory medians rise in seven cells, fall in five and stay equal in 12, spanning −7 to +8 MiB; maximum increase is mixed 2048 MiB cold-create (109→117 MiB). Observed initialization median changes span −4 to +9 ms.

All 24 BEFORE/AFTER provider full ranges overlap. Ten provider IQR pairs are disjoint: eight slower and two faster cells, identified in the complete comparison. Four of the six increases above 5% have disjoint IQRs. Neither overlapping ranges nor overlapping IQRs proves no effect; five separate-run observations do not support a strong significance claim. AFTER remains 4.44–52.47 times faster than contemporaneous upstream provider medians. That advantage does not erase Shin's regressions.

Upstream provider median changes span −3.39% to +5.16%. In the largest relative Shin regression, upstream improves 2.82%, making the control-ratio sensitivity change +13.55%; in the largest absolute regression, upstream rises 0.61% and the sensitivity change is +6.33%. These ratios are descriptive sensitivity checks, not causal adjustment.

Across all 120 corresponding Shin sample positions, every object-count, byte-count and catalog counter is identical, as are fetched source bytes, GET attempts, PUT wire attempts, DeleteObjects calls/requested objects and callback wire/confirmed-response counts. All observed numeric retry, error, throttle, failed, cancelled, panicked, release-anomaly, block-refetch and replay fields are zero in both runs. Local source scheduling waits vary; they are not S3 throttling evidence. This check compares workload identity by repetition position without treating those executions as statistically paired.

The biggest absolute regression occurs with an empty destination: tiny-many 1024 cold-create lists zero objects and uploads 2,584. Destination-list time moves 29→32 ms, while transfer wall time moves 2,256→2,439 ms and cumulative PUT wait 70,774→74,412 ms; planning is 233→236 ms. The increase is observed mainly in the transfer span, not a measured encoded-key scanning span. That does not establish why the span changed.

The biggest relative regression, tiny-many 1024 changed-update, lists 2,584 objects, skips 2,582 and uploads two in both runs. Destination listing rises 205→234 ms and transfer 96→101 ms; planning falls 235→230 ms. At 2048, the same changed-update workload rises 228→243 ms in listing, 195→213 ms in planning and 95→101 ms in transfer. Conversely, unchanged-update listing for the same 2,584 objects improves from 246→195 ms at 1024 and 229→193 ms at 2048. There is no uniform many-object listing regression in these observations.

The remaining above-5% regressions also have mixed shapes. Large-few 1024 cold-create lists zero keys: listing falls 30→29 ms while transfer rises 1,632→1,713 ms and planning 171→177 ms. Large-few 1024 changed-update lists 32 keys: listing falls 35→34 ms, transfer stays 200 ms, planning rises 167→179 ms. Large-few 2048 unchanged-update lists/skips 32 keys: listing rises 33→35 ms, planning 129→135 ms and callback 40→43 ms. Small-object-count regressions and the many-object improvements neither prove nor disprove decoder cost.

The below-5% slower disjoint-IQR cells also require disclosure. Mixed 1024 pruned-update rises 47 ms / 4.47% provider and 6.38% billed; deletion moves 644→675 ms, listing 54→66 ms and planning 173→183 ms. Mixed 2048 unchanged-update rises 8 ms / 3.25% despite listing 63→62 ms; planning moves 135→142 ms. Tiny-many 1024 pruned-update rises 39 ms / 2.84%, with deletion 741→782 ms and listing 209→222 ms. Large-few 2048 pruned-update rises 17 ms / 3.65%; listing moves 31→34 ms, planning 138→151 ms and transfer 171→178 ms. Their full ranges all overlap, which is not grounds to discard the increases.

Five observations per cell from separate concurrent windows support neither a strong significance claim nor attribution to the decoder, initialization, network variation or measurement noise. Cumulative task timings can exceed wall time, and separate medians cannot be added or subtracted to invent CPU time. Local/CDK wall time is a secondary observation from concurrent execution. The arm64 canonical matrix establishes neither x86 performance nor pathological long encoded-key behavior; benchmark completion does not establish deployed exact-key correctness.

Original workflow/artifact identities and complete manifest-bound matrices passed validation. Independent cleanup confirmed all 60 stacks and 60 captured buckets absent for each run, with no errors. Both run/sample sets preserve their original provenance, labels, configuration digests and telemetry. This publication adds exactly 240 samples and two run records while preserving all 1,584 existing samples and 14 run records. The unchanged object/request/source-byte work and material upstream advantage support retaining the required correction with its disclosed regressions; neither proves that its cost is negligible.

## Destination listing performance review

This section records the percent-only decoder measurement at `2dec0bd`, published through PR #212 (`7736c27`). That performance review retained its measured tradeoff; subsequent AWS verification exposed the space/plus ambiguity corrected at `681d220`. URL encoding addressed the successful-response XML parser boundary, with decoding in the existing response allocation and no additional S3 request or namespace copy. The historical decision reviewed all 24 cells, their spread, billing, memory and contemporaneous upstream controls, with no numerical acceptance threshold prespecified. The measurements below do not establish performance acceptance for the later form-decoding correction; its separate comparison is documented above, and deployed correctness remains pending.

| Side          | Run UUID                               | Exact measured clean `main` commit         |
| ------------- | -------------------------------------- | ------------------------------------------ |
| Reused BEFORE | `57536204-0786-4c2f-8b51-1708dd98a59c` | `b499009c157b468fb521bec0de683bf03acdeaa4` |
| AFTER         | `ad8b41e3-b7dc-4be0-a087-dfcce4581cc0` | `2dec0bdef78d2109569724631aea3174d15efa89` |

The baseline remains the published runtime-maintenance AFTER run with its original `stabilization-runtime-dependencies-20260905` decision and `after` variant. The new run retains `stabilization-listing-keys-20260905` and `after`; neither provenance nor decision labels were rewritten. Each run contains 240 samples across Shin and upstream AWS CDK, three profiles, two Lambda configurations, four phases and five repetitions per cell, with Shin `DETAILED` diagnostics. All 47 strict identity checks passed. The [complete comparison](../benchmarks/listing-key-comparison.md) explains the narrowly pinned application-build difference using the exact-source review and 48 identical benchmark synthesis comparisons; it retains all metrics, quartiles and ranges.

Provider medians increased in 11 cells and decreased in 13. The largest increase was `large-few` 1024 MiB cold-create: +143 ms / +7.43% provider time, +206 ms / +10.08% billed time, and +16 MiB peak-memory median. `mixed` 1024 MiB cold-create increased by 59 ms / 4.54%, with disjoint full observed ranges: 1.063–1.313 s before and 1.321–1.372 s after. All four increases of at least 5% have overlapping IQRs, which does not prove an effect is absent. Across all cells, billed medians changed by −6.40% to +10.08%, peak-memory medians by −6 to +16 MiB, and observed initialization medians by −9 to +4 ms. AFTER provider medians remain 4.43–56.04 times faster than upstream; that advantage does not cancel the measured regressions.

The table highlights all provider increases above 3% and the largest improvement, as a review aid rather than a new threshold.

| Profile / MiB / transfers | Phase            | Provider s, before → after | Δ provider | Δ billed | AWS Δ provider | Before IQR s | After IQR s |
| ------------------------- | ---------------- | -------------------------: | ---------: | -------: | -------------: | -----------: | ----------: |
| mixed / 1024 / 32         | cold-create      |              1.299 → 1.358 |     +4.54% |   +4.30% |         +1.09% |  1.297–1.303 | 1.332–1.368 |
| mixed / 1024 / 32         | changed-update   |               0.41 → 0.426 |     +3.90% |   +3.39% |         -2.52% |  0.407–0.432 | 0.424–0.432 |
| mixed / 2048 / 64         | changed-update   |              0.382 → 0.351 |     -8.12% |   -5.71% |         -1.63% |  0.373–0.414 |  0.351–0.38 |
| tiny-many / 2048 / 64     | unchanged-update |              0.454 → 0.479 |     +5.51% |   +3.28% |         -2.03% |  0.445–0.477 | 0.473–0.497 |
| large-few / 1024 / 32     | cold-create      |              1.925 → 2.068 |     +7.43% |  +10.08% |         +2.56% |  1.923–2.043 |  2.04–2.222 |
| large-few / 1024 / 32     | unchanged-update |               0.24 → 0.253 |     +5.42% |   +3.92% |         -2.98% |  0.239–0.251 |  0.25–0.257 |
| large-few / 1024 / 32     | pruned-update    |              0.508 → 0.535 |     +5.31% |   +4.48% |         +1.98% |  0.499–0.524 |  0.48–0.573 |

Destination-list medians for the six slower highlighted cells were: `mixed` 1024 MiB cold-create 29→34 ms and changed-update 60→62 ms; `tiny-many` 2048 MiB unchanged-update 196→210 ms; `large-few` 1024 MiB cold-create 27→31 ms, unchanged-update 33→34 ms and pruned-update 32→34 ms. Both cold-create destinations were empty. The unchanged-update destinations contained 2,584 and 32 objects respectively, all skipped. The mixed changed update listed 442 objects, skipped 436 and uploaded six; the large-few pruned update listed 32, skipped 25, uploaded three and deleted four. All count medians and uploaded-byte medians matched across every cell.

The largest regression also has transfer wall time 1,695→1,802 ms, cumulative PUT wait 29,605→30,654 ms, cumulative PUT source wait 161→122 ms, planning 174→188 ms and callback 43→47 ms. The disjoint-range mixed cold-create cell has planning 173→183 ms, transfer 1,053→1,069 ms and callback 44→43 ms. These measurements do not isolate decoder cost: concurrent cumulative timings are not additive with wall time, and subtracting separate medians cannot produce CPU time. The few-object cold regression and improvements in several many-object cells are descriptive observations, not causal proof.

Every observed source GET retry/error and request retry/throttle/failure counter was zero in both runs. Source scheduling waits are not S3-throttling evidence. Five observations per cell from separate concurrent run windows support neither a significance claim nor attribution of movement to the decoder or to noise. Ordinary asset profiles do not measure pathological long encoded-key populations, and the arm64 measurements establish no x86_64 performance result.

Both original complete artifacts passed manifest and full-matrix validation before publication; relocation used the existing manifest API with unchanged identity and both ledger digests. Independent cleanup confirmed all 60 stacks and 60 captured buckets absent for each run. The new evidence adds exactly 240 samples and two run records while preserving all 1,104 existing samples and ten run records, including the separate runtime-maintenance decision.

## Runtime dependency maintenance decision

Retain the [reviewed runtime dependency refresh](runtime-dependency-review.md) with its measured performance tradeoff. The benefits are corrected compression-buffer position/bounds handling, LRU lifetime and panic-safety corrections, SDK clock-skew correction, and Lambda invocation-ID handling. The pair does not establish a speedup or zero regression. No numerical acceptance threshold was prespecified for this maintenance update; the decision considers these correctness benefits alongside every measured workload, its spread, and the upstream controls.

| Side   | Run UUID                               | Exact measured clean `main` commit         |
| ------ | -------------------------------------- | ------------------------------------------ |
| BEFORE | `ab9ac956-af55-40a0-9139-23bace5acb4c` | `339da0427002b56614c8dd54ab33c403cc5af1d4` |
| AFTER  | `57536204-0786-4c2f-8b51-1708dd98a59c` | `b499009c157b468fb521bec0de683bf03acdeaa4` |

Both runs retain decision `stabilization-runtime-dependencies-20260905` and their original `before`/`after` variant, exact provider provenance, telemetry, and cleanup records. Each contains 240 samples: Shin and upstream AWS CDK `BucketDeployment`, three profiles, two Lambda configurations, four phases, and five concurrent repetitions per cell. Shin used `DETAILED` diagnostics. Configuration, asset digests, installed dependencies, application build, toolchain, execution environment, and upstream provider code matched. The original configuration digests differ because they include the intended variant label; each was independently recomputed and validated.

Provider-duration medians increased in 16 of 24 cells and decreased in eight. The largest absolute increase was 103 ms for `tiny-many` cold-create at 1024 MiB / 32 transfers; the largest percentage increase was 8.59% for `mixed` pruned-update at 2048 MiB / 64 transfers. Billed-duration medians increased by at most 6.38%, and peak-memory medians changed by −10 to +2 MiB. Shin's AFTER provider medians remain 4.67–53.53 times faster than upstream in these cells, but that advantage does not cancel the regressions. The [complete before/after comparison](../benchmarks/runtime-dependency-comparison.md) retains all 24 cells, quartiles, ranges, initialization, billing, memory, and end-to-end timings.

The table includes all six provider-median increases of at least 5%, the largest absolute increase, and the largest percentage improvement. This is a review aid, not a newly imposed acceptance threshold.

| Profile / MiB / transfers | Phase            | Provider s, before → after | Δ provider | Δ billed | AWS Δ provider | Before IQR s | After IQR s |
| ------------------------- | ---------------- | -------------------------: | ---------: | -------: | -------------: | -----------: | ----------: |
| mixed / 1024 / 32         | pruned-update    |              1.071 → 1.125 |     +5.04% |   +4.37% |         -0.51% |  1.064–1.108 |  1.11–1.172 |
| mixed / 2048 / 64         | changed-update   |              0.359 → 0.382 |     +6.41% |   +5.83% |         +1.18% |  0.353–0.362 | 0.373–0.414 |
| mixed / 2048 / 64         | pruned-update    |              1.024 → 1.112 |     +8.59% |   +6.38% |         -0.76% |  1.022–1.078 | 1.028–1.122 |
| tiny-many / 1024 / 32     | cold-create      |               2.607 → 2.71 |     +3.95% |   +3.74% |         -6.06% |  2.534–2.615 | 2.502–2.734 |
| tiny-many / 1024 / 32     | unchanged-update |              0.468 → 0.507 |     +8.33% |   +2.19% |         +0.98% |  0.463–0.505 | 0.475–0.523 |
| tiny-many / 2048 / 64     | changed-update   |              0.564 → 0.597 |     +5.85% |   +3.90% |         +1.41% |  0.563–0.579 | 0.588–0.617 |
| large-few / 2048 / 64     | changed-update   |              0.419 → 0.387 |     -7.64% |   -6.04% |         -1.43% |  0.412–0.454 | 0.375–0.402 |
| large-few / 2048 / 64     | pruned-update    |              0.454 → 0.483 |     +6.39% |   +5.37% |         +0.81% |  0.447–0.459 | 0.462–0.504 |

Four of those six slower cells have non-overlapping IQRs: `mixed` 1024 MiB pruned-update, `mixed` 2048 MiB changed-update, `tiny-many` 2048 MiB changed-update, and `large-few` 2048 MiB pruned-update. All observed provider-duration ranges overlap, which does not establish that an effect is absent. Five samples from separate time windows support descriptive comparison, not a significance claim. Upstream movement is reported alongside Shin; it is not a causal correction.

Telemetry locates the measured time without identifying its cause. At 1024 MiB, `mixed` pruned-update deletion time rises from a 653 ms median to 729 ms, while `tiny-many` unchanged-update destination listing rises from 195 to 234 ms with no transfers. At 2048 MiB, `mixed` changed-update planning rises from 136 to 149 ms; `tiny-many` changed-update planning and transfer each rise by 10 ms; and `large-few` pruned-update planning and transfer rise by 13 and 16 ms. Conversely, `large-few` changed-update transfer falls from 188 to 162 ms. The largest percentage regression, `mixed` 2048 MiB pruned-update, includes AFTER deletion spans of 710 and 752 ms in two slower samples and a 227 ms planning span in the slowest sample. Its overall median cannot be reconstructed by adding independent phase medians. These observations do not distinguish dependency overhead from request-latency variation.

Object, byte, catalog, deletion, and callback work counters and fetched source bytes match across every corresponding sample. Source/transfer/delete/callback retries, errors and throttles, block refetches, body replays, replay-after-release events, transfer failures/cancellations/panics, and release anomalies are all zero in both runs. Initialization medians change by −11 to +4 ms; the runner forces a fresh provider environment for every phase, so unchanged-update does not measure warm handler reuse. The bounded memory changes and unchanged work/pressure counters support retaining the maintenance fix, without proving that its latency cost is zero or attributing it to a particular crate.

Independent cleanup confirmed all 60 planned stacks reached `DELETE_COMPLETE` and all 60 captured buckets returned `NoSuchBucket` for each run, with no cleanup errors. Both validated sample sets and matching run records are retained in the ledger; the earlier incomplete attempt remains excluded. This decision covers the measured arm64 M03 provider commit, not the later complete release candidate or x86 performance. The rebuilt x86 artifact has separate local correctness coverage, and deployed correctness/replacement verification remains a separate release gate. Repetitions ran concurrently, so local wall and CDK deployment times must not be compared directly with older sequential runs.

<!-- benchmark-ci:start -->

## Latest CI benchmark

The latest complete canonical five-repetition run was collected by GitHub Actions on 2026-09-05 from source commit `681d220`. It contains five independently collected parallel repetitions of all canonical profiles across all four phases. The sanitized run UUID is `39c2a602-57cb-4370-88d9-9413cb45bf53`; raw AWS output remains outside git.

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Region                | `eu-central-1`                                             |
| Lambda configurations | 1024 MiB / 32 Shin transfers, 2048 MiB / 64 Shin transfers |
| Sanitized rows        | 240                                                        |
| Cleanup               | destroyed                                                  |

| Profile     |  MiB | Max concurrency | Phase              |   n | Provider s, Shin / AWS | AWS/Shin | Local wall s, Shin / AWS | Max MiB, Shin / AWS |
| ----------- | ---: | --------------: | ------------------ | --: | ---------------------: | -------: | -----------------------: | ------------------: |
| `large-few` | 1024 |              32 | `cold-create`      |   5 |          1.962 / 9.284 |   4.732x |          72.172 / 78.384 |           123 / 447 |
| `large-few` | 1024 |              32 | `unchanged-update` |   5 |          0.246 / 9.256 |  37.626x |          37.209 / 49.069 |            33 / 447 |
| `large-few` | 1024 |              32 | `changed-update`   |   5 |          0.468 / 9.308 |  19.889x |          40.038 / 51.511 |            40 / 447 |
| `large-few` | 1024 |              32 | `pruned-update`    |   5 |          0.511 / 8.925 |  17.466x |           37.91 / 49.981 |            40 / 417 |
| `large-few` | 2048 |              64 | `cold-create`      |   5 |          1.145 / 5.084 |    4.44x |           70.59 / 72.668 |           188 / 447 |
| `large-few` | 2048 |              64 | `unchanged-update` |   5 |           0.22 / 5.182 |  23.555x |           38.04 / 42.419 |            33 / 447 |
| `large-few` | 2048 |              64 | `changed-update`   |   5 |            0.4 / 5.142 |  12.855x |           40.03 / 44.869 |            40 / 447 |
| `large-few` | 2048 |              64 | `pruned-update`    |   5 |           0.483 / 4.87 |  10.083x |          39.568 / 44.868 |            41 / 416 |
| `mixed`     | 1024 |              32 | `cold-create`      |   5 |          1.292 / 9.676 |   7.489x |          71.962 / 80.321 |           106 / 281 |
| `mixed`     | 1024 |              32 | `unchanged-update` |   5 |          0.271 / 9.989 |   36.86x |          34.924 / 44.042 |            33 / 281 |
| `mixed`     | 1024 |              32 | `changed-update`   |   5 |         0.415 / 10.086 |  24.304x |           39.497 / 49.56 |            39 / 281 |
| `mixed`     | 1024 |              32 | `pruned-update`    |   5 |          1.099 / 9.766 |   8.886x |          37.674 / 62.458 |            39 / 274 |
| `mixed`     | 2048 |              64 | `cold-create`      |   5 |          0.809 / 5.581 |   6.899x |          66.312 / 73.307 |           117 / 283 |
| `mixed`     | 2048 |              64 | `unchanged-update` |   5 |          0.254 / 5.657 |  22.272x |            34.33 / 38.89 |            35 / 282 |
| `mixed`     | 2048 |              64 | `changed-update`   |   5 |          0.364 / 5.729 |  15.739x |          37.135 / 51.638 |            37 / 282 |
| `mixed`     | 2048 |              64 | `pruned-update`    |   5 |           1.024 / 5.48 |   5.352x |          37.386 / 44.421 |            37 / 275 |
| `tiny-many` | 1024 |              32 | `cold-create`      |   5 |         2.747 / 25.077 |   9.129x |          72.455 / 94.751 |            58 / 219 |
| `tiny-many` | 1024 |              32 | `unchanged-update` |   5 |         0.512 / 26.866 |  52.473x |          34.084 / 62.256 |            35 / 212 |
| `tiny-many` | 1024 |              32 | `changed-update`   |   5 |          0.629 / 26.19 |  41.638x |          39.754 / 72.445 |            36 / 214 |
| `tiny-many` | 1024 |              32 | `pruned-update`    |   5 |         1.413 / 26.932 |   19.06x |           36.07 / 69.298 |            36 / 210 |
| `tiny-many` | 2048 |              64 | `cold-create`      |   5 |         1.513 / 14.971 |   9.895x |           72.36 / 84.188 |            62 / 223 |
| `tiny-many` | 2048 |              64 | `unchanged-update` |   5 |         0.443 / 14.881 |  33.591x |          34.049 / 51.347 |            36 / 222 |
| `tiny-many` | 2048 |              64 | `changed-update`   |   5 |          0.599 / 15.02 |  25.075x |          37.643 / 55.522 |            36 / 222 |
| `tiny-many` | 2048 |              64 | `pruned-update`    |   5 |         1.381 / 14.496 |  10.497x |          38.037 / 55.759 |            36 / 219 |

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

The active ledger contains 16 run records and 1,824 samples across ten run UUIDs. This publication adds the form-decoding AFTER run's 240 samples and two run records while preserving all 1,584 existing samples and 14 run records, including its BEFORE baseline and the previous runtime-maintenance and percent-decoding comparisons. The latest measured Shin commit is `681d220488ed729a1bdf886a7c107b876bc9040f`, run `39c2a602-57cb-4370-88d9-9413cb45bf53`. Later verification fixture-cleanup changes at `c352d7b` leave the provider unchanged; deployed release-candidate correctness remains a separate pending boundary.

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
