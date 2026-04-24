# RustBucketDeployment

Rust-backed alternative to AWS CDK's official [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) construct.

This repo is currently a local prototype, not a published construct library, but the construct and runtime paths are working and manually validated.

Examples are driven through a single runner:

```bash
pnpm example list
pnpm example synth simple
pnpm example deploy cloudfront-sync
pnpm example destroy retain-on-delete
```

## Why Migrate from `BucketDeployment`

If `BucketDeployment` already works well for your stack, you do not need to move. Migrate when you want a lower-overhead provider and a leaner deployment path.

| Why migrate | What changes compared with `BucketDeployment` |
| --- | --- |
| Lower-overhead provider Lambda | `RustBucketDeployment` uses the [Lambda Rust runtime](https://github.com/aws/aws-lambda-rust-runtime) on `provided.al2023` instead of the upstream Python Lambda runtime. In practice this can mean faster cold starts and lower memory footprint; for background, see the independent benchmark at [lambda-perf](https://maxday.github.io/lambda-perf/). |
| Direct SDK-based deployment instead of CLI orchestration | `RustBucketDeployment` uses AWS SDK calls for copy, upload, delete, and invalidation, whereas upstream `BucketDeployment` orchestrates `aws s3 cp` / `aws s3 sync` from its handler. |
| Skips replacement work when no markers are present | `RustBucketDeployment` only runs deploy-time marker replacement for sources that actually declare markers. Plain sources avoid that rewrite path entirely. |
| More efficient archive handling when extraction is needed | The upstream Python handler downloads each zip, extracts it to a working directory, rewrites files in place, and then syncs the extracted tree. `RustBucketDeployment` plans directly from the archive, compares planned content with destination `ETag` values, and avoids materializing the full extracted tree first. |

## `BucketDeployment` Parity

This tracks parity against the upstream [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) construct API.

| `BucketDeployment` prop | Supported in `RustBucketDeployment` |
| --- | --- |
| `accessControl` | ✅ |
| `cacheControl` | ✅ |
| `contentDisposition` | ✅ |
| `contentEncoding` | ✅ |
| `contentLanguage` | ✅ |
| `contentType` | ✅ |
| `destinationBucket` | ✅ |
| `destinationKeyPrefix` | ✅ |
| `distribution` | ✅ |
| `distributionPaths` | ✅ |
| `ephemeralStorageSize` | ✅ |
| `exclude` | ✅ |
| `expires` | ❌ |
| `extract` | ✅ |
| `include` | ✅ |
| `logGroup` | ✅ |
| `logRetention` | ✅ |
| `memoryLimit` | ✅ |
| `metadata` | ✅ |
| `outputObjectKeys` | ✅ |
| `prune` | ✅ |
| `retainOnDelete` | ✅ |
| `role` | ✅ |
| `securityGroups` | ✅ |
| `serverSideEncryption` | ✅ |
| `serverSideEncryptionAwsKmsKeyId` | ✅ |
| `serverSideEncryptionCustomerAlgorithm` | ❌ |
| `signContent` | ❌ |
| `sources` | ✅ |
| `storageClass` | ✅ |
| `useEfs` | ❌ |
| `vpc` | ✅ |
| `vpcSubnets` | ✅ |
| `waitForDistributionInvalidation` | ✅ |
| `websiteRedirectLocation` | ✅ |

Unsupported by design:

- `expires`: prefer `cacheControl`, which is the more common and safer control surface for deployment-time caching behavior.
- `serverSideEncryptionCustomerAlgorithm`: prefer S3-managed encryption (`AES256`) or KMS-backed encryption instead of the more specialized SSE-C request flow.
- `signContent`: this runtime uses the AWS SDK directly instead of the upstream AWS CLI-based upload path, so this transport-level knob does not map cleanly or usefully here.
- `useEfs`: prefer increasing `ephemeralStorageSize`; Lambda supports up to 10,240 MiB of ephemeral storage. Longer term, S3 Files is the more interesting direction once CloudFormation supports it.

## Quick Start

```ts
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { RustBucketDeployment, Source } from "./src";

export class DemoStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new s3.Bucket(this, "WebsiteBucket");
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      },
    });

    new RustBucketDeployment(this, "DeployWebsite", {
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

- `extract=false` compares the source object's `ETag` with the destination object's `ETag`. If they match, the copy is skipped; otherwise the source object is copied with `CopyObject`.
- `extract=true` downloads the source zip, walks entries from the archive, and uploads only objects whose planned content differs from the destination.
- Zip entries with deploy-time replacements are rewritten in memory, because the final bytes are only known after replacement.
- Zip entries without replacements up to 32 MiB are read into memory, hashed with MD5, compared to the destination `ETag`, and uploaded from memory only when changed.
- Zip entries without replacements larger than 32 MiB are streamed once to compute MD5. If the destination `ETag` matches, the entry is skipped without using `/tmp`; if it differs, the entry is reopened and staged as a single temporary file for upload.
- The handler never extracts the whole archive to disk. At most one large changed zip entry is staged in `/tmp` at a time.

### Update and delete behavior

- `prune=true` removes destination objects that are no longer part of the source set.
- The destination prefix is listed with `ListObjectsV2` during deployment. The returned object keys and `ETag` values are used both for skip decisions and, when `prune=true`, for delete decisions.
- There is no separate manifest or managed cache. If a destination object is manually removed, moved, or changed, the next deployment observes the current bucket state from S3 and reconciles it.
- `retainOnDelete=true` preserves prior deployment data on update and on stack delete.
- `outputObjectKeys=false` suppresses the returned `SourceObjectKeys` payload.

### ETag optimization limits

The `ETag` skip path is intentionally narrow. It is optimized for simple static website assets where each uploaded object is a single-part S3 object and the `ETag` is the MD5 of the object bytes.

Supported by the optimization:

- Plain static assets uploaded as single-part objects.
- Zip entries without replacements, using in-memory comparison up to 32 MiB and streaming MD5 comparison above 32 MiB.
- Zip entries with deploy-time replacements, after the replacement output is computed in memory.
- `extract=false` source object copies, when the source and destination `ETag` values match.

Not supported by the optimization:

- Metadata-only changes. If bytes are unchanged but `cacheControl`, `contentType`, custom metadata, storage class, encryption, or other object attributes need to change, matching `ETag` values can cause the upload/copy to be skipped.
- Multipart uploads or multipart copies, because their S3 `ETag` is not the plain MD5 of the object bytes.
- SSE-KMS or SSE-C objects, or any other S3 mode where the `ETag` is not a reliable MD5 content hash.
- Cases that need byte-range reads or custom backend semantics. This construct targets S3 static asset deployment, not a general sync framework.

When most files are unchanged, the optimization avoids unnecessary PUT/COPY work and avoids rewriting unchanged zip entries to `/tmp`. When most files are changed, the runtime still has to read and hash archive entries before uploading them, so the value should be validated with your asset mix if deployment time is critical.

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

The Rust provider lives under [rust](./rust), the construct code under [src](./src), and the AWS/manual validation examples under [examples](./examples).
