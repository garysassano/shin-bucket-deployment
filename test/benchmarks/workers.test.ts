import { expect, test } from "vitest";
import type { PlannedBenchmarkRun } from "../../benchmarks/src/plan";
import { runBenchmarkWorkers } from "../../benchmarks/src/run-assets-comparison";

test("a pre-stack provenance failure waits for the owned sibling's cleanup and stops new stacks", async () => {
  const ownedStack = Promise.withResolvers<void>();
  const provenanceFailed = Promise.withResolvers<void>();
  const cleanupAllowed = Promise.withResolvers<void>();
  const events: string[] = [];
  let checks = 0;
  const execution = runBenchmarkWorkers({
    runs: [run("failed", 1024), run("owned", 2048), run("queued", 4096)],
    concurrency: 2,
    signal: new AbortController().signal,
    capReached: () => false,
    assertSourceUnchanged: async () => {
      if (++checks === 1) {
        await ownedStack.promise;
        provenanceFailed.resolve();
        throw new Error("source provenance changed");
      }
    },
    runStack: async (run) => {
      events.push(`deploy ${run.sampleId}`);
      ownedStack.resolve();
      try {
        await provenanceFailed.promise;
      } finally {
        await cleanupAllowed.promise;
        events.push(`cleanup verified ${run.sampleId}`);
      }
    },
  }).then(
    () => events.push("finished"),
    (error: unknown) => events.push(String(error)),
  );

  await provenanceFailed.promise;
  // Drain the promise callbacks without letting the owned stack finish cleanup.
  await new Promise<void>((resolve) => setImmediate(resolve));
  const beforeCleanup = [...events];
  cleanupAllowed.resolve();
  await execution;
  expect(beforeCleanup).toEqual(["deploy owned"]);
  expect(events).toEqual([
    "deploy owned",
    "cleanup verified owned",
    "Error: source provenance changed",
  ]);
});

function run(sampleId: string, memoryMb: number): PlannedBenchmarkRun {
  return {
    sampleId,
    memoryMb,
    repetition: 1,
    implementation: "shin",
    assetProfile: "tiny-many",
    parallel: 32,
  };
}

test("a sibling waiting on provenance cannot deploy after another worker fails", async () => {
  const firstFailed = Promise.withResolvers<void>();
  const releaseSecond = Promise.withResolvers<void>();
  const started: string[] = [];
  let checks = 0;
  const execution = runBenchmarkWorkers({
    runs: [run("failed", 1024), run("waiting", 2048)],
    concurrency: 2,
    signal: new AbortController().signal,
    capReached: () => false,
    assertSourceUnchanged: async () => {
      if (++checks === 1) {
        firstFailed.resolve();
        throw new Error("source provenance changed");
      }
      await releaseSecond.promise;
    },
    runStack: async (run) => {
      started.push(run.sampleId);
    },
  });
  const rejected = expect(execution).rejects.toThrow("source provenance changed");
  await firstFailed.promise;
  await new Promise<void>((resolve) => setImmediate(resolve));
  releaseSecond.resolve();
  await rejected;
  expect(started).toEqual([]);
});
