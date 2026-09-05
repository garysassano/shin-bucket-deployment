import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test } from "vitest";
import { ShinBucketDeployment, Source } from "../../src";
import { ValidationError } from "../../src/errors";
import { testLocalProviderBuild } from "../support/bundling";

/**
 * `ValidationError.code` is documented as "stable, machine-readable", which
 * makes it API: adopters branch on it. Every existing assertion matched the
 * human-readable message instead, so renaming a code was invisible to the
 * suite while breaking anyone matching on it.
 *
 * Two complementary guards here. The inventory pins every literal code in
 * `src/`, so an added, removed, or renamed code is a visible diff rather than
 * a silent change. The behavioural cases below cover the codes that are built
 * at runtime from a property path, where a path rename silently rewrites the
 * code and no literal inventory could notice.
 */
const SOURCE_DIR = join(__dirname, "..", "..", "src");

function collectCodes(pattern: RegExp): string[] {
  const codes = new Set<string>();
  for (const entry of readdirSync(SOURCE_DIR)) {
    if (!entry.endsWith(".ts")) continue;
    const text = readFileSync(join(SOURCE_DIR, entry), "utf8");
    for (const match of text.matchAll(pattern)) {
      codes.add(match[1] as string);
    }
  }
  return [...codes].sort();
}

const EXPECTED_ERROR_CODES = [
  "ShinBucketDeploymentCargoLambdaMissing",
  "ShinBucketDeploymentCatalogedSourceBundling",
  "ShinBucketDeploymentCatalogedSourceContext",
  "ShinBucketDeploymentCatalogedSourceFollowSymlinks",
  "ShinBucketDeploymentCatalogedSourceHashType",
  "ShinBucketDeploymentCatalogedSourceMissing",
  "ShinBucketDeploymentCatalogedSourceRegularFile",
  "ShinBucketDeploymentCatalogedSourceRequiresAssetStaging",
  "ShinBucketDeploymentCatalogedSourceSymlink",
  "ShinBucketDeploymentCdkRenderingUnsupported",
  "ShinBucketDeploymentCloudFrontDistributionRequired",
  "ShinBucketDeploymentCloudFrontPathControlCharacter",
  "ShinBucketDeploymentCloudFrontPathTilde",
  "ShinBucketDeploymentCloudFrontPathTooLong",
  "ShinBucketDeploymentCloudFrontPathsLimit",
  "ShinBucketDeploymentCloudFrontPathsRequired",
  "ShinBucketDeploymentCloudFrontPathsStart",
  "ShinBucketDeploymentCloudFrontWildcardPathsLimit",
  "ShinBucketDeploymentDestinationBucketInspectable",
  "ShinBucketDeploymentDestinationBucketRequired",
  "ShinBucketDeploymentDestinationEncryptionUnsupported",
  "ShinBucketDeploymentDestinationKeyPrefixTagCharacters",
  "ShinBucketDeploymentDestinationKeyPrefixTooLong",
  "ShinBucketDeploymentDestinationKeyPrefixUnresolved",
  "ShinBucketDeploymentDestinationKmsEncryptionUnsupported",
  "ShinBucketDeploymentDestinationOwnershipTagRequired",
  "ShinBucketDeploymentDestinationTagKeysUnique",
  "ShinBucketDeploymentDestinationTagQuota",
  "ShinBucketDeploymentDestinationTagsUnsupported",
  "ShinBucketDeploymentHandlerCollision",
  "ShinBucketDeploymentHandlerRole",
  "ShinBucketDeploymentInvalidDestinationWriteRetryJitter",
  "ShinBucketDeploymentInvalidDestinationWriteRetryMaxDelayMs",
  "ShinBucketDeploymentInvalidDestinationWriteSlowdownRetryMaxDelayMs",
  "ShinBucketDeploymentInvalidGlobPattern",
  "ShinBucketDeploymentInvalidObject",
  "ShinBucketDeploymentInvalidProviderLambdaFailureDiagnostics",
  "ShinBucketDeploymentInvalidProviderLambdaMemorySizeForSourceBudget",
  "ShinBucketDeploymentInvalidProviderLambdaSharing",
  "ShinBucketDeploymentInvalidSource",
  "ShinBucketDeploymentInvalidSourceWindowMemoryBudgetMiB",
  "ShinBucketDeploymentLocalProviderBuildProjectPath",
  "ShinBucketDeploymentLocalProviderBuildSharing",
  "ShinBucketDeploymentPackageManifest",
  "ShinBucketDeploymentPrebuiltProviderArchiveMissing",
  "ShinBucketDeploymentPreviousBucketRequiresDeletePreviousObjects",
  "ShinBucketDeploymentProviderPublicSubnet",
  "ShinBucketDeploymentProviderVpcRequired",
  "ShinBucketDeploymentRequiredObject",
  "ShinBucketDeploymentSourceBlockExceedsMemoryBudget",
  "ShinBucketDeploymentSourceConcurrencyExceedsMemoryBudget",
  "ShinBucketDeploymentSourceMemoryBudgetExceedsCap",
  "ShinBucketDeploymentSourceWindowBelowBlock",
  "ShinBucketDeploymentSourceWindowExceedsMemoryBudget",
  "ShinBucketDeploymentSourcesRequired",
  "ShinBucketDeploymentUnknownProperty",
];

const EXPECTED_WARNING_CODES = [
  "ShinBucketDeploymentHighTransferConcurrency",
  "ShinBucketDeploymentImportedRoleGrantDropped",
  "ShinBucketDeploymentPackageVersionUnresolved",
  "ShinBucketDeploymentRootDelete",
  "ShinBucketDeploymentSharedRoleBucketWideDelete",
  "ShinBucketDeploymentVersionedDestination",
];

describe("validation error code inventory", () => {
  test("every literal ValidationError code is accounted for", () => {
    expect(collectCodes(/new ValidationError\(\s*"([^"]+)"/g)).toEqual(EXPECTED_ERROR_CODES);
  });

  test("every literal warning code is accounted for", () => {
    expect(collectCodes(/addWarning\(\s*"([^"]+)"/g)).toEqual(EXPECTED_WARNING_CODES);
  });

  test("codes are namespaced so adopters can match on the prefix", () => {
    for (const code of [...EXPECTED_ERROR_CODES, ...EXPECTED_WARNING_CODES]) {
      expect(code).toMatch(/^ShinBucketDeployment[A-Za-z]+$/);
    }
  });
});

/**
 * Codes built from a property path (`ShinBucketDeploymentInvalid` plus the
 * PascalCased path) are the ones no inventory can pin: renaming a public
 * property rewrites the code with no literal changing anywhere in `src/`.
 */
describe("path-derived validation error codes", () => {
  function codeFor(build: () => unknown): string {
    try {
      build();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      return (error as ValidationError).code;
    }
    throw new Error("expected a ValidationError");
  }

  function deploy(id: string, props: Record<string, unknown>) {
    const stack = new Stack();
    const destinationBucket = new Bucket(stack, "Dest");
    return () =>
      new ShinBucketDeployment(stack, id, {
        sources: [Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
        providerLambda: { localBuild: testLocalProviderBuild() },
        ...props,
      } as never);
  }

  test.each([
    [
      "sourceProcessing.maxUncompressedEntryBytes",
      "ShinBucketDeploymentInvalidSourceProcessingMaxUncompressedEntryBytes",
      { sourceProcessing: { maxUncompressedEntryBytes: 0 } },
    ],
    [
      "sourceProcessing.maxCompressionRatio",
      "ShinBucketDeploymentInvalidSourceProcessingMaxCompressionRatio",
      { sourceProcessing: { maxCompressionRatio: 0 } },
    ],
    [
      "providerLambda.memorySize",
      "ShinBucketDeploymentInvalidProviderLambdaMemorySize",
      { providerLambda: { memorySize: 1, localBuild: testLocalProviderBuild() } },
    ],
    [
      "transfer.maxConcurrency",
      "ShinBucketDeploymentInvalidTransferMaxConcurrency",
      { transfer: { maxConcurrency: 0 } },
    ],
    [
      "transfer.advancedTuning.sourceBlockBytes",
      "ShinBucketDeploymentInvalidTransferAdvancedTuningSourceBlockBytes",
      { transfer: { advancedTuning: { sourceBlockBytes: 1 } } },
    ],
    [
      "transfer.advancedTuning.destinationWriteRetry.maxAttempts",
      "ShinBucketDeploymentInvalidTransferAdvancedTuningDestinationWriteRetryMaxAttempts",
      { transfer: { advancedTuning: { destinationWriteRetry: { maxAttempts: 0 } } } },
    ],
  ])("%s reports %s", (_path, expectedCode, props) => {
    expect(codeFor(deploy(`Deploy${expectedCode}`, props))).toBe(expectedCode);
  });

  test("an unknown property reports the stable unknown-property code", () => {
    expect(codeFor(deploy("DeployUnknown", { sourceProcessing: { maxEntryBytes: 1024 } }))).toBe(
      "ShinBucketDeploymentUnknownProperty",
    );
  });
});
