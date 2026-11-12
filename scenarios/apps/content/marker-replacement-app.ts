import {
  App,
  Aws,
  CfnOutput,
  CfnParameter,
  Fn,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Source as CdkSource } from "aws-cdk-lib/aws-s3-deployment";
import { ShinBucketDeployment, Source } from "../../../src";
import { grantVerifierRead } from "../verification-access";

class MarkerReplacementShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    const specialJsonToken = new CfnParameter(this, "SpecialJsonToken", {
      type: "String",
      default: 'value with "quotes" and \\backslash',
      description:
        "Deploy-time string used to verify JSON escaping when token values contain quotes and backslashes.",
    });

    const quotedValueToken = new CfnParameter(this, "QuotedValueToken", {
      type: "String",
      default: '"quoted"',
      description:
        "Deploy-time string wrapped in double quotes, which must still be escaped as string contents.",
    });

    const jsonLookingToken = new CfnParameter(this, "JsonLookingToken", {
      type: "String",
      default: '{"looks":"like json"}',
      description:
        "Deploy-time string that parses as JSON, which must still be escaped as string contents.",
    });

    const portsToken = new CfnParameter(this, "PortsToken", {
      type: "CommaDelimitedList",
      default: "80,443",
      description: "Deploy-time list substituted as a complete JSON value.",
    });

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources: [
        Source.asset("test/fixtures/my-website"),
        Source.data(
          "runtime/plain.txt",
          [
            `stack=${Aws.STACK_NAME}`,
            `region=${Aws.REGION}`,
            `region-again=${Aws.REGION}`,
            `bucket=${websiteBucket.bucketName}`,
          ].join("\n"),
        ),
        // Upstream's escape:false opt-out, which Shin's own Source.jsonData()
        // does not offer, still deploys through the plain-text path.
        CdkSource.jsonData(
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
        Source.jsonData("runtime/escaped.json", {
          stackName: Aws.STACK_NAME,
          region: Aws.REGION,
          bucketName: websiteBucket.bucketName,
          message: "jsonData with escape",
          repeatedRegion: Aws.REGION,
          specialValue: specialJsonToken.valueAsString,
          quotedValue: quotedValueToken.valueAsString,
          jsonLookingValue: jsonLookingToken.valueAsString,
          ports: portsToken.valueAsList,
        }),
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
          specialValue: specialJsonToken.valueAsString,
          quotedValue: quotedValueToken.valueAsString,
          ports: portsToken.valueAsList,
        }),
      ],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "site",
      },
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

    new CfnOutput(this, "QuotedValueTokenValue", {
      value: quotedValueToken.valueAsString,
    });

    new CfnOutput(this, "JsonLookingTokenValue", {
      value: jsonLookingToken.valueAsString,
    });

    new CfnOutput(this, "PortsTokenValue", {
      value: Fn.join(",", portsToken.valueAsList),
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

new MarkerReplacementShinBucketDeploymentStack(app, "ShinBucketDeploymentMarkerReplacementDemo", {
  env,
});
