# Current State

This folder is intentionally small. Project-facing documentation lives in:

- `README.md`
- `docs/architecture.md`
- `docs/validation.md`
- `docs/benchmarking.md`

## Implementation

`RustBucketDeployment` is a local prototype of a Rust-backed alternative to CDK's `BucketDeployment`.

The current provider is a custom AWS SDK-based deployment engine, not `s3sync` and not the AWS CLI. The handler plans objects from CDK source archives, reads extracted ZIP sources with ranged S3 `GetObject`, avoids full archive staging in Lambda `/tmp`, lists the destination prefix once, skips unchanged objects when destination metadata is sufficient, uploads changed extracted objects with `PutObject`, copies `extract=false` sources with `CopyObject`, prunes destination keys when requested, and handles optional CloudFront invalidations.

The provider Lambda defaults to 1024 MiB memory. Marker-free ZIP entry streaming uses `s3-unspool`-matched defaults: 64 KiB entry read buffers, 256 KiB S3 body chunks, and a 1 MiB body pipe. The unchanged-object optimization is intentionally narrow: existing ZIP entries are read through ranged source blocks, hashed with MD5, and compared with destination `ETag` values. Metadata-only changes, multipart objects, SSE-KMS/SSE-C ETag semantics, and arbitrary sync backends are outside that optimization.

The public runtime tuning surface is intentionally small: use `memoryLimit` and, when needed, `maxParallelTransfers`. Source block/window and `PutObject` retry internals are grouped under `advancedRuntimeTuning` as escape hatches.

## Current Focus

The repository docs have been consolidated into fewer source-of-truth files. The next engineering focus is benchmark and validation depth:

- automate full benchmark runs across deterministic asset profiles
- collect CloudFormation, Lambda, S3, and destination-state evidence
- rerun AWS validations against each deterministic asset profile
- investigate cataloged asset packaging for metadata-only sparse-update skips

## Validation Notes

Durable validation status and runbooks are in `docs/validation.md`. Benchmark strategy and latest benchmark context are in `docs/benchmarking.md`; append-only sanitized benchmark records are in `docs/benchmark-history.jsonl`.

Do not store raw AWS logs, profile names, account IDs, resource IDs, ETags, bucket names, distribution IDs, or incident-specific stack names in this folder.
