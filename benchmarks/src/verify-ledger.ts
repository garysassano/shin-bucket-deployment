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

function main(): void {
  const ledger = checkCommittedLedger("benchmarks/results.jsonl");
  if (ledger.errors.length > 0) {
    for (const error of ledger.errors) console.error(error);
    console.error(`Committed ledger is invalid: ${ledger.errors.length} error(s).`);
    process.exit(1);
  }
  console.log(
    `Committed ledger valid: ${ledger.runCount} run records, ${ledger.sampleCount} samples.`,
  );
}

if (require.main === module) {
  main();
}
