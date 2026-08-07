import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  type BenchmarkRunRecord,
  type BenchmarkSampleRecord,
  benchmarkRunKey,
  benchmarkSampleKey,
  benchmarkSampleRecordErrors,
  readBenchmarkRunRecords,
  readBenchmarkSampleRecords,
  runsFileFor,
} from "./model";

/**
 * Sample IDs of the run whose samples cover every expected phase and whose run
 * records are cleanup-complete (`cleanup: "destroyed"`). Sample rows belonging to
 * completed runs are validated; invalid rows fail loudly.
 */
export function completedSampleIds(
  outputFile: string,
  runId: string,
  expectedPhases: readonly string[],
): Set<string> {
  const runsFile = runsFileFor(outputFile);
  const completedImplementations = new Set(
    existsSync(runsFile)
      ? readBenchmarkRunRecords(runsFile)
          .filter((run) => run.runId === runId && run.cleanup === "destroyed")
          .map((run) => run.implementation)
      : [],
  );
  if (completedImplementations.size === 0) {
    return new Set();
  }
  const phasesBySample = new Map<string, Set<string>>();
  for (const record of readBenchmarkSampleRecords(outputFile)) {
    if (
      record.runId !== runId ||
      !record.sampleId ||
      !record.phase ||
      !completedImplementations.has(record.implementation)
    ) {
      continue;
    }
    const errors = benchmarkSampleRecordErrors(record);
    if (errors.length > 0) {
      throw new Error(`Completed row is invalid: ${errors.join("; ")}`);
    }
    const phases = phasesBySample.get(record.sampleId) ?? new Set<string>();
    phases.add(record.phase);
    phasesBySample.set(record.sampleId, phases);
  }
  return new Set(
    [...phasesBySample]
      .filter(([, phases]) => expectedPhases.every((phase) => phases.has(phase)))
      .map(([sampleId]) => sampleId),
  );
}

export function upsertBenchmarkSample(outputFile: string, record: BenchmarkSampleRecord): void {
  upsertBenchmarkSamples(outputFile, [record]);
}

export function upsertBenchmarkSamples(
  outputFile: string,
  records: readonly BenchmarkSampleRecord[],
): void {
  if (records.length === 0) {
    return;
  }
  writeBenchmarkLedger(outputFile, previewBenchmarkSamples(outputFile, records));
}

export function previewBenchmarkSamples(
  outputFile: string,
  records: readonly BenchmarkSampleRecord[],
): string {
  const replacements = new Map(records.map((record) => [benchmarkSampleKey(record), record]));
  const retained = existsSync(outputFile)
    ? readFileSync(outputFile, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .filter((line) => {
          try {
            return !replacements.has(benchmarkSampleKey(JSON.parse(line) as BenchmarkSampleRecord));
          } catch (cause) {
            throw new Error(`Invalid JSONL record in ${outputFile}.`, { cause });
          }
        })
    : [];
  const serialized = records.map((record) => JSON.stringify(record));
  return `${[...retained, ...serialized].join("\n")}\n`;
}

export function upsertBenchmarkRun(runsFile: string, record: BenchmarkRunRecord): void {
  upsertBenchmarkRuns(runsFile, [record]);
}

export function upsertBenchmarkRuns(
  runsFile: string,
  records: readonly BenchmarkRunRecord[],
): void {
  if (records.length === 0) {
    return;
  }
  writeBenchmarkLedger(runsFile, previewBenchmarkRuns(runsFile, records));
}

export function previewBenchmarkRuns(
  runsFile: string,
  records: readonly BenchmarkRunRecord[],
): string {
  const replacements = new Map(records.map((record) => [benchmarkRunKey(record), record]));
  const retained = existsSync(runsFile)
    ? readFileSync(runsFile, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .filter((line) => {
          try {
            return !replacements.has(benchmarkRunKey(JSON.parse(line) as BenchmarkRunRecord));
          } catch (cause) {
            throw new Error(`Invalid JSONL record in ${runsFile}.`, { cause });
          }
        })
    : [];
  const serialized = records.map((record) => JSON.stringify(record));
  return `${[...retained, ...serialized].join("\n")}\n`;
}

export function writeBenchmarkLedger(outputFile: string, contents: string): void {
  mkdirSync(dirname(outputFile), { recursive: true });
  const temporaryFile = `${outputFile}.tmp-${process.pid}`;
  writeFileSync(temporaryFile, contents);
  renameSync(temporaryFile, outputFile);
}
