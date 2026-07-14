import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ArnFormat,
  type AssetHashType,
  type BundlingFileAccess,
  type BundlingOutput,
  CustomResource,
  type DockerImage,
  type DockerVolume,
  Duration,
  type ILocalBundling,
  Lazy,
  Stack,
  Tags,
  Token,
} from "aws-cdk-lib";
import type { IDistribution } from "aws-cdk-lib/aws-cloudfront";
import { Effect, type IRole, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket, BucketGrants, CfnBucket, type IBucket } from "aws-cdk-lib/aws-s3";
import type {
  BucketDeploymentProps,
  ISource,
  MarkersConfig,
  SourceConfig,
} from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { trustedSourceCatalog } from "./cataloged-source";
import { ValidationError } from "./errors";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";
const HANDLER_BINARY_NAME = "shin-bucket-deployment-handler";
const SHARED_HANDLER_ID_PREFIX = "ShinBucketDeploymentHandler";
const DEFAULT_MEMORY_LIMIT_MB = 1024;
const PROVIDER_TIMEOUT = Duration.minutes(15);
const MIN_SOURCE_BLOCK_BYTES = 30;
const DEFAULT_SOURCE_BLOCK_BYTES = 8 * 1024 * 1024;
const MAX_PARALLEL_TRANSFERS = 256;
const MAX_SOURCE_GET_CONCURRENCY = 64;
const MAX_PUT_OBJECT_ATTEMPTS = 10;
const MAX_RETRY_DELAY_MS = 60_000;
const MIB = 1024 * 1024;
const DEFAULT_PUT_OBJECT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_PUT_OBJECT_RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS = 1_000;
const DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS = 30_000;

export type PutObjectRetryJitter = "full" | "none";

export interface ShinBucketDeploymentBundlingCommandHooks {
  /**
   * Returns commands to run before bundling.
   */
  beforeBundling(inputDir: string, outputDir: string): string[];

  /**
   * Returns commands to run after bundling.
   */
  afterBundling(inputDir: string, outputDir: string): string[];
}

export interface ShinBucketDeploymentBundlingDockerOptions {
  /**
   * The entrypoint to run in the Docker container.
   * @default - run the entrypoint defined in the image
   */
  readonly entrypoint?: string[];

  /**
   * The command to run in the Docker container.
   * @default - a cargo lambda compilation
   */
  readonly command?: string[];

  /**
   * Additional Docker volumes to mount.
   * @default - no additional volumes are mounted
   */
  readonly volumes?: DockerVolume[];

  /**
   * Where to mount the specified volumes from.
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
   * @default - no environment variables are defined
   */
  readonly environment?: Record<string, string>;

  /**
   * Force bundling in a Docker container even if local bundling is possible.
   * @default false
   */
  readonly forcedDockerBundling?: boolean;

  /**
   * A custom bundling Docker image.
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
   * @default AssetHashType.OUTPUT
   */
  readonly assetHashType?: AssetHashType;

  /**
   * Specify a custom hash for this asset.
   */
  readonly assetHash?: string;

  /**
   * Command hooks.
   * @default - do not run additional commands
   */
  readonly commandHooks?: ShinBucketDeploymentBundlingCommandHooks;

  /**
   * The system architecture of the Lambda function.
   * @default Architecture.X86_64
   */
  readonly architecture?: Architecture;

  /**
   * Additional flags to pass to `cargo lambda build`.
   */
  readonly cargoLambdaFlags?: string[];

  /**
   * Cargo build profile.
   * @default "release"
   */
  readonly profile?: string;
}

export interface ShinBucketDeploymentPutObjectRetryTuning {
  /**
   * Maximum application-level PutObject attempts per object.
   * Must be in the inclusive range 1..10.
   * @default 6
   */
  readonly maxAttempts?: number;

  /**
   * Base retry delay for non-throttling PutObject failures, in milliseconds.
   * Must be in the inclusive range 0..60000 and no greater than `maxDelayMs`.
   * @default 250
   */
  readonly baseDelayMs?: number;

  /**
   * Maximum retry delay for non-throttling PutObject failures, in milliseconds.
   * Must be in the inclusive range 0..60000.
   * @default 5000
   */
  readonly maxDelayMs?: number;

  /**
   * Base retry delay for throttling PutObject failures, in milliseconds.
   * Must be in the inclusive range 0..60000 and no greater than
   * `slowdownMaxDelayMs`.
   * @default 1000
   */
  readonly slowdownBaseDelayMs?: number;

  /**
   * Maximum retry delay for throttling PutObject failures, in milliseconds.
   * Must be in the inclusive range 0..60000.
   * @default 30000
   */
  readonly slowdownMaxDelayMs?: number;

  /**
   * Jitter mode applied to computed PutObject retry delays.
   * @default "full"
   */
  readonly jitter?: PutObjectRetryJitter;
}

export interface ShinBucketDeploymentAdvancedRuntimeTuning {
  /**
   * Source ranged-read block size in bytes.
   *
   * Must be at least 30 bytes so ZIP local file headers can fit in one source
   * block, and must fit the invocation-global source memory budget both alone
   * and when multiplied by `sourceGetConcurrency`.
   *
   * @default 8 MiB
   */
  readonly sourceBlockBytes?: number;

  /**
   * Maximum gap in bytes to coalesce between adjacent source ranges.
   * @default 256 KiB
   */
  readonly sourceBlockMergeGapBytes?: number;

  /**
   * Maximum concurrent ranged GetObject requests per source archive.
   * Must be in the inclusive range 1..64.
   * @default - derived from the provider Lambda memory size
   */
  readonly sourceGetConcurrency?: number;

  /**
   * Resident source block window size in bytes per source archive.
   * This local window must fit the invocation-global source memory budget.
   * @default - derived from the provider Lambda memory size and source archive shape
   */
  readonly sourceWindowBytes?: number;

  /**
   * Optional lower invocation-global budget, in MiB, shared fairly by source
   * archive windows. It cannot exceed 50% of the provider's actual Lambda
   * memory.
   * @default - 50% of the provider Lambda memory size
   */
  readonly sourceWindowMemoryBudgetMb?: number;

  /**
   * Destination PutObject retry/backoff tuning.
   * @default - provider defaults
   */
  readonly putObjectRetry?: ShinBucketDeploymentPutObjectRetryTuning;
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
   */
  readonly onDeploy?: {
    /**
     * Delete objects in the current destination namespace that are absent from
     * the deployment plan.
     *
     * @default true
     */
    readonly deleteStaleObjects?: boolean;
  };

  /**
   * Cleanup performed after the destination bucket, prefix, or distribution
   * changes during an Update.
   */
  readonly onChange?: {
    /**
     * Delete objects from the old destination namespace.
     *
     * CloudFormation supplies the old prefix through `OldResourceProperties`.
     *
     * @default false
     */
    readonly deleteObjects?: boolean;

    /**
     * Bucket containing the objects to delete when the destination bucket
     * changes.
     *
     * Omit this for same-bucket prefix changes. Requires `deleteObjects=true`.
     *
     * @default - the current destination bucket
     */
    readonly fromBucket?: IBucket;

    /**
     * Invalidate the old CloudFront distribution after its cached content
     * changes.
     *
     * Provide this only when the distribution changed. An unchanged current
     * distribution is invalidated automatically.
     *
     * @default - no separate previous distribution
     */
    readonly invalidateDistribution?: IDistribution;
  };

  /**
   * Cleanup performed when CloudFormation deletes the custom resource.
   */
  readonly onDelete?: {
    /**
     * Delete objects from the destination namespace.
     *
     * @default false
     */
    readonly deleteObjects?: boolean;
  };
}

export interface ShinBucketDeploymentProps
  extends Pick<
    BucketDeploymentProps,
    | "destinationKeyPrefix"
    | "extract"
    | "exclude"
    | "include"
    | "distribution"
    | "distributionPaths"
    | "waitForDistributionInvalidation"
    | "vpc"
    | "vpcSubnets"
    | "securityGroups"
  > {
  /**
   * Sources deployed in array order. Later sources replace earlier sources
   * with the same destination key.
   *
   * Any upstream CDK `ISource` is accepted. Shin's `Source.asset` adds an
   * authenticated catalog to local directories by default; other source
   * implementations use the normal streamed validation path.
   */
  readonly sources: ISource[];

  /**
   * Bucket that receives the deployed objects.
   *
   * Shin inspects the synthesized bucket encryption configuration to select
   * the cheapest sound conditional-write reconciliation strategy. Imported or
   * otherwise uninspectable buckets are rejected.
   */
  readonly destinationBucket: Bucket;

  /**
   * Memory allocated to the shared provider Lambda, in MiB.
   *
   * The provider derives its invocation-global source-block budget from the
   * actual Lambda memory and caps it at 50%. Deployments with the same provider
   * configuration in one stack share a handler.
   *
   * @default 1024
   */
  readonly memoryLimit?: BucketDeploymentProps["memoryLimit"];

  /**
   * Existing execution role for the provider Lambda.
   *
   * Deployments with the same provider configuration in one stack share a
   * handler and role. Source, destination, KMS, and CloudFront permissions from
   * every sharing deployment accumulate on that role.
   *
   * @default - a role is created for the shared provider
   */
  readonly role?: BucketDeploymentProps["role"];

  /**
   * Log group used by the shared provider Lambda.
   *
   * @default - a default log group created by Lambda
   */
  readonly logGroup?: BucketDeploymentProps["logGroup"];

  /**
   * Return deployed object keys through the custom-resource response.
   *
   * CloudFormation limits the complete response to 4096 bytes. Set this to
   * `false` for deployments whose object-key list would exceed that boundary;
   * `objectKeys` then resolves to an empty list.
   *
   * @default true
   */
  readonly outputObjectKeys?: BucketDeploymentProps["outputObjectKeys"];

  /**
   * Lambda architecture for the Rust provider.
   * @default Architecture.ARM_64
   */
  readonly architecture?: Architecture;

  /**
   * Optional override for the Rust provider project directory.
   *
   * Setting this opts into compiling the Rust provider locally instead of using
   * the prebuilt binary shipped with the package. This requires a Rust toolchain
   * plus the optional local compile dependency and is mainly useful while
   * iterating on the handler itself.
   *
   * @default - the prebuilt provider binary shipped with the package, or
   * `<projectRoot>/rust` when no prebuilt binary is available
   */
  readonly rustProjectPath?: string;

  /**
   * Bundling options passed through to the local provider compile path.
   *
   * Setting this opts into compiling the Rust provider locally instead of using
   * the prebuilt binary shipped with the package, and requires the optional local
   * compile dependency plus a Rust toolchain.
   *
   * @default - the prebuilt provider binary shipped with the package
   */
  readonly bundling?: ShinBucketDeploymentBundlingOptions;

  /**
   * Maximum concurrent object transfers run by the provider.
   * Must be in the inclusive range 1..256.
   * @default 32
   */
  readonly maxParallelTransfers?: number;

  /**
   * Advanced provider runtime tuning. Most deployments should leave this unset
   * and use memoryLimit plus maxParallelTransfers as the public controls.
   *
   * @default - provider defaults derived from memoryLimit
   */
  readonly advancedRuntimeTuning?: ShinBucketDeploymentAdvancedRuntimeTuning;

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
 * `bundling` or `rustProjectPath` opts into compiling the provider locally.
 *
 * Deployments with identical provider settings in one stack reuse a single
 * Lambda function. Its role accumulates permissions for every source,
 * destination, KMS key, and CloudFront distribution used by those deployments;
 * changing the shared handler affects all of them.
 */
export class ShinBucketDeployment extends Construct {
  private readonly cr: CustomResource;
  private readonly destinationBucket: Bucket;
  private readonly sources: SourceConfig[];
  private _deployedBucket?: IBucket;
  private requestDestinationArn = false;

  /**
   * Execution role of the shared custom-resource Lambda function.
   *
   * Permissions from every deployment sharing the handler accumulate here.
   */
  public readonly handlerRole: IRole;

  /**
   * The shared backing Rust Lambda function.
   */
  public readonly handlerFunction: LambdaFunction;

  constructor(scope: Construct, id: string, props: ShinBucketDeploymentProps) {
    super(scope, id);

    const maybeUnsupported = props as BucketDeploymentProps;
    const maybeLegacyLifecycle = props.destinationLifecycle as
      | {
          readonly deleteDestinationObjectsOnDelete?: unknown;
          readonly deletePreviousDestinationObjectsOnUpdate?: unknown;
          readonly onDeployment?: unknown;
          readonly onChange?: {
            readonly deletePreviousObjects?: unknown;
            readonly invalidatePreviousDistribution?: unknown;
          };
          readonly onDelete?: {
            readonly deleteCurrentObjects?: unknown;
          };
        }
      | undefined;

    if (maybeUnsupported.prune !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentPruneUnsupported"),
        "ShinBucketDeployment replaces prune with destinationLifecycle.onDeploy.deleteStaleObjects.",
        this,
      );
    }

    if (maybeUnsupported.retainOnDelete !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentRetainOnDeleteUnsupported"),
        "ShinBucketDeployment replaces retainOnDelete with the explicit destinationLifecycle.onChange and destinationLifecycle.onDelete settings.",
        this,
      );
    }

    if (
      maybeLegacyLifecycle?.deleteDestinationObjectsOnDelete !== undefined ||
      maybeLegacyLifecycle?.deletePreviousDestinationObjectsOnUpdate !== undefined ||
      maybeLegacyLifecycle?.onDeployment !== undefined ||
      maybeLegacyLifecycle?.onChange?.deletePreviousObjects !== undefined ||
      maybeLegacyLifecycle?.onChange?.invalidatePreviousDistribution !== undefined ||
      maybeLegacyLifecycle?.onDelete?.deleteCurrentObjects !== undefined
    ) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentFlatDestinationLifecycleUnsupported"),
        "ShinBucketDeployment destinationLifecycle uses onDeploy.deleteStaleObjects, onChange.deleteObjects/fromBucket/invalidateDistribution, and onDelete.deleteObjects.",
        this,
      );
    }

    if (
      props.destinationLifecycle?.onChange?.fromBucket &&
      props.destinationLifecycle.onChange.deleteObjects !== true
    ) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentFromBucketRequiresDeleteObjects"),
        "destinationLifecycle.onChange.fromBucket requires deleteObjects=true.",
        this,
      );
    }

    if (props.distributionPaths) {
      if (!props.distribution) {
        throw new ValidationError(
          literalString("DistributionSpecifiedDistributionPathsSpecified"),
          "Set distribution when distributionPaths is provided.",
          this,
        );
      }
      if (!Token.isUnresolved(props.distributionPaths)) {
        if (
          !props.distributionPaths.every(
            (distributionPath) =>
              Token.isUnresolved(distributionPath) || distributionPath.startsWith("/"),
          )
        ) {
          throw new ValidationError(
            literalString("DistributionPathsStart"),
            'Every distributionPaths entry must start with "/".',
            this,
          );
        }
      }
    }

    if (maybeUnsupported.useEfs !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentUseEfsUnsupported"),
        "ShinBucketDeployment does not support useEfs; the provider uses bounded ranged reads without staging archives or extracted files on disk.",
        this,
      );
    }

    if (maybeUnsupported.signContent !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentSignContentUnsupported"),
        "ShinBucketDeployment does not support signContent; the provider uses AWS SDK operations rather than the upstream AWS CLI upload path.",
        this,
      );
    }

    if (maybeUnsupported.serverSideEncryptionCustomerAlgorithm !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentSseCustomerAlgorithmUnsupported"),
        "ShinBucketDeployment does not support serverSideEncryptionCustomerAlgorithm; configure supported default encryption on destinationBucket.",
        this,
      );
    }

    if (maybeUnsupported.expires !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentExpiresUnsupported"),
        "ShinBucketDeployment does not support expires; configurable per-object metadata is outside its deployment contract.",
        this,
      );
    }

    if (maybeUnsupported.logRetention !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentLogRetentionUnsupported"),
        "ShinBucketDeployment does not support the legacy logRetention prop; use logGroup instead.",
        this,
      );
    }

    if (maybeUnsupported.ephemeralStorageSize !== undefined) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentEphemeralStorageUnsupported"),
        "ShinBucketDeployment does not support ephemeralStorageSize because the provider does not use Lambda temporary storage.",
        this,
      );
    }

    const removedContentSettings = [
      ["accessControl", maybeUnsupported.accessControl],
      ["cacheControl", maybeUnsupported.cacheControl],
      ["contentDisposition", maybeUnsupported.contentDisposition],
      ["contentEncoding", maybeUnsupported.contentEncoding],
      ["contentLanguage", maybeUnsupported.contentLanguage],
      ["contentType", maybeUnsupported.contentType],
      ["metadata", maybeUnsupported.metadata],
      ["serverSideEncryption", maybeUnsupported.serverSideEncryption],
      ["serverSideEncryptionAwsKmsKeyId", maybeUnsupported.serverSideEncryptionAwsKmsKeyId],
      ["storageClass", maybeUnsupported.storageClass],
      ["websiteRedirectLocation", maybeUnsupported.websiteRedirectLocation],
    ].flatMap(([name, value]) => (value === undefined ? [] : [name]));
    if (removedContentSettings.length > 0) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentContentSettingsUnsupported"),
        `ShinBucketDeployment does not support ${removedContentSettings.join(", ")}. Configure encryption on destinationBucket and cache/storage/lifecycle policy separately; Shin does not deploy configurable object metadata and infers content type from each object key.`,
        this,
      );
    }

    const advancedRuntimeTuning = props.advancedRuntimeTuning ?? {};
    const putObjectRetryTuning = advancedRuntimeTuning.putObjectRetry ?? {};

    validateIntegerProps(
      this,
      { maxParallelTransfers: props.maxParallelTransfers },
      ["maxParallelTransfers"],
      1,
      "",
      MAX_PARALLEL_TRANSFERS,
    );
    validateIntegerProps(
      this,
      advancedRuntimeTuning,
      ["sourceWindowBytes", "sourceWindowMemoryBudgetMb"],
      1,
      "advancedRuntimeTuning.",
    );
    validateIntegerProps(
      this,
      advancedRuntimeTuning,
      ["sourceGetConcurrency"],
      1,
      "advancedRuntimeTuning.",
      MAX_SOURCE_GET_CONCURRENCY,
    );
    validateIntegerProps(
      this,
      advancedRuntimeTuning,
      ["sourceBlockBytes"],
      MIN_SOURCE_BLOCK_BYTES,
      "advancedRuntimeTuning.",
    );
    validateIntegerProps(
      this,
      putObjectRetryTuning,
      ["maxAttempts"],
      1,
      "advancedRuntimeTuning.putObjectRetry.",
      MAX_PUT_OBJECT_ATTEMPTS,
    );
    validateIntegerProps(
      this,
      advancedRuntimeTuning,
      ["sourceBlockMergeGapBytes"],
      0,
      "advancedRuntimeTuning.",
    );
    validateIntegerProps(
      this,
      putObjectRetryTuning,
      ["baseDelayMs", "maxDelayMs", "slowdownBaseDelayMs", "slowdownMaxDelayMs"],
      0,
      "advancedRuntimeTuning.putObjectRetry.",
      MAX_RETRY_DELAY_MS,
    );
    validatePutObjectRetryProps(this, putObjectRetryTuning);
    validateSourceMemoryProps(this, props.memoryLimit, advancedRuntimeTuning);

    this.destinationBucket = props.destinationBucket;
    const destinationBucketResource = inspectableDestinationBucketResource(
      this,
      this.destinationBucket,
    );
    const deleteObjectsOnChange = props.destinationLifecycle?.onChange?.deleteObjects === true;
    const previousDestinationBucket = deleteObjectsOnChange
      ? (props.destinationLifecycle?.onChange?.fromBucket ?? this.destinationBucket)
      : undefined;
    const previousDistribution = props.destinationLifecycle?.onChange?.invalidateDistribution;
    const deleteObjectsOnDelete = props.destinationLifecycle?.onDelete?.deleteObjects === true;
    const deleteStaleObjectsOnDeploy =
      props.destinationLifecycle?.onDeploy?.deleteStaleObjects ?? true;

    if (props.vpc) {
      this.node.addDependency(props.vpc);
    }

    const architecture = props.architecture ?? Architecture.ARM_64;
    this.handlerFunction = getOrCreateHandler(this, props, architecture);

    const handlerRole = this.handlerFunction.role;
    if (!handlerRole) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentHandlerRole"),
        "lambda.Function should have created a Role",
        this,
      );
    }
    this.handlerRole = handlerRole;

    this.sources = props.sources.map((source: ISource) =>
      source.bind(this, { handlerRole: this.handlerRole }),
    );

    const destinationObjectKeyPattern = destinationObjectGrantPattern(props.destinationKeyPrefix);
    const destinationGrants = BucketGrants.fromBucket(this.destinationBucket);
    // `BucketGrants` splits mixed actions by service: `s3:*` actions are granted on
    // object keys, while `kms:*` actions are granted on the bucket encryption key
    // only when one exists. This keeps KMS behavior aligned with CDK grants.
    destinationGrants.actionsOnObjectKeys(
      this.handlerFunction,
      destinationObjectKeyPattern,
      "s3:GetObject",
      "s3:PutObject",
      "s3:PutObjectLegalHold",
      "s3:PutObjectRetention",
      "s3:PutObjectTagging",
      "s3:PutObjectVersionTagging",
      "s3:Abort*",
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
    );
    destinationGrants.delete(this.handlerFunction, destinationObjectKeyPattern);
    this.handlerFunction.addToRolePolicy(
      destinationListPolicyStatement(this.destinationBucket.bucketArn, props.destinationKeyPrefix),
    );
    this.handlerFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetBucketTagging"],
        resources: [this.destinationBucket.bucketArn],
      }),
    );
    // A managed-key bucket has no IKey for BucketGrants to target. Keep this
    // tightly conditioned statement on every handler so a later L1/Aspect
    // transition to alias/aws/s3 remains authorized; it is inert for every
    // other key and service.
    this.handlerFunction.addToRolePolicy(awsManagedS3KmsPolicyStatement(this));

    if (previousDestinationBucket) {
      const previousGrants = BucketGrants.fromBucket(previousDestinationBucket);
      previousGrants.delete(this.handlerFunction, "*");
      this.handlerFunction.addToRolePolicy(
        destinationListPolicyStatement(previousDestinationBucket.bucketArn, undefined),
      );
      this.handlerFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetBucketTagging"],
          resources: [previousDestinationBucket.bucketArn],
        }),
      );
    }

    if (props.distribution) {
      this.handlerFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cloudfront:GetInvalidation", "cloudfront:CreateInvalidation"],
          resources: [
            cloudFrontDistributionArn(this, props.distribution.distributionRef.distributionId),
          ],
        }),
      );
    }

    if (previousDistribution) {
      this.handlerFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cloudfront:GetInvalidation", "cloudfront:CreateInvalidation"],
          resources: [
            cloudFrontDistributionArn(this, previousDistribution.distributionRef.distributionId),
          ],
        }),
      );
    }

    this.node.addValidation({
      validate: () => {
        if (this.sources.some((source) => source.markers) && props.extract === false) {
          return [
            "Set extract:true or remove deploy-time Source.data/jsonData/yamlData values; marker replacement requires extraction.",
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
    this.cr = new CustomResource(this, "CustomResource", {
      serviceToken: this.handlerFunction.functionArn,
      serviceTimeout: PROVIDER_TIMEOUT,
      resourceType: "Custom::ShinBucketDeployment",
      properties: {
        SourceBucketNames: Lazy.uncachedList({
          produce: () => this.sources.map((source) => source.bucket.bucketName),
        }),
        SourceObjectKeys: Lazy.uncachedList({
          produce: () => this.sources.map((source) => source.zipObjectKey),
        }),
        SourceCatalogs: Lazy.uncachedAny({
          produce: () => {
            if (props.extract === false) {
              return undefined;
            }
            const catalogs = this.sources.map((source) => trustedSourceCatalog(source));
            if (!catalogs.some((catalog) => catalog !== undefined)) {
              return undefined;
            }
            return catalogs.map((catalog) => catalog ?? {});
          },
        }),
        SourceMarkers: Lazy.uncachedAny(
          {
            produce: () => {
              return this.sources.reduce(
                (acc, source) => {
                  if (source.markers) {
                    acc.push(source.markers);
                  } else if (this.sources.length > 1) {
                    acc.push({});
                  }
                  return acc;
                },
                [] as Array<Record<string, unknown>>,
              );
            },
          },
          { omitEmptyArray: true },
        ),
        SourceMarkersConfig: Lazy.uncachedAny(
          {
            produce: () => {
              return this.sources.reduce(
                (acc, source) => {
                  if (source.markersConfig) {
                    acc.push(source.markersConfig);
                  } else if (this.sources.length > 1) {
                    acc.push({});
                  }
                  return acc;
                },
                [] as Array<MarkersConfig>,
              );
            },
          },
          { omitEmptyArray: true },
        ),
        DestinationBucketName: this.destinationBucket.bucketName,
        DestinationBucketKeyPrefix: props.destinationKeyPrefix,
        DestinationChecksumStrategy: Lazy.uncachedString({
          produce: () =>
            destinationChecksumStrategy(this, this.destinationBucket, destinationBucketResource),
        }),
        DestinationOwnerId: Lazy.string({
          produce: () => this.cr.node.addr.slice(-8),
        }),
        DeletePreviousObjectsOnChange: previousDestinationBucket
          ? {
              DestinationBucketName: previousDestinationBucket.bucketName,
            }
          : undefined,
        InvalidatePreviousDistributionOnChange:
          previousDistribution?.distributionRef.distributionId,
        WaitForDistributionInvalidation: props.waitForDistributionInvalidation ?? true,
        DeleteCurrentObjectsOnDelete: deleteObjectsOnDelete,
        Extract: props.extract ?? true,
        DeleteStaleObjectsOnDeployment: deleteStaleObjectsOnDeploy,
        Exclude: props.exclude,
        Include: props.include,
        DistributionId: props.distribution?.distributionRef.distributionId,
        DistributionPaths: props.distributionPaths,
        OutputObjectKeys: props.outputObjectKeys ?? true,
        DestinationBucketArn: Lazy.string({
          produce: () =>
            this.requestDestinationArn ? this.destinationBucket.bucketArn : undefined,
        }),
        MaxParallelTransfers: props.maxParallelTransfers,
        SourceBlockBytes: advancedRuntimeTuning.sourceBlockBytes,
        SourceBlockMergeGapBytes: advancedRuntimeTuning.sourceBlockMergeGapBytes,
        SourceGetConcurrency: advancedRuntimeTuning.sourceGetConcurrency,
        SourceWindowBytes: advancedRuntimeTuning.sourceWindowBytes,
        SourceWindowMemoryBudgetMb: advancedRuntimeTuning.sourceWindowMemoryBudgetMb,
        PutObjectMaxAttempts: putObjectRetryTuning.maxAttempts,
        PutObjectRetryBaseDelayMs: putObjectRetryTuning.baseDelayMs,
        PutObjectRetryMaxDelayMs: putObjectRetryTuning.maxDelayMs,
        PutObjectSlowdownRetryBaseDelayMs: putObjectRetryTuning.slowdownBaseDelayMs,
        PutObjectSlowdownRetryMaxDelayMs: putObjectRetryTuning.slowdownMaxDelayMs,
        PutObjectRetryJitter: putObjectRetryTuning.jitter,
      },
    });

    let prefix = props.destinationKeyPrefix ? `:${props.destinationKeyPrefix}` : "";
    prefix += `:${this.cr.node.addr.slice(-8)}`;
    const tagKey = CUSTOM_RESOURCE_OWNER_TAG + prefix;

    if (!Token.isUnresolved(tagKey) && tagKey.length > 128) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentConstructRequiresDestination"),
        "The destinationKeyPrefix must be <=104 characters.",
        this,
      );
    }

    Tags.of(this.destinationBucket).add(tagKey, "true");
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
   * Object keys returned by the provider when `outputObjectKeys` is enabled.
   *
   * Large deployments should set `outputObjectKeys:false` to stay within the
   * complete 4096-byte CloudFormation response limit; this property then
   * resolves to an empty list.
   */
  public get objectKeys(): string[] {
    return Token.asList(this.cr.getAtt("SourceObjectKeys"));
  }

  /**
   * Add a deployment source after construction.
   *
   * The source is bound immediately and receives read permissions on the
   * shared provider role. An equivalent marker-free source already present in
   * the deployment is not added twice.
   */
  public addSource(source: ISource): void {
    const config = source.bind(this, { handlerRole: this.handlerRole });
    if (!this.sources.some((c) => sourceConfigEqual(Stack.of(this), c, config))) {
      this.sources.push(config);
    }
  }
}

function resolveDefaultRustProjectPath(scope: Construct): string {
  const candidates = [join(__dirname, "..", "rust"), join(__dirname, "..", "..", "rust")];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "Cargo.toml"))) {
      return candidate;
    }
  }

  throw new ValidationError(
    literalString("ShinBucketDeploymentRustProjectPath"),
    "Unable to locate rust/Cargo.toml. Pass rustProjectPath explicitly.",
    scope,
  );
}

/**
 * Locate the prebuilt Lambda archive shipped inside the published package for
 * the requested architecture, if present. The archive contains an executable
 * root `bootstrap`; local checkouts that have not run the prebuild step fall
 * back to the local cargo-lambda compile path.
 */
function resolvePrebuiltBootstrapArchive(architecture: Architecture): string | undefined {
  const dirName = `bootstrap-${architecture.name}`;
  const candidates = [
    join(__dirname, "..", "..", "assets", dirName),
    join(__dirname, "..", "assets", dirName),
  ];

  for (const candidate of candidates) {
    const archive = join(candidate, "bootstrap.zip");
    if (existsSync(archive)) {
      return archive;
    }
  }

  return undefined;
}

interface SharedHandlerOptions {
  readonly architecture: Architecture;
  readonly timeout: Duration;
  readonly memorySize: number;
  readonly role: ShinBucketDeploymentProps["role"];
  readonly vpc: ShinBucketDeploymentProps["vpc"];
  readonly vpcSubnets: ShinBucketDeploymentProps["vpcSubnets"];
  readonly securityGroups: ShinBucketDeploymentProps["securityGroups"];
  readonly environment: Record<string, string>;
  readonly logGroup: ShinBucketDeploymentProps["logGroup"];
}

function getOrCreateHandler(
  scope: Construct,
  props: ShinBucketDeploymentProps,
  architecture: Architecture,
): LambdaFunction {
  const stack = Stack.of(scope);

  // A developer is iterating on the handler when they point at a Rust project or
  // pass bundling options; otherwise prefer a prebuilt binary so consumers do not
  // need a Rust toolchain. When neither a prebuilt binary nor an explicit compile
  // request is available (e.g. a local checkout before prebuild), fall back to the
  // local cargo-lambda compile path.
  const wantsCompile = props.rustProjectPath !== undefined || props.bundling !== undefined;
  const prebuiltBootstrapArchive = wantsCompile
    ? undefined
    : resolvePrebuiltBootstrapArchive(architecture);
  const useCompilePath = wantsCompile || prebuiltBootstrapArchive === undefined;

  const rustProjectPath = useCompilePath
    ? (props.rustProjectPath ?? resolveDefaultRustProjectPath(scope))
    : undefined;
  const manifestPath =
    rustProjectPath !== undefined ? join(rustProjectPath, "Cargo.toml") : undefined;

  const handlerSource = useCompilePath
    ? `compile:${manifestPath}`
    : `prebuilt:${architecture.name}`;

  const handlerId = `${SHARED_HANDLER_ID_PREFIX}${renderHandlerConfigHash(
    stack,
    props,
    architecture,
    handlerSource,
  )}`;

  const existing = stack.node.tryFindChild(handlerId);
  if (existing) {
    if (!(existing instanceof LambdaFunction)) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentHandlerCollision"),
        `Found non-Function child for shared handler id ${handlerId}.`,
        scope,
      );
    }
    return existing;
  }

  const shared: SharedHandlerOptions = {
    architecture,
    timeout: PROVIDER_TIMEOUT,
    memorySize: props.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB,
    role: props.role,
    vpc: props.vpc,
    vpcSubnets: props.vpcSubnets,
    securityGroups:
      props.securityGroups && props.securityGroups.length > 0 ? props.securityGroups : undefined,
    environment: {
      RUST_BACKTRACE: "1",
    },
    logGroup: props.logGroup,
  };

  if (useCompilePath) {
    return createCompiledHandler(stack, handlerId, props, shared, manifestPath as string);
  }

  return createPrebuiltHandler(stack, handlerId, shared, prebuiltBootstrapArchive as string);
}

function createPrebuiltHandler(
  stack: Stack,
  handlerId: string,
  shared: SharedHandlerOptions,
  bootstrapArchive: string,
): LambdaFunction {
  return new LambdaFunction(stack, handlerId, {
    runtime: Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    code: Code.fromAsset(bootstrapArchive),
    architecture: shared.architecture,
    timeout: shared.timeout,
    memorySize: shared.memorySize,
    role: shared.role,
    vpc: shared.vpc,
    vpcSubnets: shared.vpcSubnets,
    securityGroups: shared.securityGroups,
    environment: shared.environment,
    logGroup: shared.logGroup,
  });
}

function createCompiledHandler(
  stack: Stack,
  handlerId: string,
  props: ShinBucketDeploymentProps,
  shared: SharedHandlerOptions,
  manifestPath: string,
): LambdaFunction {
  // Lazily load cargo-lambda-cdk so it is only required when a developer opts
  // into the local compile path. It is an optional peer dependency and is not
  // installed for typical consumers using the prebuilt binary.
  const { RustFunction } = loadCargoLambdaCdk(stack);

  return new RustFunction(stack, handlerId, {
    runtime: "provided.al2023",
    architecture: shared.architecture,
    binaryName: HANDLER_BINARY_NAME,
    manifestPath,
    bundling: props.bundling,
    timeout: shared.timeout,
    memorySize: shared.memorySize,
    role: shared.role,
    vpc: shared.vpc,
    vpcSubnets: shared.vpcSubnets,
    securityGroups: shared.securityGroups,
    environment: shared.environment,
    logGroup: shared.logGroup,
  });
}

function loadCargoLambdaCdk(scope: Construct): typeof import("cargo-lambda-cdk") {
  try {
    return require("cargo-lambda-cdk") as typeof import("cargo-lambda-cdk");
  } catch (error) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentCargoLambdaMissing"),
      "The local Rust compile path requires the optional 'cargo-lambda-cdk' dependency. " +
        "Install it as a devDependency, or omit 'bundling'/'rustProjectPath' to use the " +
        `prebuilt provider binary. Underlying error: ${(error as Error).message}`,
      scope,
    );
  }
}

function renderHandlerConfigHash(
  stack: Stack,
  props: ShinBucketDeploymentProps,
  architecture: Architecture,
  handlerSource: string,
): string {
  const config = {
    architecture: architecture.name,
    bundling: normalizeSingletonValue(props.bundling),
    handlerSource,
    logGroup: normalizeSingletonValue(props.logGroup),
    memoryLimit: normalizeSingletonValue(props.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB),
    role: normalizeSingletonValue(props.role),
    securityGroups:
      props.securityGroups && props.securityGroups.length > 0
        ? [...props.securityGroups]
            .map((securityGroup) => normalizeSingletonValue(securityGroup))
            .sort()
        : undefined,
    stack: stack.node.addr,
    vpc: normalizeSingletonValue(props.vpc),
    vpcSubnets: normalizeSingletonValue(props.vpcSubnets),
  };

  return createHash("sha256").update(stableStringify(config)).digest("hex").slice(0, 16);
}

function normalizeSingletonValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "function") {
    return {
      __function__: value.toString(),
    };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSingletonValue(entry));
  }

  if (typeof value === "object") {
    if (Construct.isConstruct(value as Construct)) {
      return {
        __construct__: (value as Construct).node.addr,
      };
    }

    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, normalizeSingletonValue(entry)] as const)
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(normalizedEntries);
  }

  return String(value);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeSingletonValue(value));
}

function cloudFrontDistributionArn(scope: Construct, distributionId: string): string {
  return Stack.of(scope).formatArn({
    service: "cloudfront",
    region: "",
    resource: "distribution",
    resourceName: distributionId,
  });
}

function destinationObjectGrantPattern(prefix: string | undefined): string {
  if (!prefix || prefix === "/" || Token.isUnresolved(prefix)) {
    return "*";
  }

  return prefix.endsWith("/") ? `${prefix}*` : `${prefix}/*`;
}

function destinationListPolicyStatement(
  bucketArn: string,
  destinationKeyPrefix: string | undefined,
): PolicyStatement {
  const prefix = destinationListPrefix(destinationKeyPrefix);
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["s3:ListBucket"],
    resources: [bucketArn],
    conditions: prefix ? { StringEquals: { "s3:prefix": prefix } } : undefined,
  });
}

function awsManagedS3KmsPolicyStatement(scope: Construct): PolicyStatement {
  const stack = Stack.of(scope);
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["kms:Decrypt", "kms:GenerateDataKey"],
    resources: [
      stack.formatArn({
        service: "kms",
        resource: "key",
        resourceName: "*",
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      }),
    ],
    conditions: {
      "ForAnyValue:StringEquals": {
        "kms:ResourceAliases": "alias/aws/s3",
      },
      StringEquals: {
        "kms:ViaService": `s3.${stack.region}.${stack.urlSuffix}`,
      },
    },
  });
}

function destinationListPrefix(prefix: string | undefined) {
  if (!prefix || prefix === "/" || Token.isUnresolved(prefix)) {
    return undefined;
  }

  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function literalString(value: string): string {
  return value;
}

function validateIntegerProps(
  scope: Construct,
  props: object,
  propNames: readonly string[],
  minimum: number,
  propPathPrefix = "",
  maximum = Number.MAX_SAFE_INTEGER,
): void {
  const values = props as Record<string, unknown>;
  for (const propName of propNames) {
    const value = values[propName];
    if (value === undefined || Token.isUnresolved(value)) {
      continue;
    }
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      const propPath = `${propPathPrefix}${propName}`;
      throw new ValidationError(
        literalString(`ShinBucketDeploymentInvalid${propPath}`),
        `${propPath} must be a safe integer in the inclusive range ${minimum}..${maximum}.`,
        scope,
      );
    }
  }
}

function validatePutObjectRetryProps(
  scope: Construct,
  props: ShinBucketDeploymentPutObjectRetryTuning,
): void {
  const retryBaseDelayMs = props.baseDelayMs ?? DEFAULT_PUT_OBJECT_RETRY_BASE_DELAY_MS;
  const retryMaxDelayMs = props.maxDelayMs ?? DEFAULT_PUT_OBJECT_RETRY_MAX_DELAY_MS;
  if (
    !Token.isUnresolved(retryMaxDelayMs) &&
    !Token.isUnresolved(retryBaseDelayMs) &&
    retryMaxDelayMs < retryBaseDelayMs
  ) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentInvalidPutObjectRetryMaxDelayMs"),
      "advancedRuntimeTuning.putObjectRetry.maxDelayMs must be greater than or equal to advancedRuntimeTuning.putObjectRetry.baseDelayMs.",
      scope,
    );
  }

  const slowdownRetryBaseDelayMs =
    props.slowdownBaseDelayMs ?? DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS;
  const slowdownRetryMaxDelayMs =
    props.slowdownMaxDelayMs ?? DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS;
  if (
    !Token.isUnresolved(slowdownRetryMaxDelayMs) &&
    !Token.isUnresolved(slowdownRetryBaseDelayMs) &&
    slowdownRetryMaxDelayMs < slowdownRetryBaseDelayMs
  ) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentInvalidPutObjectSlowdownRetryMaxDelayMs"),
      "advancedRuntimeTuning.putObjectRetry.slowdownMaxDelayMs must be greater than or equal to advancedRuntimeTuning.putObjectRetry.slowdownBaseDelayMs.",
      scope,
    );
  }

  if (props.jitter !== undefined && props.jitter !== "full" && props.jitter !== "none") {
    throw new ValidationError(
      literalString("ShinBucketDeploymentInvalidPutObjectRetryJitter"),
      'advancedRuntimeTuning.putObjectRetry.jitter must be either "full" or "none".',
      scope,
    );
  }
}

function validateSourceMemoryProps(
  scope: Construct,
  memoryLimit: number | undefined,
  tuning: ShinBucketDeploymentAdvancedRuntimeTuning,
): void {
  const lambdaMemoryMb = resolvedNumber(memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB);
  const configuredBudgetMb = resolvedNumber(tuning.sourceWindowMemoryBudgetMb);
  const memoryCapBytes = lambdaMemoryMb === undefined ? undefined : (lambdaMemoryMb * MIB) / 2;
  const configuredBudgetBytes =
    configuredBudgetMb === undefined ? undefined : configuredBudgetMb * MIB;

  if (
    memoryCapBytes !== undefined &&
    (!Number.isSafeInteger(memoryCapBytes) || memoryCapBytes <= 0)
  ) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentInvalidMemoryLimitForSourceBudget"),
      "memoryLimit must produce a positive safe-integer byte budget.",
      scope,
    );
  }
  if (configuredBudgetBytes !== undefined && !Number.isSafeInteger(configuredBudgetBytes)) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentInvalidSourceWindowMemoryBudgetMb"),
      "advancedRuntimeTuning.sourceWindowMemoryBudgetMb must produce a safe-integer byte budget.",
      scope,
    );
  }
  if (
    configuredBudgetBytes !== undefined &&
    memoryCapBytes !== undefined &&
    configuredBudgetBytes > memoryCapBytes
  ) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentSourceMemoryBudgetExceedsCap"),
      "advancedRuntimeTuning.sourceWindowMemoryBudgetMb must not exceed 50% of memoryLimit.",
      scope,
    );
  }

  const budgetBytes = configuredBudgetBytes ?? memoryCapBytes;
  if (budgetBytes === undefined) {
    return;
  }
  const blockBytes =
    tuning.sourceBlockBytes === undefined
      ? DEFAULT_SOURCE_BLOCK_BYTES
      : resolvedNumber(tuning.sourceBlockBytes);
  const sourceGetConcurrency =
    tuning.sourceGetConcurrency === undefined
      ? lambdaMemoryMb === undefined
        ? undefined
        : Math.min(8, Math.max(1, Math.floor(lambdaMemoryMb / 256)))
      : resolvedNumber(tuning.sourceGetConcurrency);
  const windowBytes = resolvedNumber(tuning.sourceWindowBytes);

  if (blockBytes !== undefined && blockBytes > budgetBytes) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentSourceBlockExceedsMemoryBudget"),
      "advancedRuntimeTuning.sourceBlockBytes must fit within the invocation-global source memory budget.",
      scope,
    );
  }
  if (windowBytes !== undefined && blockBytes !== undefined && windowBytes < blockBytes) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentSourceWindowBelowBlock"),
      "advancedRuntimeTuning.sourceWindowBytes must be greater than or equal to sourceBlockBytes.",
      scope,
    );
  }
  if (windowBytes !== undefined && windowBytes > budgetBytes) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentSourceWindowExceedsMemoryBudget"),
      "advancedRuntimeTuning.sourceWindowBytes must fit within the invocation-global source memory budget.",
      scope,
    );
  }
  if (sourceGetConcurrency !== undefined && blockBytes !== undefined) {
    const concurrentBlockBytes = blockBytes * sourceGetConcurrency;
    if (!Number.isSafeInteger(concurrentBlockBytes) || concurrentBlockBytes > budgetBytes) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentSourceConcurrencyExceedsMemoryBudget"),
        "advancedRuntimeTuning.sourceBlockBytes * sourceGetConcurrency must fit within the invocation-global source memory budget.",
        scope,
      );
    }
  }
}

function resolvedNumber(value: number | undefined): number | undefined {
  return value === undefined || Token.isUnresolved(value) ? undefined : value;
}

function sourceConfigEqual(stack: Stack, a: SourceConfig, b: SourceConfig) {
  const resolveName = (config: SourceConfig) =>
    JSON.stringify(stack.resolve(config.bucket.bucketName));
  const aCatalog = trustedSourceCatalog(a);
  const bCatalog = trustedSourceCatalog(b);
  return (
    resolveName(a) === resolveName(b) &&
    a.zipObjectKey === b.zipObjectKey &&
    aCatalog?.Version === bCatalog?.Version &&
    aCatalog?.Sha256 === bCatalog?.Sha256 &&
    a.markers === undefined &&
    b.markers === undefined
  );
}

function inspectableDestinationBucketResource(scope: Construct, bucket: Bucket): CfnBucket {
  const resource = bucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new ValidationError(
      literalString("ShinBucketDeploymentDestinationBucketInspectable"),
      "destinationBucket must be a CDK-created Bucket whose CfnBucket encryption configuration can be inspected.",
      scope,
    );
  }
  return resource;
}

function destinationChecksumStrategy(
  scope: Construct,
  bucket: Bucket,
  bucketResource: CfnBucket,
): "sse-s3-etag" | "kms-sha256" {
  const resolved = Stack.of(scope).resolve(bucketResource.bucketEncryption) as unknown;
  if (resolved === undefined) {
    return "sse-s3-etag";
  }
  if (!isRecord(resolved)) {
    throw unsupportedDestinationEncryption(scope);
  }
  const rules = resolved.serverSideEncryptionConfiguration;
  if (!Array.isArray(rules) || rules.length !== 1 || !isRecord(rules[0])) {
    throw unsupportedDestinationEncryption(scope);
  }
  const encryption = rules[0].serverSideEncryptionByDefault;
  if (!isRecord(encryption) || typeof encryption.sseAlgorithm !== "string") {
    throw unsupportedDestinationEncryption(scope);
  }
  switch (encryption.sseAlgorithm) {
    case "AES256":
      return "sse-s3-etag";
    case "aws:kms":
    case "aws:kms:dsse":
      validateDestinationKmsKey(scope, bucket, encryption.kmsMasterKeyId);
      return "kms-sha256";
    default:
      throw unsupportedDestinationEncryption(scope);
  }
}

function validateDestinationKmsKey(
  scope: Construct,
  bucket: Bucket,
  kmsMasterKeyId: unknown,
): void {
  if (kmsMasterKeyId === undefined) {
    return;
  }
  const encryptionKey = bucket.encryptionKey;
  if (!encryptionKey) {
    throw unsupportedDestinationKmsKey(scope);
  }
  const stack = Stack.of(scope);
  if (
    stableStringify(stack.resolve(kmsMasterKeyId)) !==
    stableStringify(stack.resolve(encryptionKey.keyArn))
  ) {
    throw unsupportedDestinationKmsKey(scope);
  }
}

function unsupportedDestinationKmsKey(scope: Construct): ValidationError {
  return new ValidationError(
    literalString("ShinBucketDeploymentDestinationKmsKeyUnsupported"),
    "destinationBucket KMSMasterKeyID must be omitted for the AWS-managed S3 key or match destinationBucket.encryptionKey so CDK can grant the provider access.",
    scope,
  );
}

function unsupportedDestinationEncryption(scope: Construct): ValidationError {
  return new ValidationError(
    literalString("ShinBucketDeploymentDestinationEncryptionUnsupported"),
    "destinationBucket must synthesize one inspectable default encryption rule using AES256, aws:kms, or aws:kms:dsse.",
    scope,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
