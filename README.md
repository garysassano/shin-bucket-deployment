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

The operational props map closely to the upstream construct, so a deployment that does not configure per-object metadata can usually migrate with this import change:

```diff
-import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
+import { ShinBucketDeployment as BucketDeployment, Source } from "shin-bucket-deployment";
```

See [What It Supports](#what-it-supports) for the intentionally narrow public surface.

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
| Safer destination moves     | Opt-in cleanup deploys new content first, infers the old prefix, and preserves overlapping current namespaces. See [changing a destination safely](docs/architecture.md#changing-a-destination-safely).                                                                                                                                                     |

## Benchmark Snapshots

> [!CAUTION]
> The embedded charts are exploratory single-sample snapshots collected on 2026-07-18 from commit `c6a97be`. They should not be treated as performance guarantees or used to choose production defaults.

The five-repetition methodology-v2 Rust module-refactor decision run is documented in [Benchmark](docs/benchmark.md#rust-module-refactor-performance-decision). Default benchmark reports exclude the historical methodology-v1 snapshot rows and focused decision rows unless they are selected explicitly.

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-1024mib-32.svg" alt="ShinBucketDeployment tiny-many 1024 MiB parallel 32 benchmark" width="100%">

<img src="https://raw.githubusercontent.com/garysassano/shin-bucket-deployment/main/benchmarks/snapshots/tiny-many-2048mib-64.svg" alt="ShinBucketDeployment tiny-many 2048 MiB parallel 64 benchmark" width="100%">

## What It Supports

The construct follows the upstream `BucketDeployment` API where the behavior maps cleanly to the Rust provider.

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

Unsupported upstream props:

| Prop | Reason |
| --- | --- |
| `accessControl`, `cacheControl`, `contentDisposition`, `contentEncoding`, `contentLanguage`, `expires`, `metadata`, `storageClass`, `websiteRedirectLocation` | Object metadata is intentionally outside the deployment contract. Configure cache behavior in CloudFront and storage/lifecycle behavior on the bucket. |
| `contentType` | Shin automatically infers `Content-Type` from each deployed object's file extension, with `application/octet-stream` as the fallback. |
| `serverSideEncryption`, `serverSideEncryptionAwsKmsKeyId`, `serverSideEncryptionCustomerAlgorithm` | Configure default encryption on `destinationBucket`; SSE-C is not supported. |
| `ephemeralStorageSize` | The provider does not stage archives or extracted files in Lambda `/tmp`. |
| `logRetention` | This legacy upstream prop is not exposed; provide `logGroup` with the desired retention policy. |
| `prune` | Replaced by `destinationLifecycle.onDeploy.deleteStaleObjects`. |
| `retainOnDelete` | Replaced by the explicit `destinationLifecycle.onChange` and `destinationLifecycle.onDelete` settings. |
| `signContent` | The provider uses AWS SDK calls directly, not the upstream AWS CLI upload path. |
| `useEfs` | EFS is not needed because the provider streams data with bounded memory instead of staging archives or extracted files on disk. |

## How It Works

### Archive Planning

For `extract=true`, the provider preflights the ZIP end records and central-directory size before parser allocation, reuses those ranged reads during parsing, then walks the archive entries, applies filters, and builds the deployment plan. Entry spans end at the next local header or central-directory start, so archives whose local and central extra-field lengths differ remain valid. Directory `Source.asset` inputs include a compact `.shin/catalog.v1.json` size/MD5 catalog whose exact bytes are authenticated by a SHA-256 digest in the CloudFormation template. Only those template-bound catalogs can enable sparse skips. Central-directory planning and entry data both use the invocation-global source budget in non-overlapping phases. Entry data is read through coalesced source blocks with a bounded per-archive window. Each ranged read has exactly one SDK attempt per Shin attempt: transient transport, timeout, throttling, retryable 5xx, and incomplete-body failures can use the remaining three-total-attempt budget, while permanent 4xx and validation failures stop immediately. Source GET concurrency and the source window are derived from the provider's actual Lambda memory by default. `advancedRuntimeTuning` can lower the shared source budget or override validated local tuning when diagnosing unusual workloads. The provider does not download the whole archive and does not write the archive or extracted entries to Lambda `/tmp`.

For `extract=false`, each source object is copied directly with S3 `CopyObject`. The source `ETag` and destination listing select source and destination preconditions, every provider attempt disables SDK retries, and typed transient failures use the same bounded write policy as extracted uploads. An opaque SHA-256 operation identity is written as `shin-copy-identity` user metadata in the same atomic copy. A conditional conflict or final ambiguous response is accepted only when `HeadObject` finds that exact identity and content length; missing or different evidence fails closed.

### Change Detection

At synthesis, Shin inspects `destinationBucket`'s default encryption rule. Default or `AES256` encryption selects the `sse-s3-etag` strategy. KMS and DSSE select `kms-sha256`. Imported buckets and tokenized, unknown, or multi-rule encryption configurations are rejected because the provider cannot choose a sound strategy from them. An explicit KMS key ID must match the bucket's grantable L2 `encryptionKey`. Customer keys use CDK key grants; AWS-managed S3 key permissions are constrained by account/Region, `alias/aws/s3`, and regional S3 service conditions. No runtime `GetBucketEncryption` request is needed.

Before uploading or copying, the provider lists the destination prefix but retains size and `ETag` metadata only for keys in the deployment manifest. For SSE-S3 destinations, existing marker-free ZIP entries with authenticated catalog MD5s can be skipped from that metadata without reading entry bytes. Untrusted existing entries are read once for MD5 comparison, while missing entries stream directly to S3 without a pre-hash pass. The upload stream calculates MD5 alongside required ZIP validation, so ambiguous writes can reconcile against a single-part destination `ETag` without requesting an additional stored checksum. When `destinationLifecycle.onDeploy.deleteStaleObjects` is enabled and the comparison list finds a stale candidate, a second list after successful transfers deletes stale keys one page at a time instead of retaining the complete stale-key set. That destructive pass first checks bucket ownership tags and retains stale objects if another deployment owns an overlapping namespace.

Marker replacement is simultaneous and non-recursive: the leftmost match wins, the longest token wins at the same position, equal-length ties use lexicographic token order, and replacement values are never searched again. Tokens may cross decompression chunks. A bounded planning pass validates source bytes, calculates exact final length, and determines an SSE-S3 comparison MD5. If upload is needed, a second bounded pass supplies the retryable body; unchanged SSE-S3 marker objects stop after planning.

KMS and DSSE destination `ETag`s are not treated as plaintext MD5. Those destinations bypass catalog/destination MD5 shortcuts and avoid a useless comparison read before upload; authenticated source MD5 is still validated when present. Extracted PUTs request a stored full-object SHA-256 checksum, while `extract=false` objects use direct `CopyObject` without requesting an unused checksum. Content identity is the only skip input; there is no separate old/new object-property identity.

If a conditional PUT retry receives an ambiguous `409` or `412`, SSE-S3 reconciliation requires exact length plus the streamed MD5 as the single-part `ETag`, using an ordinary `HeadObject`. KMS/DSSE reconciliation uses checksum-mode `HeadObject` and requires exact length plus the stored `FULL_OBJECT` SHA-256. Neither path performs ACL reads. Missing evidence or any content mismatch fails closed instead of assuming that a lost response committed the intended object.

Transfer scheduling retains only the configured in-flight task set rather than one handle per object. It drains completions while admitting work; the first observed error or panic stops admission, aborts and drains outstanding tasks, cancels source schedulers, wakes source-block waiters, and prevents stale deletion or CloudFront invalidation from running. Retryable ZIP bodies are lazy, so SDK clones that are never polled do not start decompression, acquire a source reader, or add replay claims.

PUT and COPY always infer `Content-Type` from the deployed object's file extension, falling back to `application/octet-stream`. Other object metadata is left to bucket defaults, bucket policy, lifecycle configuration, and CloudFront cache policy rather than custom-resource properties.

### Memory Model

ZIP entry streaming uses small-buffer defaults: 64 KiB entry read buffers, 256 KiB S3 body chunks, and a 1 MiB body pipe between entry production and the SDK upload body. Marker replacement adds only bounded token carry, a replacement pipe, and one held-back final frame; it does not retain the complete entry or expanded output. With the default 32 parallel marker-free transfers, entry stream buffering is around 44 MiB. Central-directory bytes, parser capacity, decoded metadata, entry records, and prefetched end-record blocks receive a conservative checked estimate and a source-budget permit before parser allocation; malformed entry counts are rejected before allocation.

The provider reads `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` at invocation time. ZIP planning and source block caches use one byte-permit pool that defaults to exactly 50% of that actual memory, or 512 MiB at the default Lambda size. Planning is sequential and releases its permit before transfer block scheduling; authenticated-catalog planning also reserves enough headroom for its source block. `advancedRuntimeTuning.sourceWindowMemoryBudgetMb` can lower this cap but cannot raise it. Each archive still gets an adaptive local window, but pending fetches, in-flight blocks, and ready blocks all hold fair global permits until their claims finish; readers discard consumed byte slices before releasing those permits. Cancellation releases permits and wakes waiters. This prevents multiple source archives from independently multiplying the memory allowance.

Destination planning retains metadata only for manifest keys. When the comparison list finds a stale candidate, cleanup scans and deletes one `ListObjectsV2` page at a time after transfers; destinations without stale candidates avoid that second scan. Destination-side planning memory is proportional to the manifest plus one page of at most 1,000 objects, not every object already under the prefix. The 1024 MiB default was selected from historical exploratory measurements whose methodology is now being revalidated; it is not a performance guarantee.

### Invalidation and Logs

CloudFront invalidation is created after S3 changes when `distribution` is provided. If `distributionPaths` is omitted, the default path is the destination prefix plus `*`, for example `/site/*`.

The provider logs one sanitized `shin_deployment_summary` JSON line per custom-resource request after the CloudFormation callback attempt, plus structured source scheduler and destination `PutObject` or `CopyObject` diagnostics to CloudWatch Logs. Diagnostics schema v3 separates logical scheduled objects, wire attempts, consumed body replays, throttled attempts, cancellations, panics, and true active-reader high-water. It also records authenticated-catalog trust and fallback hashing, deletion SDK calls and inferred outcomes, and callback attempts, retries, failures, and confirmed responses. `deploymentStatus` describes provider work before callback delivery; the callback fields independently show whether the response endpoint returned success. `markerReplacement` reports the strategy, semantics, nominal passes per uploaded object, and actual planning/upload passes. The summary excludes bucket names, object keys, account IDs, distribution IDs, URLs, and ETags. The presigned CloudFormation response URL is removed from transport-error chains, and sensitive Lambda-runtime and callback HTTP trace targets stay capped even when ambient logging requests trace output.

## Limits

### `ETag`-based Skips

The fast destination skip path depends on S3 `ETag` values behaving like MD5 content hashes. Shin uses it only for the default/SSE-S3 strategy and single-request static-object model. KMS and DSSE destinations deliberately transfer without this shortcut because their `ETag`s cannot prove plaintext identity. Multipart or externally written SSE-S3 objects with non-MD5 `ETag`s can cause extra transfers.

### Cataloged `Source.asset` Assets

ZIP entries, including marker-expanded output, stream in bounded chunks. Marker uploads require an exact-length planning pass and a second source pass when upload is needed. Cataloged directory assets currently do not support CDK asset `bundling` or symlink-following options; pass `embeddedCatalog: false` to `Source.asset` to use the upstream CDK asset path for those cases.

- It applies to local directory assets only. Local `.zip` files, `Source.bucket` archives, data sources, and third-party sources remain deployable but cannot declare their catalogs trusted.
- It does not run CDK asset `bundling`. Use your own pre-bundled directory, or pass `embeddedCatalog: false` to delegate packaging to CDK.
- It rejects symlinks and non-regular files instead of following, materializing, or silently dropping them.
- It requires CDK asset staging and delegates ZIP/ZIP64 creation to CDK from a temporary materialized directory.
- It changes the staged ZIP bytes compared with upstream CDK packaging because the catalog entry is added.
- Authenticated catalog MD5s are only used for marker-free destination skips. Every trusted entry is checked against its catalog MD5 in each comparison, upload, or marker pass that reads it.

### Object Size and Scope

Source archives are read with S3 ranges and do not need to fit in Lambda memory or ephemeral storage. Individual files inside the asset ZIP, including marker-expanded output, must be <= 5 GiB because extracted uploads currently use S3 `PutObject`, not multipart upload.

`destinationKeyPrefix` must be a concrete string no longer than 102 characters so Shin can validate the complete S3 ownership-tag key during synthesis. `"/"` and an omitted prefix both select the bucket root and share the same canonical ownership namespace.

Before destination mutation, the provider validates the complete final key against S3's [1024-byte UTF-8 key limit](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html), checks archive and aggregate size arithmetic, and rejects oversized single-request uploads and copies. Marker output size is enforced incrementally during planning, and the upload body withholds its final frame until the second pass validates source CRC/size/catalog integrity and matches the planned length and digest. Earlier independent object writes may already have completed before a later object fails; deployments are not transactional.

This construct targets static asset deployment to S3. It is not a general-purpose sync engine and does not provide byte-range diffing, persistent manifests, or non-S3 backend behavior.

Deployments in the same CDK stack share one provider Lambda by default when their handler settings match. The shared role accumulates permissions from every source, destination, KMS key, lifecycle transition, and CloudFront distribution used by those deployments. Handler settings such as `memoryLimit`, the package version, and the exact prebuilt provider archive participate in the identity, so incompatible package/provider copies cannot silently reuse whichever handler was synthesized first. `advancedRuntimeTuning` is carried in each custom-resource request and can differ between deployments that share a handler.

Set `shareHandler: false` to create the provider beneath one deployment construct. With construct-generated resources, that deployment receives its own function, role, and log destination, preventing permission accumulation and reducing the mutation blast radius. Isolation creates more CloudFormation resources and gives each function an independent cold-start lifecycle; operational cost follows their separate invocations, logs, and any caller-configured provisioned concurrency. A caller-supplied `role` or `logGroup` remains caller-owned and can intentionally reintroduce sharing.

Package or provider identity changes replace the shared handler by design. During that handoff, the destination bucket receives the new custom-resource generation's ownership tag before CloudFormation deletes the old generation, so the old handler retains the overlapping live namespace even when `onDelete.deleteObjects` is enabled. The release introducing package-aware identity performs this handoff once for each legacy shared handler.

## Development

To rebuild the Rust provider binaries or use a local checkout in your CDK app, see [Building from source](docs/building-from-source.md). Deeper implementation, evidence, and correctness details live in [Architecture](docs/architecture.md), [Benchmark](docs/benchmark.md), and [Verification](docs/verification.md).
