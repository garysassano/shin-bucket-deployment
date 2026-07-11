# Verification

This page is the human-readable verification snapshot for `ShinBucketDeployment` correctness. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `benchmarks/results.jsonl`. Verification does not keep append-only history; replace this page when a new full verification run becomes the current snapshot.

Runbooks, evidence collection rules, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-verification/SKILL.md`.

> [!IMPORTANT]
> The latest full AWS suite remains the 2026-05-15 baseline. A targeted
> 2026-07-11 refresh verifies the rebuilt packaged arm64 provider and the nested
> destination lifecycle contract in AWS. The remaining full-suite scenarios and
> packaged x86_64 runtime path still need a current AWS rerun.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-07-11 |
| Latest verification baseline | `be5497e` (`feat!: group destination lifecycle controls by phase`) |
| Region | Local lifecycle gates plus targeted AWS lifecycle verification in `eu-central-1`; previous full AWS suite in `ap-southeast-2` |
| Latest verification runs | `2026-07-11-targeted-lifecycle-aws` and `2026-07-11-local-lifecycle-contract` |
| Cleanup | All three targeted AWS lifecycle stacks destroyed and confirmed absent; previous full-suite cleanup also confirmed |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Scenario runner | `pnpm verify list`, `pnpm verify synth`, `pnpm verify deploy`, or `pnpm verify destroy`; concurrent runs isolate CDK output per scenario |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, lifecycle authorization, namespace overlap, marker replacement, archive planning, stale-object deletion planning, chunked hashing, MD5/ETag helpers, retryable body helpers, and `PutObject` retry policy helpers. | Pass as of 2026-07-11 local lifecycle gates |
| P0 | S3 algorithm integration | Ignored Rust S3-to-S3 generated ZIP integration test with 2,500 generated files and bounded-memory ranged reads. | Pass as of 2026-05-02 |
| P0 | TypeScript tests | CDK synthesis, nested lifecycle custom-resource properties, independent previous-distribution authorization, prefix-scoped IAM, obsolete prop rejection, and provider singleton behavior. | Pass as of 2026-07-11 local lifecycle gates |
| P0 | Build and lint | TypeScript build/typecheck/lint, Rust fmt/check/clippy, package smoke test, npm audit, cargo audit, and cargo deny. | Pass as of 2026-07-11 local lifecycle gates |
| P0 | Scenario synthesis | All 19 default `ShinBucketDeployment` verification scenarios synthesize locally. | Pass as of 2026-07-11 local lifecycle gates |
| P0 | Packaged provider runtime | Rebuilt packaged arm64 provider starts in Lambda and handles the targeted lifecycle chains; both packaged architectures pass local archive/package verification. | Targeted AWS pass; x86_64 AWS refresh required |
| P0 | AWS end-to-end simple deployment | Create, root-prefix deployment, S3 object checks, and destroy with the provider Lambda running in AWS. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end update/delete behavior | Targeted ordered chains verify default stale-object deletion, explicit stale-object retention, previous-object deletion after a destination change, preservation of the new child namespace, current-object deletion on custom-resource Delete, and final stack absence. Other update/delete scenarios retain the 2026-05-15 full-suite baseline. | Targeted pass; full refresh required |
| P0 | AWS end-to-end metadata/replacement behavior | Include/exclude filters, system/user metadata, SSE-S3 metadata, deploy-time marker replacement, JSON/YAML/data sources, and JSON escaping. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end KMS destination | KMS-encrypted destination bucket deploys and stored objects report `aws:kms`. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end CloudFront invalidation | Sync and async invalidation examples create invalidations during token updates and destroy cleanly; sync uses explicit paths and async covers prefix-derived default invalidation paths. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | Destination replacement IAM | Sparse/stale-object cleanup update can read existing destination objects before conditional replacement writes. | Pass after `4f5f0ca` |
| P1 | Destination KMS grant synthesis | KMS-encrypted destination buckets synthesize provider-role decrypt/describe/encrypt/re-encrypt/data-key permissions through CDK bucket grants. | Pass as of 2026-05-15 local synthesis test |
| P2 | Metadata-only update identity | Same object bytes with changed user metadata are skipped because metadata is not part of skip identity. | Known limitation |

## Latest Verification Snapshot

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-07-11-targeted-lifecycle-aws` | aws | `stale-object-cleanup-initial` → `stale-object-cleanup-updated`; `stale-object-retention-initial` → `stale-object-retention-updated`; `object-deletion-initial` → `object-deletion-updated` → `object-deletion-bucket-only` | Pass | The packaged arm64 provider ran in AWS. Default deployment cleanup deleted the stale object, disabling it retained the stale object, destination-change cleanup removed the previous object while preserving the current child namespace, Delete removed the current object, and all three stacks were destroyed and confirmed absent. |
| `2026-07-11-local-lifecycle-contract` | local | Full static, unit, package, audit, and default-scenario synthesis gates | Pass | TypeScript build/typecheck/lint/tests, Rust fmt/check/clippy/tests, package smoke verification for both provider architectures, npm/cargo audits, cargo deny, actionlint, Taplo checks, benchmark report generation and collector tests, and all 19 default verification scenario syntheses passed. |
| `2026-05-15-aws-end-to-end-verification` | aws | Full ShinBucketDeployment AWS end-to-end suite | Pass | Concurrent deploy created or updated all 14 verification stacks; sanitized assertions passed for S3 object placement, metadata/filtering, marker replacement, stale-object cleanup, retention, delete cleanup, extract=false, source overwrite order, large archive, KMS encryption, CloudFront sync/async invalidations, and final stack absence. |
| `2026-05-15-local-unit-synth-verification` | local | Local unit/static/synthesis suite | Pass | Rust formatting/check/tests, TypeScript build/typecheck/lint/tests, and every public ShinBucketDeployment example used by AWS verification synthesized during deploy/destroy. |
| `2026-05-15-runner-concurrency-fix` | local/aws | Verification runner concurrent CDK output isolation | Pass | Initial concurrent deploy/destroy attempts exposed `cdk.out` synth lock contention; runner now passes per-scenario `--output` directories and the fresh concurrent deploy/destroy completed with zero remaining verification stacks. |

Historical verification rows were removed in favor of keeping only this latest human-readable snapshot.

## Known Limitations

- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- Cross-bucket lifecycle moves and changed-distribution invalidation have local coverage but still need a current targeted AWS rerun.
- The packaged x86_64 provider passes local artifact and consumer smoke verification but has not been refreshed in AWS.
- Raw AWS evidence is intentionally excluded from git. Update this page with sanitized results after a new full verification run.
