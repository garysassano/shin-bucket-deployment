import { App, CfnOutput, Fn, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { grantVerifierRead } from "../verification-access";

class SimpleShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    const deployment = new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("test/fixtures/my-website")],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "site",
      },
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ObjectKeys", {
      value: Fn.join(",", deployment.objectKeys),
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

new SimpleShinBucketDeploymentStack(app, "ShinBucketDeploymentSimpleDemo", { env });
