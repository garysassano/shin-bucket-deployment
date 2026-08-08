import { benchmarkEvidenceErrors, readBenchmarkEvidence } from "./model.js";

export type CommittedLedgerCheck = {
  readonly runCount: number;
  readonly sampleCount: number;
  readonly errors: readonly string[];
};

/**
 * Loads a ledger through the shared model helpers and validates both files
 * together. Extracted from the CLI entry so tests can point it at fixture
 * ledgers in a temp directory instead of the committed files.
 */
export function checkCommittedLedger(resultsFile: string): CommittedLedgerCheck {
  const evidence = readBenchmarkEvidence(resultsFile);
  return {
    runCount: evidence.runs.length,
    sampleCount: evidence.samples.length,
    errors: benchmarkEvidenceErrors(evidence),
  };
}

export const COMMITTED_LEDGER_FILE = "benchmarks/results.jsonl";

/**
 * The gate's whole behaviour, returning the process exit code instead of
 * calling `process.exit` so a test can assert it rather than only asserting the
 * helper it calls. Testing `checkCommittedLedger` alone left the gate itself
 * unguarded: replacing this body with `return 0` kept every test green.
 */
export function runLedgerCheck(
  resultsFile: string = COMMITTED_LEDGER_FILE,
  out: (message: string) => void = console.log,
  fail: (message: string) => void = console.error,
): number {
  const ledger = checkCommittedLedger(resultsFile);
  if (ledger.errors.length > 0) {
    for (const error of ledger.errors) fail(error);
    fail(`Committed ledger is invalid: ${ledger.errors.length} error(s).`);
    return 1;
  }
  out(`Committed ledger valid: ${ledger.runCount} run records, ${ledger.sampleCount} samples.`);
  return 0;
}

if (require.main === module) {
  process.exit(runLedgerCheck());
}
