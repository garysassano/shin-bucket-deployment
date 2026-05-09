---
name: rbd-benchmark-verification
description: |
  Run, collect, sanitize, document, and commit RustBucketDeployment benchmark and verification evidence.

  Use this skill when:
  1. Running AWS benchmark or validation scenarios for this repository
  2. Updating benchmark or verification documentation
  3. Appending sanitized records to benchmark or verification JSONL history
  4. Comparing RustBucketDeployment with AWS CDK BucketDeployment
  5. Reviewing whether benchmark/verification evidence is safe to commit
---

# RBD Benchmark And Verification Workflow

This repository keeps human-readable summaries and full append-only machine records separate.

## Source Of Truth

- `docs/benchmarking.md` is the human benchmark page.
- `docs/benchmark-history.jsonl` is the append-only full benchmark history.
- `docs/verification.md` is the human verification page.
- `docs/verification-history.jsonl` is the append-only full verification history.
- Raw AWS logs and CloudWatch extracts must stay outside git in scratch directories.

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

Committed benchmark and verification records may include:

- region
- commit SHA and subject
- scenario/profile/variant/phase names
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

Standard focused comparison:

```bash
AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=<suffix> RBD_BENCH_MEMORY_LIMIT_MB=1024 \
pnpm example deploy benchmark-assets -- --profile <profile>

AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v1 RBD_BENCH_STACK_SUFFIX=<suffix> RBD_BENCH_MEMORY_LIMIT_MB=1024 RBD_BENCH_WAIT=false \
pnpm example deploy benchmark-assets -- --profile <profile>

AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=v2 RBD_BENCH_STACK_SUFFIX=<suffix> RBD_BENCH_MEMORY_LIMIT_MB=1024 \
pnpm example deploy benchmark-assets -- --profile <profile>

AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
RBD_BENCH_PROFILE=mixed RBD_BENCH_VARIANT=pruned RBD_BENCH_STACK_SUFFIX=<suffix> RBD_BENCH_MEMORY_LIMIT_MB=1024 \
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

After appending JSONL records, update `docs/benchmarking.md` `Current Results` for humans.

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

## Verification Workflow

Verification covers correctness, not performance. Run local gates first:

```bash
pnpm rust:fmt
pnpm rust:check
cargo test --manifest-path rust/Cargo.toml
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

Example synthesis should cover public examples:

```bash
pnpm example list
pnpm example synth simple
pnpm example synth replacement
pnpm example synth metadata-filters
pnpm example synth prune-update-v1
pnpm example synth prune-update-v2
pnpm example synth retain-on-delete-v1
pnpm example synth retain-on-delete-v2
pnpm example synth cloudfront-sync
pnpm example synth cloudfront-async
pnpm example synth benchmark-assets
pnpm example synth benchmark-assets-aws
```

AWS functional scenarios include:

- simple create/update/destroy
- metadata and include/exclude filters
- marker replacement
- prune update
- retain-on-delete update/delete
- `extract=false`
- `retainOnDelete=false` cleanup
- duplicate multi-source overwrite order
- larger archive ranged-read path
- CloudFront sync and async invalidation
- benchmark-backed create/unchanged/sparse/prune correctness

## Verification Records

Append one JSON object per verification scenario to `docs/verification-history.jsonl`.

Recommended fields:

- `schemaVersion`: current value `1`
- `runId`
- `runDate`
- `commit`
- `subject`
- `region`
- `category`: `local`, `synth`, `aws`, or `benchmark-backed`
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

Before committing benchmark or verification updates:

```bash
pnpm benchmark:report -- --input-file docs/benchmark-history.jsonl --run-id <run-id> --output-file /tmp/benchmark-report-check.md
git diff --check
pnpm test -- test/benchmark-collector.test.ts
```

Run broader `pnpm typecheck`, `pnpm lint`, and `pnpm test` if report scripts, collector scripts, or validation-sensitive source changed.

Only commit sanitized docs, JSONL histories, scripts, and tests. Never commit scratch raw output.
