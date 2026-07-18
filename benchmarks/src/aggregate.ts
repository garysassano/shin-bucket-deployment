import { type BenchmarkResultRecord, implementationLabel } from "./model";

export type BenchmarkStatistics = {
  readonly count: number;
  readonly median: number;
  readonly q1: number;
  readonly q3: number;
  readonly iqr: number;
  readonly min: number;
  readonly max: number;
};

export type BenchmarkAggregate = BenchmarkStatistics & {
  readonly profile: string;
  readonly phase: string;
  readonly implementation: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly sourceWindowBytes: number | null;
};

export function quantile(sortedValues: readonly number[], probability: number): number {
  if (sortedValues.length === 0) {
    throw new Error("Cannot calculate a quantile from an empty sample.");
  }
  if (probability < 0 || probability > 1) {
    throw new Error(`Quantile probability must be between 0 and 1, got ${probability}.`);
  }
  const index = (sortedValues.length - 1) * probability;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];
  if (lower === undefined || upper === undefined) {
    throw new Error(`Unable to read quantile ${probability} from ${sortedValues.length} values.`);
  }
  return lower + (upper - lower) * (index - lowerIndex);
}

export function summarize(values: readonly number[]): BenchmarkStatistics {
  const sorted = values.filter(Number.isFinite).toSorted((left, right) => left - right);
  if (sorted.length === 0) {
    throw new Error("Cannot summarize an empty benchmark sample.");
  }
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  return {
    count: sorted.length,
    median: quantile(sorted, 0.5),
    q1,
    q3,
    iqr: q3 - q1,
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
  };
}

export function aggregateMetric(
  records: readonly BenchmarkResultRecord[],
  metric: keyof BenchmarkResultRecord,
): BenchmarkAggregate[] {
  const groups = new Map<string, { record: BenchmarkResultRecord; values: number[] }>();
  for (const record of records) {
    const value = record[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    const implementation = implementationLabel(record);
    const parallel = implementation === "aws" ? null : (record.parallel ?? null);
    const sourceWindowBytes = implementation === "aws" ? null : (record.sourceWindowBytes ?? null);
    const key = [
      record.profile,
      record.phase,
      implementation,
      record.memoryMb,
      parallel,
      sourceWindowBytes,
    ].join("\0");
    const group = groups.get(key) ?? { record, values: [] };
    group.values.push(value);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ record, values }) => ({
    profile: record.profile ?? "unknown",
    phase: record.phase ?? "unknown",
    implementation: implementationLabel(record),
    memoryMb: record.memoryMb ?? null,
    parallel: implementationLabel(record) === "aws" ? null : (record.parallel ?? null),
    sourceWindowBytes:
      implementationLabel(record) === "aws" ? null : (record.sourceWindowBytes ?? null),
    ...summarize(values),
  }));
}

export function assertCompleteSamples(
  aggregates: readonly Pick<BenchmarkAggregate, "count" | "implementation" | "phase" | "profile">[],
  expectedRepetitions = 5,
): void {
  const incomplete = aggregates.filter((aggregate) => aggregate.count !== expectedRepetitions);
  if (incomplete.length > 0) {
    const details = incomplete
      .map(
        (aggregate) =>
          `${aggregate.implementation}/${aggregate.profile}/${aggregate.phase}: n=${aggregate.count}`,
      )
      .join(", ");
    throw new Error(
      `Incomplete methodology-v2 benchmark samples; expected n=${expectedRepetitions}: ${details}`,
    );
  }
}

export function comparisonGroupKey(
  row: Pick<BenchmarkAggregate, "memoryMb" | "phase" | "profile"> & {
    readonly sourceWindowBytes?: number | null;
  },
): string {
  return [row.profile, row.phase, row.memoryMb ?? ""].join("\0");
}
