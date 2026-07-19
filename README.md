# ShinBucketDeployment

Rust-backed AWS CDK construct for performance-sensitive S3 asset deployment.

`ShinBucketDeployment` is a focused alternative to AWS CDK's official [`BucketDeployment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_deployment.BucketDeployment.html), intended for static assets when you want a purpose-built Rust provider and fewer full-archive extraction costs. It accepts upstream CDK `ISource` implementations while owning its configuration API directly.

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
      destination: { bucket },
    });
  }
}
```

### Migrating from `BucketDeployment`

Migration starts with the construct import and an intentional property mapping:

```diff
-import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
+import { ShinBucketDeployment, Source } from "shin-bucket-deployment";
```

Shin does not provide compatibility aliases for either `BucketDeployment` props or its former flat API. See the complete [Migration Guide](docs/migration.md) for mechanical mappings and before/after examples.

## Why Build This

The official `BucketDeployment` is a good default for many stacks, but its provider is built around AWS CLI copy/sync orchestration. Shin uses a purpose-built Rust Lambda function and a configuration model that exposes provider identity separately from request-scoped transfer controls.

| Advantage                   | What changes                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leaner runtime              | This custom resource provider runs on the [Lambda Rust runtime](https://github.com/aws/aws-lambda-rust-runtime) (`provided.al2023`) rather than the Python runtime used by the upstream provider. Its native provider starts faster and uses less memory on the target workloads. See [Benchmark Snapshots](#benchmark-snapshots).                                                                          |
| Direct AWS SDK operations   | S3 copy, upload, and delete work is executed through Rust SDK calls instead of the upstream provider's `aws s3 cp`, `aws s3 sync`, and `aws s3 rm` subprocesses.                                                                                                                                                                                               |
| Archive-aware planning      | For extracted assets, the provider plans directly from the zip archive instead of extracting the whole archive to a working directory before syncing.                                                                                                                                                                                                       |
| Invocation-wide memory cap  | Central-directory planning and every source archive share a source-memory budget capped at half the provider's actual Lambda memory by default; destination cleanup retains at most manifest metadata plus one S3 page.                                                                                                                                                  |
| Bounded fail-fast transfers | Transfer concurrency is capped by `transfer.maxConcurrency`. The first observed failure or panic stops admission and drains outstanding work before cleanup or invalidation can continue.                                                                                                                                                                                                  |
| Encryption-aware writes     | SSE-S3 destinations use the cheap single-part MD5/`ETag` path; KMS and DSSE destinations store full-object SHA-256 only where encrypted `ETag`s cannot prove content identity.                                                                                                                                                                                  |
| Bounded marker replacement  | Marker-free entries stream directly. Marker entries use deterministic simultaneous replacement with one exact-length planning pass and a second retryable streaming pass only when upload is required; neither pass retains the complete entry or output.                                                                                                  |
| Safer destination moves     | Opt-in cleanup deploys new content first, infers the previous prefix, and preserves overlapping current namespaces. See [Destination Lifecycle](#destination-lifecycle).                                                                                                                                                                                    |

## Benchmark Snapshots

> [!CAUTION]
> These charts are illustrative, not performance guarantees or guidance for production defaults. See [Benchmark](docs/benchmark.md) for the supporting evidence.

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-1024mib-32.svg" alt="ShinBucketDeployment tiny-many 1024 MiB max concurrency 32 benchmark" width="100%">

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-2048mib-64.svg" alt="ShinBucketDeployment tiny-many 2048 MiB max concurrency 64 benchmark" width="100%">

## Construct API

The root props contain seven domain components. Configuration groups are plain values; they do not create additional CDK construct scopes or resources.

### Supported Properties

Only `sources` and `destination` are required. Sources accept any upstream CDK `ISource`; Shin also provides `Source.asset`, `Source.bucket`, `Source.data`, `Source.jsonData`, and `Source.yamlData` helpers.

The complete construct configuration shape is:

```ts
interface ShinBucketDeploymentProps {
  // Ordered upstream ISource values. Later sources overwrite earlier sources.
  readonly sources: ISource[];

  // Bound source-archive handling and object selection. Exclusions constrain stale deletion.
  readonly sourceProcessing?: {
    readonly extract?: boolean; // Default: true
    readonly include?: string[]; // Default: include every non-excluded path
    readonly exclude?: string[]; // Default: exclude nothing
  };

  // Current S3 destination location.
  readonly destination: {
    readonly bucket: Bucket;
    readonly keyPrefix?: string; // Default: bucket root
  };

  // Explicit destructive behavior by CloudFormation lifecycle phase.
  readonly destinationLifecycle?: {
    readonly onDeploy?: {
      readonly deleteStaleObjects?: boolean; // Default: true
    };
    readonly onChange?: {
      readonly deletePreviousObjects?: boolean; // Default: false
      readonly previousBucket?: IBucket; // Required to delete from a changed bucket
      readonly invalidatePreviousDistribution?: IDistributionRef; // Required to invalidate a changed distribution
    };
    readonly onDelete?: {
      readonly deleteCurrentObjects?: boolean; // Default: false
    };
  };

  // Optional cache invalidation after successful destination work.
  readonly cloudfrontInvalidation?: {
    readonly distribution: IDistributionRef;
    readonly paths?: string[]; // Default: the destination prefix followed by "*"
    readonly waitForCompletion?: boolean; // Default: true
  };

  // Lambda resource, identity, sharing, networking, and build configuration.
  readonly providerLambda?: {
    readonly sharing?: ProviderSharing; // Default: ProviderSharing.STACK
    readonly architecture?: Architecture; // Default: Architecture.ARM_64
    readonly memorySize?: number; // Default: 1024 MiB
    readonly failureDiagnostics?: FailureDiagnostics; // Default: STANDARD
    readonly role?: IRole; // Default: create a shared provider role
    readonly logGroup?: ILogGroupRef; // Default: Lambda-managed log group
    readonly vpc?: IVpc; // Default: no VPC
    readonly vpcSubnets?: SubnetSelection; // Default: VPC default selection
    readonly securityGroups?: ISecurityGroup[]; // Default: dedicated group in a VPC
    readonly localBuild?: {
      readonly projectPath?: string;
      readonly bundling?: ShinBucketDeploymentBundlingOptions;
    }; // Default: use the packaged prebuilt provider
  };

  // Request-scoped controls; these do not split a compatible shared handler.
  readonly transfer?: {
    readonly maxConcurrency?: number; // Default: 32
    readonly advancedTuning?: {
      readonly sourceBlockBytes?: number; // Default: 8 MiB
      readonly sourceBlockMergeGapBytes?: number; // Default: 256 KiB
      readonly sourceGetConcurrency?: number; // Default: derived from Lambda memory
      readonly sourceWindowBytes?: number; // Default: derived from memory and source shape
      readonly sourceWindowMemoryBudgetMiB?: number; // Default: 50% of Lambda memory
      readonly destinationWriteRetry?: {
        readonly maxAttempts?: number; // Default: 6
        readonly baseDelayMs?: number; // Default: 250
        readonly maxDelayMs?: number; // Default: 5000
        readonly slowdownBaseDelayMs?: number; // Default: 1000
        readonly slowdownMaxDelayMs?: number; // Default: 30000
        readonly jitter?: DestinationWriteRetryJitter; // Default: FULL
      };
    };
  };
}
```

Most consumers should omit `providerLambda.localBuild` and use the packaged provider. See [Building from source](docs/building-from-source.md) when you need to compile it yourself.

### Instance Members

The constructed deployment exposes these properties and methods; they are not input props.

| Member | Description |
| --- | --- |
| `deployment.deployedBucket` | Destination bucket reconstructed lazily from the custom-resource response. |
| `deployment.objectKeys` | Deployed object keys requested lazily from the custom-resource response. |
| `deployment.handlerRole` | Execution role used by the backing provider Lambda. |
| `deployment.handlerFunction` | Backing provider Lambda function. |
| `deployment.addSource(source)` | Adds another ordered source after construction. |

## `BucketDeployment` Compatibility

### Replaced Properties

| Upstream prop | Use instead |
| --- | --- |
| `prune` | `destinationLifecycle.onDeploy.deleteStaleObjects` |
| `retainOnDelete` | `destinationLifecycle.onChange.deletePreviousObjects` and `destinationLifecycle.onDelete.deleteCurrentObjects` |
| `distribution` | `cloudfrontInvalidation.distribution` |
| `distributionPaths` | `cloudfrontInvalidation.paths` |
| `waitForDistributionInvalidation` | `cloudfrontInvalidation.waitForCompletion` |
| `outputObjectKeys` | `objectKeys`; Shin returns the key list only when this property is accessed. |
| `logRetention` | `providerLambda.logGroup` |
| `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId` | Default encryption on `destination.bucket` |

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

`onChange` applies only when an update changes `destination.keyPrefix`, `destination.bucket`, or `cloudfrontInvalidation.distribution` and you want to act on the previous location. Use the relevant table for each action and combine the settings when both are needed.

#### Object Cleanup

Previous objects are retained by default. To delete them:

| `destination.bucket` | `destination.keyPrefix` | Object-cleanup configuration |
| --- | --- | --- |
| Unchanged | Unchanged | None; there is no previous object location. |
| Unchanged | Changed | Set `deletePreviousObjects: true`. Omit `previousBucket`; Shin uses the current bucket. |
| Changed | Unchanged | Set `deletePreviousObjects: true` and provide `previousBucket`. |
| Changed | Changed | Set `deletePreviousObjects: true` and provide `previousBucket`. |

#### CloudFront Invalidation

| `cloudfrontInvalidation.distribution` | Invalidation configuration |
| --- | --- |
| Unchanged | Omit `invalidatePreviousDistribution`; any configured current distribution is invalidated normally. |
| Changed | Provide `invalidatePreviousDistribution: previousDistribution` only if the previous distribution should also be invalidated. |

> [!IMPORTANT]
> After a one-time destination move succeeds, remove previous-resource references and any `onChange` actions that are no longer needed to drop access to the previous bucket or distribution.

### Resource Deletion

Set `destinationLifecycle.onDelete.deleteCurrentObjects` to `true` only when current destination objects should be removed with the stack or custom resource. Otherwise, omit it.

## How It Works

Shin plans extracted assets directly from ranged S3 reads without staging complete archives or entries in Lambda `/tmp`. It compares the deployment plan with the destination, streams changed objects with bounded concurrency and memory, optionally removes stale objects, and then creates any configured CloudFront invalidation. Direct-copy sources use S3 `CopyObject` instead of extraction.

Content checks and write reconciliation adapt to the destination bucket's encryption. Transfer failures stop later cleanup and invalidation, and structured diagnostics are emitted without resource identifiers or presigned URLs.

See [Architecture](docs/architecture.md) for the handler flow, archive planning, memory model, retry and write-safety rules, marker replacement, lifecycle behavior, compatibility tradeoffs, limits, and diagnostics field reference. The latest correctness snapshot is recorded in [Verification](docs/verification.md).
