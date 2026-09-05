# Breaking Changes

This file holds release-note text for `ShinBucketDeployment` changes that break adopters' deployed state or in-repo contracts. Releases are published with `gh release create --generate-notes`, which lists pull request titles only; commit bodies never reach the published notes. The repository policy requires deployed-state breakage to be named in the release notes, so when a release is cut, the `## Unreleased` entries below are the text to carry into the notes.

## Unreleased

### Shared VPC handlers use the effective subnet selection

Stack-shared provider handlers now identify subnet placement by the selected subnet IDs resolved to CloudFormation expressions, preserving the order passed to Lambda. Filters with identical executable source but different captured values or prototype methods can no longer place the second deployment in the first deployment's subnets. Equivalent effective selections share a handler, whether specified through VPC defaults, CDK filters, or explicit subnet objects. Each deployment's selectors run once; Lambda receives the same selected subnet objects and retains CDK's public-subnet validation and connectivity dependencies. When a later equivalent selection contributes connectivity dependencies missing from an imported subnet view, the reused handler also gains those dependencies; unselected subnet dependencies are not added.

Affected: every existing deployment with `providerLambda.vpc` using the default or explicit `ProviderSharing.STACK`, including omitted `vpcSubnets`, explicit lists, filters, and imported VPCs or unresolved subnet IDs. On upgrade, the handler identity changes, generated execution roles and security groups are recreated, and CloudFormation replaces the custom resource because its service token and logical ID change. The destination ownership tag moves to the new generation before the old generation is deleted; the old handler retains the live namespace when it sees the overlapping owner, including when `onDelete.deleteCurrentObjects` is enabled. Caller-supplied roles, security groups, and log groups remain caller-owned. Deployments that previously collided now use their own requested subnet placement; equivalent configurations can consolidate onto one shared handler.

This change preserves identities for non-VPC deployments and for `ProviderSharing.DEPLOYMENT`, including explicit local builds. Deployment-scoped VPC handlers receive the evaluated subnet placement in place. Changing the effective subnet order still selects a different shared handler because the emitted Lambda configuration preserves that order. Supplying `vpcSubnets` without `vpc` continues to fail, now before handler reuse with `ShinBucketDeploymentProviderVpcRequired`.

### Local provider compilation is explicit and deployment-scoped

`providerLambda.localBuild` now defaults to `ProviderSharing.DEPLOYMENT`. Explicit `ProviderSharing.STACK` with `localBuild` fails before resource creation with `ShinBucketDeploymentLocalProviderBuildSharing`; omit `sharing` or select `DEPLOYMENT`. Separate local source trees and captured bundling-hook values can no longer silently reuse the first deployment's compiled provider.

Affected: deployments that used `localBuild` with omitted sharing previously used stack-shared handlers. On upgrade they receive distinct deployment-scoped handlers, generated execution roles, and custom-resource identities. CloudFormation replaces those custom resources because their service tokens change. The destination ownership tag moves to the new generation before the old generation is deleted; the previous handler sees the overlapping owner and retains the live namespace even with `onDelete.deleteCurrentObjects` enabled. Caller-supplied roles and log groups remain caller-owned and may still be shared. Local builds already using `ProviderSharing.DEPLOYMENT` keep their handler and custom-resource identities, and later local source edits or checkout moves update code in place.

A missing prebuilt archive now fails synthesis with `ShinBucketDeploymentPrebuiltProviderArchiveMissing` instead of implicitly compiling Rust. This affects source checkouts without the requested `assets/bootstrap-<arch>/bootstrap.zip` and incomplete package installations. Run `pnpm build:bootstrap` in the checkout, or explicitly configure `providerLambda.localBuild` and the optional `cargo-lambda-cdk` dependency. Ordinary prebuilt installations retain their existing sharing and artifact-based handler identity and need no Rust toolchain.

### Repeated sources now take precedence at their last position

Deployments that repeat a source with another source in between now honor the documented last-source-wins order. For example, `[A, B, A]` previously emitted `[A, B]` and deployed B's contents for overlapping keys; it now emits `[B, A]` and deploys A's contents. This also applies to incremental `addSource()` calls and distinct marker-free sources with equivalent bound configurations, including their authenticated catalogs. Repeated marker-bearing objects reuse their original binding and move to the last position; distinct marker bindings remain separate.

Affected: existing deployments with non-adjacent repeated sources. Their next deployment updates the source sequence in place and can overwrite overlapping destination objects with the last source's contents. This change itself preserves the provider, custom-resource, and destination ownership identities. Each source object is still bound only once, and adjacent repeats of the same object remain idempotent.

### Destination tag overrides must preserve ownership

Synthesis now validates the destination bucket's rendered `Tags` array after CDK aspects and escape-hatch overrides. A complete `Tags` replacement must preserve every Shin deployment's ownership tag with the literal value `"true"`, use unique keys, and stay within S3's 50-tag quota. Overrides that removed, renamed, or disabled an ownership tag previously passed synthesis and now fail with `ShinBucketDeploymentDestinationOwnershipTagRequired`; malformed arrays, duplicate keys, and quota violations also fail before deployment.

Affected: applications overriding the entire destination tag set or removing Shin ownership tags through CDK tagging aspects. Preserve the tags added by every deployment sharing the bucket. Valid templates, handler identities, lifecycle behavior, and provider execution are unchanged; this validation does not coordinate arbitrary external writers.

### Reviewed runtime dependencies change prebuilt shared-handler identity

The reviewed Rust runtime refresh changes the rebuilt provider archive on both arm64 and x86_64. With the default `ProviderSharing.STACK` and a prebuilt provider, the archive digest participates in the shared-handler identity, so upgrading creates a new Lambda logical ID and changes the service token. CloudFormation therefore replaces each affected deployment custom resource, even if its destination and source configuration are unchanged.

The existing ownership protection retains the live destination namespace during this replacement: the new generation's ownership tag is applied before deletion of the previous generation, and the previous handler sees the overlapping owner and skips namespace deletion, including when `onDelete.deleteCurrentObjects` is enabled. The destination-derived physical resource ID algorithm, lifecycle settings, and provider wire contract do not change. The replacement can invoke normal deployment work; this is not a promise that no object writes occur.

`ProviderSharing.DEPLOYMENT` keeps its stable handler logical ID and service token; the archive update changes Lambda code in place without forcing custom-resource replacement. This lockfile-only runtime change does not alter the local-build manifest hash, although a separately changed package version or local-build configuration can change handler identity. No compatibility handler is retained. See the [runtime dependency review](runtime-dependency-review.md) for upstream changes and the pending performance-acceptance boundary.

## 0.13.0

### Stack-shared handlers advance to the 0.13.0 provider identity

The package version is part of the provider source identity so different installed Shin versions cannot silently share a handler that implements a different request contract. Upgrading to `0.13.0` therefore changes the handler logical ID for every deployment using the default `ProviderSharing.STACK`, and CloudFormation replaces the custom resource because its service token changes.

The replacement preserves deployed objects: the new generation moves the destination ownership tag before the previous generation is deleted, and the previous handler detects the overlapping owner and retains the live namespace even when `onDelete.deleteCurrentObjects` is enabled. Deployments using `ProviderSharing.DEPLOYMENT` keep their stable deployment-scoped handler and custom-resource identities; the package version bump alone changes neither their handler logical ID nor service token.

### Default cataloged directory asset identities change once

Cataloged local directories now derive a collision-resistant custom asset identity while Shin reads each file to generate `.shin/catalog.v1.json`. The identity binds normalized paths, byte lengths, per-file SHA-256 digests, exact catalog bytes, and identity-affecting options, removing the separate CDK source-fingerprint pass without relying on the catalog's MD5 values for collision resistance.

Affected: `Source.asset(directory)` with the default `embeddedCatalog:true` behavior and no caller-supplied `assetHash`. On the first synthesis and deployment after upgrading, an unchanged directory receives a new source asset hash and S3 asset key, so CDK publishes that ZIP once under the new key. The deployment custom resource keeps the same logical ID, destination owner, bucket, and prefix, so its destination-derived physical resource ID is unchanged and CloudFormation sends an in-place Update. Destination objects remain in the same namespace and ownership domain; the provider's normal comparison decides whether any object content needs uploading.

Unaffected: an explicit custom `assetHash`, `embeddedCatalog:false`, local ZIP files, `Source.bucket`, and other upstream `ISource` implementations.

Cataloged directories now reject caller-supplied `AssetHashType.SOURCE` and `AssetHashType.OUTPUT`. Omit `assetHashType` to use Shin's generated identity, provide `assetHash` with an omitted type or `AssetHashType.CUSTOM` to retain a caller-controlled identity, or pass `embeddedCatalog:false` to use another CDK hash mode. A caller-controlled hash must still change whenever its content changes.

### Handler-identity key ordering no longer depends on the runtime's ICU collation

Object keys in the shared-handler identity hash are now ordered by UTF-16 code unit instead of by `localeCompare`. The previous form made a value that decides custom-resource identity depend on the Node build's ICU collation, so the same configuration could hash differently on different runtimes.

Affected: only deployments whose `providerLambda.localBuild.bundling.environment` (or another caller-supplied key map reaching the hash) mixes upper- and lower-case initial letters in a way the two orderings disagree on — ICU sorts case-insensitively at the primary level, so it places `cargoHome` before `RUSTFLAGS` where code-unit order places `RUSTFLAGS` first. Conventional all-caps environment variable names are unaffected, as are all-lowercase key sets and every fixed key set the construct itself contributes.

For an affected deployment the handler identity changes once on upgrade, which replaces the custom resource under the default `ProviderSharing.STACK`. That replacement is the same safe path described for the 0.12.0 memory default below: each generation carries a distinct destination owner, the ownership tag moves before the previous generation is deleted, and deployed objects are neither deleted nor recreated. There is no action to take and no way to opt out; the ordering is now fixed by construction rather than by the host's ICU data.

## 0.12.0

### The provider Lambda default memory and transfer concurrency change

`providerLambda.memorySize` now defaults to **2048 MiB** (was 1024) and `transfer.maxConcurrency` now defaults to **64** (was 32). The pairing measured 31–44% faster cold-create than 1024/32 on every canonical benchmark profile, at peak memory well under either allocation. (The 31–39% figure used while 0.12.0 was prepared came from the since-superseded `3a1fe594` run; the range above is re-derived from the committed ledger run `62f8ad5d`. The defaults decision is unchanged.)

Affected: any stack that did not set `providerLambda.memorySize` explicitly. On the next update after upgrading, what happens depends on handler sharing. With the default `ProviderSharing.STACK`, provider memory participates in the shared-handler identity hash, so the resolved default change moves the handler to a new logical ID and CloudFormation **replaces** the custom resource — a changed service token cannot be updated in place. The replacement is safe by design: each handler generation carries a distinct destination owner, the ownership tag moves before the previous generation is deleted, and the previous handler sees the replacement as an overlapping owner and retains the live namespace, so deployed objects are neither deleted nor recreated even when `onDelete.deleteCurrentObjects` is enabled (see [architecture.md](architecture.md#handler-flow)). Deployments using `ProviderSharing.DEPLOYMENT` keep the fixed handler ID and instead receive an in-place `MemorySize` update with no custom-resource replacement. The `transfer.maxConcurrency` default change is request-scoped: it updates custom-resource properties in place and replaces nothing. Same-stack deployments that relied on the old default resolve to the same new handler together. (This entry previously described the change as an in-place function update with no custom-resource replacement; that holds only for `ProviderSharing.DEPLOYMENT`. The published v0.12.0 release notes carry neither version of the claim — they were generated with `--generate-notes` and contain only pull request titles, so the breaking change was never named there at all, contrary to the policy stated at the top of this file.)

Cost note: Lambda bills memory × duration, so the faster default is not automatically the cheaper one. To keep the previous behaviour, set `providerLambda.memorySize: 1024` and `transfer.maxConcurrency: 32` explicitly.

### `SourceMarkersConfig` entries are now strict

Each `SourceMarkersConfig` entry is now decoded with the same strictness as every other provider input: a key the provider does not declare fails the request instead of being silently ignored. The only declared key is `jsonEscape` (the public `markersConfig.jsonEscape` property); anything else — a misspelled key, a key from an older or newer version, a typo'd container name — is now a hard failure.

Previously, an unknown key in a markers config entry was dropped and the deployment proceeded, so a stack carrying one deployed successfully and there was no signal that the key was not doing anything. After this change the request fails on Create, Update, and Delete alike. The Delete case is the one that strands a stack: CloudFormation sends a Delete carrying the same `ResourceProperties` when the resource is removed from a template, the strict decoder rejects it, and the stack is left in `DELETE_FAILED` with the custom resource as the sole blocking resource.

Affected: any stack whose `markersConfig` (or equivalent hand-authored `SourceMarkersConfig`) carries a key other than `jsonEscape`. No deployment work has happened by the time the failure occurs — the rejection happens while decoding the request, before any destination listing, deletion, or object transfer — so destination objects are untouched throughout, exactly as with the wire-rename rejection above.

Recovery: remove the unknown key from the configuration and redeploy. For a stack already stuck by an attempted upgrade, the recovery sequences are the same as for the custom-resource wire rename — [`UPDATE_ROLLBACK_FAILED`](#recovering-a-stack-stuck-in-update_rollback_failed) is recovered by skipping the custom resource during `continue-update-rollback`, and [`DELETE_FAILED`](#recovering-a-stack-stuck-in-delete_failed) by deleting the stack with the custom resource retained. Both sequences were verified on real stuck stacks and are safe because the custom resource owns no physical infrastructure.

There is no compatibility path, and none will be added: permissive decoding of marker configs would contradict the strictness of every sibling provider input, and the pre-`1.0` policy makes this a clean break.

### The destination ownership-tag suffix doubles from 32 to 64 bits

The ownership tag suffix derived from the custom resource's tree address is now 16 hex characters instead of 8, raising the birthday bound (the collision point at p≈0.5) from ~77,000 to ~5.06 billion deployments per prefix (1.1774 · sqrt(2^bits); at 2^32 ≈ 4.30 billion deployments the collision probability is ~39%, not 50%). Every deployment therefore receives a new ownership identity on upgrade: the previous 32-bit ownership tag key (`aws-cdk:cr-owned:<prefix>:<8 hex>`) is replaced by the new 64-bit key on the destination bucket, and objects previously attributed to the old identity are no longer attributed to the deployment's current owner.

To keep the complete tag key within the S3 128-character tag-key limit, the accepted `destination.keyPrefix` length drops from 102 to 94 characters. S3 counts tag-key characters in UTF-16 code units (astral-plane characters consume two positions), which is exactly what JavaScript string length measures, so the validation matches the service limit. A stack using a prefix longer than 94 characters now fails synthesis with `ShinBucketDeploymentDestinationKeyPrefixTooLong`; shorten the prefix or split the deployment.

Affected: every stack, on the update that follows the upgrade (the tag change is a template change, not a resource replacement — deployed objects are untouched). Stacks with a `destination.keyPrefix` over 94 characters must shorten the prefix before upgrading.

### Custom-resource wire property names now mirror the public API paths

The custom-resource property names the construct sends to the provider were renamed to mirror the public API property paths: each camelCase path segment becomes one PascalCase key, nested as a dotted object (`destinationLifecycle.onChange.deletePreviousObjects` travels as `DestinationLifecycle.OnChange.DeletePreviousObjects`), and the leaf property name is PascalCased under its container (`cloudfrontInvalidation.paths` becomes `CloudfrontInvalidation.Paths`; `distributionId` keeps its qualifier because it is part of the leaf name). Values without a public property — bound `Source*` data, the transport envelope (`ServiceToken`/`ServiceTimeout`), and internal identities (`DestinationOwnerId`, `OutputObjectKeys`, `DestinationBucketArn`) — keep their flat wire names. This is a clean pre-`1.0` break: the provider's strict decoder (`deny_unknown_fields`) rejects any payload carrying the old names, and no alias or fallback reader exists. The complete old-to-new mapping, for an operator diffing a template:

| Old wire key                             | New wire key                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DestinationBucketName`                  | `Destination.BucketName`                                                                                                                                           |
| `DestinationBucketKeyPrefix`             | `Destination.KeyPrefix`                                                                                                                                            |
| `DeletePreviousObjectsOnChange`          | `DestinationLifecycle.OnChange.DeletePreviousObjects`; the old object's nested `DestinationBucketName` moves to `DestinationLifecycle.OnChange.PreviousBucketName` |
| `InvalidatePreviousDistributionOnChange` | `DestinationLifecycle.OnChange.InvalidatePreviousDistribution`                                                                                                     |
| `WaitForDistributionInvalidation`        | `CloudfrontInvalidation.WaitForCompletion`                                                                                                                         |
| `DeleteCurrentObjectsOnDelete`           | `DestinationLifecycle.OnDelete.DeleteCurrentObjects`                                                                                                               |
| `DeleteStaleObjectsOnDeployment`         | `DestinationLifecycle.OnDeploy.DeleteStaleObjects`                                                                                                                 |
| `Extract`                                | `SourceProcessing.Extract`                                                                                                                                         |
| `MaxUncompressedEntryBytes`              | `SourceProcessing.MaxUncompressedEntryBytes`                                                                                                                       |
| `MaxCompressionRatio`                    | `SourceProcessing.MaxCompressionRatio`                                                                                                                             |
| `Exclude`                                | `SourceProcessing.Exclude`                                                                                                                                         |
| `Include`                                | `SourceProcessing.Include`                                                                                                                                         |
| `DistributionId`                         | `CloudfrontInvalidation.DistributionId`                                                                                                                            |
| `DistributionPaths`                      | `CloudfrontInvalidation.Paths`                                                                                                                                     |
| `MaxParallelTransfers`                   | `Transfer.MaxConcurrency`                                                                                                                                          |
| `SourceBlockBytes`                       | `Transfer.AdvancedTuning.SourceBlockBytes`                                                                                                                         |
| `SourceBlockMergeGapBytes`               | `Transfer.AdvancedTuning.SourceBlockMergeGapBytes`                                                                                                                 |
| `SourceGetConcurrency`                   | `Transfer.AdvancedTuning.SourceGetConcurrency`                                                                                                                     |
| `SourceWindowBytes`                      | `Transfer.AdvancedTuning.SourceWindowBytes`                                                                                                                        |
| `SourceWindowMemoryBudgetMb`             | `Transfer.AdvancedTuning.SourceWindowMemoryBudgetMiB` (the value was always MiB; the rename fixes the unit mismatch in the name)                                   |
| `PutObjectMaxAttempts`                   | `Transfer.AdvancedTuning.DestinationWriteRetry.MaxAttempts`                                                                                                        |
| `PutObjectRetryBaseDelayMs`              | `Transfer.AdvancedTuning.DestinationWriteRetry.BaseDelayMs`                                                                                                        |
| `PutObjectRetryMaxDelayMs`               | `Transfer.AdvancedTuning.DestinationWriteRetry.MaxDelayMs`                                                                                                         |
| `PutObjectSlowdownRetryBaseDelayMs`      | `Transfer.AdvancedTuning.DestinationWriteRetry.SlowdownBaseDelayMs`                                                                                                |
| `PutObjectSlowdownRetryMaxDelayMs`       | `Transfer.AdvancedTuning.DestinationWriteRetry.SlowdownMaxDelayMs`                                                                                                 |
| `PutObjectRetryJitter`                   | `Transfer.AdvancedTuning.DestinationWriteRetry.Jitter`                                                                                                             |

Affected: every stack upgrades, because the first Update after the upgrade delivers the _previous_ template's property names in `OldResourceProperties`, which the provider now rejects. The Update fails before any deployment, destination listing, or deletion work happens. In particular, a stack using `destinationLifecycle.onChange.deletePreviousObjects` fails its first Update after upgrading.

The rejection is loud on every request type: the Update rejects the old names, and so does the Delete that CloudFormation sends when a resource carrying them is removed from a template. A stack that already attempted the upgrade is therefore stuck in `UPDATE_ROLLBACK_FAILED` (failed Update) or `DELETE_FAILED` (failed teardown), with the custom resource as the sole blocking resource. Destination objects are untouched throughout: the failed Update performs no deployment work, and neither recovery sequence below performs any.

#### Recovering a stack stuck in `UPDATE_ROLLBACK_FAILED`

Skip the custom resource during the rollback:

    aws cloudformation continue-update-rollback --stack-name <stack> --resources-to-skip <CustomResourceLogicalId>

The AWS CLI reference for `continue-update-rollback` says the command "continues rolling back a stack from `UPDATE_ROLLBACK_FAILED` to `UPDATE_ROLLBACK_COMPLETE` state", and its `--resources-to-skip` option is "a list of the logical IDs of the resources that CloudFormation skips during the continue update rollback operation. You can specify only resources that are in the `UPDATE_FAILED` state because a rollback failed" — exactly the custom resource's state after the failed rollback. Skipping it is safe because it owns no physical infrastructure: its physical resource ID is a synthetic string, so there is no real resource whose state diverges. CloudFormation sets the skipped resource to `UPDATE_COMPLETE` and returns the stack to `UPDATE_ROLLBACK_COMPLETE`; deploy the upgraded template from there, and the custom resource's next Update carries the new property names and succeeds. The reference also warns that a skipped resource's state is inconsistent with the template until the next update, so do not run other stack updates in between.

#### Recovering a stack stuck in `DELETE_FAILED`

    aws cloudformation delete-stack --stack-name <stack> --retain-resources <CustomResourceLogicalId>

Per the AWS CLI reference for `delete-stack`, `--retain-resources` is "for stacks in the `DELETE_FAILED` state, a list of resource logical IDs that are associated with the resources you want to retain. During deletion, CloudFormation deletes the stack but doesn't delete the retained resources." CloudFormation deletes every real resource (buckets, roles, functions) and retains only the custom resource, which owns no physical infrastructure, so nothing is left behind. This exact sequence was exercised on real stuck stacks: four stacks stranded by the decoder rejection were deleted this way, and zero stacks and zero orphaned resources remained.

What is NOT a recovery: changing the construct id alone does not remove the old resource — CloudFormation sends `Delete` to the old logical resource carrying the previous template's property names, which the decoder rejects exactly as it rejects the Update, stranding the stack in `DELETE_FAILED` — and re-running the failed Update without deploying code that emits the new names fails again for the same reason.

There is no compatibility path, and none will be added: the loud rejection is deliberate so an old payload can never be partially parsed into a wrong previous-namespace deletion decision.

### Provider diagnostics drop the `schemaVersion` marker

The provider's structured diagnostics no longer carry a constant `schemaVersion` marker: `shin_deployment_summary` previously carried `schemaVersion: 6` and `shin_put_object_attempt_failure` carried `schemaVersion: 1`. The marker is gone, not renumbered. Nothing may branch on it: the event discriminator (`event`) plus strict field-shape validation is the contract gate, and the marker was a constant on the single living contract, so it carried no information.

Affected: any consumer that parses these events and validates or branches on `schemaVersion` breaks silently — the field is simply absent from current payloads. The in-repo benchmark collector fails closed on shape alone: `sanitizeProviderSummary` rejects unknown top-level members, so a summary that still carries the marker is rejected as a stale-contract payload rather than accepted or silently stripped. Consumers should drop marker checks and validate the current field shape instead.

### Destination prefix normalization changes the destination physical resource ID

`normalize_destination_prefix` now trims leading and trailing slashes, so `"/"`, `"//"`, `"site/"`, and `"/site/"` all normalize the way only the exact `"/"` root did before. Interior repeated slashes are preserved, because S3 keys may legitimately contain them.

The normalized value is hashed into the destination physical resource ID by `destination_physical_resource_id`. An affected stack therefore resolves to a new physical resource ID on its next update, and CloudFormation replaces the custom resource: the new namespace is created and the old one is deleted, removing the objects previously deployed under it.

Affected: any stack whose `destination.keyPrefix` has a leading or trailing slash, such as `site/`, `/site`, `/site/`, or `//`. (The construct passes that value through as the `Destination.KeyPrefix` custom-resource property, which is what the provider normalizes.)

Unaffected: a slash-free prefix such as `site`, or no prefix at all.

There is no compatibility path, and none will be added: the change is deliberate under the pre-`1.0` clean-break policy. Before upgrading, check each deployment's configured `destination.keyPrefix` for boundary slashes. A stack that has one will be replaced on its next update, and the replacement deletes the old namespace's objects, so confirm that deleting those objects is acceptable before deploying the update.
