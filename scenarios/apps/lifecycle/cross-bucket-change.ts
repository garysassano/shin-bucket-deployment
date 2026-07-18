import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

export function createCrossBucketChangeApp(updated: boolean): void {
  const app = new App();
  const env =
    process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
      ? {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        }
      : undefined;

  new CrossBucketChangeStack(app, "ShinBucketDeploymentCrossBucketChangeDemo", updated, { env });
}

class CrossBucketChangeStack extends Stack {
  constructor(scope: App, id: string, updated: boolean, props?: StackProps) {
    super(scope, id, props);

    const previousBucket = new Bucket(this, "PreviousBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const currentBucket = new Bucket(this, "CurrentBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: updated
        ? [Source.data("current.txt", "bucket=current\n")]
        : [
            Source.data("current.txt", "bucket=previous\n"),
            Source.data("obsolete.txt", "state=obsolete\n"),
          ],
      destinationBucket: updated ? currentBucket : previousBucket,
      destinationKeyPrefix: updated ? "site/current" : "site/previous",
      ...(updated
        ? {
            destinationLifecycle: {
              onDeploy: { deleteStaleObjects: false },
              onChange: {
                deletePreviousObjects: true,
                previousBucket,
              },
            },
          }
        : {}),
    });

    new CfnOutput(this, "PreviousBucketName", { value: previousBucket.bucketName });
    new CfnOutput(this, "CurrentBucketName", { value: currentBucket.bucketName });
  }
}
