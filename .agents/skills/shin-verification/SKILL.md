---
name: shin-verification
description: |
  Run, collect, sanitize, document, and commit ShinBucketDeployment correctness verification evidence.

  Use this skill when:
  1. Running local correctness gates for this repository
  2. Running AWS end-to-end verification scenarios where the provider Lambda runs in AWS
  3. Updating docs/verification.md or docs/verification-history.jsonl
  4. Reviewing whether verification evidence is safe to commit
---

# Shin Verification Workflow

This skill is for correctness evidence only. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `docs/benchmark-history.jsonl`.

## Source Of Truth

- `docs/verification.md` is the human verification page.
- `docs/verification-history.jsonl` is the append-only full verification history.
- `docs/benchmark.md` and `docs/benchmark-history.jsonl` own performance and comparison evidence.
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

Committed verification records may include:

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

Benchmark records and AWS `BucketDeployment` comparison records belong in `docs/benchmark-history.jsonl`, not verification history.

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

Local synthesis should cover public ShinBucketDeployment examples:

```bash
pnpm example list
pnpm example synth simple
pnpm example synth replacement
pnpm example synth metadata-filters
pnpm example synth prune-update-v1
pnpm example synth prune-update-v2
pnpm example synth retain-on-delete-v1
pnpm example synth retain-on-delete-v2
pnpm example synth extract-false
pnpm example synth retain-on-delete-false-v1
pnpm example synth retain-on-delete-false-v2
pnpm example synth retain-on-delete-false-bucket-only
pnpm example synth multi-source-overwrite
pnpm example synth large-archive
pnpm example synth kms-destination
pnpm example synth cloudfront-sync
pnpm example synth cloudfront-async
```

Do not include `benchmark-assets` or `benchmark-assets-aws` in correctness verification synthesis unless the task is explicitly about benchmark harness health.

## AWS End-To-End Verification

AWS end-to-end scenarios deploy real stacks and must verify S3, KMS, CloudFormation, and CloudFront state where applicable. They include:

- simple create/update/destroy
- metadata and include/exclude filters
- marker replacement
- prune update
- retain-on-delete update/delete
- `extract=false`
- `retainOnDelete=false` cleanup
- duplicate multi-source overwrite order
- larger archive ranged-read path
- KMS-encrypted destination bucket
- CloudFront sync and async invalidation

Always destroy AWS verification stacks and verify they are absent before finalizing records. Raw AWS logs and resource identifiers stay in scratch only.

## Verification Records

Append one JSON object per verification scenario to `docs/verification-history.jsonl`.

Recommended fields:

- `schemaVersion`: current value `1`
- `runId`
- `runDate`
- `commit`
- `subject`
- `region`
- `category`: `local` or `aws`
- `scenario`
- `command`
- `status`: `pass`, `fail`, `known-limitation`, or `not-run`
- `evidence`
- `cleanup`
- `notes`

Keep verification records sanitized. Do not include raw output or identifiers.

## Verification Human Page

Update `docs/verification.md` for humans after meaningful validation changes.

The human page should include:

- current coverage table
- latest verification run summary
- known limitations
- pointers to `docs/verification-history.jsonl` for full history

## Final Checks

Before committing verification updates:

```bash
node -e "const fs=require('fs'); const f='docs/verification-history.jsonl'; const lines=fs.readFileSync(f,'utf8').trimEnd().split(/\\n/); lines.forEach((line)=>JSON.parse(line)); console.log(f+': '+lines.length+' JSONL rows ok');"
git diff --check
```

Run broader `pnpm typecheck`, `pnpm lint`, and `pnpm test` if source, scripts, or validation-sensitive examples changed.

Only commit sanitized docs, JSONL histories, scripts, and tests. Never commit scratch raw output.
