import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn }));

import { collectBenchmarkSourceMetadata } from "../../benchmarks/src/metadata";

const fixtures: string[] = [];
afterEach(() => {
  spawn.mockReset();
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

test.each(["source", "git"])(
  "concurrent metadata scans wait for pnpm probes after a %s failure",
  async (failure) => {
    const root = mkdtempSync(join(tmpdir(), "shin-metadata-race-"));
    fixtures.push(root);
    for (const path of [
      "node_modules/aws-cdk",
      "node_modules/aws-cdk-lib",
      "assets/bootstrap-arm64",
    ]) {
      mkdirSync(join(root, path), { recursive: true });
    }
    for (const path of [
      "package.json",
      "node_modules/aws-cdk/package.json",
      "node_modules/aws-cdk-lib/package.json",
    ]) {
      writeFileSync(join(root, path), JSON.stringify({ name: "fixture", version: "1.0.0" }));
    }
    writeFileSync(join(root, "pnpm-lock.yaml"), "fixture lockfile");
    writeFileSync(join(root, "assets/bootstrap-arm64/bootstrap.zip"), "fixture archive");
    writeFileSync(join(root, "assets/bootstrap-arm64/build-provenance.json"), "{}");

    let activeProbes = 0;
    let activeScans = 0;
    const overlaps: string[] = [];
    const scanned: number[] = [];
    spawn.mockImplementation((command: string, args: string[]) => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
      });
      const finish = (output: string, status = 0): void => {
        (status === 0 ? child.stdout : child.stderr).emit("data", Buffer.from(output));
        child.emit("close", status);
      };
      if (command === "pnpm") {
        if (activeScans > 0) overlaps.push("pnpm probe started during a source scan");
        activeProbes += 1;
        // pnpm creates and removes a temporary file while resolving project configuration.
        setTimeout(() => {
          activeProbes -= 1;
          finish("12.0.0");
        }, 10);
      } else if (command === "node") {
        if (activeProbes > 0) overlaps.push("source scan started during a pnpm probe");
        activeScans += 1;
        setTimeout(() => {
          activeScans -= 1;
          scanned.push(scanned.length + 1);
          // A real provenance failure must release the queue so the next scan can run.
          finish("fixture source failure", 1);
        }, 20);
      } else {
        if (command === "git" && args[0] === "status" && activeProbes > 0) {
          overlaps.push("git status started during a pnpm probe");
        }
        queueMicrotask(() => {
          if (command === "git" && args[0] === "rev-parse" && failure === "git") {
            finish("fixture git failure", 1);
          } else {
            finish(command === "git" && args[0] === "status" ? "" : "fixture");
          }
        });
      }
      return child;
    });

    const results = await Promise.allSettled([
      collectBenchmarkSourceMetadata(root),
      collectBenchmarkSourceMetadata(root),
      collectBenchmarkSourceMetadata(root),
    ]);
    expect(scanned).toEqual([1, 2, 3]);
    expect(
      results.every(
        (result) =>
          result.status === "rejected" &&
          String(result.reason).includes(`fixture ${failure} failure`),
      ),
    ).toBe(true);
    expect(overlaps).toEqual([]);
  },
);
