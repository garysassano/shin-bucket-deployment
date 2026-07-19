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

export function destinationChecksumStrategy(
  scope: Construct,
  bucket: Bucket,
  bucketResource: CfnBucket,
): "sse-s3-etag" | "kms-sha256" {
  const stack = Stack.of(scope);
  const rendered = stack.resolve(bucketResource._toCloudFormation()) as unknown;
  if (!isRecord(rendered) || !isRecord(rendered.Resources)) {
    throw unsupportedDestinationEncryption(scope);
  }
  const resource = Object.values(rendered.Resources)[0];
  if (!isRecord(resource) || resource.Type !== "AWS::S3::Bucket") {
    throw unsupportedDestinationEncryption(scope);
  }
  const properties = resource.Properties;
  const resolved = isRecord(properties) ? properties.BucketEncryption : undefined;
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
