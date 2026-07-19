import { Token } from "aws-cdk-lib";
import type { Construct } from "constructs";
import { DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB } from "./defaults";
import { DestinationWriteRetryJitter, FailureDiagnostics, ProviderSharing } from "./enums";
import { ValidationError } from "./errors";
import type {
  ShinBucketDeploymentAdvancedTransferTuning,
  ShinBucketDeploymentDestinationWriteRetryTuning,
  ShinBucketDeploymentProps,
} from "./shin-bucket-deployment";

const MIN_SOURCE_BLOCK_BYTES = 30;
const DEFAULT_SOURCE_BLOCK_BYTES = 8 * 1024 * 1024;
const MAX_CONCURRENCY = 256;
const MAX_SOURCE_GET_CONCURRENCY = 64;
const MAX_DESTINATION_WRITE_ATTEMPTS = 10;
const MAX_RETRY_DELAY_MS = 60_000;
const MIB = 1024 * 1024;
const DEFAULT_DESTINATION_WRITE_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_DESTINATION_WRITE_RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_DESTINATION_WRITE_SLOWDOWN_RETRY_BASE_DELAY_MS = 1_000;
const DEFAULT_DESTINATION_WRITE_SLOWDOWN_RETRY_MAX_DELAY_MS = 30_000;
const MAX_DESTINATION_KEY_PREFIX_LENGTH = 102;

const ROOT_KEYS = [
  "sources",
  "destination",
  "sourceProcessing",
  "providerLambda",
  "transfer",
  "cloudfrontInvalidation",
  "destinationLifecycle",
] as const;

const LEGACY_ROOT_PROPERTY_MIGRATIONS = {
  destinationBucket: "destination.bucket",
  destinationKeyPrefix: "destination.keyPrefix",
  extract: "sourceProcessing.extract",
  include: "sourceProcessing.include",
  exclude: "sourceProcessing.exclude",
  providerScope: "providerLambda.sharing",
  architecture: "providerLambda.architecture",
  memoryLimit: "providerLambda.memorySize",
  failureDiagnostics: "providerLambda.failureDiagnostics",
  role: "providerLambda.role",
  logGroup: "providerLambda.logGroup",
  vpc: "providerLambda.vpc",
  vpcSubnets: "providerLambda.vpcSubnets",
  securityGroups: "providerLambda.securityGroups",
  localProviderBuild: "providerLambda.localBuild",
  maxParallelTransfers: "transfer.maxConcurrency",
  advancedRuntimeTuning: "transfer.advancedTuning",
} as const;

const PROVIDER_LAMBDA_KEYS = [
  "sharing",
  "architecture",
  "memorySize",
  "failureDiagnostics",
  "role",
  "logGroup",
  "vpc",
  "vpcSubnets",
  "securityGroups",
  "localBuild",
] as const;

export function destinationOwnerPrefix(prefix: string | undefined): string {
  return prefix === "/" ? "" : (prefix ?? "");
}

export function validateDeploymentProps(scope: Construct, props: ShinBucketDeploymentProps): void {
  const rawProps = requireObject(scope, props, "props");
  rejectKnownFormerRootProperties(scope, rawProps);
  rejectUnknownKeys(scope, rawProps, "props", ROOT_KEYS);

  if (!Array.isArray(rawProps.sources)) {
    throw new ValidationError(
      "ShinBucketDeploymentSourcesRequired",
      "sources must be an array.",
      scope,
    );
  }

  const destination = requireObjectGroup(scope, rawProps.destination, "destination", [
    "bucket",
    "keyPrefix",
  ]);
  if (destination.bucket === undefined || destination.bucket === null) {
    throw new ValidationError(
      "ShinBucketDeploymentDestinationBucketRequired",
      "destination.bucket is required.",
      scope,
    );
  }

  optionalObjectGroup(scope, rawProps.sourceProcessing, "sourceProcessing", [
    "extract",
    "include",
    "exclude",
  ]);
  const providerLambda = optionalObjectGroup(
    scope,
    rawProps.providerLambda,
    "providerLambda",
    PROVIDER_LAMBDA_KEYS,
    { scope: "sharing" },
  );
  const localBuild = optionalObjectGroup(
    scope,
    providerLambda?.localBuild,
    "providerLambda.localBuild",
    ["projectPath", "bundling"],
  );
  const bundling = optionalObjectGroup(
    scope,
    localBuild?.bundling,
    "providerLambda.localBuild.bundling",
    [
      "environment",
      "forcedDockerBundling",
      "dockerImage",
      "dockerOptions",
      "assetHashType",
      "assetHash",
      "commandHooks",
      "cargoLambdaFlags",
      "profile",
    ],
  );
  optionalObjectGroup(
    scope,
    bundling?.dockerOptions,
    "providerLambda.localBuild.bundling.dockerOptions",
    [
      "entrypoint",
      "command",
      "volumes",
      "volumesFrom",
      "workingDirectory",
      "user",
      "local",
      "outputType",
      "securityOpt",
      "network",
      "bundlingFileAccess",
    ],
  );
  optionalObjectGroup(
    scope,
    bundling?.commandHooks,
    "providerLambda.localBuild.bundling.commandHooks",
    ["beforeBundling", "afterBundling"],
  );

  const transfer = optionalObjectGroup(
    scope,
    rawProps.transfer,
    "transfer",
    ["maxConcurrency", "advancedTuning"],
    { maxParallelTransfers: "maxConcurrency" },
  );
  const advancedTuning = optionalObjectGroup(
    scope,
    transfer?.advancedTuning,
    "transfer.advancedTuning",
    [
      "sourceBlockBytes",
      "sourceBlockMergeGapBytes",
      "sourceGetConcurrency",
      "sourceWindowBytes",
      "sourceWindowMemoryBudgetMiB",
      "destinationWriteRetry",
    ],
    {
      putObjectRetry: "destinationWriteRetry",
      sourceWindowMemoryBudgetMb: "sourceWindowMemoryBudgetMiB",
    },
  );
  optionalObjectGroup(
    scope,
    advancedTuning?.destinationWriteRetry,
    "transfer.advancedTuning.destinationWriteRetry",
    [
      "maxAttempts",
      "baseDelayMs",
      "maxDelayMs",
      "slowdownBaseDelayMs",
      "slowdownMaxDelayMs",
      "jitter",
    ],
  );

  optionalObjectGroup(scope, rawProps.cloudfrontInvalidation, "cloudfrontInvalidation", [
    "distribution",
    "paths",
    "waitForCompletion",
  ]);
  const destinationLifecycle = optionalObjectGroup(
    scope,
    rawProps.destinationLifecycle,
    "destinationLifecycle",
    ["onDeploy", "onChange", "onDelete"],
    {
      deleteDestinationObjectsOnDelete: "onDelete.deleteCurrentObjects",
      deletePreviousDestinationObjectsOnUpdate: "onChange.deletePreviousObjects",
      onDeployment: "onDeploy",
    },
  );
  optionalObjectGroup(scope, destinationLifecycle?.onDeploy, "destinationLifecycle.onDeploy", [
    "deleteStaleObjects",
  ]);
  optionalObjectGroup(
    scope,
    destinationLifecycle?.onChange,
    "destinationLifecycle.onChange",
    ["deletePreviousObjects", "previousBucket", "invalidatePreviousDistribution"],
    {
      deleteObjects: "deletePreviousObjects",
      fromBucket: "previousBucket",
      invalidateDistribution: "invalidatePreviousDistribution",
    },
  );
  optionalObjectGroup(
    scope,
    destinationLifecycle?.onDelete,
    "destinationLifecycle.onDelete",
    ["deleteCurrentObjects"],
    { deleteObjects: "deleteCurrentObjects" },
  );

  if (
    props.providerLambda?.sharing !== undefined &&
    !Object.values(ProviderSharing).includes(props.providerLambda.sharing)
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidProviderLambdaSharing",
      "providerLambda.sharing must be ProviderSharing.STACK or ProviderSharing.DEPLOYMENT.",
      scope,
    );
  }
  if (
    props.providerLambda?.failureDiagnostics !== undefined &&
    !Object.values(FailureDiagnostics).includes(props.providerLambda.failureDiagnostics)
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidProviderLambdaFailureDiagnostics",
      "providerLambda.failureDiagnostics must be FailureDiagnostics.STANDARD or FailureDiagnostics.DETAILED.",
      scope,
    );
  }
  validateDestinationKeyPrefix(scope, props.destination.keyPrefix);

  if (
    props.destinationLifecycle?.onChange?.previousBucket &&
    props.destinationLifecycle.onChange.deletePreviousObjects !== true
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentPreviousBucketRequiresDeletePreviousObjects",
      "destinationLifecycle.onChange.previousBucket requires deletePreviousObjects=true.",
      scope,
    );
  }
  if (props.cloudfrontInvalidation) {
    if (!props.cloudfrontInvalidation.distribution) {
      throw new ValidationError(
        "ShinBucketDeploymentCloudFrontDistributionRequired",
        "cloudfrontInvalidation.distribution is required.",
        scope,
      );
    }
    if (
      props.cloudfrontInvalidation.paths !== undefined &&
      !Token.isUnresolved(props.cloudfrontInvalidation.paths) &&
      !props.cloudfrontInvalidation.paths.every(
        (path) => Token.isUnresolved(path) || path.startsWith("/"),
      )
    ) {
      throw new ValidationError(
        "ShinBucketDeploymentCloudFrontPathsStart",
        'Every cloudfrontInvalidation.paths entry must start with "/".',
        scope,
      );
    }
  }

  const transferOptions = props.transfer ?? {};
  const advancedTransferTuning = transferOptions.advancedTuning ?? {};
  const destinationWriteRetryTuning = advancedTransferTuning.destinationWriteRetry ?? {};
  validateIntegerProps(scope, transferOptions, ["maxConcurrency"], 1, "transfer.", MAX_CONCURRENCY);
  validateIntegerProps(
    scope,
    advancedTransferTuning,
    ["sourceWindowBytes", "sourceWindowMemoryBudgetMiB"],
    1,
    "transfer.advancedTuning.",
  );
  validateIntegerProps(
    scope,
    advancedTransferTuning,
    ["sourceGetConcurrency"],
    1,
    "transfer.advancedTuning.",
    MAX_SOURCE_GET_CONCURRENCY,
  );
  validateIntegerProps(
    scope,
    advancedTransferTuning,
    ["sourceBlockBytes"],
    MIN_SOURCE_BLOCK_BYTES,
    "transfer.advancedTuning.",
  );
  validateIntegerProps(
    scope,
    destinationWriteRetryTuning,
    ["maxAttempts"],
    1,
    "transfer.advancedTuning.destinationWriteRetry.",
    MAX_DESTINATION_WRITE_ATTEMPTS,
  );
  validateIntegerProps(
    scope,
    advancedTransferTuning,
    ["sourceBlockMergeGapBytes"],
    0,
    "transfer.advancedTuning.",
  );
  validateIntegerProps(
    scope,
    destinationWriteRetryTuning,
    ["baseDelayMs", "maxDelayMs", "slowdownBaseDelayMs", "slowdownMaxDelayMs"],
    0,
    "transfer.advancedTuning.destinationWriteRetry.",
    MAX_RETRY_DELAY_MS,
  );
  validateDestinationWriteRetryProps(scope, destinationWriteRetryTuning);
  validateSourceMemoryProps(scope, props.providerLambda?.memorySize, advancedTransferTuning);
}

function rejectKnownFormerRootProperties(scope: Construct, props: Record<string, unknown>): void {
  for (const [formerPath, replacementPath] of Object.entries(LEGACY_ROOT_PROPERTY_MIGRATIONS)) {
    if (hasOwn(props, formerPath)) {
      throw new ValidationError(
        "ShinBucketDeploymentLegacyProperty",
        `${formerPath} has moved to ${replacementPath}.`,
        scope,
      );
    }
  }

  const replacedProperties: ReadonlyArray<readonly [string, string]> = [
    ["prune", "destinationLifecycle.onDeploy.deleteStaleObjects"],
    [
      "retainOnDelete",
      "destinationLifecycle.onChange.deletePreviousObjects and destinationLifecycle.onDelete.deleteCurrentObjects",
    ],
    ["distribution", "cloudfrontInvalidation.distribution"],
    ["distributionPaths", "cloudfrontInvalidation.paths"],
    ["waitForDistributionInvalidation", "cloudfrontInvalidation.waitForCompletion"],
    ["shareHandler", "providerLambda.sharing"],
    ["detailedFailureDiagnostics", "providerLambda.failureDiagnostics"],
    ["rustProjectPath", "providerLambda.localBuild.projectPath"],
    ["bundling", "providerLambda.localBuild.bundling"],
    ["logRetention", "providerLambda.logGroup"],
  ];
  for (const [formerPath, replacementPath] of replacedProperties) {
    if (hasOwn(props, formerPath)) {
      throw new ValidationError(
        "ShinBucketDeploymentLegacyProperty",
        `${formerPath} has been replaced by ${replacementPath}.`,
        scope,
      );
    }
  }

  if (hasOwn(props, "outputObjectKeys")) {
    throw new ValidationError(
      "ShinBucketDeploymentOutputObjectKeysRemoved",
      "Remove outputObjectKeys; Shin returns object keys only when the objectKeys property is accessed.",
      scope,
    );
  }

  const unsupportedProperties: ReadonlyArray<readonly [string, string]> = [
    [
      "useEfs",
      "ShinBucketDeployment does not support useEfs; the provider uses bounded ranged reads without staging archives or extracted files on disk.",
    ],
    [
      "signContent",
      "ShinBucketDeployment does not support signContent; the provider uses AWS SDK operations rather than the upstream AWS CLI upload path.",
    ],
    [
      "serverSideEncryptionCustomerAlgorithm",
      "ShinBucketDeployment does not support serverSideEncryptionCustomerAlgorithm; configure supported default encryption on destination.bucket.",
    ],
    [
      "expires",
      "ShinBucketDeployment does not support expires; configurable per-object metadata is outside its deployment contract.",
    ],
    [
      "ephemeralStorageSize",
      "ShinBucketDeployment does not support ephemeralStorageSize because the provider does not use Lambda temporary storage.",
    ],
  ];
  for (const [property, message] of unsupportedProperties) {
    if (hasOwn(props, property)) {
      throw new ValidationError("ShinBucketDeploymentUnsupportedProperty", message, scope);
    }
  }

  const removedContentSettings = [
    "accessControl",
    "cacheControl",
    "contentDisposition",
    "contentEncoding",
    "contentLanguage",
    "contentType",
    "metadata",
    "serverSideEncryption",
    "serverSideEncryptionAwsKmsKeyId",
    "storageClass",
    "websiteRedirectLocation",
  ].filter((property) => hasOwn(props, property));
  if (removedContentSettings.length > 0) {
    throw new ValidationError(
      "ShinBucketDeploymentContentSettingsUnsupported",
      `ShinBucketDeployment does not support ${removedContentSettings.join(", ")}. Configure encryption on destination.bucket and cache/storage/lifecycle policy separately; Shin does not deploy configurable object metadata and infers content type from each object key.`,
      scope,
    );
  }
}

function requireObjectGroup(
  scope: Construct,
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  migrations: Readonly<Record<string, string>> = {},
): Record<string, unknown> {
  if (value === undefined || value === null) {
    throw new ValidationError(
      "ShinBucketDeploymentRequiredObject",
      `${path} must be an object.`,
      scope,
    );
  }
  return validateObjectGroup(scope, value, path, allowedKeys, migrations);
}

function optionalObjectGroup(
  scope: Construct,
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  migrations: Readonly<Record<string, string>> = {},
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  return validateObjectGroup(scope, value, path, allowedKeys, migrations);
}

function validateObjectGroup(
  scope: Construct,
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  migrations: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const group = requireObject(scope, value, path);
  for (const [formerName, replacementName] of Object.entries(migrations)) {
    if (hasOwn(group, formerName)) {
      throw new ValidationError(
        "ShinBucketDeploymentLegacyProperty",
        `${path}.${formerName} has been replaced by ${path}.${replacementName}.`,
        scope,
      );
    }
  }
  rejectUnknownKeys(scope, group, path, allowedKeys);
  return group;
}

function requireObject(scope: Construct, value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidObject",
      `${path} must be an object.`,
      scope,
    );
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(
  scope: Construct,
  value: Record<string, unknown>,
  path: string,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort()[0];
  if (unknown !== undefined) {
    throw new ValidationError(
      "ShinBucketDeploymentUnknownProperty",
      `Unknown ShinBucketDeployment property ${path}.${unknown}.`,
      scope,
    );
  }
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(value, key);
}

function validateDestinationKeyPrefix(scope: Construct, prefix: string | undefined): void {
  if (prefix === undefined) return;
  if (Token.isUnresolved(prefix)) {
    throw new ValidationError(
      "ShinBucketDeploymentDestinationKeyPrefixUnresolved",
      "destination.keyPrefix must be a concrete string so destination ownership can be validated.",
      scope,
    );
  }
  if (prefix.length > MAX_DESTINATION_KEY_PREFIX_LENGTH) {
    throw new ValidationError(
      "ShinBucketDeploymentDestinationKeyPrefixTooLong",
      `destination.keyPrefix must be <=${MAX_DESTINATION_KEY_PREFIX_LENGTH} characters.`,
      scope,
    );
  }
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
    if (value === undefined || Token.isUnresolved(value)) continue;
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      const propPath = `${propPathPrefix}${propName}`;
      throw new ValidationError(
        `ShinBucketDeploymentInvalid${propPath}`,
        `${propPath} must be a safe integer in the inclusive range ${minimum}..${maximum}.`,
        scope,
      );
    }
  }
}

function validateDestinationWriteRetryProps(
  scope: Construct,
  props: ShinBucketDeploymentDestinationWriteRetryTuning,
): void {
  const retryBaseDelayMs = props.baseDelayMs ?? DEFAULT_DESTINATION_WRITE_RETRY_BASE_DELAY_MS;
  const retryMaxDelayMs = props.maxDelayMs ?? DEFAULT_DESTINATION_WRITE_RETRY_MAX_DELAY_MS;
  if (
    !Token.isUnresolved(retryMaxDelayMs) &&
    !Token.isUnresolved(retryBaseDelayMs) &&
    retryMaxDelayMs < retryBaseDelayMs
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidDestinationWriteRetryMaxDelayMs",
      "transfer.advancedTuning.destinationWriteRetry.maxDelayMs must be greater than or equal to transfer.advancedTuning.destinationWriteRetry.baseDelayMs.",
      scope,
    );
  }
  const slowdownRetryBaseDelayMs =
    props.slowdownBaseDelayMs ?? DEFAULT_DESTINATION_WRITE_SLOWDOWN_RETRY_BASE_DELAY_MS;
  const slowdownRetryMaxDelayMs =
    props.slowdownMaxDelayMs ?? DEFAULT_DESTINATION_WRITE_SLOWDOWN_RETRY_MAX_DELAY_MS;
  if (
    !Token.isUnresolved(slowdownRetryMaxDelayMs) &&
    !Token.isUnresolved(slowdownRetryBaseDelayMs) &&
    slowdownRetryMaxDelayMs < slowdownRetryBaseDelayMs
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidDestinationWriteSlowdownRetryMaxDelayMs",
      "transfer.advancedTuning.destinationWriteRetry.slowdownMaxDelayMs must be greater than or equal to transfer.advancedTuning.destinationWriteRetry.slowdownBaseDelayMs.",
      scope,
    );
  }
  if (
    props.jitter !== undefined &&
    !Object.values(DestinationWriteRetryJitter).includes(props.jitter)
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidDestinationWriteRetryJitter",
      "transfer.advancedTuning.destinationWriteRetry.jitter must be DestinationWriteRetryJitter.FULL or DestinationWriteRetryJitter.NONE.",
      scope,
    );
  }
}

function validateSourceMemoryProps(
  scope: Construct,
  memorySize: number | undefined,
  tuning: ShinBucketDeploymentAdvancedTransferTuning,
): void {
  const lambdaMemoryMiB = resolvedNumber(memorySize ?? DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB);
  const configuredBudgetMiB = resolvedNumber(tuning.sourceWindowMemoryBudgetMiB);
  const memoryCapBytes = lambdaMemoryMiB === undefined ? undefined : (lambdaMemoryMiB * MIB) / 2;
  const configuredBudgetBytes =
    configuredBudgetMiB === undefined ? undefined : configuredBudgetMiB * MIB;
  if (
    memoryCapBytes !== undefined &&
    (!Number.isSafeInteger(memoryCapBytes) || memoryCapBytes <= 0)
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidProviderLambdaMemorySizeForSourceBudget",
      "providerLambda.memorySize must produce a positive safe-integer byte budget.",
      scope,
    );
  }
  if (configuredBudgetBytes !== undefined && !Number.isSafeInteger(configuredBudgetBytes)) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidSourceWindowMemoryBudgetMiB",
      "transfer.advancedTuning.sourceWindowMemoryBudgetMiB must produce a safe-integer byte budget.",
      scope,
    );
  }
  if (
    configuredBudgetBytes !== undefined &&
    memoryCapBytes !== undefined &&
    configuredBudgetBytes > memoryCapBytes
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceMemoryBudgetExceedsCap",
      "transfer.advancedTuning.sourceWindowMemoryBudgetMiB must not exceed 50% of providerLambda.memorySize.",
      scope,
    );
  }
  const budgetBytes = configuredBudgetBytes ?? memoryCapBytes;
  if (budgetBytes === undefined) return;
  const blockBytes =
    tuning.sourceBlockBytes === undefined
      ? DEFAULT_SOURCE_BLOCK_BYTES
      : resolvedNumber(tuning.sourceBlockBytes);
  const sourceGetConcurrency =
    tuning.sourceGetConcurrency === undefined
      ? lambdaMemoryMiB === undefined
        ? undefined
        : Math.min(8, Math.max(1, Math.floor(lambdaMemoryMiB / 256)))
      : resolvedNumber(tuning.sourceGetConcurrency);
  const windowBytes = resolvedNumber(tuning.sourceWindowBytes);
  if (blockBytes !== undefined && blockBytes > budgetBytes) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceBlockExceedsMemoryBudget",
      "transfer.advancedTuning.sourceBlockBytes must fit within the invocation-global source memory budget.",
      scope,
    );
  }
  if (windowBytes !== undefined && blockBytes !== undefined && windowBytes < blockBytes) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceWindowBelowBlock",
      "transfer.advancedTuning.sourceWindowBytes must be greater than or equal to transfer.advancedTuning.sourceBlockBytes.",
      scope,
    );
  }
  if (windowBytes !== undefined && windowBytes > budgetBytes) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceWindowExceedsMemoryBudget",
      "transfer.advancedTuning.sourceWindowBytes must fit within the invocation-global source memory budget.",
      scope,
    );
  }
  if (sourceGetConcurrency !== undefined && blockBytes !== undefined) {
    const concurrentBlockBytes = blockBytes * sourceGetConcurrency;
    if (!Number.isSafeInteger(concurrentBlockBytes) || concurrentBlockBytes > budgetBytes) {
      throw new ValidationError(
        "ShinBucketDeploymentSourceConcurrencyExceedsMemoryBudget",
        "transfer.advancedTuning.sourceBlockBytes * transfer.advancedTuning.sourceGetConcurrency must fit within the invocation-global source memory budget.",
        scope,
      );
    }
  }
}

function resolvedNumber(value: number | undefined): number | undefined {
  return value === undefined || Token.isUnresolved(value) ? undefined : value;
}
