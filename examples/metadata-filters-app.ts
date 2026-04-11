import { join } from "node:path";
import { App, Aws, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  CacheControl,
  CargoBucketDeployment,
  ServerSideEncryption,
  Source,
  StorageClass,
} from "../src";

class MetadataFiltersCargoBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CargoBucketDeployment(this, "FilteredDeployment", {
      sources: [
        Source.asset(join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.data(
          "runtime/probe.txt",
          [`stack=${Aws.STACK_NAME}`, `region=${Aws.REGION}`, "mode=include-exclude"].join("\n"),
        ),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "filtered-site",
      exclude: ["**/*.js"],
      include: ["**/*.html", "runtime/**"],
    });

    new CargoBucketDeployment(this, "MetadataDeployment", {
      sources: [
        Source.asset(join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.data(
          "runtime/headers.json",
          JSON.stringify(
            {
              stackName: Aws.STACK_NAME,
              region: Aws.REGION,
              message: "inspect this object with head-object to validate metadata mapping",
            },
            null,
            2,
          ),
        ),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "metadata-site",
      metadata: {
        ReleaseChannel: "manual-validation",
        VerificationFlavor: "metadata-matrix",
      },
      cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(30))],
      contentDisposition: "inline",
      contentLanguage: "en",
      serverSideEncryption: ServerSideEncryption.AES_256,
      storageClass: StorageClass.INTELLIGENT_TIERING,
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "ListFilteredPrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/filtered-site/ --recursive`,
    });

    new CfnOutput(this, "FetchFilteredProbeCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/filtered-site/runtime/probe.txt -`,
    });

    new CfnOutput(this, "HeadFilteredHtmlCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key filtered-site/index.html`,
    });

    new CfnOutput(this, "MissingFilteredJsCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key filtered-site/app.js`,
    });

    new CfnOutput(this, "ListMetadataPrefixCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/metadata-site/ --recursive`,
    });

    new CfnOutput(this, "HeadMetadataJsonCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key metadata-site/runtime/headers.json`,
    });

    new CfnOutput(this, "FetchMetadataJsonCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/metadata-site/runtime/headers.json -`,
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

new MetadataFiltersCargoBucketDeploymentStack(app, "CargoBucketDeploymentMetadataFiltersDemo", {
  env,
});
