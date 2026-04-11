import { join } from "node:path";
import {
  App,
  Aws,
  CfnOutput,
  CfnParameter,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CargoBucketDeployment, Source } from "../src";

class ReplacementBehaviorCargoBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const specialJsonToken = new CfnParameter(this, "SpecialJsonToken", {
      type: "String",
      default: 'value with "quotes" and \\backslash',
      description:
        "Deploy-time string used to verify JSON escaping when token values contain quotes and backslashes.",
    });

    new CargoBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset(join(__dirname, "..", "..", "test", "fixtures", "my-website")),
        Source.data(
          "runtime/plain.txt",
          [
            `stack=${Aws.STACK_NAME}`,
            `region=${Aws.REGION}`,
            `region-again=${Aws.REGION}`,
            `bucket=${websiteBucket.bucketName}`,
          ].join("\n"),
        ),
        Source.jsonData(
          "runtime/raw.json",
          {
            stackName: Aws.STACK_NAME,
            region: Aws.REGION,
            bucketName: websiteBucket.bucketName,
            message: "jsonData without escape",
            repeatedRegion: Aws.REGION,
            specialValue: specialJsonToken.valueAsString,
          },
          { escape: false },
        ),
        Source.jsonData(
          "runtime/escaped.json",
          {
            stackName: Aws.STACK_NAME,
            region: Aws.REGION,
            bucketName: websiteBucket.bucketName,
            message: "jsonData with escape",
            repeatedRegion: Aws.REGION,
            specialValue: specialJsonToken.valueAsString,
          },
          { escape: true },
        ),
        Source.data(
          "runtime/from-data-raw.json",
          `{"specialValue":"${specialJsonToken.valueAsString}"}`,
        ),
        Source.data(
          "runtime/from-data-escaped.json",
          `{"specialValue":"${specialJsonToken.valueAsString}"}`,
          { jsonEscape: true },
        ),
        Source.yamlData("runtime/config.yaml", {
          stackName: Aws.STACK_NAME,
          region: Aws.REGION,
          bucketName: websiteBucket.bucketName,
          message: "yaml replacement is active",
          repeatedRegion: Aws.REGION,
        }),
      ],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: "site",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "RuntimePrefix", {
      value: `s3://${websiteBucket.bucketName}/site/runtime/`,
    });

    new CfnOutput(this, "SpecialJsonTokenValue", {
      value: specialJsonToken.valueAsString,
    });

    new CfnOutput(this, "ListRuntimeFilesCommand", {
      value: `aws s3 ls s3://${websiteBucket.bucketName}/site/runtime/ --recursive`,
    });

    new CfnOutput(this, "VerifyPlainTextCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/plain.txt -`,
    });

    new CfnOutput(this, "VerifyRawJsonCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/raw.json -`,
    });

    new CfnOutput(this, "VerifyEscapedJsonCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/escaped.json -`,
    });

    new CfnOutput(this, "VerifyDataRawJsonCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/from-data-raw.json -`,
    });

    new CfnOutput(this, "VerifyDataEscapedJsonCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/from-data-escaped.json -`,
    });

    new CfnOutput(this, "VerifyYamlCommand", {
      value: `aws s3 cp s3://${websiteBucket.bucketName}/site/runtime/config.yaml -`,
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

new ReplacementBehaviorCargoBucketDeploymentStack(
  app,
  "CargoBucketDeploymentReplacementBehaviorDemo",
  { env },
);
