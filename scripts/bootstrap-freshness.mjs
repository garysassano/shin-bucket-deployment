#!/usr/bin/env node
// Deploy-time freshness gate for the staged prebuilt provider archives.
//
// `src/provider.ts` prefers `assets/bootstrap-<arch>/bootstrap.zip` and only
// compiles the Rust provider when no archive exists, so a staged archive older
// than the current `rust/` source is selected silently. This gate refuses to
// start a deployment that would ship such an archive.
//
// The check reuses the exact digest computation that staged the archive:
// `collectSourceIdentity` from `source-identity.mjs` is what
// `build-bootstrap.mjs` records as `sourceTreeSha256` in
// `build-provenance.json`, so this module never maintains a second digest
// implementation that could disagree with the first.
//
// Escape hatch: set STALE_BOOTSTRAP_ESCAPE_HATCH to a truthy value to deploy
// the staged archives as-is. The error messages name the variable so a
// maintainer who deliberately wants the stale archive is not stuck.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { collectSourceIdentity } from "./source-identity.mjs";

export const STALE_BOOTSTRAP_ESCAPE_HATCH = "SHIN_ALLOW_STALE_BOOTSTRAP";

const ARCHIVE_DIR_PREFIX = "bootstrap-";
const PROVENANCE_FILE = "build-provenance.json";
const ARCHIVE_FILE = "bootstrap.zip";
const DIGEST_SHORT_LENGTH = 12;

/**
 * Refuses to deploy when any staged prebuilt provider archive was not built
 * from the current source tree. Throws with a fix instruction otherwise.
 *
 * Only archives that actually exist are checked: when no archive is staged the
 * construct compiles from source and there is nothing to gate. Directories that
 * are not `bootstrap-<arch>` are ignored.
 */
export function assertStagedBootstrapFreshness({ repositoryRoot, env = process.env } = {}) {
  if (escapeHatchEnabled(env)) {
    return;
  }
  const assetsRoot = join(repositoryRoot, "assets");
  if (!existsSync(assetsRoot)) {
    return;
  }
  const archiveDirs = readdirSync(assetsRoot)
    .filter((entry) => entry.startsWith(ARCHIVE_DIR_PREFIX))
    .map((entry) => ({
      architecture: entry.slice(ARCHIVE_DIR_PREFIX.length),
      directory: join(assetsRoot, entry),
    }))
    .filter((entry) => existsSync(join(entry.directory, ARCHIVE_FILE)));
  if (archiveDirs.length === 0) {
    return;
  }

  let currentDigest;
  try {
    currentDigest = collectSourceIdentity(repositoryRoot).sourceTreeSha256;
  } catch (error) {
    throw new Error(
      `Unable to verify the staged provider bootstrap against the current source ` +
        `tree: ${error instanceof Error ? error.message : String(error)}. ` +
        `Refusing to deploy an unverifiable archive.`,
    );
  }

  for (const { architecture, directory } of archiveDirs) {
    const provenancePath = join(directory, PROVENANCE_FILE);
    if (!existsSync(provenancePath)) {
      throw staleBootstrapError(
        architecture,
        `assets/bootstrap-${architecture}/bootstrap.zip is staged but its ` +
          `build-provenance.json is missing, so its source cannot be verified.`,
      );
    }
    let provenance;
    try {
      provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
    } catch (error) {
      throw staleBootstrapError(
        architecture,
        `assets/bootstrap-${architecture}/build-provenance.json is unreadable: ` +
          `${error instanceof Error ? error.message : String(error)}.`,
      );
    }
    if (typeof provenance.sourceTreeSha256 !== "string") {
      throw staleBootstrapError(
        architecture,
        `assets/bootstrap-${architecture}/build-provenance.json does not record ` +
          `a sourceTreeSha256, so the archive's source cannot be verified.`,
      );
    }
    if (provenance.sourceTreeSha256 !== currentDigest) {
      throw staleBootstrapError(
        architecture,
        `assets/bootstrap-${architecture}/bootstrap.zip was built from source tree ` +
          `${shortDigest(provenance.sourceTreeSha256)} (recorded in build-provenance.json), ` +
          `but the current source tree hashes to ${shortDigest(currentDigest)}. ` +
          `The archive would be deployed silently instead of the current rust/ source.`,
      );
    }
    if (provenance.sourceDirty !== false) {
      throw staleBootstrapError(
        architecture,
        `assets/bootstrap-${architecture}/bootstrap.zip was built from a dirty source ` +
          `tree (build-provenance.json records sourceDirty: ${JSON.stringify(
            provenance.sourceDirty,
          )}). ` +
          `A dirty build cannot be attributed to the current commit, so it is not a ` +
          `verifiable provider for evidence-bearing deployments.`,
      );
    }
  }
}

function staleBootstrapError(architecture, reason) {
  return new Error(
    `Refusing to deploy a stale prebuilt provider bootstrap (${architecture}).\n` +
      `${reason}\n` +
      `Run \`pnpm prebuild:bootstrap\` to rebuild the staged archives from the ` +
      `current source, or set ${STALE_BOOTSTRAP_ESCAPE_HATCH}=1 to deploy the staged ` +
      `archives as-is (not recommended).`,
  );
}

function escapeHatchEnabled(env) {
  const value = env[STALE_BOOTSTRAP_ESCAPE_HATCH];
  if (value === undefined || value === "") {
    return false;
  }
  return value !== "0" && value.toLowerCase() !== "false";
}

function shortDigest(digest) {
  return digest.slice(0, DIGEST_SHORT_LENGTH);
}
