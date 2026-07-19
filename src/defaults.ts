import { FailureDiagnostics } from "./enums";

/** Default provider Lambda memory in MiB. */
export const DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB = 1024;

/** Default maximum number of concurrent logical object transfers. */
export const DEFAULT_MAX_PARALLEL_TRANSFERS = 32;

/** Default destination-write failure diagnostics mode. */
export const DEFAULT_FAILURE_DIAGNOSTICS = FailureDiagnostics.STANDARD;
