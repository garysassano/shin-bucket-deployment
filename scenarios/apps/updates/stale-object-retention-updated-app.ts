import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class StaleObjectRetentionShinBucketDeploymentStack extends Stack {
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
          [`stack=${Aws.STACK_NAME}`, "phase=updated", "state=stale-object-cleanup-disabled"].join(
            "\n",
          ),
        ),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "stale-retention-site",
      destinationLifecycle: {
        onDeployment: {
          deleteStaleObjects: false,
        },
      },
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListRetentionPrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/stale-retention-site/ --recursive`,
    });

    new CfnOutput(this, "FetchCurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/stale-retention-site/runtime/current.txt -`,
    });

    new CfnOutput(this, "ConfirmKeptFileStillExistsCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/stale-retention-site/runtime/retained-stale.txt -`,
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

new StaleObjectRetentionShinBucketDeploymentStack(
  app,
  "ShinBucketDeploymentStaleObjectRetentionDemo",
  { env },
);
