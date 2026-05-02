# Validation

This document tracks validation coverage and the deployment test plan. It is intentionally high signal: what is covered, how to rerun it, what evidence to collect, and which gaps remain.

Do not commit raw AWS logs, account IDs, bucket names, CloudFront distribution IDs, stack-specific IDs, profile names, object ETags, or incident-specific notes. Put raw run output in local scratch files or external issue threads.

## Local Gates

Run these before AWS validation or benchmark comparisons:

```bash
pnpm rust:fmt
pnpm rust:check
cargo test --manifest-path rust/Cargo.toml
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Example synthesis should also pass for every public runner example:

```bash
pnpm example list
pnpm example synth simple
pnpm example synth replacement
pnpm example synth metadata-filters
pnpm example synth prune-update-v1
pnpm example synth prune-update-v2
pnpm example synth retain-on-delete-v1
pnpm example synth retain-on-delete-v2
pnpm example synth cloudfront-sync
pnpm example synth cloudfront-async
pnpm example synth benchmark-assets
```

Run synth commands sequentially, or use separate CDK output directories, to avoid `cdk.out` lock contention.

## Current Coverage

| Priority | Area | Coverage | Command or scenario | Last checked | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation parsing, marker replacement, archive planning, destination prune planning, chunked hashing, MD5/ETag helpers, retryable body helpers, `PutObject` retry policy helpers. | `cargo test --manifest-path rust/Cargo.toml` | 2026-05-02 | Pass, 30 tests |
| P0 | S3 algorithm integration | Ignored Rust test generates ZIP archives, uploads them to a temporary S3 source bucket, runs `deploy()` locally against S3 clients, validates extracted destination objects, marker replacement, prune, unchanged redeploy, cleanup, and the `s3-unspool`-matched 64 KiB read / 256 KiB body chunk path. | `AWS_PROFILE=<profile> AWS_REGION=<region> RBD_AWS_INTEGRATION_FILE_COUNT=2500 cargo test --manifest-path rust/Cargo.toml s3::aws_integration_tests::deploys_generated_zip_archives_from_s3_to_s3 -- --ignored --nocapture` | 2026-05-02 | Pass; local max RSS about 101 MiB with 2,500 generated files and final 64 KiB read / 256 KiB body chunk / 1 MiB pipe settings |
| P0 | TypeScript tests | CDK synthesis, custom resource properties, unsupported prop validation, provider singleton behavior. | `pnpm test` | 2026-05-02 | Pass, 22 tests |
| P0 | Build and lint | Distributable construct build, type checking, repository lint rules, strict Clippy. | `pnpm build`, `pnpm typecheck`, `pnpm lint`, `cargo clippy --manifest-path rust/Cargo.toml --all-targets -- -D warnings` | 2026-05-02 | Pass |
| P0 | Example synthesis | All example stacks synthesize from the public runner. | `pnpm example synth <example>` for each example above | 2026-05-02 | Pass |
| P0 | Simple AWS deployment | Create, unchanged redeploy skip, update, and destroy for a plain static site. | `simple` | 2026-04-25 | Pass |
| P0 | Metadata and filters AWS deployment | Include/exclude filters, S3 metadata mapping, SSE-S3 metadata, prune, and ETag skip behavior. | `metadata-filters` | 2026-04-25 | Pass |
| P1 | Replacement AWS deployment | Deploy-time marker replacement, JSON/YAML/data sources, MD5-after-replacement comparison, and unchanged marker redeploy skip. | `replacement` | 2026-04-25 | Pass |
| P1 | Prune AWS update | Removed source files are deleted from destination when `prune=true`; unchanged objects are preserved. | Deploy `prune-update-v1`, deploy `prune-update-v2`, inspect, destroy | 2026-04-25 | Pass |
| P1 | Retain-on-delete AWS update/delete | Prior destination data survives update/delete when `retainOnDelete=true`. | Deploy `retain-on-delete-v1`, deploy `retain-on-delete-v2`, destroy, inspect | 2026-04-25 | Pass |
| P1 | `extract=false` AWS deployment | Non-extracted source archive is copied through `HeadObject`/`CopyObject`, unchanged redeploy is skipped, and destroy succeeds. | Inline validation stack | 2026-04-25 | Pass |
| P1 | `retainOnDelete=false` AWS update/delete | Old prefix is deleted on prefix update; deployed objects are deleted when the deployment construct is removed while the bucket remains. | Inline validation stacks | 2026-04-25 | Pass |
| P1 | Multi-source overwrite order | Duplicate relative keys across sources resolve to the later source in the source list. | Inline validation stack with duplicate `Source.data` keys | 2026-04-25 | Pass |
| P2 | Larger archive AWS deployment | Random binary asset larger than tiny fixtures deploys through ranged archive reads and streamed zip-entry upload. | Inline validation stack with larger temporary asset | 2026-04-25 | Pass |
| P2 | Metadata-only update limitation | Same object bytes with changed user metadata are skipped because comparison does not include metadata. | Inline metadata v1/v2 stack | 2026-04-25 | Known limitation observed |
| P2 | CloudFront invalidation, sync | Invalidation is created and stack waits for completion. | `cloudfront-sync` | 2026-04-25 | Pass |
| P2 | CloudFront invalidation, async | Invalidation is created without blocking stack completion. | `cloudfront-async` | 2026-04-25 | Pass |
| P1 | Ranged ZIP extraction AWS rerun | Confirms the current no-disk ranged extraction path after the engine transition at 256, 512, and 1024 MiB provider memory. | `benchmark-assets` `mixed` profile: `v1` create, `v2` sparse update, `pruned` update, destroy | 2026-05-02 | Pass; highest reported Lambda max memory was 76 MB |
| P1 | ETag skip path AWS rerun | Confirms marker-free unchanged files are read through ranged ZIP entry streams, hashed with MD5, and skipped through destination `ETag` comparison without checksum `HeadObject` calls. | `benchmark-assets` forced unchanged `v1` update via `RBD_BENCH_WAIT=false`; see `docs/benchmarking.md` | 2026-05-02 | Pass at 256, 512, and 1024 MiB; provider Lambda invoked successfully |
| P1 | Changed-object overwrite AWS rerun | Confirms changed extracted files overwrite destination keys with plain `PutObject` under the CloudFormation custom-resource lifecycle. | `benchmark-assets` `v1` -> `v2` sparse update at 256, 512, and 1024 MiB | 2026-05-02 | Pass |

## AWS Deployment Runbook

Use disposable stacks and buckets. Prefer a dedicated AWS account or sandbox environment. Destroy stacks after each validation group unless the scenario requires retained data inspection.

Baseline create/update/destroy:

```bash
pnpm example deploy simple
pnpm example deploy simple
pnpm example destroy simple
```

Feature coverage:

```bash
pnpm example deploy metadata-filters
pnpm example deploy metadata-filters
pnpm example destroy metadata-filters

pnpm example deploy replacement
pnpm example deploy replacement
pnpm example destroy replacement

pnpm example deploy prune-update-v1
pnpm example deploy prune-update-v2
pnpm example destroy prune-update

pnpm example deploy retain-on-delete-v1
pnpm example deploy retain-on-delete-v2
pnpm example destroy retain-on-delete
```

CloudFront coverage:

```bash
pnpm example deploy cloudfront-sync
pnpm example deploy cloudfront-sync -- --parameters RustBucketDeploymentCloudFrontInvalidationSyncDemo:CacheProbeToken=v2
pnpm example destroy cloudfront-sync

pnpm example deploy cloudfront-async
pnpm example deploy cloudfront-async -- --parameters RustBucketDeploymentCloudFrontInvalidationAsyncDemo:CacheProbeToken=v2
pnpm example destroy cloudfront-async
```

Benchmark-backed deployment validation:

```bash
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=Validation pnpm example deploy benchmark-assets
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=Validation RBD_BENCH_WAIT=false pnpm example deploy benchmark-assets
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v2 RBD_BENCH_STACK_SUFFIX=Validation pnpm example deploy benchmark-assets
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=pruned RBD_BENCH_STACK_SUFFIX=Validation pnpm example deploy benchmark-assets
RBD_BENCH_STACK_SUFFIX=Validation pnpm example destroy benchmark-assets
```

The second `v1` command toggles an inert property for the benchmark stack so CloudFormation invokes the provider against unchanged assets. Without that toggle, CDK reports no changes and the provider Lambda is not invoked.

## Evidence To Capture

For each AWS deployment validation run, record a short sanitized result row in this file or in a separate issue:

- branch and commit
- example or scenario name
- create/update/delete phase
- local wall time
- CloudFormation result
- provider Lambda duration, billed duration, and max memory
- provider log summary: planned objects, skipped objects, uploaded/copied objects, pruned objects, bytes read, bytes written, source range requests, destination requests
- post-deploy destination inspection result
- destroy/cleanup result

The provider log summary depends on instrumentation that still needs to be added. Until then, capture CloudWatch duration/memory and validate destination objects directly.

## Destination Inspection Checklist

Validate destination state with SDK/CLI commands or purpose-built scripts, but do not commit raw output.

- Expected keys exist under the destination prefix.
- Excluded keys do not exist.
- Pruned keys are removed when `prune=true`.
- Retained keys remain when `retainOnDelete=true`.
- Marker replacement output contains replaced values and escaped JSON values where expected.
- Metadata, content type, cache control, storage class, and SSE options match the stack configuration where applicable.
- Unchanged redeploy does not rewrite unchanged objects, using `LastModified`, version IDs, or provider summary counters as evidence.
- CloudFront invalidation exists and either reaches `Completed` or is intentionally async.

## Validation Notes

- For `retainOnDelete=false`, deleting the deployment and bucket together follows the upstream CDK ownership-tag lifecycle: the deployment does not clear objects while another ownership tag is still present. Validate delete cleanup by removing the deployment construct while keeping the bucket in the stack.
- Replacement validation previously exposed that nested `markerConfig.jsonEscape` can arrive from CloudFormation as string `"true"`. The parser now accepts bool-like strings for that nested field and has a regression test.
- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- On 2026-05-02, the `benchmark-assets` `mixed` profile completed create, sparse update, prune update, forced unchanged update, and destroy at 256, 512, and 1024 MiB. All stacks were destroyed after collection; sanitized timing and memory results are in `docs/benchmarking.md`.
