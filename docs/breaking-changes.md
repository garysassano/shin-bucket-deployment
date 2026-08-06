# Breaking Changes

This file holds release-note text for `ShinBucketDeployment` changes that break adopters' deployed state or in-repo contracts. Releases are published with `gh release create --generate-notes`, which lists pull request titles only; commit bodies never reach the published notes. The repository policy requires deployed-state breakage to be named in the release notes, so when a release is cut, the `## Unreleased` entries below are the text to carry into the notes.

## Unreleased

### Destination prefix normalization changes the destination physical resource ID

`normalize_destination_prefix` now trims leading and trailing slashes, so `"/"`, `"//"`, `"site/"`, and `"/site/"` all normalize the way only the exact `"/"` root did before. Interior repeated slashes are preserved, because S3 keys may legitimately contain them.

The normalized value is hashed into the destination physical resource ID by `destination_physical_resource_id`. An affected stack therefore resolves to a new physical resource ID on its next update, and CloudFormation replaces the custom resource: the new namespace is created and the old one is deleted, removing the objects previously deployed under it.

Affected: any stack whose `destination.keyPrefix` has a leading or trailing slash, such as `site/`, `/site`, `/site/`, or `//`. (The construct passes that value through as the `DestinationBucketKeyPrefix` custom-resource property, which is what the provider normalizes.)

Unaffected: a slash-free prefix such as `site`, or no prefix at all.

There is no compatibility path, and none will be added: the change is deliberate under the pre-`1.0` clean-break policy. Before upgrading, check each deployment's configured `destination.keyPrefix` for boundary slashes. A stack that has one will be replaced on its next update, and the replacement deletes the old namespace's objects, so confirm that deleting those objects is acceptable before deploying the update.
