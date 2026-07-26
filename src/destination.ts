import { Stack } from "aws-cdk-lib";
import { type Bucket, CfnBucket } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { ValidationError } from "./errors";
import { stableStringify } from "./stable-json";

export function inspectableDestinationBucketResource(scope: Construct, bucket: Bucket): CfnBucket {
  const resource = bucket.node.defaultChild;
  if (!CfnBucket.isCfnBucket(resource)) {
    throw new ValidationError(
      "ShinBucketDeploymentDestinationBucketInspectable",
      "destination.bucket must be a CDK-created Bucket whose CfnBucket encryption configuration can be inspected.",
      scope,
    );
  }
  return resource;
}

/**
 * Reads the destination bucket's rendered `BucketEncryption`.
 *
 * This deliberately renders the resource rather than reading the public
 * `CfnBucket.bucketEncryption` property. CDK keeps `addPropertyOverride` values
 * separate from the typed L1 model and merges them only while rendering, so the
 * public property reports `undefined` for a bucket encrypted purely by escape
 * hatch, and reports the pre-override algorithm when an override replaces it.
 * Trusting it would silently classify a KMS bucket as SSE-S3 and skip
 * {@link validateDestinationKmsKey}. The rendered form is the only
 * representation of what actually deploys.
 *
 * `_toCloudFormation` is CDK-internal, so a rendering failure is converted into a
 * distinct, stable error rather than surfacing as a raw `TypeError`. Note CDK
 * itself invokes this method on every `CfnElement` during synthesis, so it cannot
 * quietly disappear without breaking CDK generally — but a future release could
 * still change this method and its internal caller together, which would break
 * this direct call while CDK kept working.
 */
function renderedBucketEncryption(scope: Construct, bucketResource: CfnBucket): unknown {
  const stack = Stack.of(scope);
  let template: unknown;
  try {
    template = bucketResource._toCloudFormation();
  } catch (cause) {
    throw unsupportedCdkRendering(scope, cause);
  }
  // Resolution runs outside the catch on purpose: a consumer-supplied lazy or
  // token that throws here is a consumer problem, not a CDK version problem, and
  // must keep its own diagnostic.
  const rendered = stack.resolve(template) as unknown;
  if (!isRecord(rendered) || !isRecord(rendered.Resources)) {
    throw unsupportedCdkRendering(scope);
  }
  const resource = Object.values(rendered.Resources)[0];
  if (!isRecord(resource)) {
    throw unsupportedCdkRendering(scope);
  }
  // A consumer can publicly retype the resource with `addOverride("Type", ...)`,
  // so this is a bucket-configuration problem rather than CDK contract drift.
  if (resource.Type !== "AWS::S3::Bucket") {
    throw unsupportedDestinationEncryption(scope);
  }
  const properties = resource.Properties;
  return isRecord(properties) ? properties.BucketEncryption : undefined;
}

export function destinationChecksumStrategy(
  scope: Construct,
  bucket: Bucket,
  bucketResource: CfnBucket,
): "sse-s3-etag" | "kms-sha256" {
  const resolved = renderedBucketEncryption(scope, bucketResource);
  if (resolved === undefined) {
    return "sse-s3-etag";
  }
  if (!isRecord(resolved)) {
    throw unsupportedDestinationEncryption(scope);
  }
  const rules = resolved.ServerSideEncryptionConfiguration;
  if (!Array.isArray(rules) || rules.length !== 1 || !isRecord(rules[0])) {
    throw unsupportedDestinationEncryption(scope);
  }
  const encryption = rules[0].ServerSideEncryptionByDefault;
  if (!isRecord(encryption) || typeof encryption.SSEAlgorithm !== "string") {
    throw unsupportedDestinationEncryption(scope);
  }
  switch (encryption.SSEAlgorithm) {
    case "AES256":
      return "sse-s3-etag";
    case "aws:kms":
    case "aws:kms:dsse":
      validateDestinationKmsKey(scope, bucket, encryption.KMSMasterKeyID);
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
    "ShinBucketDeploymentDestinationKmsKeyUnsupported",
    "destination.bucket KMSMasterKeyID must be omitted for the AWS-managed S3 key or match destination.bucket.encryptionKey so CDK can grant the provider access.",
    scope,
  );
}

/**
 * Raised when the installed `aws-cdk-lib` no longer renders a `CfnBucket` in the
 * shape this construct inspects. Kept separate from
 * {@link unsupportedDestinationEncryption} so a CDK compatibility break is never
 * mistaken for an unsupported bucket configuration.
 */
function unsupportedCdkRendering(scope: Construct, cause?: unknown): ValidationError {
  const error = new ValidationError(
    "ShinBucketDeploymentCdkRenderingUnsupported",
    "destination.bucket encryption could not be inspected with this aws-cdk-lib version: the CfnBucket rendering contract this construct depends on is unavailable or has changed. Pin a supported aws-cdk-lib version or report this against ShinBucketDeployment.",
    scope,
  );
  if (cause !== undefined) {
    (error as { cause?: unknown }).cause = cause;
  }
  return error;
}

function unsupportedDestinationEncryption(scope: Construct): ValidationError {
  return new ValidationError(
    "ShinBucketDeploymentDestinationEncryptionUnsupported",
    "destination.bucket must synthesize one inspectable default encryption rule using AES256, aws:kms, or aws:kms:dsse.",
    scope,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
