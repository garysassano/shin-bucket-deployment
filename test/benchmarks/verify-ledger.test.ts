import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import { checkCommittedLedger } from "../../benchmarks/src/verify-ledger";
import { canonicalRunRecord, canonicalSampleRecord } from "../support/benchmark-records";

function writeLedger(dir: string, runs: unknown[], samples: unknown[]): string {
  const runsFile = join(dir, "runs.jsonl");
  const resultsFile = join(dir, "results.jsonl");
  writeFileSync(runsFile, `${runs.map((run) => JSON.stringify(run)).join("\n")}\n`);
  writeFileSync(resultsFile, `${samples.map((sample) => JSON.stringify(sample)).join("\n")}\n`);
  return resultsFile;
}

describe("committed benchmark ledger gate", () => {
  const options = parseBenchmarkRunOptions([
    "--run-id",
    "00000000-0000-4000-a000-000000000001",
  ]);

  test("accepts a valid fixture ledger and reports its counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-verify-ledger-valid-"));
    const resultsFile = writeLedger(
      dir,
      [canonicalRunRecord(options, "shin")],
      [canonicalSampleRecord()],
    );

    const check = checkCommittedLedger(resultsFile);

    expect(check.errors).toEqual([]);
    expect(check.runCount).toBe(1);
    expect(check.sampleCount).toBe(1);
  });

  test("rejects a fixture ledger whose summary no longer matches the required shape", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-verify-ledger-shape-"));
    const sample = canonicalSampleRecord();
    delete (sample.providerSummary as Record<string, unknown>).phaseMs;
    const resultsFile = writeLedger(dir, [canonicalRunRecord(options, "shin")], [sample]);

    const check = checkCommittedLedger(resultsFile);

    expect(check.errors.length).toBeGreaterThan(0);
    expect(check.errors[0]).toMatch(/summary is missing phaseMs/);
  });

  test("rejects a fixture ledger whose sample has no run record", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-verify-ledger-orphan-"));
    const resultsFile = writeLedger(dir, [], [canonicalSampleRecord()]);

    const check = checkCommittedLedger(resultsFile);

    expect(check.errors.length).toBeGreaterThan(0);
    expect(check.errors[0]).toMatch(/has no run record/);
  });
});
