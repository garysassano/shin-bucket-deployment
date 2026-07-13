import { Buffer } from "node:buffer";

const SEGMENT_BYTES = 1024 * 1024;
const SEGMENT_COUNT = 16;

export const MARKER_BENCHMARK_BYTES = SEGMENT_BYTES * SEGMENT_COUNT;
export const MARKER_BENCHMARK_VALUE_A = "benchmark-alpha";
export const MARKER_BENCHMARK_VALUE_B = "benchmark-beta";

export function markerBenchmarkPayload(state: string, markerA: string, markerB: string): string {
  const revision = state === "changed" ? "changed" : "stable";
  const resolvedMarkers = markerSegment(
    revision,
    MARKER_BENCHMARK_VALUE_A,
    MARKER_BENCHMARK_VALUE_B,
  );
  const fillerBytes = SEGMENT_BYTES - Buffer.byteLength(resolvedMarkers);
  if (fillerBytes < 0) {
    throw new Error("Marker benchmark values exceed the fixed segment size.");
  }

  const segment = `${"x".repeat(fillerBytes)}${markerSegment(revision, markerA, markerB)}`;
  return segment.repeat(SEGMENT_COUNT);
}

function markerSegment(revision: string, markerA: string, markerB: string): string {
  return [`marker-a=${markerA}`, `marker-b=${markerB}`, `revision=${revision}`, "\n"].join(";");
}
