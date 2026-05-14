import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class PruneDisabledUpdateShinBucketDeploymentStack extends Stack {
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
          [`stack=${Aws.STACK_NAME}`, "version=v1", "state=prune-disabled-seed"].join("\n"),
        ),
        Source.data("runtime/kept-by-prune-false.txt", "this remains after deploying v2\n"),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "prune-disabled-site",
      prune: false,
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListPruneDisabledPrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/prune-disabled-site/ --recursive`,
    });

    new CfnOutput(this, "FetchKeptFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/prune-disabled-site/runtime/kept-by-prune-false.txt -`,
    });

    new CfnOutput(this, "UpgradeToPruneDisabledV2Command", {
      value: "pnpm verify deploy prune-disabled-v2",
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

new PruneDisabledUpdateShinBucketDeploymentStack(app, "ShinBucketDeploymentPruneDisabledDemo", {
  env,
});
