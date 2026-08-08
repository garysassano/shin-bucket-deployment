export declare const STALE_BOOTSTRAP_ESCAPE_HATCH: string;

export declare type CurrentIdentity = {
  readonly providerInputSha256: string;
  readonly buildToolchainSha256: string;
  readonly buildEnvironmentSha256: string;
};

export declare function assertStagedBootstrapFreshness(options: {
  readonly repositoryRoot: string;
  readonly architectures?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly currentIdentity?: CurrentIdentity;
}): void;
