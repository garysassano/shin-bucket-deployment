# Verification

This page is the human-readable verification snapshot for `RustBucketDeployment` correctness. Full sanitized verification history is append-only JSONL in `docs/verification-history.jsonl`.

Runbooks, evidence collection rules, and sanitization rules live in the repo-local agent skill at `.agents/skills/rbd-benchmark-verification/SKILL.md`.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-05-09 |
| Latest verification commit | `69ad582` (`use bucket grants for destination writes`) |
| Region | `ap-southeast-2` |
| Latest verification history | `2026-05-09-rust-aws-tiny-many-1024` |
| Cleanup | All benchmark-backed verification stacks destroyed |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Full history | `docs/verification-history.jsonl` |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, marker replacement, archive planning, destination prune planning, chunked hashing, MD5/ETag helpers, retryable body helpers, and `PutObject` retry policy helpers. | Pass as of 2026-05-02 |
| P0 | S3 algorithm integration | Ignored Rust S3-to-S3 generated ZIP integration test with 2,500 generated files and bounded-memory ranged reads. | Pass as of 2026-05-02 |
| P0 | TypeScript tests | CDK synthesis, custom resource properties, unsupported prop checks, provider singleton behavior. | Pass as of 2026-05-09 local verification |
| P0 | Build and lint | TypeScript build/typecheck/lint and Rust checks. | Pass as of latest local verification runs |
| P0 | Example synthesis | Public runner examples synthesize, including benchmark Rust and AWS variants. | Pass as of 2026-05-09 smoke checks |
| P0 | Benchmark-backed Rust deployment | Mixed and tiny-many profile create, forced unchanged, sparse update, prune update, and destroy at 1024 MiB. | Pass as of 2026-05-09 |
| P0 | Benchmark-backed AWS comparison deployment | Matching upstream AWS CDK `BucketDeployment` phases for the mixed and tiny-many profiles at 1024 MiB. | Pass as of 2026-05-09 |
| P0 | Destination replacement IAM | Sparse/prune update can read existing destination objects before conditional replacement writes. | Pass after `4f5f0ca` |
| P1 | Destination KMS grant synthesis | KMS-encrypted destination buckets synthesize provider-role decrypt/describe/encrypt/re-encrypt/data-key permissions through CDK bucket grants. | Pass as of 2026-05-09 local synthesis test |
| P1 | Simple AWS deployment | Plain static site create, unchanged redeploy skip, update, and destroy. | Pass as of 2026-04-25 |
| P1 | Metadata and filters AWS deployment | Include/exclude filters, S3 metadata mapping, SSE-S3 metadata, prune, and ETag skip behavior. | Pass as of 2026-04-25 |
| P1 | Replacement AWS deployment | Deploy-time marker replacement, JSON/YAML/data sources, MD5-after-replacement comparison, and unchanged marker redeploy skip. | Pass as of 2026-04-25 |
| P1 | Prune AWS update | Removed source files are deleted from destination when `prune=true`; unchanged objects are preserved. | Pass as of 2026-04-25 |
| P1 | Retain-on-delete AWS update/delete | Prior destination data survives update/delete when `retainOnDelete=true`. | Pass as of 2026-04-25 |
| P1 | `extract=false` AWS deployment | Non-extracted source archive is copied through `HeadObject`/`CopyObject`, unchanged redeploy is skipped, and destroy succeeds. | Pass as of 2026-04-25 |
| P1 | `retainOnDelete=false` AWS update/delete | Old prefix is deleted on prefix update; deployed objects are deleted when the deployment construct is removed while the bucket remains. | Pass as of 2026-04-25 |
| P1 | Multi-source overwrite order | Duplicate relative keys across sources resolve to the later source in the source list. | Pass as of 2026-04-25 |
| P2 | Larger archive AWS deployment | Larger temporary asset deploys through ranged archive reads and streamed ZIP-entry upload. | Pass as of 2026-04-25 |
| P2 | CloudFront invalidation, sync | Invalidation is created and stack waits for completion. | Pass as of 2026-04-25 |
| P2 | CloudFront invalidation, async | Invalidation is created without blocking stack completion. | Pass as of 2026-04-25 |
| P2 | Metadata-only update identity | Same object bytes with changed user metadata are skipped because metadata is not part of skip identity. | Known limitation |

## Latest Verification Records

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-05-09-rust-aws-tiny-many-1024` | benchmark-backed | Rust tiny-many profile create/forced-unchanged/sparse/prune/destroy | Pass | Sanitized benchmark counters show expected upload, skip, sparse update, and prune behavior across 2,585 deployed entries. |
| `2026-05-09-rust-aws-tiny-many-1024` | benchmark-backed | AWS BucketDeployment paired comparison | Pass | Matching upstream comparison stack completed the same tiny-many phases and was destroyed. |
| `2026-05-09-rust-aws-mixed-1024-fixed` | benchmark-backed | Rust mixed profile create/forced-unchanged/sparse/prune/destroy | Pass | Sanitized benchmark counters show expected upload, skip, and prune behavior after the destination read IAM fix. |
| `2026-05-09-rust-aws-mixed-1024-fixed` | benchmark-backed | AWS BucketDeployment paired comparison | Pass | Matching upstream comparison stack completed the same phases and was destroyed. |
| `2026-05-09-local-kms-grants` | local | Destination KMS grant synthesis | Pass | TypeScript synthesis test verifies provider-role KMS permissions are emitted for KMS-encrypted destination buckets. |

Historical sanitized verification rows for 2026-04-25 and 2026-05-02 were migrated into `docs/verification-history.jsonl` so the human page can stay concise while preserving full verification history.

## Known Limitations

- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- For `retainOnDelete=false`, deleting the deployment and bucket together follows the upstream CDK ownership-tag lifecycle: the deployment does not clear objects while another ownership tag is still present. Validate delete cleanup by removing the deployment construct while keeping the bucket in the stack.
- Raw AWS evidence is intentionally excluded from git. Use `docs/verification-history.jsonl` for durable sanitized records.
