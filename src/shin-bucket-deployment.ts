import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CustomResource, Duration, Lazy, Stack, Tags, Token } from "aws-cdk-lib";
import { Effect, type IRole, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket, BucketGrants, type IBucket } from "aws-cdk-lib/aws-s3";
import type {
  BucketDeploymentProps,
  ISource,
  MarkersConfig,
  SourceConfig,
} from "aws-cdk-lib/aws-s3-deployment";
import type { BundlingOptions as CargoLambdaBundlingOptions } from "cargo-lambda-cdk";
import { Construct } from "constructs";
import { ValidationError } from "./errors";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";
const HANDLER_BINARY_NAME = "shin-bucket-deployment-handler";
const SHARED_HANDLER_ID_PREFIX = "ShinBucketDeploymentHandler";
const DEFAULT_MEMORY_LIMIT_MB = 1024;
const PROVIDER_TIMEOUT = Duration.minutes(15);
const DEFAULT_PUT_OBJECT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_PUT_OBJECT_RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS = 1_000;
const DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS = 30_000;

export type PutObjectRetryJitter = "full" | "none";

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

export interface ShinBucketDeploymentProps
  extends Omit<
    BucketDeploymentProps,
    "expires" | "signContent" | "serverSideEncryptionCustomerAlgorithm" | "useEfs"
  > {
  /**
   * Lambda architecture for the Rust provider.
   * @default Architecture.ARM_64
   */
  readonly architecture?: Architecture;

  /**
   * Optional override for the Rust provider project directory.
   *
   * Setting this opts into compiling the Rust provider locally with
   * `cargo-lambda-cdk` instead of using the prebuilt binary shipped with the
   * package. This requires a Rust toolchain plus the optional `cargo-lambda-cdk`
   * dependency and is mainly useful while iterating on the handler itself.
   *
   * @default - the prebuilt provider binary shipped with the package, or
   * `<projectRoot>/rust` when no prebuilt binary is available
   */
  readonly rustProjectPath?: string;

  /**
   * Bundling options passed through to `cargo-lambda-cdk`.
   *
   * Setting this opts into compiling the Rust provider locally instead of using
   * the prebuilt binary shipped with the package, and requires the optional
   * `cargo-lambda-cdk` dependency plus a Rust toolchain.
   *
   * @default - the prebuilt provider binary shipped with the package
   */
  readonly bundling?: CargoLambdaBundlingOptions;

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
}

/**
 * Rust-backed alternative to `BucketDeployment`.
 *
 * By default the provider runs a prebuilt Rust `bootstrap` binary shipped with
 * the package, so consumers do not need a Rust toolchain. Passing `bundling` or
 * `rustProjectPath` opts into compiling the provider locally with the optional
 * `cargo-lambda-cdk` dependency.
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
      [
        "sourceBlockBytes",
        "sourceGetConcurrency",
        "sourceWindowBytes",
        "sourceWindowMemoryBudgetMb",
      ],
      1,
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
      props.retainOnDelete === false ? "*" : destinationObjectKeyPattern,
    );
    this.handlerFunction.addToRolePolicy(
      destinationListPolicyStatement(
        this.destinationBucket.bucketArn,
        props.destinationKeyPrefix,
        props.retainOnDelete,
      ),
    );
    this.handlerFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetBucketTagging"],
        resources: [this.destinationBucket.bucketArn],
      }),
    );

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
        WaitForDistributionInvalidation: props.waitForDistributionInvalidation ?? true,
        RetainOnDelete: props.retainOnDelete,
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
 * Locate the prebuilt Lambda `bootstrap` binary shipped inside the published
 * package for the requested architecture, if present. Published tarballs
 * include `assets/bootstrap-<arch>/bootstrap`; local checkouts that have not
 * run the prebuild step will not, in which case the construct falls back to the
 * local cargo-lambda compile path.
 */
function resolvePrebuiltBootstrapDir(architecture: Architecture): string | undefined {
  const dirName = `bootstrap-${architecture.name}`;
  const candidates = [
    join(__dirname, "..", "..", "assets", dirName),
    join(__dirname, "..", "assets", dirName),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "bootstrap"))) {
      return candidate;
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
  const prebuiltBootstrapDir = wantsCompile ? undefined : resolvePrebuiltBootstrapDir(architecture);
  const useCompilePath = wantsCompile || prebuiltBootstrapDir === undefined;

  const rustProjectPath = useCompilePath
    ? (props.rustProjectPath ?? resolveDefaultRustProjectPath(scope))
    : undefined;
  const manifestPath =
    rustProjectPath !== undefined ? join(rustProjectPath, "Cargo.toml") : undefined;

  const handlerSource = useCompilePath
    ? `compile:${manifestPath}`
    : `prebuilt:${prebuiltBootstrapDir}`;

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

  return createPrebuiltHandler(stack, handlerId, shared, prebuiltBootstrapDir as string);
}

function createPrebuiltHandler(
  stack: Stack,
  handlerId: string,
  shared: SharedHandlerOptions,
  bootstrapDir: string,
): LambdaFunction {
  return new LambdaFunction(stack, handlerId, {
    runtime: Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    code: Code.fromAsset(bootstrapDir),
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
  retainOnDelete: boolean | undefined,
): PolicyStatement {
  const prefix = destinationListPrefix(destinationKeyPrefix, retainOnDelete);
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["s3:ListBucket"],
    resources: [bucketArn],
    conditions: prefix ? { StringEquals: { "s3:prefix": prefix } } : undefined,
  });
}

function destinationListPrefix(prefix: string | undefined, retainOnDelete: boolean | undefined) {
  if (!prefix || prefix === "/" || Token.isUnresolved(prefix) || retainOnDelete === false) {
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
