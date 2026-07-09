# Building from source

Most CDK apps should use the published npm package as-is. It ships prebuilt
Rust Lambda `bootstrap` binaries for both supported Lambda architectures, and
the npm tarball intentionally excludes the `rust/` source tree.

Use this page when you want to change the Rust provider, audit or rebuild the
provider artifacts yourself, or make a CDK app compile a local Rust provider
with `rustProjectPath` or `bundling`.

## Rebuild packaged provider binaries

This path rebuilds the bootstrap assets that are included in the npm package.

Prerequisites:

- Node.js 24 or newer and pnpm for source development
- Rust stable
- `cargo-lambda` on `PATH`
- Zig for cross-architecture bootstrap builds

The published npm package supports Node.js 22 or newer. Source development uses
Node.js 24 or newer through `mise.toml` so the repo stays on an active LTS while
still emitting a Node.js 22-compatible construct package.

From a source checkout:

```sh
pnpm install
pnpm prebuild:bootstrap
pnpm verify:package
```

`pnpm prebuild:bootstrap` stages the binaries at
`assets/bootstrap-arm64/bootstrap` and `assets/bootstrap-x86_64/bootstrap`. To
build only one architecture, pass it through to the script:

```sh
pnpm prebuild:bootstrap -- arm64
pnpm prebuild:bootstrap -- x86_64
```

`pnpm verify:package` rebuilds the package output, packs a tarball, verifies
that both bootstrap binaries are present and executable, and smoke-tests a
consumer install without `cargo-lambda-cdk`.

## Compile a local provider from a CDK app

The construct uses the prebuilt provider by default. Passing `rustProjectPath`
or `bundling` opts into compiling the Rust provider during CDK asset bundling
instead.

Install the optional compile dependency in the CDK app:

```sh
pnpm add -D cargo-lambda-cdk
```

Then point `rustProjectPath` at a source checkout that contains
`rust/Cargo.toml`:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources: [Source.asset("site")],
  destinationBucket: bucket,
  rustProjectPath: "/absolute/path/to/shin-bucket-deployment/rust",
});
```

When using the published npm package, pass `rustProjectPath` explicitly. The
published package includes the prebuilt `assets/bootstrap-*` directories, not
the `rust/` source directory.
