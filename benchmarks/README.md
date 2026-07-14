# Benchmarks

This folder contains committed benchmark support assets, sanitized current result rows, and report/render tooling. Raw benchmark evidence stays outside the repo.

Deployable benchmark CDK apps live in `benchmarks/apps/**`. Curated benchmark matrices live in `benchmarks/configs/**`, shared JSON Schemas live in `benchmarks/schemas/**`, and benchmark configs are run through `pnpm benchmark:run-assets -- --config <path>`.

`configs/methodology-v2-1024-32.json` is the canonical approval-gated matrix: five sequential repetitions of `tiny-many` and `large-few` at 1024 MiB / 32 Shin transfers against one deduplicated upstream baseline per profile. Start with one repetition, report elapsed time and preliminary results, then resume repetitions 2–5 only after the maintainer approves an explicit wall-clock cap. The runner records a unique run/sample identity, exact source and deployed-provider identity, phase-local memory scope, and cleanup state. Upstream rows use `parallel: null` because that setting does not apply to AWS CDK `BucketDeployment`.

Methodology-v2 run IDs are opaque UUIDs. The scratch directory contains a resume manifest binding that UUID to the source commit and bootstrap, package/CDK identities, normalized benchmark configuration, phases, destination, and exact five-repetition sample matrix. A resume rejects identity drift or an evidence ledger change not recorded by the runner. The wall-clock limit is checked before every stack and between phases; an in-flight external command cannot be stopped at an exact timestamp, but after it returns the runner enters cleanup instead of starting another phase. `SIGINT` and `SIGTERM` terminate the active command process group and then attempt the same stack cleanup.

`configs/transfer-scheduler-2048-32.json` is the serialized 2048 MiB / 32-transfer decision matrix for the bounded scheduler: `tiny-many` and `large-few`, Shin and upstream, and the four ordered lifecycle phases. Repeat it with unique scratch roots and output files when collecting a multi-sample decision run; raw per-repetition evidence remains outside git.

`configs/marker-replacement-2048-32.json` is the comparable marker-path matrix. Its `marker-heavy` profile deploys one 16 MiB marker-bearing object plus four small ordinary files through Shin and upstream across create, unchanged, and changed phases. The fixture pads against fixed resolved parameter defaults so synthesized token placeholder lengths cannot change the deployed payload. Marker decision results and interpretation live in [`docs/benchmark.md`](../docs/benchmark.md#marker-replacement-performance-decision).

The runner adds a benchmark-only invocation token to the deployment custom resource for every phase. This guarantees that `unchanged-update` measures an actual provider invocation even when the deterministic asset and all functional deployment properties are unchanged; the token does not change the asset, destination, or provider algorithm.

Repeated historical decision runs belong in `results.jsonl` too. Their `decisionRunId`, `comparisonVariant`, and `repetition` fields preserve every sample instead of replacing an earlier repetition. Methodology-v2 runs use the general `runId`, `sampleId`, and `repetition` identity instead.

Rows without `methodologyVersion` are methodology v1 historical evidence. Default report and telemetry rendering selects only completed methodology-v2 rows. Pass `--methodology-version 1` to the comparison report only when intentionally inspecting historical results. Before any v2 report, telemetry table, or README snapshot is rendered, every required field and the exact matrix from the canonical config are validated; missing, duplicate, dirty, incomplete, or unplanned cells fail rendering. Methodology-v2 tables report `n`, median, Q1, Q3, and IQR.

Before expanding an AWS benchmark to multiple repetitions, run one smoke repetition per variant, report its elapsed time and preliminary signal, and obtain maintainer approval for the proposed repetition count and wall-clock budget. Every completed run writes its sanitized rows directly to `results.jsonl`; do not defer persistence until the whole matrix finishes.

Resume the printed smoke UUID with `--run-id <uuid> --start-repetition 2 --repetitions 4` and the same config, snapshot date, scratch location, destination, and approved cap. Asking for repetitions outside 1–5 is rejected.

README benchmark snapshots use sanitized tiny-many records from `benchmarks/results.jsonl`. Snapshot filenames follow `<profile>-<memory>mib-<parallel>.svg`, for example `tiny-many-1024mib-32.svg`.

Only README-linked snapshot SVGs are committed under `benchmarks/snapshots`. Temporary alternate layouts can be regenerated locally with `benchmarks/src/render/readme-snapshot.ts`, but should not be kept as committed design history. Generated report charts live beside the report output by default.

## Shin Provider Telemetry

- In-depth Shin provider telemetry: [`telemetry.md`](telemetry.md)
- Structured JSONL source: [`results.jsonl`](results.jsonl)

Regenerate the currently committed historical telemetry tables with `pnpm benchmark:telemetry-table -- --methodology-version 1`. Omit the selector after methodology-v2 evidence is committed. Provider diagnostics schema v3 separates deployment work status from callback delivery, records transfer-scheduler logical/completion/cancellation counters, exact source and destination upload wire attempts, deletion SDK calls with inferred outcomes, consumed body replays, typed source throttling/errors, callback attempts, and true active-reader high-water. Current marker rows also include `markerReplacement` strategy, semantics, planning-pass, and upload-pass fields. Historical rows render unavailable fields as `null`.

## 1024 MiB / 16 Snapshot

Four-phase snapshot using the latest tiny-many 1024 MiB Shin `maxParallelTransfers=16` rows.

![1024 MiB parallel 16 benchmark chart](snapshots/tiny-many-1024mib-16.svg)

## 1024 MiB / 32 Snapshot

Four-phase snapshot using the latest tiny-many 1024 MiB Shin `maxParallelTransfers=32` rows.

![1024 MiB parallel 32 benchmark chart](snapshots/tiny-many-1024mib-32.svg)

## 2048 MiB / 64 Snapshot

Four-phase snapshot using the latest tiny-many 2048 MiB Shin `maxParallelTransfers=64` rows.

![2048 MiB parallel 64 benchmark chart](snapshots/tiny-many-2048mib-64.svg)

## 10240 MiB / 320 Snapshot

Four-phase snapshot using the latest tiny-many 10240 MiB Shin `maxParallelTransfers=320` rows.

![10240 MiB parallel 320 benchmark chart](snapshots/tiny-many-10240mib-320.svg)
