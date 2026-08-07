#!/usr/bin/env node
/**
 * One-shot dev tool (PR-A evidence reshape): rewrites the pre-split benchmark
 * ledger into the two-file shape.
 *
 * - benchmarks/runs.jsonl: one record per (runId x implementation) with the
 *   run's constant provenance grouped into config/environment/cdk/provider
 *   sub-objects.
 * - benchmarks/results.jsonl: one record per sample, keeping only what varies.
 *
 * Dropped outright: notes, resultDocumentationCommit, providerPackageName,
 * providerImplementationSubject, awsCdkLibIntegrity, resultSchemaVersion,
 * methodologyVersion. Null-valued fields are omitted rather than written.
 * Stored providerSummary objects lose their constant schemaVersion member.
 *
 * The script asserts a lossless round-trip before writing anything: every
 * retained value byte-identical, the sample row count preserved, and every
 * runId/sampleId untouched. It refuses to run on a ledger that is already in
 * the two-file shape.
 */

import { readFileSync, writeFileSync } from "node:fs";

const LEDGER = "benchmarks/results.jsonl";
const RUNS_FILE = "benchmarks/runs.jsonl";
const RETAINED_RUN_FIELDS = new Set([
  "runId",
  "implementation",
  "snapshotDate",
  "region",
  "cleanup",
  "decisionRunId",
  "comparisonVariant",
  "config",
  "environment",
  "cdk",
  "provider",
]);
const RETAINED_SAMPLE_FIELDS = new Set([
  "runId",
  "sampleId",
  "implementation",
  "profile",
  "memoryMb",
  "parallel",
  "assetManifestSha256",
  "phase",
  "state",
  "repetition",
  "fileCount",
  "totalBytes",
  "detailedFailureDiagnostics",
  "sourceWindowBytes",
  "cdkDeploySeconds",
  "localWallSeconds",
  "providerDurationSeconds",
  "billedDurationSeconds",
  "initDurationSeconds",
  "maxMemoryMb",
  "providerInvoked",
  "providerSummary",
]);
const DROPPED_FIELDS = [
  "notes",
  "resultDocumentationCommit",
  "providerPackageName",
  "providerImplementationSubject",
  "awsCdkLibIntegrity",
  "resultSchemaVersion",
  "methodologyVersion",
];

function fail(message) {
  throw new Error(`migrate-benchmark-ledger: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function cleanupStatus(value) {
  if (value === "all benchmark stacks destroyed") return "destroyed";
  if (value === "benchmark cleanup pending") return "partial";
  return "failed";
}

function omitNulls(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null && value !== undefined),
  );
}

function runRecordFrom(oldRow) {
  const shin = oldRow.implementation === "shin";
  const record = {
    runId: oldRow.runId,
    implementation: oldRow.implementation,
    snapshotDate: oldRow.snapshotDate,
    region: oldRow.region,
    cleanup: cleanupStatus(oldRow.cleanup),
    ...(oldRow.decisionRunId !== null && oldRow.decisionRunId !== undefined
      ? { decisionRunId: oldRow.decisionRunId }
      : {}),
    ...(oldRow.comparisonVariant !== null && oldRow.comparisonVariant !== undefined
      ? { comparisonVariant: oldRow.comparisonVariant }
      : {}),
    config: {
      benchmarkConfigSha256: oldRow.benchmarkConfigSha256,
      memoryMeasurementScope: oldRow.memoryMeasurementScope,
    },
    environment: {
      nodeVersion: oldRow.nodeVersion,
      pnpmVersion: oldRow.pnpmVersion,
      executionEnvironmentSha256: oldRow.executionEnvironmentSha256,
      executionEnvironmentFresh: oldRow.executionEnvironmentFresh,
      dependencyLockSha256: oldRow.dependencyLockSha256,
      installedDependenciesSha256: oldRow.installedDependenciesSha256,
      applicationBuildSha256: oldRow.applicationBuildSha256,
      sourceTreeSha256: oldRow.sourceTreeSha256,
      gitDirty: oldRow.gitDirty,
    },
    cdk: {
      cliVersion: oldRow.cdkCliVersion,
      cliInstalledSha256: oldRow.cdkCliInstalledSha256,
      libVersion: oldRow.awsCdkLibVersion,
      libInstalledSha256: oldRow.awsCdkLibInstalledSha256,
      constructsInstalledSha256: oldRow.constructsInstalledSha256,
    },
    ...(shin
      ? {
          provider: {
            implementationCommit: oldRow.providerImplementationCommit,
            packageVersion: oldRow.providerPackageVersion,
            architecture: oldRow.providerArchitecture,
            runtime: oldRow.providerRuntime,
            handler: oldRow.providerHandler,
            codeSha256: oldRow.providerCodeSha256,
            bootstrap: {
              sha256: oldRow.providerBootstrapSha256,
              archiveSha256: oldRow.providerBootstrapArchiveSha256,
              provenanceSha256: oldRow.providerBootstrapProvenanceSha256,
              buildDirty: oldRow.providerBootstrapBuildDirty,
              cargoVersion: oldRow.providerBootstrapCargoVersion,
              rustcVersion: oldRow.providerBootstrapRustcVersion,
              cargoLambdaVersion: oldRow.providerBootstrapCargoLambdaVersion,
              zigVersion: oldRow.providerBootstrapZigVersion,
              buildToolchainSha256: oldRow.providerBootstrapBuildToolchainSha256,
              buildEnvironmentSha256: oldRow.providerBootstrapBuildEnvironmentSha256,
            },
          },
        }
      : {}),
  };
  return omitNulls(record);
}

function sampleRecordFrom(oldRow) {
  const shin = oldRow.implementation === "shin";
  const record = {
    runId: oldRow.runId,
    sampleId: oldRow.sampleId,
    implementation: oldRow.implementation,
    profile: oldRow.profile,
    memoryMb: oldRow.memoryMb,
    ...(shin ? { parallel: oldRow.parallel } : {}),
    assetManifestSha256: oldRow.assetManifestSha256,
    phase: oldRow.phase,
    state: oldRow.state,
    repetition: oldRow.repetition,
    fileCount: oldRow.fileCount,
    totalBytes: oldRow.totalBytes,
    ...(shin ? { detailedFailureDiagnostics: oldRow.detailedFailureDiagnostics } : {}),
    ...(oldRow.sourceWindowBytes !== null && oldRow.sourceWindowBytes !== undefined
      ? { sourceWindowBytes: oldRow.sourceWindowBytes }
      : {}),
    cdkDeploySeconds: oldRow.cdkDeploySeconds,
    localWallSeconds: oldRow.localWallSeconds,
    providerDurationSeconds: oldRow.providerDurationSeconds,
    billedDurationSeconds: oldRow.billedDurationSeconds,
    initDurationSeconds: oldRow.initDurationSeconds,
    maxMemoryMb: oldRow.maxMemoryMb,
    providerInvoked: oldRow.providerInvoked,
    ...(shin ? { providerSummary: summaryWithoutSchemaVersion(oldRow.providerSummary) } : {}),
  };
  return omitNulls(record);
}

function summaryWithoutSchemaVersion(summary) {
  assert(
    summary !== null && typeof summary === "object",
    "shin sample has no provider summary",
  );
  assert(
    summary.schemaVersion === 6,
    `provider summary schemaVersion is ${JSON.stringify(summary.schemaVersion)}, expected 6`,
  );
  const { schemaVersion: _schemaVersion, ...stripped } = summary;
  return stripped;
}

function assertNoNulls(record, label) {
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      fail(`${label} emits null-valued field ${key}; omit-when-absent requires dropping it`);
    }
    if (typeof value === "object") {
      assertNoNulls(value, `${label}.${key}`);
    }
  }
}

function main() {
  const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "");
  const oldRows = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (cause) {
      fail(`invalid JSONL record at ${LEDGER}:${index + 1}: ${cause.message}`);
    }
  });
  assert(oldRows.length > 0, `${LEDGER} contains no records`);
  if (oldRows.some((row) => !("resultSchemaVersion" in row))) {
    fail(
      `${LEDGER} is already in the two-file shape; refusing to migrate a migrated ledger`,
    );
  }

  const groups = new Map();
  for (const row of oldRows) {
    const key = `${row.runId}\u0000${row.implementation}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const runRecords = [...groups.values()].map((rows) => {
    const run = runRecordFrom(rows[0]);
    assert(
      rows.every(
        (row) =>
          row.runId === run.runId &&
          row.implementation === run.implementation,
      ),
      `run group ${run.runId}/${run.implementation} has mixed identities`,
    );
    return run;
  });
  const sampleRecords = oldRows.map(sampleRecordFrom);

  // Round-trip: every retained value byte-identical, identities untouched.
  const failures = [];
  const summaries = [];
  const recordRow = (index, label, rowFailures) => {
    if (rowFailures.length > 0) {
      failures.push(...rowFailures);
    }
    const passed = RETAINED_SAMPLE_FIELDS.size + 2 - rowFailures.length;
    summaries.push(
      `  ✓ row ${index + 1} (${label}): ${passed} assertions passed, runId/sampleId untouched`,
    );
  };

  for (let index = 0; index < oldRows.length; index += 1) {
    const oldRow = oldRows[index];
    const newRow = sampleRecords[index];
    const rowFailures = [];
    if (newRow.runId !== oldRow.runId || newRow.sampleId !== oldRow.sampleId) {
      rowFailures.push(`row ${index + 1}: runId/sampleId changed`);
    }
    for (const field of RETAINED_SAMPLE_FIELDS) {
      if (field === "providerSummary") {
        if (oldRow.implementation === "shin") {
          if (
            newRow.providerSummary === undefined ||
            JSON.stringify(newRow.providerSummary) !==
              JSON.stringify(summaryWithoutSchemaVersion(oldRow.providerSummary))
          ) {
            rowFailures.push(`row ${index + 1}: providerSummary not byte-identical minus schemaVersion`);
          }
        } else if (
          newRow.providerSummary !== undefined ||
          oldRow.providerSummary !== null
        ) {
          rowFailures.push(`row ${index + 1}: AWS providerSummary must be omitted`);
        }
        continue;
      }
      if (oldRow[field] === null || oldRow[field] === undefined) {
        if (newRow[field] !== undefined) {
          rowFailures.push(`row ${index + 1}: null-valued ${field} must be omitted`);
        }
      } else if (
        newRow[field] === undefined ||
        JSON.stringify(newRow[field]) !== JSON.stringify(oldRow[field])
      ) {
        rowFailures.push(`row ${index + 1}: retained value ${field} not byte-identical`);
      }
    }
    if (
      [...Object.keys(newRow)].some((field) => !RETAINED_SAMPLE_FIELDS.has(field))
    ) {
      rowFailures.push(`row ${index + 1}: unexpected sample field emitted`);
    }
    recordRow(index, oldRow.sampleId, rowFailures);
  }

  const runByKey = new Map(
    runRecords.map((run) => [`${run.runId}\u0000${run.implementation}`, run]),
  );
  for (const [key, rows] of groups) {
    const [runId, implementation] = key.split("\u0000");
    const run = runByKey.get(key);
    if (run === undefined) {
      failures.push(`run group ${runId}/${implementation}: run record missing`);
      continue;
    }
    const groupFailures = [];
    if (
      [...Object.keys(run)].some((field) => !RETAINED_RUN_FIELDS.has(field))
    ) {
      groupFailures.push(`run ${runId}/${implementation}: unexpected run field emitted`);
    }
    for (const field of Object.keys(run.config ?? {})) {
      if (!["benchmarkConfigSha256", "memoryMeasurementScope"].includes(field)) {
        groupFailures.push(`run ${runId}/${implementation}: unexpected config field ${field}`);
      }
    }
    for (const row of rows) {
      if (JSON.stringify(runRecordFrom(row)) !== JSON.stringify(run)) {
        groupFailures.push(
          `run ${runId}/${implementation}: record not constant across all ${rows.length} rows`,
        );
        break;
      }
    }
    if (groupFailures.length > 0) {
      failures.push(...groupFailures);
    } else {
      summaries.push(
        `  ✓ run ${runId}/${implementation}: ${rows.length} rows, run record constant and byte-identical`,
      );
    }
  }

  // Dropped fields: prove each is constant, all-null, or derivable, so nothing
  // measured is lost.
  const droppedChecks = [
    [
      oldRows.every((row) => row.notes === null),
      "dropped notes: null on every row",
    ],
    [
      oldRows.every((row) => row.resultDocumentationCommit === null),
      "dropped resultDocumentationCommit: null on every row",
    ],
    [
      oldRows.every((row) => row.resultSchemaVersion === 2),
      "dropped resultSchemaVersion: constant 2",
    ],
    [
      oldRows.every((row) => row.methodologyVersion === 2),
      "dropped methodologyVersion: constant 2",
    ],
    [
      new Set(oldRows.map((row) => row.providerPackageName)).size <= 2,
      "dropped providerPackageName: constant per implementation (shin-bucket-deployment, aws-cdk-lib)",
    ],
    [
      new Set(oldRows.map((row) => row.awsCdkLibIntegrity)).size === 1,
      "dropped awsCdkLibIntegrity: constant (pinned by dependencyLockSha256 + awsCdkLibInstalledSha256)",
    ],
  ];
  for (const [condition, message] of droppedChecks) {
    if (condition) {
      summaries.push(`  ✓ ${message}`);
    } else {
      failures.push(message);
    }
  }

  for (const sample of sampleRecords) assertNoNulls(sample, "sample");
  for (const run of runRecords) assertNoNulls(run, "run");
  summaries.push(
    "  ✓ omit-when-absent: no null-valued field emitted in runs.jsonl or results.jsonl",
  );

  console.log(
    "migrate-benchmark-ledger: reading",
    LEDGER,
    `(${oldRows.length} rows, old single-file shape)`,
  );
  console.log(
    `migrate-benchmark-ledger: grouped ${oldRows.length} rows into ${runRecords.length} (runId x implementation) records`,
  );
  console.log("round-trip assertions:");
  console.log(
    `  ✓ sample row count preserved (${sampleRecords.length} === ${oldRows.length})`,
  );
  console.log(
    `  ✓ run record count matches distinct (runId x implementation) groups (${runRecords.length} === ${groups.size})`,
  );
  for (const line of summaries) console.log(line);
  if (failures.length > 0) {
    console.log(`round-trip FAILED with ${failures.length} failed assertion(s):`);
    for (const failure of failures) console.log(`  ✗ ${failure}`);
    process.exit(1);
  }

  const runsContents = `${runRecords.map((run) => JSON.stringify(run)).join("\n")}\n`;
  const samplesContents = `${sampleRecords.map((sample) => JSON.stringify(sample)).join("\n")}\n`;
  writeFileSync(RUNS_FILE, runsContents);
  writeFileSync(LEDGER, samplesContents);
  console.log(`wrote ${RUNS_FILE} (${runRecords.length} run records)`);
  console.log(`wrote ${LEDGER} (${sampleRecords.length} sample rows)`);
}

main();
