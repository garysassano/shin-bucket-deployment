import { describe, expect, it } from "vitest";
import { parseArgs } from "../scenarios/arguments";

describe("scenario argument parser", () => {
  it("separates runner options from forwarded CDK arguments", () => {
    const parsed = parseArgs([
      "verify",
      "deploy",
      "cloudfront-sync",
      "--concurrency=2",
      "--",
      "--profile",
      "local-profile",
      "--parameters",
      "Stack:Name=value",
    ]);

    expect(parsed).toEqual({
      mode: "verify",
      action: "deploy",
      name: "cloudfront-sync",
      runnerOptions: new Map([["concurrency", "2"]]),
      cdkArgs: ["--profile", "local-profile", "--parameters", "Stack:Name=value"],
    });
  });

  it.each([
    [["verify", "deploy", "--unknown", "1"], "Unknown verify option: --unknown."],
    [
      ["verify", "deploy", "--concurrency", "2", "--concurrency=3"],
      "Duplicate option: --concurrency.",
    ],
    [["verify", "deploy", "--concurrency"], "Missing value for --concurrency."],
    [["verify", "deploy", "--concurrency="], "Missing value for --concurrency."],
    [
      ["benchmark", "deploy", "assets", "--concurrency", "2"],
      "Unknown benchmark option: --concurrency.",
    ],
    [
      ["verify", "deploy", "simple", "--groups", "simple,filters"],
      "Choose either a verification name or --groups",
    ],
    [
      ["verify", "deploy", "--implementations", "shin"],
      "Unknown verify option: --implementations.",
    ],
    [["verify", "list", "simple"], "The list action does not accept"],
    [["benchmark", "deploy"], "Benchmark actions require a scenario name."],
  ])("rejects invalid or conflicting arguments %#", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });
});
