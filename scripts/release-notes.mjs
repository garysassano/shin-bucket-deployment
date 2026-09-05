import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function releaseNotes(markdown, tag) {
  assert(/^v?\d+\.\d+\.\d+$/.test(tag), "Expected a stable release version or tag.");
  const version = tag.replace(/^v/, "");
  const headings = [...markdown.matchAll(/^## ([^\r\n]+)\r?$/gm)];
  const matches = headings.filter((heading) => heading[1] === version);
  assert.equal(matches.length, 1, `Expected exactly one release-notes section for ${version}.`);
  const heading = matches[0];
  const next = headings[headings.indexOf(heading) + 1];
  const body = markdown.slice(heading.index + heading[0].length, next?.index).trim();
  assert(body.length > 0, `Release notes for ${version} must not be empty.`);
  return `${body}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  assert.equal(process.argv.length, 3, "Usage: node scripts/release-notes.mjs <version-or-tag>");
  process.stdout.write(
    releaseNotes(readFileSync("docs/breaking-changes.md", "utf8"), process.argv[2]),
  );
}
