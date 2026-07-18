# ShinBucketDeployment

Rust-backed alternative to AWS CDK's official [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html) construct.

`ShinBucketDeployment` is a focused replacement for the common static-asset subset of `BucketDeployment`, intended for S3 deployment when you want a purpose-built Rust provider and fewer full-archive extraction costs than the upstream construct.

The published package ships prebuilt Rust provider binaries for both Lambda architectures (`arm64` and `x86_64`), so consumers do not need a Rust toolchain. Common deployments can migrate with an import change plus removal of any unsupported object-metadata props.

## Quick Start

Install the package in your CDK v2 project. It includes prebuilt provider binaries, so your app does not need a Rust toolchain or a provider build step.

```sh
npm install shin-bucket-deployment
```

### Migrating from `BucketDeployment`

Migration usually starts with this import change:

```diff
-import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
+import { ShinBucketDeployment as BucketDeployment, Source } from "shin-bucket-deployment";
```

See [Construct Properties](#construct-properties) for required replacements and unsupported properties.

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
| Invocation-wide memory cap  | Central-directory planning and every source archive share a source-memory budget capped at half the provider's actual Lambda memory by default; destination cleanup retains at most manifest metadata plus one S3 page.                                                                                                                                                  |
| Bounded fail-fast transfers | Completed tasks are drained continuously, concurrency is capped by `maxParallelTransfers`, and the first observed transfer failure or panic cancels and drains outstanding work before cleanup or invalidation can continue.                                                                                                                              |
| Encryption-aware writes     | SSE-S3 destinations use the cheap single-part MD5/`ETag` path; KMS and DSSE destinations store full-object SHA-256 only where encrypted `ETag`s cannot prove content identity.                                                                                                                                                                                  |
| Bounded marker replacement  | Marker-free entries stream directly. Marker entries use deterministic simultaneous replacement with one exact-length planning pass and a second retryable streaming pass only when upload is required; neither pass retains the complete entry or output.                                                                                                  |
| Safer destination moves     | Opt-in cleanup deploys new content first, infers the old prefix, and preserves overlapping current namespaces. See [Plan Destination Changes Safely](#plan-destination-changes-safely).                                                                                                                                                                      |

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
| CloudFront           | `distribution`, `distributionPaths`, `waitForDistributionInvalidation`                                                                         |
| Provider Lambda      | `architecture`, `logGroup`, `memoryLimit`, `role`, `securityGroups`, `shareHandler`, `vpc`, `vpcSubnets`                                       |
| Provider build       | `rustProjectPath`, `bundling`                                                                                                                  |
| Runtime tuning       | `maxParallelTransfers`, `advancedRuntimeTuning`                                                                                                |
| Outputs and response | `deployedBucket`, `objectKeys`, `outputObjectKeys`, `handlerRole`, `handlerFunction`                                                           |

### Replaced Properties

| Upstream prop | Use instead |
| --- | --- |
| `prune` | Replaced by `destinationLifecycle.onDeploy.deleteStaleObjects`. |
| `retainOnDelete` | Replaced by the explicit `destinationLifecycle.onChange` and `destinationLifecycle.onDelete` settings. |
| `logRetention` | Provide `logGroup` with the desired retention policy. |
| `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId` | Configure default encryption on `destinationBucket`. |

### Unsupported Properties

| Upstream prop | Shin behavior |
| --- | --- |
| `accessControl`, `cacheControl`, `contentDisposition`, `contentEncoding`, `contentLanguage`, `expires`, `metadata`, `storageClass`, `websiteRedirectLocation` | Object metadata is intentionally outside the deployment contract. Configure cache behavior in CloudFront and storage/lifecycle behavior on the bucket. |
| `contentType` | Shin automatically infers `Content-Type` from each deployed object's file extension, with `application/octet-stream` as the fallback. |
| `serverSideEncryptionCustomerAlgorithm` | SSE-C is not supported. |
| `ephemeralStorageSize` | The provider does not stage archives or extracted files in Lambda `/tmp`. |
| `signContent` | The provider uses AWS SDK calls directly, not the upstream AWS CLI upload path. |
| `useEfs` | EFS is not needed because the provider streams data with bounded memory instead of staging archives or extracted files on disk. |

## Plan Destination Changes Safely

`destinationLifecycle` separates cleanup during normal deployments, destination changes, and stack deletion.

> [!WARNING]
> `destinationLifecycle.onDeploy.deleteStaleObjects` defaults to `true`. On every Create or Update, Shin removes included objects from the current destination namespace when they are absent from the deployment plan. Set it to `false` if that namespace contains objects managed outside this deployment.

| Phase | Default | Effect |
| --- | --- | --- |
| `onDeploy.deleteStaleObjects` | `true` | Removes stale objects from the current bucket and prefix. |
| `onChange.deleteObjects` | `false` | Retains objects in the previous bucket or prefix after a destination change. |
| `onChange.invalidateDistribution` | omitted | Does not invalidate a changed previous CloudFront distribution. |
| `onDelete.deleteObjects` | `false` | Retains current destination objects when the custom resource is deleted. |

When only the prefix changes, set `deleteObjects` to `true`. The current bucket remains authorized, and CloudFormation supplies the old prefix through `OldResourceProperties`:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources: [Source.asset("site")],
  destinationBucket: websiteBucket,
  destinationKeyPrefix: "site-v2",
  distribution,
  destinationLifecycle: {
    onChange: {
      deleteObjects: true,
    },
  },
});
```

When the bucket changes, pass the previous `IBucket`. When the distribution changes, authorize its invalidation explicitly:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources: [Source.asset("site")],
  destinationBucket: newBucket,
  destinationKeyPrefix: "site-v2",
  distribution: newDistribution,
  destinationLifecycle: {
    onChange: {
      deleteObjects: true,
      fromBucket: oldBucket,
      invalidateDistribution: oldDistribution,
    },
  },
});
```

| Change | `destinationLifecycle.onChange` |
| --- | --- |
| Prefix only | `{ deleteObjects: true }` |
| Bucket | `{ deleteObjects: true, fromBucket: oldBucket }` |
| Distribution | `{ invalidateDistribution: oldDistribution }` |
| Bucket and distribution | `{ deleteObjects: true, fromBucket: oldBucket, invalidateDistribution: oldDistribution }` |

The actions are independent. Omitting `invalidateDistribution` does not block explicitly requested object deletion. If the previous distribution differs and its cached content changed, Shin skips that invalidation and logs that it was not explicitly authorized.

To retain stale objects during normal deployments and delete current objects when CloudFormation deletes the custom resource:

```ts
destinationLifecycle: {
  onDeploy: {
    deleteStaleObjects: false,
  },
  onDelete: {
    deleteObjects: true,
  },
}
```

None of these actions deletes the bucket or CloudFront distribution. `deleteStaleObjects` removes only objects in the current namespace that are absent from the deployment plan and match the active include/exclude filters. Before deletion, Shin reads the bucket's ownership tags. An overlapping owner from another deployment retains stale objects rather than risking co-tenant deletion; this can conservatively retain unrelated stale keys in the same pass. Prefixes must be concrete and at most 102 characters so the complete ownership-tag key can be validated during synthesis. `"/"` and an omitted prefix use the same canonical root owner, matching the provider's runtime normalization.

For old-object deletion, omitting `fromBucket` reuses `destinationBucket`; an explicit `fromBucket` authorizes a changed old bucket. An unchanged current distribution is invalidated automatically. A changed old distribution must be passed to `invalidateDistribution` so CDK can grant distribution-specific permissions and synthesize its dependency.

Shin deploys current content before considering previous cleanup. It derives the old prefix from `OldResourceProperties`, verifies that the old bucket matches the resource authorized by the new template, and applies owner and namespace-overlap checks. Missing or mismatched bucket authorization retains the previous destination and logs the reason without undoing the successful current deployment.

Parent/child prefix changes are segment-aware, and slash runs are exact key bytes rather than aliases. If the previous prefix contains the current prefix, authorized cleanup excludes the complete current namespace. If the current prefix contains the previous prefix, the normal stale pass protects the complete previous child namespace. Omitting `onChange.deleteObjects` retains that child. When deletion is authorized, a separate manifest-aware pass runs after successful transfers and removes obsolete keys from the old child while preserving keys still present in the current manifest. Neighboring prefixes such as `site` and `site2` are disjoint.

### Synthesis and Permission Boundary

`OldResourceProperties` exists only in the runtime Update event, so CDK cannot use it during synthesis to add IAM permissions or dependencies:

- Shin can derive the old prefix at runtime.
- CDK can reuse current bucket and distribution permissions when those resources did not change.
- A changed bucket or distribution needs an explicit old-resource reference in the new template.

Because the old prefix is unknown during synthesis, enabling previous-object deletion grants List/Delete and ownership-tag access across the selected bucket. Shin limits runtime work to the old prefix from `OldResourceProperties`, but the role's S3 permission remains broader while that option is in the template.

Fully automatic cross-bucket cleanup would require wildcard permissions over buckets absent from the synthesized construct graph, weakening least privilege, omitting useful CloudFormation dependencies, and granting authority unrelated to the declared migration. Shin instead requires an explicit old `IBucket` and scopes the additional grant to it. Changed CloudFront distributions likewise require an explicit `IDistribution` and receive distribution-specific invalidation permissions.

> [!IMPORTANT]
> Previous-destination cleanup is transition-specific authorization. After the move succeeds, remove old-resource references and any `onChange` actions that are no longer needed so the provider role no longer retains access to the previous bucket or distribution.

## How It Works

Shin plans extracted assets directly from ranged S3 reads without staging complete archives or entries in Lambda `/tmp`. It compares the deployment plan with the destination, streams changed objects with bounded concurrency and memory, optionally removes stale objects, and then creates any configured CloudFront invalidation. Direct-copy sources use S3 `CopyObject` instead of extraction.

Content checks and write reconciliation adapt to the destination bucket's encryption. Transfer failures stop later cleanup and invalidation, and structured diagnostics are emitted without resource identifiers or presigned URLs.

See [Architecture](docs/architecture.md) for the handler flow, archive planning, memory model, retry and write-safety rules, marker replacement, lifecycle behavior, compatibility tradeoffs, limits, and diagnostics field reference.

## Development

To rebuild the Rust provider binaries or use a local checkout in your CDK app, see [Building from source](docs/building-from-source.md). The latest correctness snapshot is recorded in [Verification](docs/verification.md).
