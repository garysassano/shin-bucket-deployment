import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertRoundTrip,
  droppedFieldProofs,
  runRecordFrom,
  sampleRecordFrom,
} from "./migrate-benchmark-ledger.mjs";

function oldRow(overrides = {}) {
  return {
    runId: "00000000-0000-4000-a000-000000000001",
    sampleId: "00000000-0000-5000-a000-000000000001",
    implementation: "shin",
    snapshotDate: "2026-01-01",
    region: "eu-central-1",
    cleanup: "all benchmark stacks destroyed",
    benchmarkConfigSha256: "a".repeat(64),
    memoryMeasurementScope: "phase-local",
    nodeVersion: "v24.0.0",
    pnpmVersion: "11.0.0",
    executionEnvironmentSha256: "b".repeat(64),
    executionEnvironmentFresh: true,
    dependencyLockSha256: "c".repeat(64),
    installedDependenciesSha256: "d".repeat(64),
    applicationBuildSha256: "e".repeat(64),
    sourceTreeSha256: "f".repeat(64),
    gitDirty: false,
    cdkCliVersion: "2.260.0",
    cdkCliInstalledSha256: "g".repeat(64),
    awsCdkLibVersion: "2.260.0",
    awsCdkLibInstalledSha256: "h".repeat(64),
    constructsInstalledSha256: "i".repeat(64),
    providerImplementationCommit: "9".repeat(40),
    providerPackageVersion: "0.11.0",
    providerArchitecture: "arm64",
    providerRuntime: "provided.al2023",
    providerHandler: "bootstrap",
    providerCodeSha256: Buffer.from("a".repeat(64), "hex").toString("base64"),
    providerBootstrapSha256: "j".repeat(64),
    providerBootstrapArchiveSha256: "a".repeat(64),
    providerBootstrapProvenanceSha256: "k".repeat(64),
    providerBootstrapBuildDirty: false,
    providerBootstrapCargoVersion: "cargo 1.0.0",
    providerBootstrapRustcVersion: "rustc 1.0.0",
    providerBootstrapCargoLambdaVersion: "cargo-lambda 1.0.0",
    providerBootstrapZigVersion: "1.0.0",
    providerBootstrapBuildToolchainSha256: "l".repeat(64),
    providerBootstrapBuildEnvironmentSha256: "m".repeat(64),
    profile: "mixed",
    memoryMb: 2048,
    parallel: 64,
    assetManifestSha256: "n".repeat(64),
    phase: "cold-create",
    state: "baseline",
    repetition: 1,
    fileCount: 442,
    totalBytes: 52904649,
    detailedFailureDiagnostics: true,
    cdkDeploySeconds: 52.68,
    localWallSeconds: 102.062,
    providerDurationSeconds: 0.825,
    billedDurationSeconds: 0.944,
    initDurationSeconds: 0.119,
    maxMemoryMb: 109,
    providerInvoked: true,
    providerSummary: { event: "shin_deployment_summary", schemaVersion: 6, durationMs: 1 },
    notes: null,
    resultDocumentationCommit: null,
    providerPackageName: "shin-bucket-deployment",
    providerImplementationSubject: "subject",
    awsCdkLibIntegrity: "sha512-test",
    resultSchemaVersion: 2,
    methodologyVersion: 2,
    ...overrides,
  };
}

test("round-trip assertion accepts the lossless migration output", () => {
  const shinRow = oldRow();
  const awsRow = oldRow({
    sampleId: "00000000-0000-5000-a000-000000000002",
    implementation: "aws",
    providerPackageName: "aws-cdk-lib",
    parallel: null,
    detailedFailureDiagnostics: null,
    providerImplementationCommit: null,
    providerBootstrapSha256: null,
    providerBootstrapArchiveSha256: null,
    providerBootstrapProvenanceSha256: null,
    providerBootstrapBuildDirty: null,
    providerBootstrapCargoVersion: null,
    providerBootstrapRustcVersion: null,
    providerBootstrapCargoLambdaVersion: null,
    providerBootstrapZigVersion: null,
    providerBootstrapBuildToolchainSha256: null,
    providerBootstrapBuildEnvironmentSha256: null,
    providerSummary: null,
    providerImplementationSubject: null,
    providerPackageVersion: "2.260.0",
    providerArchitecture: "x86_64",
    providerRuntime: "python3.13",
    providerHandler: "index.handler",
    providerCodeSha256: Buffer.from("b".repeat(64), "hex").toString("base64"),
  });
  const oldRows = [shinRow, awsRow];
  const runs = ["shin", "aws"].map((implementation) =>
    runRecordFrom(oldRows.find((row) => row.implementation === implementation)),
  );
  const samples = oldRows.map(sampleRecordFrom);

  const result = assertRoundTrip(oldRows, runs, samples);
  assert.deepEqual(result.failures, []);
  const expectedComparisons = oldRows.reduce(
    (count, row) =>
      count +
      Object.keys(row).filter(
        (field) =>
          row[field] !== null &&
          row[field] !== undefined &&
          ![
            "notes",
            "resultDocumentationCommit",
            "providerPackageName",
            "providerImplementationSubject",
            "awsCdkLibIntegrity",
            "resultSchemaVersion",
            "methodologyVersion",
          ].includes(field),
      ).length,
    0,
  );
  assert.equal(result.byteIdentical, expectedComparisons);
});

test("round-trip assertion fails loudly when the AWS provider block is dropped", () => {
  const awsRow = oldRow({
    implementation: "aws",
    providerPackageName: "aws-cdk-lib",
    parallel: null,
    detailedFailureDiagnostics: null,
    providerImplementationCommit: null,
    providerBootstrapSha256: null,
    providerBootstrapArchiveSha256: null,
    providerBootstrapProvenanceSha256: null,
    providerBootstrapBuildDirty: null,
    providerBootstrapCargoVersion: null,
    providerBootstrapRustcVersion: null,
    providerBootstrapCargoLambdaVersion: null,
    providerBootstrapZigVersion: null,
    providerBootstrapBuildToolchainSha256: null,
    providerBootstrapBuildEnvironmentSha256: null,
    providerSummary: null,
    providerImplementationSubject: null,
    providerPackageVersion: "2.260.0",
    providerArchitecture: "x86_64",
    providerRuntime: "python3.13",
    providerHandler: "index.handler",
    providerCodeSha256: Buffer.from("b".repeat(64), "hex").toString("base64"),
  });
  const shinRow = oldRow();
  const oldRows = [shinRow, awsRow];
  const runs = [runRecordFrom(shinRow), { ...runRecordFrom(awsRow), provider: undefined }];
  const samples = oldRows.map(sampleRecordFrom);

  const result = assertRoundTrip(oldRows, runs, samples);
  const joined = result.failures.join("\n");
  for (const field of [
    "providerPackageVersion",
    "providerArchitecture",
    "providerRuntime",
    "providerHandler",
    "providerCodeSha256",
  ]) {
    assert.ok(joined.includes(field), `expected a failure for ${field}`);
  }
});

test("round-trip assertion fails loudly on unaccounted-for and invented fields", () => {
  const awsRow = oldRow({
    implementation: "aws",
    providerPackageName: "aws-cdk-lib",
    parallel: null,
    detailedFailureDiagnostics: null,
    providerImplementationCommit: null,
    providerBootstrapSha256: null,
    providerBootstrapArchiveSha256: null,
    providerBootstrapProvenanceSha256: null,
    providerBootstrapBuildDirty: null,
    providerBootstrapCargoVersion: null,
    providerBootstrapRustcVersion: null,
    providerBootstrapCargoLambdaVersion: null,
    providerBootstrapZigVersion: null,
    providerBootstrapBuildToolchainSha256: null,
    providerBootstrapBuildEnvironmentSha256: null,
    providerSummary: null,
    providerImplementationSubject: null,
    providerPackageVersion: "2.260.0",
    providerArchitecture: "x86_64",
    providerRuntime: "python3.13",
    providerHandler: "index.handler",
    providerCodeSha256: Buffer.from("b".repeat(64), "hex").toString("base64"),
  });
  const oldRows = [awsRow];
  const runs = [runRecordFrom(awsRow)];
  const samples = [sampleRecordFrom(awsRow)];

  const withInventedField = [{ ...samples[0], inventedConstant: "not from the old row" }];
  const invented = assertRoundTrip(oldRows, runs, withInventedField);
  assert.ok(
    invented.failures.some((failure) => failure.includes("inventedConstant")),
    `expected an unaccounted-for failure, got: ${invented.failures.join("; ")}`,
  );

  const withNullReinvented = [{ ...samples[0], parallel: 32 }];
  const nullReinvented = assertRoundTrip(oldRows, runs, withNullReinvented);
  assert.ok(
    nullReinvented.failures.some((failure) => failure.includes("parallel")),
    `expected a null-reinvented failure, got: ${nullReinvented.failures.join("; ")}`,
  );
});

test("dropped-field proofs pin providerPackageName per implementation", () => {
  const awsRow = oldRow({
    implementation: "aws",
    providerPackageName: "aws-cdk-lib",
  });
  const valid = droppedFieldProofs([oldRow(), awsRow]);
  for (const [condition, message] of valid) {
    assert.ok(condition, message);
  }

  // Two distinct values globally still pass the old "at most two names" check;
  // swapping the names within one implementation must fail the per-implementation
  // proof, because the field is discarded and the swap would be lost silently.
  const swapped = droppedFieldProofs([
    oldRow({ providerPackageName: "aws-cdk-lib" }),
    oldRow({ implementation: "aws", providerPackageName: "shin-bucket-deployment" }),
  ]);
  const nameProof = swapped.find(([, message]) => message.includes("providerPackageName"));
  assert.ok(nameProof, "expected a providerPackageName proof");
  assert.equal(nameProof[0], false);
  assert.ok(nameProof[1].includes("per implementation"), nameProof[1]);
});
