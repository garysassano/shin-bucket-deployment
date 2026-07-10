#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const registryOrigin = "https://registry.npmjs.org";
const provenancePredicateType = "https://slsa.dev/provenance/v1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  assert(value, `${name} must be set by GitHub Actions.`);
  return value;
}

function parseOptions(args) {
  let tarball;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--tarball") {
      assert(tarball === undefined, "--tarball may only be specified once.");
      assert(args[index + 1], "--tarball requires a path.");
      tarball = resolve(args[index + 1]);
      index++;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  assert(tarball, "--tarball is required.");
  return { tarball };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}.${detail}`);
  }
  return result.stdout;
}

function readPackedManifest(tarball) {
  const manifest = JSON.parse(
    run("tar", ["-xOf", tarball, "package/package.json"], { capture: true }),
  );
  assert(typeof manifest.name === "string", "Packed package is missing its name.");
  assert(typeof manifest.version === "string", "Packed package is missing its version.");
  return manifest;
}

function tarballDigests(tarball) {
  const bytes = readFileSync(tarball);
  const digest = createHash("sha512").update(bytes).digest();
  return {
    hex: digest.toString("hex"),
    integrity: `sha512-${digest.toString("base64")}`,
  };
}

async function fetchJson(url, allowNotFound = false) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "cache-control": "no-cache" },
    redirect: "error",
  });
  if (allowNotFound && response.status === 404) {
    return undefined;
  }
  assert(response.ok, `Registry request failed with HTTP ${response.status}.`);
  return response.json();
}

export function decodeProvenance(attestations) {
  const attestation = attestations.attestations?.find(
    (candidate) => candidate.predicateType === provenancePredicateType,
  );
  assert(attestation, "Published package is missing its SLSA provenance attestation.");
  const payload = attestation.bundle?.dsseEnvelope?.payload;
  assert(typeof payload === "string", "Published provenance is missing its DSSE payload.");
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}

export function packagePurl(name, version) {
  const encodedName = name.startsWith("@") ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${encodedName}@${version}`;
}

export function verifyProvenance(statement, manifest, digest) {
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const commit = requiredEnv("GITHUB_SHA");
  const ref = requiredEnv("GITHUB_REF");
  const workflowRef = requiredEnv("GITHUB_WORKFLOW_REF");
  const workflowPrefix = `${repository}/`;
  assert(
    workflowRef.startsWith(workflowPrefix),
    "GITHUB_WORKFLOW_REF does not match the repository.",
  );
  const workflowPath = workflowRef.slice(workflowPrefix.length).split("@")[0];

  const subject = statement.subject?.find(
    (candidate) => candidate.name === packagePurl(manifest.name, manifest.version),
  );
  assert(subject, "Published provenance has the wrong package subject.");
  assert(
    subject.digest?.sha512 === digest.hex,
    "Published provenance has the wrong tarball digest.",
  );

  const definition = statement.predicate?.buildDefinition;
  const workflow = definition?.externalParameters?.workflow;
  assert(
    workflow?.repository === `https://github.com/${repository}`,
    "Published provenance has the wrong repository.",
  );
  assert(workflow?.path === workflowPath, "Published provenance has the wrong workflow path.");
  assert(workflow?.ref === ref, "Published provenance has the wrong Git ref.");

  const dependency = definition?.resolvedDependencies?.find(
    (candidate) => candidate.uri === `git+https://github.com/${repository}@${ref}`,
  );
  assert(dependency, "Published provenance is missing the release source dependency.");
  assert(dependency.digest?.gitCommit === commit, "Published provenance has the wrong commit.");
}

async function verifyPublishedPackage(manifest, digest) {
  const escapedName = encodeURIComponent(manifest.name);
  const escapedVersion = encodeURIComponent(manifest.version);
  const registryManifest = await fetchJson(
    `${registryOrigin}/${escapedName}/${escapedVersion}`,
    true,
  );
  if (registryManifest === undefined) {
    return false;
  }

  assert(
    registryManifest.dist?.integrity === digest.integrity,
    `${manifest.name}@${manifest.version} already exists with different tarball integrity.`,
  );
  const attestationLocation = registryManifest.dist?.attestations?.url;
  assert(typeof attestationLocation === "string", "Published package is missing provenance.");
  const attestationUrl = new URL(attestationLocation);
  assert(
    attestationUrl.origin === registryOrigin,
    "Published attestation URL has an unexpected origin.",
  );
  assert(
    attestationUrl.pathname.startsWith("/-/npm/v1/attestations/"),
    "Published attestation URL has an unexpected path.",
  );
  const statement = decodeProvenance(await fetchJson(attestationUrl));
  verifyProvenance(statement, manifest, digest);
  return true;
}

async function waitForPublishedPackage(manifest, digest) {
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      if (await verifyPublishedPackage(manifest, digest)) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000));
  }
  throw (
    lastError ?? new Error("Published package did not appear in the registry within 60 seconds.")
  );
}

async function main() {
  const { tarball } = parseOptions(process.argv.slice(2));
  const manifest = readPackedManifest(tarball);
  const repositoryManifest = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  assert(
    manifest.name === repositoryManifest.name,
    "Packed package name does not match package.json.",
  );
  assert(
    manifest.version === repositoryManifest.version,
    "Packed version does not match package.json.",
  );

  const digest = tarballDigests(tarball);
  if (await verifyPublishedPackage(manifest, digest)) {
    console.log(
      `${manifest.name}@${manifest.version} is already published with matching integrity and provenance.`,
    );
    return;
  }

  run("npm", ["publish", tarball, "--access", "public", "--provenance"]);
  await waitForPublishedPackage(manifest, digest);
  console.log(
    `Verified ${manifest.name}@${manifest.version} integrity and provenance after publication.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
