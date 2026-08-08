import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { wireContractSchema } from "../../contract/wire-contract.mjs";

type MatrixCase = {
  readonly path: readonly string[];
  readonly value: unknown;
  readonly accept: boolean;
  readonly note?: string;
};

type Matrix = {
  readonly schemaVersion: number;
  readonly cases: readonly MatrixCase[];
};

const matrix: Matrix = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "contract", "wire-acceptance-matrix.json"), "utf8"),
);

/**
 * A minimal payload that is valid under the runtime ResourceProperties schema
 * with every required key present, so each matrix case tests exactly the one
 * value it sets.
 */
function baselinePayload(): Record<string, unknown> {
  return {
    SourceBucketNames: ["assets"],
    SourceObjectKeys: ["site.zip"],
    SourceCatalogs: [{}],
    SourceMarkers: [{ marker: "value" }],
    Destination: { BucketName: "destination" },
    DestinationOwnerId: "owner",
    SourceProcessing: { MaxUncompressedEntryBytes: 1024, MaxCompressionRatio: 100 },
    DestinationLifecycle: { OnDeploy: {}, OnChange: {}, OnDelete: {} },
    CloudfrontInvalidation: {},
    Transfer: { AdvancedTuning: { DestinationWriteRetry: {} } },
  };
}

function setAtPath(payload: Record<string, unknown>, path: readonly string[], value: unknown): void {
  let node: unknown = payload;
  for (let index = 0; index < path.length - 1; index++) {
    const segment = path[index]!;
    if (segment === "[0]") {
      node = (node as unknown[])[0];
    } else {
      node = (node as Record<string, unknown>)[segment];
    }
    if (node === null || typeof node !== "object") {
      throw new Error(`matrix path ${path.join(".")} does not resolve in the baseline payload`);
    }
  }
  const last = path[path.length - 1]!;
  if (last === "[0]") {
    (node as unknown[])[0] = value;
  } else {
    (node as Record<string, unknown>)[last] = value;
  }
}

describe("wire-contract value acceptance matrix", () => {
  test("the baseline payload is itself schema-valid", () => {
    expect(wireContractSchema.safeParse(baselinePayload()).success).toBe(true);
  });

  test("the schema agrees with every matrix case", () => {
    for (const [index, entry] of matrix.cases.entries()) {
      const payload = baselinePayload();
      setAtPath(payload, entry.path, entry.value);
      const result = wireContractSchema.safeParse(payload);
      expect(result.success, `case ${index} (${entry.path.join(".")})`).toBe(entry.accept);
    }
  });
});
