# Migration guide

`ShinBucketDeployment` uses a Shin-owned grouped API. This is a clean break: former flat properties and legacy lifecycle spellings are rejected at runtime with migration guidance, not translated, and there are no compatibility aliases.

## From Shin's former flat API

| Former property | Grouped property |
| --- | --- |
| `sources` | `sources` |
| `destinationBucket` | `destination.bucket` |
| `destinationKeyPrefix` | `destination.keyPrefix` |
| `extract` | `sourceProcessing.extract` |
| `include` | `sourceProcessing.include` |
| `exclude` | `sourceProcessing.exclude` |
| `providerScope` | `providerLambda.sharing` |
| `architecture` | `providerLambda.architecture` |
| `memoryLimit` | `providerLambda.memorySize` |
| `failureDiagnostics` | `providerLambda.failureDiagnostics` |
| `role` | `providerLambda.role` |
| `logGroup` | `providerLambda.logGroup` |
| `vpc` | `providerLambda.vpc` |
| `vpcSubnets` | `providerLambda.vpcSubnets` |
| `securityGroups` | `providerLambda.securityGroups` |
| `localProviderBuild` | `providerLambda.localBuild` |
| `maxParallelTransfers` | `transfer.maxConcurrency` |
| `advancedRuntimeTuning` | `transfer.advancedTuning` |
| `cloudfrontInvalidation` | `cloudfrontInvalidation` |
| `destinationLifecycle` | `destinationLifecycle` |

The exported `ShinBucketDeploymentLocalProviderBuild` and `ShinBucketDeploymentAdvancedRuntimeTuning` type names were replaced by `ShinBucketDeploymentLocalBuildOptions` and `ShinBucketDeploymentAdvancedTransferTuning`.

### Minimal deployment

Before:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources: [Source.asset("site")],
  destinationBucket: bucket,
});
```

After:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources: [Source.asset("site")],
  destination: { bucket },
});
```

### VPC and provider configuration

Before:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources,
  destinationBucket: bucket,
  providerScope: ProviderScope.DEPLOYMENT,
  architecture: Architecture.X86_64,
  memoryLimit: 2048,
  failureDiagnostics: FailureDiagnostics.DETAILED,
  role,
  logGroup,
  vpc,
  vpcSubnets,
  securityGroups,
  localProviderBuild: { projectPath: "rust" },
});
```

After:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources,
  destination: { bucket },
  providerLambda: {
    sharing: ProviderSharing.DEPLOYMENT,
    architecture: Architecture.X86_64,
    memorySize: 2048,
    failureDiagnostics: FailureDiagnostics.DETAILED,
    role,
    logGroup,
    vpc,
    vpcSubnets,
    securityGroups,
    localBuild: { projectPath: "rust" },
  },
});
```

`providerLambda` values configure or identify the Lambda resource. `sharing` deliberately avoids the CDK-overloaded name `scope`, and the former `ProviderScope` enum is now `ProviderSharing`.

### Source processing and transfer tuning

Before:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources,
  destinationBucket: bucket,
  extract: true,
  include: ["*.html", "assets/*"],
  exclude: ["*.map"],
  maxParallelTransfers: 64,
  advancedRuntimeTuning: {
    sourceGetConcurrency: 8,
    destinationWriteRetry: { maxAttempts: 4 },
  },
});
```

After:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources,
  destination: { bucket },
  sourceProcessing: {
    extract: true,
    include: ["*.html", "assets/*"],
    exclude: ["*.map"],
  },
  transfer: {
    maxConcurrency: 64,
    advancedTuning: {
      sourceGetConcurrency: 8,
      destinationWriteRetry: { maxAttempts: 4 },
    },
  },
});
```

Transfer values remain custom-resource request properties. Deployments with different `transfer` settings can share the same compatible provider Lambda. `sourceProcessing.exclude` also prevents matching destination keys from being considered stale unless an include pattern selects them again.

### Lifecycle and CloudFront

The objects retain their canonical shapes; only destination location moves into `destination`.

Before:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources,
  destinationBucket: currentBucket,
  destinationKeyPrefix: "site/current",
  cloudfrontInvalidation: {
    distribution,
    paths: ["/site/*"],
  },
  destinationLifecycle: {
    onDeploy: { deleteStaleObjects: false },
    onChange: {
      deletePreviousObjects: true,
      previousBucket,
      invalidatePreviousDistribution: previousDistribution,
    },
    onDelete: { deleteCurrentObjects: true },
  },
});
```

After:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources,
  destination: {
    bucket: currentBucket,
    keyPrefix: "site/current",
  },
  cloudfrontInvalidation: {
    distribution,
    paths: ["/site/*"],
  },
  destinationLifecycle: {
    onDeploy: { deleteStaleObjects: false },
    onChange: {
      deletePreviousObjects: true,
      previousBucket,
      invalidatePreviousDistribution: previousDistribution,
    },
    onDelete: { deleteCurrentObjects: true },
  },
});
```

Do not use `prune`, `retainOnDelete`, `onChange.deleteObjects`, `onChange.fromBucket`, `onChange.invalidateDistribution`, or `onDelete.deleteObjects`. The explicit stale, previous, and current resource names are permanent safety boundaries.

## From AWS CDK `BucketDeployment`

Shin accepts upstream `ISource` implementations, but it is not API-compatible with `BucketDeployment`. Start with the grouped minimal shape, then map only the behavior you need.

| `BucketDeployment` property | Shin equivalent |
| --- | --- |
| `sources` | `sources` |
| `destinationBucket` | `destination.bucket` |
| `destinationKeyPrefix` | `destination.keyPrefix` |
| `extract`, `include`, `exclude` | `sourceProcessing.extract`, `sourceProcessing.include`, `sourceProcessing.exclude` |
| `memoryLimit` | `providerLambda.memorySize` |
| `role`, `logGroup`, `vpc`, `vpcSubnets`, `securityGroups` | Same field names under `providerLambda` |
| `distribution`, `distributionPaths`, `waitForDistributionInvalidation` | `cloudfrontInvalidation.distribution`, `cloudfrontInvalidation.paths`, `cloudfrontInvalidation.waitForCompletion` |
| `prune` | `destinationLifecycle.onDeploy.deleteStaleObjects` |
| `retainOnDelete` | Configure `destinationLifecycle.onChange.deletePreviousObjects` and `destinationLifecycle.onDelete.deleteCurrentObjects` independently; polarity differs. |
| `outputObjectKeys` | Read `deployment.objectKeys`; the response field is requested lazily. |
| `logRetention` | `providerLambda.logGroup` |
| `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId` | Configure default encryption on `destination.bucket`. |

Shin intentionally does not support upstream per-object metadata, SSE-C, EFS staging, `ephemeralStorageSize`, `signContent`, or arbitrary provider-function replacement. The [README](../README.md#unsupported-properties) explains those boundaries.
