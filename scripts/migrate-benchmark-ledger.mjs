#!/usr/bin/env node
/**
 * One-shot dev tool (PR-A evidence reshape): rewrites the pre-split benchmark
 * ledger into the two-file shape.
 *
 * - benchmarks/runs.jsonl: one record per (runId x implementation) with the
 *   run's constant provenance grouped into config/environment/cdk/provider
 *   sub-objects. Both implementations carry a provider block; AWS keeps the
 *   five measured upstream-Lambda fields (packageVersion, architecture,
 *   runtime, handler, codeSha256) and only the shin-specific members
 *   (implementationCommit, bootstrap) are omitted for AWS.
 * - benchmarks/results.jsonl: one record per sample, keeping only what varies.
 *
 * Dropped outright: notes, resultDocumentationCommit, providerPackageName,
 * providerImplementationSubject, awsCdkLibIntegrity, resultSchemaVersion,
 * methodologyVersion. Null-valued fields are omitted rather than written.
 * Stored providerSummary objects lose their constant schemaVersion member.
 *
 * The script asserts a lossless round-trip before writing anything. The
 * assertion is driven by the OLD data, not by a hand-listed set of retained
 * fields: for every pre-migration row the run record and sample record are
 * merged back together, and every non-null old field value must be present in
 * the merged record byte-identical (accounting for the intentional renames,
 * the cleanup enum change, and the stripped providerSummary.schemaVersion),
 * except the deliberately dropped set. Every emitted field must in turn trace
 * back to a pre-migration field. It refuses to run on a ledger that is already
 * in the two-file shape.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LEDGER = "benchmarks/results.jsonl";
const RUNS_FILE = "benchmarks/runs.jsonl";

/**
 * Old flat-field name -> path in the reconstructed merged (run + sample)
 * record. Intentional renames land here (`cdkCliVersion` -> `cdk.cliVersion`,
 * `providerBootstrapCargoVersion` -> `provider.bootstrap.cargoVersion`, ...).
 * Fields absent from this map are the deliberately dropped set.
 */
const FIELD_PATHS = {
  runId: ["runId"],
  sampleId: ["sampleId"],
  implementation: ["implementation"],
  snapshotDate: ["snapshotDate"],
  region: ["region"],
  cleanup: ["cleanup"],
  decisionRunId: ["decisionRunId"],
  comparisonVariant: ["comparisonVariant"],
  benchmarkConfigSha256: ["config", "benchmarkConfigSha256"],
  memoryMeasurementScope: ["config", "memoryMeasurementScope"],
  nodeVersion: ["environment", "nodeVersion"],
  pnpmVersion: ["environment", "pnpmVersion"],
  executionEnvironmentSha256: ["environment", "executionEnvironmentSha256"],
  executionEnvironmentFresh: ["environment", "executionEnvironmentFresh"],
  dependencyLockSha256: ["environment", "dependencyLockSha256"],
  installedDependenciesSha256: ["environment", "installedDependenciesSha256"],
  applicationBuildSha256: ["environment", "applicationBuildSha256"],
  sourceTreeSha256: ["environment", "sourceTreeSha256"],
  gitDirty: ["environment", "gitDirty"],
  cdkCliVersion: ["cdk", "cliVersion"],
  cdkCliInstalledSha256: ["cdk", "cliInstalledSha256"],
  awsCdkLibVersion: ["cdk", "libVersion"],
  awsCdkLibInstalledSha256: ["cdk", "libInstalledSha256"],
  constructsInstalledSha256: ["cdk", "constructsInstalledSha256"],
  providerImplementationCommit: ["provider", "implementationCommit"],
  providerPackageVersion: ["provider", "packageVersion"],
  providerArchitecture: ["provider", "architecture"],
  providerRuntime: ["provider", "runtime"],
  providerHandler: ["provider", "handler"],
  providerCodeSha256: ["provider", "codeSha256"],
  providerBootstrapSha256: ["provider", "bootstrap", "sha256"],
  providerBootstrapArchiveSha256: ["provider", "bootstrap", "archiveSha256"],
  providerBootstrapProvenanceSha256: ["provider", "bootstrap", "provenanceSha256"],
  providerBootstrapBuildDirty: ["provider", "bootstrap", "buildDirty"],
  providerBootstrapCargoVersion: ["provider", "bootstrap", "cargoVersion"],
  providerBootstrapRustcVersion: ["provider", "bootstrap", "rustcVersion"],
  providerBootstrapCargoLambdaVersion: ["provider", "bootstrap", "cargoLambdaVersion"],
  providerBootstrapZigVersion: ["provider", "bootstrap", "zigVersion"],
  providerBootstrapBuildToolchainSha256: ["provider", "bootstrap", "buildToolchainSha256"],
  providerBootstrapBuildEnvironmentSha256: ["provider", "bootstrap", "buildEnvironmentSha256"],
  profile: ["profile"],
  memoryMb: ["memoryMb"],
  parallel: ["parallel"],
  assetManifestSha256: ["assetManifestSha256"],
  phase: ["phase"],
  state: ["state"],
  repetition: ["repetition"],
  fileCount: ["fileCount"],
  totalBytes: ["totalBytes"],
  detailedFailureDiagnostics: ["detailedFailureDiagnostics"],
  sourceWindowBytes: ["sourceWindowBytes"],
  cdkDeploySeconds: ["cdkDeploySeconds"],
  localWallSeconds: ["localWallSeconds"],
  providerDurationSeconds: ["providerDurationSeconds"],
  billedDurationSeconds: ["billedDurationSeconds"],
  initDurationSeconds: ["initDurationSeconds"],
  maxMemoryMb: ["maxMemoryMb"],
  providerInvoked: ["providerInvoked"],
  providerSummary: ["providerSummary"],
};

const DROPPED_FIELDS = new Set([
  "notes",
  "resultDocumentationCommit",
  "providerPackageName",
  "providerImplementationSubject",
  "awsCdkLibIntegrity",
  "resultSchemaVersion",
  "methodologyVersion",
]);

const REVERSE_PATHS = new Map(
  Object.entries(FIELD_PATHS).map(([field, path]) => [path.join("\u0000"), field]),
);

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

export function runRecordFrom(oldRow) {
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
    provider: {
      ...(shin ? { implementationCommit: oldRow.providerImplementationCommit } : {}),
      packageVersion: oldRow.providerPackageVersion,
      architecture: oldRow.providerArchitecture,
      runtime: oldRow.providerRuntime,
      handler: oldRow.providerHandler,
      codeSha256: oldRow.providerCodeSha256,
      ...(shin
        ? {
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
          }
        : {}),
    },
  };
  return omitNulls(record);
}

export function sampleRecordFrom(oldRow) {
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
  assert(summary !== null && typeof summary === "object", "shin sample has no provider summary");
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

/**
 * Old-data-driven round-trip assertion. For every pre-migration row, merge its
 * run record and sample record back together, then require every non-null old
 * field value (except the deliberately dropped set and the stripped
 * providerSummary.schemaVersion) to be present and byte-identical, honoring
 * the intentional renames and the cleanup enum change. Also requires every
 * emitted field to trace back to a pre-migration field, so a migration that
 * silently drops, renames, or invents any value fails loudly.
 */
export function assertRoundTrip(oldRows, runRecords, sampleRecords) {
  const failures = [];
  const summaries = [];
  const runByKey = new Map(
    runRecords.map((run) => [`${run.runId}\u0000${run.implementation}`, run]),
  );
  let byteIdentical = 0;

  for (let index = 0; index < oldRows.length; index += 1) {
    const oldRow = oldRows[index];
    const newRow = sampleRecords[index];
    if (newRow.runId !== oldRow.runId || newRow.sampleId !== oldRow.sampleId) {
      failures.push(`row ${index + 1}: runId/sampleId changed`);
      continue;
    }
    const run = runByKey.get(`${oldRow.runId}\u0000${oldRow.implementation}`);
    if (run === undefined) {
      failures.push(`row ${index + 1} (${oldRow.sampleId}): no run record for this row`);
      continue;
    }
    const merged = { ...run, ...newRow };
    let rowPassed = 0;
    // Drive the check from the OLD row's own keys, not from FIELD_PATHS. A
    // keep-list can only prove the fields it already knows about, which is how
    // 720 AWS provider values were once dropped past a green assertion.
    for (const field of Object.keys(oldRow)) {
      if (!Object.hasOwn(FIELD_PATHS, field) && !DROPPED_FIELDS.has(field)) {
        failures.push(
          `row ${index + 1} (${oldRow.sampleId}): old field ${field} is unaccounted-for (neither retained nor dropped)`,
        );
      }
    }
    for (const [field, path] of Object.entries(FIELD_PATHS)) {
      const oldValue = oldRow[field];
      const actual = path.reduce((acc, key) => (acc === undefined ? undefined : acc[key]), merged);
      if (oldValue === null || oldValue === undefined) {
        // Absent in the old row: nothing measured to prove, and the emitted
        // record must not invent a value for it (omit-when-absent is one-way).
        if (actual !== undefined) {
          failures.push(
            `row ${index + 1} (${oldRow.sampleId}): ${field} was null in the old row but is present in the merged record`,
          );
        }
        continue;
      }
      const expected =
        field === "cleanup"
          ? cleanupStatus(oldRow.cleanup)
          : field === "providerSummary"
            ? summaryWithoutSchemaVersion(oldRow.providerSummary)
            : oldValue;
      if (actual === undefined || JSON.stringify(actual) !== JSON.stringify(expected)) {
        failures.push(
          `row ${index + 1} (${oldRow.sampleId}): ${field} lost or not byte-identical (` +
            `old ${String(JSON.stringify(expected)).slice(0, 48)} vs new ${String(JSON.stringify(actual)).slice(0, 48)})`,
        );
      } else {
        byteIdentical += 1;
        rowPassed += 1;
      }
    }
    summaries.push(
      `  ✓ row ${index + 1} (${oldRow.sampleId}): ${rowPassed} non-null old values byte-identical in merged record`,
    );
  }

  const runByKeyCheck = new Map(
    runRecords.map((run) => [`${run.runId}\u0000${run.implementation}`, run]),
  );
  for (const [key, rows] of groupRows(oldRows)) {
    const [runId, implementation] = key.split("\u0000");
    const run = runByKeyCheck.get(key);
    if (run === undefined) {
      failures.push(`run group ${runId}/${implementation}: run record missing`);
      continue;
    }
    const groupFailures = [];
    for (const row of rows) {
      if (JSON.stringify(runRecordFrom(row)) !== JSON.stringify(run)) {
        groupFailures.push(
          `run ${runId}/${implementation}: record not constant across all ${rows.length} rows`,
        );
        break;
      }
    }
    for (const path of unaccountedFieldPaths(run)) {
      groupFailures.push(
        `run ${runId}/${implementation}: emitted field ${path} is unaccounted-for`,
      );
    }
    if (groupFailures.length > 0) {
      failures.push(...groupFailures);
    } else {
      summaries.push(
        `  ✓ run ${runId}/${implementation}: ${rows.length} rows, run record constant and every field traces to the old row`,
      );
    }
  }

  for (let index = 0; index < sampleRecords.length; index += 1) {
    for (const path of unaccountedFieldPaths(sampleRecords[index])) {
      failures.push(`row ${index + 1}: emitted field ${path} is unaccounted-for`);
    }
  }

  return { byteIdentical, failures, summaries };
}

function groupRows(oldRows) {
  const groups = new Map();
  for (const row of oldRows) {
    const key = `${row.runId}\u0000${row.implementation}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

/** Every leaf field of an emitted record must trace to a pre-migration field. */
function unaccountedFieldPaths(record, prefix = []) {
  const found = [];
  for (const [key, value] of Object.entries(record)) {
    const path = [...prefix, key];
    if (REVERSE_PATHS.has(path.join("\u0000"))) {
      continue; // accounted field; its object value (e.g. providerSummary) is one old value
    }
    if (value !== null && typeof value === "object") {
      found.push(...unaccountedFieldPaths(value, path));
    } else {
      found.push(path.join("."));
    }
  }
  return found;
}

function main() {
  const lines = readFileSync(LEDGER, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  const oldRows = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (cause) {
      fail(`invalid JSONL record at ${LEDGER}:${index + 1}: ${cause.message}`);
      return undefined;
    }
  });
  assert(oldRows.length > 0, `${LEDGER} contains no records`);
  if (oldRows.some((row) => !("resultSchemaVersion" in row))) {
    fail(`${LEDGER} is already in the two-file shape; refusing to migrate a migrated ledger`);
  }

  const groups = groupRows(oldRows);
  const runRecords = [...groups.values()].map((rows) => {
    const run = runRecordFrom(rows[0]);
    assert(
      rows.every((row) => row.runId === run.runId && row.implementation === run.implementation),
      `run group ${run.runId}/${run.implementation} has mixed identities`,
    );
    return run;
  });
  const sampleRecords = oldRows.map(sampleRecordFrom);

  const roundTrip = assertRoundTrip(oldRows, runRecords, sampleRecords);
  const failures = [...roundTrip.failures];
  // The unaccounted-for-old-field check now lives inside assertRoundTrip, so it
  // applies to every caller and its own tests rather than only this entry point.
  for (const [condition, message] of droppedFieldProofs(oldRows)) {
    if (condition) {
      roundTrip.summaries.push(`  ✓ ${message}`);
    } else {
      failures.push(message);
    }
  }

  for (const sample of sampleRecords) assertNoNulls(sample, "sample");
  for (const run of runRecords) assertNoNulls(run, "run");
  roundTrip.summaries.push(
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
  console.log(`  ✓ sample row count preserved (${sampleRecords.length} === ${oldRows.length})`);
  console.log(
    `  ✓ run record count matches distinct (runId x implementation) groups (${runRecords.length} === ${groups.size})`,
  );
  for (const line of roundTrip.summaries) console.log(line);
  if (failures.length > 0) {
    console.log(
      `round-trip FAILED with ${failures.length} failed assertion(s) (${roundTrip.byteIdentical} byte-identical values):`,
    );
    for (const failure of failures) console.log(`  ✗ ${failure}`);
    process.exit(1);
  }
  console.log(
    `round-trip: ${roundTrip.byteIdentical} byte-identical values, ${failures.length} failures`,
  );

  const runsContents = `${runRecords.map((run) => JSON.stringify(run)).join("\n")}\n`;
  const samplesContents = `${sampleRecords.map((sample) => JSON.stringify(sample)).join("\n")}\n`;
  writeFileSync(RUNS_FILE, runsContents);
  writeFileSync(LEDGER, samplesContents);
  console.log(`wrote ${RUNS_FILE} (${runRecords.length} run records)`);
  console.log(`wrote ${LEDGER} (${sampleRecords.length} sample rows)`);
}

/**
 * Dropped fields: prove each is constant, all-null, or derivable, so nothing
 * measured is lost. `providerPackageName` is claimed constant *per
 * implementation*: a global "at most two distinct values" check would let the
 * two names swap within one implementation and still pass before being
 * discarded, so each implementation is pinned to its own name.
 */
export function droppedFieldProofs(oldRows) {
  const subjectsByRun = new Map();
  for (const row of oldRows) {
    const subject = row.providerImplementationSubject;
    if (subject === null || subject === undefined) continue;
    const subjects = subjectsByRun.get(row.runId) ?? new Set();
    subjects.add(subject);
    subjectsByRun.set(row.runId, subjects);
  }
  const distinctRunIds = new Set(oldRows.map((row) => row.runId));
  return [
    [oldRows.every((row) => row.notes === null), "dropped notes: null on every row"],
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
      oldRows.every(
        (row) =>
          row.providerPackageName ===
          (row.implementation === "shin" ? "shin-bucket-deployment" : "aws-cdk-lib"),
      ),
      "dropped providerPackageName: pinned per implementation (shin-bucket-deployment, aws-cdk-lib)",
    ],
    [
      subjectsByRun.size === distinctRunIds.size &&
        [...subjectsByRun.values()].every((subjects) => subjects.size === 1),
      "dropped providerImplementationSubject: exactly one per run (derivable from git log)",
    ],
    [
      new Set(oldRows.map((row) => row.awsCdkLibIntegrity)).size === 1,
      "dropped awsCdkLibIntegrity: constant (pinned by dependencyLockSha256 + awsCdkLibInstalledSha256)",
    ],
  ];
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
