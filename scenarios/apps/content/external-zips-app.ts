import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { ShinBucketDeployment, Source } from "../../../src";

class ExternalZipsShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const infoZip = new Asset(this, "InfoZipArchive", {
      path: decodeFixture("info-zip.zip"),
    });
    const forceZip64 = new Asset(this, "PythonForceZip64Archive", {
      path: decodeFixture("python-force-zip64.zip"),
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

function decodeFixture(name: string): string {
  const encodedPath = resolve("rust", "test-fixtures", "external-zips", `${name}.b64`);
  const outputPath = resolve(".verification-assets", "external-zips", name);
  const decoded = Buffer.from(readFileSync(encodedPath, "utf8").trim(), "base64");
  if (!existsSync(outputPath) || !readFileSync(outputPath).equals(decoded)) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, decoded);
  }
  return outputPath;
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
