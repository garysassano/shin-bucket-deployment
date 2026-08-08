import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import { joinBenchmarkSamples, readBenchmarkEvidence } from "../../benchmarks/src/model";
import { selectChartItems } from "../../benchmarks/src/render/readme-snapshot";
import { canonicalRunRecord, canonicalSampleRecord } from "../support/benchmark-records";

function writeLedger(dir: string, runs: unknown[], samples: unknown[]): string {
  const runsFile = join(dir, "runs.jsonl");
  const resultsFile = join(dir, "results.jsonl");
  writeFileSync(runsFile, `${runs.map((run) => JSON.stringify(run)).join("\n")}\n`);
  writeFileSync(resultsFile, `${samples.map((sample) => JSON.stringify(sample)).join("\n")}\n`);
  return resultsFile;
}

describe("benchmark snapshot render guard", () => {
  const options = parseBenchmarkRunOptions(["--run-id", "00000000-0000-4000-a000-000000000001"]);

  test("selects no chart items from an aws-only fixture ledger, so the render guard exits non-zero", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-render-aws-only-"));
    const resultsFile = writeLedger(
      dir,
      [canonicalRunRecord(options, "aws")],
      [canonicalSampleRecord({ implementation: "aws" })],
    );
    const evidence = readBenchmarkEvidence(resultsFile);
    const records = joinBenchmarkSamples(evidence.runs, evidence.samples);

    expect(selectChartItems(records, {})).toEqual([]);
  });

  test("selects a chart item when a phase has both a shin and an aws sample", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-render-paired-"));
    const resultsFile = writeLedger(
      dir,
      [canonicalRunRecord(options, "shin"), canonicalRunRecord(options, "aws")],
      [canonicalSampleRecord(), canonicalSampleRecord({ implementation: "aws" })],
    );
    const evidence = readBenchmarkEvidence(resultsFile);
    const records = joinBenchmarkSamples(evidence.runs, evidence.samples);

    const items = selectChartItems(records, {});
    expect(items).toHaveLength(1);
    expect(items[0]?.profile).toBe("tiny-many");
    expect(items[0]?.memoryMb).toBe(1024);
    expect(items[0]?.parallel).toBe(32);
  });
});
