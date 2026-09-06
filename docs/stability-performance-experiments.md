# Stability and performance experiments

Keep the current provider implementation. The 2026-09-06 S01 buffer-sizing and S02 borrowed-input experiments reduce allocations and improve one small-file operation, but neither establishes a worthwhile deployment-level gain under the selected stability and performance criteria. Both candidates remain isolated experiments. Retain the expanded upload-boundary and cancellation/replay regression tests, without changing the decoder, source scheduler, upload protocol, dependencies or defaults.

## Method and provenance

The [existing transfer harness](transfer-preparation-benchmark.md) exercised 112 cases per run with seven samples per case: Stored and Deflate, high-entropy and repetitive JSON, 16 KiB and 2 MiB entries, cataloged and uncataloged paths, markers, cold creates, unchanged comparisons and changed uploads. All builds reused the same 16 immutable ZIP fixtures. The [complete local evidence](../benchmarks/local/stability-performance-experiments.jsonl) retains 12 build records and 1,344 case distributions derived from 9,408 samples, including slow runs and unaffected controls. Every case preserves minimum, median and maximum durations, allocation totals/counts, peak live allocation and branch outcomes. These are observed distributions, not tail-latency estimates.

| Role                               | Exact clean source commit                  | Executable SHA-256                                                 |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Baseline                           | `4c15c0caca59b044d9e203f8b0a2ec23236a6f8d` | `5c9d9bab5e19bfb29bcd5f82b4e5e6dde31732554796b96cb577e60e16820779` |
| S01: smaller direct-upload buffers | `421610d6b23c3a320eb1e4161ea5d1d2adacd6a6` | `dc9799b5393fe5077432a12faf0854fa4b59d2833b340c7ccecb3f4cdaa4872b` |
| S02: borrowed DEFLATE input        | `1b7410e44805ec2ab1224c3d9a76a74e2274e419` | `20d38c2630e014615fa384bb8249bb225812367662675e6c86cfbb9d7ca7eddf` |

Each candidate had its own branch/worktree and was compared directly with the same baseline; the changes were never combined. Rust/Cargo 1.97.1, thin-LTO release settings, `flate2 1.1.9` with `miniz_oxide`, the lockfile and fixtures stayed fixed. Production/test feature checks agreed for the host and both Lambda architectures. Execution used one Tokio thread, resident source bytes, DETAILED diagnostics and the existing concurrency/spool setting of 64 on a Ryzen 5 7600X under WSL2. Timings exclude network, fixture construction and the separate allocation-counting pass.

Cargo builds ran serially with one build job, a 5 GiB cgroup memory limit and a 512 MiB cgroup swap limit. No benchmark matrix overlapped a Cargo build or another matrix. Preserved executables were reused for repeats, with their SHA-256 and embedded build IDs checked. Other processes shared the host; the control results show why small or inconsistent changes cannot be attributed confidently to these candidates.

S01 block order was baseline-1 → s01-1, s01-2 → baseline-2, baseline-3 → s01-3. S02 order was s02-1 → baseline-4, baseline-5 → s02-2, s02-3 → baseline-6. Every run contains exactly seven samples for each of the same 112 case identities. Fixture hashes, compressed/output lengths, skip/spool decisions and decoded/emitted byte counts matched across all runs. Source request/replay counts were checked in deterministic correctness tests; they are not additional timing-harness fields.

The adoption criteria were a repeatable focused local improvement of at least 10%, then at least 5% target-workload AWS provider-duration or billed-cost improvement with no greater than 3% canonical regression. Reliability, memory headroom, variability and design complexity could veto a numerical win. Allocation reductions alone were insufficient without a selected concrete memory problem. A candidate could stop before AWS if local evidence did not justify a material workload benefit.

## S01: size direct-upload allocations to the remaining entry

The candidate replaced the unconditional 256 KiB assembly allocation with the smaller of that size and the remaining declared bytes plus one EOF-probe byte. It retained the existing 256 KiB frame boundaries, size ceiling, CRC/MD5 checks, backpressure and final-frame withholding. Exact-multiple entries needed only a one-byte final probe allocation instead of another 256 KiB buffer. Marker forwarding stayed unchanged: its separate replacement stream does not naturally expose a remaining length, and changing that contract was unnecessary for this experiment.

These are cataloged, marker-free cold-create medians. Positive reductions mean the candidate was faster.

| Case                            | Block 1, baseline → candidate µs |          Block 2 µs |          Block 3 µs | Reduction across blocks |
| ------------------------------- | -------------------------------: | ------------------: | ------------------: | ----------------------- |
| 16 KiB Stored, high entropy     |                    21.08 → 21.30 |       21.23 → 21.26 |       21.09 → 21.17 | −1.05%, −0.15%, −0.41%  |
| 16 KiB Deflate, high entropy    |                    31.01 → 26.40 |       31.20 → 26.61 |       31.18 → 26.29 | 14.87%, 14.70%, 15.68%  |
| 16 KiB Deflate, repetitive JSON |                    46.66 → 31.29 |       36.32 → 35.05 |       36.11 → 31.83 | 32.94%, 3.48%, 11.85%   |
| 2 MiB Deflate, repetitive JSON  |              5,092.11 → 4,104.41 | 4,077.72 → 4,062.76 | 4,057.28 → 4,121.28 | 19.40%, 0.37%, −1.58%   |

The reproducible benefit was approximately 4.6–4.9 µs per high-entropy 16 KiB Deflate upload. The apparent first-block large-file gain did not survive repetition: unchanged standalone decoding and marker controls also moved substantially. Cataloged marker-free unchanged entries continued to decode zero bytes.

For the 16 KiB Stored cold-create case, allocated bytes fell from 272,707 to 26,948 and peak live allocation from 270,323 to 24,564, with the same allocation count. The corresponding Deflate case saved the same 245,759 bytes. Large exact-multiple entries avoided 262,143 bytes of allocation. These are per-operation incremental heap measurements, not measured process RSS or concurrent deployment memory savings.

Disposition: reject adoption for the current workloads. The local high-entropy timing case clears 10%, but its absolute saving is small. Applying the measured 4.6–4.9 µs to all 2,584 canonical tiny-many objects gives roughly 12 ms of host CPU time for scale; the actual objects differ in size/compressibility, so this is neither a bound nor a Lambda prediction. The latest canonical cold-create median is 1.513 s at 2048 MiB/64, with a 62 MiB reported memory high-water and no recorded source refetches or PUT retries in that run. This does not identify a concrete memory-pressure problem or establish the required 5% deployed benefit. No AWS comparison was warranted from these results, and no runtime change was retained.

## S02: decode from the existing borrowed source bytes

The candidate implemented Tokio's standard [`AsyncBufRead`](https://docs.rs/tokio/latest/tokio/io/trait.AsyncBufRead.html) interface on the existing lazy ZIP reader and its data reader, then passed it directly to `async-compression`'s buffered DEFLATE decoder. It removed the 8–64 KiB compressed-input `BufReader` allocation and copy without adding state, dependencies, unsafe code or a second decoder. It did add reader trait methods and consumption invariants that would need maintenance. The source slice remained bounded to the entry's compressed span, and consumed views were dropped before releasing their memory permits.

These are cataloged cold-create medians; only the last row uses markers.

| Case                                        | Block 1, baseline → candidate µs |            Block 2 µs |            Block 3 µs | Reduction across blocks |
| ------------------------------------------- | -------------------------------: | --------------------: | --------------------: | ----------------------- |
| 16 KiB Deflate, high entropy                |                    31.32 → 27.72 |         31.07 → 27.91 |         31.95 → 27.54 | 11.49%, 10.18%, 13.80%  |
| 2 MiB Deflate, high entropy                 |              2,650.65 → 2,808.69 |   2,690.26 → 2,935.28 |   3,233.42 → 2,595.53 | −5.96%, −9.11%, 19.73%  |
| 2 MiB Stored, high entropy control          |              2,433.75 → 2,743.37 |   2,657.36 → 2,473.37 |   2,752.98 → 2,487.76 | −12.72%, 6.92%, 9.63%   |
| 2 MiB Deflate, repetitive JSON              |              4,062.12 → 4,122.06 |   4,228.54 → 5,206.15 |   4,481.30 → 4,482.33 | −1.48%, −23.12%, −0.02% |
| 2 MiB Deflate, repetitive JSON with markers |            13,331.24 → 14,540.05 | 14,113.42 → 14,111.07 | 14,474.21 → 15,562.40 | −9.07%, 0.02%, −7.52%   |

The reliable small-case saving was 3.2–4.4 µs. Its total allocation fell from 332,563 to 316,126 bytes and allocation count from 30 to 29. Larger high-entropy results changed sign alongside Stored controls, and repetitive/marker workloads showed no repeatable improvement. Those observations do not establish a stable regression-free matrix or a material larger-file gain.

Disposition: reject adoption for the current workloads. Removing a staging buffer is technically feasible, but the additional reader contract is unwarranted for the measured absolute benefit and unsettled broader results. No ARM64 timing or AWS benefit was measured, and the runtime adapter was not retained.

## Correctness and retained work

Both candidate full Rust suites passed 331 tests. The baseline and both candidate executables passed all 112 exact-body/branch fixture checks plus CRC, declared-size, trusted-MD5 and truncation rejection checks. Existing malformed ZIP/ZIP64, replacement, conditional-write, cancellation and deadline tests remained enabled.

S01 expanded direct-stream coverage to empty, one-byte, 4 KiB, 16 KiB and below/at/above 256 KiB bodies, plus multiple frames, with nonperiodic contents, both compression methods and 4 KiB source blocks. It checked frame classification, byte-for-byte output and recorded MD5. New excess-output tests proved that reading the declared byte count alone does not complete the upload or publish the final frame.

S02 added repeated-fill/partial-consume/zero-consume/EOF checks, including a resident block containing following ZIP directory bytes and a yielding consumer. It also expanded the existing gated ranged-GET cancellation/replay test to exercise Deflate as well as Stored, with the expected request count, one replay, zero retained source-budget bytes and all claims released. Its adapter-specific tests remain with the rejected candidate.

The retained change carries the portable frame/excess-output checks and both-method cancellation/replay coverage onto the unchanged baseline. That final Rust suite passes 331 tests, with formatting and all-target/all-feature Clippy checks. The TypeScript build, typecheck, lint, Node tests and repository Markdown checks also pass. No correctness snapshot or AWS performance ledger was replaced by these local measurements. Both-architecture package rebuilds, AWS correctness, a fresh upstream comparison and deployment timing were intentionally skipped after rejecting the runtime candidates; there is no retained deployed behavior change requiring them.

## Deferred investigations

| Task                                                         | Disposition and reason to reopen                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S03: deterministic marker spool sizing                       | Deferred. Canonical runs contain no marker work, and no real marker-heavy target was selected. The existing harness demonstrates the spool boundary but cannot justify a new aggregate bound for an unspecified workload. Keep the deterministic 16 MiB total budget; do not add a shared borrowing pool.                                                                                   |
| S04: overlap the first destination LIST with source planning | Deferred. The current pager can fetch bounded pages, but moving one ahead of preflight changes failure ordering and timing interpretation. Cold-create listing medians are about 27–28 ms. The 62 ms mixed unchanged listing phase is a plausible lead, not first-request timing evidence. Select a material latency target and establish request-level timing before adding orchestration. |
| S05: fixed memory/concurrency comparisons                    | Deferred. Existing evidence varies memory and concurrency together and does not select a new default. No configuration sweep was necessary to evaluate these rejected CPU/allocation candidates. Reopen with a specific workload and bounded one-axis matrix; compare cost and variability as well as median duration.                                                                      |

AWS diagnostic execution was authorized for this investigation if useful. The decision not to run it follows the local results and scope, not missing permission. The [previous zlib-rs rejection](deflate-backend-experiment.md), many-source HEAD and multi-batch deletion deferrals remain unchanged. The selected S00/S01/S02/S06 work is closed by these results and the retained regression coverage; deferred tasks are not claimed as executed experiments.
