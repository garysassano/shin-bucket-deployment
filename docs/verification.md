# Verification

This page is the human-readable verification snapshot for `ShinBucketDeployment` correctness. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `benchmarks/results.jsonl`. Verification does not keep append-only history; replace this page when a new full verification run becomes the current snapshot.

Runbooks, evidence collection rules, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-verification/SKILL.md`.

> [!IMPORTANT]
> The latest full AWS suite remains the 2026-05-15 baseline. A targeted
> 2026-07-11 refresh verifies the rebuilt packaged arm64 provider and the nested
> destination lifecycle contract in AWS. The 2026-07-12 local snapshot verifies
> bounded asset materialization and template-authenticated catalogs, but no AWS
> run was authorized for that change. The remaining full-suite scenarios and
> packaged x86_64 runtime path still need a current AWS rerun.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-07-12 |
| Latest verification baseline | `910a449` (`fix: authenticate and bound cataloged assets`) |
| Region | Local catalog/materialization gates; targeted AWS lifecycle verification in `eu-central-1`; previous full AWS suite in `ap-southeast-2` |
| Latest verification runs | `2026-07-12-local-trusted-catalogs`, `2026-07-11-targeted-lifecycle-aws`, and the earlier protocol/lifecycle snapshots |
| Cleanup | All three targeted AWS lifecycle stacks destroyed and confirmed absent; previous full-suite cleanup also confirmed |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Scenario runner | `pnpm verify list`, `pnpm verify synth`, `pnpm verify deploy`, or `pnpm verify destroy`; concurrent runs isolate CDK output per scenario |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation protocol/lifecycle coverage plus strict catalog request parsing, SHA-256 authentication, one-to-one ZIP mapping, ZIP64 metadata, trusted MD5 checks, direct-body completion withholding, marker reads, and sparse-skip trust boundaries. | Pass as of 2026-07-12 local catalog gates |
| P0 | S3 algorithm integration | Ignored Rust S3-to-S3 generated ZIP integration test with 2,500 generated files and bounded-memory ranged reads. | Pass as of 2026-05-02 |
| P0 | TypeScript tests | CDK synthesis plus deterministic catalog bytes, ignore behavior, path/special-file rejection, hard-link fallback, cleanup aggregation, disabled staging, protocol alignment/deduplication, 64 KiB reads, and a 256 MiB sparse-file RSS regression. | Pass as of 2026-07-12 local catalog gates |
| P0 | Build and lint | TypeScript build/package/typecheck/lint/tests, Rust fmt/clippy/all-feature tests, package smoke test, npm audit, cargo audit, cargo deny, actionlint, and Taplo. | Pass as of 2026-07-12 local catalog gates |
| P0 | Scenario synthesis | All 19 default `ShinBucketDeployment` verification scenarios synthesize locally with aligned trusted/untrusted `SourceCatalogs`. | Pass as of 2026-07-12 local catalog gates |
| P0 | Packaged provider runtime | Rebuilt packaged arm64 provider starts in Lambda and handles the targeted lifecycle chains; both packaged architectures pass local archive/package verification. | Targeted AWS pass; x86_64 AWS refresh required |
| P0 | AWS end-to-end simple deployment | Create, root-prefix deployment, S3 object checks, and destroy with the provider Lambda running in AWS. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end update/delete behavior | Targeted ordered chains verify default stale-object deletion, explicit stale-object retention, previous-object deletion after a destination change, preservation of the new child namespace, current-object deletion on custom-resource Delete, and final stack absence. Other update/delete scenarios retain the 2026-05-15 full-suite baseline. | Targeted pass; full refresh required |
| P0 | AWS end-to-end metadata/replacement behavior | Include/exclude filters, system/user metadata, SSE-S3 metadata, deploy-time marker replacement, JSON/YAML/data sources, and JSON escaping. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end KMS destination | KMS-encrypted destination bucket deploys and stored objects report `aws:kms`. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end CloudFront invalidation | Sync and async invalidation examples create invalidations during token updates and destroy cleanly; sync uses explicit paths and async covers prefix-derived default invalidation paths. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | Destination replacement IAM | Sparse/stale-object cleanup update can read existing destination objects before conditional replacement writes. | Pass after `4f5f0ca` |
| P1 | Destination KMS grant synthesis | KMS-encrypted destination buckets synthesize provider-role decrypt/describe/encrypt/re-encrypt/data-key permissions through CDK bucket grants. | Pass as of 2026-05-15 local synthesis test |
| P1 | Authenticated catalog trust | Only module-bound local directory assets receive `SourceCatalogs`; unbound catalogs cannot sparse-skip, trusted catalogs are strict and template-authenticated, and trusted entry bytes are MD5-checked on every read. | Pass as of 2026-07-12 deterministic local tests; AWS refresh not run |
| P2 | Metadata-only update identity | Same object bytes with changed user metadata are skipped because metadata is not part of skip identity. | Known limitation |

## Latest Verification Snapshot

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-07-12-local-trusted-catalogs` | local | Full static, unit, package, audit, and default-scenario synthesis gates at `910a449` | Pass | 97 Rust tests passed with one credential-gated AWS integration test ignored. Catalog coverage includes request alignment and malformed descriptors, exact SHA-256 binding, strict JSON and path/size/MD5 mapping, ZIP64 metadata, untrusted fallback, trusted sparse skips, comparison/marker reads, and direct-stream body failure before completion. TypeScript build/package/typecheck/lint, 60 Vitest tests, five Node release-script tests, both provider architectures, installed-tarball CommonJS/ESM directory consumers, audits, workflow/TOML checks, and all 19 default scenario syntheses passed. |
| `2026-07-11-local-protocol-reliability` | local | Full static, unit, package, audit, and default-scenario synthesis gates at `2c7c6d6` | Pass | 86 Rust tests passed with one credential-gated AWS integration test ignored. Deterministic protocol tests covered callback 2xx/4xx/5xx/connection/timeout handling, 4096/4097-byte response boundaries, escaped failure sizing, deadline cancellation/drain, `ResourceType`, and CloudFront path/poll limits. TypeScript build/typecheck/lint, 43 Vitest tests, five Node release tests, both rebuilt provider architectures, package smoke verification, audits, workflow/TOML checks, and all 19 default scenario syntheses passed. |
| `2026-07-11-targeted-lifecycle-aws` | aws | `stale-object-cleanup-initial` → `stale-object-cleanup-updated`; `stale-object-retention-initial` → `stale-object-retention-updated`; `object-deletion-initial` → `object-deletion-updated` → `object-deletion-bucket-only` | Pass | The packaged arm64 provider ran in AWS. Default deployment cleanup deleted the stale object, disabling it retained the stale object, destination-change cleanup removed the previous object while preserving the current child namespace, Delete removed the current object, and all three stacks were destroyed and confirmed absent. |
| `2026-07-11-local-lifecycle-contract` | local | Full static, unit, package, audit, and default-scenario synthesis gates | Pass | TypeScript build/typecheck/lint/tests, Rust fmt/check/clippy/tests, package smoke verification for both provider architectures, npm/cargo audits, cargo deny, actionlint, Taplo checks, benchmark report generation and collector tests, and all 19 default verification scenario syntheses passed. |
| `2026-05-15-aws-end-to-end-verification` | aws | Full ShinBucketDeployment AWS end-to-end suite | Pass | Concurrent deploy created or updated all 14 verification stacks; sanitized assertions passed for S3 object placement, metadata/filtering, marker replacement, stale-object cleanup, retention, delete cleanup, extract=false, source overwrite order, large archive, KMS encryption, CloudFront sync/async invalidations, and final stack absence. |
| `2026-05-15-local-unit-synth-verification` | local | Local unit/static/synthesis suite | Pass | Rust formatting/check/tests, TypeScript build/typecheck/lint/tests, and every public ShinBucketDeployment example used by AWS verification synthesized during deploy/destroy. |
| `2026-05-15-runner-concurrency-fix` | local/aws | Verification runner concurrent CDK output isolation | Pass | Initial concurrent deploy/destroy attempts exposed `cdk.out` synth lock contention; runner now passes per-scenario `--output` directories and the fresh concurrent deploy/destroy completed with zero remaining verification stacks. |

Historical verification rows were removed in favor of keeping only this latest human-readable snapshot.

## Known Limitations

- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- CloudFormation deadline and callback failure injection has current deterministic local coverage but has not been rerun as an AWS fault-injection scenario.
- Authenticated catalog planning and trusted entry-byte failures have deterministic local coverage but have not yet been exercised in AWS.
- Cross-bucket lifecycle moves and changed-distribution invalidation have local coverage but still need a current targeted AWS rerun.
- The packaged x86_64 provider passes local artifact and consumer smoke verification but has not been refreshed in AWS.
- Raw AWS evidence is intentionally excluded from git. Update this page with sanitized results after a new full verification run.
