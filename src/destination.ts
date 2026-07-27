import { Stack } from "aws-cdk-lib";
import { type Bucket, CfnBucket } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { ValidationError } from "./errors";

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
 * Trusting it would silently classify a KMS bucket as SSE-S3 and accept a
 * destination that cannot support incremental deployment. The rendered form is the
 * only representation of what actually deploys.
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

/**
 * Confirms the destination bucket uses SSE-S3, the only encryption mode this
 * construct supports.
 *
 * Incremental deployment reads the destination `ETag` from a single `ListObjectsV2`
 * page and compares it against a known plaintext MD5. A KMS or DSSE object's `ETag`
 * is not that digest, and a listing returns no checksum, so proving such an object
 * unchanged would need a per-object `HeadObject` and a second stored-digest scheme
 * running alongside the `ETag` one. That parallel path is what this construct
 * declines to carry, not something impossible — and without it every deployment
 * would silently re-upload every object. Refusing at synthesis is the honest
 * outcome. SSE-S3 is on by default on every S3 bucket, so this costs nothing to
 * satisfy.
 */
export function validateDestinationEncryption(scope: Construct, bucketResource: CfnBucket): void {
  const resolved = renderedBucketEncryption(scope, bucketResource);
  if (resolved === undefined) {
    // No explicit rule renders when the bucket relies on the account default, which
    // S3 guarantees is SSE-S3.
    return;
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
      return;
    case "aws:kms":
    case "aws:kms:dsse":
      throw unsupportedDestinationKmsEncryption(scope);
    default:
      throw unsupportedDestinationEncryption(scope);
  }
}

function unsupportedDestinationKmsEncryption(scope: Construct): ValidationError {
  return new ValidationError(
    "ShinBucketDeploymentDestinationKmsEncryptionUnsupported",
    "destination.bucket must use SSE-S3 (AES256) default encryption. ShinBucketDeployment does not support SSE-KMS or SSE-DSSE destinations: their object ETags are not plaintext MD5 digests, so identifying unchanged objects would require a per-object HeadObject instead of one bucket listing. Rather than carry that second reconciliation path, Shin refuses these buckets — otherwise every deployment would silently re-upload every object.",
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
    "destination.bucket must synthesize one inspectable default encryption rule using AES256.",
    scope,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
