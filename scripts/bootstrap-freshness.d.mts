export declare const STALE_BOOTSTRAP_ESCAPE_HATCH: string;

export declare function assertStagedBootstrapFreshness(options: {
  readonly repositoryRoot: string;
  readonly architectures?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
}): void;
