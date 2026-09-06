# Runtime dependency review

The September 2026 refresh updates the provider lockfile after checking published crate sources and upstream release notes. It changes CRC processing, compression-buffer validation, SDK signing behavior, and Lambda Runtime API responses. The [paired benchmark decision](benchmark.md#runtime-dependency-maintenance-decision) retains the reviewed maintenance benefits with the measured regression tradeoff; it does not claim an optimization or zero regression.

## Selected versions

Latest stable versions were checked against crates.io on 2026-09-05. The update targets these six direct runtime dependencies and only the transitive changes their resolution requires; it does not refresh the entire lockfile.

| Crate                | Previous  | Updated   |
| -------------------- | --------- | --------- |
| `async-compression`  | `0.4.43`  | `0.4.44`  |
| `aws-config`         | `1.11.0`  | `1.12.0`  |
| `aws-sdk-cloudfront` | `1.128.0` | `1.130.0` |
| `aws-sdk-s3`         | `1.143.0` | `1.145.0` |
| `crc32fast`          | `1.5.0`   | `1.5.1`   |
| `lambda_runtime`     | `1.3.0`   | `1.4.0`   |

Required transitive updates are `aws-runtime` `1.9.2`, `aws-sdk-sts` `1.114.0`, `aws-smithy-runtime-api` `1.16.0`, `aws-smithy-types` `1.6.3`, `aws-types` `1.6.0`, `compression-codecs` `0.4.39`, `compression-core` `0.4.33`, `lambda_runtime_api_client` `1.1.1`, and `lru` `0.18.4`. The unused `hashbrown` `0.16.1` lock entry disappears. Rust, cargo-lambda, and Zig build pins remain unchanged.

## Reviewed behavior

The [SDK September 4 release](https://github.com/awslabs/aws-sdk-rust/releases/tag/release-2026-09-04) enables clock-skew correction: response dates update a client offset used by signing, and sufficiently skewed signature failures become retryable. This adds request-level timing, parsing, and shared state. Source comparison confirms `BehaviorVersion::latest()` remains `v2026_01_12`; the Smithy retry strategy, HTTP client, and checksum crates stay at their existing versions. Shin's per-operation `RetryConfig::disabled()` still limits each SDK call to one attempt where Shin owns replay. Other operations retain their configured SDK retry policy. S3 request/response checksum code and streaming bodies are unchanged; upload stall protection remains disabled only on the destination client, with download protection enabled.

The [SDK August 25 release](https://github.com/awslabs/aws-sdk-rust/releases/tag/release-2026-08-25) raises the S3 cache's `lru` requirement. The [resolved LRU changelog](https://github.com/jeromefroe/lru-rs/blob/0.18.4/CHANGELOG.md) includes lifetime and panic-safety corrections, plus unused API additions. The remaining Smithy changes add response-extension access for clock-skew classification and change `Blob` formatting; they do not replace the transport or checksum implementation.

The [compression-core changes](https://github.com/Nullus157/async-compression/compare/compression-core-v0.4.32...compression-core-v0.4.33) correct initialized-position bookkeeping and enforce output-buffer bounds in release builds. The `async-compression` wrapper and `compression-codecs` Rust sources are identical between the selected versions. `flate2` `1.1.9` and `miniz_oxide` `0.8.9` remain the production decoder. The Astral ZIP parser stays at `0.0.21`, and test-only `base64` stays on `0.22`.

The [CRC source comparison](https://github.com/srijs/rust-crc32fast/compare/v1.5.0...v1.5.1) changes both Lambda architectures: AArch64 processes larger buffers through independent CRC accumulators; x86 improves short/tail processing and selects wider VPCLMULQDQ paths when the CPU supports them. These are changes to per-byte validation, not evidence of a provider speedup. Both architectures need rebuilt artifacts and correctness validation; an arm64 benchmark establishes no x86 performance result.

The [Lambda runtime release](https://github.com/aws/aws-lambda-rust-runtime/releases/tag/lambda_runtime-v1.4.0) echoes the optional runtime invocation ID in completion/error responses so the runtime can reject stale responses, and adds a function-name tracing attribute. The API client's Rust source is unchanged in `1.1.1`. Shin's separate CloudFormation response client remains on `reqwest` `0.13.4`, with redirects disabled and its existing connection/request timeouts.

## Validation and acceptance

Local validation passed: production/test DEFLATE parity on both architectures; Rust format, Clippy, and 323 tests; TypeScript build/typecheck/lint and 419 tests plus 54 script tests; supply-chain gates; both rebuilt provider archives; the actual x86 provider Create/Update/Delete smoke; packed-consumer verification; all 33 verification-scenario syntheses; and the no-AWS Shin/upstream benchmark templates. The smoke verifies S3 side effects and deployment summaries; its deliberately unreachable HTTPS callback does not establish CloudFormation delivery. These checks establish local correctness and package behavior; they do not substitute for deployed correctness or performance measurements.

The completed `readme-snapshots` comparison covers `tiny-many`, `mixed`, and `large-few` at both 1024 MiB / 32 transfers and 2048 MiB / 64 transfers, all four phases, five concurrent repetitions, and detailed telemetry. The exact clean BEFORE source is `339da0427002b56614c8dd54ab33c403cc5af1d4` (run `ab9ac956-af55-40a0-9139-23bace5acb4c`); the AFTER source is the implementation squash commit `b499009c157b468fb521bec0de683bf03acdeaa4` (run `57536204-0786-4c2f-8b51-1708dd98a59c`). The paired ledgers retain 480 samples, matching run records, exact provenance, and telemetry. Independent cleanup verified 60 stacks and 60 captured buckets absent for each run. The incomplete initial attempt is excluded.

The maintenance decision accepts observed arm64 provider-median increases of up to 103 ms and 8.59%, a billed-duration increase of up to 6.38%, and peak-memory median changes of −10 to +2 MiB, alongside improvements in other cells. Four increases of at least 5% have disjoint IQRs, so the retained upstream advantage is not presented as evidence of zero regression. The compression-buffer, LRU safety, signing, and runtime-response corrections justify the reviewed maintenance tradeoff; [the full comparison](../benchmarks/runtime-dependency-comparison.md) and [benchmark decision](benchmark.md#runtime-dependency-maintenance-decision) preserve the limits. The validated before/after ledgers are on `main` through PRs #208 and #211 (`10c2a2e` and `77b467e`), completing performance acceptance of this documented maintenance tradeoff. These arm64 measurements establish no x86 performance result. The integrated `c352d7b` full suite passed the applicable callback/runtime, lifecycle and shared-handler correctness paths, with independent cleanup recorded in [verification](verification.md). Benchmark rows remain separate performance evidence.
