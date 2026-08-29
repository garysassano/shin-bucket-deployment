import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { afterEach, describe, expect, test } from "vitest";

// The project compiles as CommonJS (no package "type": "module"), so the
// ambient Node `require` is available to tests, matching the other test files.

// The packaged entry (`lib/`) is produced by `pnpm build:package`, which runs
// before tests inside `pnpm check` but not under a bare `pnpm test`. All other
// synth tests import `../../src`, so this smoke test is the only in-suite
// coverage of the packaged entry; it is skipped when the package build output
// is absent and exercised for real by `scripts/verify-package.mjs` on every
// check run.
const packagedEntry = join(__dirname, "..", "..", "lib", "index.js");
const packagedBuildPresent = existsSync(packagedEntry);
// Synthesizing with the prebuilt provider needs the bootstrap archive, which is
// produced by the Bootstrap jobs, not by `pnpm build:package` alone. Without it
// synth falls back to compiling the Rust provider, which is not available in the
// Node CI job — skip the synth smoke test when no prebuilt archive is present.
const prebuiltArchivePresent =
  existsSync(join(__dirname, "..", "..", "assets", "bootstrap-arm64", "bootstrap.zip")) ||
  existsSync(join(__dirname, "..", "..", "assets", "bootstrap-x86_64", "bootstrap.zip"));

const cleanupDirectories: string[] = [];
afterEach(() => {
  for (const directory of cleanupDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  cleanupDirectories.length = 0;
});

describe.skipIf(!packagedBuildPresent)("packaged entry smoke test", () => {
  test.skipIf(!prebuiltArchivePresent)(
    "the packaged entry synthesizes a deployment with the prebuilt provider",
    () => {
      const packaged = require(packagedEntry) as typeof import("../../src");
      const outdir = mkdtempSync(join(tmpdir(), "shin-packaged-smoke-"));
      cleanupDirectories.push(outdir);
      const app = new App({ outdir });
      const stack = new Stack(app, "PackagedSmoke");
      const destinationBucket = new Bucket(stack, "Dest");

      new packaged.ShinBucketDeployment(stack, "Deploy", {
        sources: [packaged.Source.data("index.html", "ok")],
        destination: { bucket: destinationBucket },
      });

      const template = Template.fromStack(stack).toJSON() as {
        Resources?: Record<string, unknown>;
      };
      const customResource = Object.values(template.Resources ?? {}).find(
        (resource) =>
          (resource as { Type?: string }).Type === "AWS::CloudFormation::CustomResource",
      ) as { Properties?: Record<string, unknown> } | undefined;
      const destination = customResource?.Properties?.Destination as
        | { BucketName?: unknown }
        | undefined;
      expect(destination?.BucketName).toEqual({
        Ref: expect.stringMatching(/^Dest/),
      });
      // The packaged entry must resolve the prebuilt bootstrap archive relative
      // to lib/, or no Lambda function would render.
      expect(
        Object.values(template.Resources ?? {}).some(
          (resource) => (resource as { Type?: string }).Type === "AWS::Lambda::Function",
        ),
      ).toBe(true);
    },
  );

  test("the packaged entry exports the public API surface", () => {
    const packaged = require(packagedEntry) as typeof import("../../src");
    expect(typeof packaged.ShinBucketDeployment).toBe("function");
    expect(typeof packaged.Source.asset).toBe("function");
    expect(typeof packaged.Source.data).toBe("function");
    expect(typeof packaged.ValidationError).toBe("function");
    expect(packaged.ProviderSharing.STACK).toBe("stack");
    expect(packaged.ProviderSharing.DEPLOYMENT).toBe("deployment");
    expect(packaged.FailureDiagnostics.STANDARD).toBe("standard");
    expect(packaged.DEFAULT_TRANSFER_MAX_CONCURRENCY).toBe(64);
  });
});
