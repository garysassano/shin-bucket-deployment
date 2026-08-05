# Agent Instructions

## Engineering approach

- While the package major version is `0`, backward compatibility is not a default requirement. Prefer removing obsolete paths over adding compatibility layers, fallbacks, aliases, or migrations. Breaking changes must still have a concrete benefit, and all in-repo callers, tests, and documentation must move to the new contract together. This policy expires when the package reaches `1.0.0`; from that point, preserve compatibility according to semantic versioning and documented commitments.
- "Backward compatibility" here means only this package's own internal contracts: the construct's public API shape, the provider request and diagnostics schema, benchmark evidence schemas, and similar in-repo surfaces where supporting multiple concurrent versions is explicitly out of scope. It does **not** cover the consumer-facing migration guide from AWS CDK `BucketDeployment`. That guide is onboarding documentation for adopters, not a compatibility path — keep it accurate when the construct API changes, and never delete it as an "obsolete path."
- Do not modify `README.md` without an explicit request. It is consumer-facing documentation, not a place to reflect in-repo contract changes automatically. When a change would make the README inaccurate, flag the specific update needed and ask, rather than editing or removing sections on your own initiative.
- Before designing a solution, check how upstream AWS CDK `BucketDeployment` and other established projects solve the same problem, and adopt proven patterns when they fit this package's constraints.
- Pull requests are squash-merged, so `main` carries one commit per PR. Split work into separate PRs whenever changes need independent revert, release, blame, or bisect boundaries. Review and edit the squash message GitHub proposes for a multi-commit PR; the concatenated commit bodies are usually noisy.

## Required skills

Read the relevant repo-local skill before benchmark or verification work:

- Benchmark and AWS CDK `BucketDeployment` comparison tasks: read `.agents/skills/shin-benchmark/SKILL.md`.
- Correctness verification tasks: read `.agents/skills/shin-verification/SKILL.md`.

## Correctness verification

AWS correctness verification is opt-in, cost-bearing, and maintainer-run through `pnpm verify`; there is no hosted full-matrix workflow. Run local gates first and use the smallest relevant named verification group for a narrow deployed change. Reserve the full suite for changes spanning several groups, shared provider/runner/assertion behavior, or an intentionally selected release candidate. Do not recreate automatic push, pull-request, merge, or schedule verification; a future hosted workflow requires an explicit maintainer decision covering cost, least-privilege deployment access, and definitive cleanup access. Do not run AWS for docs, formatting, workflow syntax, local validation, or synthesis-only changes whose deployed behavior is proven unchanged.

Name ordered verification scenario templates with `-initial` and `-updated` suffixes. Do not use `v1`/`v2`, `alpha`/`beta`, or other release-like labels for scenario phases. Use a descriptive suffix such as `-bucket-only` for terminal shape changes.

## Evidence handling

Keep benchmark evidence and verification evidence separate:

- `docs/benchmark.md` and `benchmarks/results.jsonl` are for performance, efficiency, and upstream AWS CDK `BucketDeployment` comparisons.
- `docs/verification.md` is the latest `ShinBucketDeployment` correctness snapshot.
- Do not use benchmark rows or upstream AWS `BucketDeployment` comparison rows as verification evidence.

Keep raw AWS output in scratch directories outside the repo. Commit only sanitized docs, benchmark result rows, source, tests, and scenarios.

Never commit raw AWS evidence or identifiers:

- account IDs
- ARNs
- bucket names
- CloudFront distribution IDs
- stack-specific physical IDs
- request IDs
- object keys from private/user data
- ETags
- raw CDK deploy logs
- raw CloudWatch log exports
- AWS profile names

Treat maintainer-supplied AWS profile names as local-only command inputs. Do not repeat them in committed docs, PR text, evidence summaries, or final reports; refer to the configured test profile generically.

## Performance and benchmarks

Treat performance as a primary product constraint. Shin must materially outperform upstream AWS CDK `BucketDeployment` on its target workloads; correctness alone is not sufficient for a performance-sensitive data-path change.

- Do not add an unmeasured per-byte or per-object pass, hash, network request, payload copy, allocation, or whole-entry materialization to a normal path.
- Reuse bytes, digests, listings, and validation work already produced by the transfer path whenever possible.
- Before merging or releasing a performance-relevant provider change, collect comparable before/after Shin evidence and an upstream AWS CDK baseline with the relevant provider telemetry. If evidence is still pending, say so explicitly instead of presenting the change as performance-accepted.
- Persist every completed AWS benchmark run used to evaluate a change as validated sanitized rows in `benchmarks/results.jsonl`. Each Shin row must identify in `providerImplementationCommit` the exact clean commit on `main` that was measured, normally the squash commit produced by the implementation PR. Run performance-acceptance benchmarks only after the implementation is merged, then promptly commit the validated sanitized rows through a follow-up evidence PR. Do not call the workstream complete or performance-accepted until those rows are committed on `main` and retain the run UUID, provenance, telemetry, and cleanup outcome.
- Keep those measurements in benchmark evidence; correctness scenarios and `docs/verification.md` do not establish a performance win.

For benchmark telemetry interpretation, use the `docs/architecture.md` Diagnostics field reference. Do not infer S3 throttling from source block refetches or waits unless the provider summary also shows source `getRetries`/`getErrors` or destination `putObject.throttledAttempts`/`retryAttempts`.

## Destination lifecycle API

Keep destructive destination behavior under the phase-oriented `destinationLifecycle` API:

- `onDeploy.deleteStaleObjects` controls stale-object deletion on Create and Update.
- `onChange.deletePreviousObjects` controls previous-namespace deletion when destination settings change; `previousBucket` authorizes a changed previous bucket and is omitted for same-bucket prefix changes.
- `onChange.invalidatePreviousDistribution` independently authorizes a changed previous CloudFront distribution.
- `onDelete.deleteCurrentObjects` controls current-namespace deletion on custom-resource Delete.

Do not reintroduce the public `prune`, `retainOnDelete`, or flat lifecycle aliases. CloudFormation supplies the previous prefix at runtime through `OldResourceProperties`; changed previous buckets and distributions remain explicit synthesis-time inputs for IAM and dependencies.

## Toolchain and package compatibility

This repo is a CDK construct library, not a bundled application. Keep local development defaults separate from the published npm package contract:

- `mise.toml` is the source of truth for contributor tools; internal development and CI run on Node.js 24 or newer. Do not add `devEngines` for the Node version — it would duplicate that rule.
- `package.json` `engines.node` is the consumer contract for the published package. Allow Node.js 22 or newer unless the emitted package code starts requiring a newer runtime.
- Build the published package for Node.js 22 with an ES2022 target and CommonJS-compatible output: `module: "Node20"`, no package-level `"type": "module"`, matching current upstream AWS CDK construct-library practice.
- Avoid deprecated `moduleResolution: "node"`/`"node10"`. Omit `moduleResolution` unless a concrete compiler error requires an explicit modern resolver.
- App/scenario/test code in `tsconfig.json` may stay more modern; the package config is the npm compatibility boundary.
