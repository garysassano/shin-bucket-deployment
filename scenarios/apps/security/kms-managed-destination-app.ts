import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { grantVerifierRead } from "../verification-access";

class KmsManagedDestinationShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      encryption: BucketEncryption.KMS_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.data("runtime/kms-managed.txt", "encrypted-by-aws-managed-s3-key\n")],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "kms-managed-site",
      },
    });

    new CfnOutput(this, "BucketName", { value: websiteBucket.bucketName });
    new CfnOutput(this, "FetchKmsManagedProbeCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/kms-managed-site/runtime/kms-managed.txt -`,
    });
    new CfnOutput(this, "HeadKmsManagedProbeCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key kms-managed-site/runtime/kms-managed.txt --checksum-mode ENABLED`,
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

new KmsManagedDestinationShinBucketDeploymentStack(
  app,
  "ShinBucketDeploymentKmsManagedDestinationDemo",
  { env },
);
