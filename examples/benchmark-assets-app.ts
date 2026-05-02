import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ensureBenchmarkAssets } from "../scripts/benchmark-assets";
import { RustBucketDeployment, Source } from "../src";

class BenchmarkAssetsRustBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const bundle = ensureBenchmarkAssets();
    const destinationPrefix = process.env.RBD_BENCH_DESTINATION_PREFIX ?? "benchmark-site";
    const memoryLimitMb = parseOptionalPositiveIntegerEnv("RBD_BENCH_MEMORY_LIMIT_MB") ?? 256;

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new RustBucketDeployment(this, "DeployBenchmarkAssets", {
      sources: [Source.asset(bundle.root)],
      destinationBucket: websiteBucket,
      destinationKeyPrefix: destinationPrefix,
      memoryLimit: memoryLimitMb,
      prune: process.env.RBD_BENCH_PRUNE !== "false",
      waitForDistributionInvalidation: process.env.RBD_BENCH_WAIT !== "false",
    });

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "DestinationPrefix", {
      value: destinationPrefix,
    });

    new CfnOutput(this, "BenchmarkProfile", {
      value: bundle.profile,
    });

    new CfnOutput(this, "BenchmarkVariant", {
      value: bundle.variant,
    });

    new CfnOutput(this, "BenchmarkFileCount", {
      value: String(bundle.fileCount),
    });

    new CfnOutput(this, "BenchmarkTotalBytes", {
      value: String(bundle.totalBytes),
    });

    new CfnOutput(this, "BenchmarkMemoryLimitMb", {
      value: String(memoryLimitMb),
    });
  }
}

function parseOptionalPositiveIntegerEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer number of MiB.`);
  }
  return value;
}

const app = new App();
const env =
  process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
    ? {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      }
    : undefined;

const suffix = process.env.RBD_BENCH_STACK_SUFFIX;
const stackName = suffix
  ? `RustBucketDeploymentBenchmarkAssetsDemo${suffix}`
  : "RustBucketDeploymentBenchmarkAssetsDemo";

new BenchmarkAssetsRustBucketDeploymentStack(app, stackName, { env });
