import type { IConstruct } from "constructs";

/**
 * Validation error thrown when input props fail this construct's rules.
 *
 * This mirrors the user-facing behavior of the internal `aws-cdk-lib`
 * `ValidationError` (a construct-scoped error with a stable `name`) without
 * importing private `aws-cdk-lib` paths, so the published package only depends
 * on the public CDK API surface.
 */
export class ValidationError extends Error {
  /**
   * Stable, machine-readable error code.
   */
  public readonly code: string;

  /**
   * Path of the construct this error was thrown from, if available.
   */
  public readonly constructPath?: string;

  constructor(code: string, message: string, scope?: IConstruct) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
    this.constructPath = scope?.node?.path;
  }
}
