import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

type ExampleAction = "list" | "synth" | "deploy" | "destroy";

type ExampleDefinition = {
  readonly file: string;
  readonly stackHint?: string;
};

const EXAMPLES = {
  simple: { file: "simple-app.js", stackHint: "CargoBucketDeploymentSimpleDemo" },
  replacement: {
    file: "replacement-behavior-app.js",
    stackHint: "CargoBucketDeploymentReplacementBehaviorDemo",
  },
  "cloudfront-sync": {
    file: "cloudfront-invalidation-sync-app.js",
    stackHint: "CargoBucketDeploymentCloudFrontInvalidationSyncDemo",
  },
  "cloudfront-async": {
    file: "cloudfront-invalidation-async-app.js",
    stackHint: "CargoBucketDeploymentCloudFrontInvalidationAsyncDemo",
  },
  "metadata-filters": {
    file: "metadata-filters-app.js",
    stackHint: "CargoBucketDeploymentMetadataFiltersDemo",
  },
  "prune-update": {
    file: "prune-update-v2-app.js",
    stackHint: "CargoBucketDeploymentPruneUpdateDemo",
  },
  "prune-update-v1": {
    file: "prune-update-v1-app.js",
    stackHint: "CargoBucketDeploymentPruneUpdateDemo",
  },
  "prune-update-v2": {
    file: "prune-update-v2-app.js",
    stackHint: "CargoBucketDeploymentPruneUpdateDemo",
  },
  "retain-on-delete": {
    file: "retain-on-delete-v2-app.js",
    stackHint: "CargoBucketDeploymentRetainOnDeleteDemo",
  },
  "retain-on-delete-v1": {
    file: "retain-on-delete-v1-app.js",
    stackHint: "CargoBucketDeploymentRetainOnDeleteDemo",
  },
  "retain-on-delete-v2": {
    file: "retain-on-delete-v2-app.js",
    stackHint: "CargoBucketDeploymentRetainOnDeleteDemo",
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
  console.error("  pnpm example deploy cloudfront-sync -- --parameters CargoBucketDeploymentCloudFrontInvalidationSyncDemo:CacheProbeToken=v2");
  console.error("  pnpm example destroy retain-on-delete");
  console.error("");
  console.error(`Known names: ${names.join(", ")}`);
}

function listExamples(): void {
  console.log("Available examples:");
  for (const [name, example] of Object.entries(EXAMPLES).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
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
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

main();
