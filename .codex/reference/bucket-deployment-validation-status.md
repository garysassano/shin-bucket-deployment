# `CargoBucketDeployment` Validation Status

This note records what has actually been tested in the standalone Rust-backed `CargoBucketDeployment` prototype, what is still missing, and what follow-up implementations are still reasonable.

## Scope

This status note applies to the standalone prototype in:

- `/home/user/github/cargo-bucket-deployment`

It is not a statement about full parity with `aws-cdk-lib` `BucketDeployment`.

## What has been tested

## Local static and synth validation

The following local checks have been run successfully during development:

- `pnpm exec tsc --noEmit`
- `pnpm exec biome check .`
- `pnpm test`
- `cargo test --manifest-path rust/Cargo.toml`
- `pnpm run example:synth`
- `pnpm run example:replacements:synth`

These checks validate:

- TypeScript compile health
- Biome formatting/linting
- custom-resource synthesis shape
- Rust replacement logic in unit tests
- Lambda bundling through `cargo-lambda-cdk`

## Synth-level coverage

The synth-side tests in `test/replacement-paths.test.ts` currently cover:

- `Source.data(...)` marker wiring
- `Source.yamlData(...)` marker wiring
- `Source.data(..., { jsonEscape: true })` marker config wiring
- `Source.jsonData(..., { escape: false })` marker config wiring
- `Source.jsonData(..., { escape: true })` marker config wiring
- mixed-source `SourceMarkers` / `SourceMarkersConfig` alignment across:
  - asset source
  - plain data source
  - escaped and non-escaped JSON data sources
  - YAML data source

What these tests prove:

- the construct emits the expected custom-resource properties
- per-source marker arrays stay aligned across mixed source types
- `jsonEscape` reaches the Rust handler through the custom resource

What they do not prove:

- actual S3 object contents after deployment
- CloudFormation lifecycle behavior
- IAM correctness in AWS

## Rust unit-test coverage

The Rust unit tests in `rust/src/main.rs` currently cover:

- repeated replacement of the same marker in one file
- replacement of multiple distinct markers in one file
- plain replacement of pre-quoted JSON fragments
- `jsonEscape` without double-escaping already-quoted JSON fragments
- `jsonEscape` with quoted token values containing quotes and backslashes
- `jsonEscape` with raw string content inserted into an already-quoted JSON string

What these tests prove:

- the in-memory replacement engine behaves correctly for the currently implemented replacement modes
- the earlier double-escaping bug in the JSON-aware path is fixed

What they do not prove:

- actual deploy-time behavior in Lambda against S3
- end-to-end object contents after CloudFormation deployment

## End-to-end AWS coverage

The most important deployed example now is:

- `examples/replacement-matrix-app.ts`

That example was deployed to AWS and the resulting runtime files were fetched from S3.

### Files created and checked

The deployed `site/runtime/` prefix contained:

- `plain.txt`
- `raw.json`
- `escaped.json`
- `from-data-raw.json`
- `from-data-escaped.json`
- `config.yaml`

### End-to-end results

#### `plain.txt`

Observed result:

- stack name resolved
- region resolved
- repeated token resolved correctly
- bucket name resolved

Conclusion:

- plain text replacement works end to end

#### `config.yaml`

Observed result:

- stack name resolved
- region resolved
- bucket name resolved
- YAML remained valid

Conclusion:

- `Source.yamlData(...)` works end to end

#### `escaped.json`

Observed result:

- JSON remained valid
- all normal token fields resolved
- `specialValue` contained quotes and a backslash, and those characters were correctly escaped

Conclusion:

- `Source.jsonData(..., { escape: true })` works end to end for the important special-character case

#### `from-data-escaped.json`

Observed result:

- JSON remained valid
- `specialValue` contained quotes and a backslash, and those characters were correctly escaped

Conclusion:

- `Source.data(..., { jsonEscape: true })` works end to end

#### `raw.json`

Observed result:

- file became invalid JSON when the deploy-time token contained quotes and a backslash

Conclusion:

- `Source.jsonData(..., { escape: false })` is correctly acting as the negative control in this scenario
- without JSON-aware escaping, token values with special characters can break JSON output

#### `from-data-raw.json`

Observed result:

- file became invalid JSON when the deploy-time token contained quotes and a backslash

Conclusion:

- plain `Source.data(...)` inside quoted JSON content is also correctly acting as the negative control
- without `jsonEscape`, raw token substitution is not safe inside JSON string contexts

## What is now well covered

The replacement semantics are now in good shape across three levels:

- synth wiring
- Rust runtime logic
- real AWS deployment output

In particular, the following replacement behavior is now meaningfully covered:

- plain replacement
- YAML replacement
- JSON-aware replacement
- repeated tokens
- mixed sources
- special-character token values
- negative-control cases that should fail without escaping

## What is still missing

The prototype is still not fully validated end to end.

## Deployment-engine behavior not yet proven in AWS

The following important behaviors still need end-to-end coverage:

- `extract=false`
- direct `CopyObject` path
- include/exclude filters
- `prune` on update
- delete behavior on stack destroy
- `retainOnDelete`
- destination change on update
- overwrite order when multiple sources produce the same key
- ownership-tag delete safety
- metadata application:
  - user metadata
  - cache control
  - content type
  - content encoding
  - content disposition
  - storage class
  - ACL
  - SSE / KMS metadata
- CloudFront invalidation behavior
- `Source.bucket(...)` with external zip inputs

## Artifact-format and compatibility gaps

These are still either untested or intentionally limited:

- ZIP archives using uncommon compression methods from third-party producers
- current Rust `zip` feature set does not target full support for:
  - `bzip2`
  - `lzma/xz`
  - `zstd`
- large/binary-heavy archives have not been benchmarked formally
- no formal performance comparison has been captured against the original Python handler

## Custom-resource lifecycle gaps

The following design behavior is understood but not improved yet:

- provider code changes alone do not necessarily force redeployment of existing bucket contents
- this matches the general custom-resource update model, but it is awkward during provider iteration

## Reasonable next implementations

## Highest-value next tests

The next end-to-end examples worth adding are:

- `extract=false` example
  - prove direct zip copy path works correctly
- prune/update example
  - deploy one source set, update it, verify removed files are deleted when `prune=true`
- overwrite-order example
  - deploy multiple sources that produce the same key and verify last-wins semantics
- metadata example
  - verify object metadata on real S3 objects
- CloudFront invalidation example
  - only if CloudFront support is intended to stay in scope for the prototype

## Reasonable implementation follow-ups

The following follow-ups still make sense:

- add a public force-rerun property such as `deploymentRevision`
- optionally add an opt-in provider-change rerun mechanism later
- add broader integration coverage for `Source.bucket(...)`
- add support for more ZIP compression methods if broad third-party zip compatibility matters
- add benchmark scenarios comparing:
  - original Python `BucketDeployment`
  - current Rust V1 prototype
- add more focused handler-event tests for:
  - `Create`
  - `Update`
  - `Delete`
  - old/new destination transitions

## Not yet implemented by design

The following ideas were discussed but intentionally not built yet:

- automatic provider-version forcing on every code change
- range-based V2 zip engine
- per-file placeholder detection inside marked sources
- a broader redesign around a fully streamed object-manifest engine

Those may still be worthwhile later, but they are beyond the current validated scope of the prototype.
