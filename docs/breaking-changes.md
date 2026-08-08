# Breaking Changes

This file holds release-note text for `ShinBucketDeployment` changes that break adopters' deployed state or in-repo contracts. Releases are published with `gh release create --generate-notes`, which lists pull request titles only; commit bodies never reach the published notes. The repository policy requires deployed-state breakage to be named in the release notes, so when a release is cut, the `## Unreleased` entries below are the text to carry into the notes.

## Unreleased

### The destination ownership-tag suffix doubles from 32 to 64 bits

The ownership tag suffix derived from the custom resource's tree address is now 16 hex characters instead of 8, raising the birthday bound (the collision point at p≈0.5) from ~77,000 to ~5.06 billion deployments per prefix (1.1774 · sqrt(2^bits); at 2^32 ≈ 4.30 billion deployments the collision probability is ~39%, not 50%). Every deployment therefore receives a new ownership identity on upgrade: the previous 32-bit ownership tag key (`aws-cdk:cr-owned:<prefix>:<8 hex>`) is replaced by the new 64-bit key on the destination bucket, and objects previously attributed to the old identity are no longer attributed to the deployment's current owner.

To keep the complete tag key within the S3 128-character tag-key limit, the accepted `destination.keyPrefix` length drops from 102 to 94 characters. S3 counts tag-key characters in UTF-16 code units (astral-plane characters consume two positions), which is exactly what JavaScript string length measures, so the validation matches the service limit. A stack using a prefix longer than 94 characters now fails synthesis with `ShinBucketDeploymentDestinationKeyPrefixTooLong`; shorten the prefix or split the deployment.

Affected: every stack, on the update that follows the upgrade (the tag change is a template change, not a resource replacement — deployed objects are untouched). Stacks with a `destination.keyPrefix` over 94 characters must shorten the prefix before upgrading.

### Custom-resource wire property names now mirror the public API paths

The custom-resource property names the construct sends to the provider were renamed to mirror the public API property paths (`destination.keyPrefix` now travels as `Destination.KeyPrefix`, `destinationLifecycle.onChange.deletePreviousObjects` as `DestinationLifecycle.OnChange.DeletePreviousObjects`, `transfer.maxConcurrency` as `Transfer.MaxConcurrency`, and so on). This is a clean pre-`1.0` break: the provider's strict decoder (`deny_unknown_fields`) rejects any payload carrying the old names, and no alias or fallback reader exists.

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

### Destination prefix normalization changes the destination physical resource ID

`normalize_destination_prefix` now trims leading and trailing slashes, so `"/"`, `"//"`, `"site/"`, and `"/site/"` all normalize the way only the exact `"/"` root did before. Interior repeated slashes are preserved, because S3 keys may legitimately contain them.

The normalized value is hashed into the destination physical resource ID by `destination_physical_resource_id`. An affected stack therefore resolves to a new physical resource ID on its next update, and CloudFormation replaces the custom resource: the new namespace is created and the old one is deleted, removing the objects previously deployed under it.

Affected: any stack whose `destination.keyPrefix` has a leading or trailing slash, such as `site/`, `/site`, `/site/`, or `//`. (The construct passes that value through as the `Destination.KeyPrefix` custom-resource property, which is what the provider normalizes.)

Unaffected: a slash-free prefix such as `site`, or no prefix at all.

There is no compatibility path, and none will be added: the change is deliberate under the pre-`1.0` clean-break policy. Before upgrading, check each deployment's configured `destination.keyPrefix` for boundary slashes. A stack that has one will be replaced on its next update, and the replacement deletes the old namespace's objects, so confirm that deleting those objects is acceptable before deploying the update.
