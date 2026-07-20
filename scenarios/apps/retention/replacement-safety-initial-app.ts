import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { ArnPrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { addDestinationMoveMatrix } from "../lifecycle/destination-move-matrix";

class ReplacementSafetyShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const verificationPrincipal = process.env.SHIN_VERIFY_PRINCIPAL_ARN
      ? new ArnPrincipal(process.env.SHIN_VERIFY_PRINCIPAL_ARN)
      : undefined;
    if (verificationPrincipal) websiteBucket.grantRead(verificationPrincipal);

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.data("runtime/replacement.txt", "phase=initial\n")],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "replacement-safe",
      },
      destinationLifecycle: {
        onDelete: {
          deleteCurrentObjects: true,
        },
      },
      providerLambda: {
        memorySize: 1024,
      },
    });

    addDestinationMoveMatrix(this, false, verificationPrincipal);

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "FetchReplacementFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/replacement-safe/runtime/replacement.txt -`,
    });

    new CfnOutput(this, "DeployReplacementCommand", {
      value: "pnpm verify deploy replacement-safety-updated",
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

new ReplacementSafetyShinBucketDeploymentStack(app, "ShinBucketDeploymentReplacementSafetyDemo", {
  env,
});
