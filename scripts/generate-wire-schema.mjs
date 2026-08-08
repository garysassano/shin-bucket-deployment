#!/usr/bin/env node
// Renders the committed JSON Schema artifact for the custom-resource wire
// contract from the Zod schema in `contract/wire-contract.mjs`.
//
// Usage:
//   node scripts/generate-wire-schema.mjs            # rewrite contract/wire-schema.json
//   node scripts/generate-wire-schema.mjs --check    # fail when the artifact drifted
//   node scripts/generate-wire-schema.mjs --artifact <path> [--check]
//
// `pnpm verify:wire-contract` runs the --check mode inside `pnpm check`, so
// the committed artifact cannot drift from the schema without a failing gate.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { wireContractSchema } from "../contract/wire-contract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const artifactPath = join(repoRoot, "contract", "wire-schema.json");

/** The deterministic serialization of the wire contract as JSON Schema. */
export function renderWireSchema() {
  return `${JSON.stringify(wireContractSchema.toJSONSchema(), null, 2)}\n`;
}

function main() {
  const check = process.argv.includes("--check");
  const artifactIndex = process.argv.indexOf("--artifact");
  const artifactOverride = artifactIndex === -1 ? undefined : process.argv[artifactIndex + 1];
  const artifact = artifactOverride ?? artifactPath;
  const rendered = renderWireSchema();
  if (check) {
    let committed;
    try {
      committed = readFileSync(artifact, "utf8");
    } catch {
      throw new Error(
        `${artifact} is missing. Generate it with ` +
          `\`node scripts/generate-wire-schema.mjs\` and commit the artifact.`,
      );
    }
    if (rendered !== committed) {
      throw new Error(
        `${artifact} drifted from the wire contract schema ` +
          "(contract/wire-contract.mjs). Regenerate it with " +
          "`node scripts/generate-wire-schema.mjs` and commit the artifact together " +
          "with the schema change.",
      );
    }
    console.log("contract/wire-schema.json matches the wire contract schema.");
    return;
  }
  writeFileSync(artifact, rendered);
  console.log(`Rewrote ${artifact} from the wire contract schema.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
