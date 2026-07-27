# Security policy

## Supported versions

Security fixes are provided for the latest published version only. Versions
`0.1.1` through `0.1.4` must not be deployed because their packaged Lambda
entrypoint is not executable. Upgrade to `0.1.5` or later.

## Report a vulnerability

Use GitHub's **Report a vulnerability** form on the repository Security page.
This creates a private report that can be discussed and fixed before public
disclosure. Do not open a public issue for a suspected vulnerability.

Include the affected version, impact, reproduction steps or a minimal proof of
concept, and any suggested mitigation. Do not include credentials, presigned
URLs, AWS identifiers, private bucket names, or user data.

The maintainer will acknowledge a complete report within seven days and will
coordinate remediation and disclosure based on severity. Please allow a
reasonable remediation window before publishing details.

## Scope

Security reports may cover the TypeScript construct, generated IAM and
CloudFormation, the Rust Lambda provider, package/release integrity, or the
repository's supported build and deployment workflows.

## Supply chain

The published package is built and released from pinned, recorded inputs.

**Toolchain.** `mise.toml` pins the provider build toolchain to exact versions —
Rust, `cargo-lambda`, and `zig` — because those determine the shipped binary
bytes. Node and pnpm track a major there; the published JavaScript is a
TypeScript compilation governed by the committed `tsconfig` targets. The shipped `bootstrap.zip` binaries are prebuilt
and committed, so a floating toolchain would let the same tag rebuild to
different bytes. Each architecture also carries a `build-provenance.json`
recording the exact `rustc`, `cargo`, `cargo-lambda`, and `zig` versions, the
source tree hash, and the resulting binary and archive digests. A combined
`buildToolchainSha256` additionally commits to the SHA-256 of each build
executable and the Cargo configuration, so a changed toolchain is detectable even
when the reported versions match; those executable digests are inputs to that
hash rather than separate fields.

**Publication.** Releases run `npm publish --provenance` from an
environment-scoped OIDC job with no long-lived npm token, and `scripts/publish-package.mjs` then re-fetches the
published package and verifies its SLSA provenance attestation: predicate type,
package subject, tarball digest, source repository, workflow path, Git ref, and
commit. Publication fails if any of those do not match. Because the
`bootstrap.zip` archives and their provenance files ship inside the tarball, that
attestation covers the shipped provider binaries as well.

**Dependency advisories.** `pnpm audit` runs at `--audit-level high` and
`cargo audit` runs against the committed lockfile on every change. The npm
threshold is deliberately `high` rather than `moderate`: this repository's npm
dependencies are almost entirely development-time (build, test, and synthesis
tooling) and are not part of the published runtime, so a lower threshold would
block changes on advisories that cannot reach a consumer. Advisories that do
reach the published package are in scope regardless of severity — report them.

`cargo deny` additionally denies yanked crates. Where a suppression is
genuinely unavoidable it is documented in place and tracked by an issue with a
removal condition.
