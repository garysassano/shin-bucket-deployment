import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CustomResource, Duration, Lazy, Stack, Tags, Token } from "aws-cdk-lib";
import { Effect, type IRole, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, type Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket, type IBucket } from "aws-cdk-lib/aws-s3";
import type {
  BucketDeploymentProps,
  ISource,
  MarkersConfig,
  SourceConfig,
} from "aws-cdk-lib/aws-s3-deployment";
import { ValidationError } from "aws-cdk-lib/core/lib/errors";
import type { lit } from "aws-cdk-lib/core/lib/private/literal-string";
import { type BundlingOptions as CargoLambdaBundlingOptions, RustFunction } from "cargo-lambda-cdk";
import { Construct } from "constructs";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";
const HANDLER_BINARY_NAME = "rust-bucket-deployment-handler";
const SHARED_HANDLER_ID_PREFIX = "RustBucketDeploymentHandler";
const DEFAULT_MEMORY_LIMIT_MB = 1024;
const DEFAULT_PUT_OBJECT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_PUT_OBJECT_RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS = 1_000;
const DEFAULT_PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS = 30_000;

export type PutObjectRetryJitter = "full" | "none";

export interface RustBucketDeploymentPutObjectRetryTuning {
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

export interface RustBucketDeploymentAdvancedRuntimeTuning {
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
  readonly putObjectRetry?: RustBucketDeploymentPutObjectRetryTuning;
}

export interface RustBucketDeploymentProps
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
   * This is mainly useful while iterating on the handler itself.
   *
   * @default - `<projectRoot>/rust`
   */
  readonly rustProjectPath?: string;

  /**
   * Bundling options passed through to `cargo-lambda-cdk`.
   * @default - local cargo-lambda bundling with the current process environment
   */
  readonly bundling?: CargoLambdaBundlingOptions;

  /**
   * Maximum concurrent object transfers run by the provider.
   * @default 8
   */
  readonly maxParallelTransfers?: number;

  /**
   * Advanced provider runtime tuning. Most deployments should leave this unset
   * and use memoryLimit plus maxParallelTransfers as the public controls.
   *
   * @default - provider defaults derived from memoryLimit
   */
  readonly advancedRuntimeTuning?: RustBucketDeploymentAdvancedRuntimeTuning;
}

/**
 * Prototype Rust-backed alternative to `BucketDeployment`.
 */
export class RustBucketDeployment extends Construct {
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

  constructor(scope: Construct, id: string, props: RustBucketDeploymentProps) {
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
        literalString("RustBucketDeploymentUseEfsUnsupported"),
        "RustBucketDeployment does not support useEfs; the provider keeps source archives in Lambda memory.",
        this,
      );
    }

    if (maybeUnsupported.signContent) {
      throw new ValidationError(
        literalString("RustBucketDeploymentSignContentUnsupported"),
        "RustBucketDeployment does not support signContent in this prototype.",
        this,
      );
    }

    if (maybeUnsupported.serverSideEncryptionCustomerAlgorithm) {
      throw new ValidationError(
        literalString("RustBucketDeploymentSseCustomerAlgorithmUnsupported"),
        "RustBucketDeployment does not support serverSideEncryptionCustomerAlgorithm in this prototype.",
        this,
      );
    }

    if (maybeUnsupported.expires) {
      throw new ValidationError(
        literalString("RustBucketDeploymentExpiresUnsupported"),
        "RustBucketDeployment does not support expires in this prototype.",
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
    const rustProjectPath = props.rustProjectPath ?? resolveDefaultRustProjectPath(this);
    this.handlerFunction = getOrCreateHandler(this, props, architecture, rustProjectPath);

    const handlerRole = this.handlerFunction.role;
    if (!handlerRole) {
      throw new ValidationError(
        literalString("RustBucketDeploymentHandlerRole"),
        "lambda.Function should have created a Role",
        this,
      );
    }
    this.handlerRole = handlerRole;

    this.sources = props.sources.map((source: ISource) =>
      source.bind(this, { handlerRole: this.handlerRole }),
    );

    this.destinationBucket.grantRead(this.handlerFunction);
    this.destinationBucket.grantPut(this.handlerFunction);
    this.destinationBucket.grantDelete(this.handlerFunction);
    this.handlerFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetBucketTagging"],
        resources: [this.destinationBucket.bucketArn],
      }),
    );

    if (props.accessControl) {
      this.destinationBucket.grantPutAcl(this.handlerFunction);
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

    this.cr = new CustomResource(this, "CustomResource", {
      serviceToken: this.handlerFunction.functionArn,
      resourceType: "Custom::RustBucketDeployment",
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
        literalString("RustBucketDeploymentConstructRequiresDestination"),
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
    literalString("RustBucketDeploymentRustProjectPath"),
    "Unable to locate rust/Cargo.toml. Pass rustProjectPath explicitly.",
    scope,
  );
}

function getOrCreateHandler(
  scope: Construct,
  props: RustBucketDeploymentProps,
  architecture: Architecture,
  rustProjectPath: string,
): RustFunction {
  const stack = Stack.of(scope);
  const manifestPath = join(rustProjectPath, "Cargo.toml");
  const handlerId = `${SHARED_HANDLER_ID_PREFIX}${renderHandlerConfigHash(
    stack,
    props,
    architecture,
    manifestPath,
  )}`;

  const existing = stack.node.tryFindChild(handlerId);
  if (existing) {
    if (!(existing instanceof RustFunction)) {
      throw new ValidationError(
        literalString("RustBucketDeploymentHandlerCollision"),
        `Found non-RustFunction child for shared handler id ${handlerId}.`,
        scope,
      );
    }
    return existing;
  }

  return new RustFunction(stack, handlerId, {
    runtime: "provided.al2023",
    architecture,
    binaryName: HANDLER_BINARY_NAME,
    manifestPath,
    bundling: props.bundling,
    timeout: Duration.minutes(15),
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
    ...(props.logRetention ? { logRetention: props.logRetention } : {}),
    logGroup: props.logGroup,
  });
}

function renderHandlerConfigHash(
  stack: Stack,
  props: RustBucketDeploymentProps,
  architecture: Architecture,
  manifestPath: string,
): string {
  const config = {
    architecture: architecture.name,
    bundling: normalizeSingletonValue(props.bundling),
    ephemeralStorageSize: normalizeSingletonValue(props.ephemeralStorageSize),
    logGroup: normalizeSingletonValue(props.logGroup),
    logRetention: normalizeSingletonValue(props.logRetention),
    manifestPath,
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

function literalString(value: string): ReturnType<typeof lit> {
  return value as ReturnType<typeof lit>;
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
        literalString(`RustBucketDeploymentInvalid${propPath}`),
        `${propPath} must be an integer greater than or equal to ${minimum}.`,
        scope,
      );
    }
  }
}

function validatePutObjectRetryProps(
  scope: Construct,
  props: RustBucketDeploymentPutObjectRetryTuning,
): void {
  const retryBaseDelayMs = props.baseDelayMs ?? DEFAULT_PUT_OBJECT_RETRY_BASE_DELAY_MS;
  const retryMaxDelayMs = props.maxDelayMs ?? DEFAULT_PUT_OBJECT_RETRY_MAX_DELAY_MS;
  if (retryMaxDelayMs < retryBaseDelayMs) {
    throw new ValidationError(
      literalString("RustBucketDeploymentInvalidPutObjectRetryMaxDelayMs"),
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
      literalString("RustBucketDeploymentInvalidPutObjectSlowdownRetryMaxDelayMs"),
      "advancedRuntimeTuning.putObjectRetry.slowdownMaxDelayMs must be greater than or equal to advancedRuntimeTuning.putObjectRetry.slowdownBaseDelayMs.",
      scope,
    );
  }

  if (props.jitter !== undefined && props.jitter !== "full" && props.jitter !== "none") {
    throw new ValidationError(
      literalString("RustBucketDeploymentInvalidPutObjectRetryJitter"),
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

function mapSystemMetadata(metadata: RustBucketDeploymentProps) {
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
