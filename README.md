# CargoBucketDeployment

Local prototype of a Rust-backed `BucketDeployment` alternative.

This package is standalone. It uses published `aws-cdk-lib` packages plus
[`cargo-lambda-cdk`](https://github.com/cargo-lambda/cargo-lambda-cdk) for the
provider Lambda, and keeps the analysis and provenance notes under
[.codex/reference](./.codex/reference).

Current scope:

- custom construct: `CargoBucketDeployment`
- provider runtime: Rust on Lambda `provided.al2023` via `RustFunction`
- deployment engine: pragmatic V1
  - `extract=false` uses direct `CopyObject`
  - `extract=true` downloads the source zip, plans a manifest from the archive,
    and uploads entries without materializing a full extracted tree
  - entries that need deploy-time marker replacement are rewritten in-memory
  - entries without substitutions are staged one at a time, not as a whole tree

Notable limitations in this prototype:

- it is not packaged as a publishable construct library yet
- it assumes `cargo lambda` is available locally at synth time
- it is not integrated into `aws-cdk-lib`'s custom-resource handler generation
- it does not support `useEfs`
- it rejects `expires`
- it rejects `signContent`
- it rejects `serverSideEncryptionCustomerAlgorithm`
- it has only been validated with synth-level tests in this environment

Tooling:

- package manager: `pnpm`
- TypeScript tests: `vitest`
- formatter/lint runner: `biome`

Useful commands:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm rust:check`

If your default Rust toolchain is not the one you want `cargo lambda` to use,
set `RUSTUP_TOOLCHAIN` before running the TypeScript tests or synthesis.

The Rust provider lives under [rust](./rust), the construct code under [src](./src),
and provenance notes under [.codex/reference](./.codex/reference).
