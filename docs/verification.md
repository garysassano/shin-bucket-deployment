# Verification

This page is the human-readable verification snapshot for `ShinBucketDeployment` correctness. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `docs/benchmark-history.jsonl`. Full sanitized verification history is append-only JSONL in `docs/verification-history.jsonl`.

Runbooks, evidence collection rules, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-verification/SKILL.md`.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-05-09 |
| Latest verification commit | `614277d` (`add aws verification examples`) |
| Region | Local/unit suite plus AWS end-to-end suite in `ap-southeast-2` |
| Latest verification history | `2026-05-09-aws-end-to-end-verification` and `2026-05-09-local-unit-synth-verification` |
| Cleanup | All AWS end-to-end verification stacks destroyed and confirmed absent |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Full history | `docs/verification-history.jsonl` |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, marker replacement, archive planning, destination prune planning, chunked hashing, MD5/ETag helpers, retryable body helpers, and `PutObject` retry policy helpers. | Pass as of 2026-05-09 full verification suite |
| P0 | S3 algorithm integration | Ignored Rust S3-to-S3 generated ZIP integration test with 2,500 generated files and bounded-memory ranged reads. | Pass as of 2026-05-02 |
| P0 | TypeScript tests | CDK synthesis, custom resource properties, unsupported prop checks, provider singleton behavior. | Pass as of 2026-05-09 full verification suite |
| P0 | Build and lint | TypeScript build/typecheck/lint and Rust checks. | Pass as of 2026-05-09 full verification suite |
| P0 | Example synthesis | Public ShinBucketDeployment runner examples synthesize. | Pass as of 2026-05-09 full verification suite |
| P0 | AWS end-to-end simple deployment | Create, unchanged redeploy, S3 object checks, and destroy with the provider Lambda running in AWS. | Pass as of 2026-05-09 AWS end-to-end suite |
| P0 | AWS end-to-end update/delete behavior | Prune update, retain-on-delete update/delete, `retainOnDelete=false` update/delete cleanup, `extract=false`, duplicate multi-source overwrite, and larger archive deployment. | Pass as of 2026-05-09 AWS end-to-end suite |
| P0 | AWS end-to-end metadata/replacement behavior | Include/exclude filters, system/user metadata, SSE-S3 metadata, deploy-time marker replacement, JSON/YAML/data sources. | Pass as of 2026-05-09 AWS end-to-end suite |
| P0 | AWS end-to-end KMS destination | KMS-encrypted destination bucket deploys and stored objects report `aws:kms`. | Pass as of 2026-05-09 AWS end-to-end suite |
| P0 | AWS end-to-end CloudFront invalidation | Sync and async invalidation examples create invalidations during token updates and destroy cleanly. | Pass as of 2026-05-09 AWS end-to-end suite |
| P0 | Destination replacement IAM | Sparse/prune update can read existing destination objects before conditional replacement writes. | Pass after `4f5f0ca` |
| P1 | Destination KMS grant synthesis | KMS-encrypted destination buckets synthesize provider-role decrypt/describe/encrypt/re-encrypt/data-key permissions through CDK bucket grants. | Pass as of 2026-05-09 local synthesis test |
| P2 | Metadata-only update identity | Same object bytes with changed user metadata are skipped because metadata is not part of skip identity. | Known limitation |

## Latest Verification Records

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-05-09-aws-end-to-end-verification` | aws | Full ShinBucketDeployment AWS end-to-end suite | Pass | Deployed, asserted, destroyed, and confirmed absence for simple, metadata/filter, replacement, prune, retain, cleanup, extract=false, multi-source, large archive, KMS, and CloudFront scenarios. |
| `2026-05-09-local-unit-synth-verification` | local | Local unit/static/synthesis suite | Pass | Rust formatting/check/tests, TypeScript build/typecheck/lint/tests, and every public ShinBucketDeployment example synthesis command passed. |
| `2026-05-09-local-kms-grants` | local | Destination KMS grant synthesis | Pass | TypeScript synthesis test verifies provider-role KMS permissions are emitted for KMS-encrypted destination buckets. |

Historical sanitized verification rows for 2026-04-25 and 2026-05-02 were migrated into `docs/verification-history.jsonl` so the human page can stay concise while preserving full verification history.

## Known Limitations

- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- For `retainOnDelete=false`, deleting the deployment and bucket together follows the upstream CDK ownership-tag lifecycle: the deployment does not clear objects while another ownership tag is still present. Validate delete cleanup by removing the deployment construct while keeping the bucket in the stack.
- Raw AWS evidence is intentionally excluded from git. Use `docs/verification-history.jsonl` for durable sanitized records.
