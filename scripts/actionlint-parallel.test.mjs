import assert from "node:assert/strict";
import test from "node:test";
import { expandParallelSteps } from "./actionlint-parallel.mjs";

test("expands parallel groups into independently lintable steps", () => {
  const workflow = `jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - parallel:
          - name: One
            run: echo one

          - name: Two
            uses: actions/checkout@0123456789012345678901234567890123456789
      - run: echo done
`;
  const result = expandParallelSteps(workflow);
  assert.equal(result.expandedGroups, 1);
  assert.match(result.source, / {6}- name: One\n {8}run: echo one/);
  assert.match(result.source, / {6}- name: Two\n {8}uses:/);
  assert.doesNotMatch(result.source, /parallel:/);
  assert.match(result.source, / {6}- run: echo done/);
});

test("rejects empty and malformed parallel groups", () => {
  assert.throws(
    () => expandParallelSteps("steps:\n  - parallel:\n  - run: echo done\n", "empty.yml"),
    /must contain at least one step/,
  );
  assert.throws(
    () => expandParallelSteps("steps:\n  - parallel:\n    - run: echo bad\n", "bad.yml"),
    /must be indented four spaces/,
  );
});
