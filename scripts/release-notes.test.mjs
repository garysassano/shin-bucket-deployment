import assert from "node:assert/strict";
import test from "node:test";
import { releaseNotes } from "./release-notes.mjs";

test("selects only the exact release body and preserves authored paragraphs", () => {
  const body =
    "### Replacement\n\nA long paragraph stays on its original line.\n\n- One consequence\n- Another consequence";
  const markdown = `# Breaking Changes\n\n## Unreleased\n\nFuture change\n\n## 0.14.0\n\n${body}\n\n## 0.13.0\n\nHistorical change\n`;
  assert.equal(releaseNotes(markdown, "v0.14.0"), `${body}\n`);
  assert.equal(releaseNotes(markdown, "0.14.0"), `${body}\n`);
  assert.equal(
    releaseNotes(markdown.replaceAll("\n", "\r\n"), "v0.14.0"),
    `${body.replaceAll("\n", "\r\n")}\n`,
  );
});

test("fails closed instead of publishing another version or ambiguous notes", () => {
  for (const markdown of [
    "## Unreleased\n\nPending\n\n## 0.13.0\n\nOld\n",
    "## 0.14.0\n\n## 0.13.0\n\nOld\n",
    "## 0.14.0\n\nFirst\n\n## 0.14.0\n\nSecond\n",
  ]) {
    assert.throws(() => releaseNotes(markdown, "v0.14.0"));
  }
  assert.throws(() => releaseNotes("## Unreleased\n\nPending\n", "Unreleased"));
});
