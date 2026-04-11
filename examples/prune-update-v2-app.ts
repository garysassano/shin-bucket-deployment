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
          [`stack=${Aws.STACK_NAME}`, "version=v2", "state=legacy-should-be-pruned"].join("\n"),
        ),
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

    new CfnOutput(this, "ConfirmLegacyRemovedCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key prune-site/runtime/legacy.txt`,
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
