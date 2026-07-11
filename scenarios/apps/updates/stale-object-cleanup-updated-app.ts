import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class StaleObjectCleanupShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.data(
          "runtime/current.txt",
          [`stack=${Aws.STACK_NAME}`, "phase=updated", "state=legacy-should-be-deleted"].join("\n"),
        ),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "stale-cleanup-site",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListCleanupPrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/stale-cleanup-site/ --recursive`,
    });

    new CfnOutput(this, "FetchCurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/stale-cleanup-site/runtime/current.txt -`,
    });

    new CfnOutput(this, "ConfirmLegacyRemovedCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key stale-cleanup-site/runtime/legacy.txt`,
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

new StaleObjectCleanupShinBucketDeploymentStack(app, "ShinBucketDeploymentStaleObjectCleanupDemo", {
  env,
});
