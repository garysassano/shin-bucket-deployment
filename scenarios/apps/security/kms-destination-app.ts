import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Key } from "aws-cdk-lib/aws-kms";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class KmsDestinationShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const key = new Key(this, "DestinationKey", {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      encryption: BucketEncryption.KMS,
      encryptionKey: key,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.data("runtime/kms.txt", "encrypted-by-bucket-default-kms-key\n"),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "kms-site",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "FetchKmsProbeCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/kms-site/runtime/kms.txt -`,
    });

    new CfnOutput(this, "HeadKmsProbeCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key kms-site/runtime/kms.txt`,
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

new KmsDestinationShinBucketDeploymentStack(app, "ShinBucketDeploymentKmsDestinationDemo", {
  env,
});
