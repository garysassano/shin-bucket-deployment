# Scenarios

This folder contains deployable CDK apps used by both verification and benchmark workflows.

`pnpm verify` runs correctness scenarios with the construct defaults. Listing and synthesis are normal local gates. AWS deploys are opt-in, billable, and maintainer-run: use a named group for a narrow deployed change, select several independent groups only when needed, and reserve the full suite for shared provider/runner/assertion changes or a deliberately selected release candidate. There is no hosted full-matrix verification workflow.

```bash
pnpm verify list
pnpm verify synth

# One ordered AWS verification group
pnpm verify deploy replacement-safety
pnpm verify destroy replacement-safety

# Several independent groups; phases within each group stay serial
pnpm verify deploy --groups simple,filters,replacement-safety --concurrency 3
pnpm verify destroy --groups simple,filters,replacement-safety --concurrency 3

# Rare full AWS suite; use only when its broader scope is justified
pnpm verify deploy --concurrency 4
pnpm verify destroy --concurrency 4
```

`pnpm verify list` shows phase names and group aliases. A group alias expands to every ordered phase; destroy selects the terminal phase. Deploy runs ordered phases serially within each group and can run independent groups concurrently. Use the same selector for deploy and destroy, and use `--concurrency 1` when debugging. Canonical benchmarks remain sequential so concurrent resource contention does not distort comparisons.

The `kms-destination`, `kms-managed-destination`, and `dsse-managed-destination` scenarios exercise the strong stored-checksum path with a customer-managed key, the AWS-managed S3 KMS key, and managed DSSE respectively.

The `handler-isolation` scenario deploys two constructs through the default shared provider and two through deployment-scoped providers. Synthesis proves three distinct Lambda/role policy boundaries, while AWS assertions prove all four namespaces are written through their intended boundary.

The `extract-false` scenario exercises direct `CopyObject`. Targeted AWS verification additionally checks the opaque reconciliation metadata and an existing-destination repair through the destination `If-Match` guard.

The `marker-replacement` scenario exercises plain, JSON-escaped, JSON, YAML, and repeated-token replacement. The Rust property and stream tests additionally cover simultaneous leftmost-longest overlap semantics, replacement non-recursion, decompression-chunk boundaries, UTF-8, empty and large values, CRC failures, retry bodies, and exact output limits.

The `replacement-safety-initial` / `replacement-safety-updated` chain preserves the original provider-memory replacement case while also covering destination moves. The original deployment changes provider memory while destructive Delete cleanup is enabled, proving generation-specific ownership prevents the previous handler from removing the newly deployed object.

The `external-zips` scenario deploys archives built by Info-ZIP and Python's forced ZIP64 writer through `Source.bucket`. Both fixtures intentionally have longer local-header extra fields than their central-directory entries.

The lifecycle safety chains cover a root deployment sharing a bucket with a child-prefix deployment, a child-to-parent move without cleanup authorization, the same move with explicit `onChange.deletePreviousObjects`, and an explicitly authorized cross-bucket move. Together they prove that owner overlap retains co-tenant data and that previous-destination cleanup is authorization-controlled and manifest-aware.

The same replacement-safety chain covers child-to-parent, parent-to-child, sibling-prefix, and cross-bucket moves through a stable provider identity with `onDelete.deleteCurrentObjects=true`. Each move runs with `onChange.deletePreviousObjects` explicitly disabled and enabled. Post-deploy verification first proves every initial fixture exists, then reads the exact updated and retained bodies and proves authorized previous objects are absent through successful S3 listings, so a successful CDK exit without the expected S3 state fails the scenario.

`pnpm benchmark` runs only the named benchmark scenario and expands the requested config matrix:

```bash
pnpm benchmark deploy assets --asset-profiles tiny-many --implementations shin,aws --transfer-max-concurrency 32 --lambda-memory-mb 1024
```

Verification evidence is summarized in `docs/verification.md`. Benchmark result rows and render tooling live in `benchmarks/`.
