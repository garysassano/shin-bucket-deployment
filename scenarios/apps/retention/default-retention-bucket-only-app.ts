import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { grantVerifierRead } from "../verification-access";

class DefaultRetentionBucketOnlyStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    new CfnOutput(this, "BucketName", { value: websiteBucket.bucketName });
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

new DefaultRetentionBucketOnlyStack(app, "ShinBucketDeploymentDefaultRetentionDemo", { env });
