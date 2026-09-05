import { Construct } from "constructs";

/**
 * Normalizes a value into a canonical, order-independent JSON-serializable
 * form used for handler identity hashing.
 *
 * Object keys use deterministic UTF-16 code-unit ordering; array order is
 * preserved. Undefined object entries are omitted. Constructs serialize by
 * node address, and symbols and bigints serialize as strings.
 *
 * Functions are rejected because executable source cannot identify captured
 * state. Callers supply evaluated configuration instead of callbacks.
 */
export function normalizeSingletonValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "function") {
    throw new TypeError("Functions cannot be normalized into a stable identity.");
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
