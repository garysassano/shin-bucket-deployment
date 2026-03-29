# `BucketDeployment` Rust Redesign Notes

This note captures the follow-up discussion around whether the `BucketDeployment` custom resource should be rewritten in Rust and use the AWS SDK directly instead of the current Python + AWS CLI implementation.

## Context

Relevant issue and comments:

- Issue: [`BucketDeployment` always downloads, extracts, and scans every file for deploy-time substitutions](https://github.com/aws/aws-cdk/issues/37234)
- Maintainer/root-cause comment by `pahud`: <https://github.com/aws/aws-cdk/issues/37234#issuecomment-4049266538>
- Follow-up implementation sketch by `AdityaAudi`: <https://github.com/aws/aws-cdk/issues/37234#issuecomment-4064711815>

Relevant implementation files in this repo:

- Current TypeScript construct: `packages/aws-cdk-lib/aws-s3-deployment/lib/bucket-deployment.ts`
- Current Python handler: `packages/@aws-cdk/custom-resource-handlers/lib/aws-s3-deployment/bucket-deployment-handler/index.py`
- Custom-resource runtime config: `packages/@aws-cdk/custom-resource-handlers/lib/custom-resources-framework/config.ts`

Relevant external references:

- AWS Lambda Rust docs: <https://docs.aws.amazon.com/lambda/latest/dg/lambda-rust.html>
- AWS OS-only runtimes docs: <https://docs.aws.amazon.com/lambda/latest/dg/runtimes-provided.html>
- `cargo-lambda-cdk` / `RustFunction`: <https://github.com/cargo-lambda/cargo-lambda-cdk>

## Current implementation

Today `BucketDeployment` is backed by a generated Lambda `SingletonFunction` implemented in Python.

The custom-resource framework config defines:

- module: `aws-s3-deployment`
- provider: `bucket-deployment-provider`
- component type: `SINGLETON_FUNCTION`
- source code: `bucket-deployment-handler/index.py`
- runtime: `Runtime.PYTHON_LATEST`

In the current repo, `Runtime.PYTHON_LATEST` resolves to `python3.13`.

The Python handler is the actual deployment engine. For the default `extract=true` path, it does:

1. download the source zip from S3,
2. write it to local storage,
3. unzip it to local storage,
4. optionally replace deploy-time markers inside files,
5. run `aws s3 sync` from the local extracted tree to the destination bucket,
6. optionally invalidate CloudFront.

The relevant code path is in `index.py`:

- source loop and extraction: around `s3_deploy()`
- `ZipFile.extractall()`
- `replace_markers()`
- final `aws s3 sync`

## Important correction from the issue discussion

The biggest bottleneck is not simply "Python is slow".

The current design is expensive because it forces a local staging pipeline:

- download
- extract
- scan / replace
- sync

That means:

- Lambda cold start matters,
- Python overhead matters somewhat,
- but local disk I/O, unzip work, and full-tree re-upload are the larger costs.

Also, the issue’s root-cause comment matters here:

- when markers are absent, `replace_markers()` already short-circuits quickly,
- but `ZipFile.extractall()` still runs,
- and the final `aws s3 sync` still runs.

So a pure language rewrite without changing the algorithm would only improve part of the cost.

## Would a Rust rewrite make sense?

Yes, but only if it is treated as a new deployment engine, not just a port.

### What is true

- A Rust Lambda usually has lower runtime overhead than CPython.
- A native Rust binary on `provided.al2023` often has faster cold starts and lower memory overhead than a Python runtime Lambda.
- A Rust implementation could avoid shelling out to the AWS CLI and use the AWS SDK directly.

### What is also true

- A straight port of the current pipeline from Python to Rust would still keep the main inefficiencies:
  - zip download to local disk,
  - full extraction to local disk,
  - full local tree traversal,
  - full sync/upload from that extracted tree.
- That means the gains from "Rust only" would likely be modest compared to a real algorithm change.

### Bottom line

The first fix for issue `#37234` should still be the narrow one discussed in the issue:

- detect at synth time whether any source has deploy-time markers,
- pass that fact into the custom resource,
- skip the unnecessary extraction / substitution path when no deploy-time substitutions are possible.

A Rust rewrite only becomes compelling if the implementation is redesigned around streaming and object manifests.

## Why `cargo-lambda-cdk` does not change that conclusion

There is already a `RustFunction` construct in `cargo-lambda-cdk`.

That is useful context, but it does not mean AWS CDK should automatically use it for a core built-in custom-resource handler.

Reasons:

- `cargo-lambda-cdk` is a third-party construct library, not part of `aws-cdk-lib`.
- It is aimed at user-authored Rust Lambdas.
- It assumes a Rust build toolchain or Docker at bundle time.
- Its runtime model is `provided.al2023` / `provided.al2`, not the managed Python runtime path used by CDK’s current custom-resource framework.

So `cargo-lambda-cdk` proves "Rust Lambda packaging is viable", but it does not by itself answer whether `BucketDeployment` should be reimplemented that way.

## The right way to think about a Rust rewrite

The useful rewrite is not:

- "same Python design, but in Rust"

The useful rewrite is:

- "replace the current directory-sync engine with a streaming object-manifest engine"

That is where most of the payoff would come from.

## Sketch of a new Rust engine

The clean design is a two-phase engine:

- `plan`
- `execute`

## Phase 1: Plan

On `Create` or `Update`, the Rust Lambda would:

1. parse the same CloudFormation properties the current handler receives,
2. preserve current semantics for:
   - `extract`
   - `prune`
   - include/exclude filters
   - metadata
   - ACLs
   - retention/delete behavior
   - CloudFront invalidation
3. determine a per-source execution mode,
4. build a final manifest of destination objects,
5. preserve existing merge order semantics.

### Per-source execution modes

A source can be classified into one of these modes:

- `CopyZipObject`
  - used for `extract=false`
  - the zip object itself is what gets deployed
- `StreamZipEntries`
  - used for `extract=true` and no markers
  - unzip entries are streamed directly to destination objects
- `StreamZipEntriesWithSubstitution`
  - used for `extract=true` and markers exist
  - unzip entries are streamed through a marker-replacement transform before upload

### Why this matters

This lets the engine avoid treating every source as "must fully extract into a temp directory".

## Phase 2: Execute

Once the manifest exists, the Rust Lambda would upload directly with the AWS SDK.

### `extract=false`

For the non-extracting path:

- do not download through Lambda at all if possible,
- use `CopyObject` or multipart copy from source bucket/key to destination bucket/key.

This is the cleanest path because Lambda stops being the data path.

### `extract=true` with no substitutions

For extracting sources with no markers:

- open the zip,
- iterate over entries,
- decompress each entry on the fly,
- upload each object directly to S3 using `PutObject` or multipart upload,
- never build a local extracted tree.

### `extract=true` with substitutions

For extracting sources with markers:

- do the same entry streaming,
- but pass the decompressed bytes through a token replacement transform,
- only materialize data in memory or small temp buffers as needed,
- avoid a full extracted directory on disk.

### Prune

Instead of relying on `aws s3 sync --delete`, the engine would:

1. list objects under the destination prefix,
2. compare them to the final planned manifest,
3. delete keys not present in the manifest when `prune=true`.

### CloudFront invalidation

Keep current behavior:

- create invalidation after uploads,
- optionally wait for completion.

## A pragmatic Rust version vs an ideal Rust version

There are really two possible Rust designs.

## Version 1: Pragmatic

This version still downloads each zip archive to a single temp file first, but does not extract it to a directory tree.

Flow:

1. download zip to one temp file,
2. read zip entries from that file using a Rust zip crate,
3. upload final objects directly to S3,
4. never create a full extracted directory,
5. never shell out to `aws s3 sync`.

This is already a meaningful improvement over today’s design.

## Version 2: Ideal

This version tries to avoid even the full local zip file.

Possible approach:

1. use S3 range requests,
2. read the zip central directory,
3. fetch entry data ranges,
4. decompress and stream entries directly into uploads.

This is much more complex because ZIP is a seek-oriented format.

It would likely provide the best performance, but it has much higher implementation risk.

If this were ever built, Version 1 would be the sensible first milestone.

## Why the new engine is better

The biggest improvements come from removing these current costs:

- `ZipFile.extractall()` to disk
- local directory tree creation
- local filesystem traversal for every deployment
- shelling out to the AWS CLI
- dependence on `aws s3 sync` as the deployment primitive
- large `/tmp` or EFS usage for extracted trees

In a binary-heavy deployment, those costs are often more important than the Python interpreter cost itself.

## Estimated performance impact

These are reasoned engineering estimates, not benchmark numbers.

## 1. Rust only, same pipeline

If the current Python handler were simply ported to Rust but kept the same algorithm:

- likely improvement: modest
- rough expectation: `10-25%`

Why:

- cold start and runtime overhead improve,
- but the expensive download / extract / sync pattern remains.

## 2. Rust Version 1 manifest engine

If the engine becomes "download zip file once, stream entries directly to S3, no extracted tree":

- likely improvement: meaningful
- rough expectation: `30-60%` for binary-heavy `extract=true` deployments

Why:

- local extraction disappears,
- temp storage pressure drops,
- the AWS CLI subprocess disappears,
- uploads become direct and controlled.

## 3. Rust Version 2 range-based engine

If the engine can avoid full zip staging entirely:

- likely improvement: potentially larger than Version 1
- but implementation complexity rises sharply

This should be considered only after a pragmatic version proves worthwhile.

## 4. `extract=false`

For `extract=false`, the biggest gain is not "Rust" but "server-side copy":

- if the engine uses `CopyObject` or multipart copy from source to destination,
- Lambda no longer needs to download and re-upload the zip at all.

That could be dramatically faster than the current implementation.

## What must stay behavior-compatible

A Rust rewrite is only viable if it preserves current semantics.

That includes:

- merge order across multiple sources
- `extract=true` vs `extract=false`
- include/exclude filter behavior
- `prune`
- metadata application
- ACL support
- destination prefix handling
- `retainOnDelete`
- update/delete behavior with old destinations
- ownership-tag safety model
- `SourceObjectKeys` outputs
- `deployedBucket` dependency behavior
- CloudFront invalidation behavior

This compatibility burden is the hardest part of the rewrite.

## Why the synth-time fast path still matters even with Rust

Even if the handler were rewritten in Rust, the synth-time "does any source have markers?" optimization would still be valuable.

That optimization should exist regardless of language because it informs the engine which execution mode to use.

It is the highest-signal fix for the current issue because it allows the deployment engine to know:

- "no deploy-time substitutions are needed"

and choose a cheaper path.

## Recommended sequence of work

If this were to be pursued seriously, the order should be:

1. Add the synth-time "no markers" signal and fast path in the current implementation.
2. Measure the improvement on binary-heavy deployments.
3. If more improvement is still needed, redesign the handler around object manifests.
4. Only then decide whether Rust is the right implementation language for that redesigned engine.

That sequence isolates the architectural win first, and only then asks whether the language/runtime should change.

## Final conclusion

Rust can make sense here, but only as part of a real engine redesign.

The valuable redesign is:

- manifest-driven,
- streaming,
- SDK-based,
- minimal temp storage,
- no extracted directory tree,
- no dependency on `aws s3 sync`.

Without that redesign, a Rust rewrite would help somewhat, but it would not address the main inefficiencies that the issue is complaining about.


## Custom resource update semantics

One important behavior surfaced while testing the standalone Rust prototype: fixing the provider Lambda code does not necessarily cause already-deployed bucket contents to be refreshed on the next `cdk deploy`.

That is not primarily a "Rust vs `aws s3 sync`" issue. It is a CloudFormation custom-resource update-trigger issue.

### What "provider" means here

In this context:

- the construct is the TypeScript CDK implementation,
- the provider is the Lambda behind the custom resource,
- the custom resource is the CloudFormation resource that invokes that Lambda on `Create`, `Update`, and `Delete`.

For the standalone prototype:

- construct: `src/cargo-bucket-deployment.ts`
- provider: `rust/src/main.rs`
- custom resource type: `Custom::CargoBucketDeployment`

For the original AWS CDK implementation:

- construct: `packages/aws-cdk-lib/aws-s3-deployment/lib/bucket-deployment.ts`
- provider: `packages/@aws-cdk/custom-resource-handlers/lib/aws-s3-deployment/bucket-deployment-handler/index.py`
- custom resource type: `Custom::CDKBucketDeployment`

### What actually causes a deployment rerun

The provider Lambda only performs work when CloudFormation sends the custom resource a `Create` or `Update` event.

In the original Python handler, that event eventually leads to `s3_deploy(...)`, which performs the actual deployment work. If there is no custom-resource event, there is no deploy step, no extraction, no marker replacement, and no `aws s3 sync`.

The important detail is that both the original construct and the standalone Rust prototype use a stable Lambda ARN as `serviceToken` and rely on custom-resource property changes to trigger updates.

Typical update-driving properties include:

- `SourceObjectKeys`
- `SourceMarkers`
- `SourceMarkersConfig`
- destination bucket and prefix
- metadata
- prune/include/exclude settings
- CloudFront distribution settings

This means:

- if the source asset changes, the custom resource usually gets an update event,
- if only the provider Lambda code changes, the custom resource may not get an update event,
- therefore previously deployed objects may remain unchanged even though the handler code was fixed.

### Why this showed up in the prototype

During testing, a bug in JSON token replacement was fixed in the Rust provider implementation. A subsequent `cdk deploy` updated the Lambda bundle, but the custom resource inputs did not change.

So CloudFormation updated the Lambda function resource, but did not necessarily send an `Update` event to `Custom::CargoBucketDeployment`. The already-written object in S3 therefore stayed as it was.

This is an awkward behavior during provider development, but it is not fundamentally different from the original `BucketDeployment` update model.

### Is this a regression from the original `BucketDeployment`?

Not really, at least not in the narrow "when only provider code changes" scenario.

The original construct has the same general shape:

- stable `serviceToken`
- input-driven custom-resource properties
- actual deploy work only on custom-resource `Create` / `Update`

So the behavior is:

- source or property changes rerun the deployment,
- provider-code-only changes do not necessarily rerun the deployment.

This means the current prototype is aligned with the original design in that respect.

### What happens on a library upgrade

Upgrading the construct package from, say, `v1.0` to `v1.1` splits into two cases.

#### Case 1: only provider implementation changes

Example:

- a bugfix in the Rust handler,
- no change to synthesized custom-resource properties,
- same source assets,
- same destination settings.

Likely outcome:

- the Lambda function code is updated,
- the custom resource itself may not receive an `Update`,
- existing bucket contents may remain stale until some other input changes.

#### Case 2: synthesized custom-resource properties change

Example:

- a new property is added,
- a default changes,
- a source asset key changes,
- the generated template shape changes in a way CloudFormation sees on the custom resource.

Likely outcome:

- the custom resource receives an `Update`,
- the deployment reruns,
- bucket contents are refreshed accordingly.

The awkward case is therefore "provider bugfix release with no property diff".

## Possible solutions

There are three main ways to handle this.

### 1. Accept the current behavior

Rationale:

- it matches the original `BucketDeployment` model reasonably well,
- normal user workflows are input-driven,
- provider-code-only changes are relatively uncommon for end users.

This is the most conservative option.

### 2. Add an internal provider-version trigger

This means the construct implementation itself adds something like:

- `ProviderVersion`
- `HandlerCodeHash`

to the custom-resource properties automatically.

Then any change to that value causes CloudFormation to send an `Update` event to the custom resource.

Benefits:

- upgrading from `v1.0` to `v1.1` can automatically rerun the deployment,
- provider bugfixes are more likely to repair already-deployed content,
- developers do not need to remember a manual "force update" knob.

Costs:

- package upgrades can trigger unexpected redeployments,
- large assets may be recopied even though source inputs did not change,
- `prune` can perform deletes as part of that redeploy,
- CloudFront invalidation may run unexpectedly,
- a raw handler-code hash may be too sensitive and cause more churn than desired.

This is convenient, but it changes the operational behavior of the construct.

### 3. Add an explicit user-controlled revision prop

This means exposing a public property such as:

- `deploymentRevision`
- `forceUpdateToken`
- `forceUpdateNonce`

Then users change that value intentionally when they want to force a redeploy.

Benefits:

- no surprise redeployments,
- clear and explicit control,
- useful during provider development and bugfix rollout.

Costs:

- less convenient than an automatic trigger,
- users must remember to change it when needed.

This is the most predictable option.

## Recommendation

For the standalone experimental construct, an automatic version-based trigger is defensible because it improves iteration ergonomics and makes provider bugfix rollouts less surprising.

For a polished general-purpose construct, an unconditional internal trigger is less obviously correct because library upgrades could suddenly redeploy large amounts of content with no source change.

The best balanced long-term design is likely:

- keep the default behavior input-driven,
- add an explicit public prop such as `deploymentRevision`,
- optionally add an opt-in mode such as `redeployOnProviderChange` if automatic reruns are desired.

For now, do not implement automatic provider-version forcing by default. The behavior should be documented clearly, and any rerun trigger should be added deliberately once the desired operational semantics are settled.
