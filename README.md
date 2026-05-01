# RustBucketDeployment

Rust-backed alternative to AWS CDK's official [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) construct.

This repository is currently a local prototype, not a published construct library. The construct API and Rust provider Lambda are working and tracked through AWS validation runs.

`RustBucketDeployment` is intended for S3 static asset deployment when you want a lower-overhead provider than the upstream Python Lambda and a deployment path that avoids extracting whole archives before syncing them.

## Why Build This

The official `BucketDeployment` is a good default for many stacks, but its provider is built around AWS CLI copy/sync orchestration. This construct keeps the familiar CDK surface while using a purpose-built Rust Lambda for static asset deployment.

| Advantage | What changes |
| --- | --- |
| Lower-overhead provider | The custom resource runs on the [Lambda Rust runtime](https://github.com/aws/aws-lambda-rust-runtime) (`provided.al2023`) instead of the upstream Python provider. In practice this can mean faster cold starts and lower memory footprint; for background, see [lambda-perf](https://maxday.github.io/lambda-perf/). |
| Direct AWS SDK operations | Copy, upload, delete, and CloudFront invalidation are executed through SDK calls instead of shelling out to `aws s3 cp` / `aws s3 sync`. |
| Archive-aware planning | For extracted assets, the provider plans directly from the zip archive instead of extracting the whole archive to a working directory before syncing. |
| `ETag`-based skip decisions | The provider lists the destination prefix once and compares planned content MD5 values with destination `ETag` values to skip unchanged single-part static objects. |
| Marker-free streaming path | Missing sources without deploy-time markers stream directly from archive entries; replacement buffers are only used for sources that declare markers. |

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

## What It Supports

The construct follows the upstream `BucketDeployment` API where the behavior maps cleanly to the Rust provider.

| Area | Supported |
| --- | --- |
| Sources | `sources`, `Source.asset`, `Source.data`, `Source.jsonData`, `Source.yamlData`, deploy-time markers |
| Destination | `destinationBucket`, `destinationKeyPrefix`, `deployedBucket`, `objectKeys` |
| Filtering | `include`, `exclude` |
| Update behavior | `extract`, `prune`, `retainOnDelete`, `outputObjectKeys` |
| S3 metadata | `accessControl`, `cacheControl`, `contentDisposition`, `contentEncoding`, `contentLanguage`, `contentType`, `metadata`, `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId`, `storageClass`, `websiteRedirectLocation` |
| CloudFront | `distribution`, `distributionPaths`, `waitForDistributionInvalidation` |
| Provider Lambda | `architecture`, `bundling`, `ephemeralStorageSize`, `logGroup`, `logRetention`, `memoryLimit`, `role`, `securityGroups`, `vpc`, `vpcSubnets` |

Unsupported upstream props:

| Prop | Reason |
| --- | --- |
| `expires` | Prefer `cacheControl` for deployment-time cache behavior. |
| `serverSideEncryptionCustomerAlgorithm` | SSE-C is intentionally not implemented; use SSE-S3 or SSE-KMS. |
| `signContent` | The provider uses AWS SDK calls directly, not the upstream AWS CLI upload path. |
| `useEfs` | The provider reads source archives with S3 ranges and does not use EFS. |

## How It Works

For `extract=true`, the provider reads each source zip's central directory with ranged S3 `GetObject` requests, walks the archive entries, applies filters, and builds the deployment plan from the archive contents. It does not download the whole archive and does not write the archive or extracted entries to Lambda `/tmp`.

For `extract=false`, each source object is copied directly with S3 `CopyObject`.

Before uploading or copying, the provider lists the destination prefix. Destination keys are used for `prune=true`, and destination `ETag` values are used to skip unchanged objects.

For existing marker-free zip entries, the provider reads and decompresses the entry from ranged source blocks, computes MD5, and compares it with the destination `ETag`. Missing marker-free objects stream directly to S3 without pre-hashing. Entries with deploy-time markers are materialized after replacement so the final bytes can be hashed and uploaded when changed.

CloudFront invalidation is created after S3 changes when `distribution` is provided. If `distributionPaths` is omitted, the default path is the destination prefix plus `*`, for example `/site/*`.

## Limits

The unchanged-object optimization depends on S3 `ETag` values behaving like MD5 content hashes. That is generally true for simple single-part static objects, but not for all S3 configurations.

Uploads or copies may not be skipped correctly for metadata-only changes, multipart objects, SSE-KMS or SSE-C objects, or any case where MD5-like `ETag` metadata is unavailable.

Zip entries with deploy-time marker replacements are fully materialized in memory after replacement so the final bytes can be hashed and uploaded. Plain zip entries are read and uploaded in chunks.

Large replacement-expanded entries must fit in Lambda memory. Source archives are read with S3 ranges and do not need to fit in memory or ephemeral storage.

This construct targets static asset deployment to S3. It is not a general-purpose sync engine and does not provide byte-range diffing, persistent manifests, or non-S3 backend behavior.

## Examples and Validation

Examples are driven through the repository runner:

```bash
pnpm example list
pnpm example synth simple
pnpm example deploy cloudfront-sync
pnpm example destroy retain-on-delete
```

See [docs/architecture.md](./docs/architecture.md) for the full example list and runtime design, [docs/validation.md](./docs/validation.md) for validation status, and [docs/benchmarking.md](./docs/benchmarking.md) for benchmark strategy.

The Rust provider lives under [rust](./rust), the construct code under [src](./src), and provider workflow diagrams are in [docs/architecture.md](./docs/architecture.md).
