import { Buffer } from "node:buffer";
import { describe, expect, test } from "vitest";
import {
  MARKER_BENCHMARK_BYTES,
  MARKER_BENCHMARK_VALUE_A,
  MARKER_BENCHMARK_VALUE_B,
  markerBenchmarkPayload,
} from "../../benchmarks/src/marker-payload";

describe("marker benchmark payload", () => {
  test.each(["baseline", "changed"])("resolves to stable fixed bytes for %s state", (state) => {
    const short = markerBenchmarkPayload(state, "TOKEN_A", "TOKEN_B")
      .replaceAll("TOKEN_A", MARKER_BENCHMARK_VALUE_A)
      .replaceAll("TOKEN_B", MARKER_BENCHMARK_VALUE_B);
    const long = markerBenchmarkPayload(state, "LONG_TOKEN_A_123", "LONG_TOKEN_B_456")
      .replaceAll("LONG_TOKEN_A_123", MARKER_BENCHMARK_VALUE_A)
      .replaceAll("LONG_TOKEN_B_456", MARKER_BENCHMARK_VALUE_B);

    expect(long).toBe(short);
    expect(Buffer.byteLength(short)).toBe(MARKER_BENCHMARK_BYTES);
  });
});
