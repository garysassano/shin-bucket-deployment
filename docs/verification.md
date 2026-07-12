# Verification

This page is the current human-readable correctness snapshot for `ShinBucketDeployment`. Performance evidence and AWS CDK `BucketDeployment` comparisons remain separate in [benchmark](./benchmark.md). Verification is replaced rather than appended; runbooks and sanitization rules live in `.agents/skills/shin-verification/SKILL.md`.

> [!IMPORTANT]
> The 2026-07-12 AWS run verifies the PR7 object-semantics implementation at
> `b40def8` across all 21 ordered phases and 15 stacks. It includes identical-byte
> metadata updates on extracted and `extract=false` paths, marker-output preflight,
> authenticated catalog behavior, lifecycle changes, KMS, and synchronous and
> asynchronous CloudFront invalidation. The packaged x86_64 runtime remains
> locally verified but was not deployed in this AWS run.

## Current Snapshot

| Field | Value |
| --- | --- |
| Latest verification date | 2026-07-12 |
| Latest verification baseline | `b40def8` (`fix: enforce S3 object semantics`) |
| Region | Full AWS correctness suite in `eu-central-1`; deterministic local gates |
| Latest verification runs | `2026-07-12-aws-object-semantics` and `2026-07-12-local-object-semantics` |
| Cleanup | All 15 verification stacks were destroyed and confirmed absent. All 15 scenario buckets were confirmed absent after the one intentionally retained lifecycle bucket was explicitly emptied and deleted. |
| Raw evidence | Not committed; raw AWS output remains in scratch only |
| Scenario runner | `pnpm verify list`, `pnpm verify synth`, `pnpm verify deploy`, or `pnpm verify destroy`; ordered update chains remain serial within concurrent groups |

## Current Coverage

| Priority | Area | Latest Evidence | Status |
| --- | --- | --- | --- |
| P0 | Rust provider tests | 115 tests cover CloudFormation protocol/lifecycle behavior, source ZIP integrity, catalog trust, normalized object semantics, request/archive preflight, bounded marker replacement, permanent-error classification, one SDK attempt per application PUT attempt, and exact lost-response reconciliation. One credential-gated generated S3 integration test is ignored locally. | Pass as of 2026-07-12 |
| P0 | TypeScript and release-script tests | 60 Vitest tests cover construct synthesis, assets, IAM, validation, and bounded materialization; five Node tests cover release provenance guards. | Pass as of 2026-07-12 |
| P0 | Build, package, and supply chain | TypeScript build/package/typecheck, Biome, Rust fmt/clippy/all-feature tests, package smoke verification, npm audit, cargo audit, cargo deny, cargo-machete, actionlint, immutable Action references, and Taplo all pass. | Pass as of 2026-07-12 |
| P0 | Scenario synthesis | All 21 default verification phases synthesize locally, including the ordered metadata update chain. | Pass as of 2026-07-12 |
| P0 | Packaged provider runtime | Rebuilt arm64 provider completed the full AWS suite; rebuilt arm64 and x86_64 archives both pass local package verification. | arm64 AWS pass; x86_64 local pass as of 2026-07-12 |
| P0 | Object semantic convergence | Create treats prior destination settings as unknown. Update compares normalized user/system settings for each final key and forces extracted PUTs and `extract=false` copies when semantics change. Equivalent inferred content type and implicit `private` / `STANDARD` defaults do not cause redundant rewrites. | Pass locally and in AWS as of 2026-07-12 |
| P0 | Lost-response convergence | Deterministic wire replay proves conditional conflict success only for exact size, full-object SHA-256, visible metadata, and effective ACL; size, checksum, metadata, and ACL mismatches fail closed. | Pass as of 2026-07-12 |
| P0 | Mutation preflight | Final key bytes, single-request PUT/COPY sizes, user/system metadata, controlled request headers, archive counts/totals/spans, aggregate output arithmetic, and actual marker-expanded output are validated before destination mutation. | Pass as of 2026-07-12 |
| P0 | AWS end-to-end deployment | All 21 ordered phases across 15 stacks passed with the packaged arm64 Lambda, covering simple/root deployments, filters, metadata, markers, source overwrite, update/delete lifecycle chains, `extract=false`, large ranged archives, KMS, and CloudFront. | Pass as of 2026-07-12 |
| P0 | Metadata-only AWS update | Identical extracted and copied bytes retained the same length and content identities while user metadata, cache control, content type, and storage class changed. Both objects received new modification times, proving physical rewrites. | Pass as of 2026-07-12 |
| P1 | Authenticated catalog trust | Only template-bound catalogs receive sparse-skip trust; strict mapping and authenticated entry checks remain covered locally and in the full AWS suite. | Pass as of 2026-07-12 |

## Latest Verification Runs

| Run | Category | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| `2026-07-12-aws-object-semantics` | aws | All 21 ordered phases across 15 stacks at `b40def8` | Pass | The packaged arm64 provider completed the full default suite. The metadata chain additionally proved identical-byte physical rewrites and exact convergence for extracted and copied objects. Marker-bearing scenarios exercised the read-only expansion preflight. Every stack reached a complete state, all 15 destroy targets completed, and no verification stack or bucket remained after explicit retained-bucket cleanup. |
| `2026-07-12-local-object-semantics` | local | Full static, unit, package, audit, and default-scenario synthesis gates at `b40def8` | Pass | 115 Rust tests passed with one credential-gated integration test ignored; 60 Vitest and five Node tests passed. Both provider architectures rebuilt and passed package smoke verification. Build/package/typecheck/lint, Clippy, audits, dependency checks, workflow/TOML checks, and all 21 scenario syntheses passed. |

## Known Limitations

- Unchanged CloudFormation settings intentionally do not trigger one `HeadObject` per destination object, so out-of-band metadata drift is not discovered by the normal single-list planning path.
- Exact conditional-write reconciliation requires a readable full-object SHA-256, visible metadata, and ACL. Missing or inaccessible evidence fails safely instead of reporting success.
- Marker-bearing entries currently undergo a read-only materialization preflight and may be materialized again for transfer. They must fit in Lambda memory until the deterministic streaming replacement work is implemented.
- The packaged x86_64 provider passes local artifact and consumer smoke verification but was not refreshed in AWS.
- CloudFormation callback fault injection is deterministic and local; cross-bucket lifecycle moves and changed-distribution authorization retain local coverage and were not separately fault-injected in this AWS run.
- Raw AWS evidence is intentionally excluded from git. Replace this page with a sanitized snapshot after the next complete correctness run.
