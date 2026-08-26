import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  benchmarkEvidenceErrors,
  implementationLabel,
  joinBenchmarkSamples,
  readBenchmarkEvidence,
  selectBenchmarkRuns,
  selectBenchmarkSamples,
} from "../../benchmarks/src/model";
import {
  type BenchmarkChartData,
  type BenchmarkSnapshotManifest,
  type RenderedBenchmarkSnapshot,
  renderBenchmarkSnapshots,
  renderReadmeSnapshot,
  writeBenchmarkSnapshotManifest,
} from "../../benchmarks/src/render/readme-snapshot";

describe("README benchmark snapshots", () => {
  let scratchRoot: string;

  beforeAll(() => {
    scratchRoot = mkdtempSync(join(tmpdir(), "shin-readme-snapshots-"));
  });

  afterAll(() => {
    rmSync(scratchRoot, { force: true, recursive: true });
  });

  it("renders labels, values, winner direction, deltas, and accessible text", () => {
    const data: BenchmarkChartData = {
      assets: "2 objects · 1 MiB",
      awsIdentity: "CDK v2.0.0",
      duration: [
        { label: "shin-fast", shin: 1, aws: 2 },
        { label: "aws-fast", shin: 4, aws: 2 },
        { label: "duration-tie", shin: 3, aws: 3 },
      ],
      memory: [{ label: "memory-saved", shin: 64, aws: 128 }],
      profileSummary: "fixture",
      providerConfiguration: "128 MiB · Shin concurrency 2",
      region: "eu-test-1",
      runId: "00000000-0000-4000-8000-000000000000",
      shinIdentity: "SHA 1234567",
      profile: "fixture",
      memoryMb: 128,
      parallel: 2,
      phases: ["shin-fast", "aws-fast", "duration-tie", "memory-saved"],
    };

    const svg = renderReadmeSnapshot(data);
    const shinWins = svg.slice(svg.indexOf(">shin-fast</text>"), svg.indexOf(">aws-fast</text>"));
    const awsWins = svg.slice(svg.indexOf(">aws-fast</text>"), svg.indexOf(">duration-tie</text>"));
    const tie = svg.slice(svg.indexOf(">duration-tie</text>"), svg.indexOf("MAX MEMORY"));

    expect(svg).toContain('role="img" aria-labelledby="title desc"');
    expect(svg).toContain(
      '<title id="title">ShinBucketDeployment vs AWS BucketDeployment benchmark</title>',
    );
    expect(svg).toContain(
      '<desc id="desc">Benchmark comparing handler duration and memory usage. Lower is better.</desc>',
    );
    expect(svg).toContain(">SHIN</text>");
    expect(svg).toContain(">AWS</text>");
    expect(shinWins).toContain(">1s</text>");
    expect(shinWins).toContain(">2s</text>");
    expect(shinWins).toContain('fill="#082b35" stroke="#18d4f8"');
    expect(awsWins).toContain(">4s</text>");
    expect(awsWins).toContain(">2s</text>");
    expect(awsWins).toContain('fill="#341821" stroke="#ff6a2b"');
    expect(tie).toContain(">tie</text>");
    expect(svg.match(/>2×<\/text>/g)).toHaveLength(2);
    expect(svg).toContain(">64 MiB</text>");
    expect(svg).toContain(">128 MiB</text>");
    expect(svg).toContain(">50%</text>");
  });

  it("reproduces every committed SVG from its manifest-selected ledger rows", async () => {
    const repositoryRoot = join(__dirname, "..", "..");
    const snapshotDirectory = join(repositoryRoot, "benchmarks", "snapshots");
    const manifest = JSON.parse(
      readFileSync(join(snapshotDirectory, "manifest.json"), "utf8"),
    ) as BenchmarkSnapshotManifest;
    const svgFiles = readdirSync(snapshotDirectory)
      .filter((file) => file.endsWith(".svg"))
      .sort();
    const evidence = readBenchmarkEvidence(join(repositoryRoot, "benchmarks", "results.jsonl"));

    expect(manifest.schemaVersion).toBe(1);
    expect(Object.keys(manifest.snapshots).sort()).toEqual(svgFiles);
    expect(benchmarkEvidenceErrors(evidence)).toEqual([]);

    for (const [fileName, expected] of Object.entries(manifest.snapshots)) {
      const suffix = `${expected.profile}-${expected.memoryMb}mib-${expected.transferMaxConcurrency}.svg`;
      expect(fileName.endsWith(suffix)).toBe(true);
      const filenamePrefix = fileName.slice(0, -suffix.length);
      const runs = selectBenchmarkRuns(evidence.runs, expected.runId);
      const samples = selectBenchmarkSamples(evidence.samples, expected.runId);
      const relevantSamples = samples.filter(
        (sample) =>
          sample.profile === expected.profile &&
          sample.memoryMb === expected.memoryMb &&
          ((implementationLabel(sample) === "shin" &&
            sample.parallel === expected.transferMaxConcurrency) ||
            (implementationLabel(sample) === "aws" && sample.parallel === undefined)),
      );
      for (const phase of expected.phases) {
        for (const implementation of ["shin", "aws"]) {
          expect(
            relevantSamples.filter(
              (sample) => sample.phase === phase && implementationLabel(sample) === implementation,
            ),
            `${fileName} ${implementation} ${phase}`,
          ).toHaveLength(5);
        }
      }
      expect([...new Set(relevantSamples.map((sample) => sample.phase))].sort()).toEqual(
        [...expected.phases].sort(),
      );

      const [rendered] = renderBenchmarkSnapshots(joinBenchmarkSamples(runs, samples), {
        profile: expected.profile,
        memoryMb: expected.memoryMb,
        maxConcurrency: expected.transferMaxConcurrency,
        filenamePrefix,
      });
      expect(rendered).toBeDefined();
      if (rendered === undefined) throw new Error(`No rendered snapshot for ${fileName}`);
      expect(rendered.fileName).toBe(fileName);
      expect(rendered.provenance).toEqual(expected);

      const scratchFile = join(scratchRoot, fileName);
      writeFileSync(scratchFile, rendered.svg);
      expect(createHash("sha256").update(readFileSync(scratchFile)).digest("hex")).toBe(
        expected.contentSha256,
      );
      await expect(readFileSync(scratchFile, "utf8")).toMatchFileSnapshot(
        join(snapshotDirectory, fileName),
      );
    }
  });

  it("replaces and merges manifest entries deterministically", () => {
    const first: RenderedBenchmarkSnapshot = {
      fileName: "ci-large-few-1024mib-32.svg",
      svg: "<svg/>",
      provenance: {
        runId: "00000000-0000-4000-8000-000000000001",
        profile: "large-few",
        memoryMb: 1024,
        transferMaxConcurrency: 32,
        phases: ["cold-create"],
        contentSha256: "1".repeat(64),
      },
    };
    const second: RenderedBenchmarkSnapshot = {
      fileName: "tiny-many-2048mib-64.svg",
      svg: "<svg/>",
      provenance: {
        runId: "00000000-0000-4000-8000-000000000002",
        profile: "tiny-many",
        memoryMb: 2048,
        transferMaxConcurrency: 64,
        phases: ["cold-create", "unchanged-update"],
        contentSha256: "2".repeat(64),
      },
    };
    const manifestFile = join(scratchRoot, "writer-manifest.json");

    writeBenchmarkSnapshotManifest(manifestFile, [second], "replace");
    writeBenchmarkSnapshotManifest(manifestFile, [first], "merge");

    const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as BenchmarkSnapshotManifest;
    expect(Object.keys(manifest.snapshots)).toEqual([first.fileName, second.fileName].sort());
    expect(manifest.snapshots[first.fileName]).toEqual(first.provenance);
    expect(manifest.snapshots[second.fileName]).toEqual(second.provenance);
  });
});
