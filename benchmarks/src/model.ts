import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { type ProviderSummary, isObject, providerSummaryErrors } from "./provider-summary";

export const BENCHMARK_IMPLEMENTATIONS = ["shin", "aws"] as const;
export type BenchmarkImplementation = (typeof BENCHMARK_IMPLEMENTATIONS)[number];

export const BENCHMARK_ASSET_PROFILES = [
  "tiny-many",
  "mixed",
  "large-few",
  "marker-heavy",
  "multi-source-prune",
  "uncataloged",
  "copy-archives",
] as const;
export type BenchmarkAssetProfile = (typeof BENCHMARK_ASSET_PROFILES)[number];

/**
 * Whether a profile extracts its sources. `copy-archives` deploys each source archive as
 * a single copied object (`extract:false`), which is the only committed coverage of the
 * copy path and its destination `HeadObject` identity probe.
 */
export function profileExtractsSources(profile: string | null | undefined): boolean {
  return profile !== "copy-archives";
}

/**
 * Whether a profile's directory sources carry Shin's embedded catalog. `uncataloged`
 * mirrors `mixed` without one, so the untrusted comparison path stays measurable.
 */
export function profileUsesEmbeddedCatalog(profile: string | null | undefined): boolean {
  return profile !== "uncataloged";
}

export const BENCHMARK_ASSET_STATES = ["baseline", "changed", "pruned"] as const;
export type BenchmarkAssetState = (typeof BENCHMARK_ASSET_STATES)[number];

const BENCHMARK_PHASE_ORDER = [
  "cold-create",
  "unchanged-update",
  "no-change-redeploy",
  "changed-update",
  "pruned-update",
  "destroy",
] as const;

const PHASE_RANKS: ReadonlyMap<string, number> = new Map(
  BENCHMARK_PHASE_ORDER.map((phase, index) => [phase, index]),
);

export type BenchmarkCleanupStatus = "destroyed" | "partial" | "failed";

export type BenchmarkRunConfig = {
  readonly benchmarkConfigSha256?: string | null;
  readonly memoryMeasurementScope?: "phase-local" | null;
  readonly repetitionParallelism?: number | null;
};

export type BenchmarkRunEnvironment = {
  readonly nodeVersion?: string | null;
  readonly pnpmVersion?: string | null;
  readonly executionEnvironmentSha256?: string | null;
  readonly executionEnvironmentFresh?: boolean | null;
  readonly dependencyLockSha256?: string | null;
  readonly installedDependenciesSha256?: string | null;
  readonly applicationBuildSha256?: string | null;
  readonly sourceTreeSha256?: string | null;
  readonly gitDirty?: boolean | null;
};

export type BenchmarkRunCdk = {
  readonly cliVersion?: string | null;
  readonly cliInstalledSha256?: string | null;
  readonly libVersion?: string | null;
  readonly libInstalledSha256?: string | null;
  readonly constructsInstalledSha256?: string | null;
};

export type BenchmarkRunProviderBootstrap = {
  readonly sha256?: string | null;
  readonly archiveSha256?: string | null;
  readonly provenanceSha256?: string | null;
  readonly buildDirty?: boolean | null;
  readonly cargoVersion?: string | null;
  readonly rustcVersion?: string | null;
  readonly cargoLambdaVersion?: string | null;
  readonly zigVersion?: string | null;
  readonly buildToolchainSha256?: string | null;
  readonly buildEnvironmentSha256?: string | null;
};

export type BenchmarkRunProvider = {
  readonly implementationCommit?: string | null;
  readonly packageVersion?: string | null;
  readonly architecture?: string | null;
  readonly runtime?: string | null;
  readonly handler?: string | null;
  readonly codeSha256?: string | null;
  readonly bootstrap?: BenchmarkRunProviderBootstrap | null;
};

/**
 * One record per (runId x implementation) in `benchmarks/runs.jsonl`: everything
 * constant across a run's samples, grouped instead of flat. Optional fields that
 * are absent are omitted rather than written as null.
 */
export type BenchmarkRunRecord = {
  readonly runId?: string | null;
  readonly implementation?: string | null;
  readonly snapshotDate?: string | null;
  readonly region?: string | null;
  readonly cleanup?: BenchmarkCleanupStatus | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly config?: BenchmarkRunConfig | null;
  readonly environment?: BenchmarkRunEnvironment | null;
  readonly cdk?: BenchmarkRunCdk | null;
  /** Both implementations carry a provider block; AWS keeps only the five
   * measured upstream-Lambda fields (packageVersion, architecture, runtime,
   * handler, codeSha256) and omits implementationCommit and bootstrap. */
  readonly provider?: BenchmarkRunProvider | null;
};

/**
 * One record per sample in `benchmarks/results.jsonl`: only what varies between
 * samples of the same run. Optional fields that are absent are omitted rather
 * than written as null.
 */
export type BenchmarkSampleRecord = {
  readonly runId?: string | null;
  readonly sampleId?: string | null;
  readonly implementation?: string | null;
  readonly profile?: string | null;
  readonly memoryMb?: number | null;
  readonly parallel?: number | null;
  readonly assetManifestSha256?: string | null;
  readonly phase?: string;
  readonly state?: string | null;
  readonly repetition?: number | null;
  readonly fileCount?: number | null;
  readonly totalBytes?: number | null;
  readonly detailedFailureDiagnostics?: boolean | null;
  readonly sourceWindowBytes?: number | null;
  readonly cdkDeploySeconds?: number | null;
  readonly localWallSeconds?: number | null;
  readonly providerDurationSeconds?: number | null;
  readonly billedDurationSeconds?: number | null;
  readonly initDurationSeconds?: number | null;
  readonly maxMemoryMb?: number | null;
  readonly providerInvoked?: boolean | null;
  /** Shin samples only; omitted for aws. */
  readonly providerSummary?: ProviderSummary | null;
};

export type BenchmarkSampleRow = {
  readonly line: number;
  readonly record: BenchmarkSampleRecord;
};

export type BenchmarkRunRow = {
  readonly line: number;
  readonly record: BenchmarkRunRecord;
};

/** A sample joined with its run record, used by the render pipeline. */
export type BenchmarkRunSample = BenchmarkSampleRecord & {
  readonly snapshotDate?: string | null;
  readonly region?: string | null;
  readonly cleanup?: BenchmarkCleanupStatus | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly config?: BenchmarkRunConfig | null;
  readonly environment?: BenchmarkRunEnvironment | null;
  readonly cdk?: BenchmarkRunCdk | null;
  readonly provider?: BenchmarkRunProvider | null;
};

/** The run ledger file that accompanies a sample ledger file. */
export function runsFileFor(resultsFile: string): string {
  return join(dirname(resultsFile), "runs.jsonl");
}

export function readBenchmarkRunRecords(filePath: string): BenchmarkRunRecord[] {
  return readJsonlRecords<BenchmarkRunRecord>(filePath).map((row) => row.record);
}

export function readBenchmarkRunRows(filePath: string): BenchmarkRunRow[] {
  return readJsonlRecords<BenchmarkRunRecord>(filePath);
}

export function readBenchmarkSampleRecords(filePath: string): BenchmarkSampleRecord[] {
  return readJsonlRecords<BenchmarkSampleRecord>(filePath).map((row) => row.record);
}

export function readBenchmarkSampleRows(filePath: string): BenchmarkSampleRow[] {
  return readJsonlRecords<BenchmarkSampleRecord>(filePath);
}

export function readBenchmarkEvidence(resultsFile: string): {
  readonly runs: BenchmarkRunRecord[];
  readonly samples: BenchmarkSampleRecord[];
} {
  return {
    runs: readBenchmarkRunRecords(runsFileFor(resultsFile)),
    samples: readBenchmarkSampleRecords(resultsFile),
  };
}

function readJsonlRecords<T>(filePath: string): Array<{ line: number; record: T }> {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, lineNumber }) => {
      try {
        return { line: lineNumber, record: JSON.parse(line) as T };
      } catch (cause) {
        throw new Error(`Invalid JSONL record at ${filePath}:${lineNumber}`, { cause });
      }
    });
}

export function benchmarkRunKey(run: Pick<BenchmarkRunRecord, "runId" | "implementation">): string {
  return [run.runId, run.implementation].join("\u0000");
}

export function benchmarkSampleKey(
  sample: Pick<BenchmarkSampleRecord, "runId" | "sampleId" | "phase">,
): string {
  return [sample.runId, sample.sampleId, sample.phase].join("\u0000");
}

export type BenchmarkRunRecordSource = {
  readonly runId?: string | null;
  readonly implementation?: string | null;
  readonly snapshotDate?: string | null;
  readonly region?: string | null;
  readonly cleanup?: BenchmarkCleanupStatus | null;
  readonly decisionRunId?: string | null;
  readonly comparisonVariant?: string | null;
  readonly benchmarkConfigSha256?: string | null;
  readonly memoryMeasurementScope?: "phase-local" | null;
  readonly repetitionParallelism?: number | null;
  readonly nodeVersion?: string | null;
  readonly pnpmVersion?: string | null;
  readonly executionEnvironmentSha256?: string | null;
  readonly executionEnvironmentFresh?: boolean | null;
  readonly dependencyLockSha256?: string | null;
  readonly installedDependenciesSha256?: string | null;
  readonly applicationBuildSha256?: string | null;
  readonly sourceTreeSha256?: string | null;
  readonly gitDirty?: boolean | null;
  readonly cdkCliVersion?: string | null;
  readonly cdkCliInstalledSha256?: string | null;
  readonly awsCdkLibVersion?: string | null;
  readonly awsCdkLibInstalledSha256?: string | null;
  readonly constructsInstalledSha256?: string | null;
  readonly provider?: BenchmarkRunProviderSource;
};

export type BenchmarkRunProviderSource = {
  readonly implementationCommit?: string | null;
  readonly packageVersion?: string | null;
  readonly architecture?: string | null;
  readonly runtime?: string | null;
  readonly handler?: string | null;
  readonly codeSha256?: string | null;
  readonly bootstrapSha256?: string | null;
  readonly bootstrapArchiveSha256?: string | null;
  readonly bootstrapProvenanceSha256?: string | null;
  readonly buildDirty?: boolean | null;
  readonly cargoVersion?: string | null;
  readonly rustcVersion?: string | null;
  readonly cargoLambdaVersion?: string | null;
  readonly zigVersion?: string | null;
  readonly buildToolchainSha256?: string | null;
  readonly buildEnvironmentSha256?: string | null;
};

export function benchmarkRunRecordFrom(source: BenchmarkRunRecordSource): BenchmarkRunRecord {
  const bootstrapMembers = {
    sha256: source.provider?.bootstrapSha256 ?? null,
    archiveSha256: source.provider?.bootstrapArchiveSha256 ?? null,
    provenanceSha256: source.provider?.bootstrapProvenanceSha256 ?? null,
    buildDirty: source.provider?.buildDirty ?? null,
    cargoVersion: source.provider?.cargoVersion ?? null,
    rustcVersion: source.provider?.rustcVersion ?? null,
    cargoLambdaVersion: source.provider?.cargoLambdaVersion ?? null,
    zigVersion: source.provider?.zigVersion ?? null,
    buildToolchainSha256: source.provider?.buildToolchainSha256 ?? null,
    buildEnvironmentSha256: source.provider?.buildEnvironmentSha256 ?? null,
  };
  return {
    runId: source.runId ?? null,
    implementation: source.implementation ?? null,
    snapshotDate: source.snapshotDate ?? null,
    region: source.region ?? null,
    cleanup: source.cleanup ?? null,
    ...(source.decisionRunId !== undefined && source.decisionRunId !== null
      ? { decisionRunId: source.decisionRunId }
      : {}),
    ...(source.comparisonVariant !== undefined && source.comparisonVariant !== null
      ? { comparisonVariant: source.comparisonVariant }
      : {}),
    config: {
      benchmarkConfigSha256: source.benchmarkConfigSha256 ?? null,
      memoryMeasurementScope: source.memoryMeasurementScope ?? null,
      ...(source.repetitionParallelism !== undefined && source.repetitionParallelism !== null
        ? { repetitionParallelism: source.repetitionParallelism }
        : {}),
    },
    environment: {
      nodeVersion: source.nodeVersion ?? null,
      pnpmVersion: source.pnpmVersion ?? null,
      executionEnvironmentSha256: source.executionEnvironmentSha256 ?? null,
      executionEnvironmentFresh: source.executionEnvironmentFresh ?? null,
      dependencyLockSha256: source.dependencyLockSha256 ?? null,
      installedDependenciesSha256: source.installedDependenciesSha256 ?? null,
      applicationBuildSha256: source.applicationBuildSha256 ?? null,
      sourceTreeSha256: source.sourceTreeSha256 ?? null,
      gitDirty: source.gitDirty ?? null,
    },
    cdk: {
      cliVersion: source.cdkCliVersion ?? null,
      cliInstalledSha256: source.cdkCliInstalledSha256 ?? null,
      libVersion: source.awsCdkLibVersion ?? null,
      libInstalledSha256: source.awsCdkLibInstalledSha256 ?? null,
      constructsInstalledSha256: source.constructsInstalledSha256 ?? null,
    },
    ...(source.provider !== undefined && source.provider !== null
      ? {
          provider: omitNullMembers({
            implementationCommit: source.provider.implementationCommit ?? null,
            packageVersion: source.provider.packageVersion ?? null,
            architecture: source.provider.architecture ?? null,
            runtime: source.provider.runtime ?? null,
            handler: source.provider.handler ?? null,
            codeSha256: source.provider.codeSha256 ?? null,
            ...(Object.values(bootstrapMembers).some((value) => value !== null)
              ? { bootstrap: omitNullMembers(bootstrapMembers) }
              : {}),
          }),
        }
      : {}),
  };
}

/**
 * Drops null-valued members so the emitted record follows omit-when-absent.
 * AWS run records carry only the five measured provider fields; the shin-only
 * members (implementationCommit, bootstrap) stay absent instead of being
 * written as null.
 */
function omitNullMembers(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null && value !== undefined),
  );
}

/**
 * Maps the previous flat ledger cleanup wording onto the run-record cleanup enum.
 * `destroyed` means the automated runner verified every stack absent; `partial`
 * is the in-flight state; anything else is `failed`.
 */
export function cleanupStatusFrom(value: string | null | undefined): BenchmarkCleanupStatus {
  if (value === "all benchmark stacks destroyed") return "destroyed";
  if (value === "benchmark cleanup pending") return "partial";
  return "failed";
}

export function isCompleteBenchmarkRun(run: BenchmarkRunRecord): boolean {
  return run.cleanup === "destroyed";
}

export function isCanonicalBenchmarkRun(run: BenchmarkRunRecord): boolean {
  return isCompleteBenchmarkRun(run) && benchmarkRunRecordErrors(run).length === 0;
}

export function isCanonicalBenchmarkSample(sample: BenchmarkSampleRecord): boolean {
  return benchmarkSampleRecordErrors(sample).length === 0;
}

export function benchmarkRunRecordErrors(run: BenchmarkRunRecord): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexSha256 = /^[0-9a-f]{64}$/i;
  const errors: string[] = [];
  const label = `${run.runId ?? "missing-run"}/${run.implementation ?? "missing-implementation"}`;
  const runFields = new Set([
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
  for (const name of Object.keys(run)) {
    if (!runFields.has(name)) errors.push(`${label}: unexpected run field ${name}`);
  }
  if (!uuid.test(run.runId ?? "")) errors.push(`${label}: runId must be a UUID`);
  if (!isBenchmarkImplementation(run.implementation)) {
    errors.push(`${label}: unsupported implementation`);
  }
  if (!isIsoDate(run.snapshotDate ?? "")) {
    errors.push(`${label}: snapshotDate must use YYYY-MM-DD`);
  }
  if (typeof run.region !== "string" || run.region.length === 0) {
    errors.push(`${label}: missing region`);
  }
  if (run.cleanup !== "destroyed" && run.cleanup !== "partial" && run.cleanup !== "failed") {
    errors.push(`${label}: cleanup must be destroyed, partial, or failed`);
  }
  for (const name of ["decisionRunId", "comparisonVariant"] as const) {
    const value = run[name];
    if (value !== undefined && value !== null && !/^[A-Za-z0-9._-]+$/.test(value)) {
      errors.push(`${label}: invalid ${name}`);
    }
  }
  const config = run.config;
  const configFields = new Set([
    "benchmarkConfigSha256",
    "memoryMeasurementScope",
    "repetitionParallelism",
  ]);
  if (isObject(config)) {
    for (const name of Object.keys(config)) {
      if (!configFields.has(name)) errors.push(`${label}: unexpected config field ${name}`);
    }
  }
  if (!hexSha256.test(config?.benchmarkConfigSha256 ?? "")) {
    errors.push(`${label}: invalid benchmarkConfigSha256`);
  }
  if (config?.memoryMeasurementScope !== "phase-local") {
    errors.push(`${label}: memoryMeasurementScope must be phase-local`);
  }
  if (
    config?.repetitionParallelism !== undefined &&
    config.repetitionParallelism !== null &&
    (!Number.isInteger(config.repetitionParallelism) ||
      config.repetitionParallelism < 1 ||
      config.repetitionParallelism > 5)
  ) {
    errors.push(`${label}: repetitionParallelism must be an integer from 1 through 5`);
  }
  const environment = run.environment;
  const environmentFields = new Set([
    "nodeVersion",
    "pnpmVersion",
    "executionEnvironmentSha256",
    "executionEnvironmentFresh",
    "dependencyLockSha256",
    "installedDependenciesSha256",
    "applicationBuildSha256",
    "sourceTreeSha256",
    "gitDirty",
  ]);
  if (isObject(environment)) {
    for (const name of Object.keys(environment)) {
      if (!environmentFields.has(name)) {
        errors.push(`${label}: unexpected environment field ${name}`);
      }
    }
  }
  for (const name of ["nodeVersion", "pnpmVersion"] as const) {
    const value = environment?.[name];
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${label}: missing ${name}`);
    }
  }
  for (const name of [
    "executionEnvironmentSha256",
    "dependencyLockSha256",
    "installedDependenciesSha256",
    "applicationBuildSha256",
    "sourceTreeSha256",
  ] as const) {
    if (!hexSha256.test(environment?.[name] ?? "")) errors.push(`${label}: invalid ${name}`);
  }
  if (environment?.executionEnvironmentFresh !== true) {
    errors.push(`${label}: executionEnvironmentFresh must be true`);
  }
  if (environment?.gitDirty !== false) errors.push(`${label}: gitDirty must be false`);
  const cdk = run.cdk;
  const cdkFields = new Set([
    "cliVersion",
    "cliInstalledSha256",
    "libVersion",
    "libInstalledSha256",
    "constructsInstalledSha256",
  ]);
  if (isObject(cdk)) {
    for (const name of Object.keys(cdk)) {
      if (!cdkFields.has(name)) errors.push(`${label}: unexpected cdk field ${name}`);
    }
  }
  for (const name of ["cliVersion", "libVersion"] as const) {
    const value = cdk?.[name];
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${label}: missing cdk.${name}`);
    }
  }
  for (const name of [
    "cliInstalledSha256",
    "libInstalledSha256",
    "constructsInstalledSha256",
  ] as const) {
    if (!hexSha256.test(cdk?.[name] ?? "")) errors.push(`${label}: invalid cdk.${name}`);
  }
  const implementation = implementationLabel(run);
  const provider = run.provider;
  if (implementation === "aws") {
    if (provider === undefined || provider === null) {
      errors.push(`${label}: provider is required for AWS`);
    } else {
      const awsProviderFields = new Set([
        "packageVersion",
        "architecture",
        "runtime",
        "handler",
        "codeSha256",
      ]);
      for (const name of Object.keys(provider)) {
        if (!awsProviderFields.has(name)) {
          errors.push(`${label}: unexpected AWS provider field ${name}`);
        }
      }
      if (typeof provider.packageVersion !== "string" || provider.packageVersion.length === 0) {
        errors.push(`${label}: missing provider.packageVersion`);
      }
      if (provider.packageVersion !== cdk?.libVersion) {
        errors.push(`${label}: AWS provider package version must match cdk.libVersion`);
      }
      if (provider.architecture !== "x86_64") {
        errors.push(`${label}: AWS provider.architecture must be x86_64`);
      }
      if (provider.runtime !== "python3.13") {
        errors.push(`${label}: AWS provider.runtime must be python3.13`);
      }
      if (provider.handler !== "index.handler") {
        errors.push(`${label}: AWS provider.handler must be index.handler`);
      }
      if (!isBase64Sha256(provider.codeSha256)) {
        errors.push(`${label}: invalid provider.codeSha256`);
      }
    }
  } else if (implementation === "shin") {
    if (provider === undefined || provider === null) {
      errors.push(`${label}: provider is required for Shin`);
    } else {
      const shinProviderFields = new Set([
        "implementationCommit",
        "packageVersion",
        "architecture",
        "runtime",
        "handler",
        "codeSha256",
        "bootstrap",
      ]);
      for (const name of Object.keys(provider)) {
        if (!shinProviderFields.has(name)) {
          errors.push(`${label}: unexpected Shin provider field ${name}`);
        }
      }
      if (!/^[0-9a-f]{40}$/i.test(provider.implementationCommit ?? "")) {
        errors.push(`${label}: invalid provider.implementationCommit`);
      }
      if (typeof provider.packageVersion !== "string" || provider.packageVersion.length === 0) {
        errors.push(`${label}: missing provider.packageVersion`);
      }
      if (provider.architecture !== "arm64") {
        errors.push(`${label}: Shin provider.architecture must be arm64`);
      }
      if (provider.runtime !== "provided.al2023") {
        errors.push(`${label}: Shin provider.runtime must be provided.al2023`);
      }
      if (provider.handler !== "bootstrap") {
        errors.push(`${label}: Shin provider.handler must be bootstrap`);
      }
      if (!isBase64Sha256(provider.codeSha256)) {
        errors.push(`${label}: invalid provider.codeSha256`);
      }
      const bootstrap = provider.bootstrap;
      const bootstrapFields = new Set([
        "sha256",
        "archiveSha256",
        "provenanceSha256",
        "buildDirty",
        "cargoVersion",
        "rustcVersion",
        "cargoLambdaVersion",
        "zigVersion",
        "buildToolchainSha256",
        "buildEnvironmentSha256",
      ]);
      if (isObject(bootstrap)) {
        for (const name of Object.keys(bootstrap)) {
          if (!bootstrapFields.has(name)) {
            errors.push(`${label}: unexpected provider.bootstrap field ${name}`);
          }
        }
      }
      for (const name of [
        "sha256",
        "archiveSha256",
        "provenanceSha256",
        "buildToolchainSha256",
        "buildEnvironmentSha256",
      ] as const) {
        if (!hexSha256.test(bootstrap?.[name] ?? "")) {
          errors.push(`${label}: invalid provider.bootstrap.${name}`);
        }
      }
      if (bootstrap?.buildDirty !== false) {
        errors.push(`${label}: provider.bootstrap.buildDirty must be false`);
      }
      for (const name of [
        "cargoVersion",
        "rustcVersion",
        "cargoLambdaVersion",
        "zigVersion",
      ] as const) {
        const value = bootstrap?.[name];
        if (typeof value !== "string" || value.length === 0) {
          errors.push(`${label}: missing provider.bootstrap.${name}`);
        }
      }
      if (
        isBase64Sha256(provider.codeSha256) &&
        bootstrap?.archiveSha256 !== undefined &&
        Buffer.from(provider.codeSha256, "base64").toString("hex") !== bootstrap.archiveSha256
      ) {
        errors.push(`${label}: deployed Shin code does not match provider bootstrap archive`);
      }
    }
  } else {
    errors.push(`${label}: unsupported implementation`);
  }
  return errors;
}

export function benchmarkSampleRecordErrors(sample: BenchmarkSampleRecord): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const hexSha256 = /^[0-9a-f]{64}$/i;
  const errors: string[] = [];
  const label = `${sample.sampleId ?? "missing-sample"}/${sample.phase ?? "missing-phase"}`;
  const sampleFields = new Set([
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
  for (const name of Object.keys(sample)) {
    if (!sampleFields.has(name)) errors.push(`${label}: unexpected sample field ${name}`);
  }
  if (!uuid.test(sample.runId ?? "")) errors.push(`${label}: runId must be a UUID`);
  if (!uuid.test(sample.sampleId ?? "")) errors.push(`${label}: sampleId must be an opaque UUID`);
  for (const name of ["implementation", "profile", "phase", "state"] as const) {
    if (typeof sample[name] !== "string" || (sample[name] as string).length === 0) {
      errors.push(`${label}: missing ${name}`);
    }
  }
  if (!hexSha256.test(sample.assetManifestSha256 ?? "")) {
    errors.push(`${label}: invalid assetManifestSha256`);
  }
  for (const name of [
    "repetition",
    "memoryMb",
    "fileCount",
    "totalBytes",
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "maxMemoryMb",
  ] as const) {
    if (typeof sample[name] !== "number" || !Number.isFinite(sample[name])) {
      errors.push(`${label}: missing ${name}`);
    }
  }
  // Lambda emits Init Duration only on a cold start, so an update phase that
  // reused a warm container legitimately has none. The collector still requires
  // it for the cold-start phase, where its absence would mean the measurement
  // did not start from a cold function.
  if (
    sample.initDurationSeconds !== null &&
    sample.initDurationSeconds !== undefined &&
    (typeof sample.initDurationSeconds !== "number" || !Number.isFinite(sample.initDurationSeconds))
  ) {
    errors.push(`${label}: invalid initDurationSeconds`);
  }
  for (const name of [
    "repetition",
    "memoryMb",
    "fileCount",
    "totalBytes",
    "maxMemoryMb",
  ] as const) {
    const value = sample[name];
    if (typeof value === "number" && (!Number.isInteger(value) || value < 0)) {
      errors.push(`${label}: ${name} must be a non-negative integer`);
    }
  }
  for (const name of [
    "cdkDeploySeconds",
    "localWallSeconds",
    "providerDurationSeconds",
    "billedDurationSeconds",
    "initDurationSeconds",
  ] as const) {
    const value = sample[name];
    if (typeof value === "number" && value < 0) {
      errors.push(`${label}: ${name} must not be negative`);
    }
  }
  if ((sample.memoryMb ?? 0) <= 0) errors.push(`${label}: memoryMb must be positive`);
  if ((sample.fileCount ?? 0) <= 0) errors.push(`${label}: fileCount must be positive`);
  if ((sample.totalBytes ?? 0) <= 0) errors.push(`${label}: totalBytes must be positive`);
  if ((sample.repetition ?? 0) < 1 || (sample.repetition ?? 0) > 5) {
    errors.push(`${label}: repetition must be between 1 and 5`);
  }
  if ((sample.maxMemoryMb ?? Number.POSITIVE_INFINITY) > (sample.memoryMb ?? 0)) {
    errors.push(`${label}: maxMemoryMb exceeds configured memoryMb`);
  }
  if (
    sample.sourceWindowBytes === null ||
    (sample.sourceWindowBytes !== undefined &&
      (!Number.isInteger(sample.sourceWindowBytes) || sample.sourceWindowBytes <= 0))
  ) {
    errors.push(`${label}: sourceWindowBytes must be omitted or a positive integer`);
  }
  if (sample.providerInvoked !== true) errors.push(`${label}: providerInvoked must be true`);
  const implementation = implementationLabel(sample);
  if (implementation === "aws") {
    for (const name of ["parallel", "detailedFailureDiagnostics", "providerSummary"] as const) {
      if (Object.hasOwn(sample, name)) errors.push(`${label}: AWS ${name} must be omitted`);
    }
  } else if (implementation === "shin") {
    if (
      typeof sample.parallel !== "number" ||
      !Number.isInteger(sample.parallel) ||
      (sample.parallel ?? 0) <= 0
    ) {
      errors.push(`${label}: Shin parallel must be a positive integer`);
    }
    if (sample.detailedFailureDiagnostics !== true) {
      errors.push(`${label}: Shin detailedFailureDiagnostics must be true`);
    }
    if (sample.providerSummary === undefined || sample.providerSummary === null) {
      errors.push(`${label}: providerSummary is required for Shin`);
    } else {
      errors.push(
        ...providerSummaryErrors(sample.providerSummary).map((error) => `${label}: ${error}`),
      );
      const expectedExtract = profileExtractsSources(sample.profile);
      if (sample.providerSummary.extract !== expectedExtract) {
        errors.push(`${label}: summary extract must be ${expectedExtract} for this profile`);
      }
    }
  } else {
    errors.push(`${label}: unsupported implementation`);
  }
  return errors;
}

/**
 * Validates both ledgers together: every record against its shape, plus the
 * referential checks that bind samples to runs -- every sample's runId (and
 * implementation) must exist in `runs.jsonl`, run and sample identities must
 * be unique, and a run must be cleanup-complete unless pending is allowed.
 */
export function benchmarkEvidenceErrors(
  evidence: {
    readonly runs: readonly BenchmarkRunRecord[];
    readonly samples: readonly BenchmarkSampleRecord[];
  },
  options: { readonly allowPendingCleanup?: boolean } = {},
): string[] {
  const errors: string[] = [];
  for (const run of evidence.runs) errors.push(...benchmarkRunRecordErrors(run));
  for (const sample of evidence.samples) errors.push(...benchmarkSampleRecordErrors(sample));
  const runsByKey = new Map<string, BenchmarkRunRecord>();
  for (const run of evidence.runs) {
    const key = benchmarkRunKey(run);
    if (runsByKey.has(key)) {
      errors.push(`duplicate run record ${run.runId}/${run.implementation}`);
    } else {
      runsByKey.set(key, run);
    }
  }
  for (const run of evidence.runs) {
    if (
      !isCompleteBenchmarkRun(run) &&
      !(options.allowPendingCleanup === true && run.cleanup === "partial")
    ) {
      errors.push(`${run.runId}/${run.implementation}: cleanup is incomplete`);
    }
  }
  const sampleKeys = new Set<string>();
  for (const sample of evidence.samples) {
    const run = runsByKey.get(benchmarkRunKey(sample));
    if (run === undefined) {
      errors.push(
        `${sample.sampleId ?? "missing-sample"}/${sample.phase ?? "missing-phase"}: runId ${sample.runId ?? "missing"} has no run record`,
      );
    }
    const key = benchmarkSampleKey(sample);
    if (sampleKeys.has(key)) {
      errors.push(`duplicate sample ${sample.sampleId}/${sample.phase}`);
    }
    sampleKeys.add(key);
  }
  return errors;
}

/**
 * Joins samples with their run records for rendering. Fails loudly when a sample
 * references a runId with no run record.
 */
export function joinBenchmarkSamples(
  runs: readonly BenchmarkRunRecord[],
  samples: readonly BenchmarkSampleRecord[],
): BenchmarkRunSample[] {
  const runsByKey = new Map(runs.map((run) => [benchmarkRunKey(run), run]));
  return samples.map((sample) => {
    const run = runsByKey.get(benchmarkRunKey(sample));
    if (run === undefined) {
      throw new Error(
        `Sample ${sample.sampleId ?? "missing"}/${sample.phase ?? "missing"} references runId ${sample.runId ?? "missing"} with no run record.`,
      );
    }
    return {
      ...sample,
      snapshotDate: run.snapshotDate,
      region: run.region,
      cleanup: run.cleanup,
      decisionRunId: run.decisionRunId ?? null,
      comparisonVariant: run.comparisonVariant ?? null,
      config: run.config,
      environment: run.environment,
      cdk: run.cdk,
      provider: run.provider ?? null,
    };
  });
}

export function selectBenchmarkRuns(
  runs: readonly BenchmarkRunRecord[],
  requestedRunId?: string,
): BenchmarkRunRecord[] {
  const runId = requestedRunId ?? [...runs].reverse().find((run) => run.runId)?.runId ?? undefined;
  return runId === undefined || runId === null
    ? [...runs]
    : runs.filter((run) => run.runId === runId);
}

export function selectBenchmarkSamples(
  samples: readonly BenchmarkSampleRecord[],
  requestedRunId?: string,
): BenchmarkSampleRecord[] {
  const runId =
    requestedRunId ?? [...samples].reverse().find((sample) => sample.runId)?.runId ?? undefined;
  return runId === undefined || runId === null
    ? [...samples]
    : samples.filter((sample) => sample.runId === runId);
}

export function benchmarkEvidenceSanitizationErrors(
  run: BenchmarkRunRecord,
  sample: BenchmarkSampleRecord,
  forbiddenValues: readonly string[] = [],
): string[] {
  const errors: string[] = [];
  const serialized = JSON.stringify({ run, sample });
  const sensitiveText = JSON.stringify([
    run.provider?.packageVersion,
    run.provider?.runtime,
    run.provider?.handler,
    run.cdk?.cliVersion,
    run.cdk?.libVersion,
    run.region,
    run.cleanup,
    run.decisionRunId,
    run.comparisonVariant,
    sample.profile,
    sample.phase,
    sample.state,
  ]);
  if (/arn:aws(?:-[a-z0-9-]+)?:/i.test(serialized)) errors.push("record contains an ARN");
  if (/\b(?:request[ -]?id|etag)\b\s*(?::|=|\s)/i.test(sensitiveText))
    errors.push("record contains a request ID or ETag label");
  if (/(?<!\d)\d{12}(?!\d)/.test(sensitiveText)) errors.push("record contains an AWS account ID");
  if (
    /\b(?:bucket|distribution|physical(?:resource)?)[ -]?(?:name|id)\b\s*(?::|=)/i.test(
      sensitiveText,
    )
  ) {
    errors.push("record contains a labeled AWS resource identifier");
  }
  for (const forbidden of forbiddenValues.filter(Boolean)) {
    if (serialized.includes(forbidden)) errors.push("record contains a forbidden local value");
  }
  return [...new Set(errors)];
}

export function phaseRank(phase: string | null | undefined): number {
  return PHASE_RANKS.get(phase ?? "") ?? Number.MAX_SAFE_INTEGER;
}

export function implementationLabel(
  record: Pick<BenchmarkRunRecord | BenchmarkSampleRecord, "implementation">,
): string {
  return normalizeImplementation(record.implementation) ?? "unknown";
}

export function normalizeImplementation(value: string | null | undefined): string | null {
  return value ?? null;
}

export function isBenchmarkImplementation(
  value: string | null | undefined,
): value is BenchmarkImplementation {
  return includesString(BENCHMARK_IMPLEMENTATIONS, value);
}

export function isBenchmarkAssetProfile(
  value: string | null | undefined,
): value is BenchmarkAssetProfile {
  return includesString(BENCHMARK_ASSET_PROFILES, value);
}

export function isBenchmarkAssetState(
  value: string | null | undefined,
): value is BenchmarkAssetState {
  return includesString(BENCHMARK_ASSET_STATES, value);
}

function includesString<T extends string>(
  values: readonly T[],
  value: string | null | undefined,
): value is T {
  return value !== undefined && value !== null && values.includes(value as T);
}

function isBase64Sha256(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  const bytes = Buffer.from(value, "base64");
  return bytes.length === 32 && bytes.toString("base64") === value;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
