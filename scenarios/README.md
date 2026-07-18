# Scenarios

This folder contains deployable CDK apps used by both verification and benchmark workflows.

`pnpm verify` runs correctness scenarios with the construct defaults. When no scenario name is supplied, it iterates every default verification scenario:

```bash
pnpm verify list
pnpm verify synth
pnpm verify deploy --concurrency 4
pnpm verify destroy --concurrency 4
```

Deploy runs ordered update chains serially within each chain and runs independent chains concurrently. Use `--concurrency 1` when debugging one chain at a time.

The `kms-destination`, `kms-managed-destination`, and `dsse-managed-destination` scenarios exercise the strong stored-checksum path with a customer-managed key, the AWS-managed S3 KMS key, and managed DSSE respectively.

The `handler-isolation` scenario deploys two constructs through the default shared provider and two through deployment-scoped providers. Synthesis proves three distinct Lambda/role policy boundaries, while AWS assertions prove all four namespaces are written through their intended boundary.

The `extract-false` scenario exercises direct `CopyObject`. Targeted AWS verification additionally checks the opaque reconciliation metadata and an existing-destination repair through the destination `If-Match` guard.

The `marker-replacement` scenario exercises plain, JSON-escaped, JSON, YAML, and repeated-token replacement. The Rust property and stream tests additionally cover simultaneous leftmost-longest overlap semantics, replacement non-recursion, decompression-chunk boundaries, UTF-8, empty and large values, CRC failures, retry bodies, and exact output limits.

The `replacement-safety-initial` / `replacement-safety-updated` chain changes provider memory while destructive Delete cleanup is enabled. It verifies that generation-specific ownership prevents the previous handler from removing the newly deployed object.

The `external-zips` scenario deploys archives built by Info-ZIP and Python's forced ZIP64 writer through `Source.bucket`. Both fixtures intentionally have longer local-header extra fields than their central-directory entries.

The lifecycle safety chains cover a root deployment sharing a bucket with a child-prefix deployment, a child-to-parent move without cleanup authorization, the same move with explicit `onChange.deletePreviousObjects`, and an explicitly authorized cross-bucket move. Together they prove that owner overlap retains co-tenant data and that previous-destination cleanup is authorization-controlled and manifest-aware.

`pnpm benchmark` runs only the named benchmark scenario and expands the requested config matrix:

```bash
pnpm benchmark deploy assets --asset-profiles tiny-many --implementations shin,aws --lambda-max-parallel-transfers 32 --lambda-memory-mb 1024
```

Verification evidence is summarized in `docs/verification.md`. Benchmark result rows and render tooling live in `benchmarks/`.
