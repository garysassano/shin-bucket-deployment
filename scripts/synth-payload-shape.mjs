// Checked-in source of truth for the custom-resource wire key tree a DEFAULT
// `ShinBucketDeployment` emits (one `Source.asset`, a destination bucket, and
// no other options). Two directions are guarded against drift:
//
// - `assertPayloadTree` (exact) runs in the synth test: the synthesized
//   `ResourceProperties` must match this tree key-for-key at every level, so
//   renaming a key on either side fails locally.
// - `assertPayloadWithinSynthShape` (subset) runs in `smoke-provider.mjs`:
//   the hand-built smoke payload must not emit keys outside this tree, so a
//   rename that reaches the construct but not the smoke script fails there.
//
// Node conventions (a leaf is `null`; objects are nested nodes):
//
//   null  -> a scalar or array value; children are not inspected
//   {}    -> the node must be present with no children (e.g. the load-bearing
//            `Transfer.AdvancedTuning.DestinationWriteRetry`, which the Rust
//            decoder requires and the construct emits as an empty object)
//   []    -> the node must be present as an empty array
//   [{...}] -> the node must be a non-empty array whose items match the entry
//            shape
//   {...} -> the node's children must match the given keys exactly
//
// Captured by synthesizing a default deployment with `Source.asset`, which
// embeds one catalog entry; a `Source.data`-only deployment omits
// `SourceCatalogs` entirely.
export const EXPECTED_DEFAULT_PAYLOAD_TREE = {
  ServiceToken: null,
  ServiceTimeout: null,
  SourceBucketNames: null,
  SourceObjectKeys: null,
  SourceCatalogs: [{ Version: null, Sha256: null }],
  Destination: {
    BucketName: null,
  },
  DestinationOwnerId: null,
  DestinationLifecycle: {
    OnDeploy: { DeleteStaleObjects: null },
    OnChange: { DeletePreviousObjects: null },
    OnDelete: { DeleteCurrentObjects: null },
  },
  CloudfrontInvalidation: { WaitForCompletion: null },
  SourceProcessing: {
    Extract: null,
    MaxUncompressedEntryBytes: null,
    MaxCompressionRatio: null,
  },
  OutputObjectKeys: null,
  Transfer: {
    AdvancedTuning: {
      DestinationWriteRetry: {},
    },
  },
};

// Paths the provider's strict decoder requires that every end-to-end payload
// must exercise; keeps the smoke payload from silently dropping a
// load-bearing key.
export const REQUIRED_PAYLOAD_PATHS = [["Transfer", "AdvancedTuning", "DestinationWriteRetry"]];

function assertObject(value, where) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${where}: expected an object`);
  }
}

/**
 * Asserts that `value` matches `tree` exactly: the same keys at every level,
 * with the same array arity and item shapes. Leaf values are not inspected.
 */
export function assertPayloadTree(value, tree, path = []) {
  assertObject(value, path.join(".") || "(root)");
  for (const key of Object.keys(tree)) {
    if (!(key in value)) {
      throw new Error(`${path.join(".") || "(root)"}: missing emitted key ${key}`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!(key in tree)) {
      throw new Error(`${path.join(".") || "(root)"}: unexpected emitted key ${key}`);
    }
  }
  for (const key of Object.keys(tree)) {
    const expected = tree[key];
    const actual = value[key];
    const where = [...path, key].join(".");
    if (expected === null) continue;
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        throw new Error(`${where}: expected an array`);
      }
      if (expected.length === 0) {
        if (actual.length !== 0) {
          throw new Error(`${where}: expected an empty array`);
        }
      } else {
        if (actual.length === 0) {
          throw new Error(`${where}: expected a non-empty array`);
        }
        for (const [index, item] of actual.entries()) {
          assertPayloadTree(item, expected[0], [...path, key, `[${index}]`]);
        }
      }
      continue;
    }
    assertObject(actual, where);
    assertPayloadTree(actual, expected, [...path, key]);
  }
}

/**
 * Asserts that every key in `payload` exists at the same path in `tree`
 * (subset direction, used by the smoke provider, whose payload deliberately
 * omits optional keys).
 */
export function assertPayloadWithinSynthShape(
  payload,
  tree = EXPECTED_DEFAULT_PAYLOAD_TREE,
  path = [],
) {
  assertObject(payload, path.join(".") || "(root)");
  for (const key of Object.keys(payload)) {
    const where = [...path, key].join(".");
    if (!(key in tree)) {
      throw new Error(
        `${where} is not emitted by the construct's default wire tree ` +
          "(scripts/synth-payload-shape.mjs); rename it there or drop it from the payload",
      );
    }
    const expected = tree[key];
    const actual = payload[key];
    if (expected === null) continue;
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        throw new Error(`${where}: expected an array`);
      }
      if (expected.length > 0) {
        for (const [index, item] of actual.entries()) {
          assertPayloadWithinSynthShape(item, expected[0], [...path, key, `[${index}]`]);
        }
      }
      continue;
    }
    assertObject(actual, where);
    assertPayloadWithinSynthShape(actual, expected, [...path, key]);
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
