import { readFileSync } from "node:fs";

export function stackOutputs(path: string, stackName: string): Record<string, string> {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new Error("The deployment outputs file could not be read.");
  }
  if (typeof value !== "object" || value === null || !(stackName in value)) {
    throw new Error("The deployment outputs file returned an unexpected response shape.");
  }
  const stack = value[stackName as keyof typeof value];
  if (typeof stack !== "object" || stack === null || Array.isArray(stack)) {
    throw new Error("The deployment outputs file returned an unexpected response shape.");
  }
  const outputs = Object.entries(stack);
  if (outputs.some(([, outputValue]) => typeof outputValue !== "string")) {
    throw new Error("The deployment outputs file returned an unexpected response shape.");
  }
  return Object.fromEntries(outputs) as Record<string, string>;
}

export function requiredOutput(outputs: Record<string, string>, name: string): string {
  const value = outputs[name];
  if (!value) throw new Error(`Stack output ${name} is missing.`);
  return value;
}
