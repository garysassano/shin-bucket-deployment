import { randomUUID } from "node:crypto";
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

export type LambdaConfig = { readonly memoryMb: number; readonly parallel: number };
export type PhaseConfig = {
  readonly assetState: BenchmarkAssetState;
  readonly cloudfrontWait: boolean;
  readonly name: string;
  readonly deleteStaleObjects: boolean;
  readonly deleteCurrentObjectsOnDelete?: boolean;
};
export type BenchmarkRunOptions = {
  readonly methodologyVersion: 1 | 2;
  readonly runId: string;
  readonly repetitions: number;
  readonly startRepetition: number;
  readonly maxWallClockMinutes?: number;
  readonly assetProfiles: BenchmarkAssetProfile[];
  readonly lambdaConfigs: LambdaConfig[];
  readonly implementations: BenchmarkImplementation[];
  readonly region: string;
  readonly outputFile: string;
  readonly scratchRoot: string;
  readonly runToken: string;
  readonly snapshotDate: string;
  readonly concurrency: 1;
  readonly destinationPrefix: string;
  readonly phases: PhaseConfig[];
  readonly decisionRunId?: string;
  readonly comparisonVariant?: string;
};

const positiveIntegerSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().min(1);
const uuidSchema = z.string().uuid();
const phaseSchema = z.object({
  assetState: z.enum(BENCHMARK_ASSET_STATES),
  cloudfrontWait: z.boolean().optional(),
  name: nonEmptyStringSchema,
  deleteStaleObjects: z.boolean().optional(),
  deleteCurrentObjectsOnDelete: z.boolean().optional(),
});
export const benchmarkConfigSchema = z
  .object({
    $schema: nonEmptyStringSchema.optional(),
    methodologyVersion: z.union([z.literal(1), z.literal(2)]).optional(),
    runId: uuidSchema.optional(),
    repetitions: positiveIntegerSchema.optional(),
    startRepetition: positiveIntegerSchema.optional(),
    maxWallClockMinutes: z.number().positive().optional(),
    runToken: nonEmptyStringSchema.optional(),
    snapshotDate: nonEmptyStringSchema.optional(),
    region: nonEmptyStringSchema.optional(),
    outputFile: nonEmptyStringSchema.optional(),
    scratchRoot: nonEmptyStringSchema.optional(),
    concurrency: positiveIntegerSchema.optional(),
    destinationPrefix: nonEmptyStringSchema.optional(),
    assetProfiles: z.array(z.enum(BENCHMARK_ASSET_PROFILES)).nonempty().optional(),
    lambdaConfigs: z
      .array(z.object({ memoryMb: positiveIntegerSchema, parallel: positiveIntegerSchema }))
      .nonempty()
      .optional(),
    implementations: z.array(z.enum(BENCHMARK_IMPLEMENTATIONS)).nonempty().optional(),
    phases: z.array(phaseSchema).nonempty().optional(),
    decisionRunId: nonEmptyStringSchema.optional(),
    comparisonVariant: nonEmptyStringSchema.optional(),
  })
  .strict();

type ConfigInput = z.infer<typeof benchmarkConfigSchema>;

const CLI_OPTIONS = [
  "config",
  "methodology-version",
  "run-id",
  "repetitions",
  "start-repetition",
  "max-wall-clock-minutes",
  "asset-profiles",
  "lambda-configs",
  "implementations",
  "region",
  "output-file",
  "run-token",
  "snapshot-date",
  "scratch-root",
  "concurrency",
  "destination-prefix",
  "decision-run-id",
  "comparison-variant",
] as const;

export function parseBenchmarkRunOptions(args: string[]): BenchmarkRunOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);
  const config = readConfig(values.get("config"));
  const methodologyVersion = parseMethodologyVersion(
    values.get("methodology-version") ?? String(config.methodologyVersion ?? 2),
  );
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
  const runId = values.get("run-id") ?? config.runId ?? randomUUID();
  if (!uuidSchema.safeParse(runId).success) {
    throw new Error("run-id must be a UUID.");
  }
  const configuredRunToken = values.get("run-token") ?? config.runToken;
  if (
    methodologyVersion === 2 &&
    configuredRunToken !== undefined &&
    configuredRunToken !== runId
  ) {
    throw new Error("methodology-v2 run-token must be identical to the opaque run-id.");
  }
  const runToken = configuredRunToken ?? runId;
  const concurrency = positiveInteger(
    values.get("concurrency") ?? String(config.concurrency ?? 1),
    "concurrency",
  );
  if (concurrency !== 1) {
    throw new Error("Benchmark methodology requires sequential execution with concurrency 1.");
  }
  const repetitions = positiveInteger(
    values.get("repetitions") ?? String(config.repetitions ?? (methodologyVersion === 2 ? 5 : 1)),
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
  return {
    methodologyVersion,
    runId,
    repetitions,
    startRepetition,
    maxWallClockMinutes,
    assetProfiles,
    lambdaConfigs,
    implementations,
    region: values.get("region") ?? config.region ?? process.env.AWS_REGION ?? "eu-central-1",
    outputFile: values.get("output-file") ?? config.outputFile ?? "benchmarks/results.jsonl",
    scratchRoot,
    runToken,
    snapshotDate,
    concurrency: 1,
    destinationPrefix:
      values.get("destination-prefix") ?? config.destinationPrefix ?? "benchmark-site",
    phases: (config.phases ?? defaultPhases()).map(normalizePhase),
    decisionRunId: values.get("decision-run-id") ?? config.decisionRunId,
    comparisonVariant: values.get("comparison-variant") ?? config.comparisonVariant,
  };
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
function parseMethodologyVersion(value: string): 1 | 2 {
  if (value === "1") return 1;
  if (value === "2") return 2;
  throw new Error("methodology-version must be 1 or 2.");
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
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function usage(): never {
  throw new Error(
    "Usage: benchmark:run-assets --config <file> [--run-id <uuid>] [--repetitions 5] [--start-repetition 1] [--max-wall-clock-minutes <minutes>] [--concurrency 1]",
  );
}
