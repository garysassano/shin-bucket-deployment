import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ProviderSharing, ShinBucketDeployment, Source } from "../../../src";

class HandlerIsolationStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const destinationBucket = new Bucket(this, "DestinationBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    for (const [idSuffix, prefix] of [
      ["First", "shared/first"],
      ["Second", "shared/second"],
    ] as const) {
      new ShinBucketDeployment(this, `DeployShared${idSuffix}`, {
        sources: [Source.data("value.txt", `${prefix}\n`)],
        destination: {
          bucket: destinationBucket,
          keyPrefix: prefix,
        },
      });
    }

    for (const [idSuffix, prefix] of [
      ["First", "isolated/first"],
      ["Second", "isolated/second"],
    ] as const) {
      new ShinBucketDeployment(this, `DeployIsolated${idSuffix}`, {
        sources: [Source.data("value.txt", `${prefix}\n`)],
        destination: {
          bucket: destinationBucket,
          keyPrefix: prefix,
        },
        providerLambda: {
          sharing: ProviderSharing.DEPLOYMENT,
        },
      });
    }

    new CfnOutput(this, "BucketName", { value: destinationBucket.bucketName });
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

new HandlerIsolationStack(app, "ShinBucketDeploymentHandlerIsolationDemo", { env });
