# Archive

Superseded material, kept out of the active tree.

Nothing here is current. These files are not built, linted, type-checked, tested, or
published — `archive/` is outside every tooling scope (`package.json` `files`,
`tsconfig` `include`, `biome.json` `includes`, `vitest` `include`). Do not cite anything
in this directory as evidence for a current claim, and do not restore a file from here
without re-validating it against the present provider.

The repo carries exactly one benchmark methodology and one provider summary schema. When
either is superseded, the rows and renders that depend on the old one move here rather
than being kept readable by version-branching code. Git history and GitHub releases are
the record of how things used to work; this directory is only for artifacts that are
awkward to reconstruct from either.

Current evidence lives in `docs/benchmark.md`, `benchmarks/`, and `docs/verification.md`.

## Contents

| Path | What it is | Why it is here |
| --- | --- | --- |
| `benchmarks/results-archived.jsonl` | All 474 sanitized result rows ever committed | No row carries a current-schema (v5) provider summary — 80 are schema v3, 40 are v4, and the rest predate result-schema v2 or carry no summary. `benchmarks/results.jsonl` starts empty; the next canonical run is the first current evidence. |
| `benchmarks/ci-report.md`, `benchmarks/ci-telemetry.md` | Generated report and telemetry for the last CI run | Rendered from the archived rows above. |
| `benchmarks/telemetry.md` | Methodology-v1 provider telemetry tables | Rendered from the oldest archived rows. |
| `benchmarks/snapshots/` | Seven chart renders (two CI charts plus 1024/16, 1024/32, 2048/64, 4096/128, 10240/320) | All derive from archived rows. The 10240/320 configuration can no longer be synthesized at all — `transfer.maxConcurrency` is capped at 256. |
| `benchmarks/configs/*.json` | Five one-off run matrices | Historical sweeps and decision matrices. The surviving configs live in `benchmarks/configs/`. |
| `docs/benchmark-decisions.md` | Five performance-decision write-ups plus the last methodology-v1 snapshot narrative | The decisions they gated have all landed. One documents `kms-sha256`, a strategy withdrawn with SSE-KMS/SSE-DSSE destination support. |
| `docs/verification-history.md` | 37 verification runs predating the `0.11.0` baseline | Several exercise withdrawn behaviour (SSE-KMS/SSE-DSSE, universal SHA-256, ACL reconciliation, summary schemas v3/v4). |
