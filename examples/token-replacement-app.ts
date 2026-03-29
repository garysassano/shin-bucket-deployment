import * as path from "node:path";
import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { CargoBucketDeployment, Source } from "../src";

class TokenReplacementCargoBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CargoBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(path.join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.jsonData(
          "runtime/config.json",
          {
            stackName: Aws.STACK_NAME,
            region: Aws.REGION,
            bucketName: websiteBucket.bucketName,
            message: "token replacement is active",
          },
          { escape: true },
        ),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "site",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "RuntimeConfigPath", {
      value: `s3://${websiteBucket.bucketName}/site/runtime/config.json`,
    });

    new CfnOutput(this, "VerifyCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/config.json -`,
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

new TokenReplacementCargoBucketDeploymentStack(app, "CargoBucketDeploymentTokenDemo", {
  env,
});
