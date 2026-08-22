import { Construct } from "constructs";

/**
 * Normalizes a value into a canonical, order-independent JSON-serializable
 * form used for handler identity hashing.
 *
 * Documented edge cases:
 * - `undefined` entries inside objects are dropped; a top-level `undefined`
 *   stays `undefined` (JSON.stringify renders it as absent).
 * - Functions serialize as `{__function__: <source>}`, so identity changes
 *   when a function's source changes and differs between equivalent closures.
 * - Constructs serialize as `{__construct__: <node.addr>}`, so identity
 *   follows the construct tree, not the object identity.
 * - Object keys are sorted by UTF-16 code unit, the same ordering
 *   `compareUtf8` applies in `cataloged-source.ts`. This is deterministic by
 *   construction: the previous `localeCompare` form depended on the runtime's
 *   ICU collation, which orders `"a"` before `"B"` where code-unit order does
 *   the reverse, so a differently built Node could have produced a different
 *   handler identity for the same configuration. Code-unit order matches UTF-8
 *   byte order except for BMP characters in U+E000-U+FFFF versus astral
 *   characters; keys here are ASCII identifiers in practice.
 * - Symbols and bigints are not representable: `typeof value === "object"`
 *   falls through to `String(value)` for non-construct objects containing
 *   them only if the object itself is one of the handled shapes; a bare
 *   symbol/bigint argument reaches `String(value)` too (`"Symbol(x)"`,
 *   `"1"`). Callers only pass JSON-shaped values, so this is documented
 *   rather than fixed.
 */
export function normalizeSingletonValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "function") {
    return {
      __function__: value.toString(),
    };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSingletonValue(entry));
  }

  if (typeof value === "object") {
    if (Construct.isConstruct(value as Construct)) {
      return {
        __construct__: (value as Construct).node.addr,
      };
    }

    const normalizedEntries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, normalizeSingletonValue(entry)] as const)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

    return Object.fromEntries(normalizedEntries);
  }

  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeSingletonValue(value));
}
