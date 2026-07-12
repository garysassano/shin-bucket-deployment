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

The `metadata-update-initial` → `metadata-update-updated` chain keeps extracted and `extract=false` source bytes identical while changing user/system object settings. It is the end-to-end regression scenario for semantic metadata rewrites.

`pnpm benchmark` runs only the named benchmark scenario and expands the requested config matrix:

```bash
pnpm benchmark deploy assets --asset-profiles tiny-many --implementations shin,aws --lambda-max-parallel-transfers 32 --lambda-memory-mb 1024
```

Verification evidence is summarized in `docs/verification.md`. Benchmark result rows and render tooling live in `benchmarks/`.
