import assert from "node:assert/strict";
import test from "node:test";
import { releaseBody, releaseNotes } from "./release-notes.mjs";

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

test("composes authored upgrade notes first and preserves GitHub notes and changelog", () => {
  const markdown =
    "## Unreleased\n\nFuture\n\n## 0.14.0\n\n### Replacement\n\nUpgrade carefully.\n\n## 0.13.0\n\nHistory\n";
  const generated = {
    name: "v0.14.0",
    body: "## What's Changed\n* Fix by @author in https://github.com/owner/repo/pull/1\n\n**Full Changelog**: https://github.com/owner/repo/compare/v0.13.0...v0.14.0\n",
  };
  const expected = `## Upgrade notes\n\n### Replacement\n\nUpgrade carefully.\n\n${generated.body}`;
  assert.equal(releaseBody(markdown, "v0.14.0", generated), expected);
});

test("composition requires valid authored notes and a nonempty generated body", () => {
  for (const generated of [undefined, null, {}, { body: null }, { body: 123 }, { body: " \n" }]) {
    assert.throws(() => releaseBody("## 0.14.0\n\nUpgrade\n", "v0.14.0", generated));
  }
  for (const markdown of [
    "## 0.13.0\n\nOld\n",
    "## 0.14.0\n\n",
    "## 0.14.0\n\nOne\n\n## 0.14.0\n\nTwo\n",
  ]) {
    assert.throws(() => releaseBody(markdown, "v0.14.0", { body: "## What's Changed\nPR list" }));
  }
});
