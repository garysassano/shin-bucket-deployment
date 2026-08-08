import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { wireContractSchema } from "../../contract/wire-contract.mjs";

type MatrixCase = {
  readonly id: string;
  readonly path: readonly string[];
  readonly value: unknown;
  readonly accept: boolean;
  readonly note?: string;
};

type Matrix = {
  readonly schemaVersion: number;
  readonly caseCount: number;
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
    SourceMarkersConfig: [{}],
    Destination: { BucketName: "destination" },
    DestinationOwnerId: "owner",
    SourceProcessing: {
      MaxUncompressedEntryBytes: 1024,
      MaxCompressionRatio: 100,
      Exclude: [],
      Include: [],
    },
    DestinationLifecycle: { OnDeploy: {}, OnChange: {}, OnDelete: {} },
    CloudfrontInvalidation: { Paths: [] },
    Transfer: { AdvancedTuning: { DestinationWriteRetry: {} } },
    DestinationBucketArn: null,
    ServiceToken: null,
    ServiceTimeout: null,
    DeploymentNonce: null,
  };
}

function setAtPath(
  payload: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): void {
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
  const MATRIX_SCHEMA_VERSION = 2;

  test("the baseline payload is itself schema-valid", () => {
    expect(wireContractSchema.safeParse(baselinePayload()).success).toBe(true);
  });

  test("the matrix carries pinned metadata: schemaVersion, caseCount, and unique stable ids", () => {
    expect(matrix.schemaVersion).toBe(MATRIX_SCHEMA_VERSION);
    expect(matrix.cases.length).toBe(matrix.caseCount);
    const ids = matrix.cases.map((entry) => entry.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the matrix covers every schema leaf and every union branch", () => {
    const expected = expectedLeafCoverage(wireContractSchema);
    for (const { path, kinds } of expected) {
      const matching = matrix.cases.filter((entry) => caseMatchesLeaf(entry.path, path));
      expect(
        matching.length,
        `leaf ${path.join(".")} has no matrix case`,
      ).toBeGreaterThan(0);
      for (const kind of kinds) {
        const covered =
          kind === "unknown"
            ? matching.length > 0
            : kind.startsWith("enum:")
              ? matching.some((entry) => entry.value === kind.slice("enum:".length))
              : matching.some((entry) => caseKind(entry) === kind);
        expect(
          covered,
          `leaf ${path.join(".")} has no case exercising branch kind ${kind} ` +
            `(cases: ${matching.map((entry) => JSON.stringify(entry.value)).join(", ")})`,
        ).toBe(true);
      }
    }
    // No case may target a path that is not a declared leaf: a deleted leaf
    // must take its cases with it instead of leaving orphans behind.
    for (const entry of matrix.cases) {
      expect(
        expected.some(({ path }) => caseMatchesLeaf(entry.path, path)),
        `matrix case ${entry.id} targets ${entry.path.join(".")}, which is not a schema leaf`,
      ).toBe(true);
    }
  });

  test("the schema agrees with every matrix case", () => {
    for (const [index, entry] of matrix.cases.entries()) {
      const payload = baselinePayload();
      setAtPath(payload, entry.path, entry.value);
      const result = wireContractSchema.safeParse(payload);
      expect(
        result.success,
        `case ${index} (${entry.id}) at ${entry.path.join(".")}`,
      ).toBe(entry.accept);
    }
  });

  test("semantic value boundaries hold without reading the matrix", () => {
    const withValue = (path: readonly string[], value: unknown): Record<string, unknown> => {
      const payload = baselinePayload();
      setAtPath(payload, path, value);
      return payload;
    };
    const accepted = (payload: Record<string, unknown>) =>
      wireContractSchema.safeParse(payload).success;

    // The u64 overflow boundary lives in the schema itself, not only in the
    // matrix rows.
    expect(
      accepted(
        withValue(["SourceProcessing", "MaxUncompressedEntryBytes"], "18446744073709551615"),
      ),
    ).toBe(true);
    expect(
      accepted(
        withValue(["SourceProcessing", "MaxUncompressedEntryBytes"], "18446744073709551616"),
      ),
    ).toBe(false);
    // Decimal strings are digits only: a leading plus must be rejected.
    expect(accepted(withValue(["Transfer", "MaxConcurrency"], "+42"))).toBe(false);
    expect(
      accepted(withValue(["SourceCatalogs", "[0]", "Version"], "+1")),
    ).toBe(false);
    // The reserved envelope keys are transport: any value and null pass.
    expect(accepted(withValue(["ServiceTimeout"], "900"))).toBe(true);
    expect(accepted(withValue(["ServiceToken"], 123))).toBe(true);
    expect(accepted(withValue(["ServiceToken"], null))).toBe(true);
  });
});

/**
 * Derives the matrix's required coverage from the schema itself: every leaf
 * path (object keys, `[0]` for the first array element, `<key>` for record
 * keys) and the value kinds each leaf can carry — one kind per union branch,
 * `null` when the schema accepts null, and the exact variants for enums.
 * The matrix must exercise all of them; see the coverage test above.
 */
function expectedLeafCoverage(schema: z.ZodTypeAny): ReadonlyArray<{
  readonly path: readonly string[];
  readonly kinds: readonly string[];
}> {
  const leaves: Array<{ path: string[]; kinds: Set<string> }> = [];
  const visit = (schema: z.ZodTypeAny, path: string[], nullable: boolean): void => {
    const unwrapped = unwrap(schema);
    if (unwrapped instanceof z.ZodObject) {
      for (const [key, child] of Object.entries(unwrapped.shape)) {
        visit(child, [...path, key], child.isNullable());
      }
      return;
    }
    if (unwrapped instanceof z.ZodArray) {
      leaves.push({ path: [...path], kinds: new Set(nullable ? ["array", "null"] : ["array"]) });
      visit(unwrapped.element, [...path, "[0]"], unwrapped.element.isNullable());
      return;
    }
    if (unwrapped instanceof z.ZodRecord) {
      visit(
        (unwrapped as z.ZodRecord)._def.valueType as z.ZodTypeAny,
        [...path, "<key>"],
        nullable,
      );
      return;
    }
    const kinds = leafKinds(unwrapped);
    if (nullable) {
      kinds.add("null");
    }
    leaves.push({ path: [...path], kinds });
  };
  visit(schema, [], false);
  return leaves;
}

function leafKinds(schema: z.ZodTypeAny): Set<string> {
  if (schema instanceof z.ZodString) return new Set(["string"]);
  if (schema instanceof z.ZodNumber) return new Set(["number"]);
  if (schema instanceof z.ZodBoolean) return new Set(["boolean"]);
  if (schema instanceof z.ZodUnknown) return new Set(["unknown"]);
  if (schema instanceof z.ZodEnum) {
    return new Set(schema.options.map((value) => `enum:${value}`));
  }
  if (schema instanceof z.ZodUnion) {
    return new Set(schema.options.flatMap((option) => [...leafKinds(option)]));
  }
  throw new Error(`unsupported wire-contract leaf schema ${schema.constructor.name}`);
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  while (current.isOptional() || current.isNullable()) {
    const inner = (current as z.ZodOptional<z.ZodTypeAny> | z.ZodNullable<z.ZodTypeAny>)._def
      .innerType;
    if (inner === undefined) break;
    current = inner;
  }
  return current;
}

/**
 * The value kind a matrix case exercises: the enum variant when the value is
 * one, otherwise the JSON type (or `array`). `unknown` leaves are covered by
 * any case.
 */
function caseKind(entry: MatrixCase): string {
  const { value } = entry;
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value;
  }
  return typeof value;
}

/** Whether a case path addresses a leaf path (record keys match any key). */
function caseMatchesLeaf(casePath: readonly string[], leafPath: readonly string[]): boolean {
  if (leafPath[leafPath.length - 1] === "<key>") {
    const prefix = leafPath.slice(0, -1);
    return (
      casePath.length === leafPath.length &&
      prefix.every((segment, index) => segment === casePath[index])
    );
  }
  return (
    casePath.length === leafPath.length &&
    casePath.every((segment, index) => segment === leafPath[index])
  );
}
