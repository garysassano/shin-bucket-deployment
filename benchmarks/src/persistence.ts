import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type BenchmarkResultRecord, benchmarkResultKey } from "./model";

export function completedSampleIds(
  outputFile: string,
  runId: string,
  expectedPhases: readonly string[],
): Set<string> {
  if (!existsSync(outputFile)) return new Set();
  const phasesBySample = new Map<string, Set<string>>();
  for (const line of readFileSync(outputFile, "utf8").split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line) as BenchmarkResultRecord;
    if (
      record.runId !== runId ||
      !record.sampleId ||
      !record.phase ||
      record.cleanup !== "all benchmark stacks destroyed"
    ) {
      continue;
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

export function upsertBenchmarkRecord(outputFile: string, record: BenchmarkResultRecord): void {
  upsertBenchmarkRecords(outputFile, [record]);
}

export function upsertBenchmarkRecords(
  outputFile: string,
  records: readonly BenchmarkResultRecord[],
): void {
  if (records.length === 0) {
    return;
  }
  writeBenchmarkLedger(outputFile, previewBenchmarkRecords(outputFile, records));
}

export function previewBenchmarkRecords(
  outputFile: string,
  records: readonly BenchmarkResultRecord[],
): string {
  const replacements = new Map(records.map((record) => [benchmarkResultKey(record), record]));
  const retained = existsSync(outputFile)
    ? readFileSync(outputFile, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .filter((line) => {
          try {
            return !replacements.has(benchmarkResultKey(JSON.parse(line) as BenchmarkResultRecord));
          } catch (cause) {
            throw new Error(`Invalid JSONL record in ${outputFile}.`, { cause });
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
