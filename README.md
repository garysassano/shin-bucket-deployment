# ShinBucketDeployment

Rust-backed alternative to AWS CDK's official [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) construct.

`ShinBucketDeployment` is a focused replacement for the common static-asset subset of `BucketDeployment`, intended for S3 deployment when you want a purpose-built Rust provider and fewer full-archive extraction costs than the upstream construct.

The published package ships prebuilt Rust provider binaries for both Lambda architectures (`arm64` and `x86_64`), so consumers do not need a Rust toolchain.

## Quick Start

Install the package in your CDK v2 project:

```sh
npm install shin-bucket-deployment
```

### Minimal Example

```ts
import { Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { ShinBucketDeployment, Source } from "shin-bucket-deployment";

export class DemoStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = new Bucket(this, "WebsiteBucket");

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("site")],
      destinationBucket: bucket,
    });
  }
}
```

### Migrating from `BucketDeployment`

Migration usually starts with this import change:

```diff
-import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
+import { ShinBucketDeployment as BucketDeployment, Source } from "shin-bucket-deployment";
```

See [Construct Properties](#construct-properties) for required replacements and unsupported properties.

## Why Build This

The official `BucketDeployment` is a good default for many stacks, but its provider is built around AWS CLI copy/sync orchestration. This construct keeps the familiar CDK surface while using a purpose-built Rust Lambda function for static asset deployment.

| Advantage                   | What changes                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leaner runtime              | This custom resource provider runs on the [Lambda Rust runtime](https://github.com/aws/aws-lambda-rust-runtime) (`provided.al2023`) rather than the Python runtime used by the upstream provider. In practice, the lower runtime overhead can mean faster cold starts and lower memory footprint. See [lambda-perf](https://maxday.github.io/lambda-perf/). |
| Direct AWS SDK operations   | Copy, upload, delete, and CloudFront invalidation are executed through SDK calls instead of shelling out to `aws s3 cp` / `aws s3 sync`.                                                                                                                                                                                                                    |
| Archive-aware planning      | For extracted assets, the provider plans directly from the zip archive instead of extracting the whole archive to a working directory before syncing.                                                                                                                                                                                                       |
| Invocation-wide memory cap  | Central-directory planning and every source archive share a source-memory budget capped at half the provider's actual Lambda memory by default; destination cleanup retains at most manifest metadata plus one S3 page.                                                                                                                                                  |
| Bounded fail-fast transfers | Completed tasks are drained continuously, concurrency is capped by `maxParallelTransfers`, and the first observed transfer failure or panic cancels and drains outstanding work before cleanup or invalidation can continue.                                                                                                                              |
| Encryption-aware writes     | SSE-S3 destinations use the cheap single-part MD5/`ETag` path; KMS and DSSE destinations store full-object SHA-256 only where encrypted `ETag`s cannot prove content identity.                                                                                                                                                                                  |
| Bounded marker replacement  | Marker-free entries stream directly. Marker entries use deterministic simultaneous replacement with one exact-length planning pass and a second retryable streaming pass only when upload is required; neither pass retains the complete entry or output.                                                                                                  |
| Safer destination moves     | Opt-in cleanup deploys new content first, infers the previous prefix, and preserves overlapping current namespaces. See [Destination Lifecycle](#destination-lifecycle).                                                                                                                                                                                    |

## Benchmark Snapshots

> [!CAUTION]
> These charts are illustrative, not performance guarantees or guidance for production defaults. See [Benchmark](docs/benchmark.md) for the supporting evidence.

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-1024mib-32.svg" alt="ShinBucketDeployment tiny-many 1024 MiB parallel 32 benchmark" width="100%">

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-2048mib-64.svg" alt="ShinBucketDeployment tiny-many 2048 MiB parallel 64 benchmark" width="100%">

## Construct Properties

The construct follows the upstream `BucketDeployment` API where the behavior maps cleanly to the Rust provider.

### Supported Properties

| Area                 | Supported                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Sources              | `sources`, `Source.asset`, `Source.bucket`, `Source.data`, `Source.jsonData`, `Source.yamlData`, `embeddedCatalog`                             |
| Destination          | `destinationBucket`, `destinationKeyPrefix`                                                                                                    |
| Filtering            | `include`, `exclude`                                                                                                                           |
| Deployment mode      | `extract`                                                                                                                                      |
| Lifecycle            | `destinationLifecycle`                                                                                                                         |
| CloudFront           | `cloudfrontInvalidation`                                                                                                                       |
| Provider Lambda      | `architecture`, `failureDiagnostics`, `logGroup`, `memoryLimit`, `providerScope`, `role`, `securityGroups`, `vpc`, `vpcSubnets`              |
| Provider build       | `localProviderBuild`                                                                                                                           |
| Runtime tuning       | `maxParallelTransfers`, experimental `advancedRuntimeTuning`                                                                                   |
| Outputs and response | `deployedBucket`, `objectKeys`, `handlerRole`, `handlerFunction`                                                                               |

Closed mode selections use the `ProviderScope`, `FailureDiagnostics`, and `DestinationWriteRetryJitter` enums exported from the package root.

Configure `cloudfrontInvalidation` only when a successful deployment should invalidate a CloudFront distribution:

```ts
cloudfrontInvalidation: {
  distribution,
  paths: ["/site/*"], // optional; defaults to the deployed prefix
  waitForCompletion: false, // optional; defaults to true
},
```

The provider is stack-scoped by default. Set `providerScope: ProviderScope.DEPLOYMENT` only when a deployment needs its own Lambda and generated role. Set `failureDiagnostics: FailureDiagnostics.DETAILED` only while investigating destination-write failures. Access `objectKeys` only when the deployed key list is needed; otherwise Shin omits it from the custom-resource response automatically.

### Replaced Properties

| Upstream prop | Use instead |
| --- | --- |
| `prune` | `destinationLifecycle.onDeploy.deleteStaleObjects` |
| `retainOnDelete` | `destinationLifecycle.onChange.deleteObjects` and `destinationLifecycle.onDelete.deleteObjects` |
| `distribution`, `distributionPaths`, `waitForDistributionInvalidation` | `cloudfrontInvalidation.distribution`, `cloudfrontInvalidation.paths`, `cloudfrontInvalidation.waitForCompletion` |
| `outputObjectKeys` | `objectKeys` |
| `logRetention` | `logGroup` |
| `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId` | Default encryption on `destinationBucket` |

`retainOnDelete` has inverse polarity: upstream `false` maps to setting both deletion actions to `true`; Shin lets you configure them independently.

### Unsupported Properties

| Upstream prop | Shin behavior |
| --- | --- |
| `accessControl`, `cacheControl`, `contentDisposition`, `contentEncoding`, `contentLanguage`, `expires`, `metadata`, `storageClass`, `websiteRedirectLocation` | Object metadata is intentionally outside the deployment contract. Configure cache behavior in CloudFront and storage/lifecycle behavior on the bucket. |
| `contentType` | Shin automatically infers `Content-Type` from each deployed object's file extension, with `application/octet-stream` as the fallback. |
| `serverSideEncryptionCustomerAlgorithm` | SSE-C is not supported. |
| `ephemeralStorageSize` | The provider does not stage archives or extracted files in Lambda `/tmp`. |
| `signContent` | The provider uses AWS SDK calls directly, not the upstream AWS CLI upload path. |
| `useEfs` | EFS is not needed because the provider streams data with bounded memory instead of staging archives or extracted files on disk. |

## Destination Lifecycle

Most deployments should omit `destinationLifecycle`. By default, Shin removes stale objects from the current destination on Create and Update, retains previous objects after a destination change, and retains current objects when the stack or custom resource is deleted. It never deletes the bucket or CloudFront distribution resources themselves.

### Deployment

> [!WARNING]
> `destinationLifecycle.onDeploy.deleteStaleObjects` defaults to `true` and assumes this deployment owns the destination prefix. Set it to `false` if other tools or users write objects there that must be preserved.

### Destination Change

`onChange` applies only when an update changes `destinationKeyPrefix`, `destinationBucket`, or `cloudfrontInvalidation.distribution` and you want to act on the previous location. Use the relevant table for each action and combine the settings when both are needed.

#### Object Cleanup

Previous objects are retained by default. To delete them:

| `destinationBucket` | `destinationKeyPrefix` | Object-cleanup configuration |
| --- | --- | --- |
| Unchanged | Unchanged | None; there is no previous object location. |
| Unchanged | Changed | Set `deleteObjects: true`. Omit `fromBucket`; Shin uses the current bucket. |
| Changed | Unchanged | Set `deleteObjects: true` and provide `fromBucket`. |
| Changed | Changed | Set `deleteObjects: true` and provide `fromBucket`. |

#### CloudFront Invalidation

| `cloudfrontInvalidation.distribution` | Invalidation configuration |
| --- | --- |
| Unchanged | Omit `invalidateDistribution`; any configured current distribution is invalidated normally. |
| Changed | Provide `invalidateDistribution: previousDistribution` only if the previous distribution should also be invalidated. |

> [!IMPORTANT]
> After a one-time destination move succeeds, remove previous-resource references and any `onChange` actions that are no longer needed to drop access to the previous bucket or distribution.

### Resource Deletion

Set `destinationLifecycle.onDelete.deleteObjects` to `true` only when current destination objects should be removed with the stack or custom resource. Otherwise, omit it.

## How It Works

Shin plans extracted assets directly from ranged S3 reads without staging complete archives or entries in Lambda `/tmp`. It compares the deployment plan with the destination, streams changed objects with bounded concurrency and memory, optionally removes stale objects, and then creates any configured CloudFront invalidation. Direct-copy sources use S3 `CopyObject` instead of extraction.

Content checks and write reconciliation adapt to the destination bucket's encryption. Transfer failures stop later cleanup and invalidation, and structured diagnostics are emitted without resource identifiers or presigned URLs.

See [Architecture](docs/architecture.md) for the handler flow, archive planning, memory model, retry and write-safety rules, marker replacement, lifecycle behavior, compatibility tradeoffs, limits, and diagnostics field reference.

## Development

To rebuild the Rust provider binaries or use a local checkout in your CDK app, see [Building from source](docs/building-from-source.md). The latest correctness snapshot is recorded in [Verification](docs/verification.md).
