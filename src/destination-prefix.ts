import { Token } from "aws-cdk-lib";
import type { Construct } from "constructs";
import { ValidationError } from "./errors";

export const MAX_DESTINATION_KEY_PREFIX_LENGTH = 102;

export function validateDestinationKeyPrefix(scope: Construct, prefix: string | undefined): void {
  if (prefix === undefined) return;
  if (Token.isUnresolved(prefix)) {
    throw new ValidationError(
      "ShinBucketDeploymentDestinationKeyPrefixUnresolved",
      "destinationKeyPrefix must be a concrete string so destination ownership can be validated.",
      scope,
    );
  }
  if (prefix.length > MAX_DESTINATION_KEY_PREFIX_LENGTH) {
    throw new ValidationError(
      "ShinBucketDeploymentDestinationKeyPrefixTooLong",
      `destinationKeyPrefix must be <=${MAX_DESTINATION_KEY_PREFIX_LENGTH} characters.`,
      scope,
    );
  }
}

export function destinationOwnerPrefix(prefix: string | undefined): string {
  return prefix === "/" ? "" : (prefix ?? "");
}
