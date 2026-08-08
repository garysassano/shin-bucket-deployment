# Breaking Changes

This file holds release-note text for `ShinBucketDeployment` changes that break adopters' deployed state or in-repo contracts. Releases are published with `gh release create --generate-notes`, which lists pull request titles only; commit bodies never reach the published notes. The repository policy requires deployed-state breakage to be named in the release notes, so when a release is cut, the `## Unreleased` entries below are the text to carry into the notes.

## Unreleased

### The destination ownership-tag suffix doubles from 32 to 64 bits

The ownership tag suffix derived from the custom resource's tree address is now 16 hex characters instead of 8, raising the birthday bound from ~92,000 to ~4.3 billion deployments per prefix. Every deployment therefore receives a new ownership identity on upgrade: the previous 32-bit ownership tag key (`aws-cdk:cr-owned:<prefix>:<8 hex>`) is replaced by the new 64-bit key on the destination bucket, and objects previously attributed to the old identity are no longer attributed to the deployment's current owner.

To keep the complete tag key within the S3 128-character tag-key limit, the accepted `destination.keyPrefix` length drops from 102 to 94 characters. A stack using a prefix longer than 94 characters now fails synthesis with `ShinBucketDeploymentDestinationKeyPrefixTooLong`; shorten the prefix or split the deployment.

Affected: every stack, on the update that follows the upgrade (the tag change is a template change, not a resource replacement — deployed objects are untouched). Stacks with a `destination.keyPrefix` over 94 characters must shorten the prefix before upgrading.

### Custom-resource wire property names now mirror the public API paths

The custom-resource property names the construct sends to the provider were renamed to mirror the public API property paths (`destination.keyPrefix` now travels as `Destination.KeyPrefix`, `destinationLifecycle.onChange.deletePreviousObjects` as `DestinationLifecycle.OnChange.DeletePreviousObjects`, `transfer.maxConcurrency` as `Transfer.MaxConcurrency`, and so on). This is a clean pre-`1.0` break: the provider's strict decoder (`deny_unknown_fields`) rejects any payload carrying the old names, and no alias or fallback reader exists.

Affected: every stack upgrades, because the first Update after the upgrade delivers the *previous* template's property names in `OldResourceProperties`, which the provider now rejects. The Update fails before any deployment, destination listing, or deletion work happens. In particular, a stack using `destinationLifecycle.onChange.deletePreviousObjects` fails its first Update after upgrading.

The operator should recreate the deployment instead of updating it: give the `ShinBucketDeployment` construct a new id (or recreate the stack) so CloudFormation issues a fresh Create with the new property names, then remove the failed old resource. Do not rely on an in-place removal: a Delete request delivered from a template that still carries the old names is rejected the same way, and a stuck Update rollback cannot be continued until the resource leaves the old contract. Destination objects are not modified by the failed Update. There is no compatibility path, and none will be added: the loud rejection is deliberate so an old payload can never be partially parsed into a wrong previous-namespace deletion decision.

### Destination prefix normalization changes the destination physical resource ID

`normalize_destination_prefix` now trims leading and trailing slashes, so `"/"`, `"//"`, `"site/"`, and `"/site/"` all normalize the way only the exact `"/"` root did before. Interior repeated slashes are preserved, because S3 keys may legitimately contain them.

The normalized value is hashed into the destination physical resource ID by `destination_physical_resource_id`. An affected stack therefore resolves to a new physical resource ID on its next update, and CloudFormation replaces the custom resource: the new namespace is created and the old one is deleted, removing the objects previously deployed under it.

Affected: any stack whose `destination.keyPrefix` has a leading or trailing slash, such as `site/`, `/site`, `/site/`, or `//`. (The construct passes that value through as the `Destination.KeyPrefix` custom-resource property, which is what the provider normalizes.)

Unaffected: a slash-free prefix such as `site`, or no prefix at all.

There is no compatibility path, and none will be added: the change is deliberate under the pre-`1.0` clean-break policy. Before upgrading, check each deployment's configured `destination.keyPrefix` for boundary slashes. A stack that has one will be replaced on its next update, and the replacement deletes the old namespace's objects, so confirm that deleting those objects is acceptable before deploying the update.
