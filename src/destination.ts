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
      "destinationBucket must be a CDK-created Bucket whose CfnBucket encryption configuration can be inspected.",
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
  const resolved = Stack.of(scope).resolve(bucketResource.bucketEncryption) as unknown;
  if (resolved === undefined) {
    return "sse-s3-etag";
  }
  if (!isRecord(resolved)) {
    throw unsupportedDestinationEncryption(scope);
  }
  const rules = resolved.serverSideEncryptionConfiguration;
  if (!Array.isArray(rules) || rules.length !== 1 || !isRecord(rules[0])) {
    throw unsupportedDestinationEncryption(scope);
  }
  const encryption = rules[0].serverSideEncryptionByDefault;
  if (!isRecord(encryption) || typeof encryption.sseAlgorithm !== "string") {
    throw unsupportedDestinationEncryption(scope);
  }
  switch (encryption.sseAlgorithm) {
    case "AES256":
      return "sse-s3-etag";
    case "aws:kms":
    case "aws:kms:dsse":
      validateDestinationKmsKey(scope, bucket, encryption.kmsMasterKeyId);
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
    "destinationBucket KMSMasterKeyID must be omitted for the AWS-managed S3 key or match destinationBucket.encryptionKey so CDK can grant the provider access.",
    scope,
  );
}

function unsupportedDestinationEncryption(scope: Construct): ValidationError {
  return new ValidationError(
    "ShinBucketDeploymentDestinationEncryptionUnsupported",
    "destinationBucket must synthesize one inspectable default encryption rule using AES256, aws:kms, or aws:kms:dsse.",
    scope,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
