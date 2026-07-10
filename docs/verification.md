# Verification

This page is the human-readable verification snapshot for `ShinBucketDeployment` correctness. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `benchmarks/results.jsonl`. Verification does not keep append-only history; replace this page when a new full verification run becomes the current snapshot.

Runbooks, evidence collection rules, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-verification/SKILL.md`.

> [!IMPORTANT]
> This snapshot predates both the packaged prebuilt-provider path and the opt-in previous-destination cleanup contract. It does not verify that an npm-installed provider archive starts successfully in Lambda or that previous-destination cleanup works in AWS; both paths must be refreshed before this page is treated as current verification evidence.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-05-15 |
| Latest verification baseline | `0751eed` (`rename benchmark asset inputs`) plus the runner output isolation change in this verification update |
| Region | Local/unit suite plus AWS end-to-end suite in `ap-southeast-2` |
| Latest verification runs | `2026-05-15-aws-end-to-end-verification` and `2026-05-15-local-unit-synth-verification` |
| Cleanup | All AWS end-to-end verification stacks destroyed and confirmed absent |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Scenario runner | `pnpm verify list`, `pnpm verify synth`, `pnpm verify deploy`, or `pnpm verify destroy`; concurrent runs isolate CDK output per scenario |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, marker replacement, archive planning, destination prune planning, chunked hashing, MD5/ETag helpers, retryable body helpers, and `PutObject` retry policy helpers. | Pass as of 2026-05-15 full verification suite |
| P0 | S3 algorithm integration | Ignored Rust S3-to-S3 generated ZIP integration test with 2,500 generated files and bounded-memory ranged reads. | Pass as of 2026-05-02 |
| P0 | TypeScript tests | CDK synthesis, custom resource properties, unsupported prop checks, provider singleton behavior. | Pass as of 2026-05-15 full verification suite |
| P0 | Build and lint | TypeScript build/typecheck/lint and Rust checks. | Pass as of 2026-05-15 full verification suite |
| P0 | Scenario synthesis | Public ShinBucketDeployment verification scenarios synthesize as part of deployment runs. | Pass as of 2026-05-15 full verification suite |
| P0 | AWS end-to-end simple deployment | Create, root-prefix deployment, S3 object checks, and destroy with the provider Lambda running in AWS. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end update/delete behavior | Historical prune, retention, object-deletion, copy, overwrite-order, and larger-archive scenarios. The resource-authorized previous-destination update path has not yet been rerun in AWS. | Refresh required |
| P0 | AWS end-to-end metadata/replacement behavior | Include/exclude filters, system/user metadata, SSE-S3 metadata, deploy-time marker replacement, JSON/YAML/data sources, and JSON escaping. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end KMS destination | KMS-encrypted destination bucket deploys and stored objects report `aws:kms`. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | AWS end-to-end CloudFront invalidation | Sync and async invalidation examples create invalidations during token updates and destroy cleanly; sync uses explicit paths and async covers prefix-derived default invalidation paths. | Pass as of 2026-05-15 AWS end-to-end suite |
| P0 | Destination replacement IAM | Sparse/prune update can read existing destination objects before conditional replacement writes. | Pass after `4f5f0ca` |
| P1 | Destination KMS grant synthesis | KMS-encrypted destination buckets synthesize provider-role decrypt/describe/encrypt/re-encrypt/data-key permissions through CDK bucket grants. | Pass as of 2026-05-15 local synthesis test |
| P2 | Metadata-only update identity | Same object bytes with changed user metadata are skipped because metadata is not part of skip identity. | Known limitation |

## Latest Verification Snapshot

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-05-15-aws-end-to-end-verification` | aws | Full ShinBucketDeployment AWS end-to-end suite | Pass | Concurrent deploy created or updated all 14 verification stacks; sanitized assertions passed for S3 object placement, metadata/filtering, marker replacement, prune behavior, retention, delete cleanup, extract=false, source overwrite order, large archive, KMS encryption, CloudFront sync/async invalidations, and final stack absence. |
| `2026-05-15-local-unit-synth-verification` | local | Local unit/static/synthesis suite | Pass | Rust formatting/check/tests, TypeScript build/typecheck/lint/tests, and every public ShinBucketDeployment example used by AWS verification synthesized during deploy/destroy. |
| `2026-05-15-runner-concurrency-fix` | local/aws | Verification runner concurrent CDK output isolation | Pass | Initial concurrent deploy/destroy attempts exposed `cdk.out` synth lock contention; runner now passes per-scenario `--output` directories and the fresh concurrent deploy/destroy completed with zero remaining verification stacks. |

Historical verification rows were removed in favor of keeping only this latest human-readable snapshot.

## Known Limitations

- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- Resource-authorized namespace decisions, owner-tag boundaries, synthesized authorization, and scenario synthesis have local coverage; the corresponding AWS update/delete chain still needs a sanitized rerun.
- Raw AWS evidence is intentionally excluded from git. Update this page with sanitized results after a new full verification run.
