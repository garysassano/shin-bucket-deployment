import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { expect, test } from "vitest";
import { GhaOidcStack } from "../../benchmarks/infra/gha-oidc-stack";

test("restricts the GitHub Actions role to the AWS benchmark environment", () => {
  const app = new App();
  const stack = new GhaOidcStack(app, "test", {
    env: { account: "111111111111", region: "eu-central-1" },
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::IAM::Role", {
    RoleName: "ShinBucketDeploymentGitHubActionsBenchmark",
    MaxSessionDuration: 21600,
    AssumeRolePolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              "token.actions.githubusercontent.com:sub":
                "repo:garysassano/shin-bucket-deployment:environment:aws-benchmarks",
            },
          },
        }),
      ]),
    },
    Policies: Match.arrayWith([
      Match.objectLike({ PolicyName: "AssumeCdkRoles" }),
      Match.objectLike({ PolicyName: "BenchmarkEvidence" }),
    ]),
  });

  const rendered = JSON.stringify(template.toJSON());
  expect(rendered).toContain(":iam::111111111111:role/cdk-hnb659fds-*-111111111111-eu-central-1");
  expect(rendered).not.toContain(':iam::111111111111:role/cdk-*"');
  template.hasOutput("GhaBenchmarkOidcRoleArn", {
    Value: { "Fn::GetAtt": [Match.stringLikeRegexp("^GhaBenchmarkOidcRole"), "Arn"] },
  });
});
