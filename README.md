# CargoBucketDeployment

Local prototype of a Rust-backed `BucketDeployment` alternative.

This package is standalone. It uses published `aws-cdk-lib` packages plus
[`cargo-lambda-cdk`](https://github.com/cargo-lambda/cargo-lambda-cdk) for the
provider Lambda, and keeps the analysis and provenance notes under
[.codex/reference](./.codex/reference).

Current scope:

- custom construct: `CargoBucketDeployment`
- provider runtime: Rust on Lambda `provided.al2023` via `RustFunction`
- deployment engine: pragmatic V1
  - `extract=false` uses direct `CopyObject`
  - `extract=true` downloads the source zip, plans a manifest from the archive,
    and uploads entries without materializing a full extracted tree
  - entries that need deploy-time marker replacement are rewritten in-memory
  - entries without substitutions are staged one at a time, not as a whole tree

Notable limitations in this prototype:

- it is not packaged as a publishable construct library yet
- it assumes `cargo lambda` is available locally at synth time
- it is not integrated into `aws-cdk-lib`'s custom-resource handler generation
- it does not support `useEfs`
- it rejects `expires`
- it rejects `signContent`
- it rejects `serverSideEncryptionCustomerAlgorithm`
- AWS runtime validation is still partial and tracked in the validation table below

Tooling:

- package manager: `pnpm`
- TypeScript tests: `vitest`
- formatter/lint runner: `biome`
- local CDK CLI: `aws-cdk`

Useful commands:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm rust:check`
- `pnpm example:synth`
- `pnpm example:deploy`
- `pnpm example:destroy`
- `pnpm example:replacements:synth`
- `pnpm example:replacements:deploy`
- `pnpm example:replacements:destroy`
- `pnpm example:cloudfront:synth`
- `pnpm example:cloudfront:deploy`
- `pnpm example:cloudfront:destroy`
- `pnpm example:cloudfront:async:synth`
- `pnpm example:cloudfront:async:deploy`
- `pnpm example:cloudfront:async:destroy`
- `pnpm example:controls:synth`
- `pnpm example:controls:deploy`
- `pnpm example:controls:destroy`
- `pnpm example:prune:v1:synth`
- `pnpm example:prune:v1:deploy`
- `pnpm example:prune:v2:synth`
- `pnpm example:prune:v2:deploy`
- `pnpm example:prune:destroy`

Example apps:

I kept the current filenames stable so the `pnpm` commands and any in-flight deployments do not change underneath us.

| Stack | File | Deploy command | Purpose |
| --- | --- | --- | --- |
| Simple asset deploy | [examples/simple-app.ts](./examples/simple-app.ts) | `pnpm example:deploy` | Plain asset deployment under `site/` with object key outputs. |
| Replacement matrix | [examples/replacement-matrix-app.ts](./examples/replacement-matrix-app.ts) | `pnpm example:replacements:deploy` | End-to-end marker replacement coverage for `Source.data(...)`, `Source.data(..., { jsonEscape: true })`, `Source.yamlData(...)`, `Source.jsonData(..., { escape: false })`, `Source.jsonData(..., { escape: true })`, and mixed-source deployments. |
| CloudFront invalidation (sync) | [examples/cloudfront-invalidation-app.ts](./examples/cloudfront-invalidation-app.ts) | `pnpm example:cloudfront:deploy` | Cache-probe deployment with `waitForDistributionInvalidation: true` to prove the stack blocks until CloudFront invalidation completes. |
| CloudFront invalidation (async) | [examples/cloudfront-invalidation-async-app.ts](./examples/cloudfront-invalidation-async-app.ts) | `pnpm example:cloudfront:async:deploy` | Same cache-probe deployment, but with `waitForDistributionInvalidation: false` so the stack returns before CloudFront finishes invalidating. |
| Metadata and filters | [examples/controls-matrix-app.ts](./examples/controls-matrix-app.ts) | `pnpm example:controls:deploy` | Manual validation target for `include` / `exclude`, user metadata, cache-control, SSE, storage class, and `head-object` inspection. |
| Prune cycle v1 | [examples/prune-cycle-v1-app.ts](./examples/prune-cycle-v1-app.ts) | `pnpm example:prune:v1:deploy` | Baseline deploy that creates both `runtime/current.txt` and `runtime/legacy.txt`. |
| Prune cycle v2 | [examples/prune-cycle-v2-app.ts](./examples/prune-cycle-v2-app.ts) | `pnpm example:prune:v2:deploy` | Update over the same stack to confirm `prune=true` removes `runtime/legacy.txt`. |

Example validation targets:

| Stack | Main things to verify |
| --- | --- |
| Simple asset deploy | Bucket contents and returned object keys. |
| Replacement matrix | Plain token replacement, JSON escaping, YAML replacement, and negative-control `raw` outputs. |
| CloudFront invalidation (sync) | S3 content updates, CloudFront invalidation creation, CloudFormation waiting behavior, and fresh CDN content immediately after deploy completion. |
| CloudFront invalidation (async) | S3 content updates, invalidation creation, faster stack completion, and eventual CDN freshness after deploy completion. |
| Metadata and filters | Included files only, excluded files absent, metadata normalized and applied to uploaded objects. |
| Prune cycle | Old objects removed on update when no longer present in the source set. |

Validation status so far:

| Capability | Status | Evidence | Notes |
| --- | --- | --- | --- |
| TypeScript synth/build path | Done | `pnpm typecheck`, `pnpm build` | Current examples and scripts compile. |
| Biome formatting/lint | Done | `pnpm lint` | Clean after adding the manual-validation stacks. |
| Replacement matrix manual validation | Done | Manual S3 fetches on March 30, 2026 | `escaped` variants produced valid JSON, `raw` variants intentionally remained invalid JSON, `plain.txt` matched expectations. |
| CloudFront invalidation with synchronous wait | Done | Manual deploy/update on April 10, 2026 | Redeploy from `CacheProbeToken=v1` to `v2` updated S3, produced a new CloudFront invalidation, and served `v2` immediately from CloudFront after the stack completed. |
| CloudFront invalidation with asynchronous wait | Done | Manual deploy/update on April 10, 2026 | Redeploy from `CacheProbeToken=v1` to `v2` updated S3, created a new invalidation, and returned in about 23s without waiting for CloudFront completion. By the first post-deploy probe, CloudFront was already serving `v2`. |
| Include / exclude filters | Done | Manual deploy and S3 inspection on April 10, 2026 | `filtered-site/index.html` and `filtered-site/runtime/probe.txt` were present, while `filtered-site/app.js` returned `404 Not Found`. |
| Metadata mapping | Done | Manual deploy and `head-object` inspection on April 10, 2026 | `metadata-site/runtime/headers.json` showed the expected cache-control, disposition, language, SSE, storage class, and lowercased user metadata keys. |
| Prune on update | Done | Manual v1 deploy followed by v2 update on April 10, 2026 | `runtime/legacy.txt` existed after v1, then returned `404 Not Found` after the v2 deploy while `runtime/current.txt` updated to `version=v2`. |
| `retainOnDelete` update/delete semantics | Pending | Not yet exercised in AWS | No dedicated manual stack yet. |
| Validation/error branches (`distributionPaths`, unsupported props, `extract=false` with markers) | Partial | Covered in code paths, not in an explicit manual stack | Better suited to targeted unit/synth tests than AWS deployment. |


The Rust provider lives under [rust](./rust), the construct code under [src](./src),
and provenance notes under [.codex/reference](./.codex/reference).
