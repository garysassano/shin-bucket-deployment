# ShinBucketDeployment

Rust-backed alternative to AWS CDK's official [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) construct.

`ShinBucketDeployment` is a near drop-in replacement for `BucketDeployment`, intended for S3 static asset deployment when you want a purpose-built Rust provider and fewer full-archive extraction costs than the upstream construct.

The published package ships prebuilt Rust provider binaries for both Lambda architectures (`arm64` and `x86_64`), so consumers do not need a Rust toolchain. Swapping from the upstream construct is a one-line import change.

## Quick Start

Install the package in your CDK v2 project. It includes prebuilt provider binaries, so your app does not need a Rust toolchain or a provider build step.

```sh
npm install shin-bucket-deployment
```

### Migrating from `BucketDeployment`

The props map closely to the upstream construct, so migration is usually a one-line import change:

```diff
-import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
+import { ShinBucketDeployment as BucketDeployment, Source } from "shin-bucket-deployment";
```

See [What It Supports](#what-it-supports) for the small set of upstream props that are intentionally unsupported.

### Example

```ts
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ShinBucketDeployment, Source } from "shin-bucket-deployment";

export class DemoStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new Bucket(this, "WebsiteBucket");
    const distribution = new Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
      },
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("site")],
      destinationBucket: bucket,
      destinationKeyPrefix: "site",
      distribution,
      waitForDistributionInvalidation: true,
    });
  }
}
```

## Why Build This

The official `BucketDeployment` is a good default for many stacks, but its provider is built around AWS CLI copy/sync orchestration. This construct keeps the familiar CDK surface while using a purpose-built Rust Lambda function for static asset deployment.

| Advantage                   | What changes                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leaner runtime              | This custom resource provider runs on the [Lambda Rust runtime](https://github.com/aws/aws-lambda-rust-runtime) (`provided.al2023`) rather than the Python runtime used by the upstream provider. In practice, the lower runtime overhead can mean faster cold starts and lower memory footprint. See [lambda-perf](https://maxday.github.io/lambda-perf/). |
| Direct AWS SDK operations   | Copy, upload, delete, and CloudFront invalidation are executed through SDK calls instead of shelling out to `aws s3 cp` / `aws s3 sync`.                                                                                                                                                                                                                    |
| Archive-aware planning      | For extracted assets, the provider plans directly from the zip archive instead of extracting the whole archive to a working directory before syncing.                                                                                                                                                                                                       |
| Semantic update decisions   | The provider combines content identity with normalized old/new object settings, so metadata-only updates rewrite objects while unchanged settings retain the fast `ETag`-based path.                                                                                                                                                                         |
| Marker-free streaming path  | Missing sources without deploy-time markers stream directly from archive entries; replacement buffers are only used for sources that declare markers.                                                                                                                                                                                                       |
| Safer destination moves     | Opt-in cleanup deploys new content first, infers the old prefix, and preserves overlapping current namespaces. See [changing a destination safely](docs/architecture.md#changing-a-destination-safely).                                                                                                                                                     |

## Benchmark Snapshots

> [!CAUTION]
> These are historical exploratory snapshots with single-sample methodology. They are being revalidated and should not be treated as performance guarantees or used to choose production defaults.

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-1024mib-32.svg" alt="ShinBucketDeployment tiny-many 1024 MiB parallel 32 benchmark" width="100%">

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-2048mib-64.svg" alt="ShinBucketDeployment tiny-many 2048 MiB parallel 64 benchmark" width="100%">

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-4096mib-128.svg" alt="ShinBucketDeployment tiny-many 4096 MiB parallel 128 benchmark" width="100%">

## What It Supports

The construct follows the upstream `BucketDeployment` API where the behavior maps cleanly to the Rust provider.

| Area            | Supported                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sources         | `sources`, `Source.data`, `Source.jsonData`, `Source.yamlData`, `embeddedCatalog`                                                                                                                                            |
| Destination     | `destinationBucket`, `destinationKeyPrefix`, `deployedBucket`, `objectKeys`                                                                                                                                                  |
| Filtering       | `include`, `exclude`                                                                                                                                                                                                         |
| Lifecycle       | `destinationLifecycle`                                                                                                                                                                                                       |
| Update behavior | `extract`, `outputObjectKeys`                                                                                                                                                                                                |
| S3 metadata     | `accessControl`, `cacheControl`, `contentDisposition`, `contentEncoding`, `contentLanguage`, `contentType`, `metadata`, `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId`, `storageClass`, `websiteRedirectLocation` |
| CloudFront      | `distribution`, `distributionPaths`, `waitForDistributionInvalidation`                                                                                                                                                       |
| Provider Lambda | `architecture`, `bundling`, `ephemeralStorageSize`, `logGroup`, `logRetention`, `memoryLimit`, `role`, `securityGroups`, `vpc`, `vpcSubnets`                                                                                 |
| Runtime tuning  | `maxParallelTransfers`, `advancedRuntimeTuning`                                                                                                                                                                              |

Unsupported upstream props:

| Prop                                    | Reason                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `expires`                               | Prefer `cacheControl` for deployment-time cache behavior.                                                                       |
| `prune`                                 | Replaced by `destinationLifecycle.onDeploy.deleteStaleObjects`.                                                                  |
| `retainOnDelete`                        | Replaced by the explicit `destinationLifecycle.onChange` and `destinationLifecycle.onDelete` settings.                          |
| `serverSideEncryptionCustomerAlgorithm` | SSE-C is intentionally not implemented; use SSE-S3 or SSE-KMS.                                                                  |
| `signContent`                           | The provider uses AWS SDK calls directly, not the upstream AWS CLI upload path.                                                 |
| `useEfs`                                | EFS is not needed because the provider streams data with bounded memory instead of staging archives or extracted files on disk. |

## How It Works

### Archive Planning

For `extract=true`, the provider reads each source zip's central directory with ranged S3 `GetObject` requests, walks the archive entries, applies filters, and builds the deployment plan from the archive contents. Directory `Source.asset` inputs include a compact `.shin/catalog.v1.json` size/MD5 catalog whose exact bytes are authenticated by a SHA-256 digest in the CloudFormation template. Only those template-bound catalogs can enable sparse skips. Entry data is read through coalesced source blocks with a bounded resident window. Source GET concurrency and the source window are derived from `memoryLimit` by default and can be overridden through `advancedRuntimeTuning` when diagnosing unusual workloads. It does not download the whole archive and does not write the archive or extracted entries to Lambda `/tmp`.

`ephemeralStorageSize` is accepted for upstream `BucketDeployment` API compatibility, but it is rarely useful for this provider because ZIP planning, extraction, hashing, and uploads avoid Lambda `/tmp`.

For `extract=false`, each source object is copied directly with S3 `CopyObject`.

### Change Detection

Before uploading or copying, the provider lists the destination prefix. Destination keys are used to delete stale objects when `destinationLifecycle.onDeploy.deleteStaleObjects` is enabled, and destination `ETag` values are used to skip unchanged objects.

For existing marker-free zip entries with authenticated catalog MD5s, the provider compares destination size and `ETag` before reading entry bytes. Catalogs in arbitrary ZIPs are untrusted and do not receive this shortcut. Without a trusted catalog match, it reads and decompresses the entry from ranged source blocks, validates size and CRC32, computes MD5, and compares it with the destination `ETag`. Missing marker-free objects stream directly to S3 without pre-hashing. Entries with deploy-time markers are materialized after decompression and replacement so the final bytes can be hashed and uploaded when changed.

On Update, normalized user metadata and every supported system setting from CloudFormation `OldResourceProperties` participate in the decision. A change to metadata, cache headers, an explicit content type, ACL, storage class, encryption, or website redirect forces replacement even when object bytes are unchanged, for both extracted uploads and `extract=false` copies. Content type is compared after resolving the final key, and implicit `private` ACL / `STANDARD` storage defaults are normalized, so spelling out an already-effective default does not cause a useless rewrite. On Create there is no prior semantic identity to trust, so a matching pre-existing destination object is rewritten to converge its settings.

Extracted uploads store a full-object SHA-256 checksum. If a retry receives an ambiguous conditional `409` or `412`, the provider reads the destination with checksum mode and accepts it only when size, SHA-256, all `HeadObject`-visible settings, user metadata, and the effective object ACL exactly match. Otherwise the deployment fails closed instead of assuming that a lost response committed the intended object.

### Memory Model

Marker-free ZIP entry streaming uses the same small-buffer defaults as the local `s3-unspool` extraction path: 64 KiB entry read buffers, 256 KiB S3 body chunks, and a 1 MiB body pipe between entry production and the SDK upload body. With the default 32 parallel transfers, this keeps entry stream buffering around 44 MiB, leaving the 1024 MiB default provider Lambda memory for the Rust runtime, AWS SDK, source block window, and ZIP metadata.

At the default 1024 MiB memory limit, adaptive source scheduling reserves about 64 MiB for runtime/base overhead, 384 MiB for 32 transfer workers, 32 MiB for four in-flight source range requests, and 2 KiB per ZIP entry for metadata. The remaining source block window is clamped to the actual source ZIP size and capped by the adaptive model; for large enough archives it is about 160 MiB minus the file reserve after large-archive RSS slack. The 1024 MiB default was selected from historical exploratory measurements whose methodology is now being revalidated; it is not a performance guarantee.

### Invalidation and Logs

CloudFront invalidation is created after S3 changes when `distribution` is provided. If `distributionPaths` is omitted, the default path is the destination prefix plus `*`, for example `/site/*`.

The provider logs one sanitized `shin_deployment_summary` JSON line per custom-resource request plus structured source scheduler and destination `PutObject` diagnostics to CloudWatch Logs. The summary includes phase timings and aggregate counters, but excludes bucket names, object keys, account IDs, distribution IDs, URLs, and ETags.

## Limits

### `ETag`-based Skips

The byte-identity optimization depends on S3 `ETag` values behaving like MD5 content hashes. That is generally true for simple single-part static objects, but not for all S3 configurations.

CloudFormation object-setting changes independently disable skips, so metadata-only property updates are not lost. Multipart objects, SSE-KMS or SSE-C objects, and objects written by other tools may still lack an MD5-like `ETag`; those cases can cause extra transfers. Out-of-band destination metadata drift is not discovered when the CloudFormation settings themselves are unchanged because normal planning intentionally avoids one metadata request per object.

### Cataloged `Source.asset` Assets

Zip entries with deploy-time marker replacements are fully materialized in memory after replacement so the final bytes can be hashed and uploaded. Plain zip entries are read and uploaded in chunks. Cataloged directory assets currently do not support CDK asset `bundling` or symlink-following options; pass `embeddedCatalog: false` to `Source.asset` to use the upstream CDK asset path for those cases.

- It applies to local directory assets only. Local `.zip` files, `Source.bucket` archives, data sources, and third-party sources remain deployable but cannot declare their catalogs trusted.
- It does not run CDK asset `bundling`. Use your own pre-bundled directory, or pass `embeddedCatalog: false` to delegate packaging to CDK.
- It rejects symlinks and non-regular files instead of following, materializing, or silently dropping them.
- It requires CDK asset staging and delegates ZIP/ZIP64 creation to CDK from a temporary materialized directory.
- It changes the staged ZIP bytes compared with upstream CDK packaging because the catalog entry is added.
- Authenticated catalog MD5s are only used for marker-free destination skips. Every trusted entry that is read is checked against its catalog MD5 before upload or replacement.

### Object Size and Scope

Source archives are read with S3 ranges and do not need to fit in Lambda memory or ephemeral storage. Individual files inside the asset ZIP, including marker-expanded output, must be <= 5 GiB because extracted uploads currently use S3 `PutObject`, not multipart upload.

Before destination mutation, the provider validates the complete final key against S3's [1024-byte UTF-8 key limit](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html), checks archive and aggregate size arithmetic, rejects oversized single-request uploads and copies, and checks user/system metadata plus controlled request headers against S3's [2 KiB metadata and 8 KiB request-header limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html). Marker-bearing entries undergo a complete validation/replacement pass so the actual expanded length is known before any write; until the streaming replacement work lands, transfer can read and materialize those entries a second time. Two KiB of the request-header budget is conservatively reserved for SDK signing, conditional, and checksum headers.

This construct targets static asset deployment to S3. It is not a general-purpose sync engine and does not provide byte-range diffing, persistent manifests, or non-S3 backend behavior.

## Development

To rebuild the Rust provider binaries or use a local checkout in your CDK app, see [Building from source](docs/building-from-source.md).
