import type {
  BundlingOptions as CargoLambdaBundlingOptions,
  ICommandHooks as CargoLambdaCommandHooks,
  DockerOptions as CargoLambdaDockerOptions,
} from "cargo-lambda-cdk";
import type {
  ShinBucketDeploymentBundlingCommandHooks,
  ShinBucketDeploymentBundlingDockerOptions,
  ShinBucketDeploymentBundlingOptions,
} from "../../src/local-build";

/**
 * Type-level structural assertions linking Shin's forked bundling interfaces
 * to the optional `cargo-lambda-cdk` peer whose `RustFunction` receives
 * `providerLambda.localBuild.bundling` (see `src/provider.ts`).
 *
 * The fork exists so Shin's public API does not import the optional peer
 * unconditionally. Nothing at runtime or in a plain `instanceof` check links
 * the two shapes, and TypeScript's normal assignability check is trivially
 * satisfied because every member on both sides is optional — so without these
 * assertions, a drift in the peer's `BundlingOptions` shape (a required
 * member, a changed property type, a renamed field) would silently break the
 * local-build path. Each assertion fails to compile when the source shape
 * stops fitting the target shape.
 */

type AssertAssignable<Source, Target> = [Source] extends [Target] ? true : false;
type AssertTrue<T extends true> = T;

type _BundlingOptionsAssignable = AssertTrue<
  AssertAssignable<ShinBucketDeploymentBundlingOptions, CargoLambdaBundlingOptions>
>;

type _DockerOptionsAssignable = AssertTrue<
  AssertAssignable<ShinBucketDeploymentBundlingDockerOptions, CargoLambdaDockerOptions>
>;

type _CommandHooksAssignable = AssertTrue<
  AssertAssignable<ShinBucketDeploymentBundlingCommandHooks, CargoLambdaCommandHooks>
>;

/**
 * References every assertion type so `noUnusedLocals` cannot drop them from
 * the program; each tuple element is the literal `true` only while the
 * corresponding assignability assertion holds, so this type fails to compile
 * on any drift of the forked interfaces.
 */
export type BundlingOptionsStructuralAssertions = [
  _BundlingOptionsAssignable,
  _DockerOptionsAssignable,
  _CommandHooksAssignable,
];
