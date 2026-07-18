/**
 * Scope of the provider Lambda used by a deployment.
 */
export enum ProviderScope {
  /**
   * Reuse a compatible provider Lambda within the stack.
   */
  STACK = "stack",

  /**
   * Create a provider Lambda scoped to this deployment.
   */
  DEPLOYMENT = "deployment",
}

/**
 * Amount of destination-write failure detail collected by the provider.
 */
export enum FailureDiagnostics {
  /**
   * Collect aggregate failure counters without per-attempt diagnostic state.
   */
  STANDARD = "standard",

  /**
   * Collect bounded per-attempt diagnostic state for troubleshooting.
   */
  DETAILED = "detailed",
}

/**
 * Jitter applied to provider-owned destination-write retry delays.
 */
export enum DestinationWriteRetryJitter {
  /**
   * Randomize each delay between zero and the calculated backoff.
   */
  FULL = "full",

  /**
   * Use the calculated backoff without randomization.
   */
  NONE = "none",
}
