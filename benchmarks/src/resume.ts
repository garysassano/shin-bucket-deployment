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
import { type BenchmarkSourceMetadata, changedPathFromStatusLine } from "./metadata";
import type { BenchmarkResultRecord } from "./model";
import { previewBenchmarkRecords, writeBenchmarkLedger } from "./persistence";
import { createBenchmarkPlan } from "./plan";

type ResumeIdentity = {
  readonly version: 2;
  readonly runId: string;
  readonly source: Omit<BenchmarkSourceMetadata, "gitDirty" | "changedPaths">;
  readonly configuration: {
    readonly methodologyVersion: 1 | 2;
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
  persist(records: readonly BenchmarkResultRecord[]): void;
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
      persist(records): void {
        if (!active) throw new Error("Benchmark resume session is closed.");
        if (records.length === 0) return;
        if (fileDigest(evidenceFile) !== manifest.ledgerSha256) {
          throw new Error("Benchmark evidence ledger changed during the active run.");
        }
        const contents = previewBenchmarkRecords(evidenceFile, records);
        const nextDigest = digest(contents);
        manifest = { ...manifest, pendingLedgerSha256: nextDigest };
        writeManifest(manifestFile, manifest);
        writeBenchmarkLedger(evidenceFile, contents);
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
  const expectedRepetitions = options.methodologyVersion === 2 ? 5 : options.repetitions;
  const canonicalOptions = { ...options, startRepetition: 1, repetitions: expectedRepetitions };
  const { gitDirty: _gitDirty, changedPaths: _changedPaths, ...source } = metadata;
  return {
    version: 2,
    runId: options.runId,
    source,
    configuration: {
      methodologyVersion: options.methodologyVersion,
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
    throw new Error("Methodology-v2 publication requires its external benchmark run manifest.");
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

function ledgerContainsRun(path: string, runId: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => (JSON.parse(line) as BenchmarkResultRecord).runId === runId);
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
