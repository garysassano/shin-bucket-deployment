import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { globSyntaxError } from "../src/glob";

/**
 * Cross-implementation glob parity.
 *
 * A pattern is validated twice: `globSyntaxError` rejects it at synthesis, and
 * `globset::Glob::new` (through `compile_globs` in `rust/src/request.rs`)
 * rejects it at request time in the provider. If the two disagree, a stack
 * either synthesizes and then fails inside the Lambda, or is refused at
 * synthesis for a pattern the provider would have accepted.
 *
 * `test/glob.test.ts` asserts the TypeScript validator's behaviour against
 * hand-written expectations about what globset does -- one-sided, and nothing
 * runs the same inputs through Rust. This corpus is run by both sides
 * (`rust/src/request.rs` has the matching test), so a divergence is a test
 * failure rather than a deployment-time surprise. Same approach the wire
 * contract already uses in `contract/wire-acceptance-matrix.json`.
 */
interface GlobCase {
  readonly pattern: string;
  readonly accepted: boolean;
  readonly note: string;
}

const matrix = JSON.parse(
  readFileSync(join(__dirname, "..", "contract", "glob-acceptance-matrix.json"), "utf8"),
) as { cases: GlobCase[] };

describe("glob acceptance matrix", () => {
  test("the corpus is non-trivial and covers both outcomes", () => {
    expect(matrix.cases.length).toBeGreaterThanOrEqual(25);
    expect(matrix.cases.some((entry) => entry.accepted)).toBe(true);
    expect(matrix.cases.some((entry) => !entry.accepted)).toBe(true);
  });

  test("every case carries a note explaining what it pins", () => {
    for (const entry of matrix.cases) {
      expect(entry.note, JSON.stringify(entry.pattern)).toBeTruthy();
    }
  });

  test.each(matrix.cases.map((entry) => [entry.pattern, entry.accepted, entry.note] as const))(
    "%j accepted=%s (%s)",
    (pattern, accepted) => {
      expect(globSyntaxError(pattern) === undefined).toBe(accepted);
    },
  );
});
