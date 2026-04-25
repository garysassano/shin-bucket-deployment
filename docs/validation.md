# Validation Plan and Log

Last updated: 2026-04-25

This file tracks validation for the `RustBucketDeployment` construct and provider Lambda. Use it as the source of truth for what was tested, when it was tested, and what still needs coverage.

## Priority List

| Priority | Test area | Why it matters | Validation method | Status |
| --- | --- | --- | --- | --- |
| P0 | Rust provider compile and unit tests | Catches runtime regressions in CloudFormation parsing, marker replacement, S3 planning helpers, and chunked hashing behavior. | `cargo test --manifest-path rust/Cargo.toml` | Pass on 2026-04-25 |
| P0 | TypeScript construct tests | Catches CDK synthesis regressions, custom resource properties, unsupported prop validation, and provider singleton behavior. | `pnpm test` | Pass on 2026-04-25 |
| P0 | TypeScript build and lint | Confirms distributable construct code and repository formatting/lint rules. | `pnpm build`, `pnpm typecheck`, `pnpm lint` | Pass on 2026-04-25 |
| P0 | Example synthesis | Confirms example stacks still synthesize after construct/runtime changes. | `pnpm example synth <example>` | Pass on 2026-04-25 |
| P0 | AWS simple deploy/update/destroy | Proves the custom resource can deploy, update, skip unchanged files, and clean up in a real AWS account. | `pnpm example deploy simple`, redeploy/update checks, `pnpm example destroy simple` | Pass on 2026-04-25 |
| P0 | AWS metadata and filters deploy/update/destroy | Covers include/exclude, metadata mapping, SSE-S3 metadata, prune, and ETag skip behavior in one stack. | `pnpm example deploy metadata-filters`, S3 `head-object` checks, destroy | Pass on 2026-04-25 |
| P1 | AWS replacement behavior | Proves deploy-time marker replacement, MD5-after-replacement comparison, JSON/YAML/data sources. | `pnpm example deploy replacement-behavior`, S3 object inspection, destroy | Pending |
| P1 | AWS prune update | Proves removed source files are deleted from destination when `prune=true`. | deploy `prune-update-v1`, deploy `prune-update-v2`, inspect S3, destroy | Pending |
| P1 | AWS retain-on-delete update/delete | Proves retained objects survive update/delete when `retainOnDelete=true`. | deploy `retain-on-delete-v1`, deploy `retain-on-delete-v2`, destroy, inspect S3 | Pending |
| P2 | AWS CloudFront invalidation sync | Proves invalidation is created and waited for. | deploy/update `cloudfront-sync`, inspect outputs/cache behavior, destroy | Pending |
| P2 | AWS CloudFront invalidation async | Proves invalidation is created without blocking stack completion. | deploy/update `cloudfront-async`, inspect outputs/cache behavior, destroy | Pending |

## Validation Log

| Date | Priority | Test | Command or evidence | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-04-25 | P0 | Rust provider compile and unit tests | `cargo test --manifest-path rust/Cargo.toml` | Pass | 18 Rust tests passed. |
| 2026-04-25 | P0 | TypeScript construct tests | `pnpm test` | Pass | 3 Vitest files, 19 tests passed. |
| 2026-04-25 | P0 | TypeScript build and lint | `pnpm build`, `pnpm typecheck`, `pnpm lint` | Pass | `pnpm typecheck` passed with the environment warning that current Node is v20.11.1 while `package.json` requests `>=24.0.0`. |
| 2026-04-25 | P0 | Example list | `pnpm example list` | Pass | Listed all configured examples. |
| 2026-04-25 | P0 | Example synthesis: simple | `pnpm example synth simple` | Pass | First attempt failed because Docker access was unavailable inside the sandbox. Retried with Docker access; synth passed and template showed provider Lambda `MemorySize: 256`. |
| 2026-04-25 | P0 | Example synthesis: remaining examples | `pnpm example synth metadata-filters`, `replacement`, `prune-update-v1`, `prune-update-v2`, `retain-on-delete-v1`, `retain-on-delete-v2`, `cloudfront-sync`, `cloudfront-async` | Pass | All passed when run sequentially. A parallel attempt hit CDK's `cdk.out` lock, so example synth/deploy should be run sequentially or with separate output directories. |
| 2026-04-25 | P0 | AWS simple deploy, first attempt | `AWS_PROFILE=gary-test pnpm example deploy simple` | Fail, fixed | Custom resource failed on `site/app.js`: S3 aws-chunked upload requires a known request body size. Fixed by carrying the zip entry size into the retryable streaming body and returning an exact `SizeHint`. |
| 2026-04-25 | P0 | AWS simple deploy after fix | `AWS_PROFILE=gary-test pnpm example deploy simple` | Pass | Stack created successfully. S3 contained `site/app.js` ETag `acac2891f40463e08c034c81928ec97b` and `site/index.html` ETag `fced9eb074ee157f5f6d2b1f48056312`. |
| 2026-04-25 | P0 | AWS simple unchanged-file skip check | Temporarily changed only `test/fixtures/my-website/index.html`, redeployed `simple`, then restored the fixture | Pass | `site/app.js` retained ETag `acac2891f40463e08c034c81928ec97b` and `LastModified` `2026-04-25T01:22:02+00:00`; `site/index.html` changed to ETag `eb370b24f310f0e462ccb788cdbfef9e` and `LastModified` `2026-04-25T01:23:12+00:00`. This validates unchanged zip entries are skipped while changed entries upload. |
| 2026-04-25 | P0 | AWS simple cleanup | `AWS_PROFILE=gary-test pnpm example destroy simple` | Pass | Stack destroyed successfully. |
| 2026-04-25 | P0 | AWS metadata and filters deploy | `AWS_PROFILE=gary-test pnpm example deploy metadata-filters` | Pass | Stack created successfully with both custom resources completed. |
| 2026-04-25 | P0 | AWS metadata and filters S3 inspection | `aws s3api list-objects-v2`, `aws s3api head-object` | Pass | `filtered-site/` contained `index.html` and `runtime/probe.txt`; `filtered-site/app.js` returned 404 as expected. `metadata-site/runtime/headers.json` had `ContentType=application/json`, `CacheControl=public, max-age=2592000`, user metadata `verificationflavor=metadata-matrix` and `releasechannel=manual-validation`, and `ServerSideEncryption=AES256`. |
| 2026-04-25 | P0 | AWS metadata and filters cleanup | `AWS_PROFILE=gary-test pnpm example destroy metadata-filters` | Pass | Stack destroyed successfully. |

## Historical Manual Validation

These entries were manually validated before this log existed. Re-run them when changing the runtime upload path, request parsing, pruning, replacement behavior, or CloudFront invalidation behavior.

| Capability | Last known validation | Evidence |
| --- | --- | --- |
| Replacement behavior | 2026-03-30 | Manual S3 verification. |
| CloudFront invalidation with wait | 2026-04-10 | Manual deploy/update. |
| CloudFront invalidation without wait | 2026-04-10 | Manual deploy/update. |
| Include / exclude filters | 2026-04-10 | Manual deploy and S3 inspection. |
| Metadata mapping | 2026-04-10 | Manual deploy and `head-object` inspection. |
| Prune on update | 2026-04-10 | Manual v1/v2 deploy cycle. |
| `retainOnDelete` update/delete semantics | 2026-04-10 to 2026-04-11 | Manual deploy/update/destroy cycle. |
