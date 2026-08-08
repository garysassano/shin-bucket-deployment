// Validation of synthesized custom-resource properties and hand-built smoke
// payloads against the single wire-contract schema.
//
// The contract is authored once in `contract/wire-contract.mjs`; this module
// only applies it, it does not re-declare the key tree. Two directions are
// guarded against drift:
//
// - `assertPayloadTree` runs in the synth test against the synthesized
//   `ResourceProperties`. Synthesis leaves CloudFormation tokens (Ref objects
//   and friends) at leaf values, so this check is a schema-driven structural
//   walk: every emitted key must be declared by the contract, every key the
//   decoder requires must be emitted, and nesting/array arity must match.
//   Value shapes are checked by `assertPayloadWithinSynthShape` and by the
//   Rust decoder test, which run against real (resolved) payloads.
// - `assertPayloadWithinSynthShape` runs in `smoke-provider.mjs`: the
//   hand-built smoke payload carries plain values, so it is validated against
//   the schema in full, including value shapes.
//
// The Rust decoder is bound to the same contract by
// `rust/src/wire_contract.rs`, which loads the committed JSON Schema artifact
// (`contract/wire-schema.json`, rendered from the schema by
// `scripts/generate-wire-schema.mjs`) and asserts the decoder agrees with it
// in both directions. Renaming a key on either side alone therefore fails.

import { z } from "zod";
import { wireContractSchema } from "../contract/wire-contract.mjs";

// Paths the provider's strict decoder requires that every end-to-end payload
// must exercise; keeps the smoke payload from silently dropping a
// load-bearing key.
export const REQUIRED_PAYLOAD_PATHS = [["Transfer", "AdvancedTuning", "DestinationWriteRetry"]];

function describeIssues(error) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Asserts that `value` conforms to the wire contract's structure: every key
 * it carries is declared by the provider's decoder and every key the decoder
 * requires is present, at every nesting level. Leaf values are not inspected
 * because synthesis renders CloudFormation tokens there; the same schema
 * validates real values elsewhere.
 */
export function assertPayloadTree(value, schema = wireContractSchema) {
  walkStructure(value, schema, [], "Synthesized custom-resource properties");
}

function walkStructure(value, schema, path, where) {
  const label = path.length > 0 ? path.join(".") : "(root)";
  const unwrapped = unwrap(schema);
  if (unwrapped instanceof z.ZodObject) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${where} ${label}: expected an object`);
    }
    const shape = unwrapped.shape;
    for (const key of Object.keys(value)) {
      if (!(key in shape)) {
        throw new Error(
          `${where} ${label}: undeclared wire key ${key} (not in contract/wire-contract.mjs)`,
        );
      }
      walkStructure(value[key], shape[key], [...path, key], where);
    }
    for (const key of Object.keys(shape)) {
      if (!shape[key].isOptional() && !(key in value)) {
        throw new Error(`${where} ${label}: missing wire key ${key} required by the decoder`);
      }
    }
    return;
  }
  if (unwrapped instanceof z.ZodArray) {
    if (!Array.isArray(value)) {
      throw new Error(`${where} ${label}: expected an array`);
    }
    for (const [index, item] of value.entries()) {
      walkStructure(item, unwrapped.element, [...path, `[${index}]`], where);
    }
    return;
  }
  if (unwrapped instanceof z.ZodUnion) {
    // Any branch that matches the value's structure is acceptable; pick the
    // first branch whose shape the value could have (null for nullable
    // branches, otherwise the first non-null branch).
    if (value === null) {
      return;
    }
    for (const option of unwrapped.options) {
      try {
        walkStructure(value, option, path, where);
        return;
      } catch {
        // Try the next union branch.
      }
    }
    throw new Error(`${where} ${label}: matches no wire-contract union branch`);
  }
  if (unwrapped instanceof z.ZodRecord) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${where} ${label}: expected an object`);
    }
    return;
  }
  if (unwrapped instanceof z.ZodEnum || unwrapped instanceof z.ZodUnknown) {
    return;
  }
  // Leaf (string, number, boolean, null): token objects and plain values are
  // both acceptable here; value shapes are validated against resolved
  // payloads by the schema's own checks and the Rust decoder test.
}

function unwrap(schema) {
  let current = schema;
  while ((current.isOptional() || current.isNullable()) && current._def.innerType !== undefined) {
    current = current._def.innerType;
  }
  return current;
}

/**
 * Asserts that `payload` is a valid instance of the wire contract (subset
 * direction, used by the smoke provider, whose payload deliberately omits
 * optional keys): every key is declared, required keys are present, and value
 * shapes match.
 */
export function assertPayloadWithinSynthShape(payload) {
  const result = wireContractSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      `Smoke payload does not conform to the wire contract ` +
        `(contract/wire-contract.mjs):\n${describeIssues(result.error)}`,
    );
  }
}

/** Asserts that every listed path resolves to a present value in `payload`. */
export function assertPayloadPaths(payload, paths = REQUIRED_PAYLOAD_PATHS) {
  for (const path of paths) {
    let node = payload;
    for (const segment of path) {
      if (node === null || typeof node !== "object" || !(segment in node)) {
        throw new Error(`payload is missing required path ${path.join(".")}`);
      }
      node = node[segment];
    }
  }
}
