import { type ChildProcess, spawn } from "node:child_process";
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
  readonly signal?: AbortSignal;
}): Promise<number> {
  mkdirSync(dirname(args.logFile), { recursive: true });
  writeFileSync(args.logFile, "");
  const start = Date.now();
  const status = await new Promise<number>((resolve) => {
    const child = spawn(args.command, args.args, {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: args.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let aborted = false;
    let terminationTimer: NodeJS.Timeout | undefined;
    const terminate = (): void => {
      aborted = true;
      signalProcess(child, "SIGTERM");
      terminationTimer = setTimeout(() => signalProcess(child, "SIGKILL"), 5_000);
      terminationTimer.unref();
    };
    args.signal?.addEventListener("abort", terminate, { once: true });
    if (args.signal?.aborted === true) terminate();
    child.stdout.on("data", (chunk: Buffer) => writeChunk(args.logFile, chunk, args.quiet));
    child.stderr.on("data", (chunk: Buffer) => writeChunk(args.logFile, chunk, args.quiet));
    child.on("close", (code) => {
      args.signal?.removeEventListener("abort", terminate);
      if (terminationTimer !== undefined) clearTimeout(terminationTimer);
      resolve(aborted ? 130 : (code ?? 1));
    });
    child.on("error", (error) => {
      args.signal?.removeEventListener("abort", terminate);
      if (terminationTimer !== undefined) clearTimeout(terminationTimer);
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

export function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason ?? new Error("Benchmark interrupted."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted === true) abort();
  });
}

function writeChunk(path: string, chunk: Buffer, quiet: boolean | undefined): void {
  writeFileSync(path, chunk, { flag: "a" });
  if (!quiet) process.stderr.write(chunk);
}

function signalProcess(child: ChildProcess, signal: NodeJS.Signals): void {
  if (process.platform !== "win32" && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {}
  }
  child.kill(signal);
}
