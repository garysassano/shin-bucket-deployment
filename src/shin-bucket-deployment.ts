import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
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
import { Bucket, BucketGrants, type IBucket } from "aws-cdk-lib/aws-s3";
import type {
  BucketDeploymentProps,
  ISource,
  MarkersConfig,
  SourceConfig,
} from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { ValidationError } from "./errors";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";
const HANDLER_BINARY_NAME = "shin-bucket-deployment-handler";
const SHARED_HANDLER_ID_PREFIX = "ShinBucketDeploymentHandler";
const DEFAULT_MEMORY_LIMIT_MB = 1024;
const PROVIDER_TIMEOUT = Duration.minutes(15);
const MIN_SOURCE_BLOCK_BYTES = 30;
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
   * @default 6
   */
  readonly maxAttempts?: number;

  /**
   * Base retry delay for non-throttling PutObject failures, in milliseconds.
   * @default 250
   */
  readonly baseDelayMs?: number;

  /**
   * Maximum retry delay for non-throttling PutObject failures, in milliseconds.
   * @default 5000
   */
  readonly maxDelayMs?: number;

  /**
   * Base retry delay for throttling PutObject failures, in milliseconds.
   * @default 1000
   */
  readonly slowdownBaseDelayMs?: number;

  /**
   * Maximum retry delay for throttling PutObject failures, in milliseconds.
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
   * block.
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
   * @default - derived from the provider Lambda memory size
   */
  readonly sourceGetConcurrency?: number;

  /**
   * Resident source block window size in bytes per source archive.
   * @default - derived from the provider Lambda memory size and source archive shape
   */
  readonly sourceWindowBytes?: number;

  /**
   * Memory budget in MiB used to derive the resident source block window.
   * @default - provider Lambda memory size
   */
  readonly sourceWindowMemoryBudgetMb?: number;

  /**
   * Destination PutObject retry/backoff tuning.
   * @default - provider defaults
   */
  readonly putObjectRetry?: ShinBucketDeploymentPutObjectRetryTuning;
}

/**
 * Previous destination resources that changed during a deployment update.
 *
 * CloudFormation supplies the previous prefix through `OldResourceProperties`.
 * Only resources that differ from the current destination need to be provided
 * so CDK can synthesize their IAM permissions and dependencies.
 */
export type ShinBucketDeploymentPreviousDestinationResources =
  | {
      /** Previous destination bucket, when it differs from `destinationBucket`. */
      readonly bucket: IBucket;

      /** Previous CloudFront distribution, when it also differs from the current one. */
      readonly distribution?: IDistribution;
    }
  | {
      /** Previous destination bucket, when it also differs from `destinationBucket`. */
      readonly bucket?: IBucket;

      /** Previous CloudFront distribution, when it differs from the current one. */
      readonly distribution: IDistribution;
    };

/**
 * Destructive destination behavior for CloudFormation lifecycle events.
 *
 * Both operations are disabled by default. Objects are deleted only from the
 * selected destination namespace; the bucket and CloudFront distribution
 * resources are never deleted.
 */
export interface ShinBucketDeploymentDestinationLifecycle {
  /**
   * Delete the current destination objects when CloudFormation deletes the
   * custom resource.
   *
   * @default false
   */
  readonly deleteDestinationObjectsOnDelete?: boolean;

  /**
   * Delete the previous destination objects after a successful deployment
   * update.
   *
   * Set this to `true` when only the prefix changed. If the bucket or
   * distribution changed, provide the previous resource so CDK can synthesize
   * its IAM permissions and dependency.
   *
   * @default false
   */
  readonly deletePreviousDestinationObjectsOnUpdate?:
    | true
    | ShinBucketDeploymentPreviousDestinationResources;
}

export interface ShinBucketDeploymentProps
  extends Omit<
    BucketDeploymentProps,
    | "expires"
    | "retainOnDelete"
    | "signContent"
    | "serverSideEncryptionCustomerAlgorithm"
    | "useEfs"
  > {
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
   * Destructive destination behavior for Update and Delete lifecycle events.
   *
   * @default - retain current objects on Delete and previous objects on Update
   */
  readonly destinationLifecycle?: ShinBucketDeploymentDestinationLifecycle;
}

/**
 * Rust-backed alternative to `BucketDeployment`.
 *
 * By default the provider runs a prebuilt Rust `bootstrap` from an archive
 * shipped with the package, so consumers do not need a Rust toolchain. Passing
 * `bundling` or `rustProjectPath` opts into compiling the provider locally.
 */
export class ShinBucketDeployment extends Construct {
  private readonly cr: CustomResource;
  private readonly destinationBucket: IBucket;
  private readonly sources: SourceConfig[];
  private _deployedBucket?: IBucket;
  private requestDestinationArn = false;

  /**
   * Execution role of the custom resource Lambda function.
   */
  public readonly handlerRole: IRole;

  /**
   * The backing Rust Lambda function.
   */
  public readonly handlerFunction: LambdaFunction;

  constructor(scope: Construct, id: string, props: ShinBucketDeploymentProps) {
    super(scope, id);

    const maybeUnsupported = props as BucketDeploymentProps;

    if (props.distributionPaths) {
      if (!props.distribution) {
        throw new ValidationError(
          literalString("DistributionSpecifiedDistributionPathsSpecified"),
          "Distribution must be specified if distribution paths are specified",
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
            'Distribution paths must start with "/"',
            this,
          );
        }
      }
    }

    if (maybeUnsupported.useEfs) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentUseEfsUnsupported"),
        "ShinBucketDeployment does not support useEfs; the provider keeps source archives in Lambda memory.",
        this,
      );
    }

    if (maybeUnsupported.signContent) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentSignContentUnsupported"),
        "ShinBucketDeployment does not support signContent in this prototype.",
        this,
      );
    }

    if (maybeUnsupported.serverSideEncryptionCustomerAlgorithm) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentSseCustomerAlgorithmUnsupported"),
        "ShinBucketDeployment does not support serverSideEncryptionCustomerAlgorithm in this prototype.",
        this,
      );
    }

    if (maybeUnsupported.expires) {
      throw new ValidationError(
        literalString("ShinBucketDeploymentExpiresUnsupported"),
        "ShinBucketDeployment does not support expires in this prototype.",
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
    );
    validateIntegerProps(
      this,
      advancedRuntimeTuning,
      ["sourceGetConcurrency", "sourceWindowBytes", "sourceWindowMemoryBudgetMb"],
      1,
      "advancedRuntimeTuning.",
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
    );
    validatePutObjectRetryProps(this, putObjectRetryTuning);

    this.destinationBucket = props.destinationBucket;
    const deletePreviousDestinationObjectsOnUpdate =
      props.destinationLifecycle?.deletePreviousDestinationObjectsOnUpdate;
    const previousDestinationResources = deletePreviousDestinationObjectsOnUpdate
      ? {
          bucket:
            deletePreviousDestinationObjectsOnUpdate === true
              ? this.destinationBucket
              : (deletePreviousDestinationObjectsOnUpdate.bucket ?? this.destinationBucket),
          distribution:
            deletePreviousDestinationObjectsOnUpdate === true
              ? undefined
              : deletePreviousDestinationObjectsOnUpdate.distribution,
        }
      : undefined;
    const deleteDestinationObjectsOnDelete =
      props.destinationLifecycle?.deleteDestinationObjectsOnDelete === true;

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
    destinationGrants.delete(
      this.handlerFunction,
      deleteDestinationObjectsOnDelete ? "*" : destinationObjectKeyPattern,
    );
    this.handlerFunction.addToRolePolicy(
      destinationListPolicyStatement(
        this.destinationBucket.bucketArn,
        props.destinationKeyPrefix,
        deleteDestinationObjectsOnDelete,
      ),
    );
    this.handlerFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetBucketTagging"],
        resources: [this.destinationBucket.bucketArn],
      }),
    );

    if (previousDestinationResources) {
      const previous = previousDestinationResources;
      const previousGrants = BucketGrants.fromBucket(previous.bucket);
      previousGrants.delete(this.handlerFunction, "*");
      this.handlerFunction.addToRolePolicy(
        destinationListPolicyStatement(previous.bucket.bucketArn, undefined, false),
      );
      this.handlerFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetBucketTagging"],
          resources: [previous.bucket.bucketArn],
        }),
      );
    }

    if (props.accessControl) {
      this.destinationBucket.grantPutAcl(this.handlerFunction, destinationObjectKeyPattern);
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

    if (previousDestinationResources?.distribution) {
      this.handlerFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cloudfront:GetInvalidation", "cloudfront:CreateInvalidation"],
          resources: [
            cloudFrontDistributionArn(
              this,
              previousDestinationResources.distribution.distributionRef.distributionId,
            ),
          ],
        }),
      );
    }

    this.node.addValidation({
      validate: () => {
        if (this.sources.some((source) => source.markers) && props.extract === false) {
          return [
            "Some sources are incompatible with extract=false; sources with deploy-time values must be extracted.",
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
        DestinationOwnerId: Lazy.string({
          produce: () => this.cr.node.addr.slice(-8),
        }),
        DeletePreviousDestinationObjectsOnUpdate: previousDestinationResources
          ? {
              DestinationBucketName: previousDestinationResources.bucket.bucketName,
              DistributionId:
                previousDestinationResources.distribution?.distributionRef.distributionId,
            }
          : undefined,
        WaitForDistributionInvalidation: props.waitForDistributionInvalidation ?? true,
        DeleteDestinationObjectsOnDelete: deleteDestinationObjectsOnDelete,
        Extract: props.extract ?? true,
        Prune: props.prune ?? true,
        Exclude: props.exclude,
        Include: props.include,
        UserMetadata: props.metadata ? mapUserMetadata(props.metadata) : undefined,
        SystemMetadata: mapSystemMetadata(props),
        DistributionId: props.distribution?.distributionRef.distributionId,
        DistributionPaths: props.distributionPaths,
        OutputObjectKeys: props.outputObjectKeys ?? true,
        DestinationBucketArn: Lazy.string({
          produce: () =>
            this.requestDestinationArn ? this.destinationBucket.bucketArn : undefined,
        }),
        AvailableMemoryMb: props.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB,
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

  public get objectKeys(): string[] {
    return Token.asList(this.cr.getAtt("SourceObjectKeys"));
  }

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
  readonly ephemeralStorageSize: ShinBucketDeploymentProps["ephemeralStorageSize"];
  readonly role: ShinBucketDeploymentProps["role"];
  readonly vpc: ShinBucketDeploymentProps["vpc"];
  readonly vpcSubnets: ShinBucketDeploymentProps["vpcSubnets"];
  readonly securityGroups: ShinBucketDeploymentProps["securityGroups"];
  readonly environment: Record<string, string>;
  readonly logRetention: ShinBucketDeploymentProps["logRetention"];
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
    ephemeralStorageSize: props.ephemeralStorageSize,
    role: props.role,
    vpc: props.vpc,
    vpcSubnets: props.vpcSubnets,
    securityGroups:
      props.securityGroups && props.securityGroups.length > 0 ? props.securityGroups : undefined,
    environment: {
      RUST_BACKTRACE: "1",
    },
    logRetention: props.logRetention,
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
    ephemeralStorageSize: shared.ephemeralStorageSize,
    role: shared.role,
    vpc: shared.vpc,
    vpcSubnets: shared.vpcSubnets,
    securityGroups: shared.securityGroups,
    environment: shared.environment,
    ...(shared.logRetention ? { logRetention: shared.logRetention } : {}),
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
    ephemeralStorageSize: shared.ephemeralStorageSize,
    role: shared.role,
    vpc: shared.vpc,
    vpcSubnets: shared.vpcSubnets,
    securityGroups: shared.securityGroups,
    environment: shared.environment,
    ...(shared.logRetention ? { logRetention: shared.logRetention } : {}),
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
    ephemeralStorageSize: normalizeSingletonValue(props.ephemeralStorageSize),
    handlerSource,
    logGroup: normalizeSingletonValue(props.logGroup),
    logRetention: normalizeSingletonValue(props.logRetention),
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
  deleteDestinationObjectsOnDelete: boolean,
): PolicyStatement {
  const prefix = destinationListPrefix(destinationKeyPrefix, deleteDestinationObjectsOnDelete);
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["s3:ListBucket"],
    resources: [bucketArn],
    conditions: prefix ? { StringEquals: { "s3:prefix": prefix } } : undefined,
  });
}

function destinationListPrefix(
  prefix: string | undefined,
  deleteDestinationObjectsOnDelete: boolean,
) {
  if (!prefix || prefix === "/" || Token.isUnresolved(prefix) || deleteDestinationObjectsOnDelete) {
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
): void {
  const values = props as Record<string, unknown>;
  for (const propName of propNames) {
    const value = values[propName];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
      const propPath = `${propPathPrefix}${propName}`;
      throw new ValidationError(
        literalString(`ShinBucketDeploymentInvalid${propPath}`),
        `${propPath} must be an integer greater than or equal to ${minimum}.`,
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
  if (retryMaxDelayMs < retryBaseDelayMs) {
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
  if (slowdownRetryMaxDelayMs < slowdownRetryBaseDelayMs) {
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

function sourceConfigEqual(stack: Stack, a: SourceConfig, b: SourceConfig) {
  const resolveName = (config: SourceConfig) =>
    JSON.stringify(stack.resolve(config.bucket.bucketName));
  return (
    resolveName(a) === resolveName(b) &&
    a.zipObjectKey === b.zipObjectKey &&
    a.markers === undefined &&
    b.markers === undefined
  );
}

function mapUserMetadata(metadata: { [key: string]: string }) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    normalized[key.toLowerCase()] = value;
  }

  return normalized;
}

function mapSystemMetadata(metadata: ShinBucketDeploymentProps) {
  const res: { [key: string]: string } = {};

  if (metadata.cacheControl) {
    res["cache-control"] = metadata.cacheControl.map((c) => c.value).join(", ");
  }
  if (metadata.contentDisposition) {
    res["content-disposition"] = metadata.contentDisposition;
  }
  if (metadata.contentEncoding) {
    res["content-encoding"] = metadata.contentEncoding;
  }
  if (metadata.contentLanguage) {
    res["content-language"] = metadata.contentLanguage;
  }
  if (metadata.contentType) {
    res["content-type"] = metadata.contentType;
  }
  if (metadata.serverSideEncryption) {
    res.sse = metadata.serverSideEncryption;
  }
  if (metadata.storageClass) {
    res["storage-class"] = metadata.storageClass;
  }
  if (metadata.websiteRedirectLocation) {
    res["website-redirect"] = metadata.websiteRedirectLocation;
  }
  if (metadata.serverSideEncryptionAwsKmsKeyId) {
    res["sse-kms-key-id"] = metadata.serverSideEncryptionAwsKmsKeyId;
  }
  if (metadata.accessControl) {
    res.acl = toKebabCase(metadata.accessControl.toString());
  }

  return Object.keys(res).length === 0 ? undefined : res;
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}
