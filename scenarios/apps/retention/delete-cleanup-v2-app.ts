import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class DeleteCleanupShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.data("runtime/current.txt", "version=v2\n")],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "cleanup-v2",
      retainOnDelete: false,
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "FetchV2CurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/cleanup-v2/runtime/current.txt -`,
    });

    new CfnOutput(this, "ConfirmV1RemovedCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key cleanup-v1/runtime/current.txt`,
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

new DeleteCleanupShinBucketDeploymentStack(app, "ShinBucketDeploymentDeleteCleanupDemo", {
  env,
});
