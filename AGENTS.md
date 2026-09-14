# Agent Instructions

## Engineering approach

- While the package major version is `0`, backward compatibility is not a default requirement for public APIs, internal evidence contracts, or deployed state. Prefer a clean break with a concrete benefit, and move all callers, tests, and documentation together. Name upgrade-time replacement or deletion effects in the PR and release notes. This policy expires at `1.0.0`.
- The AWS CDK `BucketDeployment` migration guide is adopter onboarding, not a compatibility path; keep it accurate when the construct API changes.
- Do not modify authored `README.md` prose without an explicit request. Report any update made necessary by a change. Regenerating benchmark snapshot SVGs and their README embeds is allowed; do not mention an example snapshot path in tracked Markdown because the snapshot-inventory test treats every such reference as required output.
- For changes to construct behavior, public API, or provider architecture, check how upstream AWS CDK `BucketDeployment` and other established projects solve the same problem, and adopt proven patterns when they fit this package's constraints.
- Pull requests are squash-merged, so `main` carries one commit per PR. Split work into separate PRs whenever changes need independent revert, release, blame, or bisect boundaries. Review and edit the squash message GitHub proposes for a multi-commit PR; the concatenated commit bodies are usually noisy.

## Required skills

Read the relevant repo-local skill before benchmark or verification work:

- Benchmark and AWS CDK `BucketDeployment` comparison tasks: read `.agents/skills/shin-benchmark/SKILL.md`.
- Correctness verification tasks: read `.agents/skills/shin-verification/SKILL.md`.

## Verification, benchmarks, and evidence

AWS verification and benchmarks are opt-in, cost-bearing workflows. Do not run them unless the task calls for live AWS evidence; use the smallest relevant scope and follow the selected skill's cleanup and publication rules.

Keep raw AWS output and identifiers outside the repository. In committed material and final reports, refer to maintainer-supplied profile names only as the configured test profile.

Keep correctness evidence in `docs/verification.md` and performance or upstream-comparison evidence in `docs/benchmark.md` plus the benchmark JSONL records. Neither evidence class substitutes for the other.

Performance remains a product constraint. For performance-sensitive provider changes, avoid unmeasured per-byte or per-object work, reuse data already produced by the transfer path, and leave acceptance pending until comparable Shin and upstream evidence is committed through the benchmark workflow.

For diagnostics design changes, use the Diagnostics reference in `docs/architecture.md`: keep aggregate deployment or object counters and phase timings in standard mode, and retain per-attempt state only in `FailureDiagnostics.DETAILED`.

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
