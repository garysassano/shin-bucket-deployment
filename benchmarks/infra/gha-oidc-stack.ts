import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import {
  type Conditions,
  Effect,
  OpenIdConnectProvider,
  PolicyDocument,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export class GhaOidcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const provider = new OpenIdConnectProvider(this, "GhaOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const benchmarkClaims: Conditions = {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub":
          "repo:garysassano/shin-bucket-deployment:environment:aws-benchmarks",
      },
    };

    const benchmarkPolicies = () => ({
      AssumeCdkRoles: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["sts:AssumeRole"],
            resources: [
              `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*-${this.account}-${this.region}`,
            ],
          }),
        ],
      }),
      BenchmarkEvidence: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "cloudformation:DeleteStack",
              "cloudformation:DescribeStackResources",
              "cloudformation:DescribeStacks",
            ],
            resources: [
              `arn:${this.partition}:cloudformation:${this.region}:${this.account}:stack/ShinBucketDeploymentBenchmarkAssetsDemo*/*`,
              `arn:${this.partition}:cloudformation:${this.region}:${this.account}:stack/AwsBucketDeploymentBenchmarkAssetsDemo*/*`,
            ],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["lambda:GetFunctionConfiguration"],
            resources: [
              `arn:${this.partition}:lambda:${this.region}:${this.account}:function:ShinBucketDeploymentBench-*`,
              `arn:${this.partition}:lambda:${this.region}:${this.account}:function:AwsBucketDeploymentBenchm-*`,
            ],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["logs:FilterLogEvents"],
            resources: [
              `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:ShinBucketDeploymentBenchmarkAssetsDemo*:*`,
              `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:AwsBucketDeploymentBenchmarkAssetsDemo*:*`,
            ],
          }),
        ],
      }),
    });

    const benchmarkRole = new Role(this, "GhaBenchmarkOidcRole", {
      roleName: "ShinBucketDeploymentGitHubActionsBenchmark",
      assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, benchmarkClaims),
      maxSessionDuration: Duration.hours(6),
      inlinePolicies: benchmarkPolicies(),
    });

    new CfnOutput(this, "GhaBenchmarkOidcRoleArn", { value: benchmarkRole.roleArn });
  }
}
