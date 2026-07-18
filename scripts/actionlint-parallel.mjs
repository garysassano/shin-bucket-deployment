import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function expandParallelSteps(source, path = "workflow.yml") {
  let lines = source.split("\n");
  let expandedGroups = 0;

  for (;;) {
    const next = [];
    let expanded = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = /^(\s*)- parallel:\s*$/.exec(line);
      if (!match) {
        next.push(line);
        continue;
      }

      const indent = match[1];
      const childPrefix = `${indent}    `;
      const children = [];
      let cursor = index + 1;
      for (; cursor < lines.length; cursor += 1) {
        const child = lines[cursor];
        if (child.trim() === "") {
          children.push(child);
          continue;
        }
        const childIndent = child.match(/^\s*/)?.[0] ?? "";
        if (childIndent.length <= indent.length) break;
        if (!child.startsWith(childPrefix)) {
          throw new Error(
            `${path}:${cursor + 1}: parallel child must be indented four spaces beyond its wrapper`,
          );
        }
        children.push(child.slice(4));
      }
      if (!children.some((child) => child.trim().startsWith("- "))) {
        throw new Error(`${path}:${index + 1}: parallel group must contain at least one step`);
      }
      next.push(...children);
      index = cursor - 1;
      expanded = true;
      expandedGroups += 1;
    }
    lines = next;
    if (!expanded) break;
  }

  return { source: lines.join("\n"), expandedGroups };
}

export function lintWorkflows({ root = process.cwd(), executable = "actionlint" } = {}) {
  const workflowDirectory = join(root, ".github", "workflows");
  const workflows = readdirSync(workflowDirectory)
    .filter((name) => [".yml", ".yaml"].includes(extname(name)))
    .sort();
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "actionlint-parallel-"));
  let failed = false;
  try {
    for (const name of workflows) {
      const path = join(workflowDirectory, name);
      const transformed = expandParallelSteps(readFileSync(path, "utf8"), path);
      const lintPath =
        transformed.expandedGroups === 0
          ? path
          : join(temporaryDirectory, `expanded-${basename(name)}`);
      if (transformed.expandedGroups > 0) writeFileSync(lintPath, transformed.source);
      const result = spawnSync(executable, [lintPath], {
        cwd: root,
        encoding: "utf8",
        env: process.env,
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replaceAll(lintPath, path);
      if (output) process.stderr.write(output);
      if (result.error) throw result.error;
      if (result.status !== 0) failed = true;
    }
  } finally {
    for (const name of readdirSync(temporaryDirectory)) {
      unlinkSync(join(temporaryDirectory, name));
    }
    rmdirSync(temporaryDirectory);
  }
  if (failed) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  lintWorkflows();
}
