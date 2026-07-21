import { App, Aws, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { grantVerifierRead } from "../verification-access";

class CloudFrontAsyncShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    const distribution = new Distribution(this, "WebsiteDistribution", {
      comment: "Manual validation target for async ShinBucketDeployment CloudFront invalidations.",
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

    const cacheProbeToken = process.env.SHIN_VERIFY_CACHE_PROBE_TOKEN ?? "async-initial";

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.jsonData(
          "runtime/cache-probe.json",
          {
            stackName: Aws.STACK_NAME,
            region: Aws.REGION,
            bucketName: websiteBucket.bucketName,
            distributionId: distribution.distributionId,
            cacheProbeToken,
            message: "redeploy with a different CacheProbeToken to validate async invalidation",
          },
          { escape: true },
        ),
      ],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "site",
      },
      cloudfrontInvalidation: {
        distribution,
        waitForCompletion: false,
      },
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
      value: cacheProbeToken,
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
        "SHIN_VERIFY_CACHE_PROBE_TOKEN=<new-token-value> pnpm verify deploy cloudfront-async-updated",
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

new CloudFrontAsyncShinBucketDeploymentStack(app, "ShinBucketDeploymentCloudFrontAsyncDemo", {
  env,
});
