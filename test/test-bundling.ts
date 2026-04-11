import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CargoBucketDeploymentProps } from "../src";

export function testBundling(): CargoBucketDeploymentProps["bundling"] {
  return {
    forcedDockerBundling: false,
    dockerOptions: {
      local: {
        tryBundle(outputDir: string) {
          mkdirSync(outputDir, { recursive: true });
          const bootstrapPath = join(outputDir, "bootstrap");
          writeFileSync(bootstrapPath, "#!/bin/sh\nexit 0\n");
          chmodSync(bootstrapPath, 0o755);
          return true;
        },
      },
    },
  };
}
