import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import type { BenchmarkRunOptions } from "./config";
import { benchmarkConfigurationSha256 } from "./config";
import { type BenchmarkSourceMetadata, changedPathFromStatusLine } from "./metadata";
import type {
  BenchmarkCleanupStatus,
  BenchmarkRunRecord,
  BenchmarkRunRecordSource,
  BenchmarkSampleRecord,
} from "./model";
import {
  benchmarkRunKey,
  benchmarkRunRecordFrom,
  normalizeImplementation,
  runsFileFor,
} from "./model";
import { previewBenchmarkRuns, previewBenchmarkSamples, writeBenchmarkLedger } from "./persistence";
import { createBenchmarkPlan } from "./plan";

type ResumeIdentity = {
  readonly version: 2;
  readonly runId: string;
  readonly source: Omit<BenchmarkSourceMetadata, "gitDirty" | "changedPaths">;
  readonly configuration: {
    readonly region: string;
    readonly destinationPrefix: string;
    readonly assetProfiles: BenchmarkRunOptions["assetProfiles"];
    readonly lambdaConfigs: BenchmarkRunOptions["lambdaConfigs"];
    readonly implementations: BenchmarkRunOptions["implementations"];
    readonly phases: BenchmarkRunOptions["phases"];
    readonly expectedRepetitions: number;
    readonly snapshotDate: string;
    readonly decisionRunId?: string;
    readonly comparisonVariant?: string;
  };
  readonly plannedSamples: ReturnType<typeof createBenchmarkPlan>;
};

type ResumeManifest = {
  readonly identity: ResumeIdentity;
  readonly identitySha256: string;
  readonly evidenceFile: string;
  readonly initiallyDirty: boolean;
  readonly ledgerSha256: string | null;
  readonly pendingLedgerSha256?: string;
};

export type ResumeSession = {
  readonly gitDirty: boolean;
  persist(records: readonly BenchmarkSampleRecord[], cleanup?: BenchmarkCleanupStatus): void;
  close(): void;
};

export function openResumeSession(args: {
  readonly options: BenchmarkRunOptions;
  readonly sourceMetadata: BenchmarkSourceMetadata;
  readonly repositoryRoot?: string;
}): ResumeSession {
  const repositoryRoot = args.repositoryRoot ?? process.cwd();
  const manifestFile = join(args.options.scratchRoot, "benchmark-run-manifest.json");
  const evidenceFile = resolve(repositoryRoot, args.options.outputFile);
  const releaseLock = acquireResumeLocks([
    `ledger-${digest(evidenceFile)}`,
    `run-${digest(`${args.sourceMetadata.credentialAccountSha256}\0${args.options.region}`)}`,
  ]);
  let active = true;
  try {
    const evidenceRelative = normalizePath(relative(repositoryRoot, evidenceFile));
    const identity = resumeIdentity(args.options, args.sourceMetadata);
    const canonicalSampleIds = new Set(identity.plannedSamples.map((sample) => sample.sampleId));
    if (
      createBenchmarkPlan(args.options).some((sample) => !canonicalSampleIds.has(sample.sampleId))
    ) {
      throw new Error("Requested benchmark samples fall outside the canonical resume matrix.");
    }
    const identitySha256 = digest(stableJson(identity));
    const currentLedgerSha256 = fileDigest(evidenceFile);
    let manifest: ResumeManifest;

    if (existsSync(manifestFile)) {
      manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as ResumeManifest;
      if (
        manifest.identitySha256 !== identitySha256 ||
        stableJson(manifest.identity) !== stableJson(identity)
      ) {
        throw new Error(
          "Benchmark resume identity mismatch; use a new run-id and scratch directory.",
        );
      }
      if (resolve(manifest.evidenceFile) !== evidenceFile) {
        throw new Error("Benchmark resume evidence destination changed.");
      }
      if (
        currentLedgerSha256 !== manifest.ledgerSha256 &&
        currentLedgerSha256 !== manifest.pendingLedgerSha256
      ) {
        throw new Error("Benchmark evidence ledger changed outside the recorded resume session.");
      }
      if (currentLedgerSha256 === manifest.pendingLedgerSha256) {
        manifest = {
          ...manifest,
          ledgerSha256: currentLedgerSha256,
          pendingLedgerSha256: undefined,
        };
        writeManifest(manifestFile, manifest);
      }
    } else {
      if (ledgerContainsRun(evidenceFile, args.options.runId)) {
        throw new Error(
          "Benchmark rows already exist for this run-id but its resume manifest is missing.",
        );
      }
      manifest = {
        identity,
        identitySha256,
        evidenceFile,
        initiallyDirty: args.sourceMetadata.gitDirty,
        ledgerSha256: currentLedgerSha256,
      };
      writeManifest(manifestFile, manifest);
    }

    const nonLedgerChanges = args.sourceMetadata.changedPaths.filter(
      (line) => changedPathFromStatusLine(line) !== evidenceRelative,
    );
    const gitDirty = manifest.initiallyDirty || nonLedgerChanges.length > 0;

    return {
      gitDirty,
      persist(records, cleanup = "partial"): void {
        if (!active) throw new Error("Benchmark resume session is closed.");
        if (records.length === 0) return;
        if (fileDigest(evidenceFile) !== manifest.ledgerSha256) {
          throw new Error("Benchmark evidence ledger changed during the active run.");
        }
        const sampleContents = previewBenchmarkSamples(evidenceFile, records);
        const runs = buildRunRecords(args.options, identity.source, records, cleanup);
        const runsFile = runsFileFor(evidenceFile);
        const runsContents = previewBenchmarkRuns(runsFile, runs);
        const nextDigest = digest(sampleContents);
        manifest = { ...manifest, pendingLedgerSha256: nextDigest };
        writeManifest(manifestFile, manifest);
        writeBenchmarkLedger(evidenceFile, sampleContents);
        if (runs.length > 0) {
          writeBenchmarkLedger(runsFile, runsContents);
        }
        manifest = { ...manifest, ledgerSha256: nextDigest, pendingLedgerSha256: undefined };
        writeManifest(manifestFile, manifest);
      },
      close(): void {
        if (!active) return;
        active = false;
        releaseLock();
      },
    };
  } catch (error) {
    active = false;
    releaseLock();
    throw error;
  }
}

export function resumeIdentity(
  options: BenchmarkRunOptions,
  metadata: BenchmarkSourceMetadata,
): ResumeIdentity {
  const expectedRepetitions = 5;
  const canonicalOptions = { ...options, startRepetition: 1, repetitions: expectedRepetitions };
  const { gitDirty: _gitDirty, changedPaths: _changedPaths, ...source } = metadata;
  return {
    version: 2,
    runId: options.runId,
    source,
    configuration: {
      region: options.region,
      destinationPrefix: options.destinationPrefix,
      assetProfiles: options.assetProfiles,
      lambdaConfigs: options.lambdaConfigs,
      implementations: options.implementations,
      phases: options.phases,
      expectedRepetitions,
      snapshotDate: options.snapshotDate,
      decisionRunId: options.decisionRunId,
      comparisonVariant: options.comparisonVariant,
    },
    plannedSamples: createBenchmarkPlan(canonicalOptions),
  };
}

export function assertBenchmarkLedgerMatchesManifest(args: {
  readonly scratchRoot: string;
  readonly evidenceFile: string;
}): void {
  const manifestFile = join(args.scratchRoot, "benchmark-run-manifest.json");
  if (!existsSync(manifestFile)) {
    throw new Error("Canonical publication requires its external benchmark run manifest.");
  }
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as ResumeManifest;
  const evidenceFile = resolve(args.evidenceFile);
  if (resolve(manifest.evidenceFile) !== evidenceFile) {
    throw new Error("Benchmark publication evidence destination does not match its manifest.");
  }
  if (manifest.pendingLedgerSha256 !== undefined) {
    throw new Error("Benchmark publication manifest contains an incomplete ledger write.");
  }
  if (fileDigest(evidenceFile) !== manifest.ledgerSha256) {
    throw new Error("Benchmark evidence ledger changed after its recorded run session.");
  }
}

function buildRunRecords(
  options: BenchmarkRunOptions,
  source: ResumeIdentity["source"],
  records: readonly BenchmarkSampleRecord[],
  cleanup: BenchmarkCleanupStatus,
): BenchmarkRunRecord[] {
  const runs = new Map<string, BenchmarkRunRecord>();
  for (const record of records) {
    const implementation = normalizeImplementation(record.implementation);
    if (implementation === null) continue;
    const key = benchmarkRunKey({ runId: options.runId, implementation });
    if (runs.has(key)) continue;
    runs.set(
      key,
      benchmarkRunRecordFrom(runRecordSource(options, source, implementation, cleanup)),
    );
  }
  return [...runs.values()];
}

function runRecordSource(
  options: BenchmarkRunOptions,
  source: ResumeIdentity["source"],
  implementation: string,
  cleanup: BenchmarkCleanupStatus,
): BenchmarkRunRecordSource {
  const runSource: BenchmarkRunRecordSource = {
    runId: options.runId,
    implementation,
    snapshotDate: options.snapshotDate,
    region: options.region,
    cleanup,
    benchmarkConfigSha256: benchmarkConfigurationSha256(options),
    memoryMeasurementScope: "phase-local",
    nodeVersion: source.nodeVersion,
    pnpmVersion: source.pnpmVersion,
    executionEnvironmentSha256: source.executionEnvironmentSha256,
    executionEnvironmentFresh: true,
    dependencyLockSha256: source.dependencyLockSha256,
    installedDependenciesSha256: source.installedDependenciesSha256,
    applicationBuildSha256: source.applicationBuildSha256,
    sourceTreeSha256: source.sourceTreeSha256,
    gitDirty: false,
    cdkCliVersion: source.cdkCliVersion,
    cdkCliInstalledSha256: source.cdkCliInstalledSha256,
    awsCdkLibVersion: source.awsCdkLibVersion,
    awsCdkLibInstalledSha256: source.awsCdkLibInstalledSha256,
    constructsInstalledSha256: source.constructsInstalledSha256,
    ...(options.decisionRunId !== undefined ? { decisionRunId: options.decisionRunId } : {}),
    ...(options.comparisonVariant !== undefined
      ? { comparisonVariant: options.comparisonVariant }
      : {}),
    ...(implementation === "shin"
      ? {
          // The runner verifies the deployed provider against these exact values before
          // collection (see assertProviderRuntimeMetadata): arm64 bootstrap, and a code
          // SHA-256 that decodes to the provider bootstrap archive digest.
          provider: {
            implementationCommit: source.commit,
            packageVersion: source.providerPackageVersion,
            architecture: "arm64",
            runtime: "provided.al2023",
            handler: "bootstrap",
            codeSha256: Buffer.from(source.providerBootstrapArchiveSha256, "hex").toString(
              "base64",
            ),
            bootstrapSha256: source.providerBootstrapSha256,
            bootstrapArchiveSha256: source.providerBootstrapArchiveSha256,
            bootstrapProvenanceSha256: source.providerBootstrapProvenanceSha256,
            buildDirty: source.providerBootstrapBuildDirty,
            cargoVersion: source.providerBootstrapCargoVersion,
            rustcVersion: source.providerBootstrapRustcVersion,
            cargoLambdaVersion: source.providerBootstrapCargoLambdaVersion,
            zigVersion: source.providerBootstrapZigVersion,
            buildToolchainSha256: source.providerBootstrapBuildToolchainSha256,
            buildEnvironmentSha256: source.providerBootstrapBuildEnvironmentSha256,
          },
        }
      : {}),
  };
  return runSource;
}

function ledgerContainsRun(path: string, runId: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => (JSON.parse(line) as BenchmarkSampleRecord).runId === runId);
}

function writeManifest(path: string, manifest: ResumeManifest): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(temporary, path);
}

function fileDigest(path: string): string | null {
  return existsSync(path) ? digest(readFileSync(path)) : null;
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function acquireResumeLocks(names: readonly string[]): () => void {
  const root = join(tmpdir(), "shin-benchmark-locks");
  mkdirSync(root, { recursive: true });
  const releases: Array<() => void> = [];
  try {
    for (const name of [...names].sort())
      releases.push(acquireResumeLock(join(root, `${name}.json`)));
  } catch (error) {
    for (const release of releases.reverse()) release();
    throw error;
  }
  return () => {
    for (const release of releases.reverse()) release();
  };
}

function acquireResumeLock(path: string): () => void {
  const token = randomUUID();
  const writeLock = (): void =>
    writeFileSync(path, `${JSON.stringify({ pid: process.pid, token })}\n`, { flag: "wx" });
  try {
    writeLock();
  } catch (error) {
    if (!isFileExistsError(error)) throw error;
    const existing = JSON.parse(readFileSync(path, "utf8")) as { pid?: number; token?: string };
    if (typeof existing.pid !== "number" || processIsRunning(existing.pid)) {
      throw new Error(`Benchmark run lock already exists at ${path}.`);
    }
    unlinkSync(path);
    try {
      writeLock();
    } catch (retryError) {
      if (!isFileExistsError(retryError)) throw retryError;
      throw new Error(`Benchmark run lock was concurrently acquired at ${path}.`);
    }
  }
  return () => {
    if (!existsSync(path)) return;
    const lock = JSON.parse(readFileSync(path, "utf8")) as { token?: string };
    if (lock.token === token) unlinkSync(path);
  };
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ESRCH"
    );
  }
}

function isFileExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
