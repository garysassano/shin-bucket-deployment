import { Construct } from "constructs";

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
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(normalizedEntries);
  }

  return String(value);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeSingletonValue(value));
}
