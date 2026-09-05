import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { decodeListingKeyZipFixture } from "../listing-key-zip-fixture";
import { grantVerifierRead } from "../verification-access";

class StaleObjectCleanupShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.asset(decodeListingKeyZipFixture("stale-object-cleanup-updated")),
        Source.data(
          "runtime/current.txt",
          [`stack=${Aws.STACK_NAME}`, "phase=updated", "state=legacy-should-be-deleted"].join("\n"),
        ),
      ],
      // Shin owns every object in this fixture prefix, including CR/LF keys.
      destinationLifecycle: { onDelete: { deleteCurrentObjects: true } },
      destination: {
        bucket: websiteBucket,
        keyPrefix: "stale-cleanup-site",
      },
      sourceProcessing: {
        exclude: ["excluded/**"],
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

    new CfnOutput(this, "ConfirmLegacyRemovedCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key stale-cleanup-site/runtime/legacy.txt`,
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
