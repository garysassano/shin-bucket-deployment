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
// - `deserialize_boolish` accepts booleans and true/false strings in any
//   case (CloudFormation stringifies scalars on some paths);
// - `deserialize_u64ish`/`deserialize_usizeish`/`deserialize_present_u32ish`
//   accept unsigned integers and decimal strings; the optional variants trim
//   surrounding whitespace and treat a whitespace-only value as absent;
// - the integer bounds below mirror the Rust parsers exactly: numbers are
//   capped at MAX_SAFE_INTEGER (a larger JSON number cannot be represented
//   exactly in JavaScript; use the decimal-string form instead), and decimal
//   strings are capped at the Rust integer width they feed (u64 or u32).
//
// The value language on both sides is pinned by the acceptance matrix in
// `contract/wire-acceptance-matrix.json`: every case sets one value at one
// wire path, and the Zod schema and the Rust decoder must agree on whether the
// payload is accepted. Where a divergence was found, the schema was tightened
// or widened to the *intended* rule instead of changing Rust.

import { z } from "zod";

const U64_MAX = 18_446_744_073_709_551_615n;
const U32_MAX = 4_294_967_295;
const JS_INTEGER_MAX = Number.MAX_SAFE_INTEGER;

/**
 * Wire form of `deserialize_boolish`: boolean or a true/false string in any
 * case (`deserialize_boolish` lowercases before matching). No surrounding
 * whitespace is accepted, mirroring the Rust visitor.
 */
const boolish = z.union([
  z.boolean(),
  z.string().regex(/^(?:[tT][rR][uU][eE]|[fF][aA][lL][sS][eE])$/),
]);

/**
 * Wire form of the required `deserialize_u64ish` helper: an exact integer or
 * a decimal string within u64 range. The string branch deliberately rejects
 * surrounding whitespace and the empty string, matching the required helper's
 * strict visitor; the optional helpers use `unsignedOptional` instead.
 */
const unsigned = z.union([
  z.number().int().min(0).max(JS_INTEGER_MAX),
  z
    .string()
    .regex(/^\d+$/)
    // zod v4 runs refinements on the raw input before the base checks, so the
    // refine must be total: only decimal strings reach the BigInt bound.
    .refine((value) => typeof value === "string" && /^\d+$/.test(value) && BigInt(value) <= U64_MAX),
]);

/**
 * Wire form of the optional `deserialize_optional_usizeish`/`..._u64ish`
 * helpers: an exact integer, a decimal string within u64 range, or a
 * whitespace-only string meaning absent (the optional visitor trims and maps
 * an empty result to `None`). Surrounding whitespace around digits is
 * accepted and trimmed, mirroring the visitor.
 */
const unsignedOptional = z.union([
  z.number().int().min(0).max(JS_INTEGER_MAX),
  z
    .string()
    .regex(/^\s*(?:\d+)?\s*$/)
    .refine((value) => {
      if (typeof value !== "string") {
        return false;
      }
      const trimmed = value.trim();
      return trimmed === "" || (/^\d+$/.test(trimmed) && BigInt(trimmed) <= U64_MAX);
    }),
]);

/**
 * Wire form of `deserialize_present_u32ish` (SourceCatalogs entry version):
 * an exact integer or a decimal string within u32 range. No trimming, like
 * the Rust visitor.
 */
const catalogVersion = z.union([
  z.number().int().min(0).max(U32_MAX),
  z
    .string()
    .regex(/^\d+$/)
    .refine(
      (value) =>
        typeof value === "string" && /^\d+$/.test(value) && BigInt(value) <= BigInt(U32_MAX),
    ),
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
  MaxAttempts: unsignedOptional.nullish(),
  BaseDelayMs: unsignedOptional.nullish(),
  MaxDelayMs: unsignedOptional.nullish(),
  SlowdownBaseDelayMs: unsignedOptional.nullish(),
  SlowdownMaxDelayMs: unsignedOptional.nullish(),
  Jitter: z.enum(["full", "none"]).nullish(),
});

const advancedTuningSchema = z.strictObject({
  SourceBlockBytes: unsignedOptional.nullish(),
  SourceBlockMergeGapBytes: unsignedOptional.nullish(),
  SourceGetConcurrency: unsignedOptional.nullish(),
  SourceWindowBytes: unsignedOptional.nullish(),
  // Explicit `#[serde(rename = "SourceWindowMemoryBudgetMiB")]` on the Rust
  // side; PascalCase would render `SourceWindowMemoryBudgetMib`.
  SourceWindowMemoryBudgetMiB: unsignedOptional.nullish(),
  DestinationWriteRetry: destinationWriteRetrySchema,
});

const transferSchema = z.strictObject({
  MaxConcurrency: unsignedOptional.nullish(),
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
