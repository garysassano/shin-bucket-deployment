import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parseBenchmarkRunOptions } from "../../benchmarks/src/config";
import {
  COMMITTED_LEDGER_FILE,
  checkCommittedLedger,
  runLedgerCheck,
} from "../../benchmarks/src/verify-ledger";
import { canonicalRunRecord, canonicalSampleRecord } from "../support/benchmark-records";

function writeLedger(dir: string, runs: unknown[], samples: unknown[]): string {
  const runsFile = join(dir, "runs.jsonl");
  const resultsFile = join(dir, "results.jsonl");
  writeFileSync(runsFile, `${runs.map((run) => JSON.stringify(run)).join("\n")}\n`);
  writeFileSync(resultsFile, `${samples.map((sample) => JSON.stringify(sample)).join("\n")}\n`);
  return resultsFile;
}

describe("committed benchmark ledger gate", () => {
  const options = parseBenchmarkRunOptions(["--run-id", "00000000-0000-4000-a000-000000000001"]);

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

  // The gate itself, not just the helper it calls. Asserting only
  // checkCommittedLedger left runLedgerCheck free to return 0 unconditionally
  // with every test still green, which would silently disable the check.
  test("the gate returns a failing exit code and reports every error", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-verify-ledger-exit-"));
    const resultsFile = writeLedger(dir, [], [canonicalSampleRecord()]);
    const failures: string[] = [];

    const code = runLedgerCheck(
      resultsFile,
      () => {
        throw new Error("the gate must not report success for an invalid ledger");
      },
      (message) => failures.push(message),
    );

    expect(code).toBe(1);
    expect(failures.at(-1)).toMatch(/Committed ledger is invalid: \d+ error\(s\)\./);
  });

  test("the gate returns a passing exit code and reports the counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "shin-bench-verify-ledger-pass-"));
    const resultsFile = writeLedger(
      dir,
      [canonicalRunRecord(options, "shin")],
      [canonicalSampleRecord()],
    );
    const reported: string[] = [];

    const code = runLedgerCheck(
      resultsFile,
      (message) => reported.push(message),
      () => {
        throw new Error("a valid ledger must not report failures");
      },
    );

    expect(code).toBe(0);
    expect(reported.at(-1)).toBe("Committed ledger valid: 1 run records, 1 samples.");
  });

  // A gate nobody runs is not a gate. This is the half that a unit test of the
  // function can never cover.
  test("verify:ledger is wired into the check chain and points at the committed ledger", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts["verify:ledger"]).toBe("node dist/benchmarks/src/verify-ledger.js");
    expect(manifest.scripts.check).toMatch(/(^|&&\s*)pnpm verify:ledger(\s|$)/);
    expect(COMMITTED_LEDGER_FILE).toBe("benchmarks/results.jsonl");
  });
});
