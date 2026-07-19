import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class DefaultRetentionShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.data(
          "runtime/current.txt",
          "phase=updated\nstate=retain-previous-prefix-and-delete",
        ),
      ],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "retain-updated",
      },
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListBucketRecursiveCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/ --recursive`,
    });

    new CfnOutput(this, "FetchInitialCurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/retain-initial/runtime/current.txt -`,
    });

    new CfnOutput(this, "FetchUpdatedCurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/retain-updated/runtime/current.txt -`,
    });

    new CfnOutput(this, "DestroyRetainDemoCommand", {
      value: "pnpm verify destroy default-retention-updated",
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

new DefaultRetentionShinBucketDeploymentStack(app, "ShinBucketDeploymentDefaultRetentionDemo", {
  env,
});
