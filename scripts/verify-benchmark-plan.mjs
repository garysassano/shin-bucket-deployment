import { parseBenchmarkRunOptions } from "../dist/benchmarks/src/config.js";
import { createBenchmarkPlan } from "../dist/benchmarks/src/plan.js";
import { validateMethodologyV2Run } from "../dist/benchmarks/src/validation.js";

const runId = "00000000-0000-4000-a000-000000000001";
const options = parseBenchmarkRunOptions([
  "--config",
  "benchmarks/configs/methodology-v2-1024-32.json",
  "--run-id",
  runId,
]);
const plan = createBenchmarkPlan(options);
const expectedSamples = 5 * (2 + 2);
if (plan.length !== expectedSamples) {
  throw new Error(
    `Canonical benchmark plan has ${plan.length} samples; expected ${expectedSamples}.`,
  );
}
if (plan.some((sample) => sample.implementation === "aws" && sample.parallel !== null)) {
  throw new Error("Canonical upstream samples must use parallel=null.");
}
if (new Set(plan.map((sample) => sample.sampleId)).size !== plan.length) {
  throw new Error("Canonical benchmark sample IDs are not unique.");
}

const records = plan.flatMap((sample) =>
  options.phases.map((phase) => ({
    resultSchemaVersion: 2,
    methodologyVersion: 2,
    runId,
    sampleId: sample.sampleId,
    snapshotDate: options.snapshotDate,
    repetition: sample.repetition,
    providerImplementationCommit: sample.implementation === "shin" ? "commit" : null,
    providerImplementationSubject: sample.implementation === "shin" ? "subject" : null,
    providerPackageName:
      sample.implementation === "shin" ? "shin-bucket-deployment" : "aws-cdk-lib",
    providerPackageVersion: "1.0.0",
    providerArchitecture: "arm64",
    providerCodeSha256: "code-sha256",
    providerBootstrapSha256: sample.implementation === "shin" ? "a".repeat(64) : null,
    gitDirty: false,
    cdkCliVersion: "1.0.0",
    awsCdkLibVersion: "1.0.0",
    awsCdkLibIntegrity: "sha512-test",
    executionEnvironmentFresh: true,
    memoryMeasurementScope: "phase-local",
    region: options.region,
    implementation: sample.implementation,
    profile: sample.assetProfile,
    memoryMb: sample.memoryMb,
    parallel: sample.parallel,
    phase: phase.name,
    state: phase.assetState,
    fileCount: 1,
    totalBytes: 1,
    cdkDeploySeconds: 1,
    localWallSeconds: 1,
    providerDurationSeconds: 1,
    billedDurationSeconds: 1,
    initDurationSeconds: null,
    maxMemoryMb: 1,
    providerInvoked: true,
    cleanup: "all benchmark stacks destroyed",
    providerSummary:
      sample.implementation === "shin"
        ? { event: "shin_deployment_summary", schemaVersion: 3, deploymentStatus: "success" }
        : null,
  })),
);
validateMethodologyV2Run(records, options);
console.log(`Verified canonical methodology-v2 dry-run plan and ${records.length} complete cells.`);
