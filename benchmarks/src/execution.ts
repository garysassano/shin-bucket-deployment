import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export async function runCommand(args: {
  readonly command: string;
  readonly args: string[];
  readonly env?: NodeJS.ProcessEnv;
  readonly logFile: string;
  readonly quiet?: boolean;
  readonly allowFailure?: boolean;
  readonly appendElapsed?: boolean;
}): Promise<number> {
  mkdirSync(dirname(args.logFile), { recursive: true });
  writeFileSync(args.logFile, "");
  const start = Date.now();
  const status = await new Promise<number>((resolve) => {
    const child = spawn(args.command, args.args, {
      cwd: process.cwd(),
      env: args.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => writeChunk(args.logFile, chunk, args.quiet));
    child.stderr.on("data", (chunk: Buffer) => writeChunk(args.logFile, chunk, args.quiet));
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (error) => {
      writeFileSync(args.logFile, `${error.message}\n`, { flag: "a" });
      resolve(1);
    });
  });
  if (args.appendElapsed !== false) {
    const elapsedSeconds = Math.round(((Date.now() - start) / 1000) * 1000) / 1000;
    writeFileSync(args.logFile, `real ${elapsedSeconds}\n`, { flag: "a" });
  }
  if (status !== 0 && !args.allowFailure) {
    throw new Error(`${args.command} ${args.args.join(" ")} failed; see ${args.logFile}`);
  }
  return status;
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function writeChunk(path: string, chunk: Buffer, quiet: boolean | undefined): void {
  writeFileSync(path, chunk, { flag: "a" });
  if (!quiet) process.stderr.write(chunk);
}
