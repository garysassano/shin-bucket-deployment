import type {
  AssetHashType,
  BundlingFileAccess,
  BundlingOutput,
  DockerImage,
  DockerVolume,
  ILocalBundling,
} from "aws-cdk-lib";

export interface ShinBucketDeploymentBundlingCommandHooks {
  /**
   * Commands to run before the Cargo Lambda bundling commands, inside the
   * bundling environment.
   *
   * Use for build prerequisites that must run where the compile happens,
   * such as vendoring dependencies or generating source files. The returned
   * commands run in the same Docker container or local environment as the
   * build itself.
   */
  beforeBundling(inputDir: string, outputDir: string): string[];

  /**
   * Commands to run after the Cargo Lambda bundling commands, inside the
   * bundling environment.
   *
   * Use for post-build steps, for example copying extra files into the
   * output directory before the compiled asset is packaged.
   */
  afterBundling(inputDir: string, outputDir: string): string[];
}

export interface ShinBucketDeploymentBundlingDockerOptions {
  /**
   * The entrypoint to run in the Docker container.
   *
   * Override it when the bundling image's default entrypoint would consume
   * the build command instead of running it.
   *
   * @default - run the entrypoint defined in the image
   */
  readonly entrypoint?: string[];

  /**
   * The command to run in the Docker container.
   *
   * Override it to change how the provider compile is invoked.
   *
   * @default - a cargo lambda compilation
   */
  readonly command?: string[];

  /**
   * Additional Docker volumes to mount.
   *
   * Use them to share toolchain caches or credentials into the bundling
   * container.
   *
   * @default - no additional volumes are mounted
   */
  readonly volumes?: DockerVolume[];

  /**
   * Where to mount the specified volumes from.
   *
   * Use it to reuse volumes from the specified Docker containers.
   *
   * @default - no containers are specified to mount volumes from
   */
  readonly volumesFrom?: string[];

  /**
   * Working directory inside the Docker container.
   * @default /asset-input
   */
  readonly workingDirectory?: string;

  /**
   * The user to use when running the Docker container.
   * @default - uid:gid of the current user or 1000:1000 on Windows
   */
  readonly user?: string;

  /**
   * Local bundling provider.
   *
   * Supply one to run the compile on the host instead of in Docker.
   *
   * @default - local cargo-lambda when available, otherwise Docker
   */
  readonly local?: ILocalBundling;

  /**
   * The type of output that this bundling operation is producing.
   * @default BundlingOutput.AUTO_DISCOVER
   */
  readonly outputType?: BundlingOutput;

  /**
   * Security configuration when running the Docker container.
   * @default - no security options
   */
  readonly securityOpt?: string;

  /**
   * Docker networking options.
   * @default - no networking options
   */
  readonly network?: string;

  /**
   * The access mechanism used to exchange files with the bundling container.
   * @default BundlingFileAccess.BIND_MOUNT
   */
  readonly bundlingFileAccess?: BundlingFileAccess;
}

export interface ShinBucketDeploymentBundlingOptions {
  /**
   * Environment variables defined when Cargo runs.
   *
   * Use them to pass build-time configuration to the provider crate during
   * compilation.
   *
   * @default - no environment variables are defined
   */
  readonly environment?: Record<string, string>;

  /**
   * Force bundling in a Docker container even if local bundling is possible.
   *
   * Set this when the local environment lacks the Rust toolchain or must not
   * be used, for example on a sandboxed build host.
   *
   * @default false
   */
  readonly forcedDockerBundling?: boolean;

  /**
   * A custom bundling Docker image.
   *
   * Set it to pin or replace the local compile helper image, for example when
   * a specific cargo-lambda release is required.
   *
   * @default - local compile helper default image
   */
  readonly dockerImage?: DockerImage;

  /**
   * Additional options when using Docker bundling.
   * @default - local compile helper defaults
   */
  readonly dockerOptions?: ShinBucketDeploymentBundlingDockerOptions;

  /**
   * Determines how the asset hash is calculated.
   *
   * The hash decides whether a provider source change rebuilds and re-uploads
   * the compiled asset. When `assetHash` is also specified, the effective
   * default is `CUSTOM`.
   *
   * @default AssetHashType.OUTPUT
   */
  readonly assetHashType?: AssetHashType;

  /**
   * Specify a custom hash for this asset.
   *
   * Supply one to pin the compiled provider asset to a fixed hash, for
   * example in reproducible builds. You must update it whenever the provider
   * sources change, or the changed asset may not be re-uploaded.
   *
   * @default - based on `assetHashType`
   */
  readonly assetHash?: string;

  /**
   * Command hooks.
   *
   * Use them to run extra steps before or after the compile inside the
   * bundling environment.
   *
   * @default - do not run additional commands
   */
  readonly commandHooks?: ShinBucketDeploymentBundlingCommandHooks;

  /**
   * Additional flags to pass to `cargo lambda build`.
   *
   * @default - no additional flags
   */
  readonly cargoLambdaFlags?: string[];

  /**
   * Cargo build profile.
   *
   * Change it to a faster-iterating profile such as `dev` during local
   * development of the provider.
   *
   * @default "release"
   */
  readonly profile?: string;
}

/**
 * Local compilation settings for the Rust provider.
 *
 * Providing this object opts out of the prebuilt provider shipped with the
 * package. Most consumers should leave it unset.
 */
export interface ShinBucketDeploymentLocalBuildOptions {
  /**
   * Rust provider project directory.
   *
   * Required when the provider sources are not discoverable from the
   * package's default locations, which is the case for installed packages:
   * the lookup finds `rust` only in the repository layout.
   *
   * @default - the repository's `rust` directory when available
   */
  readonly projectPath?: string;

  /**
   * Options passed to the local provider compile path.
   *
   * The provider uses `providerLambda.architecture` as the single architecture
   * setting.
   *
   * @default - local compile helper defaults
   */
  readonly bundling?: ShinBucketDeploymentBundlingOptions;
}
