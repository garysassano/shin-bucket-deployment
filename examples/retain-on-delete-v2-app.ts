import { join } from "node:path";
import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CargoBucketDeployment, Source } from "../src";

class RetainOnDeleteCargoBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.RETAIN,
    });

    new CargoBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.data("runtime/current.txt", "version=v2\nstate=retain-previous-prefix-and-delete"),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "retain-v2",
      retainOnDelete: true,
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListBucketRecursiveCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/ --recursive`,
    });

    new CfnOutput(this, "FetchV1CurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/retain-v1/runtime/current.txt -`,
    });

    new CfnOutput(this, "FetchV2CurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/retain-v2/runtime/current.txt -`,
    });

    new CfnOutput(this, "DestroyRetainDemoCommand", {
      value: "pnpm example destroy retain-on-delete",
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

new RetainOnDeleteCargoBucketDeploymentStack(app, "CargoBucketDeploymentRetainOnDeleteDemo", {
  env,
});
