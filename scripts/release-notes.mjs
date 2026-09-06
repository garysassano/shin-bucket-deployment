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

export function releaseBody(markdown, tag, generated) {
  const authored = releaseNotes(markdown, tag);
  assert(
    typeof generated?.body === "string" && generated.body.trim().length > 0,
    "GitHub generated release notes must contain a nonempty body.",
  );
  return `## Upgrade notes\n\n${authored}\n${generated.body.trim()}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  assert(
    process.argv.length === 3 || process.argv.length === 4,
    "Usage: node scripts/release-notes.mjs <version-or-tag> [generated-notes.json]",
  );
  const markdown = readFileSync("docs/breaking-changes.md", "utf8");
  const tag = process.argv[2];
  process.stdout.write(
    process.argv[3]
      ? releaseBody(markdown, tag, JSON.parse(readFileSync(process.argv[3], "utf8")))
      : releaseNotes(markdown, tag),
  );
}
