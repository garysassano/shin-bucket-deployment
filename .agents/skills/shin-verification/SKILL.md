---
name: shin-verification
description: |
  Run, sanitize, document, and commit the latest ShinBucketDeployment correctness verification snapshot.

  Use this skill when:
  1. Running local correctness gates for this repository
  2. Running AWS end-to-end verification scenarios where the provider Lambda runs in AWS
  3. Updating docs/verification.md
  4. Reviewing whether verification evidence is safe to commit
---

# Shin Verification Workflow

This skill is for correctness evidence only. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `benchmarks/results.jsonl`.

## Source Of Truth

- `docs/verification.md` is the latest human verification snapshot.
- Verification does not keep append-only committed history.
- Deployable correctness apps live in `scenarios/apps/**` and are run through `pnpm verify`.
- Raw AWS logs, CloudWatch extracts, and scratch outputs must stay outside git.

## Sanitization Rules

Never commit:

- AWS account IDs
- ARNs
- bucket names
- CloudFront distribution IDs
- stack-specific physical IDs
- request IDs
- object keys from private/user data
- ETags
- raw CDK deploy logs
- raw CloudWatch log exports
- profile names

Treat a maintainer-supplied AWS profile name as a local-only command input. In committed docs, PR text, evidence summaries, and final reports, refer to it only as the configured test profile.

Committed verification docs may include:

- region
- commit SHA and subject
- scenario names
- sanitized pass/fail or known-limitation status
- sanitized aggregate counters when they are relevant to correctness
- cleanup status
- notes without resource identifiers

## Verification Categories

Verification covers correctness of `ShinBucketDeployment`, not benchmark efficiency and not comparison with upstream AWS CDK `BucketDeployment`.

Use these categories:

- `local`: unit tests, static checks, build/typecheck/lint, and local synthesis.
- `aws`: deployed AWS end-to-end checks where the custom resource Lambda runs in AWS.

Benchmark rows and AWS `BucketDeployment` comparison rows belong in `benchmarks/results.jsonl`, not in verification docs.

## Local Verification

Run local unit/static gates first:

```bash
pnpm rust:fmt
pnpm rust:check
cargo test --manifest-path rust/Cargo.toml
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Local synthesis should cover every default verification scenario:

```bash
pnpm verify list
pnpm verify synth
```

Do not include benchmark configs in correctness verification unless the task is explicitly about benchmark harness health.

## AWS End-To-End Verification

AWS end-to-end verification is opt-in because it creates billable AWS resources and requests. Never run it automatically for every push or pull request. Run local gates first, then choose the smallest AWS scope that can validate the changed boundary.

Do not run AWS verification for documentation, formatting, workflow syntax, local validation, synthesis-only API changes, or refactors whose deployed template/provider behavior is proven unchanged. Record why no AWS run was needed when documenting meaningful verification work.

Use a targeted scenario or ordered chain when a change affects a narrow AWS boundary. Examples include:

- S3 object or lifecycle behavior: the directly affected create/update/delete chain
- destination identity, lifecycle, or ownership: `replacement-safety-initial` / `replacement-safety-updated`
- CloudFront invalidation: the relevant `cloudfront-*-initial` / `cloudfront-*-updated` chain
- KMS or DSSE behavior: the affected encryption scenario
- scenario assertions or IAM: the scenarios whose verifier or grants changed

Run the full suite only when a change crosses several scenario groups, changes shared provider or scenario-runner behavior, changes the common assertion/cleanup infrastructure, or is an intentionally selected release candidate that needs a fresh combined snapshot. A release does not require a full rerun when no relevant deployed boundary changed after the latest successful evidence.

The GitHub AWS Verification workflow is deliberately `workflow_dispatch`-only. It runs the full matrix and requires an exact 40-character commit. Do not add push, pull-request, merge, or schedule triggers. A human must make and record the cost/scope decision before dispatch. For targeted checks, use the shared scenario runner rather than dispatching the full workflow.

AWS end-to-end verification must verify S3, KMS, CloudFormation, and CloudFront state where applicable. A named phase runs only that phase; invoke every phase of an ordered chain in order. When no scenario name is supplied, the runner executes the full default suite:

```bash
pnpm verify deploy <scenario>
pnpm verify destroy <cleanup-scenario>

# Full suite: use only at the decision points described above.
pnpm verify deploy --concurrency 4
pnpm verify destroy --concurrency 4
```

The runner preserves ordered update chains such as `*-initial` before `*-updated`, while running independent chains concurrently. Scenario phases use these suffixes rather than release-like `v1`/`v2` or `alpha`/`beta` labels. Use `--concurrency 1` for serial debugging.

The default suite includes:

- simple create/update/destroy
- root-prefix deployment without `destinationKeyPrefix`
- include/exclude filters
- marker replacement
- stale-object cleanup during deployment
- stale-object retention with `onDeploy.deleteStaleObjects=false`
- default object retention across update/delete
- `extract=false`
- explicit previous-object deletion on destination change and current-object deletion on Delete
- duplicate source overwrite order
- larger archive ranged-read path
- customer-managed KMS, AWS-managed KMS, and managed DSSE destination buckets
- CloudFront sync/async invalidation with explicit and default invalidation paths

Lifecycle scenarios and assertions must use the public phase names `onDeploy`, `onChange`, and `onDelete`. Use `deleteStaleObjects`, `onChange.deletePreviousObjects`, `onChange.previousBucket`, `onChange.invalidatePreviousDistribution`, and `onDelete.deleteCurrentObjects` for the actions and cross-bucket target. Do not describe the public behavior as `prune` or `retainOnDelete`.

### Destination-Move Revalidation Boundary

Keep the destination-move protocol tests and scenario synthesis in the normal local and CI gates. Rerun the targeted `replacement-safety-initial` / `replacement-safety-updated` AWS chain when a change can affect any of these boundaries:

- CloudFormation request handling, callback responses, or physical resource IDs
- destination lifecycle mapping, update ordering, or previous/current cleanup
- namespace-overlap classification or destination ownership protection
- current/previous destination or CloudFront IAM and dependencies
- handler identity, service-token changes, or custom-resource replacement
- the destination-move scenarios, verifier, or scenario runner

Changes outside those boundaries do not require this targeted matrix merely because they share a release. Before a release, require a current successful destination-move AWS run only if one of the boundaries changed after the latest recorded successful run. Record the sanitized result and confirmed cleanup in `docs/verification.md`.

Always destroy every started AWS verification stack and independently verify its scoped resources are absent before finalizing `docs/verification.md`. Cleanup failure is a failed verification run, not a warning. Raw AWS logs and resource identifiers stay in scratch only.

## Verification Human Page

Update `docs/verification.md` for humans after meaningful validation changes.

The human page should include:

- current coverage table
- latest verification run summary
- known limitations
- cleanup status
- raw-evidence exclusion note

## Final Checks

Before committing verification updates:

```bash
git diff --check
pnpm verify synth
```

Run broader `pnpm typecheck`, `pnpm lint`, and `pnpm test` if source, scripts, or validation-sensitive scenarios changed.

Only commit sanitized docs, source, tests, and scenarios. Never commit scratch raw output.
