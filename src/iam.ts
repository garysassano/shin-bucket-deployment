import { Stack, Token } from "aws-cdk-lib";
import type { IDistributionRef } from "aws-cdk-lib/aws-cloudfront";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";
import { type Bucket, BucketGrants, type IBucket } from "aws-cdk-lib/aws-s3";
import type { Construct, IDependable } from "constructs";

interface DestinationPermissions {
  readonly destinationBucket: Bucket;
  readonly destinationKeyPrefix?: string;
  readonly deleteCurrentObjects: boolean;
  readonly previousBucket?: IBucket;
  readonly distribution?: IDistributionRef;
  readonly previousDistribution?: IDistributionRef;
}

export function grantDestinationPermissions(
  scope: Construct,
  handler: LambdaFunction,
  permissions: DestinationPermissions,
): IDependable[] {
  const dependables: IDependable[] = [];
  const destinationObjectKeyPattern = destinationObjectGrantPattern(
    permissions.destinationKeyPrefix,
  );
  const destinationGrants = BucketGrants.fromBucket(permissions.destinationBucket);
  // Destinations are SSE-S3 only, so the provider needs no KMS authority at all.
  destinationGrants.actionsOnObjectKeys(
    handler,
    destinationObjectKeyPattern,
    "s3:GetObject",
    "s3:PutObject",
  );
  if (permissions.deleteCurrentObjects) {
    destinationGrants.actionsOnObjectKeys(handler, destinationObjectKeyPattern, "s3:DeleteObject");
  }
  addHandlerPolicy(
    handler,
    dependables,
    destinationListPolicyStatement(
      permissions.destinationBucket.bucketArn,
      permissions.destinationKeyPrefix,
    ),
  );
  if (permissions.deleteCurrentObjects) {
    addHandlerPolicy(
      handler,
      dependables,
      bucketTagReadStatement(permissions.destinationBucket.bucketArn),
    );
  }
  if (permissions.previousBucket) {
    const previousGrants = BucketGrants.fromBucket(permissions.previousBucket);
    previousGrants.actionsOnObjectKeys(handler, "*", "s3:DeleteObject");
    addHandlerPolicy(
      handler,
      dependables,
      destinationListPolicyStatement(permissions.previousBucket.bucketArn, undefined),
    );
    addHandlerPolicy(
      handler,
      dependables,
      bucketTagReadStatement(permissions.previousBucket.bucketArn),
    );
  }

  if (permissions.distribution) {
    addHandlerPolicy(
      handler,
      dependables,
      cloudFrontPolicyStatement(scope, permissions.distribution.distributionRef.distributionId),
    );
  }

  if (permissions.previousDistribution) {
    addHandlerPolicy(
      handler,
      dependables,
      cloudFrontPolicyStatement(
        scope,
        permissions.previousDistribution.distributionRef.distributionId,
      ),
    );
  }

  return dependables;
}

/**
 * Attaches a policy statement to the provider handler's role and orders the
 * handler after whichever policy CDK creates for it.
 *
 * `Function.addToRolePolicy` is not sufficient on its own. Under the
 * `@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy` feature flag CDK
 * puts these statements into standalone `AWS::IAM::Policy` resources instead of
 * the role's default policy, and those are not covered by the handler's
 * `DependsOn`. The custom resource resolves the handler ARN, so it would then be
 * free to run before the grants exist and fail with AccessDenied.
 *
 * Going through the role returns a dependable covering whichever policy actually
 * received the statement. The dependables are returned rather than attached to
 * the handler: the role lives inside the handler's construct subtree, so making
 * the handler depend on its own role's policy creates a cycle. The custom
 * resource is the thing that must wait, so the caller attaches them there.
 */
function addHandlerPolicy(
  handler: LambdaFunction,
  dependables: IDependable[],
  statement: PolicyStatement,
): void {
  const role = handler.role;
  if (!role) {
    handler.addToRolePolicy(statement);
    return;
  }
  const result = role.addToPrincipalPolicy(statement);
  if (result.policyDependable) {
    dependables.push(result.policyDependable);
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

function destinationListPrefix(prefix: string | undefined): string | undefined {
  if (!prefix || prefix === "/" || Token.isUnresolved(prefix)) {
    return undefined;
  }
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}
