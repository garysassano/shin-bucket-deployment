---
name: shin-benchmark
description: |
  Run, collect, sanitize, document, and commit ShinBucketDeployment benchmark evidence.

  Use this skill when:
  1. Running AWS benchmark scenarios for this repository
  2. Comparing ShinBucketDeployment with AWS CDK BucketDeployment
  3. Updating docs/benchmark.md or docs/benchmark-history.jsonl
  4. Reviewing whether benchmark evidence is safe to commit
---

# Shin Benchmark Workflow

This skill is for performance and efficiency evidence only. It does not establish correctness verification status for `ShinBucketDeployment`.

## Source Of Truth

- `docs/benchmark.md` is the human benchmark page.
- `docs/benchmark-history.jsonl` is the append-only full benchmark history.
- `docs/verification.md` and `docs/verification-history.jsonl` own correctness verification and must not use benchmark rows as verification evidence.
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

Committed benchmark records may include:

- region
- commit SHA and subject
- scenario, profile, variant, and phase names
- sanitized durations and memory
- sanitized aggregate counters
- cleanup status
- notes without resource identifiers

## Benchmark Workflow

Use paired inputs for Rust vs AWS comparisons:

- same region and account
- same profile
- same variants
- same destination prefix
- same memory setting
- same repetition count
- same stack suffix family

Standard focused Rust sequence:

```bash
AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
SHIN_BENCH_PROFILE=mixed SHIN_BENCH_VARIANT=v1 SHIN_BENCH_STACK_SUFFIX=<suffix> SHIN_BENCH_MEMORY_LIMIT_MB=1024 \
pnpm example deploy benchmark-assets -- --profile <profile>

AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
SHIN_BENCH_PROFILE=mixed SHIN_BENCH_VARIANT=v1 SHIN_BENCH_STACK_SUFFIX=<suffix> SHIN_BENCH_MEMORY_LIMIT_MB=1024 SHIN_BENCH_WAIT=false \
pnpm example deploy benchmark-assets -- --profile <profile>

AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
SHIN_BENCH_PROFILE=mixed SHIN_BENCH_VARIANT=v2 SHIN_BENCH_STACK_SUFFIX=<suffix> SHIN_BENCH_MEMORY_LIMIT_MB=1024 \
pnpm example deploy benchmark-assets -- --profile <profile>

AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
SHIN_BENCH_PROFILE=mixed SHIN_BENCH_VARIANT=pruned SHIN_BENCH_STACK_SUFFIX=<suffix> SHIN_BENCH_MEMORY_LIMIT_MB=1024 \
pnpm example deploy benchmark-assets -- --profile <profile>
```

Repeat the same sequence with `benchmark-assets-aws` for upstream AWS CDK `BucketDeployment`.

Always destroy both stacks and verify they are absent before finalizing records.

## Benchmark Records

Append one JSON object per measured phase to `docs/benchmark-history.jsonl`.

Required fields:

- `schemaVersion`: current value `2`
- `runId`
- `runDate`
- `providerImplementationCommit`
- `providerImplementationSubject`
- `resultDocumentationCommit`
- `region`
- `implementation`: `rust` or `aws`
- `profile`
- `series`
- `memoryMb`
- `phase`
- `variant`
- `fileCount`
- `totalBytes`
- `cdkDeploySeconds`
- `localWallSeconds`
- `providerDurationSeconds`
- `billedDurationSeconds`
- `initDurationSeconds`
- `maxMemoryMb`
- `providerInvoked`
- `cleanup`
- `notes`
- `providerSummary` for Rust records when a sanitized summary is available

Use `null` for unavailable values. Do not invent data.

## Benchmark Human Page

After appending JSONL records, update `docs/benchmark.md` `Current Results` for humans.

The human page should include:

- metadata table
- detailed Rust vs AWS comparison table for every comparable metric
- generated charts from committed JSONL data
- provider summary highlights for Rust aggregate counters
- short caveats and cleanup status

The comparison table should show, per phase and metric:

- Rust value
- AWS value
- AWS minus Rust
- AWS/Rust multiplier
- AWS delta percentage

Generate reports with:

```bash
pnpm benchmark:report -- --input-file docs/benchmark-history.jsonl --run-id <run-id>
```

## Final Checks

Before committing benchmark updates:

```bash
pnpm benchmark:report -- --input-file docs/benchmark-history.jsonl --run-id <run-id> --output-file /tmp/benchmark-report-check.md
git diff --check
pnpm test -- test/benchmark-collector.test.ts
```

Run broader `pnpm typecheck`, `pnpm lint`, and `pnpm test` if report scripts, collector scripts, or validation-sensitive source changed.

Only commit sanitized docs, JSONL histories, scripts, and tests. Never commit scratch raw output.
