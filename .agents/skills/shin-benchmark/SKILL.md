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

Do not finalize timing-only benchmark rows when provider telemetry is expected. For every provider-invoking deploy/update/delete phase, capture the Lambda CloudWatch `REPORT` line and the sanitized `shin_deployment_summary` line before destroying the stack or otherwise deleting provider log groups. If telemetry cannot be captured, either rerun the phase or clearly mark the record as incomplete with `null` provider fields and explain why.

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

For parameter sweeps, keep all non-swept inputs identical and encode the swept value in the record so rows remain distinguishable. For `maxParallelTransfers` sweeps, use distinct phase names such as `cold-create-parallel-8`, `cold-create-parallel-16`, and include the provider summary field `maxParallelTransfers`.

Always collect telemetry first, then destroy benchmark stacks, then verify they are absent before finalizing records.

## Telemetry Capture

Capture raw deploy output, CloudWatch `REPORT` events, and CloudWatch `shin_deployment_summary` events in scratch outside the repo. The benchmark collector understands both sanitized JSONL summary files and raw `aws logs filter-log-events --output json` files; prefer passing the raw CloudWatch summary file directly to avoid manual unescaping mistakes.

After each deploy/update and before destroy:

```bash
aws cloudformation describe-stack-resources \
  --region <region> --profile <profile> \
  --stack-name <stack-name> \
  --query "StackResources[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" \
  --output json > <scratch>/functions.json

HANDLER=$(node -e 'const fs=require("fs"); const funcs=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); const handler=funcs.find((name)=>name.includes("ShinBucketDeploymentHand")); if (!handler) process.exit(2); process.stdout.write(handler);' <scratch>/functions.json)

aws logs filter-log-events \
  --region <region> --profile <profile> \
  --log-group-name "/aws/lambda/$HANDLER" \
  --filter-pattern "REPORT" \
  --output json > <scratch>/report.json

aws logs filter-log-events \
  --region <region> --profile <profile> \
  --log-group-name "/aws/lambda/$HANDLER" \
  --filter-pattern "shin_deployment_summary" \
  --output json > <scratch>/summary.json
```

Then append the record with:

```bash
pnpm benchmark:collect -- \
  --log-file <scratch>/deploy.log \
  --report-file <scratch>/report.json \
  --summary-file <scratch>/summary.json \
  --output-file docs/benchmark-history.jsonl \
  --run-id <run-id> \
  --run-date <YYYY-MM-DD> \
  --phase <phase> \
  --series <series> \
  --commit <short-sha> \
  --subject "<commit subject>" \
  --region <region> \
  --implementation rust \
  --profile <benchmark-profile> \
  --memory-mb <memory> \
  --variant <variant> \
  --cleanup "all benchmark stacks destroyed" \
  --notes "<sanitized note>"
```

Do not parse `summary=...` tracing lines by hand. If parsing fails, fix `scripts/collect-benchmark-results.ts` and add a test in `test/benchmark-collector.test.ts`.

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

For Rust records with provider invocation, prefer a record with both CloudWatch `REPORT` metrics and `providerSummary`. Missing provider telemetry is acceptable only when the provider was not invoked or when the record notes why capture was impossible.

## Telemetry Interpretation

Use the `docs/architecture.md` Diagnostics field reference when explaining provider summaries.

Do not infer S3 throttling from local source block counters alone:

- `source.blockWaits`, `source.blockWaitsFetching`, and `source.blockWaitsCapacity` describe local source block scheduling waits.
- `source.blockRefetches` and `source.replayClaimsAfterRelease` describe local replay-after-release duplicate source reads.
- Source S3 pressure requires source `getRetries` or `getErrors` evidence.
- Destination S3 throttling requires `putObject.throttledAttempts` or retry evidence.

For parameter sweeps, report both performance and pressure counters. For `maxParallelTransfers` sweeps, include at least provider duration, billed duration, max memory, CDK deploy time, local wall time, source fetched bytes, block waits split by reason when available, block refetches, replay claims after release, active reader high-water, resident bytes high-water, and PutObject retry/throttle counters.

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
