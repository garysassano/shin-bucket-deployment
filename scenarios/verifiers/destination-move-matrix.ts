import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MOVE_SHAPES,
  currentBody,
  currentPrefix,
  initialCurrentBody,
  previousBody,
  previousPrefix,
} from "../apps/lifecycle/destination-move-matrix";

type VerificationPhase = "initial" | "updated";
type AwsCommand = (args: string[], operation: string) => string;

function main(): void {
  const stackName = option("--stack-name");
  const phase = verificationPhase(option("--scenario-name"));
  const outputs = stackOutputs(stackName);
  const scratch = mkdtempSync(join(tmpdir(), "shin-destination-move-verifier-"));

  try {
    for (const shape of MOVE_SHAPES) {
      for (const cleanup of [false, true]) {
        verifyMove(outputs, scratch, phase, shape, cleanup);
      }
    }
    console.log(`Destination move matrix ${phase} object-state assertions passed.`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function verifyMove(
  outputs: Record<string, string>,
  scratch: string,
  phase: VerificationPhase,
  shape: (typeof MOVE_SHAPES)[number],
  cleanup: boolean,
): void {
  const mode = cleanup ? "cleanup" : "retain";
  const base = `matrix/${shape}/${mode}`;
  const oldBucket = output(
    outputs,
    shape === "cross-bucket" ? "PreviousBucketName" : "SharedBucketName",
  );
  const newBucket = output(
    outputs,
    shape === "cross-bucket" ? "CurrentBucketName" : "SharedBucketName",
  );
  const oldPrefix = previousPrefix(shape, base);
  const previousCurrentKey = `${oldPrefix}/current.txt`;
  const previousObsoleteKey = `${oldPrefix}/obsolete.txt`;

  if (phase === "initial") {
    assertObjectBody(
      oldBucket,
      previousCurrentKey,
      initialCurrentBody(shape, cleanup),
      join(scratch, `${shape}-${mode}-initial-current`),
    );
    assertObjectBody(
      oldBucket,
      previousObsoleteKey,
      previousBody(shape, cleanup),
      join(scratch, `${shape}-${mode}-initial-obsolete`),
    );
    return;
  }

  assertObjectBody(
    newBucket,
    `${currentPrefix(shape, base)}/current.txt`,
    currentBody(shape, cleanup),
    join(scratch, `${shape}-${mode}-updated-current`),
  );
  if (cleanup) {
    assertObjectMissing(oldBucket, previousCurrentKey);
    assertObjectMissing(oldBucket, previousObsoleteKey);
  } else {
    assertObjectBody(
      oldBucket,
      previousCurrentKey,
      initialCurrentBody(shape, cleanup),
      join(scratch, `${shape}-${mode}-retained-current`),
    );
    assertObjectBody(
      oldBucket,
      previousObsoleteKey,
      previousBody(shape, cleanup),
      join(scratch, `${shape}-${mode}-retained-obsolete`),
    );
  }
}

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function verificationPhase(scenarioName: string): VerificationPhase {
  if (scenarioName === "destination-move-matrix-initial") return "initial";
  if (scenarioName === "destination-move-matrix-updated") return "updated";
  throw new Error("The destination move verifier received an unexpected scenario name.");
}

function stackOutputs(name: string): Record<string, string> {
  const value = awsJson(
    [
      "cloudformation",
      "describe-stacks",
      "--stack-name",
      name,
      "--query",
      "Stacks[0].Outputs",
      "--output",
      "json",
    ],
    "Reading stack outputs",
  );
  if (!Array.isArray(value)) {
    throw new Error("Reading stack outputs returned an unexpected response shape.");
  }

  const outputs: Record<string, string> = {};
  for (const entry of value) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("OutputKey" in entry) ||
      typeof entry.OutputKey !== "string" ||
      !("OutputValue" in entry) ||
      typeof entry.OutputValue !== "string"
    ) {
      throw new Error("Reading stack outputs returned an unexpected response shape.");
    }
    outputs[entry.OutputKey] = entry.OutputValue;
  }
  return outputs;
}

function output(outputs: Record<string, string>, name: string): string {
  const value = outputs[name];
  if (!value) throw new Error(`Stack output ${name} is missing.`);
  return value;
}

function assertObjectBody(
  bucket: string,
  key: string,
  expected: string,
  destination: string,
): void {
  aws(
    ["s3api", "get-object", "--bucket", bucket, "--key", key, destination],
    "Reading an expected destination object",
  );
  let actual: string;
  try {
    actual = readFileSync(destination, "utf8");
  } catch {
    throw new Error("An expected destination object could not be read locally.");
  }
  if (actual !== expected) {
    throw new Error("A destination object body did not match the expected scenario state.");
  }
}

export function assertObjectMissing(bucket: string, key: string, runAws: AwsCommand = aws): void {
  const value = awsJson(
    ["s3api", "list-objects-v2", "--bucket", bucket, "--prefix", key, "--output", "json"],
    "Listing a previous destination object",
    runAws,
  );
  if (typeof value !== "object" || value === null || !("KeyCount" in value)) {
    throw new Error("Listing a previous destination object returned an unexpected response shape.");
  }
  if (typeof value.KeyCount !== "number") {
    throw new Error("Listing a previous destination object returned an unexpected response shape.");
  }

  const contents = "Contents" in value ? value.Contents : undefined;
  if (contents === undefined) {
    if (value.KeyCount !== 0) {
      throw new Error(
        "Listing a previous destination object returned an unexpected response shape.",
      );
    }
    return;
  }
  if (!Array.isArray(contents)) {
    throw new Error("Listing a previous destination object returned an unexpected response shape.");
  }
  const keys = contents.map((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("Key" in entry) ||
      typeof entry.Key !== "string"
    ) {
      throw new Error(
        "Listing a previous destination object returned an unexpected response shape.",
      );
    }
    return entry.Key;
  });
  if (keys.includes(key)) {
    throw new Error("A previous destination object should have been deleted.");
  }
}

function awsJson(args: string[], operation: string, runAws: AwsCommand = aws): unknown {
  const stdout = runAws(args, operation);
  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    throw new Error(`${operation} returned invalid JSON.`);
  }
}

function aws(args: string[], operation: string): string {
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync("aws", [...args, "--no-cli-pager"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`${operation} could not start the AWS CLI.`);
  }
  if (result.error !== undefined) {
    throw new Error(`${operation} could not start the AWS CLI.`);
  }
  if (result.status !== 0) {
    throw new Error(`${operation} failed.`);
  }
  return typeof result.stdout === "string" ? result.stdout : result.stdout.toString("utf8");
}

if (require.main === module) {
  main();
}
