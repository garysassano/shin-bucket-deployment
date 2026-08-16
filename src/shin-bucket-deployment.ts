import {
  type AssetHashType,
  type BundlingFileAccess,
  type BundlingOutput,
  type CfnTag,
  CustomResource,
  type DockerImage,
  type DockerVolume,
  type ILocalBundling,
  Lazy,
  Stack,
  Tags,
  Token,
  Validations,
} from "aws-cdk-lib";
import type { IDistributionRef } from "aws-cdk-lib/aws-cloudfront";
import type { ISecurityGroup, IVpc, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import type { IRole } from "aws-cdk-lib/aws-iam";
import type { Architecture, Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import type { ILogGroupRef } from "aws-cdk-lib/aws-logs";
import { Bucket, type IBucket } from "aws-cdk-lib/aws-s3";
import type { ISource, SourceConfig } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { DEFAULT_MAX_COMPRESSION_RATIO, DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES } from "./defaults";
import {
  destinationVersioningWarnings,
  inspectableDestinationBucketResource,
  validateDestinationEncryption,
} from "./destination";
import type { DestinationWriteRetryJitter, FailureDiagnostics } from "./enums";
import { ProviderSharing } from "./enums";
import { ValidationError } from "./errors";
import { grantDestinationPermissions } from "./iam";
import { PROVIDER_TIMEOUT, type ProviderLambdaConfig, getOrCreateHandler } from "./provider";
import {
  sourceCatalogs,
  sourceConfigEqual,
  sourceMarkers,
  sourceMarkersConfig,
} from "./source-config";
import { destinationOwnerPrefix, validateDeploymentProps } from "./validation";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";
// S3 caps each bucket's tag set at 50 user-defined tags:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/tagging.html
const MAX_S3_BUCKET_TAGS = 50;

export interface ShinBucketDeploymentBundlingCommandHooks {
  /**
   * Commands to run before the Cargo Lambda bundling commands, inside the
   * bundling environment.
   *
   * Use for build prerequisites that must run where the compile happens,
   * such as vendoring dependencies or generating source files. The returned
   * commands run in the same Docker container or local environment as the
   * build itself.
   */
  beforeBundling(inputDir: string, outputDir: string): string[];

  /**
   * Commands to run after the Cargo Lambda bundling commands, inside the
   * bundling environment.
   *
   * Use for post-build steps, for example copying extra files into the
   * output directory before the compiled asset is packaged.
   */
  afterBundling(inputDir: string, outputDir: string): string[];
}

export interface ShinBucketDeploymentBundlingDockerOptions {
  /**
   * The entrypoint to run in the Docker container.
   *
   * Override it when the bundling image's default entrypoint would consume
   * the build command instead of running it.
   *
   * @default - run the entrypoint defined in the image
   */
  readonly entrypoint?: string[];

  /**
   * The command to run in the Docker container.
   *
   * Override it to change how the provider compile is invoked.
   *
   * @default - a cargo lambda compilation
   */
  readonly command?: string[];

  /**
   * Additional Docker volumes to mount.
   *
   * Use them to share toolchain caches or credentials into the bundling
   * container.
   *
   * @default - no additional volumes are mounted
   */
  readonly volumes?: DockerVolume[];

  /**
   * Where to mount the specified volumes from.
   *
   * Use it to reuse volumes from the specified Docker containers.
   *
   * @default - no containers are specified to mount volumes from
   */
  readonly volumesFrom?: string[];

  /**
   * Working directory inside the Docker container.
   * @default /asset-input
   */
  readonly workingDirectory?: string;

  /**
   * The user to use when running the Docker container.
   * @default - uid:gid of the current user or 1000:1000 on Windows
   */
  readonly user?: string;

  /**
   * Local bundling provider.
   *
   * Supply one to run the compile on the host instead of in Docker.
   *
   * @default - local cargo-lambda when available, otherwise Docker
   */
  readonly local?: ILocalBundling;

  /**
   * The type of output that this bundling operation is producing.
   * @default BundlingOutput.AUTO_DISCOVER
   */
  readonly outputType?: BundlingOutput;

  /**
   * Security configuration when running the Docker container.
   * @default - no security options
   */
  readonly securityOpt?: string;

  /**
   * Docker networking options.
   * @default - no networking options
   */
  readonly network?: string;

  /**
   * The access mechanism used to exchange files with the bundling container.
   * @default BundlingFileAccess.BIND_MOUNT
   */
  readonly bundlingFileAccess?: BundlingFileAccess;
}

export interface ShinBucketDeploymentBundlingOptions {
  /**
   * Environment variables defined when Cargo runs.
   *
   * Use them to pass build-time configuration to the provider crate during
   * compilation.
   *
   * @default - no environment variables are defined
   */
  readonly environment?: Record<string, string>;

  /**
   * Force bundling in a Docker container even if local bundling is possible.
   *
   * Set this when the local environment lacks the Rust toolchain or must not
   * be used, for example on a sandboxed build host.
   *
   * @default false
   */
  readonly forcedDockerBundling?: boolean;

  /**
   * A custom bundling Docker image.
   *
   * Set it to pin or replace the local compile helper image, for example when
   * a specific cargo-lambda release is required.
   *
   * @default - local compile helper default image
   */
  readonly dockerImage?: DockerImage;

  /**
   * Additional options when using Docker bundling.
   * @default - local compile helper defaults
   */
  readonly dockerOptions?: ShinBucketDeploymentBundlingDockerOptions;

  /**
   * Determines how the asset hash is calculated.
   *
   * The hash decides whether a provider source change rebuilds and re-uploads
   * the compiled asset. When `assetHash` is also specified, the effective
   * default is `CUSTOM`.
   *
   * @default AssetHashType.OUTPUT
   */
  readonly assetHashType?: AssetHashType;

  /**
   * Specify a custom hash for this asset.
   *
   * Supply one to pin the compiled provider asset to a fixed hash, for
   * example in reproducible builds. You must update it whenever the provider
   * sources change, or the changed asset may not be re-uploaded.
   *
   * @default - based on `assetHashType`
   */
  readonly assetHash?: string;

  /**
   * Command hooks.
   *
   * Use them to run extra steps before or after the compile inside the
   * bundling environment.
   *
   * @default - do not run additional commands
   */
  readonly commandHooks?: ShinBucketDeploymentBundlingCommandHooks;

  /**
   * Additional flags to pass to `cargo lambda build`.
   *
   * @default - no additional flags
   */
  readonly cargoLambdaFlags?: string[];

  /**
   * Cargo build profile.
   *
   * Change it to a faster-iterating profile such as `dev` during local
   * development of the provider.
   *
   * @default "release"
   */
  readonly profile?: string;
}

/**
 * Local compilation settings for the Rust provider.
 *
 * Providing this object opts out of the prebuilt provider shipped with the
 * package. Most consumers should leave it unset.
 */
export interface ShinBucketDeploymentLocalBuildOptions {
  /**
   * Rust provider project directory.
   *
   * Required when the provider sources are not discoverable from the
   * package's default locations, which is the case for installed packages:
   * the lookup finds `rust` only in the repository layout.
   *
   * @default - the repository's `rust` directory when available
   */
  readonly projectPath?: string;

  /**
   * Options passed to the local provider compile path.
   *
   * The provider uses `providerLambda.architecture` as the single architecture
   * setting.
   *
   * @default - local compile helper defaults
   */
  readonly bundling?: ShinBucketDeploymentBundlingOptions;
}

export interface ShinBucketDeploymentDestinationWriteRetryTuning {
  /**
   * Maximum provider-owned destination write attempts per object.
   * Applies to both `PutObject` and `CopyObject`.
   * Must be in the inclusive range 1..10.
   *
   * Increase it when the destination recovers slowly from transient
   * failures; decrease it when a failing deployment should surface faster.
   *
   * @default 6
   */
  readonly maxAttempts?: number;

  /**
   * Base retry delay for non-throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000 and no greater than `maxDelayMs`.
   *
   * Raise it to reduce request volume between attempts; lower it to retry
   * sooner.
   *
   * @default 250
   */
  readonly baseDelayMs?: number;

  /**
   * Maximum retry delay for non-throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000.
   *
   * The upper bound of the same backoff; keep it at least as large as
   * `baseDelayMs`.
   *
   * @default 5000
   */
  readonly maxDelayMs?: number;

  /**
   * Base retry delay for throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000 and no greater than
   * `slowdownMaxDelayMs`.
   *
   * Raise it when the destination throttles frequently and needs more time
   * between attempts.
   *
   * @default 1000
   */
  readonly slowdownBaseDelayMs?: number;

  /**
   * Maximum retry delay for throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000.
   *
   * The upper bound of the throttling backoff; keep it at least as large as
   * `slowdownBaseDelayMs`.
   *
   * @default 30000
   */
  readonly slowdownMaxDelayMs?: number;

  /**
   * Jitter mode applied to computed destination write retry delays.
   *
   * `FULL` randomizes each delay between zero and the calculated backoff,
   * spreading concurrent retries; `NONE` keeps deterministic delays.
   *
   * @default DestinationWriteRetryJitter.FULL
   */
  readonly jitter?: DestinationWriteRetryJitter;
}

/**
 * Low-level provider controls intended for diagnostics and measured tuning.
 *
 * @experimental These settings may change as the provider's adaptive defaults
 * evolve. Most deployments should use `providerLambda.memorySize` and
 * `transfer.maxConcurrency` instead.
 */
export interface ShinBucketDeploymentAdvancedTransferTuning {
  /**
   * Source ranged-read block size in bytes.
   *
   * Must be at least 30 bytes so ZIP local file headers can fit in one source
   * block, and must fit the invocation-global source memory budget both alone
   * and when multiplied by `sourceGetConcurrency`.
   *
   * Larger blocks can reduce the ranged-GET count for contiguous or nearby
   * spans; smaller blocks limit coalescing and overfetch. Spans are exact and
   * are only merged when the gap fits `sourceBlockMergeGapBytes` and the
   * combined range fits the block size, so spans further apart than the merge
   * gap are unaffected by this setting.
   *
   * @default 8 MiB
   */
  readonly sourceBlockBytes?: number;

  /**
   * Maximum gap in bytes to coalesce between adjacent source ranges.
   *
   * Raise it to merge fragmented plans into fewer blocks; lower it to avoid
   * fetching large gaps of unneeded bytes.
   *
   * @default 256 KiB
   */
  readonly sourceBlockMergeGapBytes?: number;

  /**
   * Maximum concurrent ranged GetObject requests per source archive.
   * Must be in the inclusive range 1..64.
   *
   * The derived default scales with provider Lambda memory: one slot per
   * 256 MiB, clamped between 1 and 8. Raising it may help when fetches have
   * high round-trip latency, but benchmark the workload rather than assuming
   * it; block size times concurrency must fit the invocation-global source
   * budget.
   *
   * @default - derived from the provider Lambda memory size
   */
  readonly sourceGetConcurrency?: number;

  /**
   * Resident source block window size in bytes per source archive.
   * This local window must fit the invocation-global source memory budget.
   *
   * The window bounds how far ahead the scheduler prefetches blocks for one
   * archive; raise it to let a large archive prefetch further ahead, lower it
   * to leave more of the shared budget to concurrent archives.
   *
   * @default - derived from the provider Lambda memory size and source archive shape
   */
  readonly sourceWindowBytes?: number;

  /**
   * Optional lower invocation-global budget, in MiB, shared fairly by source
   * archive windows. It cannot exceed 50% of the provider's actual Lambda
   * memory.
   *
   * The budget bounds resident source-phase *memory*, not just bytes streamed.
   * Block windows, central-directory planning, and embedded-catalog processing
   * are all charged against it using conservative estimates of their decoded
   * size, so it constrains how much the provider holds resident at once rather
   * than how much it reads overall. It is an accounting bound over those
   * estimates, not an allocator-level hard limit: small fixed working buffers
   * and allocator overhead sit outside it.
   *
   * Lowering this can make a deployment that previously worked fail during
   * planning with an explicit budget error — most likely on a source archive
   * with a large trusted catalog, whose processing needs several times the
   * catalog's own size. Raise `providerLambda.memorySize`, or this value, if
   * that happens.
   *
   * @default - 50% of the provider Lambda memory size
   */
  readonly sourceWindowMemoryBudgetMiB?: number;

  /**
   * Destination `PutObject` and `CopyObject` retry/backoff tuning.
   * @default - provider defaults
   */
  readonly destinationWriteRetry?: ShinBucketDeploymentDestinationWriteRetryTuning;
}

/**
 * Current S3 destination location.
 *
 * The bucket and key prefix that receive the deployed objects, and the
 * namespace covered by the lifecycle cleanup options.
 */
export interface ShinBucketDeploymentDestination {
  /**
   * Bucket that receives the deployed objects.
   *
   * Change it to deploy into a different bucket; a bucket change during an
   * Update is a destination change handled by
   * `destinationLifecycle.onChange`.
   *
   * Shin inspects the synthesized bucket encryption configuration to select
   * the cheapest sound conditional-write reconciliation strategy. Imported or
   * otherwise uninspectable buckets are rejected.
   *
   * Each deployment consumes one bucket ownership tag. Amazon S3 permits 50
   * total bucket tags; bucket, stack, aspect, auto-delete, and other Shin
   * deployment tags all share that quota. Synthesis fails when the final
   * deduplicated tag set exceeds the limit.
   */
  readonly bucket: Bucket;

  /**
   * S3 key prefix under which objects are deployed.
   *
   * This must be a concrete string no longer than 94 characters. `"/"` and
   * an omitted value both select the bucket root. Because Shin embeds this
   * prefix in its S3 ownership tag, it may contain only Unicode letters,
   * numbers, whitespace, or `_ . : / = + - @`.
   *
   * @default - the bucket root
   */
  readonly keyPrefix?: string;
}

/** Extraction and object-selection behavior for the ordered sources. */
export interface ShinBucketDeploymentSourceProcessingOptions {
  /**
   * Extract ZIP source contents instead of copying source archives as objects.
   *
   * Set `false` when the source ZIP itself must arrive at the destination
   * intact rather than as its extracted contents.
   *
   * @default true
   */
  readonly extract?: boolean;

  /**
   * Maximum uncompressed size in bytes of one extracted ZIP entry.
   *
   * The provider rejects an archive during source planning when any regular
   * entry exceeds this limit. Copy mode (`extract: false`) is unaffected.
   *
   * Raise it to accept larger entries; lower it to reject oversized entries
   * earlier during planning.
   *
   * @default DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES (1073741824)
   */
  readonly maxUncompressedEntryBytes?: number;

  /**
   * Maximum ratio of uncompressed to compressed bytes for one extracted ZIP
   * entry. For example, `100` permits an entry that expands to exactly 100
   * times its compressed size.
   *
   * The provider rejects non-empty entries with zero compressed bytes. Empty
   * entries are valid. Copy mode (`extract: false`) is unaffected.
   *
   * Raise it to admit highly compressible entries; lower it to reject
   * archives that expand more than a fixed factor.
   *
   * @default DEFAULT_MAX_COMPRESSION_RATIO (100)
   */
  readonly maxCompressionRatio?: number;

  /**
   * Include matching source-relative object paths.
   *
   * Include patterns take precedence over matching exclude patterns.
   *
   * Use them to deploy only a subset of the source-relative paths, for
   * example a single subdirectory of the archive.
   *
   * @default - include all paths not excluded
   */
  readonly include?: string[];

  /**
   * Exclude matching source-relative object paths.
   *
   * Excluded destination keys are also outside the stale-object deletion scope
   * controlled by `destinationLifecycle.onDeploy.deleteStaleObjects`, unless an
   * include pattern selects them again.
   *
   * Use them to drop specific paths from the deployment, for example
   * environment-specific or local-only files.
   *
   * @default - exclude no paths
   */
  readonly exclude?: string[];
}

/** Backing provider Lambda resource, sharing, build, and diagnostics settings. */
export interface ShinBucketDeploymentProviderLambdaOptions {
  /**
   * Sharing and isolation behavior for the provider Lambda.
   *
   * `ProviderSharing.STACK` reuses one Lambda for deployments with the same
   * provider configuration. `ProviderSharing.DEPLOYMENT` creates a
   * deployment-scoped function and generated role, preventing permissions from
   * other deployments from accumulating on them. Explicit `role` and
   * `logGroup` values remain caller-owned and can still be shared intentionally.
   *
   * Isolation creates more Lambda, role, and log resources and gives each
   * deployment an independent cold-start lifecycle.
   *
   * Choose `ProviderSharing.DEPLOYMENT` when deployments in the same stack
   * must not accumulate permissions on one shared role, for example when
   * they need distinct trust or ownership boundaries.
   *
   * @default ProviderSharing.STACK
   */
  readonly sharing?: ProviderSharing;

  /**
   * Lambda architecture for the Rust provider.
   *
   * Change it to run the provider on x86_64 instead of arm64, for example to
   * match an account or tooling constraint; prebuilt binaries ship for both
   * architectures.
   *
   * @default Architecture.ARM_64
   */
  readonly architecture?: Architecture;

  /**
   * Memory allocated to the provider Lambda, in MiB.
   *
   * The provider derives its invocation-global source-block budget from the
   * actual Lambda memory and caps it at 50%. Memory is part of the handler
   * identity, so sharing deployments using a different value select a distinct
   * provider. A deployment-scoped provider updates this setting in place.
   * Must be in the inclusive range 128..10240.
   *
   * The default pairs with `transfer.maxConcurrency` of 64. That combination
   * measured 31-44% faster cold-create than 1024 MiB with 32 transfers on
   * every canonical benchmark profile, at a peak usage well under either
   * allocation. Lower it for cost-sensitive deployments that tolerate slower
   * deploys; Lambda bills memory x duration, and the faster configuration is
   * not always the cheaper one.
   *
   * @default DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB (2048)
   */
  readonly memorySize?: number;

  /**
   * Failure diagnostics mode for destination `PutObject` attempts.
   *
   * `FailureDiagnostics.DETAILED` records body progress and instantaneous
   * source pressure, emits an immediate sanitized failure event, and includes
   * bounded failure groups in the final deployment summary. This adds
   * bookkeeping to streamed uploads and is intended for diagnostics rather
   * than normal production operation.
   *
   * This setting is part of the shared-handler identity, so deployments using
   * different values do not share a Lambda function.
   *
   * @default DEFAULT_FAILURE_DIAGNOSTICS (FailureDiagnostics.STANDARD)
   */
  readonly failureDiagnostics?: FailureDiagnostics;

  /**
   * Existing execution role for the provider Lambda.
   *
   * Deployments with the same provider configuration share a handler and role
   * by default. Source, destination, and CloudFront permissions from every
   * sharing deployment accumulate on that role. A caller-supplied role remains
   * caller-owned even with `sharing: ProviderSharing.DEPLOYMENT`.
   *
   * For a role this construct creates, deployment ordering is guaranteed: the
   * custom resource resolves the handler's ARN, and the handler is ordered after
   * the role's default policy, so the grants are in place before the provider
   * runs.
   *
   * That guarantee does not extend to an imported role. `Role.fromRoleArn` and
   * similar produce a construct outside this stack's dependency graph, so
   * CloudFormation cannot order the custom resource after policy changes made
   * elsewhere. Ensure an imported role already carries the required source,
   * destination, and CloudFront permissions before the deployment runs, or
   * the provider can start and fail with AccessDenied.
   *
   * @default - a role is created for the provider
   */
  readonly role?: IRole;

  /**
   * Log group used by the provider Lambda.
   *
   * Supply one to configure retention or encryption, or to reuse an existing
   * group. Shin does not manage the group's removal policy, which stays
   * caller- and CDK-controlled.
   *
   * @default - a default log group created by Lambda
   */
  readonly logGroup?: ILogGroupRef;

  /**
   * VPC containing the provider Lambda.
   *
   * Use one when the provider must run inside a private network boundary.
   * A VPC alone does not make S3 reachable: routing, endpoints or NAT, and
   * security rules remain the caller's responsibility.
   *
   * @default - no VPC
   */
  readonly vpc?: IVpc;

  /**
   * VPC subnet selection.
   *
   * Choose specific subnets when the VPC spans multiple availability zones or
   * mixes public and private subnets.
   *
   * @default - the VPC default selection
   */
  readonly vpcSubnets?: SubnetSelection;

  /**
   * Security groups attached to the provider Lambda.
   *
   * Supply existing groups to reuse their egress rules; without a VPC,
   * security groups have no effect.
   *
   * @default - create a dedicated group when a VPC is configured
   */
  readonly securityGroups?: ISecurityGroup[];

  /**
   * Local Rust provider compilation.
   *
   * Use it to compile the provider from a local checkout instead of the
   * prebuilt binary, for example while developing the provider itself.
   *
   * @default - the prebuilt provider binary shipped with the package
   */
  readonly localBuild?: ShinBucketDeploymentLocalBuildOptions;
}

/** Request-scoped transfer execution controls. */
export interface ShinBucketDeploymentTransferOptions {
  /**
   * Maximum concurrent logical object transfers run by the provider.
   * Must be in the inclusive range 1..256.
   *
   * The limit bounds the continuously drained set of comparison/hash,
   * upload, and copy tasks, not a throughput target. Raise it to let more
   * objects proceed in parallel; lower it to reduce peak memory and
   * destination request pressure.
   *
   * Values above 64 produce a synthesis warning. Measurements found that 128
   * slowed cold-create at both 1024 MiB and 2048 MiB because the source
   * pipeline did not feed the additional transfer tasks. Benchmark the actual
   * workload before acknowledging the warning; 64 is guidance, not a
   * universal optimum.
   *
   * @default DEFAULT_TRANSFER_MAX_CONCURRENCY (64)
   */
  readonly maxConcurrency?: number;

  /**
   * Low-level request-scoped controls intended for measured tuning and support.
   * Most deployments should leave this unset and use
   * `providerLambda.memorySize` plus `maxConcurrency` as the public
   * controls.
   *
   * @experimental These settings may change as adaptive defaults evolve.
   * @default - adaptive provider defaults
   */
  readonly advancedTuning?: ShinBucketDeploymentAdvancedTransferTuning;
}

/**
 * CloudFront invalidation performed after a successful deployment.
 */
export interface ShinBucketDeploymentCloudFrontInvalidation {
  /**
   * CloudFront distribution whose cached content should be invalidated.
   *
   * Set it to invalidate the distribution that serves the destination
   * objects after each successful deployment. When a destination change
   * replaces the distribution, this is the current distribution that is
   * invalidated alongside the previous one.
   */
  readonly distribution: IDistributionRef;

  /**
   * Distribution paths to invalidate.
   *
   * A concrete list must contain at least one path, at most 3,000 non-wildcard
   * paths, and at most 15 wildcard paths (a path whose final character is
   * `*`). CloudFront documents these as separate quotas: 3,000 files per
   * invalidation request excluding wildcard invalidations, and 15 active
   * wildcard invalidations per distribution; the 15-wildcard cap per request is
   * the synthesis-time proxy for the latter, which is runtime service state.
   * Every concrete path must start with `/`, contain at most 4,000 Unicode
   * characters, and contain no control characters.
   *
   * Paths must not contain `~`, in either its literal or percent-encoded form.
   * CloudFront does not support that character for invalidations, so such a path
   * would be accepted and then silently invalidate nothing; it is rejected at
   * synthesis instead.
   *
   * `*` acts as a wildcard only as the final character of a path. Anywhere else
   * CloudFront matches it literally.
   *
   * @default - the destination prefix followed by `*`
   */
  readonly paths?: string[];

  /**
   * Wait for the invalidation to complete before finishing the deployment.
   *
   * Waiting makes the resource signal success only once CloudFront reports the
   * invalidation `Completed`, so a dependent resource never observes stale edge
   * content. The trade-off is that an invalidation still in progress when the
   * provider runs out of polling budget fails the custom resource even though
   * every object was deployed and the invalidation was successfully created.
   * Shin stops polling at that point; it does not cancel the invalidation, whose
   * outcome is then CloudFront's to determine. CloudFormation reacts to the
   * failure as it would to any other, which for an Update generally means
   * rolling back to the previous content and invalidating again.
   *
   * Set this to `false` when a slow invalidation should not be able to fail an
   * otherwise successful deployment; the deployment then completes as soon as
   * the invalidation has been created.
   *
   * @default true
   */
  readonly waitForCompletion?: boolean;
}

/**
 * Cleanup behavior for the destination namespace and its CloudFront cache.
 *
 * The bucket and CloudFront distribution resources themselves are never
 * deleted.
 */
export interface ShinBucketDeploymentDestinationLifecycle {
  /**
   * Cleanup performed while deploying the current sources on Create or Update.
   *
   * @default - stale-object deletion enabled
   */
  readonly onDeploy?: {
    /**
     * Delete objects in the current destination namespace that are absent from
     * the deployment plan. An overlapping namespace owned by another Shin
     * deployment retains stale objects rather than risking co-tenant deletion.
     * `sourceProcessing.exclude` also removes matching keys from this stale
     * deletion scope unless an include pattern selects them again.
     *
     * Set `false` to keep objects that are no longer produced by the sources,
     * for example when the namespace also holds content managed outside this
     * deployment.
     *
     * @default true
     */
    readonly deleteStaleObjects?: boolean;
  };

  /**
   * Cleanup performed after the destination bucket, prefix, or distribution
   * changes during an Update.
   *
   * @default - retain the previous namespace and do not invalidate a separate
   * previous distribution
   */
  readonly onChange?: {
    /**
     * Delete objects from the previous destination namespace.
     *
     * CloudFormation supplies the previous prefix through
     * `OldResourceProperties`.
     * For a child-to-parent move, cleanup preserves previous-child keys that
     * remain in the current deployment plan.
     *
     * Because that previous prefix is not known until the Update event arrives,
     * enabling this grants the provider role `s3:ListBucket`,
     * `s3:GetBucketTagging`, and `s3:DeleteObject` across the *whole* previous
     * bucket rather than a single prefix. The provider itself derives the actual
     * prefix from the Update event and confines deletion to that namespace, but
     * the IAM grant is bucket-wide and is inherited by every deployment sharing
     * the handler role — synthesis emits an acknowledgeable warning
     * recommending `ProviderSharing.DEPLOYMENT` for exactly this case. Turn the
     * option back off after the destination change if that authority is no
     * longer needed.
     *
     * Enable it only across the Update that changes the destination; leave it
     * off otherwise so the bucket-wide delete grant is not granted needlessly.
     *
     * @default false
     */
    readonly deletePreviousObjects?: boolean;

    /**
     * Previous destination bucket containing the objects to delete when the
     * destination bucket changes.
     *
     * Omit this for same-bucket prefix changes. Requires
     * `deletePreviousObjects=true`.
     *
     * Provide it only when the destination moves to a different bucket and the
     * previous bucket's objects must be removed.
     *
     * @default - the current destination bucket
     */
    readonly previousBucket?: IBucket;

    /**
     * Invalidate the previous CloudFront distribution after its cached content
     * changes.
     *
     * Provide this only when the distribution changed. An unchanged current
     * distribution is invalidated automatically.
     *
     * Set it when the destination distribution changed, so the previous
     * distribution's cached content is invalidated too.
     *
     * @default - no separate previous distribution
     */
    readonly invalidatePreviousDistribution?: IDistributionRef;
  };

  /**
   * Cleanup performed when CloudFormation deletes the custom resource.
   *
   * @default - retain current objects
   */
  readonly onDelete?: {
    /**
     * Delete objects from the current destination namespace.
     *
     * With an omitted `destination.keyPrefix` or `/`, the namespace is the
     * whole bucket and synthesis emits an acknowledgeable warning.
     *
     * Set `true` to remove the deployed objects when the custom resource is
     * deleted. This is the construct's option for removing current deployed
     * objects on Delete; bucket lifecycle rules or other actors can also
     * remove them.
     *
     * @default false
     */
    readonly deleteCurrentObjects?: boolean;
  };
}

/**
 * Construction properties for `ShinBucketDeployment`.
 *
 * The following fragment assumes `this` is a `Construct` scope and that
 * `Bucket`, `Source`, and `ShinBucketDeployment` are imported; the class
 * documentation shows the complete form. It overrides both tuning knobs away
 * from their defaults, which is only worth doing after benchmarking.
 *
 * @example
 * new ShinBucketDeployment(this, "DeployWebsite", {
 *   sources: [Source.asset("dist")],
 *   destination: {
 *     bucket: new Bucket(this, "WebsiteBucket"),
 *     keyPrefix: "site",
 *   },
 *   providerLambda: { memorySize: 3072 },
 *   transfer: { maxConcurrency: 48 },
 * });
 */
export interface ShinBucketDeploymentProps {
  /**
   * Sources deployed in array order. Later sources replace earlier sources
   * with the same destination key.
   *
   * Any upstream CDK `ISource` is accepted. Shin's `Source.asset` adds an
   * authenticated catalog to local directories by default; other source
   * implementations use the normal streamed validation path.
   *
   * At least one source must be present by synthesis. The array may be empty
   * during construction when sources are added later through `addSource()`.
   */
  readonly sources: ISource[];

  /**
   * S3 bucket and key prefix that receive the deployed objects.
   *
   * The bucket must be inspectable at synthesis: imported buckets and
   * otherwise uninspectable configurations are rejected.
   */
  readonly destination: ShinBucketDeploymentDestination;

  /**
   * Extraction and object-selection behavior.
   *
   * @default - extract all source content without path filters
   */
  readonly sourceProcessing?: ShinBucketDeploymentSourceProcessingOptions;

  /**
   * Backing Lambda resource, sharing, build, and diagnostics configuration.
   *
   * @default - shared prebuilt arm64 provider using 2048 MiB and standard diagnostics
   */
  readonly providerLambda?: ShinBucketDeploymentProviderLambdaOptions;

  /**
   * Request-scoped transfer execution controls.
   *
   * @default - adaptive provider defaults with at most 64 logical transfers
   */
  readonly transfer?: ShinBucketDeploymentTransferOptions;

  /**
   * CloudFront invalidation performed after a successful deployment.
   *
   * @default - do not invalidate a distribution
   */
  readonly cloudfrontInvalidation?: ShinBucketDeploymentCloudFrontInvalidation;

  /**
   * Cleanup behavior for deployments, destination changes, and deletion.
   *
   * Cleanup deletes objects, never bucket or distribution resources. Previous
   * buckets and changed distributions require the explicit `onChange`
   * authorization fields so the shared provider receives the necessary IAM
   * permissions. Object changes are not transactional across a deployment.
   *
   * @default - delete stale objects during deployment, retain previous objects
   * after destination changes, and retain current objects on Delete
   */
  readonly destinationLifecycle?: ShinBucketDeploymentDestinationLifecycle;
}

/**
 * Rust-backed alternative to `BucketDeployment`.
 *
 * By default the provider runs a prebuilt Rust `bootstrap` from an archive
 * shipped with the package, so consumers do not need a Rust toolchain. Passing
 * `providerLambda.localBuild` opts into compiling the provider locally.
 *
 * By default, deployments with the same handler identity settings in one stack
 * reuse a single Lambda function. Its role accumulates permissions for every
 * source, destination, and CloudFront distribution used by those
 * deployments. `providerLambda` settings and the package/provider identity
 * participate in shared identity; request-level `transfer` settings do not and
 * can differ between sharing deployments. Set
 * `providerLambda.sharing: ProviderSharing.DEPLOYMENT` for a deployment-scoped
 * function and generated role.
 *
 * @example
 * import { Bucket } from "aws-cdk-lib/aws-s3";
 * import { Construct } from "constructs";
 * import { ShinBucketDeployment, Source } from "shin-bucket-deployment";
 *
 * export class StaticSite extends Construct {
 *   constructor(scope: Construct, id: string) {
 *     super(scope, id);
 *
 *     new ShinBucketDeployment(this, "DeployWebsite", {
 *       sources: [Source.asset("dist")],
 *       destination: {
 *         bucket: new Bucket(this, "WebsiteBucket"),
 *         keyPrefix: "site",
 *       },
 *     });
 *   }
 * }
 */
export class ShinBucketDeployment extends Construct {
  private readonly cr: CustomResource;
  private readonly destinationBucket: Bucket;
  private readonly sources: SourceConfig[];
  private readonly boundSources: ISource[];
  private _deployedBucket?: IBucket;
  private requestDestinationArn = false;
  private requestObjectKeys = false;

  /**
   * Execution role of the custom-resource Lambda function.
   *
   * With the default shared handler, permissions from every sharing deployment
   * accumulate here. An isolated deployment gets a generated role of its own
   * unless `providerLambda.role` explicitly supplies a caller-owned role.
   */
  public readonly handlerRole: IRole;

  /**
   * The backing Rust Lambda function.
   *
   * This is shared by default and deployment-scoped when
   * `providerLambda.sharing` is `ProviderSharing.DEPLOYMENT`.
   */
  public readonly handlerFunction: LambdaFunction;

  constructor(scope: Construct, id: string, props: ShinBucketDeploymentProps) {
    super(scope, id);
    validateDeploymentProps(this, props);
    const destination = props.destination;
    const sourceProcessing = props.sourceProcessing ?? {};
    const providerLambda = props.providerLambda ?? {};
    const transfer = props.transfer ?? {};
    const advancedTuning = transfer.advancedTuning ?? {};
    const destinationWriteRetryTuning = advancedTuning.destinationWriteRetry ?? {};
    const providerLambdaConfig: ProviderLambdaConfig = {
      sharing: providerLambda.sharing,
      architecture: providerLambda.architecture,
      memorySize: providerLambda.memorySize,
      failureDiagnostics: providerLambda.failureDiagnostics,
      role: providerLambda.role,
      logGroup: providerLambda.logGroup,
      vpc: providerLambda.vpc,
      vpcSubnets: providerLambda.vpcSubnets,
      securityGroups: providerLambda.securityGroups,
      localBuild: providerLambda.localBuild,
    };

    this.destinationBucket = destination.bucket;
    const destinationBucketResource = inspectableDestinationBucketResource(
      this,
      this.destinationBucket,
    );
    const deletePreviousObjectsOnChange =
      props.destinationLifecycle?.onChange?.deletePreviousObjects === true;
    const previousBucket = deletePreviousObjectsOnChange
      ? (props.destinationLifecycle?.onChange?.previousBucket ?? this.destinationBucket)
      : undefined;
    const previousDistribution =
      props.destinationLifecycle?.onChange?.invalidatePreviousDistribution;
    const deleteCurrentObjectsOnDelete =
      props.destinationLifecycle?.onDelete?.deleteCurrentObjects === true;
    const deleteStaleObjectsOnDeploy =
      props.destinationLifecycle?.onDeploy?.deleteStaleObjects ?? true;

    if (providerLambda.vpc) {
      this.node.addDependency(providerLambda.vpc);
    }

    this.handlerFunction = getOrCreateHandler(this, providerLambdaConfig);

    const handlerRole = this.handlerFunction.role;
    if (!handlerRole) {
      throw new ValidationError(
        "ShinBucketDeploymentHandlerRole",
        "lambda.Function should have created a Role",
        this,
      );
    }
    this.handlerRole = handlerRole;

    // Track the original source objects as they are bound. `addSource` uses this
    // to skip binding an identical source object again: binding materializes
    // catalogs and creates `Asset` constructs, so a duplicate that is later
    // dropped by the config-equality dedup would leave orphan staged assets.
    this.boundSources = [...props.sources];
    this.sources = props.sources.map((source: ISource) =>
      source.bind(this, { handlerRole: this.handlerRole }),
    );

    const providerPolicyDependables = grantDestinationPermissions(this, this.handlerFunction, {
      destinationBucket: this.destinationBucket,
      destinationKeyPrefix: destination.keyPrefix,
      deleteCurrentObjects: deleteStaleObjectsOnDeploy || deleteCurrentObjectsOnDelete,
      previousBucket,
      distribution: props.cloudfrontInvalidation?.distribution,
      previousDistribution,
      waitForInvalidation: props.cloudfrontInvalidation?.waitForCompletion ?? true,
    });

    if (
      previousBucket &&
      (providerLambda.sharing ?? ProviderSharing.STACK) === ProviderSharing.STACK
    ) {
      Validations.of(this).addWarning(
        "ShinBucketDeploymentSharedRoleBucketWideDelete",
        "destinationLifecycle.onChange.deletePreviousObjects grants the provider role s3:DeleteObject across the whole previous bucket, and with the default ProviderSharing.STACK every deployment in this stack shares that role and inherits the grant. The provider confines deletion to the previous namespace at runtime, but the IAM authority itself is bucket-wide. Consider ProviderSharing.DEPLOYMENT so the bucket-wide delete grant is not accumulated onto a role shared with other deployments.",
      );
    }

    this.node.addValidation({
      validate: () => {
        if (this.sources.length === 0) {
          return [
            "ShinBucketDeployment requires at least one source; pass a source in sources or call addSource() before synthesis.",
          ];
        }
        if (this.sources.some((source) => source.markers) && sourceProcessing.extract === false) {
          return [
            "Set sourceProcessing.extract:true or remove deploy-time Source.data/jsonData/yamlData values; marker replacement requires extraction.",
          ];
        }
        return [];
      },
    });

    /**
     * The custom resource `ServiceTimeout` matches the Lambda function's
     * maximum timeout so CloudFormation fails when the provider can no longer respond.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudformation-customresource.html#cfn-cloudformation-customresource-servicetimeout
     */
    const customResourceIdentity = new Construct(this, "CustomResource");
    this.cr = new CustomResource(customResourceIdentity, this.handlerFunction.node.id, {
      serviceToken: this.handlerFunction.functionArn,
      serviceTimeout: PROVIDER_TIMEOUT,
      /**
       * Wire names mirror the public API path of the value they carry: each
       * camelCase path segment becomes one PascalCase key, nested as a dotted
       * object (`destinationLifecycle.onChange.deletePreviousObjects` becomes
       * `DestinationLifecycle.OnChange.DeletePreviousObjects`). The leaf
       * property name is PascalCased under its container, so
       * `cloudfrontInvalidation.waitForCompletion` becomes
       * `CloudfrontInvalidation.WaitForCompletion` and
       * `cloudfrontInvalidation.paths` becomes `CloudfrontInvalidation.Paths`;
       * `CloudfrontInvalidation.DistributionId` keeps the `Distribution`
       * qualifier because it is part of the leaf property name
       * (`distributionId`), not the dropped container prefix. Values that do
       * not carry a public API property -- bound source data (`Source*`), the
       * transport envelope (`ServiceToken`/`ServiceTimeout`), and internal
       * identities (`DestinationOwnerId`, `OutputObjectKeys`,
       * `DestinationBucketArn`) -- keep their flat wire names.
       */
      properties: {
        SourceBucketNames: Lazy.uncachedList({
          produce: () => this.sources.map((source) => source.bucket.bucketName),
        }),
        SourceObjectKeys: Lazy.uncachedList({
          produce: () => this.sources.map((source) => source.zipObjectKey),
        }),
        SourceCatalogs: Lazy.uncachedAny({
          produce: () => sourceCatalogs(this.sources, sourceProcessing.extract),
        }),
        SourceMarkers: Lazy.uncachedAny(
          {
            produce: () => sourceMarkers(this.sources),
          },
          { omitEmptyArray: true },
        ),
        SourceMarkersConfig: Lazy.uncachedAny(
          {
            produce: () => sourceMarkersConfig(this.sources),
          },
          { omitEmptyArray: true },
        ),
        Destination: {
          BucketName: this.destinationBucket.bucketName,
          KeyPrefix: destination.keyPrefix,
        },
        DestinationOwnerId: Lazy.uncachedString({
          produce: () => destinationOwnerId,
        }),
        DestinationLifecycle: {
          OnDeploy: {
            DeleteStaleObjects: deleteStaleObjectsOnDeploy,
          },
          OnChange: {
            DeletePreviousObjects: deletePreviousObjectsOnChange,
            PreviousBucketName: previousBucket?.bucketName,
            InvalidatePreviousDistribution: previousDistribution?.distributionRef.distributionId,
          },
          OnDelete: {
            DeleteCurrentObjects: deleteCurrentObjectsOnDelete,
          },
        },
        CloudfrontInvalidation: {
          DistributionId: props.cloudfrontInvalidation?.distribution.distributionRef.distributionId,
          Paths: props.cloudfrontInvalidation?.paths,
          WaitForCompletion: props.cloudfrontInvalidation?.waitForCompletion ?? true,
        },
        SourceProcessing: {
          Extract: sourceProcessing.extract ?? true,
          MaxUncompressedEntryBytes:
            sourceProcessing.maxUncompressedEntryBytes ?? DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES,
          MaxCompressionRatio:
            sourceProcessing.maxCompressionRatio ?? DEFAULT_MAX_COMPRESSION_RATIO,
          Exclude: sourceProcessing.exclude,
          Include: sourceProcessing.include,
        },
        OutputObjectKeys: Lazy.any({
          produce: () => this.requestObjectKeys,
        }),
        DestinationBucketArn: Lazy.string({
          produce: () =>
            this.requestDestinationArn ? this.destinationBucket.bucketArn : undefined,
        }),
        Transfer: {
          MaxConcurrency: transfer.maxConcurrency,
          AdvancedTuning: {
            SourceBlockBytes: advancedTuning.sourceBlockBytes,
            SourceBlockMergeGapBytes: advancedTuning.sourceBlockMergeGapBytes,
            SourceGetConcurrency: advancedTuning.sourceGetConcurrency,
            SourceWindowBytes: advancedTuning.sourceWindowBytes,
            SourceWindowMemoryBudgetMiB: advancedTuning.sourceWindowMemoryBudgetMiB,
            DestinationWriteRetry: {
              MaxAttempts: destinationWriteRetryTuning.maxAttempts,
              BaseDelayMs: destinationWriteRetryTuning.baseDelayMs,
              MaxDelayMs: destinationWriteRetryTuning.maxDelayMs,
              SlowdownBaseDelayMs: destinationWriteRetryTuning.slowdownBaseDelayMs,
              SlowdownMaxDelayMs: destinationWriteRetryTuning.slowdownMaxDelayMs,
              Jitter: destinationWriteRetryTuning.jitter,
            },
          },
        },
      },
    });

    // Under `@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy` the provider
    // grants land in standalone policies that the handler's own DependsOn does not
    // cover, so order the custom resource after each of them explicitly. Attaching
    // these to the handler instead would cycle: its role is inside its subtree.
    for (const dependable of providerPolicyDependables) {
      this.cr.node.addDependency(dependable);
    }

    // 64-bit ownership suffix derived from the custom resource's tree address.
    // S3 ownership tags are per-bucket and limited in number, so the suffix is
    // 16 hex characters; under the birthday bound, 2^32 (~4.30 billion)
    // deployments sharing one prefix collide with probability ~39.4%, and the
    // p≈0.5 point is ~5.06 billion deployments (1.1774 · sqrt(2^64)). A
    // collision merges co-tenant ownership, which only affects stale-object
    // deletion scope, and the provider's runtime owner probes keep behavior
    // confined to the deployment's namespace. The prefix limit (94 characters)
    // is what keeps the complete tag key within the S3 128-character key limit.
    const destinationOwnerId = this.cr.node.addr.slice(-16);
    const ownerPrefix = destinationOwnerPrefix(destination.keyPrefix);
    const tagKey = `${CUSTOM_RESOURCE_OWNER_TAG}${ownerPrefix ? `:${ownerPrefix}` : ""}:${destinationOwnerId}`;

    Tags.of(this.destinationBucket).add(tagKey, "true");
    this.node.addValidation({
      validate: () => validateDestinationBucketTagQuota(destinationBucketResource),
    });
    // Deferred to synthesis rather than checked here: an escape hatch that switches the
    // bucket to KMS or enables versioning may be applied after this construct is created,
    // and only the rendered resource reflects it.
    this.node.addValidation({
      validate: () => {
        validateDestinationEncryption(this, destinationBucketResource);
        for (const warning of destinationVersioningWarnings(this, destinationBucketResource)) {
          Validations.of(this).addWarning("ShinBucketDeploymentVersionedDestination", warning);
        }
        return [];
      },
    });
  }

  /**
   * Destination bucket reconstructed from the custom-resource response.
   *
   * Accessing this property asks the provider to return the destination ARN and
   * therefore consumes part of CloudFormation's 4096-byte response budget.
   */
  public get deployedBucket(): IBucket {
    this.requestDestinationArn = true;
    this._deployedBucket =
      this._deployedBucket ??
      Bucket.fromBucketAttributes(this, "DestinationBucket", {
        bucketArn: Token.asString(this.cr.getAtt("DestinationBucketArn")),
        region: this.destinationBucket.env.region,
        account: this.destinationBucket.env.account,
        isWebsite: this.destinationBucket.isWebsite,
      });
    return this._deployedBucket;
  }

  /**
   * Object keys returned by the provider.
   *
   * Accessing this property asks the provider to include object keys in the
   * custom-resource response. Leave it unread when the complete key list could
   * exceed CloudFormation's response limit.
   */
  public get objectKeys(): string[] {
    this.requestObjectKeys = true;
    return Token.asList(this.cr.getAtt("SourceObjectKeys"));
  }

  /**
   * Add a deployment source after construction.
   *
   * The source is bound immediately and receives read permissions on the
   * shared provider role. An equivalent marker-free source already present in
   * the deployment is not added twice. Re-adding the exact same source object
   * (one already bound through `sources` or a previous `addSource` call) is
   * skipped before binding, so no catalog materialization or `Asset` staging
   * happens for it.
   */
  public addSource(source: ISource): void {
    if (this.boundSources.includes(source)) {
      return;
    }
    const config = source.bind(this, { handlerRole: this.handlerRole });
    this.boundSources.push(source);
    if (!this.sources.some((c) => sourceConfigEqual(Stack.of(this), c, config))) {
      this.sources.push(config);
    }
  }
}

function validateDestinationBucketTagQuota(bucketResource: {
  readonly tags: { tagValues(): Record<string, string> };
  readonly tagsRaw?: CfnTag[];
}): string[] {
  const tagKeys = new Set(Object.keys(bucketResource.tags.tagValues()));
  for (const tag of bucketResource.tagsRaw ?? []) {
    tagKeys.add(tag.key);
  }
  const totalTagCount = tagKeys.size;
  if (totalTagCount <= MAX_S3_BUCKET_TAGS) return [];
  return [
    `The destination bucket has ${totalTagCount} synthesized tags, exceeding Amazon S3's ${MAX_S3_BUCKET_TAGS}-tag limit. Each ShinBucketDeployment requires one ownership tag; reduce bucket, stack, aspect, auto-delete, or deployment ownership tags.`,
  ];
}
