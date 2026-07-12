import { App, Aws, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

class FiltersShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new ShinBucketDeployment(this, "FilteredDeployment", {
      sources: [
        Source.asset("test/fixtures/my-website"),
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

    new CfnOutput(this, "BucketName", { value: websiteBucket.bucketName });
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

new FiltersShinBucketDeploymentStack(app, "ShinBucketDeploymentFiltersDemo", { env });
