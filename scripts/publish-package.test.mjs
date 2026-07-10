import assert from "node:assert/strict";
import test from "node:test";
import { decodeProvenance, packagePurl, verifyProvenance } from "./publish-package.mjs";

const manifest = { name: "shin-bucket-deployment", version: "0.1.5" };
const digest = { hex: "a".repeat(128) };

function provenanceStatement(overrides = {}) {
  return {
    subject: [
      {
        name: packagePurl(manifest.name, manifest.version),
        digest: { sha512: overrides.subjectDigest ?? digest.hex },
      },
    ],
    predicate: {
      buildDefinition: {
        externalParameters: {
          workflow: {
            repository: "https://github.com/garysassano/shin-bucket-deployment",
            path: ".github/workflows/release.yml",
            ref: "refs/tags/v0.1.5",
          },
        },
        resolvedDependencies: [
          {
            uri: "git+https://github.com/garysassano/shin-bucket-deployment@refs/tags/v0.1.5",
            digest: { gitCommit: overrides.commit ?? "1".repeat(40) },
          },
        ],
      },
    },
  };
}

function withGitHubEnvironment(callback) {
  const original = {
    GITHUB_REF: process.env.GITHUB_REF,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_SHA: process.env.GITHUB_SHA,
    GITHUB_WORKFLOW_REF: process.env.GITHUB_WORKFLOW_REF,
  };
  Object.assign(process.env, {
    GITHUB_REF: "refs/tags/v0.1.5",
    GITHUB_REPOSITORY: "garysassano/shin-bucket-deployment",
    GITHUB_SHA: "1".repeat(40),
    GITHUB_WORKFLOW_REF:
      "garysassano/shin-bucket-deployment/.github/workflows/release.yml@refs/tags/v0.1.5",
  });
  try {
    callback();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("accepts matching package provenance", () => {
  withGitHubEnvironment(() => verifyProvenance(provenanceStatement(), manifest, digest));
});

test("rejects provenance for another commit", () => {
  withGitHubEnvironment(() => {
    assert.throws(
      () => verifyProvenance(provenanceStatement({ commit: "2".repeat(40) }), manifest, digest),
      /wrong commit/,
    );
  });
});

test("rejects provenance for another tarball digest", () => {
  withGitHubEnvironment(() => {
    assert.throws(
      () =>
        verifyProvenance(provenanceStatement({ subjectDigest: "b".repeat(128) }), manifest, digest),
      /wrong tarball digest/,
    );
  });
});

test("decodes a DSSE provenance payload", () => {
  const statement = provenanceStatement();
  const payload = Buffer.from(JSON.stringify(statement)).toString("base64");
  assert.deepEqual(
    decodeProvenance({
      attestations: [
        {
          predicateType: "https://slsa.dev/provenance/v1",
          bundle: { dsseEnvelope: { payload } },
        },
      ],
    }),
    statement,
  );
});

test("encodes scoped npm package subjects", () => {
  assert.equal(packagePurl("@scope/package", "1.2.3"), "pkg:npm/%40scope/package@1.2.3");
});
