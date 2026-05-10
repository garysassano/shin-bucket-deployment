# Agent Instructions

Use the repo-local skill files before benchmark or verification work:

- Benchmark and AWS CDK `BucketDeployment` comparison tasks: read `.agents/skills/shin-benchmark/SKILL.md`.
- Correctness verification tasks: read `.agents/skills/shin-verification/SKILL.md`.

Keep benchmark evidence and verification evidence separate:

- `docs/benchmark.md` and `docs/benchmark-history.jsonl` are for performance, efficiency, and upstream AWS CDK `BucketDeployment` comparisons.
- `docs/verification.md` and `docs/verification-history.jsonl` are for `ShinBucketDeployment` correctness only.
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

Keep raw AWS output in scratch directories outside the repo. Commit only sanitized docs, JSONL histories, source, tests, and examples.

For benchmark telemetry interpretation, use the `docs/architecture.md` Diagnostics field reference. Do not infer S3 throttling from source block refetches or waits unless the provider summary also shows source `getRetries`/`getErrors` or destination `putObject.throttledAttempts`/`retryAttempts`.
