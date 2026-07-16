import { ArnFormat, Stack, Token } from "aws-cdk-lib";
import type { IDistributionRef } from "aws-cdk-lib/aws-cloudfront";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { type Bucket, BucketGrants, type IBucket } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface DestinationPermissions {
  readonly destinationBucket: Bucket;
  readonly destinationKeyPrefix?: string;
  readonly deleteCurrentObjects: boolean;
  readonly previousDestinationBucket?: IBucket;
  readonly distribution?: IDistributionRef;
  readonly previousDistribution?: IDistributionRef;
}

export function grantDestinationPermissions(
  scope: Construct,
  handler: LambdaFunction,
  permissions: DestinationPermissions,
): void {
  const destinationObjectKeyPattern = destinationObjectGrantPattern(
    permissions.destinationKeyPrefix,
  );
  const destinationGrants = BucketGrants.fromBucket(permissions.destinationBucket);
  // `BucketGrants` splits mixed actions by service: S3 actions target object
  // keys, while KMS actions target the bucket key only when one exists.
  destinationGrants.actionsOnObjectKeys(
    handler,
    destinationObjectKeyPattern,
    "s3:GetObject",
    "s3:PutObject",
    "kms:Decrypt",
    "kms:GenerateDataKey",
  );
  if (permissions.deleteCurrentObjects) {
    destinationGrants.actionsOnObjectKeys(handler, destinationObjectKeyPattern, "s3:DeleteObject");
  }
  handler.addToRolePolicy(
    destinationListPolicyStatement(
      permissions.destinationBucket.bucketArn,
      permissions.destinationKeyPrefix,
    ),
  );
  if (permissions.deleteCurrentObjects) {
    handler.addToRolePolicy(bucketTagReadStatement(permissions.destinationBucket.bucketArn));
  }
  // A managed-key bucket has no IKey for BucketGrants to target. Keep this
  // tightly conditioned statement on every handler so a later L1/Aspect
  // transition to alias/aws/s3 remains authorized; it is inert for every
  // other key and service.
  handler.addToRolePolicy(awsManagedS3KmsPolicyStatement(scope));

  if (permissions.previousDestinationBucket) {
    const previousGrants = BucketGrants.fromBucket(permissions.previousDestinationBucket);
    previousGrants.actionsOnObjectKeys(handler, "*", "s3:DeleteObject");
    handler.addToRolePolicy(
      destinationListPolicyStatement(permissions.previousDestinationBucket.bucketArn, undefined),
    );
    handler.addToRolePolicy(
      bucketTagReadStatement(permissions.previousDestinationBucket.bucketArn),
    );
  }

  if (permissions.distribution) {
    handler.addToRolePolicy(
      cloudFrontPolicyStatement(scope, permissions.distribution.distributionRef.distributionId),
    );
  }

  if (permissions.previousDistribution) {
    handler.addToRolePolicy(
      cloudFrontPolicyStatement(
        scope,
        permissions.previousDistribution.distributionRef.distributionId,
      ),
    );
  }
}

function bucketTagReadStatement(bucketArn: string): PolicyStatement {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["s3:GetBucketTagging"],
    resources: [bucketArn],
  });
}

function cloudFrontPolicyStatement(scope: Construct, distributionId: string): PolicyStatement {
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["cloudfront:GetInvalidation", "cloudfront:CreateInvalidation"],
    resources: [cloudFrontDistributionArn(scope, distributionId)],
  });
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
): PolicyStatement {
  const prefix = destinationListPrefix(destinationKeyPrefix);
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["s3:ListBucket"],
    resources: [bucketArn],
    conditions: prefix ? { StringEquals: { "s3:prefix": prefix } } : undefined,
  });
}

function awsManagedS3KmsPolicyStatement(scope: Construct): PolicyStatement {
  const stack = Stack.of(scope);
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["kms:Decrypt", "kms:GenerateDataKey"],
    resources: [
      stack.formatArn({
        service: "kms",
        resource: "key",
        resourceName: "*",
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      }),
    ],
    conditions: {
      "ForAnyValue:StringEquals": {
        "kms:ResourceAliases": "alias/aws/s3",
      },
      StringEquals: {
        "kms:ViaService": `s3.${stack.region}.${stack.urlSuffix}`,
      },
    },
  });
}

function destinationListPrefix(prefix: string | undefined): string | undefined {
  if (!prefix || prefix === "/" || Token.isUnresolved(prefix)) {
    return undefined;
  }
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}
