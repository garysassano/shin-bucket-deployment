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
import { type BundlingOptions as CargoLambdaBundlingOptions, RustFunction } from "cargo-lambda-cdk";
import { Construct } from "constructs";

const CUSTOM_RESOURCE_OWNER_TAG = "aws-cdk:cr-owned";
const HANDLER_BINARY_NAME = "cargo-bucket-deployment-handler";
const SHARED_HANDLER_ID_PREFIX = "CargoBucketDeploymentHandler";

export interface CargoBucketDeploymentProps
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
}

/**
 * Prototype Rust-backed alternative to `BucketDeployment`.
 */
export class CargoBucketDeployment extends Construct {
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

  constructor(scope: Construct, id: string, props: CargoBucketDeploymentProps) {
    super(scope, id);

    const maybeUnsupported = props as BucketDeploymentProps;

    if (props.distributionPaths) {
      if (!props.distribution) {
        throw new ValidationError(
          "DistributionSpecifiedDistributionPathsSpecified",
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
            "DistributionPathsStart",
            'Distribution paths must start with "/"',
            this,
          );
        }
      }
    }

    if (maybeUnsupported.useEfs) {
      throw new ValidationError(
        "CargoBucketDeploymentUseEfsUnsupported",
        "CargoBucketDeployment does not support useEfs. Increase ephemeralStorageSize instead.",
        this,
      );
    }

    if (maybeUnsupported.signContent) {
      throw new ValidationError(
        "CargoBucketDeploymentSignContentUnsupported",
        "CargoBucketDeployment does not support signContent in this prototype.",
        this,
      );
    }

    if (maybeUnsupported.serverSideEncryptionCustomerAlgorithm) {
      throw new ValidationError(
        "CargoBucketDeploymentSseCustomerAlgorithmUnsupported",
        "CargoBucketDeployment does not support serverSideEncryptionCustomerAlgorithm in this prototype.",
        this,
      );
    }

    if (maybeUnsupported.expires) {
      throw new ValidationError(
        "CargoBucketDeploymentExpiresUnsupported",
        "CargoBucketDeployment does not support expires in this prototype.",
        this,
      );
    }

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
        "CargoBucketDeploymentHandlerRole",
        "lambda.Function should have created a Role",
        this,
      );
    }
    this.handlerRole = handlerRole;

    this.sources = props.sources.map((source: ISource) =>
      source.bind(this, { handlerRole: this.handlerRole }),
    );

    this.destinationBucket.grantReadWrite(this.handlerFunction);
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
          resources: ["*"],
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
      resourceType: "Custom::CargoBucketDeployment",
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
      },
    });

    let prefix = props.destinationKeyPrefix ? `:${props.destinationKeyPrefix}` : "";
    prefix += `:${this.cr.node.addr.slice(-8)}`;
    const tagKey = CUSTOM_RESOURCE_OWNER_TAG + prefix;

    if (!Token.isUnresolved(tagKey) && tagKey.length > 128) {
      throw new ValidationError(
        "CargoBucketDeploymentConstructRequiresDestination",
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
    "CargoBucketDeploymentRustProjectPath",
    "Unable to locate rust/Cargo.toml. Pass rustProjectPath explicitly.",
    scope,
  );
}

function getOrCreateHandler(
  scope: Construct,
  props: CargoBucketDeploymentProps,
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
        "CargoBucketDeploymentHandlerCollision",
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
    memorySize: props.memoryLimit,
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
  props: CargoBucketDeploymentProps,
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
    memoryLimit: normalizeSingletonValue(props.memoryLimit),
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

function mapSystemMetadata(metadata: CargoBucketDeploymentProps) {
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
