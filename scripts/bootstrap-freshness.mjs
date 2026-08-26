#!/usr/bin/env node
// Deploy-time freshness gate for the staged prebuilt provider archives.
//
// `src/provider.ts` prefers `assets/bootstrap-<arch>/bootstrap.zip` and only
// compiles the Rust provider when no archive exists, so a staged archive older
// than the current `rust/` source is selected silently. This gate refuses to
// start a deployment that would ship such an archive.
//
// Freshness is decided by comparing the recorded build recipe with the current
// one, reusing the exact implementations that staged the archive:
//
// - the provider-build-input digest (`collectProviderBuildInputIdentity` from
//   `source-identity.mjs`) covers the files that determine the binary (rust
//   sources, manifests, lockfile, toolchain pins) and is what
//   `build-bootstrap.mjs` records as `providerInputSha256`. A README edit or
//   uncommitted benchmark row does not change it, so a byte-identical archive
//   stays deployable from a dirty tree; changing rust/ does change it, so the
//   archive is refused until `pnpm build:bootstrap` reruns.
// - the build-toolchain digest (`collectBuildToolchainIdentity`) covers the
//   resolved compiler/tool identities and cargo configuration, and the
//   build-environment digest (`buildEnvironmentSha256`) covers the bounded
//   build-flag variable list (RUSTFLAGS, CARGO_PROFILE_*, CARGO_HOME, ...).
//   Both are recorded in the provenance by `build-bootstrap.mjs` and re-derived
//   here, so an archive built with different flags, a different CARGO_HOME, or
//   a different toolchain resolution is refused instead of deployed silently.
// - the archive bytes themselves are verified against the provenance's
//   `bootstrapArchiveSha256`/`bootstrapSha256` via the same ZIP reader
//   `verify-package.mjs` uses, so a swapped or hand-edited archive cannot pass
//   with intact provenance.
//
// The full-tree `sourceTreeSha256` remains in the provenance for evidence
// attribution (benchmark builds still require a clean detached worktree); the
// deploy gate does not consult it, so unrelated dirty files cannot make a
// fresh archive look stale.
//
// Escape hatch: set STALE_BOOTSTRAP_ESCAPE_HATCH to a truthy value to deploy
// the staged archives as-is. The error messages name the variable so a
// maintainer who deliberately wants the stale archive is not stuck.
//
// Test seam: `currentIdentity` lets a caller supply the current recipe
// digests instead of re-deriving them. Only the Node-level tests pass it —
// the deploy path always re-derives from the repository and the real
// toolchain — so `pnpm test` can exercise this real gate without a Rust
// toolchain on PATH.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildEnvironmentSha256,
  collectBuildToolchainIdentity,
  collectProviderBuildInputIdentity,
} from "./source-identity.mjs";
import { readBootstrapEntry, sha256File } from "./verify-package.mjs";

export const STALE_BOOTSTRAP_ESCAPE_HATCH = "SHIN_ALLOW_STALE_BOOTSTRAP";

const ARCHIVE_DIR_PREFIX = "bootstrap-";
const PROVENANCE_FILE = "build-provenance.json";
const ARCHIVE_FILE = "bootstrap.zip";
const DIGEST_SHORT_LENGTH = 12;

/**
 * Refuses to deploy when any staged prebuilt provider archive is not fresh:
 * its provider build inputs, build toolchain, or build environment differ
 * from the current ones, or its bytes do not match the digest recorded in its
 * build provenance. Throws with a fix instruction otherwise.
 *
 * Only archives that actually exist are checked: when no archive is staged the
 * construct compiles from source and there is nothing to gate. Directories that
 * are not `bootstrap-<arch>` are ignored. When `architectures` is given, only
 * staged archives for those architectures are checked — the caller (the
 * scenario runner) knows which architectures its deploy runs can select and
 * must not gate an architecture no run deploys. An explicitly empty selection
 * is refused: "no architectures" is a caller bug (the runner skips the gate
 * entirely when a plan genuinely needs no prebuilt archive), and silently
 * gating nothing would let a stale archive deploy.
 *
 * `currentIdentity` is an optional override of the current build recipe.
 * Production callers never pass it, so the gate always re-derives the recipe
 * from the repository and the real toolchain. The Node-level test suite uses
 * it to drive this real gate hermetically: deriving the toolchain digest
 * spawns cargo/rustc/cargo-lambda/zig/rustup, and `pnpm test` must run
 * without a Rust toolchain.
 */
export function assertStagedBootstrapFreshness({
  repositoryRoot,
  architectures,
  env = process.env,
  currentIdentity,
} = {}) {
  if (escapeHatchEnabled(env)) {
    return;
  }
  if (architectures !== undefined && architectures.length === 0) {
    throw new Error(
      `Refusing to verify bootstrap freshness for zero architectures. ` +
        `Pass no architectures to check every staged archive, or pass the ` +
        `architectures a deploy can select; an explicit empty selection would ` +
        `silently gate nothing.`,
    );
  }
  const assetsRoot = join(repositoryRoot, "assets");
  if (!existsSync(assetsRoot)) {
    return;
  }
  const selectedArchitectures = architectures === undefined ? undefined : new Set(architectures);
  const archiveDirs = readdirSync(assetsRoot)
    .filter((entry) => entry.startsWith(ARCHIVE_DIR_PREFIX))
    .map((entry) => ({
      architecture: entry.slice(ARCHIVE_DIR_PREFIX.length),
      directory: join(assetsRoot, entry),
    }))
    .filter((entry) => existsSync(join(entry.directory, ARCHIVE_FILE)))
    .filter(
      (entry) =>
        selectedArchitectures === undefined || selectedArchitectures.has(entry.architecture),
    );
  if (archiveDirs.length === 0) {
    return;
  }

  if (currentIdentity === undefined) {
    try {
      currentIdentity = {
        providerInputSha256: collectProviderBuildInputIdentity(repositoryRoot).providerInputSha256,
        buildToolchainSha256: collectBuildToolchainIdentity(repositoryRoot).buildToolchainSha256,
        buildEnvironmentSha256: buildEnvironmentSha256(env),
      };
    } catch (error) {
      throw new Error(
        `Unable to verify the staged provider bootstrap against the current ` +
          `source and build recipe: ` +
          `${error instanceof Error ? error.message : String(error)}. ` +
          `Refusing to deploy an unverifiable archive.`,
      );
    }
  } else {
    for (const digestName of [
      "providerInputSha256",
      "buildToolchainSha256",
      "buildEnvironmentSha256",
    ]) {
      if (typeof currentIdentity[digestName] !== "string" || currentIdentity[digestName] === "") {
        throw new TypeError(
          `currentIdentity.${digestName} must be a non-empty SHA-256 digest string.`,
        );
      }
    }
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
    for (const [digestName, label] of [
      ["providerInputSha256", "provider inputs"],
      ["buildToolchainSha256", "build toolchain"],
      ["buildEnvironmentSha256", "build environment"],
    ]) {
      if (typeof provenance[digestName] !== "string") {
        throw staleBootstrapError(
          architecture,
          `assets/bootstrap-${architecture}/build-provenance.json does not record ` +
            `a ${digestName}. The archive was staged before ${label} digests ` +
            `existed, so its freshness cannot be verified.`,
        );
      }
      if (provenance[digestName] !== currentIdentity[digestName]) {
        throw staleBootstrapError(
          architecture,
          `assets/bootstrap-${architecture}/bootstrap.zip was built from ${label} ` +
            `hashing to ${shortDigest(provenance[digestName])} (recorded in ` +
            `build-provenance.json), but the current ${label} hash to ` +
            `${shortDigest(currentIdentity[digestName])}. The archive would be ` +
            `deployed silently instead of a provider built from the current ${label}.`,
        );
      }
    }
    let archiveDigests;
    try {
      const archivePath = join(directory, ARCHIVE_FILE);
      const bootstrap = readBootstrapEntry(archivePath, architecture);
      archiveDigests = {
        bootstrapArchiveSha256: sha256File(archivePath),
        bootstrapSha256: createHash("sha256").update(bootstrap).digest("hex"),
      };
    } catch (error) {
      throw staleBootstrapError(
        architecture,
        `assets/bootstrap-${architecture}/bootstrap.zip could not be read as a ` +
          `provider archive: ${error instanceof Error ? error.message : String(error)}.`,
      );
    }
    for (const [digestName, recorded, actual] of [
      [
        "bootstrapArchiveSha256",
        provenance.bootstrapArchiveSha256,
        archiveDigests.bootstrapArchiveSha256,
      ],
      ["bootstrapSha256", provenance.bootstrapSha256, archiveDigests.bootstrapSha256],
    ]) {
      if (recorded !== actual) {
        throw staleBootstrapError(
          architecture,
          `assets/bootstrap-${architecture}/bootstrap.zip does not match the ` +
            `${digestName} recorded in build-provenance.json ` +
            `(${shortDigest(actual)} vs ${shortDigest(recorded)}). The archive was ` +
            `replaced or modified after the build, so it is not the verified provider.`,
        );
      }
    }
  }
}

function staleBootstrapError(architecture, reason) {
  return new Error(
    `Refusing to deploy a stale prebuilt provider bootstrap (${architecture}).\n` +
      `${reason}\n` +
      `Run \`pnpm build:bootstrap\` to rebuild the staged archives from the ` +
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
