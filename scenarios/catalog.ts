import type { ScenarioDefinition, ScenarioEntry } from "./types";

export const VERIFY_SCENARIOS = {
  simple: scenario("basic/simple-app.js", "ShinBucketDeploymentSimpleDemo"),
  "root-prefix": scenario("basic/root-prefix-app.js", "ShinBucketDeploymentRootPrefixDemo"),
  "marker-replacement": scenario(
    "content/marker-replacement-app.js",
    "ShinBucketDeploymentMarkerReplacementDemo",
  ),
  filters: scenario("content/filters-app.js", "ShinBucketDeploymentFiltersDemo"),
  "source-overwrite-order": scenario(
    "content/source-overwrite-order-app.js",
    "ShinBucketDeploymentSourceOverwriteOrderDemo",
  ),
  "external-zips": scenario("content/external-zips-app.js", "ShinBucketDeploymentExternalZipsDemo"),
  "co-tenant-protection-initial": scenario(
    "lifecycle/co-tenant-protection-initial-app.js",
    "ShinBucketDeploymentCoTenantSafetyDemo",
  ),
  "co-tenant-protection-updated": scenario(
    "lifecycle/co-tenant-protection-updated-app.js",
    "ShinBucketDeploymentCoTenantSafetyDemo",
  ),
  "child-parent-retention-initial": scenario(
    "lifecycle/child-parent-retention-initial-app.js",
    "ShinBucketDeploymentChildParentRetentionDemo",
  ),
  "child-parent-retention-updated": scenario(
    "lifecycle/child-parent-retention-updated-app.js",
    "ShinBucketDeploymentChildParentRetentionDemo",
  ),
  "child-parent-cleanup-initial": scenario(
    "lifecycle/child-parent-cleanup-initial-app.js",
    "ShinBucketDeploymentChildParentCleanupDemo",
  ),
  "child-parent-cleanup-updated": scenario(
    "lifecycle/child-parent-cleanup-updated-app.js",
    "ShinBucketDeploymentChildParentCleanupDemo",
  ),
  "cross-bucket-change-initial": scenario(
    "lifecycle/cross-bucket-change-initial-app.js",
    "ShinBucketDeploymentCrossBucketChangeDemo",
  ),
  "cross-bucket-change-updated": scenario(
    "lifecycle/cross-bucket-change-updated-app.js",
    "ShinBucketDeploymentCrossBucketChangeDemo",
  ),
  "stale-object-cleanup-initial": scenario(
    "updates/stale-object-cleanup-initial-app.js",
    "ShinBucketDeploymentStaleObjectCleanupDemo",
  ),
  "stale-object-cleanup-updated": scenario(
    "updates/stale-object-cleanup-updated-app.js",
    "ShinBucketDeploymentStaleObjectCleanupDemo",
  ),
  "stale-object-retention-initial": scenario(
    "updates/stale-object-retention-initial-app.js",
    "ShinBucketDeploymentStaleObjectRetentionDemo",
  ),
  "stale-object-retention-updated": scenario(
    "updates/stale-object-retention-updated-app.js",
    "ShinBucketDeploymentStaleObjectRetentionDemo",
  ),
  "default-retention-initial": scenario(
    "retention/default-retention-initial-app.js",
    "ShinBucketDeploymentDefaultRetentionDemo",
  ),
  "default-retention-updated": scenario(
    "retention/default-retention-updated-app.js",
    "ShinBucketDeploymentDefaultRetentionDemo",
  ),
  "default-retention-bucket-only": scenario(
    "retention/default-retention-bucket-only-app.js",
    "ShinBucketDeploymentDefaultRetentionDemo",
  ),
  "extract-false": scenario("basic/extract-false-app.js", "ShinBucketDeploymentExtractFalseDemo"),
  "object-deletion-initial": scenario(
    "retention/object-deletion-initial-app.js",
    "ShinBucketDeploymentObjectDeletionDemo",
  ),
  "object-deletion-updated": scenario(
    "retention/object-deletion-updated-app.js",
    "ShinBucketDeploymentObjectDeletionDemo",
  ),
  "object-deletion-bucket-only": scenario(
    "retention/object-deletion-bucket-only-app.js",
    "ShinBucketDeploymentObjectDeletionDemo",
  ),
  "replacement-safety-initial": scenario(
    "retention/replacement-safety-initial-app.js",
    "ShinBucketDeploymentReplacementSafetyDemo",
  ),
  "replacement-safety-updated": scenario(
    "retention/replacement-safety-updated-app.js",
    "ShinBucketDeploymentReplacementSafetyDemo",
  ),
  "large-archive": scenario("scale/large-archive-app.js", "ShinBucketDeploymentLargeArchiveDemo"),
  "kms-destination": scenario(
    "security/kms-destination-app.js",
    "ShinBucketDeploymentKmsDestinationDemo",
  ),
  "kms-managed-destination": scenario(
    "security/kms-managed-destination-app.js",
    "ShinBucketDeploymentKmsManagedDestinationDemo",
  ),
  "dsse-managed-destination": scenario(
    "security/dsse-managed-destination-app.js",
    "ShinBucketDeploymentDsseManagedDestinationDemo",
  ),
  "handler-isolation": scenario(
    "security/handler-isolation-app.js",
    "ShinBucketDeploymentHandlerIsolationDemo",
  ),
  "cloudfront-sync-initial": scenario(
    "cloudfront/cloudfront-sync-app.js",
    "ShinBucketDeploymentCloudFrontSyncDemo",
    { SHIN_VERIFY_CACHE_PROBE_TOKEN: "sync-initial" },
  ),
  "cloudfront-sync-updated": scenario(
    "cloudfront/cloudfront-sync-app.js",
    "ShinBucketDeploymentCloudFrontSyncDemo",
    { SHIN_VERIFY_CACHE_PROBE_TOKEN: "sync-updated" },
  ),
  "cloudfront-async-initial": scenario(
    "cloudfront/cloudfront-async-app.js",
    "ShinBucketDeploymentCloudFrontAsyncDemo",
    { SHIN_VERIFY_CACHE_PROBE_TOKEN: "async-initial" },
  ),
  "cloudfront-async-updated": scenario(
    "cloudfront/cloudfront-async-app.js",
    "ShinBucketDeploymentCloudFrontAsyncDemo",
    { SHIN_VERIFY_CACHE_PROBE_TOKEN: "async-updated" },
  ),
} as const satisfies Record<string, ScenarioDefinition>;

export const BENCHMARK_SCENARIOS = {
  assets: {
    file: "assets-app.js",
    root: "benchmarks",
    stackName: "ShinBucketDeploymentBenchmarkAssetsDemo",
  },
} as const satisfies Record<string, ScenarioDefinition>;

export const VERIFY_DEFAULT_ORDER = Object.keys(VERIFY_SCENARIOS);

export const VERIFY_GROUPS = {
  simple: ["simple"],
  "root-prefix": ["root-prefix"],
  "marker-replacement": ["marker-replacement"],
  filters: ["filters"],
  "source-overwrite-order": ["source-overwrite-order"],
  "external-zips": ["external-zips"],
  "co-tenant-protection": ["co-tenant-protection-initial", "co-tenant-protection-updated"],
  "child-parent-retention": ["child-parent-retention-initial", "child-parent-retention-updated"],
  "child-parent-cleanup": ["child-parent-cleanup-initial", "child-parent-cleanup-updated"],
  "cross-bucket-change": ["cross-bucket-change-initial", "cross-bucket-change-updated"],
  "stale-object-cleanup": ["stale-object-cleanup-initial", "stale-object-cleanup-updated"],
  "stale-object-retention": ["stale-object-retention-initial", "stale-object-retention-updated"],
  "default-retention": [
    "default-retention-initial",
    "default-retention-updated",
    "default-retention-bucket-only",
  ],
  "extract-false": ["extract-false"],
  "object-deletion": [
    "object-deletion-initial",
    "object-deletion-updated",
    "object-deletion-bucket-only",
  ],
  "replacement-safety": ["replacement-safety-initial", "replacement-safety-updated"],
  "large-archive": ["large-archive"],
  "kms-destination": ["kms-destination"],
  "kms-managed-destination": ["kms-managed-destination"],
  "dsse-managed-destination": ["dsse-managed-destination"],
  "handler-isolation": ["handler-isolation"],
  "cloudfront-sync": ["cloudfront-sync-initial", "cloudfront-sync-updated"],
  "cloudfront-async": ["cloudfront-async-initial", "cloudfront-async-updated"],
} as const satisfies Record<string, ReadonlyArray<keyof typeof VERIFY_SCENARIOS>>;

export const VERIFY_DEFAULT_GROUPS = Object.values(VERIFY_GROUPS);

export const VERIFY_DESTROY_ORDER = VERIFY_DEFAULT_GROUPS.map(terminalVerifyScenario);

export function verifyScenarioEntry(name: string): ScenarioEntry {
  const definition = VERIFY_SCENARIOS[name as keyof typeof VERIFY_SCENARIOS];
  if (definition === undefined) {
    throw new Error(`Unknown verify scenario: ${name}`);
  }
  return [name, definition];
}

function terminalVerifyScenario(
  group: ReadonlyArray<keyof typeof VERIFY_SCENARIOS>,
): keyof typeof VERIFY_SCENARIOS {
  const terminal = group.at(-1);
  if (terminal === undefined) throw new Error("Verification groups must not be empty.");
  return terminal;
}

function scenario(
  file: string,
  stackName: string,
  env?: Readonly<Record<string, string>>,
): ScenarioDefinition {
  return {
    file,
    root: "scenarios",
    stackName,
    postDeployVerifier: "scenario-state.js",
    postDestroyVerifier: "stack-absent.js",
    grantVerifierRead: true,
    ...(env ? { env } : {}),
  };
}
