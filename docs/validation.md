# Validation Matrix

Last updated: 2026-04-25

This file tracks the durable validation status for `RustBucketDeployment`. It should stay high signal: what is covered, how to rerun it, when it was last checked, and whether the result is trusted.

Do not commit raw AWS run logs, local profile names, account IDs, resource IDs, object ETags, CloudFront distribution IDs, or stack-specific incident details here. Keep those in private notes or issue threads when they are useful for debugging.

## Status

| Priority | Area | Coverage | How to validate | Last checked | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, marker replacement, S3 planning helpers, chunked hashing, retryable body helpers. | `cargo test --manifest-path rust/Cargo.toml` | 2026-04-25 | Pass |
| P0 | TypeScript tests | CDK synthesis, custom resource properties, unsupported prop validation, provider singleton behavior. | `pnpm test` | 2026-04-25 | Pass |
| P0 | Build and lint | Distributable construct build, type checking, repository lint rules. | `pnpm build`, `pnpm typecheck`, `pnpm lint` | 2026-04-25 | Pass |
| P0 | Example synthesis | All example stacks synthesize from the public runner. | `pnpm example synth <example>` for every example in [examples.md](./examples.md) | 2026-04-25 | Pass |
| P0 | Simple AWS deployment | Create, update, unchanged-object skip, and destroy for a plain static site. | Deploy, update, inspect, and destroy `simple` | 2026-04-25 | Pass |
| P0 | Metadata and filters AWS deployment | Include/exclude filters, S3 metadata mapping, SSE-S3 metadata, prune, and ETag skip behavior. | Deploy, inspect, and destroy `metadata-filters` | 2026-04-25 | Pass |
| P1 | Replacement AWS deployment | Deploy-time marker replacement, JSON/YAML/data sources, and MD5-after-replacement comparison. | Deploy, inspect, and destroy `replacement` | 2026-04-25 | Fix added; needs clean rerun |
| P1 | Prune AWS update | Removed source files are deleted from the destination when `prune=true`; unchanged objects are preserved. | Deploy `prune-update-v1`, deploy `prune-update-v2`, inspect, destroy | 2026-04-25 | Pass |
| P1 | Retain-on-delete AWS update/delete | Prior destination data survives update/delete when `retainOnDelete=true`. | Deploy `retain-on-delete-v1`, deploy `retain-on-delete-v2`, destroy, inspect | 2026-04-25 | Pass |
| P2 | CloudFront invalidation, sync | Invalidation is created and the stack waits for completion. | Deploy/update/destroy `cloudfront-sync` | 2026-04-25 | Pass |
| P2 | CloudFront invalidation, async | Invalidation is created without blocking stack completion. | Deploy/update/destroy `cloudfront-async` | 2026-04-25 | Pass |

## Notes

- AWS validation should use disposable stacks and buckets. Clean up retained objects manually when testing `retainOnDelete=true`.
- Run example synth/deploy commands sequentially, or use separate CDK output directories, to avoid `cdk.out` lock contention.
- If a validation failure leads to a code fix, update the matrix with either `Pass` after rerunning or `Fix added; needs clean rerun` until the scenario is validated again.

## Backlog

These gaps should be promoted into the matrix as they get implemented and run.

### AWS Validation

| Priority | Gap | Why it matters |
| --- | --- | --- |
| P0 | Clean rerun for `replacement` | Confirms the nested marker-config fix works in a fresh stack lifecycle. |
| P1 | `extract=false` deploy/update/destroy | Exercises the `HeadObject` and `CopyObject` path separately from zip extraction. |
| P1 | Marker source unchanged redeploy | Confirms marker-expanded final bytes can be compared and skipped when unchanged. |
| P1 | `retainOnDelete=false` delete/update cleanup | Validates destination-prefix cleanup and ownership-tag behavior. |
| P1 | Multi-source overwrite order | Confirms duplicate relative keys across sources resolve to the expected final object. |
| P2 | Larger archive deploy | Exercises `/tmp` archive handling and streaming uploads beyond tiny fixtures. |
| P2 | Metadata-only update limitation | Documents and validates the known limitation where matching bytes can skip metadata-only changes. |

### Local Tests

| Priority | Gap | Why it matters |
| --- | --- | --- |
| P1 | Archive planning unit tests | Cover directory skipping, include/exclude filters, duplicate keys, and path traversal rejection without AWS. |
| P1 | Retryable zip-entry body tests | Prove the upload body reopens the archive and reports an exact size hint. |
| P2 | Temp archive cleanup tests | Catch leaked `/tmp` archive files on download or write failures. |
| P2 | Destination prune planning tests | Cover prefix stripping, excluded keys, empty relative keys, and delete-list decisions without AWS. |
