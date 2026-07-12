import { App, CfnOutput, Duration, Fn, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CacheControl, ShinBucketDeployment, Source, StorageClass } from "../../../src";

class MetadataUpdateShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const destination = new Bucket(this, "Destination", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const objectSettings = {
      metadata: { deploymentPhase: "initial" },
      cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
      contentType: "application/octet-stream",
      storageClass: StorageClass.STANDARD,
    };

    new ShinBucketDeployment(this, "ExtractedDeployment", {
      sources: [Source.data("semantic.txt", "identical bytes across the metadata update\n")],
      destinationBucket: destination,
      destinationKeyPrefix: "extracted",
      ...objectSettings,
    });

    const copied = new ShinBucketDeployment(this, "CopiedDeployment", {
      sources: [Source.asset("test/fixtures/my-website")],
      destinationBucket: destination,
      destinationKeyPrefix: "copied",
      extract: false,
      ...objectSettings,
    });

    new CfnOutput(this, "BucketName", { value: destination.bucketName });
    new CfnOutput(this, "HeadExtractedObjectCommand", {
      value: `aws s3api head-object --bucket ${destination.bucketName} --key extracted/semantic.txt --checksum-mode ENABLED`,
    });
    new CfnOutput(this, "CopiedObjectKeys", { value: Fn.join(",", copied.objectKeys) });
    new CfnOutput(this, "ListCopiedPrefixCommand", {
      value: `aws s3 ls s3://${destination.bucketName}/copied/ --recursive`,
    });
    new CfnOutput(this, "DeployUpdatedScenarioCommand", {
      value: "pnpm verify deploy metadata-update-updated",
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

new MetadataUpdateShinBucketDeploymentStack(app, "ShinBucketDeploymentMetadataUpdateDemo", {
  env,
});
