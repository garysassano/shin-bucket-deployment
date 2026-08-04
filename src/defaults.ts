import { FailureDiagnostics } from "./enums";

/** Default provider Lambda memory in MiB. */
export const DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB = 1024;

/** Default maximum number of concurrent logical object tasks. */
export const DEFAULT_TRANSFER_MAX_CONCURRENCY = 32;

/** Default maximum uncompressed size of one extracted ZIP entry in bytes. */
export const DEFAULT_MAX_UNCOMPRESSED_ENTRY_BYTES = 1024 * 1024 * 1024;

/** Default maximum ratio of uncompressed to compressed ZIP entry bytes. */
export const DEFAULT_MAX_COMPRESSION_RATIO = 100;

/** Default destination-write failure diagnostics mode. */
export const DEFAULT_FAILURE_DIAGNOSTICS = FailureDiagnostics.STANDARD;
