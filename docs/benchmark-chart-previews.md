# Benchmark Chart Renderer Previews

These preview charts use the same sanitized `2026-05-09-rust-aws-tiny-many-1024` records from `docs/benchmark-history.jsonl`.

## Signal Split

Two metric panels, one for Lambda handler duration and one for max memory.

![Signal split benchmark chart](benchmark-assets/preview-signal-split.svg)

## Signal Scorecard

Phase-first rows. Each phase carries compact duration and memory bars, with the handler speedup called out on the right.

![Signal scorecard benchmark chart](benchmark-assets/preview-signal-scorecard.svg)

## Signal Cards

Each phase gets a larger card with speedup, memory saved, duration bars, and memory bars grouped together.

![Signal cards benchmark chart](benchmark-assets/preview-signal-cards.svg)

## Circuit Scorecard

Scorecard renderer with an alternate high-contrast palette.

![Circuit scorecard benchmark chart](benchmark-assets/preview-circuit-scorecard.svg)

## Circuit Cards

Card renderer with the alternate high-contrast palette.

![Circuit cards benchmark chart](benchmark-assets/preview-circuit-cards.svg)

## Forge Cards

Card renderer with a warmer palette.

![Forge cards benchmark chart](benchmark-assets/preview-forge-cards.svg)
