import { AwsVerificationApi, type VerificationApi } from "./aws";
import { stackOutputs } from "./outputs";

export async function verifyStackAbsent(
  stackName: string,
  outputsFile: string | undefined,
  api: VerificationApi = new AwsVerificationApi(),
): Promise<void> {
  const outputs = outputsFile ? stackOutputs(outputsFile, stackName) : {};
  await api.assertStackAbsent(stackName);

  const buckets = new Set(
    Object.entries(outputs)
      .filter(([name]) => name.endsWith("BucketName"))
      .map(([, value]) => value),
  );
  const distributions = new Set(
    Object.entries(outputs)
      .filter(([name]) => name.endsWith("DistributionId"))
      .map(([, value]) => value),
  );
  await Promise.all([
    ...[...buckets].map((bucket) => api.assertBucketAbsent(bucket)),
    ...[...distributions].map((distribution) => api.assertDistributionAbsent(distribution)),
  ]);
}

function option(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (required && !value) throw new Error(`${name} is required.`);
  return value;
}

if (require.main === module) {
  const stackName = option("--stack-name");
  if (!stackName) throw new Error("--stack-name is required.");
  verifyStackAbsent(stackName, option("--outputs-file", false))
    .then(() => console.log("Verification stack and scoped resources are absent."))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
