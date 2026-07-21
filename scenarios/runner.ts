import { parseArgs } from "./arguments";
import { BENCHMARK_SCENARIOS, VERIFY_GROUPS, VERIFY_SCENARIOS } from "./catalog";
import { executeParsedArgs } from "./execute";
import type { ScenarioMode } from "./types";

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  if (args.action === "list") {
    printScenarios(args.mode);
    return 0;
  }

  const controller = new AbortController();
  const onSignal = (): void => controller.abort();
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    return await executeParsedArgs(args, { signal: controller.signal });
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }
}

function printScenarios(mode: ScenarioMode): void {
  const scenarios = mode === "verify" ? VERIFY_SCENARIOS : BENCHMARK_SCENARIOS;
  console.log(`Available ${mode} scenarios:`);
  for (const [name, scenario] of Object.entries(scenarios)) {
    console.log(`- ${name}: ${scenario.file}`);
  }
  if (mode === "verify") {
    console.log("Available verify groups:");
    for (const [name, phases] of Object.entries(VERIFY_GROUPS)) {
      console.log(`- ${name}: ${phases.join(" -> ")}`);
    }
  }
}

main()
  .then((status) => {
    process.exitCode = status;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    printUsage();
    process.exitCode = 1;
  });

function printUsage(): void {
  console.error(
    "Usage: pnpm scenario <verify|benchmark> <list|synth|deploy|destroy> [name] [runner options] [-- extra cdk args]",
  );
  console.error(
    "Verification defaults: pnpm verify synth|deploy|destroy [name | --groups a,b] [--concurrency N]",
  );
  console.error("Benchmark example: pnpm benchmark deploy assets --implementations shin,aws");
}
