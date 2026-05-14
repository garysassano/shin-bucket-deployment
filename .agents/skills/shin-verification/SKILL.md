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

AWS end-to-end verification deploys real stacks and must verify S3, KMS, CloudFormation, and CloudFront state where applicable. The shared scenario runner runs all default correctness scenarios when no scenario name is supplied:

```bash
pnpm verify deploy --concurrency 4
pnpm verify destroy --concurrency 4
```

The runner preserves ordered update chains such as `*-v1` before `*-v2`, while running independent chains concurrently. Use `--concurrency 1` for serial debugging.

The default suite includes:

- simple create/update/destroy
- root-prefix deployment without `destinationKeyPrefix`
- metadata and include/exclude filters
- marker replacement
- prune update
- `prune=false` update preservation
- retain-on-delete update/delete
- `extract=false`
- `retainOnDelete=false` cleanup
- duplicate source overwrite order
- larger archive ranged-read path
- KMS-encrypted destination bucket
- CloudFront wait/no-wait invalidation with explicit and default invalidation paths

Always destroy AWS verification stacks and verify they are absent before finalizing `docs/verification.md`. Raw AWS logs and resource identifiers stay in scratch only.

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
