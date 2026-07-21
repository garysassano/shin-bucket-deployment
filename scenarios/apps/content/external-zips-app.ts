import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { ShinBucketDeployment, Source } from "../../../src";
import { decodeExternalZipFixture } from "../external-zip-fixture";
import { grantVerifierRead } from "../verification-access";

class ExternalZipsShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);
    const infoZip = new Asset(this, "InfoZipArchive", {
      path: decodeExternalZipFixture("info-zip.zip"),
    });
    const forceZip64 = new Asset(this, "PythonForceZip64Archive", {
      path: decodeExternalZipFixture("python-force-zip64.zip"),
    });

    new ShinBucketDeployment(this, "DeployInfoZip", {
      sources: [Source.bucket(infoZip.bucket, infoZip.s3ObjectKey)],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "external/info-zip",
      },
    });
    new ShinBucketDeployment(this, "DeployPythonForceZip64", {
      sources: [Source.bucket(forceZip64.bucket, forceZip64.s3ObjectKey)],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "external/python-force-zip64",
      },
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });
    new CfnOutput(this, "FetchInfoZipFileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/external/info-zip/index.html -`,
    });
    new CfnOutput(this, "FetchPythonForceZip64FileCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/external/python-force-zip64/index.html -`,
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

new ExternalZipsShinBucketDeploymentStack(app, "ShinBucketDeploymentExternalZipsDemo", { env });
