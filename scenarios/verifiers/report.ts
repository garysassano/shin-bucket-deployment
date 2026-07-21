import { appendFileSync } from "node:fs";

export type VerificationFailureCategory =
  | "bucket-present"
  | "bucket-probe-error"
  | "distribution-present"
  | "distribution-probe-error"
  | "stack-probe-error";

export function reportVerificationFailure(category: VerificationFailureCategory): void {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      appendFileSync(summaryFile, `Verification failure category: ${category}\n`, "utf8");
    } catch {
      // Reporting must never replace the original verification failure.
    }
  }
}
