// Single source of truth for the custom-resource wire contract shared by the
// TypeScript construct and the Rust provider decoder.
//
// The contract is authored exactly once, here, as a Zod schema whose property
// names are the wire names (`SourceBucketNames`, `Destination.BucketName`,
// `Transfer.AdvancedTuning.SourceWindowMemoryBudgetMiB`, ...). It is consumed
// in three directions, none of which can drift from it silently:
//
// - `scripts/synth-payload-shape.mjs` validates the properties the construct
//   synthesizes against `templatePropertiesSchema`, so a key the construct
//   emits that the decoder does not declare fails locally at synthesis time.
// - `scripts/generate-wire-schema.mjs` renders the JSON Schema artifact
//   `contract/wire-schema.json` from `wireContractSchema` (the runtime
//   ResourceProperties schema) and checks it in; the `verify:wire-contract`
//   gate regenerates it and fails when it drifts.
// - `rust/src/wire_contract.rs` loads the committed artifact — which is bound
//   to the runtime ResourceProperties schema, the decoder's own contract — and
//   asserts the strict `RawDeploymentRequest` decoder agrees with it in both
//   directions: every declared property path is accepted, anything else is
//   rejected, requiredness matches, and the value-acceptance matrix in
//   `contract/wire-acceptance-matrix.json` holds on both sides. A rename on
//   either side alone fails that test.
//
// This module deliberately lives outside `src/`: the published package has
// zero runtime dependencies, and nothing under `src/` may import it (or zod).
//
// Two schemas are exported because two contracts are in play, and they are not
// the same object:
//
// - `wireContractSchema` is the **runtime ResourceProperties** schema: the
//   properties CloudFormation delivers to the provider. It is what the Rust
//   decoder binds to (through the committed artifact). Its value language
//   mirrors the Rust deserializers exactly (see the acceptance matrix).
// - `templatePropertiesSchema` is the **template properties** schema: what
//   the synthesized `AWS::CloudFormation::CustomResource` carries. It is what
//   the synth assertion binds to. It differs from the runtime schema only on
//   the envelope keys: `ServiceToken` and `ServiceTimeout` are reserved
//   custom-resource properties (documented on
//   AWS::CloudFormation::CustomResource, separate from the deployment inputs)
//   that CDK's `CustomResource` renders unconditionally, so the template
//   schema requires them while the runtime schema treats them as optional
//   transport the provider parses and drops.
//
//   CloudFormation empirically delivers both reserved keys *inside*
//   `ResourceProperties` (commit c530bf7 records the production failure where
//   the strict decoder rejected a real event with "unknown field
//   `ServiceTimeout`"), so the runtime schema and the smoke fixture declare
//   them too: with `deny_unknown_fields`, the provider would reject every real
//   request otherwise.
//
// The schema mirrors `rust/src/request.rs`:
// - `rename_all = "PascalCase"` maps each snake_case field to its wire name;
//   explicit `#[serde(rename)]` overrides are preserved (`Paths`,
//   `SourceWindowMemoryBudgetMiB`).
// - Fields without `#[serde(default)]` are required; fields with a default are
//   optional at the wire level.
// - Plain `Option<T>` fields accept `null`; fields using
//   `deserialize_present*` / `deserialize_optional_*` reject a present `null`
//   for the optional-shape helpers only where noted. `Vec` fields with a
//   default reject `null`.
// - `deserialize_boolish` accepts booleans and true/false strings;
//   `deserialize_u64ish`/`deserialize_usizeish`/`deserialize_present_u32ish`
//   accept unsigned integers and decimal strings.

import { z } from "zod";

/** Wire form of `deserialize_boolish`: boolean or a true/false string. */
const boolish = z.union([
  z.boolean(),
  z.string().regex(/^(?:true|false|True|False|TRUE|FALSE)$/),
]);

/** Wire form of the `*_u64ish`/`*_usizeish` helpers: unsigned int or decimal string. */
const unsigned = z.union([z.number().int().min(0), z.string().regex(/^\d+$/)]);

/** Wire form of `deserialize_present_u32ish` (SourceCatalogs entry version). */
const catalogVersion = z.union([
  z.number().int().min(0).max(4_294_967_295),
  z.string().regex(/^\d+$/),
]);

const sourceCatalogSchema = z.strictObject({
  Version: catalogVersion.optional(),
  Sha256: z.string().optional(),
});

const destinationSchema = z.strictObject({
  BucketName: z.string(),
  KeyPrefix: z.string().nullish(),
});

const sourceProcessingSchema = z.strictObject({
  Extract: boolish.optional(),
  MaxUncompressedEntryBytes: unsigned,
  MaxCompressionRatio: unsigned,
  Exclude: z.array(z.string()).optional(),
  Include: z.array(z.string()).optional(),
});

const destinationLifecycleSchema = z.strictObject({
  OnDeploy: z.strictObject({
    DeleteStaleObjects: boolish.optional(),
  }),
  OnChange: z.strictObject({
    DeletePreviousObjects: boolish.optional(),
    PreviousBucketName: z.string().nullish(),
    InvalidatePreviousDistribution: z.string().nullish(),
  }),
  OnDelete: z.strictObject({
    DeleteCurrentObjects: boolish.optional(),
  }),
});

const cloudfrontInvalidationSchema = z.strictObject({
  DistributionId: z.string().nullish(),
  // Explicit `#[serde(rename = "Paths")]` on the Rust side; the PascalCase
  // default would render `DistributionPaths`.
  Paths: z.array(z.string()).nullish(),
  WaitForCompletion: boolish.optional(),
});

const destinationWriteRetrySchema = z.strictObject({
  MaxAttempts: unsigned.nullish(),
  BaseDelayMs: unsigned.nullish(),
  MaxDelayMs: unsigned.nullish(),
  SlowdownBaseDelayMs: unsigned.nullish(),
  SlowdownMaxDelayMs: unsigned.nullish(),
  Jitter: z.enum(["full", "none"]).nullish(),
});

const advancedTuningSchema = z.strictObject({
  SourceBlockBytes: unsigned.nullish(),
  SourceBlockMergeGapBytes: unsigned.nullish(),
  SourceGetConcurrency: unsigned.nullish(),
  SourceWindowBytes: unsigned.nullish(),
  // Explicit `#[serde(rename = "SourceWindowMemoryBudgetMiB")]` on the Rust
  // side; PascalCase would render `SourceWindowMemoryBudgetMib`.
  SourceWindowMemoryBudgetMiB: unsigned.nullish(),
  DestinationWriteRetry: destinationWriteRetrySchema,
});

const transferSchema = z.strictObject({
  MaxConcurrency: unsigned.nullish(),
  AdvancedTuning: advancedTuningSchema,
});

/**
 * The runtime `ResourceProperties` contract: the complete
 * `RawDeploymentRequest` wire contract, including the CloudFormation
 * custom-resource envelope (`ServiceToken`, `ServiceTimeout`) that arrives
 * inside `ResourceProperties` (see the module doc), the opaque
 * `DeploymentNonce` redeploy trigger, and every optional nested tuning field.
 *
 * This is the schema the Rust decoder binds to: `generate-wire-schema.mjs`
 * renders the committed artifact from it, and the acceptance matrix in
 * `contract/wire-acceptance-matrix.json` pins its value language against the
 * decoder.
 */
export const wireContractSchema = z.strictObject({
  SourceBucketNames: z.array(z.string()),
  SourceObjectKeys: z.array(z.string()),
  SourceCatalogs: z.array(sourceCatalogSchema).nullish(),
  SourceMarkers: z.array(z.record(z.string())).optional(),
  SourceMarkersConfig: z
    .array(
      z.strictObject({
        // Deliberate camelCase outlier: the public API property is upstream
        // `markersConfig.jsonEscape` and the provider mirrors that name.
        jsonEscape: boolish.optional(),
      }),
    )
    .optional(),
  Destination: destinationSchema,
  SourceProcessing: sourceProcessingSchema,
  DestinationLifecycle: destinationLifecycleSchema,
  CloudfrontInvalidation: cloudfrontInvalidationSchema,
  Transfer: transferSchema,
  OutputObjectKeys: boolish.optional(),
  DestinationBucketArn: z.string().nullish(),
  DestinationOwnerId: z.string(),
  // Transport, not deployment input: typed as unknown so a protocol
  // representation change cannot fail a deployment over a field the provider
  // parses and drops (the Rust decoder declares them as serde_json::Value).
  ServiceToken: z.unknown().nullish(),
  ServiceTimeout: z.unknown().nullish(),
  DeploymentNonce: z.string().nullish(),
});

/**
 * The template-properties contract: what the construct synthesizes for the
 * `AWS::CloudFormation::CustomResource`. This is `wireContractSchema` plus the
 * reserved custom-resource envelope keys, which CDK's `CustomResource` renders
 * unconditionally (`serviceToken` and `serviceTimeout`), so they are required
 * here. The synth assertion (`assertPayloadTree`) binds to this schema; the
 * provider and the smoke fixture bind to `wireContractSchema`.
 */
export const templatePropertiesSchema = wireContractSchema.extend({
  ServiceToken: z.unknown(),
  ServiceTimeout: z.unknown(),
});
