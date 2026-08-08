// Validation of synthesized custom-resource properties and hand-built smoke
// payloads against the single wire-contract schema.
//
// The contract is authored once in `contract/wire-contract.mjs`; this module
// only applies it, it does not re-declare the key tree. Two directions are
// guarded against drift:
//
// - `assertPayloadTree` runs in the synth test against the synthesized
//   `ResourceProperties` and validates them against the template-properties
//   schema (contract/wire-contract.mjs). Synthesis leaves CloudFormation
//   tokens (Ref objects and friends) at leaf values, so the walk is
//   schema-driven: every emitted key must be declared by the contract, every
//   key the decoder requires must be emitted, nesting/array arity must match,
//   and any *literal* leaf or record value must match its schema type. Token
//   leaves are recognized by their CloudFormation intrinsic shape, their own
//   payload is validated against the template syntax that intrinsic accepts
//   (`{ Ref: 123 }` and `{ "Fn::Join": "not-an-array" }` fail), and the leaf
//   value itself is not type-checked, because only the deployed request
//   carries its resolved value.
// - `assertPayloadWithinSynthShape` runs in `smoke-provider.mjs`: the
//   hand-built smoke payload carries plain values, so it is validated against
//   the runtime ResourceProperties schema in full, including value shapes.
//
// The Rust decoder is bound to the same contract by
// `rust/src/wire_contract.rs`, which loads the committed JSON Schema artifact
// (`contract/wire-schema.json`, rendered from the schema by
// `scripts/generate-wire-schema.mjs`) and asserts the decoder agrees with it
// in both directions. Renaming a key on either side alone therefore fails.

import { z } from "zod";
import { templatePropertiesSchema, wireContractSchema } from "../contract/wire-contract.mjs";

// Paths the provider's strict decoder requires that every end-to-end payload
// must exercise; keeps the smoke payload from silently dropping a
// load-bearing key. The reserved custom-resource envelope keys are included
// because CloudFormation delivers them inside `ResourceProperties` (commit
// c530bf7 records the production failure when the decoder rejected a real
// event over `ServiceTimeout`): dropping either from the fixture would make
// the smoke run pass while every real CDK deployment failed.
export const REQUIRED_PAYLOAD_PATHS = [
  ["Transfer", "AdvancedTuning", "DestinationWriteRetry"],
  ["ServiceToken"],
  ["ServiceTimeout"],
];

// CloudFormation intrinsic function keys: a one-key object carrying one of
// these is a CDK token rendered into template syntax, not a literal value.
// `Ref` and the `Fn::*` family are the whole intrinsic vocabulary of a
// synthesized template.
const CFN_INTRINSIC_KEYS = new Set([
  "Ref",
  "Condition",
  "Fn::And",
  "Fn::Base64",
  "Fn::Cidr",
  "Fn::Contains",
  "Fn::EachMemberEquals",
  "Fn::EachMemberIn",
  "Fn::Equals",
  "Fn::FindInMap",
  "Fn::GetAtt",
  "Fn::GetAZs",
  "Fn::If",
  "Fn::ImportValue",
  "Fn::Join",
  "Fn::Length",
  "Fn::Not",
  "Fn::Or",
  "Fn::RefAll",
  "Fn::Select",
  "Fn::Split",
  "Fn::Sub",
  "Fn::ToJsonString",
  "Fn::Transform",
  "Fn::ValueOf",
  "Fn::ValueOfAll",
]);
const UNRESOLVED_TOKEN_PATTERN = /^\$\{Token\[/;

const ANY_VALUE = () => true;
const STRING_VALUE = (value) => typeof value === "string";
const NUMBER_VALUE = (value) => typeof value === "number";

function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function arrayOf(minLength, maxLength, elementCheck) {
  return (value) =>
    Array.isArray(value) &&
    value.length >= minLength &&
    value.length <= maxLength &&
    value.every((element, index) => elementCheck(element, index));
}

function oneOf(...checks) {
  return (value) => checks.some((check) => check(value));
}

/**
 * The payload shape each CloudFormation intrinsic carries, per the template
 * syntax of AWS::CloudFormation. Slots that may hold a nested intrinsic or a
 * literal of any JSON type use `ANY_VALUE`; the shapes are still strict
 * enough that `{ Ref: 123 }` or `{ "Fn::Join": "not-an-array" }` cannot pass
 * as a token and skip leaf validation. Every key in `CFN_INTRINSIC_KEYS` must
 * have an entry here — `isCfnToken` throws on a missing entry, so the
 * vocabulary cannot grow without a reviewed shape.
 */
const CFN_INTRINSIC_SHAPES = {
  Ref: STRING_VALUE,
  Condition: STRING_VALUE,
  "Fn::And": arrayOf(2, 10, ANY_VALUE),
  "Fn::Or": arrayOf(2, 10, ANY_VALUE),
  "Fn::Not": arrayOf(1, 1, ANY_VALUE),
  "Fn::Equals": arrayOf(2, 2, ANY_VALUE),
  "Fn::Base64": ANY_VALUE,
  "Fn::Cidr": arrayOf(3, 3, (value, index) => (index === 0 ? STRING_VALUE(value) : NUMBER_VALUE(value))),
  "Fn::Contains": arrayOf(2, 2, ANY_VALUE),
  "Fn::EachMemberEquals": arrayOf(2, 2, ANY_VALUE),
  "Fn::EachMemberIn": arrayOf(2, 2, ANY_VALUE),
  "Fn::FindInMap": arrayOf(3, 4, (value, index) => (index < 3 ? STRING_VALUE(value) : ANY_VALUE(value))),
  "Fn::GetAtt": oneOf(STRING_VALUE, arrayOf(2, 2, STRING_VALUE)),
  "Fn::GetAZs": STRING_VALUE,
  "Fn::If": arrayOf(3, 3, (value, index) => (index === 0 ? STRING_VALUE(value) : ANY_VALUE(value))),
  "Fn::ImportValue": ANY_VALUE,
  "Fn::Join": arrayOf(2, 2, (value, index) => (index === 0 ? STRING_VALUE(value) : Array.isArray(value))),
  "Fn::Length": oneOf(STRING_VALUE, Array.isArray),
  "Fn::RefAll": STRING_VALUE,
  "Fn::Select": arrayOf(2, 2, (value, index) => (index === 0 ? oneOf(STRING_VALUE, NUMBER_VALUE)(value) : Array.isArray(value))),
  "Fn::Split": arrayOf(2, 2, (value, index) => (index === 0 ? STRING_VALUE(value) : ANY_VALUE(value))),
  "Fn::Sub": oneOf(STRING_VALUE, arrayOf(2, 2, (value, index) => (index === 0 ? STRING_VALUE(value) : isPlainRecord(value)))),
  "Fn::ToJsonString": ANY_VALUE,
  "Fn::Transform": isPlainRecord,
  "Fn::ValueOf": arrayOf(3, 3, STRING_VALUE),
  "Fn::ValueOfAll": arrayOf(2, 2, STRING_VALUE),
};

/**
 * Thrown when a one-key object uses a CloudFormation intrinsic key with a
 * payload shape template syntax does not allow. Union branches must rethrow
 * it rather than trying the next branch: the value is a token-shaped object,
 * so no literal branch can accept it, and the descriptive message must reach
 * the caller.
 */
export class CfnIntrinsicShapeError extends Error {}

/**
 * True when `value` is a CloudFormation token rendered into template syntax:
 * a one-key object holding a single intrinsic, or an unresolved
 * `${Token[...]}` string. Tokens may appear anywhere the construct emits a
 * resolved value, so the structural walk accepts them at every leaf and
 * inside records without type-checking them — but the intrinsic's own
 * payload shape is validated first. A one-key object whose key is in the
 * intrinsic vocabulary but whose payload is malformed throws instead of
 * skipping leaf validation, so a construct bug like `{ Ref: 123 }` or
 * `{ "Fn::Join": "not-an-array" }` cannot ride the token hole past the
 * schema.
 */
export function isCfnToken(value, label = "a wire leaf") {
  if (typeof value === "string") {
    return UNRESOLVED_TOKEN_PATTERN.test(value);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || !CFN_INTRINSIC_KEYS.has(keys[0])) {
    return false;
  }
  const key = keys[0];
  const shape = CFN_INTRINSIC_SHAPES[key];
  if (shape === undefined) {
    throw new CfnIntrinsicShapeError(
      `Unvalidated CloudFormation intrinsic ${key} at ${label}: the synth ` +
        `guard's intrinsic shape table has no entry for it. Add the template ` +
        `form it accepts before the construct may emit it.`,
    );
  }
  if (!shape(value[key])) {
    throw new CfnIntrinsicShapeError(
      `Malformed CloudFormation intrinsic ${key} at ${label}: ` +
        `${JSON.stringify(value)} is not one of the shapes ${key} accepts in ` +
        `template syntax, so it cannot skip the wire-contract type check.`,
    );
  }
  return true;
}

function describeIssues(error) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Asserts that `value` conforms to the template-properties schema: every key
 * it carries is declared by the provider's decoder and every key the decoder
 * requires is present, at every nesting level. Literal leaf values (strings,
 * numbers, booleans, null) and record values must match their schema types;
 * CloudFormation token leaves are accepted untyped because synthesis renders
 * them there.
 */
export function assertPayloadTree(value, schema = templatePropertiesSchema) {
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
      if (!isFieldOptional(shape[key]) && !(key in value)) {
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
    // A nullable union accepts null as a whole; an optional-only union does
    // not, and must fall through to the branches, which will reject it.
    if (value === null && schema.isNullable()) {
      return;
    }
    // Any branch that matches the value is acceptable; pick the first one.
    for (const option of unwrapped.options) {
      try {
        walkStructure(value, option, path, where);
        return;
      } catch (error) {
        if (error instanceof CfnIntrinsicShapeError) {
          throw error;
        }
        // Try the next union branch.
      }
    }
    throw new Error(`${where} ${label}: matches no wire-contract union branch`);
  }
  if (unwrapped instanceof z.ZodRecord) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${where} ${label}: expected an object`);
    }
    const valueSchema = unwrapped._def.valueType;
    for (const key of Object.keys(value)) {
      walkStructure(value[key], valueSchema, [...path, key], where);
    }
    return;
  }
  if (unwrapped instanceof z.ZodUnknown) {
    return;
  }
  // Leaf (string, number, boolean, null, enum): a token renders here before
  // resolution, so accept it untyped; anything else must match the schema's
  // value language. A construct emitting a number where a string belongs is
  // exactly the drift the Rust decoder would otherwise catch only at deploy
  // time.
  if (isCfnToken(value, `${where} ${label}`)) {
    return;
  }
  // Validate against the original schema, not the unwrapped one: the optional/
  // nullable/nullish wrappers decide whether an absent or null leaf is legal,
  // and the value language (string vs number vs boolean vs enum) is the
  // schema's own check.
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `${where} ${label}: value ${JSON.stringify(value)} does not match the wire ` +
        `contract's type for this key:\n${describeIssues(result.error)}`,
    );
  }
}

/**
 * Whether a declared object key may be absent from the payload. This must
 * mirror the JSON Schema artifact's `required` arrays (which the Rust
 * requiredness test reads): an explicit optional/nullish/default wrapper makes
 * a key optional, anything else keeps it required. `zod`'s `isOptional()` is
 * not usable here because `z.unknown()` accepts `undefined` and would report
 * a required unknown-typed key (the envelope's `ServiceToken`) as optional.
 */
function isFieldOptional(schema) {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
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
