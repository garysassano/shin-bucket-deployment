# Verification

This page is the human-readable verification snapshot for `ShinBucketDeployment` correctness. Benchmarks and AWS CDK `BucketDeployment` comparisons are tracked separately in `docs/benchmark.md` and `benchmarks/results.jsonl`. Verification does not keep append-only history; replace this page when a new full verification run becomes the current snapshot.

Runbooks, evidence collection rules, and sanitization rules live in the repo-local agent skill at `.agents/skills/shin-verification/SKILL.md`.

> [!IMPORTANT]
> The 2026-07-12 full AWS suite verifies the final authenticated-catalog provider
> across all 19 ordered scenario phases and 14 stacks. It includes authenticated
> sparse skips, trusted large-object streaming, mixed trusted/untrusted sources,
> lifecycle changes, KMS, and synchronous/asynchronous CloudFront updates. The
> packaged x86_64 runtime path remains locally verified but was not deployed in
> this AWS run.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-07-12 |
| Latest verification baseline | `aa9aa8c` (`fix: accept cloudformation catalog versions`) |
| Region | Full AWS correctness suite in `eu-central-1`; deterministic local catalog/materialization gates |
| Latest verification runs | `2026-07-12-aws-trusted-catalogs` and `2026-07-12-local-trusted-catalogs` |
| Cleanup | The initial four preflight-failed stacks were recovered and removed. After the successful rerun, all 14 verification stacks were destroyed and all 14 scenario buckets were confirmed absent, including the intentionally retained lifecycle bucket after explicit cleanup. |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Scenario runner | `pnpm verify list`, `pnpm verify synth`, `pnpm verify deploy`, or `pnpm verify destroy`; concurrent runs isolate CDK output per scenario |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | CloudFormation protocol/lifecycle coverage plus strict catalog request parsing, SHA-256 authentication, one-to-one ZIP mapping, ZIP64 metadata, trusted MD5 checks, direct-body completion withholding, marker reads, and sparse-skip trust boundaries. | Pass as of 2026-07-12 local catalog gates |
| P0 | S3 algorithm integration | Ignored Rust S3-to-S3 generated ZIP integration test with 2,500 generated files and bounded-memory ranged reads. | Pass as of 2026-05-02 |
| P0 | TypeScript tests | CDK synthesis plus deterministic catalog bytes, ignore behavior, path/special-file rejection, hard-link fallback, cleanup aggregation, disabled staging, protocol alignment/deduplication, 64 KiB reads, and a 256 MiB sparse-file RSS regression. | Pass as of 2026-07-12 local catalog gates |
| P0 | Build and lint | TypeScript build/package/typecheck/lint/tests, Rust fmt/clippy/all-feature tests, package smoke test, npm audit, cargo audit, cargo deny, actionlint, and Taplo. | Pass as of 2026-07-12 local catalog gates |
| P0 | Scenario synthesis | All 19 default `ShinBucketDeployment` verification scenarios synthesize locally with aligned trusted/untrusted `SourceCatalogs`. | Pass as of 2026-07-12 local catalog gates |
| P0 | Packaged provider runtime | Rebuilt packaged arm64 provider completed the full AWS suite; both packaged architectures pass local archive/package verification. | arm64 AWS pass as of 2026-07-12; x86_64 AWS refresh required |
| P0 | AWS end-to-end simple deployment | Create, root-prefix deployment, S3 object checks, and destroy with the provider Lambda running in AWS. | Pass as of 2026-07-12 full AWS suite |
| P0 | AWS end-to-end update/delete behavior | Ordered chains verify default stale-object deletion, explicit stale-object retention, previous-namespace deletion after a destination change, preservation of retained namespaces, current-object deletion on custom-resource Delete, and final stack absence. | Pass as of 2026-07-12 full AWS suite |
| P0 | AWS end-to-end metadata/replacement behavior | Include/exclude filters, system/user metadata, SSE-S3 metadata, deploy-time marker replacement, JSON/YAML/data sources, JSON escaping, and source overwrite order. | Pass as of 2026-07-12 full AWS suite |
| P0 | AWS end-to-end KMS destination | KMS-encrypted destination bucket deploys and stored objects report `aws:kms`. | Pass as of 2026-07-12 full AWS suite |
| P0 | AWS end-to-end CloudFront invalidation | Primed sync and async distributions served the updated probe after explicit token changes; sync used explicit paths and async used prefix-derived default paths. | Pass as of 2026-07-12 full AWS suite |
| P0 | Destination replacement IAM | Sparse/stale-object cleanup update can read existing destination objects before conditional replacement writes. | Pass after `4f5f0ca` |
| P1 | Destination KMS grant synthesis | KMS-encrypted destination buckets synthesize provider-role decrypt/describe/encrypt/re-encrypt/data-key permissions through CDK bucket grants. | Pass as of 2026-05-15 local synthesis test |
| P1 | Authenticated catalog trust | Only module-bound local directory assets receive `SourceCatalogs`; unbound catalogs cannot sparse-skip, trusted catalogs are strict and template-authenticated, and trusted entry bytes are MD5-checked on every read. AWS logs recorded authenticated and deliberately untrusted sources, no trust failures, and authenticated sparse skips during ordered updates. | Pass as of 2026-07-12 local and AWS verification |
| P2 | Metadata-only update identity | Same object bytes with changed user metadata are skipped because metadata is not part of skip identity. | Known limitation |

## Latest Verification Snapshot

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-07-12-aws-trusted-catalogs` | aws | All 19 ordered default phases across 14 stacks at `aa9aa8c` | Pass | The first attempt exposed CloudFormation's string representation for the catalog version before destination work; the parser was corrected, the four failed stacks were recovered and removed, and the complete suite then passed. Fourteen sanitized state groups verified S3 placement/content, metadata and filters, marker replacement, source overwrite order, stale cleanup/retention, destination-change and Delete cleanup, `extract=false`, a 24 MiB trusted direct stream, KMS encryption, and primed sync/async CloudFront updates. Provider logs recorded 15 authenticated catalog evaluations, 22 deliberately untrusted evaluations, no trust failures, and four authenticated sparse skips. All 14 final stacks were destroyed and all 14 scenario buckets were confirmed absent. |
| `2026-07-12-local-trusted-catalogs` | local | Full static, unit, package, audit, and default-scenario synthesis gates at `aa9aa8c` | Pass | 98 Rust tests passed with one credential-gated AWS integration test ignored. Catalog coverage includes aligned numeric and CloudFormation-string descriptors, malformed descriptors, exact SHA-256 binding, strict JSON and path/size/MD5 mapping, ZIP64 metadata, untrusted fallback, trusted sparse skips, comparison/marker reads, and direct-stream body failure before completion. TypeScript build/package/typecheck/lint, 60 Vitest tests, five Node release-script tests, both provider architectures, installed-tarball CommonJS/ESM directory consumers, audits, workflow/TOML checks, and all 19 default scenario syntheses passed. |
| `2026-07-11-local-protocol-reliability` | local | Full static, unit, package, audit, and default-scenario synthesis gates at `2c7c6d6` | Pass | 86 Rust tests passed with one credential-gated AWS integration test ignored. Deterministic protocol tests covered callback 2xx/4xx/5xx/connection/timeout handling, 4096/4097-byte response boundaries, escaped failure sizing, deadline cancellation/drain, `ResourceType`, and CloudFront path/poll limits. TypeScript build/typecheck/lint, 43 Vitest tests, five Node release tests, both rebuilt provider architectures, package smoke verification, audits, workflow/TOML checks, and all 19 default scenario syntheses passed. |
| `2026-07-11-targeted-lifecycle-aws` | aws | `stale-object-cleanup-initial` → `stale-object-cleanup-updated`; `stale-object-retention-initial` → `stale-object-retention-updated`; `object-deletion-initial` → `object-deletion-updated` → `object-deletion-bucket-only` | Pass | The packaged arm64 provider ran in AWS. Default deployment cleanup deleted the stale object, disabling it retained the stale object, destination-change cleanup removed the previous object while preserving the current child namespace, Delete removed the current object, and all three stacks were destroyed and confirmed absent. |
| `2026-07-11-local-lifecycle-contract` | local | Full static, unit, package, audit, and default-scenario synthesis gates | Pass | TypeScript build/typecheck/lint/tests, Rust fmt/check/clippy/tests, package smoke verification for both provider architectures, npm/cargo audits, cargo deny, actionlint, Taplo checks, benchmark report generation and collector tests, and all 19 default verification scenario syntheses passed. |
| `2026-05-15-aws-end-to-end-verification` | aws | Full ShinBucketDeployment AWS end-to-end suite | Pass | Concurrent deploy created or updated all 14 verification stacks; sanitized assertions passed for S3 object placement, metadata/filtering, marker replacement, stale-object cleanup, retention, delete cleanup, extract=false, source overwrite order, large archive, KMS encryption, CloudFront sync/async invalidations, and final stack absence. |
| `2026-05-15-local-unit-synth-verification` | local | Local unit/static/synthesis suite | Pass | Rust formatting/check/tests, TypeScript build/typecheck/lint/tests, and every public ShinBucketDeployment example used by AWS verification synthesized during deploy/destroy. |
| `2026-05-15-runner-concurrency-fix` | local/aws | Verification runner concurrent CDK output isolation | Pass | Initial concurrent deploy/destroy attempts exposed `cdk.out` synth lock contention; runner now passes per-scenario `--output` directories and the fresh concurrent deploy/destroy completed with zero remaining verification stacks. |

Historical verification rows were removed in favor of keeping only this latest human-readable snapshot.

## Known Limitations

- Metadata-only updates remain a known limitation until metadata participates in skip identity or forces replacement.
- CloudFormation deadline and callback failure injection has current deterministic local coverage but has not been rerun as an AWS fault-injection scenario.
- Cross-bucket lifecycle moves and changed-distribution invalidation have local coverage but still need a current targeted AWS rerun.
- The packaged x86_64 provider passes local artifact and consumer smoke verification but has not been refreshed in AWS.
- Raw AWS evidence is intentionally excluded from git. Update this page with sanitized results after a new full verification run.
