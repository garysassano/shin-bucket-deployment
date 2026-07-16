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

The `marker-replacement` scenario exercises plain, JSON-escaped, JSON, YAML, and repeated-token replacement. The Rust property and stream tests additionally cover simultaneous leftmost-longest overlap semantics, replacement non-recursion, decompression-chunk boundaries, UTF-8, empty and large values, CRC failures, retry bodies, and exact output limits.

The `replacement-safety-initial` / `replacement-safety-updated` chain changes provider memory while destructive Delete cleanup is enabled. It verifies that a handler replacement keeps the same destination identity and does not remove the newly deployed object.

`pnpm benchmark` runs only the named benchmark scenario and expands the requested config matrix:

```bash
pnpm benchmark deploy assets --asset-profiles tiny-many --implementations shin,aws --lambda-max-parallel-transfers 32 --lambda-memory-mb 1024
```

Verification evidence is summarized in `docs/verification.md`. Benchmark result rows and render tooling live in `benchmarks/`.
