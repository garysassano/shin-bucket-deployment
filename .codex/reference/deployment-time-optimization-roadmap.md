# Deployment Time Optimization Roadmap

This note tracks implementation and architecture options for making `RustBucketDeployment`
deploy faster. It focuses on the mainline construct behavior, not the experimental
`feature/rust-sdk-sync` branch.

## Highest Impact Implementation Improvements

### 1. Avoid Full Re-Upload On Small Updates

Current behavior plans the archive and uploads every included object on each create or update.
For example, if one file changes in a 5,000-file site, the handler still prepares and uploads the
full planned object set.

Relevant code:

- `rust/src/s3/mod.rs`: top-level deployment flow in `deploy`
- `rust/src/s3/mod.rs`: zip entry uploads through `upload_zip_entries`
- `rust/src/s3/mod.rs`: direct object copies through `execute_copy_plans`

Implementation:

- Write a deployment manifest to S3, for example
  `.rust-bucket-deployment/manifest.json`.
- Include each deployed key, size, checksum or CRC, metadata hash, marker hash, and source asset key.
- On update, compare the old manifest with the new manifest and upload or copy only changed keys.
- Use the same manifest to identify managed keys for cheaper pruning.
- Treat the manifest as an optimization cache. If it is missing, corrupt, has the wrong identity,
  or fails checksum validation, fall back to full transfer behavior and avoid managed deletes.

This is likely the highest-impact code change.

### 2. Make Prune Cheaper

Current `prune=true` behavior lists the whole destination prefix on every deployment. That preserves
CDK-compatible semantics, but it becomes expensive for large prefixes.

Implementation:

- Keep `prune: true` as the current full-prefix compatibility mode.
- Add `pruneMode: "managed"`.
- In managed mode, delete only objects recorded in the previous deployment manifest and absent from
  the new manifest.

Tradeoff:

- Full-prefix prune removes unmanaged destination objects.
- Managed prune is much faster and safer for shared prefixes, but it intentionally leaves unmanaged
  destination objects alone.

### 3. Expose Transfer Parallelism

Transfers are currently capped by a fixed `MAX_PARALLEL_TRANSFERS = 8`. That is conservative.
Amazon S3 supports high request rates per partitioned prefix, and parallelization is the normal
scaling path.

Potential API:

```ts
maxParallelTransfers?: number; // default 8 or memory-derived
```

Benchmark candidates:

- 8
- 16
- 32
- 64

Implementation notes:

- Add retry and backoff handling for `503 Slow Down`.
- Be careful with SSE-KMS because KMS request quotas can become the actual bottleneck.
- Consider deriving a safe default from Lambda memory size.

AWS reference:

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html

### 4. Tune Lambda Memory Intentionally

`memoryLimit` is already passed through to the handler Lambda. For this workload, Lambda memory is
also CPU and network tuning.

Benchmark candidates:

- 512 MB
- 1,024 MB
- 1,769 MB
- 3,008 MB
- 4,096 MB

For zip-heavy deployments, 1,769 MB is an important test point because AWS documents that as roughly
one vCPU. Higher memory can improve CPU-bound, memory-bound, and network-bound functions.

AWS reference:

- https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html

### 5. Use Multipart Upload And Multipart Copy For Large Objects

Extracted zip entries currently use single `PutObject` calls. Direct source object deployments use
single `CopyObject` calls.

Potential improvements:

- Add multipart upload for large generated or extracted objects.
- Add multipart copy for large `extract=false` source objects.
- Use a configurable threshold, with 100 MB as the initial default candidate.
- Multipart copy also avoids the single `CopyObject` 5 GB limit.

AWS reference:

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html

### 6. Prebuild Handler Artifacts

The construct currently creates a `RustFunction` from the Rust manifest. That is useful while
iterating on the handler, but compiling Rust during CDK asset bundling can be a major synth/deploy
cost for consumers.

Potential published-package design:

- Ship prebuilt `bootstrap` zips per architecture.
- Use `lambda.Code.fromAsset(...)` for normal consumers.
- Keep `rustProjectPath` and `bundling` as development escape hatches.

## AWS-Level Strategies

### Immutable Release Layout

For static websites and frontend assets, deploy immutable assets under release or content-hash
paths and update only small entry documents in stable locations.

Example layout:

```text
releases/<asset-hash>/assets/app.<hash>.js
releases/<asset-hash>/assets/styles.<hash>.css
current/index.html
current/asset-manifest.json
```

Benefits:

- Fewer overwritten objects.
- Easier rollback by pointing entry documents at a prior release.
- Lifecycle rules can clean up old releases asynchronously.

### S3 Batch Operations For Non-Zip Sources

If the source is already individual S3 objects rather than a CDK zip asset, S3 Batch Operations can
copy, update metadata, and delete at very large scale.

This is probably not the right path for the normal CDK zip-asset model unless the packaging model
changes.

AWS reference:

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops-copy-object.html

## Recommended Priority

1. Add timing metrics around download, plan, upload, prune, and delete.
2. Add manifest-based diff uploads and managed prune.
3. Add configurable transfer concurrency.
4. Benchmark and document recommended Lambda memory settings.
5. Add multipart upload and multipart copy thresholds.
6. Ship prebuilt handler artifacts for normal construct users.


The highest-impact code change is the manifest/diff system.

## Decision: Do Not Use `s3sync` As A Library

The `s3sync` maintainer declined a virtual source API because the crate is intentionally a thin
library surface over the CLI. This handler should keep its custom AWS SDK-based sync path and build
the manifest/diff optimization locally.
