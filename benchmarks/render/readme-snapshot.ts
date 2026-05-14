/**
 * Benchmark SVG render engine for README snapshots.
 * All positions derived from layout constants — change one value and everything adapts.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type ChartVariant = "default" | "aws";
type HeaderLayout = "two-line" | "three-line";

function parseVariant(argv: string[]): ChartVariant {
  const variantIndex = argv.indexOf("--variant");
  const variantValue = variantIndex === -1 ? undefined : argv[variantIndex + 1];
  const inlineVariant = argv
    .find((arg) => arg.startsWith("--variant="))
    ?.slice("--variant=".length);

  if (argv.includes("--aws")) {
    return "aws";
  }

  const requestedVariant = inlineVariant ?? variantValue;
  if (requestedVariant === undefined || requestedVariant === "default") {
    return "default";
  }
  if (requestedVariant === "aws") {
    return requestedVariant;
  }

  throw new Error(`Unknown chart variant "${requestedVariant}". Use "default" or "aws".`);
}

const chartVariant = parseVariant(process.argv.slice(2));

function parseStringArg(argv: string[], name: string): string | undefined {
  const valueIndex = argv.indexOf(name);
  const value = valueIndex === -1 ? undefined : argv[valueIndex + 1];
  const inlineValue = argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  return inlineValue ?? value;
}

function parseNumberArg(argv: string[], name: string): number | undefined {
  const value = parseStringArg(argv, name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name} value "${value}". Use a positive integer.`);
  }
  return parsed;
}

function parseHeaderLayout(argv: string[]): HeaderLayout {
  const requestedHeader = parseStringArg(argv, "--header");
  if (requestedHeader === undefined || requestedHeader === "three-line") {
    return "three-line";
  }
  if (requestedHeader === "two-line") {
    return requestedHeader;
  }

  throw new Error(`Unknown header layout "${requestedHeader}". Use "two-line" or "three-line".`);
}

const headerLayout = parseHeaderLayout(process.argv.slice(2));
const requestedRunId = parseStringArg(process.argv.slice(2), "--run-id");
const requestedShinParallel = parseNumberArg(process.argv.slice(2), "--shin-parallel");
const inputFile = resolve(
  process.cwd(),
  parseStringArg(process.argv.slice(2), "--input-file") ?? "benchmarks/results.jsonl",
);

// ═══ LAYOUT CONSTANTS ═══
const CANVAS_PAD_LEFT = 24;
const CANVAS_PAD_RIGHT = 30;

const HEADER_H = headerLayout === "three-line" ? 72 : 60; // header band height
const SECTION_HDR_H = 22; // section column-header band
const SECTION_HDR_PAD_TOP = 15; // text baseline within section header

const BAR_H = 11; // bar thickness
const BAR_RX = 5.5; // bar corner radius
const BAR_GAP = 6; // gap between shin and aws bar
const BAR_X = 180; // bar left edge
const BAR_W = 320; // max bar width

const ROW_PAD_TOP = 11; // space from separator to shin bar top
const ROW_PAD_BOTTOM = 11; // space from aws bar bottom to next separator
const ROW_H = ROW_PAD_TOP + BAR_H + BAR_GAP + BAR_H + ROW_PAD_BOTTOM; // total row height

const COL_SHIN_X = BAR_X + BAR_W + 20; // shin value column
const COL_AWS_X = COL_SHIN_X + 90; // aws value column
const COL_DELTA_X = COL_AWS_X + 90; // delta badge column
const BADGE_W = 60;
const BADGE_H = 22;
const BADGE_RX = 5;

const CANVAS_W = COL_DELTA_X + BADGE_W + CANVAS_PAD_RIGHT;

// ═══ TYPOGRAPHY CONSTANTS ═══
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SUBTITLE = 12;
const FONT_SIZE_HEADER_LEGEND = 11;
const FONT_SIZE_SECTION_HEADER = 11;
const FONT_SIZE_ROW_LABEL = 13;
const FONT_SIZE_METRIC_VALUE = 12;
const FONT_SIZE_BADGE = 11;

// ═══ COLOR CONSTANTS ═══
const COLOR_SECTION_HEADER_TEXT = "#6f91a8";
const COLOR_ROW_LABEL_TEXT = "#d8edf8";
const COLOR_BADGE_NEUTRAL_FILL = "#12202c";
const COLOR_BADGE_NEUTRAL_TEXT = "#f0f8ff";
const COLOR_BADGE_SHIN_FILL = "#082b35";
const COLOR_BADGE_SHIN_STROKE = "#18d4f8";
const COLOR_BADGE_SHIN_TEXT = "#6ef0d0";
const COLOR_BADGE_AWS_FILL = "#341821";
const COLOR_BADGE_AWS_STROKE = "#ff6a2b";
const COLOR_BADGE_AWS_TEXT = "#ffa033";

interface Row {
  label: string;
  shin: number;
  aws: number;
}

interface ProviderSummary {
  maxParallelTransfers?: number;
}

interface BenchmarkRecord {
  runId?: string;
  implementation?: string | null;
  profile?: string | null;
  memoryMb?: number | null;
  phase?: string;
  fileCount?: number | null;
  totalBytes?: number | null;
  providerDurationSeconds?: number | null;
  maxMemoryMb?: number | null;
  providerSummary?: ProviderSummary;
}

interface BenchmarkData {
  duration: Row[];
  memory: Row[];
  metadata: string;
}

interface DataSelection {
  runRecords: BenchmarkRecord[];
  shinRecords: Map<string, BenchmarkRecord>;
  awsRecords: Map<string, BenchmarkRecord>;
}

const PHASE_ORDER = new Map([
  ["cold-create", 0],
  ["forced-unchanged", 1],
  ["sparse-update", 2],
  ["prune-update", 3],
]);

function readRecords(filePath: string): BenchmarkRecord[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as BenchmarkRecord;
      } catch (cause) {
        throw new Error(`Invalid JSONL record at ${filePath}:${index + 1}`, { cause });
      }
    });
}

function comparablePhases(records: BenchmarkRecord[]): string[] {
  const phases = new Set(
    records.map((record) => record.phase).filter((phase) => phase !== undefined),
  );
  return [...phases]
    .filter((phase) =>
      ["shin", "aws"].every((implementation) =>
        records.some(
          (record) => record.phase === phase && record.implementation === implementation,
        ),
      ),
    )
    .sort((left, right) => (PHASE_ORDER.get(left) ?? 999) - (PHASE_ORDER.get(right) ?? 999));
}

function basePhaseName(phase: string): string {
  return phase.replace(/-parallel-\d+$/, "");
}

function latestComparableRunId(records: BenchmarkRecord[]): string {
  const runIds = [
    ...new Set(records.map((record) => record.runId).filter((runId) => runId !== undefined)),
  ];
  const runId = runIds
    .filter(
      (candidate) =>
        comparablePhases(records.filter((record) => record.runId === candidate)).length > 0,
    )
    .at(-1);
  if (runId === undefined) {
    throw new Error(`No paired Shin/AWS benchmark run found in ${inputFile}`);
  }
  return runId;
}

function requireNumber(value: number | null | undefined, label: string): number {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

function recordsByBasePhase(
  records: BenchmarkRecord[],
  implementation: "shin" | "aws",
): Map<string, BenchmarkRecord> {
  return new Map(
    records
      .filter((record) => record.phase !== undefined && record.implementation === implementation)
      .map((record) => [basePhaseName(record.phase as string), record]),
  );
}

function formatDuration(value: number): number {
  return Number(value.toPrecision(value < 1 ? 2 : 3));
}

function formatBytes(value: number): string {
  const units = ["bytes", "KiB", "MiB", "GiB"];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex++;
  }
  return unitIndex === 0
    ? `${Math.round(amount).toLocaleString("en-US")} ${units[unitIndex]}`
    : `${amount.toFixed(1).replace(/\.0$/, "")} ${units[unitIndex]}`;
}

function selectData(records: BenchmarkRecord[]): DataSelection {
  const runId = requestedRunId ?? latestComparableRunId(records);
  const runRecords = records.filter((record) => record.runId === runId);
  const phases = comparablePhases(runRecords);
  if (phases.length === 0) {
    throw new Error(`Run "${runId}" does not contain paired Shin/AWS benchmark records`);
  }

  const baseShinRecords = recordsByBasePhase(runRecords, "shin");
  const awsRecords = recordsByBasePhase(runRecords, "aws");
  const firstShin = baseShinRecords.values().next().value;
  if (firstShin === undefined) {
    throw new Error(`Run "${runId}" does not contain Shin benchmark records`);
  }

  if (requestedShinParallel === undefined) {
    return {
      runRecords,
      shinRecords: baseShinRecords,
      awsRecords,
    };
  }

  const requestedShinRecords = records
    .filter((record) => record.implementation === "shin")
    .filter((record) => record.profile === firstShin.profile)
    .filter((record) => record.memoryMb === firstShin.memoryMb)
    .filter((record) => record.providerSummary?.maxParallelTransfers === requestedShinParallel);
  if (requestedShinRecords.length === 0) {
    throw new Error(
      `No Shin benchmark records found for profile=${firstShin.profile}, memory=${firstShin.memoryMb}, maxParallelTransfers=${requestedShinParallel}`,
    );
  }
  return {
    runRecords,
    shinRecords: recordsByBasePhase(requestedShinRecords, "shin"),
    awsRecords,
  };
}

function buildBenchmarkData(records: BenchmarkRecord[]): BenchmarkData {
  const selection = selectData(records);
  const phases = [...selection.shinRecords.keys()]
    .filter((phase) => selection.awsRecords.has(phase))
    .sort((left, right) => (PHASE_ORDER.get(left) ?? 999) - (PHASE_ORDER.get(right) ?? 999));
  if (phases.length === 0) {
    const parallelDescription =
      requestedShinParallel === undefined
        ? "the selected Shin rows"
        : `Shin maxParallelTransfers=${requestedShinParallel}`;
    throw new Error(`No paired AWS rows match ${parallelDescription}`);
  }

  const duration = phases.map((phase) => {
    const shin = selection.shinRecords.get(phase);
    const aws = selection.awsRecords.get(phase);
    if (shin === undefined || aws === undefined) {
      throw new Error(`Missing comparable records for ${phase}`);
    }
    return {
      label: phase,
      shin: formatDuration(requireNumber(shin.providerDurationSeconds, `${phase} shin duration`)),
      aws: formatDuration(requireNumber(aws.providerDurationSeconds, `${phase} aws duration`)),
    };
  });
  const memory = phases.map((phase) => {
    const shin = selection.shinRecords.get(phase);
    const aws = selection.awsRecords.get(phase);
    if (shin === undefined || aws === undefined) {
      throw new Error(`Missing comparable records for ${phase}`);
    }
    return {
      label: phase,
      shin: requireNumber(shin.maxMemoryMb, `${phase} shin max memory`),
      aws: requireNumber(aws.maxMemoryMb, `${phase} aws max memory`),
    };
  });

  const shinRows = [...selection.shinRecords.values()];
  const metadataRecord = shinRows[0] ?? selection.runRecords[0];
  const parallelTransfers = shinRows.find(
    (record) => record.providerSummary?.maxParallelTransfers !== undefined,
  )?.providerSummary?.maxParallelTransfers;
  const metadataParts = [
    metadataRecord.profile === null || metadataRecord.profile === undefined
      ? undefined
      : `Profile: ${metadataRecord.profile}`,
    metadataRecord.memoryMb === null || metadataRecord.memoryMb === undefined
      ? undefined
      : `Lambda: ${metadataRecord.memoryMb} MiB`,
    parallelTransfers === undefined ? undefined : `Parallel: ${parallelTransfers}`,
    metadataRecord.fileCount === null ||
    metadataRecord.fileCount === undefined ||
    metadataRecord.totalBytes === null ||
    metadataRecord.totalBytes === undefined
      ? undefined
      : `Assets: ${metadataRecord.fileCount.toLocaleString("en-US")} objects / ${formatBytes(metadataRecord.totalBytes)}`,
  ].filter((part) => part !== undefined);

  return {
    duration,
    memory,
    metadata: metadataParts.join(" · "),
  };
}

const benchmarkData = buildBenchmarkData(readRecords(inputFile));

function simulateAwsWins(rows: Row[]): Row[] {
  return rows.map((row) => ({
    ...row,
    shin: row.aws,
    aws: row.shin,
  }));
}

const chartDuration =
  chartVariant === "aws" ? simulateAwsWins(benchmarkData.duration) : benchmarkData.duration;
const chartMemory =
  chartVariant === "aws" ? simulateAwsWins(benchmarkData.memory) : benchmarkData.memory;
const MAX_DUR = Math.max(...chartDuration.flatMap((row) => [row.shin, row.aws]));
const MAX_MEM = Math.max(...chartMemory.flatMap((row) => [row.shin, row.aws]));
const subtitlePrefix = chartVariant === "aws" ? "AWS win simulation" : "vs AWS BucketDeployment";
const outFilePrefix =
  requestedShinParallel === undefined
    ? "benchmark-snapshot"
    : `parallel-${requestedShinParallel}-snapshot`;
const outFileSuffix = `${chartVariant === "aws" ? "-aws" : ""}${headerLayout === "two-line" ? "-two-line" : ""}`;

const legendSwatchY = headerLayout === "three-line" ? 22 : 12;
const legendLabelY = headerLayout === "three-line" ? 30 : 20;
const legendNoteY = headerLayout === "three-line" ? 52 : 42;
const LEGEND_W = 111;
const legendX = CANVAS_W - CANVAS_PAD_LEFT - LEGEND_W;

// ═══ DERIVED POSITIONS ═══
const sectionATop = HEADER_H;
const sectionARowsTop = sectionATop + SECTION_HDR_H + 1; // +1 for bottom line
const sectionABottom = sectionARowsTop + ROW_H * chartDuration.length - 1;
const dividerY = sectionABottom;
const sectionBTop = dividerY + 1;
const sectionBRowsTop = sectionBTop + SECTION_HDR_H + 1;
const sectionBBottom = sectionBRowsTop + ROW_H * chartMemory.length - 1;
const CANVAS_H = sectionBBottom;

// ═══ HELPERS ═══
function barWidth(val: number, max: number): number {
  return Math.max(4, (val / max) * BAR_W);
}

function formatMultiplier(value: number): string {
  const decimals = value < 2 ? 2 : 1;
  return `${value.toFixed(decimals).replace(/\.?0+$/, "")}×`;
}

function formatBadgeText(row: Row, isMem: boolean): string {
  const winner = Math.min(row.shin, row.aws);
  const loser = Math.max(row.shin, row.aws);
  if (winner === loser) {
    return "tie";
  }
  if (isMem) {
    return `${Math.round(((loser - winner) / loser) * 100)}%`;
  }
  return formatMultiplier(loser / winner);
}

function rowY(sectionRowsTop: number, index: number) {
  const rowTop = sectionRowsTop + index * ROW_H;
  const shinY = rowTop + ROW_PAD_TOP;
  const awsY = shinY + BAR_H + BAR_GAP;
  const textY = shinY + BAR_H + BAR_GAP / 2 + 4; // vertically centered baseline
  const badgeY = textY - 14;
  const sepY = rowTop + ROW_H - 1;
  return { shinY, awsY, textY, badgeY, sepY };
}

function renderRow(
  row: Row,
  index: number,
  sectionRowsTop: number,
  max: number,
  isMem: boolean,
  isLast: boolean,
): string {
  const { shinY, awsY, textY, badgeY, sepY } = rowY(sectionRowsTop, index);
  const sw = barWidth(row.shin, max);
  const aw = barWidth(row.aws, max);
  const shinVal = isMem ? `${row.shin} MiB` : `${row.shin}s`;
  const awsVal = isMem ? `${row.aws} MiB` : `${row.aws}s`;
  const badgeText = formatBadgeText(row, isMem);
  const useGlowShin = sw > 30;

  // Determine winner: lower is better
  const shinWins = row.shin < row.aws;
  const awsWins = row.aws < row.shin;
  const shinValFill = shinWins ? "#6ef0d0" : "#5a7a94";
  const awsValFill = shinWins ? "#5a7a94" : "#ffa033";
  const badgeFill = shinWins
    ? COLOR_BADGE_SHIN_FILL
    : awsWins
      ? COLOR_BADGE_AWS_FILL
      : COLOR_BADGE_NEUTRAL_FILL;
  const badgeStroke = shinWins
    ? ` stroke="${COLOR_BADGE_SHIN_STROKE}" stroke-width="0.5"`
    : awsWins
      ? ` stroke="${COLOR_BADGE_AWS_STROKE}" stroke-width="0.5"`
      : "";
  const badgeTextFill = shinWins
    ? COLOR_BADGE_SHIN_TEXT
    : awsWins
      ? COLOR_BADGE_AWS_TEXT
      : COLOR_BADGE_NEUTRAL_TEXT;

  let s = "";
  // Label
  s += `<text x="${CANVAS_PAD_LEFT}" y="${textY}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_ROW_LABEL}" font-weight="600" fill="${COLOR_ROW_LABEL_TEXT}">${row.label}</text>\n`;
  // Shin bar
  s += `<rect x="${BAR_X}" y="${shinY}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_RX}" fill="#12202c"/>\n`;
  if (useGlowShin)
    s += `<rect x="${BAR_X}" y="${shinY}" width="${sw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#shin)" filter="url(#gS)" opacity="0.5"/>\n`;
  s += `<rect x="${BAR_X}" y="${shinY}" width="${sw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#shin)"/>\n`;
  // AWS bar
  s += `<rect x="${BAR_X}" y="${awsY}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_RX}" fill="#12202c"/>\n`;
  s += `<rect x="${BAR_X}" y="${awsY}" width="${aw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#aws)" filter="url(#gA)" opacity="0.35"/>\n`;
  s += `<rect x="${BAR_X}" y="${awsY}" width="${aw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#aws)" opacity="0.75"/>\n`;
  // Values — winner gets colored
  s += `<text x="${COL_SHIN_X}" y="${textY}" font-family="JetBrains Mono, monospace" font-size="${FONT_SIZE_METRIC_VALUE}" font-weight="700" fill="${shinValFill}">${shinVal}</text>\n`;
  s += `<text x="${COL_AWS_X}" y="${textY}" font-family="JetBrains Mono, monospace" font-size="${FONT_SIZE_METRIC_VALUE}" font-weight="${shinWins ? "400" : "700"}" fill="${awsValFill}">${awsVal}</text>\n`;
  // Badge
  s += `<rect x="${COL_DELTA_X}" y="${badgeY}" width="${BADGE_W}" height="${BADGE_H}" rx="${BADGE_RX}" fill="${badgeFill}"${badgeStroke} filter="url(#badgeShadow)"/>\n`;
  s += `<text x="${COL_DELTA_X + BADGE_W / 2}" y="${badgeY + 15}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="${FONT_SIZE_BADGE}" font-weight="800" fill="${badgeTextFill}">${badgeText}</text>\n`;
  // Separator (skip for last row)
  if (!isLast) {
    s += `<rect x="${CANVAS_PAD_LEFT}" y="${sepY}" width="${CANVAS_W - CANVAS_PAD_LEFT - CANVAS_PAD_RIGHT}" height="1" fill="#142230"/>\n`;
  }
  return s;
}

function renderSectionHeader(y: number, title: string, deltaLabel: string): string {
  let s = "";
  s += `<rect y="${y}" width="${CANVAS_W}" height="${SECTION_HDR_H}" fill="#0c1420"/>\n`;
  s += `<text x="${CANVAS_PAD_LEFT}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="${COLOR_SECTION_HEADER_TEXT}" letter-spacing="0.8">${title}</text>\n`;
  s += `<text x="${COL_SHIN_X}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="${COLOR_SECTION_HEADER_TEXT}" letter-spacing="0.8">SHIN</text>\n`;
  s += `<text x="${COL_AWS_X}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="${COLOR_SECTION_HEADER_TEXT}" letter-spacing="0.8">AWS</text>\n`;
  s += `<text x="${COL_DELTA_X + 10}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="${COLOR_SECTION_HEADER_TEXT}" letter-spacing="0.8">${deltaLabel}</text>\n`;
  s += `<rect x="0" y="${y + SECTION_HDR_H}" width="${CANVAS_W}" height="1" fill="#142230"/>\n`;
  return s;
}

function renderHeader(): string {
  if (headerLayout === "three-line") {
    return `<text x="${CANVAS_PAD_LEFT}" y="23" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_TITLE}" font-weight="800" fill="#f0f8ff" letter-spacing="-0.3">ShinBucketDeployment</text>
<text x="${CANVAS_PAD_LEFT}" y="43" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SUBTITLE}" font-weight="600" fill="${COLOR_SECTION_HEADER_TEXT}">${subtitlePrefix}</text>
<text x="${CANVAS_PAD_LEFT}" y="61" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="500" fill="${COLOR_SECTION_HEADER_TEXT}">${benchmarkData.metadata}</text>`;
  }

  return `<text x="${CANVAS_PAD_LEFT}" y="26" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_TITLE}" font-weight="800" fill="#f0f8ff" letter-spacing="-0.3">ShinBucketDeployment</text>
<text x="${CANVAS_PAD_LEFT}" y="46" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SUBTITLE}" font-weight="500" fill="${COLOR_SECTION_HEADER_TEXT}">${subtitlePrefix} · ${benchmarkData.metadata}</text>`;
}

// ═══ RENDER ═══
function render(): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" role="img" aria-labelledby="title desc">
<title id="title">ShinBucketDeployment vs AWS BucketDeployment benchmark</title>
<desc id="desc">Benchmark comparing handler duration and memory usage. Lower is better.</desc>
<defs>
  <linearGradient id="shin" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0ee89e"/><stop offset="0.5" stop-color="#18d4f8"/><stop offset="1" stop-color="#6ef0d0"/>
  </linearGradient>
  <linearGradient id="aws" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#e8384f"/><stop offset="0.5" stop-color="#ff6a2b"/><stop offset="1" stop-color="#ffa033"/>
  </linearGradient>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0a1018"/><stop offset="1" stop-color="#0e1620"/>
  </linearGradient>
  <filter id="gS" x="-8%" y="-60%" width="116%" height="220%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.06 0 0 0 0 0.85 0 0 0 0 0.7 0 0 0 0.6 0"/>
  </filter>
  <filter id="gA" x="-8%" y="-60%" width="116%" height="220%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.95 0 0 0 0 0.35 0 0 0 0 0.15 0 0 0 0.4 0"/>
  </filter>
  <filter id="badgeShadow" x="-20%" y="-30%" width="140%" height="160%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
  </filter>
</defs>

<!-- Background -->
<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bgGrad)"/>

<!-- Header -->
${renderHeader()}
<rect x="${legendX}" y="${legendSwatchY}" width="12" height="8" rx="2" fill="url(#shin)"/>
<text x="${legendX + 18}" y="${legendLabelY}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="700" fill="#8ab8d0">SHIN</text>
<rect x="${legendX + 70}" y="${legendSwatchY}" width="12" height="8" rx="2" fill="url(#aws)"/>
<text x="${legendX + 88}" y="${legendLabelY}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="700" fill="#8ab8d0">AWS</text>
<text x="${legendX}" y="${legendNoteY}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="500" fill="${COLOR_SECTION_HEADER_TEXT}">▼ lower is better</text>
<rect x="0" y="${HEADER_H - 1}" width="${CANVAS_W}" height="1" fill="#1a2a38"/>

`;

  // Section A: Duration
  svg += renderSectionHeader(sectionATop, "HANDLER DURATION", "FASTER");
  for (let i = 0; i < chartDuration.length; i++) {
    svg += renderRow(
      chartDuration[i],
      i,
      sectionARowsTop,
      MAX_DUR,
      false,
      i === chartDuration.length - 1,
    );
  }

  // Divider
  svg += `<rect x="0" y="${dividerY}" width="${CANVAS_W}" height="1" fill="#1a2a38"/>\n`;

  // Section B: Memory
  svg += renderSectionHeader(sectionBTop, "MAX MEMORY", "SAVED");
  for (let i = 0; i < chartMemory.length; i++) {
    svg += renderRow(
      chartMemory[i],
      i,
      sectionBRowsTop,
      MAX_MEM,
      true,
      i === chartMemory.length - 1,
    );
  }

  svg += `</svg>`;
  return svg;
}

// ═══ OUTPUT ═══
const outFileName = `${outFilePrefix}${outFileSuffix}.svg`;
const outPath = resolve(process.cwd(), "benchmarks", "snapshots", outFileName);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, render());
console.log(`Written: ${outPath}`);
console.log(`Variant: ${chartVariant}`);
console.log(`Header: ${headerLayout}`);
console.log(`Canvas: ${CANVAS_W}×${CANVAS_H}, Row height: ${ROW_H}px, Bar: ${BAR_H}px`);
