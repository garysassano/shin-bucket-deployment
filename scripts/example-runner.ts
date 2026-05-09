import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

type ExampleAction = "list" | "synth" | "deploy" | "destroy";

type ExampleDefinition = {
  readonly file: string;
  readonly stackHint?: string;
  readonly env?: Record<string, string>;
};

const EXAMPLES = {
  simple: { file: "simple-app.js", stackHint: "ShinBucketDeploymentSimpleDemo" },
  replacement: {
    file: "replacement-behavior-app.js",
    stackHint: "ShinBucketDeploymentReplacementBehaviorDemo",
  },
  "cloudfront-sync": {
    file: "cloudfront-invalidation-sync-app.js",
    stackHint: "ShinBucketDeploymentCloudFrontInvalidationSyncDemo",
  },
  "cloudfront-async": {
    file: "cloudfront-invalidation-async-app.js",
    stackHint: "ShinBucketDeploymentCloudFrontInvalidationAsyncDemo",
  },
  "extract-false": {
    file: "extract-false-app.js",
    stackHint: "ShinBucketDeploymentExtractFalseDemo",
  },
  "kms-destination": {
    file: "kms-destination-app.js",
    stackHint: "ShinBucketDeploymentKmsDestinationDemo",
  },
  "large-archive": {
    file: "large-archive-app.js",
    stackHint: "ShinBucketDeploymentLargeArchiveDemo",
  },
  "metadata-filters": {
    file: "metadata-filters-app.js",
    stackHint: "ShinBucketDeploymentMetadataFiltersDemo",
  },
  "multi-source-overwrite": {
    file: "multi-source-overwrite-app.js",
    stackHint: "ShinBucketDeploymentMultiSourceOverwriteDemo",
  },
  "benchmark-assets": {
    file: "benchmark-assets-app.js",
    stackHint: "ShinBucketDeploymentBenchmarkAssetsDemo",
  },
  "benchmark-assets-aws": {
    file: "benchmark-assets-app.js",
    stackHint: "AwsBucketDeploymentBenchmarkAssetsDemo",
    env: {
      SHIN_BENCH_IMPLEMENTATION: "aws",
    },
  },
  "prune-update": {
    file: "prune-update-v2-app.js",
    stackHint: "ShinBucketDeploymentPruneUpdateDemo",
  },
  "prune-update-v1": {
    file: "prune-update-v1-app.js",
    stackHint: "ShinBucketDeploymentPruneUpdateDemo",
  },
  "prune-update-v2": {
    file: "prune-update-v2-app.js",
    stackHint: "ShinBucketDeploymentPruneUpdateDemo",
  },
  "retain-on-delete": {
    file: "retain-on-delete-v2-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteDemo",
  },
  "retain-on-delete-v1": {
    file: "retain-on-delete-v1-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteDemo",
  },
  "retain-on-delete-v2": {
    file: "retain-on-delete-v2-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteDemo",
  },
  "retain-on-delete-false": {
    file: "retain-on-delete-false-v2-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteFalseDemo",
  },
  "retain-on-delete-false-bucket-only": {
    file: "retain-on-delete-false-bucket-only-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteFalseDemo",
  },
  "retain-on-delete-false-v1": {
    file: "retain-on-delete-false-v1-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteFalseDemo",
  },
  "retain-on-delete-false-v2": {
    file: "retain-on-delete-false-v2-app.js",
    stackHint: "ShinBucketDeploymentRetainOnDeleteFalseDemo",
  },
} as const satisfies Record<string, ExampleDefinition>;

function printUsage(): void {
  const names = Object.keys(EXAMPLES).sort();
  console.error("Usage: pnpm example <list|synth|deploy|destroy> [name] [-- extra cdk args]");
  console.error("");
  console.error("Examples:");
  console.error("  pnpm example list");
  console.error("  pnpm example synth simple");
  console.error("  pnpm example deploy cloudfront-sync");
  console.error(
    "  pnpm example deploy cloudfront-sync -- --parameters ShinBucketDeploymentCloudFrontInvalidationSyncDemo:CacheProbeToken=v2",
  );
  console.error("  pnpm example destroy retain-on-delete");
  console.error("");
  console.error(`Known names: ${names.join(", ")}`);
}

function listExamples(): void {
  console.log("Available examples:");
  for (const [name, example] of Object.entries(EXAMPLES).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`- ${name}: ${example.file}`);
  }
}

function parseArgs(argv: string[]): {
  action: ExampleAction;
  name?: string;
  cdkArgs: string[];
} {
  const [action, name, ...rest] = argv;

  if (!action || !isAction(action)) {
    printUsage();
    process.exit(1);
  }

  const cdkArgs = rest.filter((arg) => arg !== "--");
  return { action, name, cdkArgs };
}

function isAction(value: string): value is ExampleAction {
  return value === "list" || value === "synth" || value === "deploy" || value === "destroy";
}

function resolveExample(name: string | undefined): ExampleDefinition {
  if (!name) {
    printUsage();
    process.exit(1);
  }

  const example = EXAMPLES[name as keyof typeof EXAMPLES];
  if (!example) {
    console.error(`Unknown example: ${name}`);
    printUsage();
    process.exit(1);
  }

  return example;
}

function main(): void {
  const { action, name, cdkArgs } = parseArgs(process.argv.slice(2));

  if (action === "list") {
    listExamples();
    return;
  }

  const example = resolveExample(name);
  const appPath = join(process.cwd(), "dist", "examples", example.file);
  if (!existsSync(appPath)) {
    console.error(`Built example app not found: ${appPath}`);
    console.error("Run `pnpm build` first.");
    process.exit(1);
  }

  const args = ["exec", "cdk", action, "--app", `node ${appPath}`];
  if (action === "deploy") {
    args.push("--require-approval", "never");
  }
  if (action === "destroy") {
    args.push("--force");
  }
  args.push(...cdkArgs);

  const result = spawnSync("pnpm", args, {
    cwd: process.cwd(),
    env: { ...process.env, ...example.env },
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

main();
