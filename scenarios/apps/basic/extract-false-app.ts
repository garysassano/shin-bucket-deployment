import { App, CfnOutput, Fn, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class ExtractFalseShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const deployment = new ShinBucketDeployment(this, "DeployArchive", {
      sources: [Source.asset("test/fixtures/my-website")],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "archive",
      extract: false,
      waitForDistributionInvalidation: process.env.SHIN_EXTRACT_FALSE_WAIT !== "false",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "DestinationPrefix", {
      value: "archive",
    });

    new CfnOutput(this, "ObjectKeys", {
      value: Fn.join(",", deployment.objectKeys),
    });

    new CfnOutput(this, "ListArchivePrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/archive/ --recursive`,
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

new ExtractFalseShinBucketDeploymentStack(app, "ShinBucketDeploymentExtractFalseDemo", { env });
