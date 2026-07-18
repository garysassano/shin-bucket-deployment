# Building from source

Most CDK apps should use the published npm package as-is. It ships prebuilt Rust Lambda archives for both supported Lambda architectures, and the npm tarball intentionally excludes the `rust/` source tree.

Use this page when you want to change the Rust provider, audit or rebuild the provider artifacts yourself, or make a CDK app compile a local Rust provider with `localProviderBuild`.

## Rebuild packaged provider binaries

This path rebuilds the bootstrap assets that are included in the npm package.

Prerequisites:

- Node.js 24 or newer and pnpm for source development
- Rust stable
- `cargo-lambda` on `PATH`
- Zig for cross-architecture bootstrap builds

The published npm package supports Node.js 22 or newer. Source development uses Node.js 24 or newer through `mise.toml` so the repo stays on an active LTS while still emitting a Node.js 22-compatible construct package.

From a source checkout:

```sh
pnpm install
pnpm prebuild:bootstrap
pnpm verify:package
```

`pnpm prebuild:bootstrap` stages the archives at `assets/bootstrap-arm64/bootstrap.zip` and `assets/bootstrap-x86_64/bootstrap.zip`. Each archive contains one executable root `bootstrap`. To build only one architecture, pass it through to the script:

```sh
pnpm prebuild:bootstrap -- arm64
pnpm prebuild:bootstrap -- x86_64
```

`pnpm verify:package` rebuilds the package output, creates one tarball, verifies that both archives contain an executable architecture-correct `bootstrap`, and smoke-tests CommonJS and ESM consumers without `cargo-lambda-cdk`.

## Run contributor checks

After the bootstrap archives exist, run the same local contributor gates through one command:

```sh
pnpm check
```

The aggregate check covers TypeScript build, package output, strict type checking, Biome, unit tests, Rust formatting, Clippy, Rust tests, npm and Cargo audits, cargo-deny, actionlint, Taplo, the package contract, and verification scenario synthesis. Individual scripts remain available when iterating on one area.

## Compile a local provider from a CDK app

The construct uses the prebuilt provider by default. Passing `localProviderBuild` opts into compiling the Rust provider during CDK asset bundling instead.

Install the optional compile dependency in the CDK app:

```sh
pnpm add -D cargo-lambda-cdk
```

Then point `localProviderBuild.projectPath` at a source checkout that contains `rust/Cargo.toml`:

```ts
new ShinBucketDeployment(this, "DeployWebsite", {
  sources: [Source.asset("site")],
  destinationBucket: bucket,
  localProviderBuild: {
    projectPath: "/absolute/path/to/shin-bucket-deployment/rust",
  },
});
```

When using the published npm package, provide `projectPath` explicitly. The published package includes the prebuilt `assets/bootstrap-*` directories, not the `rust/` source directory. Additional cargo-lambda options belong under `localProviderBuild.bundling`; the top-level `architecture` property remains the single architecture setting for both the build and Lambda function.
