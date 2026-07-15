import { Token } from "aws-cdk-lib";
import type { BucketDeploymentProps } from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";
import { ValidationError } from "./errors";
import type {
  ShinBucketDeploymentAdvancedRuntimeTuning,
  ShinBucketDeploymentProps,
  ShinBucketDeploymentPutObjectRetryTuning,
} from "./shin-bucket-deployment";

const DEFAULT_MEMORY_LIMIT_MB = 1024;
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

export function validateDeploymentProps(scope: Construct, props: ShinBucketDeploymentProps): void {
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
      "ShinBucketDeploymentPruneUnsupported",
      "ShinBucketDeployment replaces prune with destinationLifecycle.onDeploy.deleteStaleObjects.",
      scope,
    );
  }
  if (maybeUnsupported.retainOnDelete !== undefined) {
    throw new ValidationError(
      "ShinBucketDeploymentRetainOnDeleteUnsupported",
      "ShinBucketDeployment replaces retainOnDelete with the explicit destinationLifecycle.onChange and destinationLifecycle.onDelete settings.",
      scope,
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
      "ShinBucketDeploymentFlatDestinationLifecycleUnsupported",
      "ShinBucketDeployment destinationLifecycle uses onDeploy.deleteStaleObjects, onChange.deleteObjects/fromBucket/invalidateDistribution, and onDelete.deleteObjects.",
      scope,
    );
  }
  if (
    props.destinationLifecycle?.onChange?.fromBucket &&
    props.destinationLifecycle.onChange.deleteObjects !== true
  ) {
    throw new ValidationError(
      "ShinBucketDeploymentFromBucketRequiresDeleteObjects",
      "destinationLifecycle.onChange.fromBucket requires deleteObjects=true.",
      scope,
    );
  }
  if (props.distributionPaths) {
    if (!props.distribution) {
      throw new ValidationError(
        "DistributionSpecifiedDistributionPathsSpecified",
        "Set distribution when distributionPaths is provided.",
        scope,
      );
    }
    if (
      !Token.isUnresolved(props.distributionPaths) &&
      !props.distributionPaths.every(
        (distributionPath) =>
          Token.isUnresolved(distributionPath) || distributionPath.startsWith("/"),
      )
    ) {
      throw new ValidationError(
        "DistributionPathsStart",
        'Every distributionPaths entry must start with "/".',
        scope,
      );
    }
  }

  const unsupportedProps: ReadonlyArray<readonly [unknown, string, string]> = [
    [
      maybeUnsupported.useEfs,
      "ShinBucketDeploymentUseEfsUnsupported",
      "ShinBucketDeployment does not support useEfs; the provider uses bounded ranged reads without staging archives or extracted files on disk.",
    ],
    [
      maybeUnsupported.signContent,
      "ShinBucketDeploymentSignContentUnsupported",
      "ShinBucketDeployment does not support signContent; the provider uses AWS SDK operations rather than the upstream AWS CLI upload path.",
    ],
    [
      maybeUnsupported.serverSideEncryptionCustomerAlgorithm,
      "ShinBucketDeploymentSseCustomerAlgorithmUnsupported",
      "ShinBucketDeployment does not support serverSideEncryptionCustomerAlgorithm; configure supported default encryption on destinationBucket.",
    ],
    [
      maybeUnsupported.expires,
      "ShinBucketDeploymentExpiresUnsupported",
      "ShinBucketDeployment does not support expires; configurable per-object metadata is outside its deployment contract.",
    ],
    [
      maybeUnsupported.logRetention,
      "ShinBucketDeploymentLogRetentionUnsupported",
      "ShinBucketDeployment does not support the legacy logRetention prop; use logGroup instead.",
    ],
    [
      maybeUnsupported.ephemeralStorageSize,
      "ShinBucketDeploymentEphemeralStorageUnsupported",
      "ShinBucketDeployment does not support ephemeralStorageSize because the provider does not use Lambda temporary storage.",
    ],
  ];
  for (const [value, code, message] of unsupportedProps) {
    if (value !== undefined) {
      throw new ValidationError(code, message, scope);
    }
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
      "ShinBucketDeploymentContentSettingsUnsupported",
      `ShinBucketDeployment does not support ${removedContentSettings.join(", ")}. Configure encryption on destinationBucket and cache/storage/lifecycle policy separately; Shin does not deploy configurable object metadata and infers content type from each object key.`,
      scope,
    );
  }

  const advancedRuntimeTuning = props.advancedRuntimeTuning ?? {};
  const putObjectRetryTuning = advancedRuntimeTuning.putObjectRetry ?? {};
  validateIntegerProps(
    scope,
    { maxParallelTransfers: props.maxParallelTransfers },
    ["maxParallelTransfers"],
    1,
    "",
    MAX_PARALLEL_TRANSFERS,
  );
  validateIntegerProps(
    scope,
    advancedRuntimeTuning,
    ["sourceWindowBytes", "sourceWindowMemoryBudgetMb"],
    1,
    "advancedRuntimeTuning.",
  );
  validateIntegerProps(
    scope,
    advancedRuntimeTuning,
    ["sourceGetConcurrency"],
    1,
    "advancedRuntimeTuning.",
    MAX_SOURCE_GET_CONCURRENCY,
  );
  validateIntegerProps(
    scope,
    advancedRuntimeTuning,
    ["sourceBlockBytes"],
    MIN_SOURCE_BLOCK_BYTES,
    "advancedRuntimeTuning.",
  );
  validateIntegerProps(
    scope,
    putObjectRetryTuning,
    ["maxAttempts"],
    1,
    "advancedRuntimeTuning.putObjectRetry.",
    MAX_PUT_OBJECT_ATTEMPTS,
  );
  validateIntegerProps(
    scope,
    advancedRuntimeTuning,
    ["sourceBlockMergeGapBytes"],
    0,
    "advancedRuntimeTuning.",
  );
  validateIntegerProps(
    scope,
    putObjectRetryTuning,
    ["baseDelayMs", "maxDelayMs", "slowdownBaseDelayMs", "slowdownMaxDelayMs"],
    0,
    "advancedRuntimeTuning.putObjectRetry.",
    MAX_RETRY_DELAY_MS,
  );
  validatePutObjectRetryProps(scope, putObjectRetryTuning);
  validateSourceMemoryProps(scope, props.memoryLimit, advancedRuntimeTuning);
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
      "ShinBucketDeploymentInvalidPutObjectRetryMaxDelayMs",
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
      "ShinBucketDeploymentInvalidPutObjectSlowdownRetryMaxDelayMs",
      "advancedRuntimeTuning.putObjectRetry.slowdownMaxDelayMs must be greater than or equal to advancedRuntimeTuning.putObjectRetry.slowdownBaseDelayMs.",
      scope,
    );
  }
  if (props.jitter !== undefined && props.jitter !== "full" && props.jitter !== "none") {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidPutObjectRetryJitter",
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
      "ShinBucketDeploymentInvalidMemoryLimitForSourceBudget",
      "memoryLimit must produce a positive safe-integer byte budget.",
      scope,
    );
  }
  if (configuredBudgetBytes !== undefined && !Number.isSafeInteger(configuredBudgetBytes)) {
    throw new ValidationError(
      "ShinBucketDeploymentInvalidSourceWindowMemoryBudgetMb",
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
      "ShinBucketDeploymentSourceMemoryBudgetExceedsCap",
      "advancedRuntimeTuning.sourceWindowMemoryBudgetMb must not exceed 50% of memoryLimit.",
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
      ? lambdaMemoryMb === undefined
        ? undefined
        : Math.min(8, Math.max(1, Math.floor(lambdaMemoryMb / 256)))
      : resolvedNumber(tuning.sourceGetConcurrency);
  const windowBytes = resolvedNumber(tuning.sourceWindowBytes);
  if (blockBytes !== undefined && blockBytes > budgetBytes) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceBlockExceedsMemoryBudget",
      "advancedRuntimeTuning.sourceBlockBytes must fit within the invocation-global source memory budget.",
      scope,
    );
  }
  if (windowBytes !== undefined && blockBytes !== undefined && windowBytes < blockBytes) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceWindowBelowBlock",
      "advancedRuntimeTuning.sourceWindowBytes must be greater than or equal to sourceBlockBytes.",
      scope,
    );
  }
  if (windowBytes !== undefined && windowBytes > budgetBytes) {
    throw new ValidationError(
      "ShinBucketDeploymentSourceWindowExceedsMemoryBudget",
      "advancedRuntimeTuning.sourceWindowBytes must fit within the invocation-global source memory budget.",
      scope,
    );
  }
  if (sourceGetConcurrency !== undefined && blockBytes !== undefined) {
    const concurrentBlockBytes = blockBytes * sourceGetConcurrency;
    if (!Number.isSafeInteger(concurrentBlockBytes) || concurrentBlockBytes > budgetBytes) {
      throw new ValidationError(
        "ShinBucketDeploymentSourceConcurrencyExceedsMemoryBudget",
        "advancedRuntimeTuning.sourceBlockBytes * sourceGetConcurrency must fit within the invocation-global source memory budget.",
        scope,
      );
    }
  }
}

function resolvedNumber(value: number | undefined): number | undefined {
  return value === undefined || Token.isUnresolved(value) ? undefined : value;
}
