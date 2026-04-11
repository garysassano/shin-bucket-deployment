import { join } from "node:path";
import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CargoBucketDeployment, Source } from "../src";

class PruneUpdateCargoBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CargoBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.data(
          "runtime/current.txt",
          [`stack=${Aws.STACK_NAME}`, "version=v1", "state=current-and-legacy-exist"].join("\n"),
        ),
        Source.data("runtime/legacy.txt", "remove this by deploying prune-update-v2"),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "prune-site",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListPrunePrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/prune-site/ --recursive`,
    });

    new CfnOutput(this, "FetchCurrentFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/prune-site/runtime/current.txt -`,
    });

    new CfnOutput(this, "FetchLegacyFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/prune-site/runtime/legacy.txt -`,
    });

    new CfnOutput(this, "UpgradeToPruneV2Command", {
      value: "pnpm example deploy prune-update-v2",
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

new PruneUpdateCargoBucketDeploymentStack(app, "CargoBucketDeploymentPruneUpdateDemo", { env });
