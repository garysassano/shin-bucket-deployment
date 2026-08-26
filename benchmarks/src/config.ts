import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { parseCliOptions } from "./cli";
import {
  BENCHMARK_ASSET_PROFILES,
  BENCHMARK_ASSET_STATES,
  BENCHMARK_IMPLEMENTATIONS,
  type BenchmarkAssetProfile,
  type BenchmarkAssetState,
  type BenchmarkImplementation,
  isBenchmarkAssetProfile,
  isBenchmarkImplementation,
} from "./model";

export type LambdaConfig = {
  readonly memoryMb: number;
  readonly parallel: number;
  readonly sourceWindowBytes?: number | null;
};
export type PhaseConfig = {
  readonly assetState: BenchmarkAssetState;
  readonly cloudfrontWait: boolean;
  readonly name: string;
  readonly deleteStaleObjects: boolean;
  readonly deleteCurrentObjectsOnDelete?: boolean;
};
export type BenchmarkRunOptions = {
  readonly runId: string;
  readonly repetitions: number;
  readonly startRepetition: number;
  readonly maxWallClockMinutes?: number;
  readonly approvedThroughRepetition: number;
  readonly preserveOnFailure: boolean;
  readonly detailedFailureDiagnostics: boolean;
  readonly assetProfiles: BenchmarkAssetProfile[];
  readonly lambdaConfigs: LambdaConfig[];
  readonly implementations: BenchmarkImplementation[];
  readonly region: string;
  readonly outputFile: string;
  readonly scratchRoot: string;
  readonly runToken: string;
  readonly snapshotDate: string;
  readonly concurrency: number;
  readonly repetitionParallelism: number;
  readonly destinationPrefix: string;
  readonly phases: PhaseConfig[];
  readonly decisionRunId?: string;
  readonly comparisonVariant?: string;
};

export const MAX_BENCHMARK_CONCURRENCY = 4;

const positiveIntegerSchema = z.number().int().min(1);
const nonEmptyStringSchema = z.string().min(1);
const uuidSchema = z.string().uuid();
const snapshotDateSchema = z.iso.date();
const evidenceLabelSchema = z.string().regex(/^[A-Za-z0-9._-]+$/);
const phaseSchema = z
  .object({
    assetState: z.enum(BENCHMARK_ASSET_STATES),
    cloudfrontWait: z.boolean().optional(),
    name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    deleteStaleObjects: z.boolean().optional(),
    deleteCurrentObjectsOnDelete: z.boolean().optional(),
  })
  .strict();
export const benchmarkConfigSchema = z
  .object({
    $schema: nonEmptyStringSchema.optional(),
    runId: uuidSchema.optional(),
    repetitions: positiveIntegerSchema.optional(),
    startRepetition: positiveIntegerSchema.optional(),
    maxWallClockMinutes: z.number().positive().optional(),
    preserveOnFailure: z.boolean().optional(),
    detailedFailureDiagnostics: z.boolean().optional(),
    runToken: nonEmptyStringSchema.optional(),
    snapshotDate: snapshotDateSchema.optional(),
    region: nonEmptyStringSchema.optional(),
    outputFile: nonEmptyStringSchema.optional(),
    scratchRoot: nonEmptyStringSchema.optional(),
    concurrency: positiveIntegerSchema.max(MAX_BENCHMARK_CONCURRENCY).optional(),
    repetitionParallelism: positiveIntegerSchema.max(5).optional(),
    destinationPrefix: nonEmptyStringSchema.optional(),
    assetProfiles: z.array(z.enum(BENCHMARK_ASSET_PROFILES)).nonempty().optional(),
    lambdaConfigs: z
      .array(
        z
          .object({
            memoryMb: positiveIntegerSchema,
            parallel: positiveIntegerSchema,
            sourceWindowBytes: positiveIntegerSchema.nullable().optional(),
          })
          .strict(),
      )
      .nonempty()
      .optional(),
    implementations: z.array(z.enum(BENCHMARK_IMPLEMENTATIONS)).nonempty().optional(),
    phases: z.array(phaseSchema).nonempty().optional(),
    decisionRunId: evidenceLabelSchema.optional(),
    comparisonVariant: evidenceLabelSchema.optional(),
  })
  .strict()
  .meta({ title: "ShinBucketDeployment Asset Benchmark Config" });

type ConfigInput = z.infer<typeof benchmarkConfigSchema>;

const CLI_OPTIONS = [
  "config",
  "run-id",
  "repetitions",
  "start-repetition",
  "max-wall-clock-minutes",
  "approved-through-repetition",
  "preserve-on-failure",
  "detailed-failure-diagnostics",
  "asset-profiles",
  "lambda-configs",
  "implementations",
  "region",
  "output-file",
  "run-token",
  "snapshot-date",
  "scratch-root",
  "concurrency",
  "repetition-parallelism",
  "destination-prefix",
  "decision-run-id",
  "comparison-variant",
] as const;

export function parseBenchmarkRunOptions(args: string[]): BenchmarkRunOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);
  const config = readConfig(values.get("config"));
  const assetProfiles = values.has("asset-profiles")
    ? listValue(required(values, "asset-profiles")).map(parseAssetProfile)
    : (config.assetProfiles ?? ["tiny-many"]);
  const lambdaConfigs = values.has("lambda-configs")
    ? listValue(required(values, "lambda-configs")).map(parseLambdaConfig)
    : (config.lambdaConfigs ?? [{ memoryMb: 1024, parallel: 32 }]);
  const implementations = values.has("implementations")
    ? listValue(required(values, "implementations")).map(parseImplementation)
    : (config.implementations ?? ["shin", "aws"]);
  const snapshotDate = values.get("snapshot-date") ?? config.snapshotDate ?? today();
  if (!snapshotDateSchema.safeParse(snapshotDate).success) {
    throw new Error("snapshot-date must use YYYY-MM-DD.");
  }
  const runId = values.get("run-id") ?? config.runId ?? randomUUID();
  if (!uuidSchema.safeParse(runId).success) {
    throw new Error("run-id must be a UUID.");
  }
  const configuredRunToken = values.get("run-token") ?? config.runToken;
  if (configuredRunToken !== undefined && configuredRunToken !== runId) {
    throw new Error("run-token must be identical to the opaque run-id.");
  }
  const runToken = configuredRunToken ?? runId;
  const concurrency = positiveInteger(
    values.get("concurrency") ?? String(config.concurrency ?? 1),
    "concurrency",
  );
  // Concurrency groups independent memory configurations; phases within a configuration
  // stay ordered because each mutates the same stack. It is part of the configuration
  // digest, so runs at different concurrency are never pooled as the same configuration.
  if (concurrency > MAX_BENCHMARK_CONCURRENCY) {
    throw new Error(
      `concurrency must not exceed ${MAX_BENCHMARK_CONCURRENCY}; each unit deploys its own stack.`,
    );
  }
  const repetitionParallelism = positiveInteger(
    values.get("repetition-parallelism") ?? String(config.repetitionParallelism ?? 1),
    "repetition-parallelism",
  );
  if (repetitionParallelism > 5) {
    throw new Error("repetition-parallelism must not exceed the five canonical repetitions.");
  }
  const repetitions = positiveInteger(
    values.get("repetitions") ?? String(config.repetitions ?? 5),
    "repetitions",
  );
  const startRepetition = positiveInteger(
    values.get("start-repetition") ?? String(config.startRepetition ?? 1),
    "start-repetition",
  );
  const maxWallClockMinutes = optionalPositiveNumber(
    values.get("max-wall-clock-minutes") ?? config.maxWallClockMinutes,
    "max-wall-clock-minutes",
  );
  const approvedThroughRepetition = positiveInteger(
    values.get("approved-through-repetition") ?? "1",
    "approved-through-repetition",
  );
  const preserveOnFailure = booleanValue(
    values.get("preserve-on-failure") ?? config.preserveOnFailure ?? false,
    "preserve-on-failure",
  );
  const detailedFailureDiagnostics = booleanValue(
    values.get("detailed-failure-diagnostics") ?? config.detailedFailureDiagnostics ?? true,
    "detailed-failure-diagnostics",
  );
  if (!detailedFailureDiagnostics) {
    throw new Error("Benchmarks require detailed failure diagnostics; they cannot be disabled.");
  }
  const scratchRoot = resolve(
    values.get("scratch-root") ??
      config.scratchRoot ??
      join(tmpdir(), "shin-benchmark-runs", runToken),
  );
  const scratchRelative = relative(process.cwd(), scratchRoot);
  if (
    scratchRelative === "" ||
    (!scratchRelative.startsWith("..") && !isAbsolute(scratchRelative))
  ) {
    throw new Error("Benchmark scratchRoot must be outside the repository.");
  }
  const phases = (config.phases ?? defaultPhases()).map(normalizePhase);
  if (new Set(phases.map((phase) => phase.name)).size !== phases.length) {
    throw new Error("Benchmark phase names must be unique.");
  }
  const decisionRunId = values.get("decision-run-id") ?? config.decisionRunId;
  const comparisonVariant = values.get("comparison-variant") ?? config.comparisonVariant;
  if (decisionRunId !== undefined && !evidenceLabelSchema.safeParse(decisionRunId).success) {
    throw new Error("decision-run-id contains unsupported characters.");
  }
  if (
    comparisonVariant !== undefined &&
    !evidenceLabelSchema.safeParse(comparisonVariant).success
  ) {
    throw new Error("comparison-variant contains unsupported characters.");
  }
  return {
    runId,
    repetitions,
    startRepetition,
    maxWallClockMinutes,
    approvedThroughRepetition,
    preserveOnFailure,
    detailedFailureDiagnostics,
    assetProfiles,
    lambdaConfigs,
    implementations,
    region: values.get("region") ?? config.region ?? process.env.AWS_REGION ?? "eu-central-1",
    outputFile: values.get("output-file") ?? config.outputFile ?? "benchmarks/results.jsonl",
    scratchRoot,
    runToken,
    snapshotDate,
    concurrency,
    repetitionParallelism,
    destinationPrefix:
      values.get("destination-prefix") ?? config.destinationPrefix ?? "benchmark-site",
    phases,
    decisionRunId,
    comparisonVariant,
  };
}

export function assertBenchmarkExecutionAuthorized(options: BenchmarkRunOptions): void {
  if (options.maxWallClockMinutes === undefined) {
    throw new Error("AWS benchmark execution requires an explicit wall-clock cap.");
  }
  const lastRepetition = options.startRepetition + options.repetitions - 1;
  if (lastRepetition > 5 || lastRepetition > options.approvedThroughRepetition) {
    throw new Error("Requested repetitions exceed the explicitly approved range.");
  }
  if (options.repetitions !== 1) {
    throw new Error("Each benchmark runner invocation must execute exactly one repetition shard.");
  }
}

export function benchmarkConfigurationSha256(options: BenchmarkRunOptions): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        // Pinned literal: this digest is the committed `benchmarkConfigSha256` identity of
        // existing rows. Removing the field would silently re-key every retained row.
        methodologyVersion: 2,
        expectedRepetitions: 5,
        concurrency: options.concurrency,
        ...(options.repetitionParallelism === 1
          ? {}
          : { repetitionParallelism: options.repetitionParallelism }),
        region: options.region,
        destinationPrefix: options.destinationPrefix,
        assetProfiles: options.assetProfiles,
        lambdaConfigs: options.lambdaConfigs,
        implementations: options.implementations,
        detailedFailureDiagnostics: options.detailedFailureDiagnostics,
        phases: options.phases,
        decisionRunId: options.decisionRunId ?? null,
        comparisonVariant: options.comparisonVariant ?? null,
      }),
    )
    .digest("hex");
}

function readConfig(path: string | undefined): ConfigInput {
  if (!path) return {};
  return benchmarkConfigSchema.parse(JSON.parse(readFileSync(resolve(path), "utf8")));
}

function defaultPhases(): NonNullable<ConfigInput["phases"]> {
  return [
    { name: "cold-create", assetState: "baseline" },
    { name: "unchanged-update", assetState: "baseline", deleteCurrentObjectsOnDelete: false },
    { name: "changed-update", assetState: "changed" },
    { name: "pruned-update", assetState: "pruned" },
  ];
}

function normalizePhase(phase: NonNullable<ConfigInput["phases"]>[number]): PhaseConfig {
  return {
    name: phase.name,
    assetState: phase.assetState,
    cloudfrontWait: phase.cloudfrontWait ?? false,
    deleteStaleObjects: phase.deleteStaleObjects ?? true,
    deleteCurrentObjectsOnDelete: phase.deleteCurrentObjectsOnDelete,
  };
}

function listValue(value: string): string[] {
  const values = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (values.length === 0) usage();
  return values;
}
function required(values: ReadonlyMap<string, string>, name: string): string {
  return values.get(name) ?? usage();
}
function parseLambdaConfig(value: string): LambdaConfig {
  const parts = value.split(":");
  if (parts.length !== 2) usage();
  return {
    memoryMb: positiveInteger(parts[0] ?? "", "memory"),
    parallel: positiveInteger(parts[1] ?? "", "parallel"),
  };
}
function parseImplementation(value: string): BenchmarkImplementation {
  return isBenchmarkImplementation(value) ? value : usage();
}
function parseAssetProfile(value: string): BenchmarkAssetProfile {
  return isBenchmarkAssetProfile(value) ? value : usage();
}
function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
function optionalPositiveNumber(
  value: string | number | undefined,
  name: string,
): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be positive.`);
  return parsed;
}
function booleanValue(value: string | boolean, name: string): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`${name} must be true or false.`);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function usage(): never {
  throw new Error(
    "Usage: benchmark:run-assets --config <file> [--run-id <uuid>] --repetitions 1 [--start-repetition <1-5>] [--approved-through-repetition <n>] [--max-wall-clock-minutes <minutes>] [--preserve-on-failure true|false] [--detailed-failure-diagnostics true|false] [--concurrency <1-4>] [--repetition-parallelism <1-5>]",
  );
}
