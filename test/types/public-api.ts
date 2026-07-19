import type { IDistributionRef } from "aws-cdk-lib/aws-cloudfront";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import type { Bucket } from "aws-cdk-lib/aws-s3";
import {
  FailureDiagnostics,
  type ISource,
  ProviderSharing,
  type ShinBucketDeploymentAdvancedTransferTuning,
  type ShinBucketDeploymentDestination,
  type ShinBucketDeploymentLocalBuildOptions,
  type ShinBucketDeploymentProps,
  type ShinBucketDeploymentProviderLambdaOptions,
  type ShinBucketDeploymentSourceProcessingOptions,
  type ShinBucketDeploymentTransferOptions,
} from "../../src";

declare const bucket: Bucket;
declare const distribution: IDistributionRef;
declare const source: ISource;

const destination: ShinBucketDeploymentDestination = { bucket };
const sourceProcessing: ShinBucketDeploymentSourceProcessingOptions = {
  extract: true,
  include: ["*.html"],
  exclude: ["*.map"],
};
const localBuild: ShinBucketDeploymentLocalBuildOptions = { projectPath: "rust" };
const providerLambda: ShinBucketDeploymentProviderLambdaOptions = {
  sharing: ProviderSharing.DEPLOYMENT,
  architecture: Architecture.X86_64,
  memorySize: 2048,
  failureDiagnostics: FailureDiagnostics.DETAILED,
  localBuild,
};
const advancedTuning: ShinBucketDeploymentAdvancedTransferTuning = {
  sourceBlockBytes: 4 * 1024 * 1024,
  destinationWriteRetry: { maxAttempts: 4 },
};
const transfer: ShinBucketDeploymentTransferOptions = {
  maxConcurrency: 16,
  advancedTuning,
};

const minimal: ShinBucketDeploymentProps = {
  sources: [source],
  destination,
};
const complete: ShinBucketDeploymentProps = {
  sources: [source],
  destination: { bucket, keyPrefix: "site" },
  sourceProcessing,
  providerLambda,
  transfer,
  cloudfrontInvalidation: { distribution, paths: ["/site/*"], waitForCompletion: true },
  destinationLifecycle: {
    onDeploy: { deleteStaleObjects: false },
    onChange: {
      deletePreviousObjects: true,
      previousBucket: bucket,
      invalidatePreviousDistribution: distribution,
    },
    onDelete: { deleteCurrentObjects: true },
  },
};

const formerFlatProperty = {
  sources: [source],
  destination,
  // @ts-expect-error The clean-break API rejects former flat properties.
  destinationBucket: bucket,
} satisfies ShinBucketDeploymentProps;

void minimal;
void complete;
void formerFlatProperty;
