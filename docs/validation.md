# Validation Matrix

Last updated: 2026-04-25

This file tracks the durable validation status for `RustBucketDeployment`. It should stay high signal: what is covered, how to rerun it, when it was last checked, and whether the result is trusted.

Do not commit raw AWS run logs, local profile names, account IDs, resource IDs, object ETags, CloudFront distribution IDs, or stack-specific incident details here. Keep those in private notes or issue threads when they are useful for debugging.

## Status

| Priority | Area | Coverage | How to validate | Last checked | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, marker replacement, archive planning, destination prune planning, temp archive cleanup, chunked hashing, retryable body helpers. | `cargo test --manifest-path rust/Cargo.toml` | 2026-04-25 | Pass |
| P0 | TypeScript tests | CDK synthesis, custom resource properties, unsupported prop validation, provider singleton behavior. | `pnpm test` | 2026-04-25 | Pass |
| P0 | Build and lint | Distributable construct build, type checking, repository lint rules. | `pnpm build`, `pnpm typecheck`, `pnpm lint` | 2026-04-25 | Pass |
| P0 | Example synthesis | All example stacks synthesize from the public runner. | `pnpm example synth <example>` for every example in [examples.md](./examples.md) | 2026-04-25 | Pass |
| P0 | Simple AWS deployment | Create, update, unchanged-object skip, and destroy for a plain static site. | Deploy, update, inspect, and destroy `simple` | 2026-04-25 | Pass |
| P0 | Metadata and filters AWS deployment | Include/exclude filters, S3 metadata mapping, SSE-S3 metadata, prune, and ETag skip behavior. | Deploy, inspect, and destroy `metadata-filters` | 2026-04-25 | Pass |
| P1 | Replacement AWS deployment | Deploy-time marker replacement, JSON/YAML/data sources, MD5-after-replacement comparison, and unchanged marker redeploy skip. | Deploy, inspect, redeploy unchanged, inspect, and destroy `replacement` | 2026-04-25 | Pass |
| P1 | Prune AWS update | Removed source files are deleted from the destination when `prune=true`; unchanged objects are preserved. | Deploy `prune-update-v1`, deploy `prune-update-v2`, inspect, destroy | 2026-04-25 | Pass |
| P1 | Retain-on-delete AWS update/delete | Prior destination data survives update/delete when `retainOnDelete=true`. | Deploy `retain-on-delete-v1`, deploy `retain-on-delete-v2`, destroy, inspect | 2026-04-25 | Pass |
| P1 | `extract=false` AWS deployment | Non-extracted source archive is copied through `HeadObject`/`CopyObject`, unchanged redeploy is skipped, and destroy succeeds. | Deploy inline validation stack with `extract=false`, redeploy unchanged, inspect, destroy | 2026-04-25 | Pass |
| P1 | `retainOnDelete=false` AWS update/delete | Old prefix is deleted on destination-prefix update; deployed objects are deleted when the deployment construct is removed while the bucket remains. | Deploy inline validation stacks for prefix update and deployment removal, inspect retained bucket, clean up bucket | 2026-04-25 | Pass |
| P1 | Multi-source overwrite order | Duplicate relative keys across sources resolve to the later source in the source list. | Deploy inline validation stack with duplicate `Source.data` keys, inspect object body, destroy | 2026-04-25 | Pass |
| P2 | Larger archive AWS deployment | Random binary asset larger than tiny fixtures deploys through `/tmp` archive download and streamed zip-entry upload. | Deploy inline validation stack with a larger temporary asset, inspect object size, destroy | 2026-04-25 | Pass |
| P2 | Metadata-only update limitation | Same object bytes with changed user metadata are skipped because the ETag comparison does not include metadata. | Deploy inline validation stack with metadata v1, redeploy same bytes with metadata v2, inspect unchanged metadata, destroy | 2026-04-25 | Known limitation observed |
| P2 | CloudFront invalidation, sync | Invalidation is created and the stack waits for completion. | Deploy/update/destroy `cloudfront-sync` | 2026-04-25 | Pass |
| P2 | CloudFront invalidation, async | Invalidation is created without blocking stack completion. | Deploy/update/destroy `cloudfront-async` | 2026-04-25 | Pass |

## Notes

- AWS validation should use disposable stacks and buckets. Clean up retained objects manually when testing `retainOnDelete=true`.
- Run example synth/deploy commands sequentially, or use separate CDK output directories, to avoid `cdk.out` lock contention.
- If a validation failure leads to a code fix, update the matrix with either `Pass` after rerunning or `Fix added; needs clean rerun` until the scenario is validated again.
- For `retainOnDelete=false`, deleting the deployment and bucket together follows the upstream CDK ownership-tag lifecycle: the deployment does not clear objects while another ownership tag is still present. Validate delete cleanup by removing the deployment construct while keeping the bucket in the stack.

## Backlog

No validation gaps are currently tracked here. Add new gaps as they are identified, then promote them into the matrix when covered.
