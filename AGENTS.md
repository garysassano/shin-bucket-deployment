# Agent Instructions

Use the repo-local skill files before benchmark or verification work:

- Benchmark and AWS CDK `BucketDeployment` comparison tasks: read `.agents/skills/shin-benchmark/SKILL.md`.
- Correctness verification tasks: read `.agents/skills/shin-verification/SKILL.md`.

Keep benchmark evidence and verification evidence separate:

- `docs/benchmark.md` and `benchmarks/results.jsonl` are for performance, efficiency, and upstream AWS CDK `BucketDeployment` comparisons.
- `docs/verification.md` is the latest `ShinBucketDeployment` correctness snapshot.
- Do not use benchmark rows or upstream AWS `BucketDeployment` comparison rows as verification evidence.

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
