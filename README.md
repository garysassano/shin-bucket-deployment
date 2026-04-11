# CargoBucketDeployment

Rust-backed alternative to `aws-cdk-lib/aws-s3-deployment`'s [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html).

This repo is currently a local prototype, not a published construct library, but the construct and runtime paths are working and manually validated.

Examples are driven through a single runner:

```bash
pnpm example list
pnpm example synth simple
pnpm example deploy cloudfront-sync
pnpm example destroy retain-on-delete
```

## Why Use It

The table below is intentionally limited to differences that are actually true relative to the upstream Python `BucketDeployment` handler.

| Verified difference from `BucketDeployment` | What it means here |
| --- | --- |
| Rust provider runtime | The custom resource runs as a Rust Lambda on `provided.al2023` instead of the standard Python handler. |
| SDK-driven deploy path instead of AWS CLI shell-outs | The Rust runtime uses AWS SDK calls for copy, upload, delete, and invalidation instead of orchestrating `aws s3 cp` / `aws s3 sync` from the handler. |
| More efficient extracted deploy path | The upstream Python handler downloads each zip, extracts it to a working directory, rewrites files in place, and then syncs the extracted tree. This runtime plans directly from the archive and uploads entries one at a time without materializing the full extracted tree first. |

Things that are intentionally not listed as benefits because upstream `BucketDeployment` already supports them too:

- `distributionPaths` and `waitForDistributionInvalidation`
- marker replacement and JSON-escape behavior
- `prune`, `retainOnDelete`, and `outputObjectKeys`
- default wildcard invalidation for the destination prefix

## Status

Current scope:

- custom construct: `CargoBucketDeployment`
- provider runtime: Rust on Lambda `provided.al2023` via `RustFunction`
- direct `CopyObject` path when `extract=false`
- zip-planned deployment path when `extract=true`
- optional deploy-time marker replacement
- optional CloudFront invalidation

Current limitations:

- not packaged as a publishable construct library yet
- assumes `cargo lambda` is available locally at synth time
- not integrated into `aws-cdk-lib`'s handler generation
- does not support `useEfs`
- rejects `expires`
- rejects `signContent`
- rejects `serverSideEncryptionCustomerAlgorithm`

## `BucketDeployment` Parity

This tracks parity against the upstream [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) surface.

| Capability or prop from `BucketDeployment` | CargoBucketDeployment | Notes |
| --- | --- | --- |
| Basic asset deployment | ✅ | Supported. |
| `destinationKeyPrefix` | ✅ | Supported. |
| `prune` | ✅ | Supported and manually validated. |
| `retainOnDelete` | ✅ | Supported and manually validated. |
| `distribution` | ✅ | Supported. |
| `distributionPaths` | ✅ | Supported and validated. |
| `waitForDistributionInvalidation` | ✅ | Supported in both sync and async modes. |
| `exclude` / `include` | ✅ | Supported and manually validated. |
| User metadata (`metadata`) | ✅ | Supported and manually validated. |
| Common system metadata (`cacheControl`, `contentType`, `contentDisposition`, `contentLanguage`, `contentEncoding`, SSE, storage class, redirect, ACL) | ✅ | Supported. |
| `outputObjectKeys` | ✅ | Supported and covered by tests. |
| `deployedBucket` | ✅ | Supported and covered by tests. |
| `addSource()` | ✅ | Supported. |
| Deploy-time replacement for `Source.data`, `Source.jsonData`, `Source.yamlData` | ✅ | Supported and validated. |
| `vpc`, `vpcSubnets`, `securityGroups`, `role`, `memoryLimit`, `ephemeralStorageSize`, `logRetention`, `logGroup` | ✅ | Wired through to the Rust provider function. |
| `useEfs` | ❌ | Not supported yet. |
| `expires` | ❌ | Not supported yet. |
| `signContent` | ❌ | Not supported yet. |
| `serverSideEncryptionCustomerAlgorithm` | ❌ | Not supported yet. |

## Execution Model Comparison

| Concern | `BucketDeployment` today | `CargoBucketDeployment` today | Next step |
| --- | --- | --- | --- |
| Provider runtime | Python singleton Lambda | Shared Rust Lambda per compatible configuration within a stack | Already implemented. |
| S3 transfer engine | AWS CLI `s3 cp` / `s3 sync` from the handler | AWS SDK copy/upload/delete calls with bounded transfer concurrency | Tune concurrency and large-transfer behavior further if needed. |
| Extracted deploy path | Download zip, extract full tree to a working directory, rewrite files in place, then sync the tree | Plan directly from the zip archive, open each archive once, and upload entries individually | Already in a good place. |
| Working storage | `/tmp` by default, optional EFS support | `/tmp` only | Add EFS parity if large-workdir support becomes necessary. |
| CloudFront invalidation | One batched invalidation request for all paths | One batched invalidation request for all paths | Already in a good place. |
| Prune/delete path | AWS CLI sync/delete behavior | SDK list + batched delete with namespace-safe prefixes, page-by-page cleanup, and per-object delete error checks | Already in a good place. |

## Quick Start

```ts
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CargoBucketDeployment, Source } from "./src";

export class DemoStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "WebsiteBucket");
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      },
    });

    new CargoBucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("site")],
      destinationBucket: bucket,
      destinationKeyPrefix: "site",
      distribution,
      prune: true,
      waitForDistributionInvalidation: true,
    });
  }
}
```

## Key Behavior

### CloudFront invalidation

- If you provide `distribution`, the runtime can create a CloudFront invalidation after upload.
- If you do not provide `distributionPaths`, the default invalidation path is the destination prefix plus `*`.
- Example: deploying to `site/runtime/` defaults to invalidating `/site/runtime/*`.
- Multiple paths are sent in a single `CreateInvalidation` call as one batch.
- `waitForDistributionInvalidation: true` blocks the stack until CloudFront reports completion.
- `waitForDistributionInvalidation: false` returns faster and lets invalidation finish after the stack completes.

### Extraction and copy behavior

- `extract=false` copies each source object directly with `CopyObject`.
- `extract=true` downloads the source zip, walks entries from the archive, and uploads only the planned objects.
- Entries with deploy-time replacements are rewritten in memory.
- Entries without replacements are staged one at a time rather than expanding the whole archive to disk.

### Update and delete behavior

- `prune=true` removes destination objects that are no longer part of the source set.
- `retainOnDelete=true` preserves prior deployment data on update and on stack delete.
- `outputObjectKeys=false` suppresses the returned `SourceObjectKeys` payload.

## Validated Behavior

| Capability | Status | Evidence |
| --- | --- | --- |
| TypeScript synth/build path | Done | `pnpm typecheck`, `pnpm build` |
| Formatting/lint | Done | `pnpm lint` |
| Replacement behavior | Done | Manual S3 verification on March 30, 2026 |
| CloudFront invalidation with wait | Done | Manual deploy/update on April 10, 2026 |
| CloudFront invalidation without wait | Done | Manual deploy/update on April 10, 2026 |
| Include / exclude filters | Done | Manual deploy and S3 inspection on April 10, 2026 |
| Metadata mapping | Done | Manual deploy and `head-object` inspection on April 10, 2026 |
| Prune on update | Done | Manual v1/v2 deploy cycle on April 10, 2026 |
| `retainOnDelete` update/delete semantics | Done | Manual deploy/update/destroy cycle on April 10-11, 2026 |
| Validation/error branches | Done | Targeted Vitest synth/unit tests |

## Example Stacks

| Example | File | Purpose |
| --- | --- | --- |
| Simple asset deploy | [examples/simple-app.ts](./examples/simple-app.ts) | Plain deployment under `site/`. |
| Replacement behavior | [examples/replacement-behavior-app.ts](./examples/replacement-behavior-app.ts) | Replacement behavior across `asset`, `data`, JSON, and YAML sources. |
| CloudFront invalidation (sync) | [examples/cloudfront-invalidation-sync-app.ts](./examples/cloudfront-invalidation-sync-app.ts) | Stack waits for invalidation completion. |
| CloudFront invalidation (async) | [examples/cloudfront-invalidation-async-app.ts](./examples/cloudfront-invalidation-async-app.ts) | Stack returns before invalidation completes. |
| Metadata and filters | [examples/metadata-filters-app.ts](./examples/metadata-filters-app.ts) | Include/exclude and metadata behavior. |
| Prune update | [examples/prune-update-v1-app.ts](./examples/prune-update-v1-app.ts), [examples/prune-update-v2-app.ts](./examples/prune-update-v2-app.ts) | Update path that removes no-longer-deployed objects. |
| Retain on delete | [examples/retain-on-delete-v1-app.ts](./examples/retain-on-delete-v1-app.ts), [examples/retain-on-delete-v2-app.ts](./examples/retain-on-delete-v2-app.ts) | Update/delete path when `retainOnDelete: true`. |

Runner names:

- `simple`
- `replacement`
- `cloudfront-sync`
- `cloudfront-async`
- `metadata-filters`
- `prune-update-v1`
- `prune-update-v2`
- `prune-update`
- `retain-on-delete-v1`
- `retain-on-delete-v2`
- `retain-on-delete`

## Implementation Notes

- The Lambda custom-resource envelope uses the official [`aws_lambda_events`](https://docs.rs/aws_lambda_events/latest/aws_lambda_events/event/cloudformation/index.html) CloudFormation request types.
- `ResourceProperties` and `OldResourceProperties` are deserialized directly into a typed Rust struct (`RawDeploymentRequest`).
- The Rust runtime is organized by responsibility:
  - top-level orchestration in `cloudformation.rs`
  - CloudFront-specific logic in `cloudfront.rs`
  - S3-specific logic under `s3/`
  - request parsing and normalization in `request.rs`
  - marker replacement in `replace.rs`
- S3 metadata handling lives under `s3/metadata.rs` because it is tightly coupled to S3 upload/copy behavior.
- The TypeScript test suite uses [test/test-bundling.ts](./test/test-bundling.ts) to stub local bundling during synth/unit tests without Docker.

## Next Optimizations

- Add EFS parity if `/tmp` becomes a practical limit for large deployments.

The Rust provider lives under [rust](./rust), the construct code under [src](./src), and the AWS/manual validation examples under [examples](./examples).
