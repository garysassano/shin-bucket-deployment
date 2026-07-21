import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { grantVerifierRead } from "../verification-access";

class StaleObjectCleanupShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.data(
          "runtime/current.txt",
          [`stack=${Aws.STACK_NAME}`, "phase=initial", "state=current-and-legacy-exist"].join("\n"),
        ),
        Source.data("runtime/legacy.txt", "remove this by deploying stale-object-cleanup-updated"),
      ],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "stale-cleanup-site",
      },
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

    new CfnOutput(this, "FetchLegacyFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/stale-cleanup-site/runtime/legacy.txt -`,
    });

    new CfnOutput(this, "DeployUpdatedCleanupScenarioCommand", {
      value: "pnpm verify deploy stale-object-cleanup-updated",
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
