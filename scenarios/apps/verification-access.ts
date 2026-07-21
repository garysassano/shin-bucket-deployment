import { RemovalPolicy } from "aws-cdk-lib";
import { ArnPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { IKey } from "aws-cdk-lib/aws-kms";
import type { Bucket } from "aws-cdk-lib/aws-s3";

export function grantVerifierRead(
  bucket: Bucket,
  encryptionKey?: IKey,
  principalArn = process.env.SHIN_VERIFY_PRINCIPAL_ARN,
): void {
  if (principalArn) {
    const principal = new ArnPrincipal(principalArn);
    bucket.addToResourcePolicy(
      new PolicyStatement({
        principals: [principal],
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
      }),
    );
    bucket.addToResourcePolicy(
      new PolicyStatement({
        principals: [principal],
        actions: ["s3:ListBucket"],
        resources: [bucket.bucketArn],
      }),
    );
    encryptionKey?.grantDecrypt(principal);
    // Keep the verifier policy while CloudFormation removes the bucket. If bucket deletion leaks,
    // HeadBucket remains authorized and detects it; successful bucket deletion removes the policy.
    bucket.policy?.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
