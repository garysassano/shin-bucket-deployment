import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class SourceOverwriteOrderShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.data("runtime/overlap.txt", "first-source\n"),
        Source.data("runtime/overlap.txt", "second-source\n"),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "multi-source",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "FetchOverlapCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/multi-source/runtime/overlap.txt -`,
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

new SourceOverwriteOrderShinBucketDeploymentStack(
  app,
  "ShinBucketDeploymentSourceOverwriteOrderDemo",
  { env },
);
