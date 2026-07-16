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

    const oldBucket = new Bucket(this, "OldBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const newBucket = new Bucket(this, "NewBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: updated
        ? [Source.data("current.txt", "bucket=new\n")]
        : [
            Source.data("current.txt", "bucket=old\n"),
            Source.data("obsolete.txt", "state=obsolete\n"),
          ],
      destinationBucket: updated ? newBucket : oldBucket,
      destinationKeyPrefix: updated ? "site/new" : "site/old",
      ...(updated
        ? {
            destinationLifecycle: {
              onDeploy: { deleteStaleObjects: false },
              onChange: { deleteObjects: true, fromBucket: oldBucket },
            },
          }
        : {}),
    });

    new CfnOutput(this, "OldBucketName", { value: oldBucket.bucketName });
    new CfnOutput(this, "NewBucketName", { value: newBucket.bucketName });
  }
}
