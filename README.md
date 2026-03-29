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
- local CDK CLI: `aws-cdk`

Useful commands:

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm rust:check`
- `pnpm example:synth`
- `pnpm example:deploy`
- `pnpm example:destroy`
- `pnpm example:replacements:synth`
- `pnpm example:replacements:deploy`
- `pnpm example:replacements:destroy`

Example apps:

- [examples/simple-app.ts](./examples/simple-app.ts)
  - plain asset deployment under `site/`
- [examples/replacement-matrix-app.ts](./examples/replacement-matrix-app.ts)
  - end-to-end replacement matrix covering `Source.data(...)`, `Source.yamlData(...)`, `Source.jsonData(..., { escape: false })`, `Source.jsonData(..., { escape: true })`, and mixed sources in one deployment
  - after deployment, use the emitted `Verify*Command` outputs to fetch each generated runtime file from S3

If your default Rust toolchain is not the one you want `cargo lambda` to use,
set `RUSTUP_TOOLCHAIN` before running the TypeScript tests or synthesis.

The Rust provider lives under [rust](./rust), the construct code under [src](./src),
and provenance notes under [.codex/reference](./.codex/reference).
