# Current State

This folder is intentionally kept small. Project-facing documentation lives in:

- `README.md`
- `docs/lambda-workflow.md`
- `docs/validation.md`
- `docs/examples.md`

## Implementation

`RustBucketDeployment` is a local prototype of a Rust-backed alternative to CDK's
`BucketDeployment`.

The current runtime is a custom AWS SDK-based deployment engine, not `s3sync` and not
the AWS CLI. The handler:

- plans objects directly from source archives,
- lists the destination prefix with `ListObjectsV2`,
- compares planned content against destination `ETag` values,
- skips unchanged single-part static assets,
- uploads changed objects with up to 8 parallel transfers,
- computes MD5 for zip entries in 8 MiB chunks,
- avoids extracting the full archive to disk,
- uses in-memory replacement bytes for entries with deploy-time markers,
- prunes destination keys when `prune=true`,
- handles CloudFront invalidations in sync or async mode.

The provider Lambda defaults to 256 MiB memory. The ETag optimization is intentionally
narrow: it assumes simple static website assets where S3 `ETag` is the MD5 of the
object bytes. Metadata-only changes, multipart uploads/copies, SSE-KMS/SSE-C ETag
semantics, and arbitrary sync backends are outside that optimization.

## Important AWS validation notes

AWS validation with profile `gary-test` on 2026-04-25 covered:

- simple deploy/update/destroy,
- unchanged-object skip behavior,
- metadata and include/exclude filters,
- prune update behavior,
- retain-on-delete update/delete behavior,
- CloudFront invalidation with and without waiting.

The replacement behavior AWS run found a real parser bug: nested
`markerConfig.jsonEscape` can arrive from CloudFormation as string `"true"`. The
Rust parser now accepts bool-like strings for that nested field and has a regression
test.

The failed replacement test stack was left in AWS as
`RustBucketDeploymentReplacementBehaviorDemo` in `DELETE_IN_PROGRESS` after force
delete was requested. Check `docs/validation.md` before rerunning replacement AWS
validation.

## Removed stale references

The old analysis and roadmap files in this folder predated the implemented runtime
and were removed to avoid preserving outdated assumptions, especially around a
manifest cache, `s3sync`, temp staging, and unvalidated manual status.
