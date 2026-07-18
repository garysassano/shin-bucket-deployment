import {
  type AssetHashType,
  type BundlingFileAccess,
  type BundlingOutput,
  CustomResource,
  type DockerImage,
  type DockerVolume,
  type ILocalBundling,
  Lazy,
  Stack,
  Tags,
  Token,
} from "aws-cdk-lib";
import type { IDistribution } from "aws-cdk-lib/aws-cloudfront";
import type { IRole } from "aws-cdk-lib/aws-iam";
import { Architecture, type Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket, type IBucket } from "aws-cdk-lib/aws-s3";
import type { BucketDeploymentProps, ISource, SourceConfig } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { destinationChecksumStrategy, inspectableDestinationBucketResource } from "./destination";
import { ValidationError } from "./errors";
import { grantDestinationPermissions } from "./iam";
import { PROVIDER_TIMEOUT, getOrCreateHandler } from "./provider";
import {
  sourceCatalogs,
  sourceConfigEqual,
  sourceMarkers,
  sourceMarkersConfig,
} from "./source-config";
import { destinationOwnerPrefix, validateDeploymentProps } from "./validation";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";

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
   * Maximum provider-owned destination write attempts per object.
   * Applies to both `PutObject` and `CopyObject`.
   * Must be in the inclusive range 1..10.
   * @default 6
   */
  readonly maxAttempts?: number;

  /**
   * Base retry delay for non-throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000 and no greater than `maxDelayMs`.
   * @default 250
   */
  readonly baseDelayMs?: number;

  /**
   * Maximum retry delay for non-throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000.
   * @default 5000
   */
  readonly maxDelayMs?: number;

  /**
   * Base retry delay for throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000 and no greater than
   * `slowdownMaxDelayMs`.
   * @default 1000
   */
  readonly slowdownBaseDelayMs?: number;

  /**
   * Maximum retry delay for throttling destination write failures, in milliseconds.
   * Must be in the inclusive range 0..60000.
   * @default 30000
   */
  readonly slowdownMaxDelayMs?: number;

  /**
   * Jitter mode applied to computed destination write retry delays.
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
   * Destination `PutObject` and `CopyObject` retry/backoff tuning.
   *
   * The property name is retained for compatibility with the original
   * extracted-upload-only tuning surface.
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
     * the deployment plan. An overlapping namespace owned by another Shin
     * deployment retains stale objects rather than risking co-tenant deletion.
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
     * For a child-to-parent move, cleanup preserves old-child keys that remain
     * in the current deployment plan.
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
   * S3 key prefix under which objects are deployed.
   *
   * This must be a concrete string no longer than 102 characters. `"/"` and
   * an omitted value both select the bucket root.
   *
   * @default - the bucket root
   */
  readonly destinationKeyPrefix?: string;

  /**
   * Whether deployments with the same provider configuration share one Lambda.
   *
   * Set this to `false` to create a deployment-scoped function and generated
   * role, preventing permissions from other deployments from accumulating on
   * them. Explicit `role` and `logGroup` values remain caller-owned and can
   * still be shared intentionally.
   *
   * Isolation creates more Lambda, role, and log resources and gives each
   * deployment an independent cold-start lifecycle.
   *
   * @default true
   */
  readonly shareHandler?: boolean;

  /**
   * Collect detailed correlated state for failed destination `PutObject`
   * attempts.
   *
   * When enabled, the provider records body progress and instantaneous source
   * pressure, emits an immediate sanitized failure event, and includes bounded
   * failure groups in the final deployment summary. This adds bookkeeping to
   * streamed uploads and is intended for diagnostics rather than normal
   * production operation.
   *
   * This setting is part of the shared-handler identity, so deployments using
   * different values do not share a Lambda function.
   *
   * @default false
   */
  readonly detailedFailureDiagnostics?: boolean;

  /**
   * Memory allocated to the provider Lambda, in MiB.
   *
   * The provider derives its invocation-global source-block budget from the
   * actual Lambda memory and caps it at 50%. Memory is part of the handler
   * identity, so sharing deployments using a different value select a distinct
   * provider. A deployment-scoped provider updates this setting in place.
   *
   * @default 1024
   */
  readonly memoryLimit?: BucketDeploymentProps["memoryLimit"];

  /**
   * Existing execution role for the provider Lambda.
   *
   * Deployments with the same provider configuration share a handler and role
   * by default. Source, destination, KMS, and CloudFront permissions from every
   * sharing deployment accumulate on that role. A caller-supplied role remains
   * caller-owned even when `shareHandler` is `false`.
   *
   * @default - a role is created for the provider
   */
  readonly role?: BucketDeploymentProps["role"];

  /**
   * Log group used by the provider Lambda.
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
 * By default, deployments with the same handler identity settings in one stack
 * reuse a single Lambda function. Its role accumulates permissions for every
 * source, destination, KMS key, and CloudFront distribution used by those
 * deployments. Set `shareHandler:false` for a deployment-scoped function and
 * generated role. Handler settings and the package/provider identity
 * participate in shared identity; request-level `advancedRuntimeTuning` does
 * not and can differ between sharing deployments.
 */
export class ShinBucketDeployment extends Construct {
  private readonly cr: CustomResource;
  private readonly destinationBucket: Bucket;
  private readonly sources: SourceConfig[];
  private _deployedBucket?: IBucket;
  private requestDestinationArn = false;

  /**
   * Execution role of the custom-resource Lambda function.
   *
   * With the default shared handler, permissions from every sharing deployment
   * accumulate here. An isolated deployment gets a generated role of its own
   * unless `role` explicitly supplies a caller-owned role.
   */
  public readonly handlerRole: IRole;

  /**
   * The backing Rust Lambda function.
   *
   * This is shared by default and deployment-scoped when `shareHandler` is
   * `false`.
   */
  public readonly handlerFunction: LambdaFunction;

  constructor(scope: Construct, id: string, props: ShinBucketDeploymentProps) {
    super(scope, id);
    validateDeploymentProps(this, props);
    const advancedRuntimeTuning = props.advancedRuntimeTuning ?? {};
    const putObjectRetryTuning = advancedRuntimeTuning.putObjectRetry ?? {};

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
        "ShinBucketDeploymentHandlerRole",
        "lambda.Function should have created a Role",
        this,
      );
    }
    this.handlerRole = handlerRole;

    this.sources = props.sources.map((source: ISource) =>
      source.bind(this, { handlerRole: this.handlerRole }),
    );

    grantDestinationPermissions(this, this.handlerFunction, {
      destinationBucket: this.destinationBucket,
      destinationKeyPrefix: props.destinationKeyPrefix,
      deleteCurrentObjects: deleteStaleObjectsOnDeploy || deleteObjectsOnDelete,
      previousDestinationBucket,
      distribution: props.distribution,
      previousDistribution,
    });

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
    const customResourceIdentity = new Construct(this, "CustomResource");
    this.cr = new CustomResource(customResourceIdentity, this.handlerFunction.node.id, {
      serviceToken: this.handlerFunction.functionArn,
      serviceTimeout: PROVIDER_TIMEOUT,
      properties: {
        SourceBucketNames: Lazy.uncachedList({
          produce: () => this.sources.map((source) => source.bucket.bucketName),
        }),
        SourceObjectKeys: Lazy.uncachedList({
          produce: () => this.sources.map((source) => source.zipObjectKey),
        }),
        SourceCatalogs: Lazy.uncachedAny({
          produce: () => sourceCatalogs(this.sources, props.extract),
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
        DestinationBucketName: this.destinationBucket.bucketName,
        DestinationBucketKeyPrefix: props.destinationKeyPrefix,
        DestinationChecksumStrategy: Lazy.uncachedString({
          produce: () =>
            destinationChecksumStrategy(this, this.destinationBucket, destinationBucketResource),
        }),
        DestinationOwnerId: Lazy.uncachedString({
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

    const destinationOwnerId = this.cr.node.addr.slice(-8);
    const ownerPrefix = destinationOwnerPrefix(props.destinationKeyPrefix);
    const tagKey = `${CUSTOM_RESOURCE_OWNER_TAG}${ownerPrefix ? `:${ownerPrefix}` : ""}:${destinationOwnerId}`;

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
