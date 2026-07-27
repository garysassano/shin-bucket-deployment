import { ArnPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { Bucket } from "aws-cdk-lib/aws-s3";

export function grantVerifierRead(
  bucket: Bucket,
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
  }
}
