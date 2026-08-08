import { Stack, Validations } from "aws-cdk-lib";
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
  /**
   * Whether the provider waits for CloudFront invalidation completion after
   * creating it. When false the provider never calls `GetInvalidation`, so the
   * role does not need that action.
   *
   * @default true
   */
  readonly waitForInvalidation?: boolean;
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
  //
  // `s3:GetObject` is load-bearing and must not be removed: the provider's
  // copy-identity reconciliation probes `HeadObject` against the destination
  // (extract:false copies and marker entries), and S3 authorizes `HeadObject`
  // via `s3:GetObject`, so trimming this grant would fail deployments with
  // AccessDenied.
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
      cloudFrontPolicyStatement(
        scope,
        permissions.distribution.distributionRef.distributionId,
        permissions.waitForInvalidation,
      ),
    );
  }

  if (permissions.previousDistribution) {
    addHandlerPolicy(
      handler,
      dependables,
      cloudFrontPolicyStatement(
        scope,
        permissions.previousDistribution.distributionRef.distributionId,
        permissions.waitForInvalidation,
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
  // The handler role is guaranteed before grants run: `getOrCreateHandler`
  // always creates the Function and the construct verifies
  // `handlerFunction.role` right after. An imported function never reaches
  // this path, so the assertion below would fail loudly (never silently
  // degrade) if that invariant ever broke.
  const role = handler.role as NonNullable<LambdaFunction["role"]>;
  const result = role.addToPrincipalPolicy(statement);
  if (!result.statementAdded) {
    // `statementAdded` is false for imported roles (`Role.fromRoleArn` and
    // similar): the statement cannot be attached, and the failure is silent
    // unless surfaced here. Imported roles are legitimate when they already
    // carry the required permissions, so this is a warning rather than an
    // error. Without it, the provider starts and fails with AccessDenied at
    // deploy time.
    Validations.of(handler).addWarning(
      "ShinBucketDeploymentImportedRoleGrantDropped",
      `The provider handler role is imported, so the ${statement.actions.join(
        ", ",
      )} grant could not be attached. Ensure the imported role already carries the required source, destination, and CloudFront permissions, or the deployment will fail with AccessDenied.`,
    );
  }
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

function cloudFrontPolicyStatement(
  scope: Construct,
  distributionId: string,
  waitForInvalidation: boolean | undefined,
): PolicyStatement {
  const actions =
    waitForInvalidation === false
      ? ["cloudfront:CreateInvalidation"]
      : ["cloudfront:GetInvalidation", "cloudfront:CreateInvalidation"];
  return new PolicyStatement({
    effect: Effect.ALLOW,
    actions,
    resources: [cloudFrontDistributionArn(scope, distributionId)],
  });
}

function cloudFrontDistributionArn(scope: Construct, distributionId: string): string {
  // CloudFront is a global service and its ARNs carry no region, but the ARN
  // still includes the account that owns the distribution. Stack.formatArn uses
  // this stack's account, which is correct for same-account distributions.
  // Cross-account distributions are not detected here: the provider uses the
  // distribution ID directly against the global CloudFront endpoint, and the
  // ARN exists only for IAM, whose resource matching for cross-account use
  // must be configured by the caller.
  return Stack.of(scope).formatArn({
    service: "cloudfront",
    region: "",
    resource: "distribution",
    resourceName: distributionId,
  });
}

function destinationObjectGrantPattern(prefix: string | undefined): string {
  // `destination.keyPrefix` is validated as a concrete string before grants
  // run (validateDestinationKeyPrefix rejects unresolved tokens), so no token
  // guard is needed here; the root spellings map to a bucket-wide pattern.
  if (!prefix || prefix === "/") {
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
  // See destinationObjectGrantPattern: keyPrefix is concrete by grant time.
  if (!prefix || prefix === "/") {
    return undefined;
  }
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}
