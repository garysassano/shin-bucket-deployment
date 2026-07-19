import {
  App,
  CfnOutput,
  CfnParameter,
  CfnResource,
  RemovalPolicy,
  Stack,
  type StackProps,
  Tags,
} from "aws-cdk-lib";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment as AwsBucketDeployment,
  Source as AwsSource,
} from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";
import { FailureDiagnostics, ShinBucketDeployment, Source as ShinSource } from "../../src";
import { ensureBenchmarkAssets } from "../src/assets";
import {
  MARKER_BENCHMARK_VALUE_A,
  MARKER_BENCHMARK_VALUE_B,
  markerBenchmarkPayload,
} from "../src/marker-payload";
import { type BenchmarkImplementation, isBenchmarkImplementation } from "../src/model";

class BenchmarkAssetsShinBucketDeploymentStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const bundle = ensureBenchmarkAssets({
      verifyOnly: process.env.SHIN_BENCH_VERIFY_ASSETS_ONLY === "true",
      trustExisting: process.env.SHIN_BENCH_TRUST_ASSETS === "true",
    });
    const destinationPrefix = process.env.SHIN_BENCH_DESTINATION_PREFIX ?? "benchmark-site";
    const memoryLimitMb = parseOptionalPositiveIntegerEnv("SHIN_BENCH_LAMBDA_MEMORY_MB") ?? 1024;
    const maxConcurrency = parseOptionalPositiveIntegerEnv("SHIN_BENCH_TRANSFER_MAX_CONCURRENCY");
    const sourceWindowBytes = parseOptionalPositiveIntegerEnv("SHIN_BENCH_SOURCE_WINDOW_BYTES");
    const detailedFailureDiagnostics =
      parseOptionalBooleanEnv("SHIN_BENCH_DETAILED_FAILURE_DIAGNOSTICS") ?? true;
    const implementation = parseImplementation(process.env.SHIN_BENCH_IMPLEMENTATION);
    const runOwner = process.env.SHIN_BENCH_RUN_OWNER;
    const sampleOwner = process.env.SHIN_BENCH_SAMPLE_OWNER;
    if ((runOwner === undefined) !== (sampleOwner === undefined)) {
      throw new Error("Benchmark stack ownership tags are required.");
    }
    if (runOwner && sampleOwner) {
      Tags.of(this).add("ShinBenchmarkRun", runOwner);
      Tags.of(this).add("ShinBenchmarkSample", sampleOwner);
    }
    const deleteCurrentObjectsOnDelete = parseOptionalBooleanEnv(
      "SHIN_BENCH_DELETE_CURRENT_OBJECTS_ON_DELETE",
    );
    const deleteStaleObjects = process.env.SHIN_BENCH_DELETE_STALE_OBJECTS !== "false";
    let markerPayload: string | undefined;
    if (bundle.profile === "marker-heavy") {
      const markerA = new CfnParameter(this, "MarkerA", {
        default: MARKER_BENCHMARK_VALUE_A,
      });
      const markerB = new CfnParameter(this, "MarkerB", {
        default: MARKER_BENCHMARK_VALUE_B,
      });
      markerPayload = markerBenchmarkPayload(
        bundle.state,
        markerA.valueAsString,
        markerB.valueAsString,
      );
    }

    const websiteBucket = new Bucket(this, "WebsiteBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const providerLogGroup = new LogGroup(this, "ProviderLogGroup", {
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const upstreamDeploymentProps = {
      destinationBucket: websiteBucket,
      destinationKeyPrefix: destinationPrefix,
      memoryLimit: memoryLimitMb,
      logGroup: providerLogGroup,
    };

    let deployment: Construct;
    if (implementation === "shin") {
      deployment = new ShinBucketDeployment(this, "DeployBenchmarkAssets", {
        destination: {
          bucket: websiteBucket,
          keyPrefix: destinationPrefix,
        },
        providerLambda: {
          memorySize: memoryLimitMb,
          logGroup: providerLogGroup,
          failureDiagnostics: detailedFailureDiagnostics
            ? FailureDiagnostics.DETAILED
            : FailureDiagnostics.STANDARD,
        },
        destinationLifecycle: {
          onDeploy: {
            deleteStaleObjects,
          },
          ...(deleteCurrentObjectsOnDelete === undefined
            ? {}
            : {
                onDelete: {
                  deleteCurrentObjects: deleteCurrentObjectsOnDelete,
                },
              }),
        },
        ...(maxConcurrency === undefined && sourceWindowBytes === undefined
          ? {}
          : {
              transfer: {
                ...(maxConcurrency === undefined ? {} : { maxConcurrency }),
                ...(sourceWindowBytes === undefined
                  ? {}
                  : { advancedTuning: { sourceWindowBytes } }),
              },
            }),
        sources: [
          ...bundle.sourceRoots.map((root) => ShinSource.asset(root)),
          ...(markerPayload === undefined
            ? []
            : [ShinSource.data("runtime/marker-heavy.txt", markerPayload)]),
        ],
      });
    } else {
      deployment = new AwsBucketDeployment(this, "DeployBenchmarkAssets", {
        ...upstreamDeploymentProps,
        waitForDistributionInvalidation: process.env.SHIN_BENCH_WAIT_FOR_CLOUDFRONT === "true",
        prune: deleteStaleObjects,
        ...(deleteCurrentObjectsOnDelete === undefined
          ? {}
          : { retainOnDelete: !deleteCurrentObjectsOnDelete }),
        sources: [
          ...bundle.sourceRoots.map((root) => AwsSource.asset(root)),
          ...(markerPayload === undefined
            ? []
            : [AwsSource.data("runtime/marker-heavy.txt", markerPayload)]),
        ],
      });
    }
    forceBenchmarkInvocation(deployment, process.env.SHIN_BENCH_INVOCATION_TOKEN);
    forceFreshExecutionEnvironment(this, process.env.SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN);

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

    new CfnOutput(this, "BenchmarkSourceCount", {
      value: String(bundle.sourceCount),
    });

    new CfnOutput(this, "BenchmarkTotalBytes", {
      value: String(bundle.totalBytes),
    });

    new CfnOutput(this, "BenchmarkAssetManifestSha256", {
      value: bundle.assetManifestSha256,
    });

    new CfnOutput(this, "BenchmarkMemoryLimitMb", {
      value: String(memoryLimitMb),
    });

    new CfnOutput(this, "BenchmarkTransferMaxConcurrency", {
      value: String(maxConcurrency ?? 32),
    });

    new CfnOutput(this, "BenchmarkSourceWindowBytes", {
      value: sourceWindowBytes === undefined ? "adaptive" : String(sourceWindowBytes),
    });

    new CfnOutput(this, "BenchmarkDetailedFailureDiagnostics", {
      value: implementation === "shin" ? String(detailedFailureDiagnostics) : "not-applicable",
    });

    new CfnOutput(this, "BenchmarkImplementation", {
      value: implementation,
    });
  }
}

function forceFreshExecutionEnvironment(stack: Stack, token: string | undefined): void {
  if (!token) {
    return;
  }
  const functions = stack.node
    .findAll()
    .filter((construct): construct is CfnFunction => construct instanceof CfnFunction);
  for (const handler of functions) {
    handler.addPropertyOverride(
      "Environment.Variables.SHIN_BENCH_EXECUTION_ENVIRONMENT_TOKEN",
      token,
    );
  }
}

function forceBenchmarkInvocation(deployment: Construct, token: string | undefined): void {
  if (!token) {
    return;
  }
  const customResources = deployment.node
    .findAll()
    .filter(
      (child): child is CfnResource =>
        CfnResource.isCfnResource(child) &&
        (child.cfnResourceType === "AWS::CloudFormation::CustomResource" ||
          child.cfnResourceType.startsWith("Custom::")),
    );
  const [customResource] = customResources;
  if (customResource === undefined || customResources.length !== 1) {
    throw new Error(
      `Expected exactly one deployment custom resource, found ${customResources.length}.`,
    );
  }
  customResource.addPropertyOverride("BenchmarkInvocationToken", token);
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
