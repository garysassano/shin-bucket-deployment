import { join } from "node:path";
import {
  App,
  Aws,
  CfnOutput,
  CfnParameter,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CacheControl, CargoBucketDeployment, Source } from "../src";

class CloudFrontInvalidationSyncCargoBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const distribution = new Distribution(this, "WebsiteDistribution", {
      comment: "Manual validation target for CargoBucketDeployment CloudFront invalidations.",
      defaultRootObject: "site/index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(websiteBucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new CachePolicy(this, "ManualValidationCachePolicy", {
          defaultTtl: Duration.days(30),
          minTtl: Duration.seconds(0),
          maxTtl: Duration.days(365),
          enableAcceptEncodingBrotli: true,
          enableAcceptEncodingGzip: true,
        }),
      },
    });

    const cacheProbeToken = new CfnParameter(this, "CacheProbeToken", {
      type: "String",
      default: "v1",
      description:
        "Change this value between deploys to prove CloudFront invalidation serves the fresh object instead of the cached one.",
    });

    new CargoBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.jsonData(
          "runtime/cache-probe.json",
          {
            stackName: Aws.STACK_NAME,
            region: Aws.REGION,
            bucketName: websiteBucket.bucketName,
            distributionId: distribution.distributionId,
            cacheProbeToken: cacheProbeToken.valueAsString,
            message: "redeploy with a different CacheProbeToken to validate invalidation",
          },
          { escape: true },
        ),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "site",
      distribution,
      distributionPaths: ["/site/index.html", "/site/app.js", "/site/runtime/cache-probe.json"],
      waitForDistributionInvalidation: true,
      cacheControl: [
        CacheControl.setPublic(),
        CacheControl.maxAge(Duration.days(365)),
        CacheControl.immutable(),
      ],
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new CfnOutput(this, "DistributionDomainName", {
      value: distribution.domainName,
    });

    new CfnOutput(this, "CurrentCacheProbeToken", {
      value: cacheProbeToken.valueAsString,
    });

    new CfnOutput(this, "CloudFrontCacheProbeUrl", {
      value: `https://${distribution.domainName}/site/runtime/cache-probe.json`,
    });

    new CfnOutput(this, "FetchCloudFrontCacheProbeCommand", {
      value: `curl -fsSL https://${distribution.domainName}/site/runtime/cache-probe.json`,
    });

    new CfnOutput(this, "FetchS3CacheProbeCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/cache-probe.json -`,
    });

    new CfnOutput(this, "RedeployWithNewTokenCommand", {
      value:
        "pnpm example deploy cloudfront-sync -- --parameters CargoBucketDeploymentCloudFrontInvalidationSyncDemo:CacheProbeToken=<new-token-value>",
    });
  }
}

const app = new App();
const env =
  process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
    ? {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      }
    : undefined;

new CloudFrontInvalidationSyncCargoBucketDeploymentStack(
  app,
  "CargoBucketDeploymentCloudFrontInvalidationSyncDemo",
  { env },
);
