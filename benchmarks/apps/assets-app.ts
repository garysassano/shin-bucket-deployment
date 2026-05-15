import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment as AwsBucketDeployment,
  Source as AwsSource,
} from "aws-cdk-lib/aws-s3-deployment";
import { ShinBucketDeployment, Source as ShinSource } from "../../src";
import { ensureBenchmarkAssets } from "../src/assets";
import { type BenchmarkImplementation, isBenchmarkImplementation } from "../src/model";

class BenchmarkAssetsShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const bundle = ensureBenchmarkAssets();
    const destinationPrefix = process.env.SHIN_BENCH_DESTINATION_PREFIX ?? "benchmark-site";
    const memoryLimitMb = parseOptionalPositiveIntegerEnv("SHIN_BENCH_LAMBDA_MEMORY_MB") ?? 1024;
    const maxParallelTransfers = parseOptionalPositiveIntegerEnv(
      "SHIN_BENCH_LAMBDA_MAX_PARALLEL_TRANSFERS",
    );
    const implementation = parseImplementation(process.env.SHIN_BENCH_IMPLEMENTATION);
    const retainOnDelete = parseOptionalBooleanEnv("SHIN_BENCH_RETAIN_ON_DELETE");

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const deploymentProps = {
      destinationBucket: websiteBucket,
      destinationKeyPrefix: destinationPrefix,
      memoryLimit: memoryLimitMb,
      prune: process.env.SHIN_BENCH_PRUNE !== "false",
      ...(retainOnDelete === undefined ? {} : { retainOnDelete }),
      waitForDistributionInvalidation: process.env.SHIN_BENCH_WAIT_FOR_CLOUDFRONT === "true",
    };

    if (implementation === "shin") {
      new ShinBucketDeployment(this, "DeployBenchmarkAssets", {
        ...deploymentProps,
        ...(maxParallelTransfers === undefined ? {} : { maxParallelTransfers }),
        sources: [ShinSource.asset(bundle.root)],
      });
    } else {
      new AwsBucketDeployment(this, "DeployBenchmarkAssets", {
        ...deploymentProps,
        sources: [AwsSource.asset(bundle.root)],
      });
    }

    new CfnOutput(this, "BucketName", {
      value: websiteBucket.bucketName,
    });

    new CfnOutput(this, "DestinationPrefix", {
      value: destinationPrefix,
    });

    new CfnOutput(this, "BenchmarkAssetProfile", {
      value: bundle.profile,
    });

    new CfnOutput(this, "BenchmarkState", {
      value: bundle.state,
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

    new CfnOutput(this, "BenchmarkMaxParallelTransfers", {
      value: String(maxParallelTransfers ?? 32),
    });

    new CfnOutput(this, "BenchmarkImplementation", {
      value: implementation,
    });
  }
}

function parseImplementation(value: string | undefined): BenchmarkImplementation {
  if (value === undefined || value === "" || value === "shin") {
    return "shin";
  }
  if (value === "rust") {
    throw new Error('SHIN_BENCH_IMPLEMENTATION value "rust" was renamed to "shin".');
  }
  if (isBenchmarkImplementation(value)) {
    return value;
  }
  throw new Error('SHIN_BENCH_IMPLEMENTATION must be either "shin" or "aws".');
}

function parseOptionalPositiveIntegerEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function parseOptionalBooleanEnv(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return undefined;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  throw new Error(`${name} must be either "true" or "false".`);
}

const app = new App();
const env =
  process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
    ? {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      }
    : undefined;

const suffix = process.env.SHIN_BENCH_STACK_SUFFIX;
const implementation = parseImplementation(process.env.SHIN_BENCH_IMPLEMENTATION);
const stackName = suffix
  ? `${benchmarkStackNamePrefix(implementation)}${suffix}`
  : benchmarkStackNamePrefix(implementation);

function benchmarkStackNamePrefix(implementation: BenchmarkImplementation): string {
  return implementation === "shin"
    ? "ShinBucketDeploymentBenchmarkAssetsDemo"
    : "AwsBucketDeploymentBenchmarkAssetsDemo";
}

new BenchmarkAssetsShinBucketDeploymentStack(app, stackName, { env });
