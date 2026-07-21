import { appendFileSync } from "node:fs";

export type VerificationFailureCategory =
  | "bucket-present"
  | "bucket-probe-error"
  | "distribution-present"
  | "distribution-probe-error"
  | "outputs-read-error"
  | "stack-destroy-error";

export function reportVerificationFailure(category: VerificationFailureCategory): void {
  console.error(`Verification failure category: ${category}`);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      appendFileSync(summaryFile, `Verification failure category: ${category}\n`, "utf8");
    } catch {
      // Reporting must never replace the original verification failure.
    }
  }
}
