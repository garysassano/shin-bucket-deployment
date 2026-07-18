# Agent Instructions

Use the repo-local skill files before benchmark or verification work:

- Benchmark and AWS CDK `BucketDeployment` comparison tasks: read `.agents/skills/shin-benchmark/SKILL.md`.
- Correctness verification tasks: read `.agents/skills/shin-verification/SKILL.md`.

Keep benchmark evidence and verification evidence separate:

- `docs/benchmark.md` and `benchmarks/results.jsonl` are for performance, efficiency, and upstream AWS CDK `BucketDeployment` comparisons.
- `docs/verification.md` is the latest `ShinBucketDeployment` correctness snapshot.
- Do not use benchmark rows or upstream AWS `BucketDeployment` comparison rows as verification evidence.

Treat performance as a primary product constraint. Shin must materially outperform
upstream AWS CDK `BucketDeployment` on its target workloads; correctness alone is
not sufficient for a performance-sensitive data-path change.

- Do not add an unmeasured per-byte or per-object pass, hash, network request,
  payload copy, allocation, or whole-entry materialization to a normal path.
- Reuse bytes, digests, listings, and validation work already produced by the
  transfer path whenever possible.
- Before merging or releasing a performance-relevant provider change, collect
  comparable before/after Shin evidence and an upstream AWS CDK baseline with
  the relevant provider telemetry. If evidence is still pending, say so
  explicitly instead of presenting the change as performance-accepted.
- Keep those measurements in benchmark evidence; correctness scenarios and
  `docs/verification.md` do not establish a performance win.

Never commit raw AWS evidence or identifiers:

- account IDs
- ARNs
- bucket names
- CloudFront distribution IDs
- stack-specific physical IDs
- request IDs
- ETags
- raw CDK deploy logs
- raw CloudWatch log exports
- AWS profile names

Treat maintainer-supplied AWS profile names as local-only command inputs. Do not
repeat them in committed docs, PR text, evidence summaries, or final reports;
refer to the configured test profile generically.

Name ordered verification scenario templates with `-initial` and `-updated`
suffixes. Do not use `v1`/`v2`, `alpha`/`beta`, or other release-like labels for
scenario phases. Use a descriptive suffix such as `-bucket-only` for terminal
shape changes.

Keep destructive destination behavior under the phase-oriented
`destinationLifecycle` API:

- `onDeploy.deleteStaleObjects` controls stale-object deletion on Create
  and Update.
- `onChange.deletePreviousObjects` controls previous-namespace deletion when
  destination settings change; `previousBucket` authorizes a changed previous
  bucket and is omitted for same-bucket prefix changes.
- `onChange.invalidatePreviousDistribution` independently authorizes a changed
  previous CloudFront distribution.
- `onDelete.deleteCurrentObjects` controls current-namespace deletion on
  custom-resource Delete.

Do not reintroduce the public `prune`, `retainOnDelete`, or flat lifecycle
aliases. CloudFormation supplies the previous prefix at runtime through
`OldResourceProperties`; changed previous buckets and distributions remain
explicit synthesis-time inputs for IAM and dependencies.

Keep raw AWS output in scratch directories outside the repo. Commit only sanitized docs, benchmark result rows, source, tests, and scenarios.

For benchmark telemetry interpretation, use the `docs/architecture.md` Diagnostics field reference. Do not infer S3 throttling from source block refetches or waits unless the provider summary also shows source `getRetries`/`getErrors` or destination `putObject.throttledAttempts`/`retryAttempts`.

## Toolchain and package compatibility policy

This repo is a CDK construct library, not a bundled application. Keep local
development defaults separate from the published npm package contract:

- Use `mise.toml` as the source of truth for contributor tools. Internal
  development and CI should run on Node.js 24 or newer because Node.js 20 is
  end-of-life.
- Keep `package.json` `engines.node` as the consumer contract for the published
  construct package. It should allow Node.js 22 or newer unless the emitted
  package code starts requiring a newer runtime.
- Do not add `devEngines` for the Node version while `mise.toml` already
  expresses the local toolchain. Avoid maintaining the same internal runtime
  rule in two places.
- Build the published TypeScript package for Node.js 22 compatibility. Use an
  ES2022 package target, matching current upstream AWS CDK construct-library
  practice.
- Keep the published JavaScript CommonJS-compatible. Current upstream AWS CDK
  construct packages use `module: "Node20"` with no package-level
  `"type": "module"`; that models modern Node package rules while still
  emitting CommonJS-shaped `.js` for this package shape.
- Avoid legacy TypeScript 7 settings such as `moduleResolution: "node"` or
  `"node10"`. They are deprecated. Prefer `module: "Node20"` for package output
  and omit `moduleResolution` unless there is a concrete compiler error that
  requires an explicit modern resolver.
- For app/scenario/test code, `tsconfig.json` may stay more modern than the
  published package config. The package config is the npm compatibility boundary.
