import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";
import { grantVerifierRead } from "../verification-access";

const LARGE_FILE_BYTES = 24 * 1024 * 1024;

class LargeArchiveShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const assetRoot = ensureLargeArchiveAsset();
    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    grantVerifierRead(websiteBucket);

    new ShinBucketDeployment(this, "DeployLargeArchive", {
      sources: [Source.asset(assetRoot)],
      destination: {
        bucket: websiteBucket,
        keyPrefix: "large-archive",
      },
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "LargeObjectKey", {
      value: "large-archive/assets/large.bin",
    });

    new CfnOutput(this, "HeadLargeObjectCommand", {
      value: `aws s3api head-object --bucket ${websiteBucket.bucketName} --key large-archive/assets/large.bin`,
    });
  }
}

function ensureLargeArchiveAsset(): string {
  const root = join(process.cwd(), ".verification-assets", "large-archive");
  const largePath = join(root, "assets", "large.bin");
  const markerPath = join(root, ".generated.json");
  if (existsSync(markerPath)) {
    return root;
  }

  mkdirSync(dirname(largePath), { recursive: true });
  writeFileSync(largePath, deterministicBytes(LARGE_FILE_BYTES));
  writeFileSync(
    join(root, "index.html"),
    "<!doctype html><title>large archive verification</title>\n",
  );
  writeFileSync(
    markerPath,
    `${JSON.stringify({ fileCount: 2, largeFileBytes: LARGE_FILE_BYTES }, null, 2)}\n`,
  );
  return root;
}

function deterministicBytes(size: number): Buffer {
  const output = Buffer.allocUnsafe(size);
  let state = 0x12345678;
  for (let index = 0; index < output.length; index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    // The HIGH byte, not `state & 0xff`. In a power-of-two-modulus LCG the low
    // bits have short periods -- bit k repeats every 2^(k+1) values -- so the
    // low byte repeats every 256 bytes. That made this "large" archive compress
    // 256:1 into roughly 98 KB, so the scenario uploaded a tiny zip instead of
    // exercising a large transfer, and the ratio tripped the source catalog's
    // MaxCompressionRatio guard (default 100) once catalogs began enforcing it.
    output[index] = state >>> 24;
  }
  return output;
}

const app = new App();
const env =
  process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
    ? {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      }
    : undefined;

new LargeArchiveShinBucketDeploymentStack(app, "ShinBucketDeploymentLargeArchiveDemo", { env });
