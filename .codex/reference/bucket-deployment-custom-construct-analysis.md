# AWS CDK `BucketDeployment` Step-by-Step Analysis

This document analyzes how the CDK `BucketDeployment` construct works end to end, based on these implementation files:

- `packages/aws-cdk-lib/aws-s3-deployment/lib/bucket-deployment.ts`
- `packages/aws-cdk-lib/aws-s3-deployment/lib/source.ts`
- `packages/aws-cdk-lib/aws-s3-deployment/lib/render-data.ts`
- `packages/@aws-cdk/custom-resource-handlers/lib/aws-s3-deployment/bucket-deployment-handler/index.py`
- selected tests in `packages/aws-cdk-lib/aws-s3-deployment/test/bucket-deployment.test.ts`

## What `BucketDeployment` is

`BucketDeployment` is not a direct CloudFormation S3 upload primitive. It is a CDK construct that synthesizes a Lambda-backed custom resource of type `Custom::CDKBucketDeployment`.

Its job is to:

1. turn one or more CDK sources into zip artifacts,
2. pass the source bucket/object information into a custom resource,
3. run a Lambda function during deployment,
4. have that Lambda download the source zips,
5. optionally extract and token-substitute their contents,
6. sync the result into a destination S3 bucket,
7. optionally invalidate a CloudFront distribution.

That means the behavior is split across two phases:

- Synthesis time: CDK creates assets, IAM grants, the custom resource, and the supporting Lambda.
- Deployment time: CloudFormation invokes the Lambda, and the Lambda performs the actual copy/sync/invalidation work.

## The main moving pieces

There are four core pieces:

### 1. The construct class

`BucketDeployment` in `bucket-deployment.ts` validates props, creates the singleton handler Lambda, binds sources, creates the custom resource, and tags the destination bucket.

### 2. The source adapters

`Source.bucket()`, `Source.asset()`, `Source.data()`, `Source.jsonData()`, and `Source.yamlData()` in `source.ts` all normalize user input into a common `SourceConfig` shape:

- source bucket
- zip object key
- optional marker map
- optional marker substitution config

### 3. The token-to-marker renderer

`renderData()` in `render-data.ts` replaces unresolved CDK tokens inside string content with synthetic placeholders like `<<marker:0xbaba:0>>`, and records a mapping from placeholder to deploy-time token value.

### 4. The custom resource handler

The Python handler in `index.py` runs inside Lambda. It downloads source zips, extracts them or copies them as-is, substitutes markers, calls `aws s3 sync`, optionally deletes old content, optionally invalidates CloudFront, and reports success/failure back to CloudFormation.

## End-to-end flow at a glance

The complete lifecycle is:

1. User instantiates `new BucketDeployment(...)`.
2. Each source is converted into a zip artifact plus metadata.
3. CDK creates or reuses a singleton Lambda handler.
4. CDK grants the handler read access to sources and read/write access to the destination bucket.
5. CDK synthesizes a `Custom::CDKBucketDeployment` resource with all deployment properties.
6. During `cdk deploy`, CloudFormation invokes the handler on `Create`, `Update`, or `Delete`.
7. The handler performs S3 copy/extract/sync operations and optional CloudFront invalidation.
8. The handler returns attributes such as `DestinationBucketArn` and optionally `SourceObjectKeys`.

## Synthesis-time behavior in detail

## 1. Constructor entry and early validation

When `new BucketDeployment(scope, id, props)` runs, it first validates combinations of props.

It enforces:

- `distributionPaths` requires `distribution`.
- every `distributionPath` must start with `/` if the paths are not unresolved tokens.
- `useEfs: true` requires `vpc`.

These checks happen before any resources are created, so invalid configurations fail at synthesis time instead of at deployment time.

## 2. The destination bucket is recorded

The construct stores `props.destinationBucket` on the instance because it is used in several places:

- IAM grants for the handler,
- the custom resource properties,
- the `deployedBucket` accessor,
- the ownership tag logic.

## 3. Optional EFS support is prepared

If `useEfs` is enabled and a VPC is supplied, the construct:

1. gets or creates one EFS file system per stack+VPC,
2. creates an EFS access point at `/lambda`,
3. sets POSIX ownership to UID/GID `1001`,
4. gives the access point open permissions (`0777`),
5. makes the access point depend on the file system mount targets.

The mount path inside Lambda becomes `/mnt/lambda`.

Why this exists:

- Lambda `/tmp` space can be too small for large deployments.
- EFS provides larger working storage.

Important implementation detail:

- the file system is reused per VPC via `getOrCreateEfsFileSystem()`, so multiple deployments in the same stack/VPC do not each create their own file system.

## 4. The construct depends on the VPC

If a VPC is provided, the construct adds an explicit dependency on that VPC.

The comment explains why: it helps CloudFormation delete stacks more cleanly. This is a lifecycle ordering safeguard, not part of the copy logic itself.

## 5. The singleton handler Lambda is created or reused

The construct creates a `BucketDeploymentSingletonFunction` named `CustomResourceHandler`.

This is not a generic provider abstraction that then spins up something else later. It is the actual Lambda function that backs the `Custom::CDKBucketDeployment` custom resource.

### What kind of Lambda function it is

In the current repo, the handler is generated from the custom-resource framework configuration for:

- module: `aws-s3-deployment`
- provider: `bucket-deployment-provider`
- component type: `SINGLETON_FUNCTION`
- source file: `lib/aws-s3-deployment/bucket-deployment-handler/index.py`
- runtime: `Runtime.PYTHON_LATEST`

In that same framework config, `Runtime.PYTHON_LATEST` currently resolves to `python3.13`.

So, in concrete terms, `BucketDeployment` is backed by:

- a Lambda `SingletonFunction`,
- with Python runtime `python3.13`,
- with handler entrypoint `index.handler`,
- packaged from the Python file `bucket-deployment-handler/index.py`,
- plus the AWS CLI layer attached.

The synthesized integration snapshots in this repo also show the function runtime as `python3.13`, which confirms what the framework config says.

This Lambda is configured with:

- an AWS CLI Lambda layer,
- environment variables,
- a 15-minute timeout,
- optional custom memory,
- optional custom ephemeral storage,
- optional VPC/subnet/security group placement,
- optional EFS mount,
- optional log retention or custom log group,
- optional user-supplied IAM role.

Two environment variables matter:

- `MOUNT_PATH=/mnt/lambda` when EFS is enabled.
- `AWS_CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem` to make the AWS CLI use Lambda's curated CA bundle.

### What runs inside the Lambda

The runtime code is plain Python in `index.py`. It uses:

- `boto3` for S3 bucket-tag lookups and CloudFront invalidation APIs,
- the AWS CLI from `/opt/awscli/aws` for the heavy S3 copy/sync/remove operations,
- local `/tmp` storage or mounted EFS as a staging area,
- direct CloudFormation response handling via HTTP PUT to the presigned response URL.

So this is a Python control-plane Lambda that orchestrates deployment steps, not a simple "copy one object" helper.

### Why it is a singleton

The handler is intentionally reused across deployments when its execution configuration is the same. The singleton UUID is a fixed base UUID plus a suffix derived from:

- `memoryLimit`
- `ephemeralStorageSize`
- VPC address
- security group addresses

This means:

- two `BucketDeployment` constructs with identical handler config share one Lambda,
- changing those handler-shaping props creates a different singleton Lambda,
- tokenized values are not allowed for `memoryLimit` or `ephemeralStorageSize` because the construct uses those values to form the singleton identity.

## 6. The handler role is captured

After the singleton Lambda exists, the construct reads `handler.role` and exposes it as `handlerRole`.

This is useful because:

- the source binders need it to grant source read access,
- users can add extra permissions manually,
- the README specifically calls out KMS decrypt permissions as a common case.

## 7. Every source is bound into a normalized `SourceConfig`

The constructor calls `source.bind(this, { handlerRole: this.handlerRole })` for every entry in `props.sources`.

That produces an internal list of `SourceConfig` objects. Each config contains:

- `bucket`
- `zipObjectKey`
- optional `markers`
- optional `markersConfig`

This normalization step is important because the runtime handler only understands zip sources, not the higher-level CDK source types.

## 8. Source-specific binding behavior

### `Source.bucket(bucket, zipObjectKey)`

This is the simplest form:

- it grants the handler role read access to the source bucket,
- it returns the bucket and the existing zip object key unchanged.

No asset is created here. The zip must already exist in S3.

### `Source.asset(path, options?)`

This creates a regular CDK S3 asset:

- a directory is zipped by the asset system,
- an existing `.zip` file is accepted as-is,
- a non-zip single file is rejected.

Then it:

- grants the handler read access to the asset bucket,
- returns the asset bucket and asset object key.

So for local directories, the zip is produced during CDK asset staging, not by the custom resource Lambda.

### `Source.data(objectKey, data, markersConfig?)`

This path is more interesting.

It:

1. creates a temporary local directory,
2. writes `data` into the requested relative object path,
3. runs `renderData(data)` first,
4. stages that temp directory as a normal asset,
5. returns the asset bucket/key plus any generated marker map,
6. deletes the temp directory after the asset has been copied into the assembly.

This is how the construct supports deploy-time tokens inside file content.

### `Source.jsonData(objectKey, obj, jsonProcessingOptions?)`

This serializes an object to JSON, but first calls `escapeTokens()` to keep unresolved CDK tokens from being stringified incorrectly.

For unresolved tokens, `escapeTokens()` returns a tokenized JSON string form as a number-like token so JSON serialization does not wrap the token in quotes prematurely.

Then `Source.jsonData()` delegates to `Source.data()`.

If `jsonProcessingOptions.escape` is set, the resulting source carries `markersConfig = { jsonEscape: true }`. That later tells the handler to substitute marker values in a JSON-safe way.

### `Source.yamlData(objectKey, obj)`

This serializes the object to YAML after token escaping, then delegates to `Source.data()`.

## 9. The destination bucket grants are added

The construct grants the handler read/write access to the destination bucket.

If `accessControl` is configured, it also grants:

- `s3:PutObjectAcl`
- `s3:PutObjectVersionAcl`

This is required because the runtime sync uses `--acl` when ACL metadata is requested.

## 10. Optional CloudFront permissions are added

If a distribution is configured, the handler gets:

- `cloudfront:GetInvalidation`
- `cloudfront:CreateInvalidation`

The resource is `*`, because CloudFront invalidation APIs do not support a distribution ARN-style resource restriction here in the construct.

## 11. The construct validates marker/extract compatibility

There is an important synthesis-time validation:

- if any source has `markers`,
- and `extract` is explicitly `false`,
- synthesis fails.

Reason:

- marker replacement only happens after extracting files from the zip.
- if the zip is not extracted, there is nowhere in the runtime flow where file contents are opened and mutated.

So deploy-time values inside file content require extraction.

## 12. The custom resource is synthesized

The construct creates a `cdk.CustomResource` with:

- `serviceToken` set to the singleton Lambda ARN,
- `resourceType` set to `Custom::CDKBucketDeployment`.

Its properties include:

- `SourceBucketNames`
- `SourceObjectKeys`
- `SourceMarkers`
- `SourceMarkersConfig`
- `DestinationBucketName`
- `DestinationBucketKeyPrefix`
- `WaitForDistributionInvalidation`
- `RetainOnDelete`
- `Extract`
- `Prune`
- `Exclude`
- `Include`
- `UserMetadata`
- `SystemMetadata`
- `DistributionId`
- `DistributionPaths`
- `SignContent`
- `OutputObjectKeys`
- optionally `DestinationBucketArn`

Several of these are lazy values so the construct can reflect mutations such as `addSource()`.

### `SourceMarkers` and `SourceMarkersConfig` alignment

The code preserves array position alignment across all sources.

If at least one source has markers and there are multiple sources, sources without markers contribute `{}` placeholders so the Python handler can safely iterate source-by-source.

Without this alignment, the handler would not know which markers map belongs to which zip.

### Metadata mapping

User metadata is lowercased.

System metadata is converted into AWS CLI `s3 sync` argument names, for example:

- `cacheControl` -> `cache-control`
- `contentType` -> `content-type`
- `serverSideEncryption` -> `sse`
- `serverSideEncryptionAwsKmsKeyId` -> `sse-kms-key-id`
- `websiteRedirectLocation` -> `website-redirect`
- `accessControl` -> `acl` in kebab-case

## 13. Ownership tags are added to the destination bucket

This is one of the most important implementation details.

The construct adds an S3 bucket tag whose key looks like:

`aws-cdk:cr-owned[:destinationKeyPrefix][:resourceHash]`

Examples:

- `aws-cdk:cr-owned:/a/b/c:971e1fa8`
- `aws-cdk:cr-owned:/x/z:2db04622`

This tag is used later by the Python handler to decide whether it is safe to delete bucket contents.

Why the extra hash exists:

- more than one `BucketDeployment` may target the same bucket/prefix,
- each deployment needs a unique ownership marker,
- deletion logic only removes content when no ownership tag for that bucket/prefix remains.

The construct also validates tag-key length. Because S3 tag keys max out at 128 characters, `destinationKeyPrefix` must be at most 104 characters when it is a concrete string.

## 14. The `deployedBucket` accessor wires dependency ordering

`deployment.deployedBucket` is not just `props.destinationBucket`.

When accessed, it:

1. flips `requestDestinationArn = true`,
2. causes the custom resource property `DestinationBucketArn` to be populated,
3. creates an imported bucket from the custom resource attribute `DestinationBucketArn`.

The effect is that downstream resources depending on `deployment.deployedBucket` now depend on the custom resource output, not just on the original bucket resource.

That is how CDK ensures "consume this bucket only after the deployment finished" semantics.

## 15. The `objectKeys` accessor

`deployment.objectKeys` is implemented as `this.cr.getAtt('SourceObjectKeys')`.

At runtime, the custom resource handler simply echoes back the `SourceObjectKeys` property it received, unless `outputObjectKeys` is disabled. So the accessor depends entirely on what the custom resource reports in its response data.

Important nuance:

- the implementation returns the custom resource's `SourceObjectKeys` response field directly,
- disabling `outputObjectKeys` makes that field an empty list.

## 16. `addSource()` mutates the deployment before synthesis completes

`addSource(source)` binds another source and appends it if it is not already equivalent to an existing source configuration.

Because the custom resource properties are lazy, added sources are reflected in the final synthesized template.

## Deployment-time behavior in detail

The runtime path lives in the Python Lambda handler.

## 17. The handler receives the CloudFormation event

On every invocation, the handler:

- logs the event except `ResponseURL`,
- reads `RequestType`,
- reads `ResourceProperties`,
- reads `OldResourceProperties` on update,
- reads the current `PhysicalResourceId` when present.

It expects CloudFormation custom resource event shapes:

- `Create`
- `Update`
- `Delete`

## 18. Resource properties are parsed and normalized

The handler extracts these values:

- source bucket names
- source object keys
- source markers
- source marker configs
- destination bucket name
- destination prefix
- `extract`
- `retainOnDelete`
- CloudFront distribution ID
- invalidation wait flag
- user metadata
- system metadata
- `prune`
- exclude/include filters
- `signContent`
- `outputObjectKeys`

Behavioral defaults are applied here too:

- absent `SourceMarkers` becomes one empty dict per source,
- absent `SourceMarkersConfig` becomes one empty dict per source,
- default invalidation path becomes `/<prefix>/*`,
- prefix `/` is normalized to an empty prefix.

## 19. AWS CLI config is reset per request

The handler uses the AWS CLI from the Lambda layer at `/opt/awscli/aws`.

Before each request:

1. it deletes the temporary AWS CLI config file if it exists,
2. if `signContent` is true, it runs:

   `aws configure set default.s3.payload_signing_enabled true`

This affects subsequent AWS CLI S3 commands in this invocation.

## 20. S3 source and destination URIs are built

The handler converts each source pair into:

- `s3://<sourceBucket>/<sourceObjectKey>`

It also computes:

- current destination `s3://<destBucket>/<destPrefix>`
- old destination from `OldResourceProperties`

This old destination is important on update when the destination bucket or prefix changes.

## 21. Physical resource ID handling

On `Create`:

- the handler generates a new physical ID: `aws.cdk.s3deployment.<uuid>`

On `Update` and `Delete`:

- it expects CloudFormation to supply the existing physical ID.

If the physical ID is missing on non-create requests, the handler fails the operation.

## 22. Delete behavior

If the request type is `Delete` and `retainOnDelete` is `false`, the handler may delete destination objects.

But it only does so when `bucket_owned(bucket, prefix)` is false.

`bucket_owned()`:

1. reads bucket tags using `get_bucket_tagging`,
2. builds a prefix like `aws-cdk:cr-owned[:keyPrefix]`,
3. returns true if any tag key starts with that prefix.

This means a delete only removes objects when there is no remaining ownership tag for that bucket/prefix.

That is the safety mechanism that prevents one deployment from deleting content still "owned" by another deployment targeting the same bucket/prefix.

## 23. Update behavior when the destination changes

If the request type is `Update`, `retainOnDelete` is `false`, and the old destination URI differs from the new one, the handler deletes the old destination contents first.

That means destination changes are destructive when retention is disabled.

Operationally, the order is:

1. delete old location,
2. deploy to new location.

So there can be a gap where neither location contains the new content yet.

## 24. Create/Update deployment path

On both `Create` and `Update`, the handler calls:

`s3_deploy(...)`

This is the core file-processing routine.

## 25. Working directory selection

`s3_deploy()` creates a working directory in one of two places:

- under the EFS mount path if `MOUNT_PATH` is set,
- otherwise under Lambda local temporary storage using `tempfile.mkdtemp()`.

It then creates a `contents/` subdirectory inside that workdir.

This `contents/` directory becomes the source directory for the final `aws s3 sync`.

## 26. Each source zip is downloaded and materialized

For each source zip:

### If `extract` is true

The handler:

1. downloads the zip to a temporary archive file with `aws s3 cp`,
2. extracts the archive into `contents/`,
3. applies marker substitution to every extracted file for that source.

Because every extracted source lands in the same `contents/` directory, multiple sources are effectively merged before the sync step.

If files overlap, later extractions overwrite earlier ones on disk.

### If `extract` is false

The handler:

1. copies the source zip object directly into `contents/`,
2. does not extract files,
3. does not perform marker substitution.

After that, the zip file itself is synced into the destination bucket.

## 27. Marker substitution after extraction

Marker substitution is the bridge between CDK tokens and deploy-time file content.

### How markers are created at synthesis time

For `Source.data()`, `Source.jsonData()`, and `Source.yamlData()`:

1. `renderData()` scans the string,
2. every unresolved token becomes a placeholder like `<<marker:0xbaba:N>>`,
3. the placeholder-to-token mapping is stored in `markers`.

The asset therefore contains placeholder text, not the real resolved value.

The real resolved value is passed separately in the custom resource properties.

### How markers are replaced at deployment time

After extracting a zip, the handler walks every extracted file and calls `replace_markers(file_path, markers, markers_config)`.

That function:

1. skips files when `markers` is empty,
2. chooses replacement encoding strategy,
3. opens the original file in binary mode,
4. streams it line by line,
5. replaces placeholder bytes with replacement bytes,
6. writes the result to `filename.new`,
7. deletes the original,
8. renames the new file into place.

Why line-by-line binary replacement matters:

- it avoids loading large files fully into memory,
- it works for arbitrary file contents as raw bytes,
- it scales better for large deployments.

### JSON-safe replacement

If `markersConfig.jsonEscape == true`, the handler uses `prepare_json_safe_markers()`.

That JSON-serializes each marker value first so inserted content remains valid JSON. This matters when the deploy-time token resolves to strings containing quotes, backslashes, or other JSON-sensitive characters.

## 28. Metadata arguments are built for `aws s3 sync`

If either user or system metadata is present, `create_metadata_args()` builds AWS CLI arguments such as:

- `--content-type`
- `--cache-control`
- `--metadata '{"key":"value"}'`
- `--metadata-directive REPLACE`

Two important details:

- metadata keys are lowercased,
- `--metadata-directive REPLACE` forces uploaded objects to use the provided metadata instead of preserving existing metadata.

## 29. The final sync command is assembled

After all source material exists in `contents/`, the handler builds:

`aws s3 sync <contents_dir> s3://destination/prefix`

It conditionally adds:

- `--delete` if `prune` is true,
- repeated `--exclude` filters,
- repeated `--include` filters,
- metadata arguments.

This is the actual deployment action.

### What `prune` really means

`prune: true` maps to `aws s3 sync --delete`, so destination objects missing from `contents/` are removed.

If `destinationKeyPrefix` is set, pruning is scoped to that prefix because the sync target itself is that prefix.

## 30. Workdir cleanup

The workdir is deleted in a `finally` block unless the environment variable `SKIP_CLEANUP` is set.

So even failed deployments attempt local cleanup.

## 31. Optional CloudFront invalidation

If `DistributionId` is present, the handler creates an invalidation using the given paths.

If `distributionPaths` was not supplied by the construct, the default path is:

- `/<destinationKeyPrefix>/*`

with normalization to ensure a leading slash and trailing `*`.

If `waitForDistributionInvalidation` is true, the handler waits for the invalidation to complete using the CloudFront waiter:

- 20-second delay
- about 13 minutes max

If the waiter fails, the handler raises a runtime error.

## 32. CloudFormation response

On success, the handler sends:

- `Status: SUCCESS`
- the physical resource ID
- `DestinationBucketArn` if it was requested by the construct
- `SourceObjectKeys` if `outputObjectKeys` is true, otherwise `[]`

On failure, it:

- logs the exception,
- sends `Status: FAILED`,
- includes the error string as the reason.

The response is sent by HTTP PUT to the presigned CloudFormation response URL.

## Behavioral details and edge cases that matter

## 33. Multiple sources are merged before sync

All extracted sources end up in one local `contents/` directory before the final `aws s3 sync`.

That means:

- the construct does not sync each source independently,
- merge order is the order of the `sources` array,
- later sources can overwrite earlier files locally before sync happens.

## 34. The custom resource uses bucket tags as a deletion safety model

The ownership tag logic is central to safe deletion.

It protects against these cases:

- logical ID changes creating a new custom resource before deleting the old one,
- multiple deployments sharing a destination bucket/prefix,
- one deployment being deleted while another still targets the same prefix.

Without those tags, `retainOnDelete: false` would be much riskier.

## 35. `retainOnDelete` and `prune` control different phases

These two flags are easy to confuse.

`prune` affects create/update:

- whether sync deletes destination objects not present in the new source set.

`retainOnDelete` affects delete/update-destination-change:

- whether old destination contents are explicitly removed when the custom resource is deleted or moved.

They are separate levers.

## 36. `destinationKeyPrefix` is strongly recommended for shared buckets

If the destination bucket is shared, using a prefix is the safest configuration because:

- pruning stays inside that prefix,
- delete behavior is scoped to that prefix,
- multiple deployments can coexist more predictably.

Without a prefix, the sync target is effectively the bucket root.

## 37. `extract: false` changes the model completely

With extraction enabled, the destination receives the contents of the zip(s).

With extraction disabled:

- the destination receives the zip file(s) themselves,
- no marker replacement happens,
- deploy-time token-based file content is incompatible.

That is why marker-bearing sources are rejected when `extract` is false.

## 38. `outputObjectKeys` only controls the response payload

It does not change what gets deployed.

It only controls whether the custom resource returns `SourceObjectKeys` in its response. This exists to avoid CloudFormation response size problems for large deployments.

## 39. VPC/EFS/security-group settings are part of singleton identity

This is subtle but important.

Because the handler is a singleton, execution-environment-shaping props are baked into the singleton UUID. Otherwise two deployments with incompatible runtime requirements would accidentally share one Lambda definition.

## 40. The construct assumes trusted zip content

The package README explicitly warns that zip sources must be trusted.

That warning makes sense from the implementation:

- the handler downloads arbitrary zips,
- extracts them inside Lambda storage,
- then runs privileged S3 operations against the destination bucket.

So this construct is designed for trusted deployment artifacts, not arbitrary third-party archives.

## What the construct really does, condensed into one linear sequence

If you want the whole behavior as one straight-through narrative, it is this:

1. CDK validates the `BucketDeployment` props.
2. CDK optionally creates or reuses an EFS file system and access point.
3. CDK creates or reuses a singleton Lambda handler, shaped by memory, storage, VPC, and security groups.
4. CDK binds every source into a zip-based `SourceConfig`.
5. CDK grants the handler read access to all sources and read/write access to the destination bucket.
6. CDK adds CloudFront invalidation permissions when needed.
7. CDK rejects invalid combinations like `distributionPaths` without `distribution`, `useEfs` without `vpc`, and marker-bearing sources with `extract: false`.
8. CDK synthesizes `Custom::CDKBucketDeployment` with lazy properties representing the sources and deployment options.
9. CDK tags the destination bucket with ownership markers so runtime deletion can be made safe.
10. CloudFormation invokes the handler on create/update/delete.
11. The handler parses the request and resets per-invocation AWS CLI config.
12. The handler computes source and destination S3 URIs.
13. On delete, if retention is disabled and no ownership tag remains, it removes destination objects.
14. On update, if retention is disabled and the destination changed, it deletes the old destination first.
15. On create/update, it creates a workdir in `/tmp` or EFS.
16. For each source, it downloads the zip and either extracts it or copies it as-is into the workdir.
17. If extracting, it substitutes marker placeholders in extracted files using deploy-time values from CloudFormation.
18. After all sources are materialized, it runs one final `aws s3 sync` into the destination bucket/prefix, with optional delete/include/exclude/metadata settings.
19. If configured, it creates a CloudFront invalidation and optionally waits for completion.
20. It returns success plus selected attributes back to CloudFormation.

## Practical takeaways

- `BucketDeployment` is fundamentally a Lambda-driven deployment engine wrapped in a CDK construct.
- Local directories are turned into zip assets first; the runtime handler always consumes zip sources.
- The most important safety mechanism is the destination bucket ownership tag.
- The most important runtime behavior is a single final `aws s3 sync`.
- `deployedBucket` exists mainly to create a dependency on deployment completion.
- Deploy-time token substitution only works on extracted content, not on kept-zipped content.
