import { App } from "aws-cdk-lib";
import { GhaOidcStack } from "./gha-oidc-stack";

const app = new App();

new GhaOidcStack(app, "shin-bucket-deployment-gha-oidc", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
