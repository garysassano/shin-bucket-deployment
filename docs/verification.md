# Verification

This page is the current human-readable correctness snapshot for `ShinBucketDeployment`. Performance evidence and AWS CDK `BucketDeployment` comparisons remain separate in [benchmark](./benchmark.md). Verification is replaced rather than appended; runbooks and sanitization rules live in `.agents/skills/shin-verification/SKILL.md`.

> [!IMPORTANT]
> The streaming marker-replacement feature branch has complete local and AWS correctness evidence. The AWS run used the rebuilt arm64 provider from `d8b40a5`; both packaged architectures were rebuilt from the same provider source. Raw AWS output and identifiers remain outside git.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-07-13 |
| Current verification baseline | `d8b40a5` (`feat: stream deterministic marker replacement`) on `feat/streaming-marker-replacement` |
| Current verification category | Deterministic local gates plus deployed AWS end-to-end verification |
| Latest current run | `2026-07-13-aws-marker-replacement` |
| AWS status for current code | Pass: 21 ordered phases across 16 stacks, followed by independent state assertions |
| Provider architecture exercised in AWS | arm64 |
| Packaged provider architectures | arm64 and x86_64 rebuilt from the same provider source |
| Cleanup | All verification and benchmark stacks destroyed; the intentionally retained lifecycle-test bucket was emptied and deleted; final scoped stack count was zero |
| Raw evidence | Raw CDK logs, CloudWatch output, responses, and identifiers were kept in scratch only and are not committed |
| Scenario runner | `pnpm verify list`, `pnpm verify synth`, `pnpm verify deploy`, or `pnpm verify destroy`; ordered update chains remain serial within concurrent groups |

## Current Coverage

| Priority | Area | Current Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | 128 tests discovered: 127 passed and one credential-gated generated-S3 integration test was ignored. Coverage includes bounded scheduling and retry ownership plus the streaming marker engine's reference property tests, overlap/non-recursion, UTF-8 and chunk boundaries, empty/large replacement values, JSON escaping, exact size limits, CRC failure, retry-body replay, and final-frame withholding. | Local pass |
| P0 | TypeScript and release-script tests | 87 Vitest tests cover construct synthesis, encryption strategy derivation, KMS IAM, removed-prop rejection, assets, lifecycle, validation, and the marker benchmark profile; five Node release tests passed. | Local pass |
| P0 | Build and static checks | TypeScript build, published-package build, no-emit typecheck, Biome, Rust fmt/check, all-feature Clippy with warnings denied, package smoke verification, full-lock dependency audit, scoped dependency-policy checks, workflow checks, and clean diff validation passed. | Local pass |
| P0 | Scenario synthesis | All 21 default verification phases list and synthesize, including customer-managed KMS, AWS-managed KMS, and managed DSSE destination scenarios. The removed metadata-update chain is no longer part of the product contract. | Local pass |
| P0 | Marker replacement | Simultaneous leftmost-longest replacement is non-recursive and bounded across decompression chunks. AWS assertions checked plain, raw/escaped JSON, data, and YAML sources; telemetry recorded six planning and six upload passes using the declared two-pass strategy, with zero source GET errors/retries and zero destination PUT retries/throttles. | Local and AWS pass |
| P0 | Public object contract | The public props use a positive operational allowlist. Configurable object metadata, legacy `logRetention`, and unused `ephemeralStorageSize` are rejected; PUT/COPY infer `Content-Type` with a deterministic binary fallback. AWS assertions confirmed HTML, text, ZIP, and binary results. | Local and AWS pass |
| P0 | Encryption strategy | Default/AES256 buckets synthesize `sse-s3-etag`; KMS/DSSE variants synthesize `kms-sha256`. Imported, unknown, tokenized-algorithm, multi-rule, and ungrantable L1 customer-key shapes are rejected. | Local pass |
| P0 | KMS and DSSE writes | Customer KMS, AWS-managed S3 KMS, and managed DSSE uploads completed in AWS. Checksum-mode `HeadObject` independently confirmed exact content length, encryption mode, stored SHA-256, and `FULL_OBJECT` checksum type; object bodies also matched. | AWS pass |
| P0 | Managed-key authorization | Synthesis constrains `kms:Decrypt` and `kms:GenerateDataKey` to current account/Region KMS keys, `alias/aws/s3`, and regional S3 via-service use. Customer keys use CDK key grants. Real customer-managed and AWS-managed writes exercised both authorization paths. | Local and AWS pass |
| P0 | Content, filtering, and scale | AWS state assertions covered simple/root deployment, include/exclude filters, marker replacement and JSON escaping, duplicate-source overwrite order, `extract=false`, and the 24 MiB ranged-read object. | AWS pass |
| P0 | Destination lifecycle | Ordered AWS chains proved stale deletion, stale retention when `onDeploy.deleteStaleObjects=false`, default previous-prefix retention, explicit `onChange.deleteObjects`, and terminal `onDelete.deleteObjects`. | AWS pass |
| P0 | CloudFront invalidation | Both distributions were primed with long-TTL cached content, redeployed with distinct updated tokens, and checked again. The synchronous path served updated content when the stack returned; the asynchronous path converged within the bounded poll. | AWS pass |
| P0 | Lost-response convergence | SSE-S3 replay accepts only exact length plus streamed MD5/single-part ETag without checksum mode or ACL reads. KMS replay accepts only exact length plus stored `FULL_OBJECT` SHA-256 with checksum mode. | Deterministic local pass; AWS fault injection not performed |
| P0 | Transfer scheduling and retry ownership | Logical object work is bounded by `maxParallelTransfers` and continuously drained. Deterministic tests prove that the first error or panic stops admission, aborts and drains outstanding tasks, and wakes source waiters; ranged GETs use one SDK attempt per provider attempt and do not replay permanent failures. Healthy AWS phases completed with schema-v2 scheduler, wire-attempt, body-replay, throttling, and reader-high-water telemetry. | Local and AWS pass |

## Latest Verification Runs

| Run | Category | Scope | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-07-13-aws-marker-replacement` | aws | 21 phases across 16 stacks using the rebuilt arm64 streaming-marker provider | Pass and cleaned | Every ordered phase completed. Independent assertions covered content/types, all marker source shapes and telemetry, filters, source order, ranged reads, lifecycle state, exact KMS/DSSE checksum shape, and primed sync/async CloudFront invalidation. All stacks and the retained bucket were removed. |
| `2026-07-13-local-marker-replacement` | local | Streaming marker provider, decision-run harness, package, and scenario candidate | Pass | 127 Rust tests passed with one AWS-only test ignored; 87 Vitest and five Node tests passed; build/package/typecheck/lint/fmt/clippy/audit/deny/workflow/TOML gates passed; all scenarios synthesized; both Lambda architectures rebuilt and package-verified. |
| `2026-07-13-aws-transfer-scheduler` | aws | 21 phases across 16 stacks using the rebuilt arm64 transfer-scheduler provider | Pass and cleaned | Every ordered phase completed successfully. The runner destroyed all stacks and a separate scoped check found zero remaining. Raw logs and identifiers remain outside git. |
| `2026-07-13-local-transfer-scheduler` | local | Transfer-scheduler provider, telemetry, benchmark harness, package, and scenario candidate | Pass | 125 Rust tests passed with one AWS-only test ignored; 86 Vitest and five Node tests passed; build/package/typecheck/lint/fmt/clippy gates passed; all scenarios synthesized; both Lambda architectures rebuilt and package-verified. |
| `2026-07-12-local-pr12-release-candidate` | local | Provider source through `7a910f4` and the PR #12 TypeScript/scenario candidate | Pass | 114 Rust tests passed with one AWS-only test ignored; 86 Vitest and five Node tests passed; build/package/typecheck/lint/clippy/package gates passed; all 21 scenarios listed and synthesized; both Lambda architectures rebuilt. |
| `2026-07-12-aws-pr12-release-candidate` | aws | 21 phases across 16 stacks using the rebuilt arm64 provider | Pass and cleaned | Every custom resource reached CloudFormation success. Independent assertions then verified content, inferred types, filters, markers, source order, ranged reads, lifecycle state, exact KMS/DSSE checksums, and sync/async CloudFront invalidation. All stacks and the retained bucket were removed. |
| `2026-07-12-aws-object-semantics` | aws, historical | 21 phases across 15 stacks at `b40def8` | Superseded for current-code status | The run passed and cleaned up, but it exercised the removed metadata semantics, universal SHA-256, ACL reconciliation, and global marker preflight. It is not current PR #12 evidence. |

## Known Limitations

- Marker uploads require one bounded planning pass for exact length and validation, followed by a second bounded source pass when an upload is required; unchanged SSE-S3 objects stop after planning. The separately maintained performance decision run measures and accepts this tradeoff.
- The released AWS S3 dependency chain currently requires newly yanked `spin@0.10.0` through `crc-fast`. The full lockfile audit reports that yanked warning and no vulnerability; the dependency-policy command excludes only that exact transitive version until `crc-fast` publishes a compatible non-yanked dependency.
- The transfer-scheduler decision run contains five before, five current, and four upstream repetitions; the maintainer stopped the final upstream repetition to cap time and accepted the completed performance evidence for PR review. The 112 sanitized phase rows are retained in `benchmarks/results.jsonl`.
- The deployed AWS run exercised arm64. The x86_64 provider was rebuilt from the same source and passed package validation, but was not separately deployed.
- Lost-response convergence is covered with deterministic S3 wire replay rather than an injected AWS network failure. The real KMS/DSSE run confirms that the stored checksum needed by that reconciliation path exists and matches.
- KMS/DSSE destination ETags are not treated as plaintext MD5. Existing encrypted objects can transfer again instead of using the SSE-S3 catalog/ETag shortcut; avoiding a checksum-mode `HeadObject` per destination object keeps the normal deployment request count bounded.
- Deployments remain non-transactional across objects. A marker upload withholds its final body frame until the second pass validates source integrity and planned output identity, but earlier independent object writes may already have completed before a later object fails.
- Imported buckets, SSE-C, and encryption configurations whose strategy cannot be proven at synthesis remain intentionally unsupported.
- Raw AWS evidence remains intentionally excluded from git. Performance results and their separate caveats are maintained in [benchmark](./benchmark.md).
