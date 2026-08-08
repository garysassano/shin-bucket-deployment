---
name: shin-benchmark
description: |
  Run, collect, sanitize, document, and commit ShinBucketDeployment benchmark evidence.

  Use this skill when:
  1. Running AWS benchmark scenarios for this repository
  2. Comparing ShinBucketDeployment Lambda configs with each other or with AWS CDK BucketDeployment
  3. Updating docs/benchmark.md or benchmarks/results.jsonl
  4. Reviewing whether benchmark evidence is safe to commit
---

# Shin Benchmark Workflow

This skill is for performance and efficiency evidence only. It does not establish correctness verification status for `ShinBucketDeployment`.

Performance is a primary product constraint for this repository. Shin is expected to materially outperform upstream AWS CDK `BucketDeployment` on its target workloads. For a provider data-path change, treat any new per-byte or per-object pass, digest, S3 request, payload copy, allocation, or whole-entry materialization as a regression risk that requires evidence. Prefer designs that reuse bytes, listings, validation, and digests already produced by the transfer path.

Do not mark a performance-relevant change ready to merge or release from local correctness gates alone. Collect comparable before/after Shin results plus the upstream AWS CDK baseline and the telemetry needed to explain the result. If those measurements have not run, record the performance decision as pending; do not substitute verification evidence for benchmark evidence.

## Source Of Truth

- `docs/benchmark.md` is the human benchmark page.
- `benchmarks/results.jsonl` contains sanitized current benchmark result rows used by report and profile-snapshot tooling.
- `docs/verification.md` owns correctness verification and must not use benchmark rows as verification evidence.
- Deployable benchmark apps live in `benchmarks/apps/**` and are run through `pnpm benchmark`.
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

Committed benchmark records may include:

- region
- commit SHA and subject
- scenario, asset profile, state, implementation, and phase names
- selected config values such as memory and `maxConcurrency`
- sanitized durations and memory
- sanitized aggregate counters
- cleanup status
- notes without resource identifiers

## Benchmark Runner

> **Any change under `rust/` requires a current provider archive staged before collecting benchmark evidence.**
>
> Benchmark deploys use the same construct path as verification: the construct prefers a prebuilt `assets/bootstrap-<arch>/bootstrap.zip` and only compiles when no archive exists (`src/provider.ts`). A stale archive is selected silently, so rows would measure the previous provider binary while recording the new commit's `provider.bootstrap` digests and `provider.implementationCommit` — evidence that misdescribes what ran.
>
> Who stages the archive differs by entry point:
>
> - `pnpm benchmark deploy assets` (the manual benchmark path) never rebuilds: run `pnpm prebuild:bootstrap` (it stages both arm64 and x86_64 archives) after any `rust/` change, before the first benchmark deploy of a session.
> - `pnpm benchmark:run-assets` builds its own arm64 artifact: before the first deploy of a session it runs `scripts/build-bootstrap.mjs --benchmark --evidence-output <ledger> arm64` (`benchmarkProviderBuildArgs` in `benchmarks/src/run-assets-comparison.ts`), which requires a clean source tree, builds from a detached worktree at the current commit, verifies the local application build matches it, and stages `assets/bootstrap-arm64/bootstrap.zip` over any stale archive. Resumed sessions do not rebuild; they reuse the staged archive, so resume only with the same source and bootstrap.
>
> Since F-7, `pnpm benchmark deploy` refuses to start when a staged archive's
> `build-provenance.json` does not match the current source tree (or when the
> provenance file is missing), so the manual path is gated exactly like
> verification. The `benchmark:run-assets` path already refuses through its own
> full provenance assertion (`assertBootstrapBuildProvenance`). For a
> deliberately stale deployment, set `SHIN_ALLOW_STALE_BOOTSTRAP=1`; the refusal
> message names the same variable.

Benchmark mode runs only the selected benchmark scenario and expands the requested config matrix:

```bash
pnpm benchmark deploy assets \
  --asset-profiles tiny-many,mixed \
  --implementations shin,aws \
  --transfer-max-concurrency 8,32 \
  --lambda-memory-mb 1024,2048
```

Supported runner options:

- `--asset-profiles`: benchmark asset profiles such as `tiny-many`, `mixed`, or `large-few`.
- `--implementations`: `shin`, `aws`, or both.
- `--transfer-max-concurrency`: Shin `maxConcurrency` values.
- `--lambda-memory-mb`: provider Lambda memory values.

When the matrix has multiple Lambda configs and `SHIN_BENCH_STACK_SUFFIX` is not already set, the runner adds a deterministic suffix per config so stacks can coexist.

## Benchmark Workflow

Do not finalize timing-only benchmark rows when provider telemetry is expected. For every provider-invoking deploy/update/delete phase, capture the Lambda CloudWatch `REPORT` line and the sanitized `shin_deployment_summary` line before destroying the stack or otherwise deleting provider log groups. If telemetry cannot be captured, either rerun the phase or clearly mark the record as incomplete with `null` provider fields and explain why.

Prefer the automated asset comparison runner for Shin-vs-AWS asset benchmarks:

```bash
AWS_PROFILE=<profile> AWS_REGION=ap-southeast-2 AWS_DEFAULT_REGION=ap-southeast-2 \
pnpm benchmark:run-assets -- \
  --config benchmarks/configs/canonical.json \
  --repetitions 1 \
  --max-wall-clock-minutes <approved-smoke-cap>
```

The config file defines the asset profiles, Lambda configs, implementations, phases, region, output file, repetitions, and sequential execution policy. Prefer adding or editing a committed JSON config under `benchmarks/configs/` over building long CLI invocations. Use `assetProfiles` in JSON files and `--asset-profiles <name>` for CLI overrides. Use `lambdaConfigs` in JSON files and `--lambda-configs <memory>:<max-concurrency>` for Lambda config CLI overrides. The runner deploys each stack through the configured phases, captures CloudWatch `REPORT` events and Shin `shin_deployment_summary` events before cleanup, destroys the stack, verifies cleanup, and writes sanitized result rows incrementally. `concurrency` bounds how many independent stacks deploy at once (default 1, capped at 4). Samples are bucketed by the stack shape they deploy, so phases within a configuration stay ordered while different memory configurations overlap. It is part of the configuration digest, so runs at different concurrency are never pooled as the same configuration. Provider duration and peak memory come from the CloudWatch `REPORT` record and stay comparable across concurrent configurations; `localWallSeconds` and `cdkDeploySeconds` do not, and must not be compared against a sequential run. Preserve the printed run UUID and its external scratch resume manifest. Resume only with the same source/bootstrap, normalized config, phases, destination, and planned matrix. The wall-clock cap is checked between phases at external-command granularity; signals terminate the active process group, and both paths must attempt cleanup of the active stack.

Choose benchmark configs deliberately. Paired Shin vs AWS comparisons should use:

- same region and account
- same profile
- same states and phase sequence
- same destination prefix
- same memory setting
- the selected Shin max-concurrency setting, recorded for Shin and stored as `null` for upstream AWS
- same repetition count
- same stack suffix pattern

Benchmark configuration uses behavior-oriented names even when comparing with upstream AWS CDK. Map `deleteStaleObjects` to Shin `destinationLifecycle.onDeploy.deleteStaleObjects` and upstream `prune`. Map `deleteCurrentObjectsOnDelete` to Shin `destinationLifecycle.onDelete.deleteCurrentObjects` and the inverse of upstream `retainOnDelete`. Keep the upstream prop names only at the adapter boundary; do not expose them as Shin configuration names.

For parameter sweeps, keep all non-swept inputs identical and encode the swept value in the row identity. For `maxConcurrency` sweeps, include the top-level `parallel` field and the provider summary field `maxParallelTransfers`; those evidence field names are stable. Distinct phase names such as `cold-create-parallel-8` are acceptable when the phase itself represents the sweep point. Use `--run-token` only for scratch paths and stack suffixes, not as committed result identity.

Always collect telemetry first, then destroy benchmark stacks, then verify they are absent before finalizing records.

## Telemetry Capture

Capture raw deploy output, CloudWatch `REPORT` events, and CloudWatch `shin_deployment_summary` events in scratch outside the repo. The benchmark collector understands both sanitized JSONL summary files and raw `aws logs filter-log-events --output json` files; prefer passing the raw CloudWatch summary file directly to avoid manual unescaping mistakes.

Use CloudWatch `REPORT` as the source of truth for `providerDurationSeconds`, `billedDurationSeconds`, `initDurationSeconds`, and `maxMemoryMb`. Use `providerSummary.durationMs` and `providerSummary.phaseMs` for provider-internal phase analysis only. If the two differ slightly, do not overwrite CloudWatch duration fields with summary values.

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

Then upsert result rows with:

```bash
pnpm benchmark:collect -- \
  --log-file <scratch>/deploy.log \
  --report-file <scratch>/report.json \
  --summary-file <scratch>/summary.json \
  --output-file benchmarks/results.jsonl \
  --snapshot-date <YYYY-MM-DD> \
  --phase <phase> \
  --commit <short-sha> \
  --region <region> \
  --implementation shin \
  --asset-profile <benchmark-profile> \
  --asset-state <state> \
  --transfer-max-concurrency <parallel> \
  --lambda-memory-mb <memory> \
  --cleanup destroyed
```

Do not parse `summary=...` tracing lines by hand. If parsing fails, fix `benchmarks/src/collect-results.ts` and add a test in `test/benchmarks/collector.test.ts`.

## Benchmark Records

Write one JSON object per measured phase to `benchmarks/results.jsonl`, and one per (`runId` × `implementation`) to `benchmarks/runs.jsonl`. Both are current-result data for reports and profile snapshots, not append-only history. Samples are upserted by their run, sample, repetition, implementation, configuration, phase, and state identity. There is one evidence shape; records that do not conform are not readable and belong in `archive/`.

`AGENTS.md` owns the evidence persistence and provenance policy. Operationally: benchmark the implementation commit once it is on `main`, then open a follow-up evidence PR containing the updated `benchmarks/results.jsonl` and human benchmark page. Accepted evidence must not remain only in external scratch.

Evidence lives in **two** files. `benchmarks/runs.jsonl` holds one record per (`runId` × `implementation`) with everything constant across that run's samples; `benchmarks/results.jsonl` holds one record per sample with only what varies. A sample's `runId` must resolve to a run record.

Run record (`runs.jsonl`): `runId`, `implementation`, `snapshotDate`, `region`, `cleanup`, and the grouped `config` (`benchmarkConfigSha256`, `memoryMeasurementScope`), `environment` (node/pnpm versions, execution-environment, dependency-lock, application-build and source-tree digests, `executionEnvironmentFresh`, `gitDirty`), `cdk` (`cliVersion`, `cliInstalledSha256`, `libVersion`, `libInstalledSha256`, `constructsInstalledSha256`) and `provider` objects. `provider` carries `packageVersion`, `architecture`, `runtime`, `handler` and `codeSha256` for **both** implementations — the AWS values describe the upstream `BucketDeployment` Lambda and are measured evidence. Shin runs additionally carry `provider.implementationCommit` and the whole `provider.bootstrap` object; AWS runs omit those two.

Sample record (`results.jsonl`): `runId`, `sampleId`, `implementation`, `profile`, `memoryMb`, `phase`, `state`, `repetition`, `fileCount`, `totalBytes`, `assetManifestSha256`, `cdkDeploySeconds`, `localWallSeconds`, `providerDurationSeconds`, `billedDurationSeconds`, `initDurationSeconds`, `maxMemoryMb`, `providerInvoked`, plus `parallel` and `detailedFailureDiagnostics` for Shin, `sourceWindowBytes` only when explicitly overridden, and `providerSummary` for Shin records when a sanitized summary is available.

`cleanup` is an enum: `destroyed`, `partial`, or `failed`.

**Omit absent fields; never write `null`.** Do not invent data. Put narrative interpretation in `docs/benchmark.md`.

For Shin records with provider invocation, prefer a record with both CloudWatch `REPORT` metrics and `providerSummary`. Missing provider telemetry is acceptable only when the provider was not invoked or when the record notes why capture was impossible.

## Telemetry Interpretation

Use the `docs/architecture.md` Diagnostics field reference when explaining provider summaries.

Do not infer S3 throttling from local source block counters alone:

- `source.blockWaits`, `source.blockWaitsFetching`, and `source.blockWaitsCapacity` describe local source block scheduling waits.
- `source.blockRefetches` and `source.replayClaimsAfterRelease` describe local replay-after-release duplicate source reads.
- Source S3 pressure requires source `getRetries` or `getErrors` evidence.
- Destination S3 throttling requires `putObject.throttledAttempts` or retry evidence.

For parameter sweeps, report both performance and pressure counters. For `maxConcurrency` sweeps, include at least provider duration, billed duration, max memory, CDK deploy time, local wall time, source fetched bytes, block waits split by reason when available, block refetches, replay claims after release, active reader high-water, resident bytes high-water, and PutObject retry/throttle counters.

For destination identity changes, include transferred/skipped object counts, MD5/catalog skip counters, source fetched bytes, provider duration, and memory. Benchmark destinations use SSE-S3; unsupported destination encryption modes are synthesis validation, not benchmark variants.

## Benchmark Human Page

After updating JSONL records, update `docs/benchmark.md` `Current Results` for humans.

The human page should include:

- metadata table
- detailed Shin vs AWS comparison table for every comparable metric when the current result set has paired implementations
- parameter-sweep comparison tables when the current result set is Shin-only, including the swept value, baseline-relative speedup, memory, end-to-end timings, and telemetry counters
- current per-profile snapshots generated from committed JSONL data when applicable
- provider summary highlights for Shin aggregate counters
- short caveats and cleanup status

The comparison table should show, per phase and metric:

- Shin value
- AWS value
- AWS minus Shin
- AWS/Shin multiplier
- AWS delta percentage

Generate reports with:

```bash
pnpm benchmark:comparison-report -- --input-file benchmarks/results.jsonl --asset-profile tiny-many --lambda-memory-mb 2048 --transfer-max-concurrency 64
```

## Final Checks

Before committing benchmark updates:

```bash
pnpm benchmark:comparison-report -- --input-file benchmarks/results.jsonl --preview true --output-file /tmp/benchmark-report-check.md
git diff --check
pnpm exec vitest run test/benchmarks/collector.test.ts
```

Run broader `pnpm typecheck`, `pnpm lint`, and `pnpm test` if report scripts, collector scripts, or validation-sensitive source changed.

Only commit sanitized docs, JSONL result rows, source, tests, and scenarios. Never commit scratch raw output.
