import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class DsseManagedDestinationShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      encryption: BucketEncryption.DSSE_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.data("runtime/dsse-managed.txt", "encrypted-by-managed-dsse\n")],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "dsse-managed-site",
    });

    new CfnOutput(this, "BucketName", { value: websiteBucket.bucketName });
    new CfnOutput(this, "FetchDsseManagedProbeCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/dsse-managed-site/runtime/dsse-managed.txt -`,
    });
    new CfnOutput(this, "HeadDsseManagedProbeCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key dsse-managed-site/runtime/dsse-managed.txt --checksum-mode ENABLED`,
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

new DsseManagedDestinationShinBucketDeploymentStack(
  app,
  "ShinBucketDeploymentDsseManagedDestinationDemo",
  { env },
);
