import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { parseCliOptions } from "../cli";
import {
  type BenchmarkResultRecord,
  implementationLabel,
  phaseRank,
  readBenchmarkResultRecords,
} from "../model";

type BenchmarkRecord = BenchmarkResultRecord;

type MetricName =
  | "providerDurationSeconds"
  | "billedDurationSeconds"
  | "initDurationSeconds"
  | "localWallSeconds"
  | "cdkDeploySeconds"
  | "maxMemoryMb";

type RenderOptions = {
  readonly inputFile: string;
  readonly outputFile: string;
  readonly chartOutputFile?: string;
  readonly chartReference?: string;
  readonly chartLayout?: ChartLayoutName;
  readonly chartTheme?: ChartThemeName;
  readonly assetProfile?: string;
  readonly memoryMb?: number;
  readonly parallel?: number;
};

type ChartThemeName = "signal" | "forge" | "circuit";
type ChartLayoutName = "split" | "scorecard" | "cards";

type ChartTheme = {
  readonly name: ChartThemeName;
  readonly background: string;
  readonly header: string;
  readonly page: string;
  readonly panel: string;
  readonly panelStroke: string;
  readonly text: string;
  readonly muted: string;
  readonly headerText: string;
  readonly track: string;
  readonly shinStops: readonly [string, string, string];
  readonly awsStops: readonly [string, string, string];
  readonly shinText: string;
  readonly awsText: string;
  readonly chip: string;
  readonly chipText: string;
};

type BenchmarkChartContext = {
  readonly profile: string;
  readonly memory: string;
  readonly fileCount: string;
  readonly totalBytes: string;
  readonly bestDurationSpeedup: string;
  readonly peakMemorySaved: string;
  readonly catalogSkips: string;
};

const METRICS: Array<{ name: MetricName; label: string; unit: string }> = [
  { name: "providerDurationSeconds", label: "Provider duration", unit: "s" },
  { name: "billedDurationSeconds", label: "Billed duration", unit: "s" },
  { name: "initDurationSeconds", label: "Init duration", unit: "s" },
  { name: "localWallSeconds", label: "Local wall time", unit: "s" },
  { name: "cdkDeploySeconds", label: "CDK deploy time", unit: "s" },
  { name: "maxMemoryMb", label: "Max memory", unit: "MiB" },
];

const CLI_OPTIONS = [
  "asset-profile",
  "chart-layout",
  "chart-output-file",
  "chart-reference",
  "chart-theme",
  "input-file",
  "lambda-max-parallel-transfers",
  "lambda-memory-mb",
  "output-file",
] as const;

const CHART_THEMES: Record<ChartThemeName, ChartTheme> = {
  signal: {
    name: "signal",
    background: "#081018",
    header: "#101923",
    page: "#dfe6e9",
    panel: "#f7fafb",
    panelStroke: "#c9d4da",
    text: "#111820",
    muted: "#576875",
    headerText: "#f8fbfd",
    track: "#d9e2e7",
    shinStops: ["#12e29c", "#19c8ff", "#8bffdb"],
    awsStops: ["#f04452", "#ff6b1a", "#ff9f1c"],
    shinText: "#052018",
    awsText: "#351006",
    chip: "#12212d",
    chipText: "#f8fbfd",
  },
  forge: {
    name: "forge",
    background: "#211711",
    header: "#2a1e17",
    page: "#e7e2da",
    panel: "#fbf8f2",
    panelStroke: "#d4c7b7",
    text: "#211711",
    muted: "#67594c",
    headerText: "#fff8ed",
    track: "#ded4c7",
    shinStops: ["#c2410c", "#f97316", "#fbbf24"],
    awsStops: ["#0f766e", "#14b8a6", "#99f6e4"],
    shinText: "#fff8ed",
    awsText: "#062b28",
    chip: "#fff1d6",
    chipText: "#4b2a12",
  },
  circuit: {
    name: "circuit",
    background: "#07080f",
    header: "#111827",
    page: "#111827",
    panel: "#f4f7fb",
    panelStroke: "#263244",
    text: "#101623",
    muted: "#5b6878",
    headerText: "#f8fbff",
    track: "#d7deea",
    shinStops: ["#a3e635", "#22c55e", "#10b981"],
    awsStops: ["#8b5cf6", "#ec4899", "#fb7185"],
    shinText: "#11250a",
    awsText: "#ffffff",
    chip: "#171f2f",
    chipText: "#eaf2ff",
  },
};

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  renderBenchmarkReport(options);
  console.log(`wrote benchmark report to ${options.outputFile}`);
}

export function renderBenchmarkReport(options: RenderOptions): string {
  const records = readBenchmarkResultRecords(options.inputFile)
    .filter((record) => (options.assetProfile ? record.profile === options.assetProfile : true))
    .filter((record) => (options.memoryMb ? record.memoryMb === options.memoryMb : true))
    .filter((record) => (options.parallel ? record.parallel === options.parallel : true));
  const comparisonRows = buildPhaseComparisonRows(
    records.filter((record) => record.phase && record.profile),
  );
  const chartAsset = comparisonRows.length === 0 ? undefined : resolveComparisonChartAsset(options);
  const report = renderReport(records, options, chartAsset?.markdownPath);
  mkdirSync(dirname(options.outputFile), { recursive: true });
  writeFileSync(options.outputFile, report);
  if (chartAsset !== undefined) {
    mkdirSync(dirname(chartAsset.filePath), { recursive: true });
    writeFileSync(
      chartAsset.filePath,
      renderComparisonSvg(records, comparisonRows, {
        layout: options.chartLayout ?? "split",
        theme: CHART_THEMES[options.chartTheme ?? "signal"],
      }),
    );
  }
  return report;
}

function renderReport(
  records: BenchmarkRecord[],
  options: RenderOptions,
  comparisonChartPath: string | undefined,
): string {
  const comparable = records.filter((record) => record.phase && record.profile);
  const title = reportTitle(options);

  return [
    `# Benchmark Report: ${title}`,
    "",
    renderScope(comparable),
    "",
    "## ShinBucketDeployment vs AWS BucketDeployment",
    "",
    renderComparisonSummaryTable(comparable),
    "",
    ...renderPhaseComparisonTables(comparable),
    "",
    "## Visual Summary",
    "",
    ...renderComparisonCharts(comparable, comparisonChartPath),
    "## Metric Tables",
    "",
    ...METRICS.flatMap((metric) => renderMetricSection(comparable, metric)),
    "",
  ].join("\n");
}

function renderScope(records: BenchmarkRecord[]): string {
  if (records.length === 0) {
    return "No benchmark records matched the selected filters.";
  }

  const snapshotDates = unique(records.map((record) => record.snapshotDate));
  const implementations = unique(records.map((record) => implementationLabel(record)));
  const assetProfiles = unique(records.map((record) => record.profile));
  const memoryValues = unique(records.map((record) => record.memoryMb));
  const parallelValues = unique(records.map((record) => record.parallel));
  const phases = unique(records.map((record) => record.phase));

  return [
    "## Scope",
    "",
    `- Snapshot date: ${snapshotDates.join(", ")}`,
    `- Implementations: ${implementations.join(", ")}`,
    `- Asset profiles: ${assetProfiles.join(", ")}`,
    `- Memory MiB: ${memoryValues.join(", ")}`,
    `- Parallel transfers: ${parallelValues.join(", ")}`,
    `- Phases: ${phases.join(", ")}`,
  ].join("\n");
}

function reportTitle(options: RenderOptions): string {
  const filters = [
    options.assetProfile,
    options.memoryMb === undefined ? undefined : `${options.memoryMb} MiB`,
    options.parallel === undefined ? undefined : `parallel ${options.parallel}`,
  ].filter((value) => value !== undefined);
  return filters.length === 0 ? "benchmark results" : filters.join(" / ");
}

function renderMetricSection(
  records: BenchmarkRecord[],
  metric: { name: MetricName; label: string; unit: string },
): string[] {
  const rows = aggregateRows(records, metric.name);
  if (rows.length === 0) {
    return [];
  }

  return [
    `### ${metric.label}`,
    "",
    renderMetricTable(rows, metric.unit),
    "",
    renderBarChart(rows, metric.unit),
    "",
  ];
}

function renderMetricTable(rows: AggregatedRow[], unit: string): string {
  return [
    `| Asset profile | Phase | Memory MiB | Parallel | Implementation | n | median (${unit}) | p90 (${unit}) | min (${unit}) | max (${unit}) |`,
    "| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${row.parallel ?? ""} | ${row.implementation} | ${row.count} | ${formatNumber(row.median)} | ${formatNumber(row.p90)} | ${formatNumber(row.min)} | ${formatNumber(row.max)} |`,
    ),
  ].join("\n");
}

function renderBarChart(rows: AggregatedRow[], unit: string): string {
  const max = Math.max(...rows.map((row) => row.median), 0);
  const lines = rows.map((row) => {
    const width = max === 0 ? 0 : Math.max(1, Math.round((row.median / max) * 30));
    const bar = "#".repeat(width);
    const label = `${row.profile} ${row.phase} ${row.memoryMb ?? ""}/${row.parallel ?? ""} ${row.implementation}`;
    return `${label.padEnd(48)} | ${bar} ${formatNumber(row.median)} ${unit}`;
  });

  return ["```text", ...lines, "```"].join("\n");
}

function renderComparisonSummaryTable(records: BenchmarkRecord[]): string {
  const rows = buildPhaseComparisonRows(records);
  if (rows.length === 0) {
    return "No shin/aws pairs were available for comparison.";
  }

  return [
    "| Asset profile | Phase | Memory MiB | Parallel | Provider duration | Local wall time | CDK deploy time | Max memory |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => {
      return `| ${row.profile} | ${row.phase} | ${row.memoryMb ?? ""} | ${row.parallel ?? ""} | ${formatOptionalComparisonCell(row.metrics.providerDurationSeconds)} | ${formatOptionalComparisonCell(row.metrics.localWallSeconds)} | ${formatOptionalComparisonCell(row.metrics.cdkDeploySeconds)} | ${formatOptionalMemoryCell(row.metrics.maxMemoryMb)} |`;
    }),
  ].join("\n");
}

function renderPhaseComparisonTables(records: BenchmarkRecord[]): string[] {
  const rows = buildPhaseComparisonRows(records);
  if (rows.length === 0) {
    return [];
  }

  return rows.flatMap((phaseRow) => [
    `### ${phaseTitle(phaseRow)}`,
    "",
    renderPhaseComparisonTable(phaseRow),
    "",
  ]);
}

function renderPhaseComparisonTable(phaseRow: PhaseComparisonRow): string {
  const rows = METRICS.map((metric) => phaseRow.metrics[metric.name]).filter(
    (row) => row !== undefined,
  );
  return [
    "| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.metricLabel} | ${formatValue(row.shin, row.unit)} | ${formatValue(row.aws, row.unit)} | ${formatSignedValue(row.diff, row.unit)} | ${formatRatio(row.ratio)} | ${formatSignedPercent(row.percentDelta)} |`,
    ),
  ].join("\n");
}

function renderComparisonCharts(
  records: BenchmarkRecord[],
  chartPath: string | undefined,
): string[] {
  const rows = buildPhaseComparisonRows(records);
  if (rows.length === 0) {
    return ["No shin/aws pairs were available for visual summaries.", ""];
  }

  if (chartPath !== undefined) {
    return [
      "Lower is better for both Lambda handler duration and max memory. The SVG chart uses the same paired medians as the tables above.",
      "",
      `![ShinBucketDeployment vs AWS BucketDeployment Lambda handler duration and max memory](${chartPath})`,
      "",
    ];
  }

  return [
    "### Provider Duration Saved By ShinBucketDeployment",
    "",
    renderDeltaChart(rows, "providerDurationSeconds", "faster", "slower"),
    "",
    "### Local Wall Time Saved By ShinBucketDeployment",
    "",
    renderDeltaChart(rows, "localWallSeconds", "faster", "slower"),
    "",
    "### CDK Deploy Time Saved By ShinBucketDeployment",
    "",
    renderDeltaChart(rows, "cdkDeploySeconds", "faster", "slower"),
    "",
    "### Max Memory Saved By ShinBucketDeployment",
    "",
    renderDeltaChart(rows, "maxMemoryMb", "lower", "higher"),
    "",
  ];
}

function resolveComparisonChartAsset(options: RenderOptions): {
  filePath: string;
  markdownPath: string;
} {
  const filePath =
    options.chartOutputFile ??
    join(
      dirname(options.outputFile),
      `${basename(options.outputFile, extname(options.outputFile))}-assets`,
      "shin-vs-aws-duration-memory.svg",
    );
  return {
    filePath,
    markdownPath:
      options.chartReference ??
      normalizeMarkdownPath(relative(dirname(options.outputFile), filePath)),
  };
}

function renderComparisonSvg(
  records: BenchmarkRecord[],
  rows: PhaseComparisonRow[],
  options: { readonly layout: ChartLayoutName; readonly theme: ChartTheme },
): string {
  const context = buildBenchmarkChartContext(records, rows);
  if (options.layout === "cards") {
    return renderCardsComparisonSvg(rows, options.theme, context);
  }
  if (options.layout === "scorecard") {
    return renderScorecardComparisonSvg(rows, options.theme, context);
  }
  return renderSplitComparisonSvg(rows, options.theme, context);
}

function renderSplitComparisonSvg(
  rows: PhaseComparisonRow[],
  theme: ChartTheme,
  context: BenchmarkChartContext,
): string {
  const chartRows = rows.filter(
    (row) =>
      row.metrics.providerDurationSeconds !== undefined && row.metrics.maxMemoryMb !== undefined,
  );
  const renderedRows = chartRows.length === 0 ? rows : chartRows;
  const width = 1180;
  const headerHeight = 176;
  const margin = 28;
  const gap = 24;
  const panelWidth = (width - margin * 2 - gap) / 2;
  const rowHeight = 62;
  const panelTop = headerHeight + 22;
  const panelHeight = 84 + renderedRows.length * rowHeight;
  const height = panelTop + panelHeight + 20;
  const benchmarkLabel = svgBenchmarkLabel(renderedRows);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '<title id="title">ShinBucketDeployment vs AWS BucketDeployment benchmark comparison</title>',
    '<desc id="desc">Gaming hardware style benchmark chart comparing Lambda handler duration and max memory usage. Lower values are better.</desc>',
    "<defs>",
    `<linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${theme.background}"/><stop offset="1" stop-color="${theme.header}"/></linearGradient>`,
    `<linearGradient id="shin" x1="0" x2="1"><stop offset="0" stop-color="${theme.shinStops[0]}"/><stop offset="0.55" stop-color="${theme.shinStops[1]}"/><stop offset="1" stop-color="${theme.shinStops[2]}"/></linearGradient>`,
    `<linearGradient id="aws" x1="0" x2="1"><stop offset="0" stop-color="${theme.awsStops[0]}"/><stop offset="0.55" stop-color="${theme.awsStops[1]}"/><stop offset="1" stop-color="${theme.awsStops[2]}"/></linearGradient>`,
    '<filter id="shadow" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity="0.35"/></filter>',
    '<filter id="textShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00111f" flood-opacity="0.85"/></filter>',
    "</defs>",
    `<rect width="${width}" height="${height}" fill="${theme.page}"/>`,
    `<rect width="${width}" height="${headerHeight}" fill="url(#bg)"/>`,
    `<g filter="url(#textShadow)" fill="${theme.headerText}">`,
    '<text x="32" y="55" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="38" font-weight="700">ShinBucketDeployment</text>',
    `<text x="32" y="92" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="22" font-weight="600">vs AWS BucketDeployment - ${escapeXml(benchmarkLabel)}</text>`,
    '<text x="32" y="122" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="16" opacity="0.9">Lower bars are better; medians from benchmark result rows.</text>',
    "</g>",
    renderHeaderStats(674, 28, context, theme),
    renderLegend(674, 132, theme),
    `<rect x="${margin}" y="${panelTop}" width="${panelWidth}" height="${panelHeight}" rx="8" fill="${theme.panel}" stroke="${theme.panelStroke}" filter="url(#shadow)"/>`,
    `<rect x="${margin + panelWidth + gap}" y="${panelTop}" width="${panelWidth}" height="${panelHeight}" rx="8" fill="${theme.panel}" stroke="${theme.panelStroke}" filter="url(#shadow)"/>`,
    renderMetricPanel({
      rows: renderedRows,
      metricName: "providerDurationSeconds",
      x: margin,
      y: panelTop,
      width: panelWidth,
      title: "Lambda Handler Duration",
      unit: "s",
      theme,
    }),
    renderMetricPanel({
      rows: renderedRows,
      metricName: "maxMemoryMb",
      x: margin + panelWidth + gap,
      y: panelTop,
      width: panelWidth,
      title: "Max Memory Used",
      unit: "MiB",
      theme,
    }),
    "</svg>",
    "",
  ].join("\n");
}

function renderScorecardComparisonSvg(
  rows: PhaseComparisonRow[],
  theme: ChartTheme,
  context: BenchmarkChartContext,
): string {
  const chartRows = rows.filter(
    (row) =>
      row.metrics.providerDurationSeconds !== undefined && row.metrics.maxMemoryMb !== undefined,
  );
  const renderedRows = chartRows.length === 0 ? rows : chartRows;
  const width = 1180;
  const headerHeight = 176;
  const margin = 28;
  const rowHeight = 82;
  const rowTop = headerHeight + 24;
  const height = rowTop + renderedRows.length * rowHeight + 32;
  const durationRows = renderedRows
    .map((row) => row.metrics.providerDurationSeconds)
    .filter((row) => row !== undefined);
  const memoryRows = renderedRows
    .map((row) => row.metrics.maxMemoryMb)
    .filter((row) => row !== undefined);
  const maxDuration = Math.max(...durationRows.flatMap((row) => [row.shin, row.aws]), 1);
  const maxMemory = Math.max(...memoryRows.flatMap((row) => [row.shin, row.aws]), 1);
  const benchmarkLabel = svgBenchmarkLabel(renderedRows);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '<title id="title">ShinBucketDeployment vs AWS BucketDeployment scorecard benchmark comparison</title>',
    '<desc id="desc">Scorecard benchmark chart comparing Lambda handler duration and max memory usage by phase. Lower values are better.</desc>',
    "<defs>",
    `<linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${theme.background}"/><stop offset="1" stop-color="${theme.header}"/></linearGradient>`,
    `<linearGradient id="shin" x1="0" x2="1"><stop offset="0" stop-color="${theme.shinStops[0]}"/><stop offset="0.55" stop-color="${theme.shinStops[1]}"/><stop offset="1" stop-color="${theme.shinStops[2]}"/></linearGradient>`,
    `<linearGradient id="aws" x1="0" x2="1"><stop offset="0" stop-color="${theme.awsStops[0]}"/><stop offset="0.55" stop-color="${theme.awsStops[1]}"/><stop offset="1" stop-color="${theme.awsStops[2]}"/></linearGradient>`,
    '<filter id="shadow" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity="0.28"/></filter>',
    '<filter id="textShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00111f" flood-opacity="0.85"/></filter>',
    "</defs>",
    `<rect width="${width}" height="${height}" fill="${theme.page}"/>`,
    `<rect width="${width}" height="${headerHeight}" fill="url(#bg)"/>`,
    `<g filter="url(#textShadow)" fill="${theme.headerText}">`,
    '<text x="32" y="55" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="38" font-weight="700">ShinBucketDeployment</text>',
    `<text x="32" y="92" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="22" font-weight="600">phase scorecard vs AWS - ${escapeXml(benchmarkLabel)}</text>`,
    `<text x="32" y="122" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="16" opacity="0.9">${escapeXml(context.fileCount)} files, ${escapeXml(context.totalBytes)} source bundle, ${escapeXml(context.catalogSkips)} catalog skips.</text>`,
    "</g>",
    renderHeaderStats(674, 28, context, theme),
    renderLegend(674, 132, theme),
    ...renderedRows.map((row, index) =>
      renderScorecardRow({
        row,
        x: margin,
        y: rowTop + index * rowHeight,
        width: width - margin * 2,
        maxDuration,
        maxMemory,
        theme,
      }),
    ),
    "</svg>",
    "",
  ].join("\n");
}

function renderCardsComparisonSvg(
  rows: PhaseComparisonRow[],
  theme: ChartTheme,
  context: BenchmarkChartContext,
): string {
  const chartRows = rows.filter(
    (row) =>
      row.metrics.providerDurationSeconds !== undefined && row.metrics.maxMemoryMb !== undefined,
  );
  const renderedRows = chartRows.length === 0 ? rows : chartRows;
  const width = 1180;
  const headerHeight = 176;
  const margin = 28;
  const gap = 24;
  const cardWidth = (width - margin * 2 - gap) / 2;
  const cardHeight = 172;
  const cardTop = headerHeight + 24;
  const rowCount = Math.ceil(renderedRows.length / 2);
  const height = cardTop + rowCount * cardHeight + (rowCount - 1) * gap + 30;
  const durationRows = renderedRows
    .map((row) => row.metrics.providerDurationSeconds)
    .filter((row) => row !== undefined);
  const memoryRows = renderedRows
    .map((row) => row.metrics.maxMemoryMb)
    .filter((row) => row !== undefined);
  const maxDuration = Math.max(...durationRows.flatMap((row) => [row.shin, row.aws]), 1);
  const maxMemory = Math.max(...memoryRows.flatMap((row) => [row.shin, row.aws]), 1);
  const benchmarkLabel = svgBenchmarkLabel(renderedRows);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    '<title id="title">ShinBucketDeployment vs AWS BucketDeployment phase cards benchmark comparison</title>',
    '<desc id="desc">Phase card benchmark chart comparing Lambda handler duration and max memory usage. Lower values are better.</desc>',
    "<defs>",
    `<linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${theme.background}"/><stop offset="1" stop-color="${theme.header}"/></linearGradient>`,
    `<linearGradient id="shin" x1="0" x2="1"><stop offset="0" stop-color="${theme.shinStops[0]}"/><stop offset="0.55" stop-color="${theme.shinStops[1]}"/><stop offset="1" stop-color="${theme.shinStops[2]}"/></linearGradient>`,
    `<linearGradient id="aws" x1="0" x2="1"><stop offset="0" stop-color="${theme.awsStops[0]}"/><stop offset="0.55" stop-color="${theme.awsStops[1]}"/><stop offset="1" stop-color="${theme.awsStops[2]}"/></linearGradient>`,
    '<filter id="shadow" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity="0.28"/></filter>',
    '<filter id="textShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00111f" flood-opacity="0.85"/></filter>',
    "</defs>",
    `<rect width="${width}" height="${height}" fill="${theme.page}"/>`,
    `<rect width="${width}" height="${headerHeight}" fill="url(#bg)"/>`,
    `<g filter="url(#textShadow)" fill="${theme.headerText}">`,
    '<text x="32" y="55" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="38" font-weight="700">ShinBucketDeployment</text>',
    `<text x="32" y="92" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="22" font-weight="600">phase cards vs AWS - ${escapeXml(benchmarkLabel)}</text>`,
    '<text x="32" y="122" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="16" opacity="0.9">Lower bars are better; duration and memory are grouped by deployment phase.</text>',
    "</g>",
    renderHeaderStats(674, 28, context, theme),
    renderLegend(674, 132, theme),
    ...renderedRows.map((row, index) =>
      renderPhaseCard({
        row,
        x: margin + (index % 2) * (cardWidth + gap),
        y: cardTop + Math.floor(index / 2) * (cardHeight + gap),
        width: cardWidth,
        height: cardHeight,
        maxDuration,
        maxMemory,
        theme,
      }),
    ),
    "</svg>",
    "",
  ].join("\n");
}

function renderPhaseCard(options: {
  readonly row: PhaseComparisonRow;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly maxDuration: number;
  readonly maxMemory: number;
  readonly theme: ChartTheme;
}): string {
  const duration = options.row.metrics.providerDurationSeconds;
  const memory = options.row.metrics.maxMemoryMb;
  const speedup = duration === undefined ? "n/a" : formatChartShinAdvantage(duration.ratio);
  const memorySaved =
    memory === undefined ? "n/a" : `${formatNumber(Math.max(0, memory.diff))} MiB saved`;
  return [
    `<rect x="${options.x}" y="${options.y}" width="${options.width}" height="${options.height}" rx="8" fill="${options.theme.panel}" stroke="${options.theme.panelStroke}" filter="url(#shadow)"/>`,
    `<text x="${options.x + 22}" y="${options.y + 36}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="${options.theme.text}">${escapeXml(options.row.phase)}</text>`,
    `<text x="${options.x + 22}" y="${options.y + 58}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="12" font-weight="900" fill="${options.theme.muted}">${options.row.memoryMb ?? ""} MiB provider</text>`,
    `<rect x="${options.x + options.width - 174}" y="${options.y + 18}" width="150" height="34" rx="6" fill="${options.theme.chip}"/>`,
    `<text x="${options.x + options.width - 99}" y="${options.y + 40}" text-anchor="middle" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="14" font-weight="900" fill="${options.theme.chipText}">${escapeXml(speedup)}</text>`,
    `<text x="${options.x + options.width - 99}" y="${options.y + 70}" text-anchor="middle" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="12" font-weight="900" fill="${options.theme.muted}">${escapeXml(memorySaved)}</text>`,
    duration === undefined
      ? ""
      : renderMiniMetric({
          row: duration,
          x: options.x + 22,
          y: options.y + 88,
          width: 230,
          maxValue: options.maxDuration,
          title: "handler duration",
          unit: "s",
          theme: options.theme,
        }),
    memory === undefined
      ? ""
      : renderMiniMetric({
          row: memory,
          x: options.x + 292,
          y: options.y + 88,
          width: 210,
          maxValue: options.maxMemory,
          title: "max memory",
          unit: "MiB",
          theme: options.theme,
        }),
  ].join("\n");
}

function renderScorecardRow(options: {
  readonly row: PhaseComparisonRow;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly maxDuration: number;
  readonly maxMemory: number;
  readonly theme: ChartTheme;
}): string {
  const duration = options.row.metrics.providerDurationSeconds;
  const memory = options.row.metrics.maxMemoryMb;
  const speedup = duration === undefined ? "" : formatChartShinAdvantage(duration.ratio);
  return [
    `<rect x="${options.x}" y="${options.y}" width="${options.width}" height="68" rx="8" fill="${options.theme.panel}" stroke="${options.theme.panelStroke}" filter="url(#shadow)"/>`,
    `<text x="${options.x + 22}" y="${options.y + 30}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="18" font-weight="900" fill="${options.theme.text}">${escapeXml(options.row.phase)}</text>`,
    `<text x="${options.x + 22}" y="${options.y + 50}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="12" font-weight="800" fill="${options.theme.muted}">${options.row.memoryMb ?? ""} MiB provider</text>`,
    duration === undefined
      ? ""
      : renderMiniMetric({
          row: duration,
          x: options.x + 218,
          y: options.y + 14,
          width: 310,
          maxValue: options.maxDuration,
          title: "handler duration",
          unit: "s",
          theme: options.theme,
        }),
    memory === undefined
      ? ""
      : renderMiniMetric({
          row: memory,
          x: options.x + 578,
          y: options.y + 14,
          width: 270,
          maxValue: options.maxMemory,
          title: "max memory",
          unit: "MiB",
          theme: options.theme,
        }),
    `<rect x="${options.x + 892}" y="${options.y + 16}" width="210" height="36" rx="6" fill="${options.theme.chip}"/>`,
    `<text x="${options.x + 997}" y="${options.y + 39}" text-anchor="middle" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="16" font-weight="900" fill="${options.theme.chipText}">${escapeXml(speedup)}</text>`,
  ].join("\n");
}

function renderMiniMetric(options: {
  readonly row: MetricComparisonRow;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly maxValue: number;
  readonly title: string;
  readonly unit: string;
  readonly theme: ChartTheme;
}): string {
  const labelWidth = 70;
  const barX = options.x + labelWidth;
  const barWidth = options.width - labelWidth;
  const shinWidth = Math.max(2, (options.row.shin / options.maxValue) * barWidth);
  const awsWidth = Math.max(2, (options.row.aws / options.maxValue) * barWidth);
  return [
    `<text x="${options.x}" y="${options.y + 9}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="11" font-weight="900" fill="${options.theme.muted}">${escapeXml(options.title)}</text>`,
    `<text x="${options.x}" y="${options.y + 28}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="10" font-weight="900" fill="${options.theme.text}">SHIN</text>`,
    `<rect x="${barX}" y="${options.y + 17}" width="${barWidth}" height="12" rx="3" fill="${options.theme.track}"/>`,
    `<rect x="${barX}" y="${options.y + 17}" width="${formatSvgNumber(shinWidth)}" height="12" rx="3" fill="url(#shin)"/>`,
    `<text x="${barX + barWidth + 8}" y="${options.y + 28}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="10" font-weight="900" fill="${options.theme.text}">${escapeXml(formatValue(options.row.shin, options.unit))}</text>`,
    `<text x="${options.x}" y="${options.y + 47}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="10" font-weight="900" fill="${options.theme.text}">AWS</text>`,
    `<rect x="${barX}" y="${options.y + 36}" width="${barWidth}" height="12" rx="3" fill="${options.theme.track}"/>`,
    `<rect x="${barX}" y="${options.y + 36}" width="${formatSvgNumber(awsWidth)}" height="12" rx="3" fill="url(#aws)"/>`,
    `<text x="${barX + barWidth + 8}" y="${options.y + 47}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="10" font-weight="900" fill="${options.theme.text}">${escapeXml(formatValue(options.row.aws, options.unit))}</text>`,
  ].join("\n");
}

function renderMetricPanel(options: {
  readonly rows: PhaseComparisonRow[];
  readonly metricName: "providerDurationSeconds" | "maxMemoryMb";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly title: string;
  readonly unit: string;
  readonly theme: ChartTheme;
}): string {
  const metricRows = options.rows
    .map((row) => row.metrics[options.metricName])
    .filter((row) => row !== undefined);
  const maxValue = Math.max(...metricRows.flatMap((row) => [row.shin, row.aws]), 1);
  const labelWidth = 178;
  const valueWidth = 92;
  const barX = options.x + labelWidth + 26;
  const barWidth = options.width - labelWidth - valueWidth - 58;
  const rowTop = options.y + 64;

  return [
    `<text x="${options.x + 22}" y="${options.y + 34}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="${options.theme.text}">${escapeXml(options.title)}</text>`,
    ...metricRows.map((row, index) =>
      renderMetricRow({
        row,
        x: options.x,
        y: rowTop + index * 62,
        labelWidth,
        barX,
        barWidth,
        maxValue,
        unit: options.unit,
        metricName: options.metricName,
        theme: options.theme,
      }),
    ),
  ].join("\n");
}

function renderMetricRow(options: {
  readonly row: MetricComparisonRow;
  readonly x: number;
  readonly y: number;
  readonly labelWidth: number;
  readonly barX: number;
  readonly barWidth: number;
  readonly maxValue: number;
  readonly unit: string;
  readonly metricName: MetricName;
  readonly theme: ChartTheme;
}): string {
  const shinWidth = Math.max(2, (options.row.shin / options.maxValue) * options.barWidth);
  const awsWidth = Math.max(2, (options.row.aws / options.maxValue) * options.barWidth);
  const shinValue = formatValue(options.row.shin, options.unit);
  const awsValue = formatValue(options.row.aws, options.unit);
  const shinTextInside = shinWidth >= 74;
  const awsTextInside = awsWidth >= 74;
  const chip =
    options.metricName === "maxMemoryMb"
      ? formatChartMemoryAdvantage(options.row)
      : formatChartShinAdvantage(options.row.ratio);
  return [
    `<text x="${options.x + 22}" y="${options.y + 21}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="${options.theme.text}">${escapeXml(options.row.phase)}</text>`,
    `<rect x="${options.barX}" y="${options.y + 2}" width="${options.barWidth}" height="17" rx="3" fill="${options.theme.track}"/>`,
    `<rect x="${options.barX}" y="${options.y + 2}" width="${formatSvgNumber(shinWidth)}" height="17" rx="3" fill="url(#shin)"/>`,
    `<text x="${formatSvgNumber(options.barX + shinWidth + (shinTextInside ? -8 : 6))}" y="${options.y + 15}" text-anchor="${shinTextInside ? "end" : "start"}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="12" font-weight="800" fill="${shinTextInside ? options.theme.shinText : options.theme.text}">${escapeXml(shinValue)}</text>`,
    `<rect x="${options.barX}" y="${options.y + 28}" width="${options.barWidth}" height="17" rx="3" fill="${options.theme.track}"/>`,
    `<rect x="${options.barX}" y="${options.y + 28}" width="${formatSvgNumber(awsWidth)}" height="17" rx="3" fill="url(#aws)"/>`,
    `<text x="${formatSvgNumber(options.barX + awsWidth + (awsTextInside ? -8 : 6))}" y="${options.y + 41}" text-anchor="${awsTextInside ? "end" : "start"}" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="12" font-weight="800" fill="${awsTextInside ? options.theme.awsText : options.theme.text}">${escapeXml(awsValue)}</text>`,
    `<rect x="${options.x + options.labelWidth + options.barWidth + 36}" y="${options.y + 6}" width="88" height="28" rx="4" fill="${options.theme.chip}"/>`,
    `<text x="${options.x + options.labelWidth + options.barWidth + 80}" y="${options.y + 24}" text-anchor="middle" font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="9" font-weight="800" fill="${options.theme.chipText}">${escapeXml(chip)}</text>`,
  ].join("\n");
}

function renderLegend(x: number, y: number, theme: ChartTheme): string {
  return [
    `<g font-family="Liberation Sans, Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="${theme.headerText}">`,
    `<rect x="${x - 14}" y="${y - 24}" width="356" height="38" rx="6" fill="${theme.background}" opacity="0.6"/>`,
    `<rect x="${x}" y="${y - 14}" width="16" height="10" rx="2" fill="url(#shin)"/><text x="${x + 24}" y="${y - 5}">ShinBucketDeployment</text>`,
    `<rect x="${x + 190}" y="${y - 14}" width="16" height="10" rx="2" fill="url(#aws)"/><text x="${x + 214}" y="${y - 5}">AWS BucketDeployment</text>`,
    "</g>",
  ].join("\n");
}

function renderHeaderStats(
  x: number,
  y: number,
  context: BenchmarkChartContext,
  theme: ChartTheme,
): string {
  const stats = [
    ["Asset profile", context.profile],
    ["Objects", context.fileCount],
    ["Bundle", context.totalBytes],
    ["Best", context.bestDurationSpeedup],
    ["Memory saved", context.peakMemorySaved],
  ];
  return [
    `<g transform="translate(${x} ${y})" font-family="Liberation Sans, Arial, Helvetica, sans-serif">`,
    ...stats.map((stat, index) => {
      const statX = (index % 3) * 152;
      const statY = Math.floor(index / 3) * 34;
      return [
        `<rect x="${statX}" y="${statY}" width="138" height="26" rx="5" fill="${theme.background}" opacity="0.64"/>`,
        `<text x="${statX + 9}" y="${statY + 11}" font-size="8" font-weight="900" fill="${theme.headerText}" opacity="0.68">${escapeXml(stat[0])}</text>`,
        `<text x="${statX + 9}" y="${statY + 22}" font-size="11" font-weight="900" fill="${theme.headerText}">${escapeXml(stat[1])}</text>`,
      ].join("\n");
    }),
    "</g>",
  ].join("\n");
}

function renderDeltaChart(
  rows: PhaseComparisonRow[],
  metric: MetricName,
  positiveLabel: string,
  negativeLabel: string,
): string {
  const metricRows = rows.map((row) => row.metrics[metric]).filter((row) => row !== undefined);
  const max = Math.max(...metricRows.map((row) => Math.abs(row.diff)), 0);
  const lines = metricRows.map((row) => {
    const width = max === 0 ? 0 : Math.max(1, Math.round((Math.abs(row.diff) / max) * 30));
    const symbol = row.diff >= 0 ? "#" : "<";
    const direction = row.diff >= 0 ? positiveLabel : negativeLabel;
    const label = `${row.phase}${row.memoryMb === null ? "" : ` ${row.memoryMb}`}${row.parallel === null ? "" : `/${row.parallel}`}`;
    return `${label.padEnd(26)} | ${symbol.repeat(width).padEnd(30)} ${formatValue(Math.abs(row.diff), row.unit)} ${direction} (${formatRatio(row.ratio)} AWS/Shin)`;
  });

  return ["```text", ...lines, "```"].join("\n");
}

function buildMetricComparisonRows(records: BenchmarkRecord[]): MetricComparisonRow[] {
  return METRICS.flatMap((metric, metricIndex) => {
    return metricPairs(records, metric.name).map((pair) => ({
      profile: pair.profile,
      phase: pair.phase,
      memoryMb: pair.memoryMb,
      parallel: pair.parallel,
      metricName: metric.name,
      metricLabel: metric.label,
      metricIndex,
      unit: metric.unit,
      shin: pair.shin,
      aws: pair.aws,
      diff: pair.aws - pair.shin,
      ratio: pair.ratio,
      percentDelta: ((pair.aws - pair.shin) / pair.shin) * 100,
    }));
  }).sort(compareMetricComparisonRows);
}

function buildPhaseComparisonRows(records: BenchmarkRecord[]): PhaseComparisonRow[] {
  const rows = new Map<string, PhaseComparisonRow>();
  for (const metricRow of buildMetricComparisonRows(records)) {
    const key = comparisonKey(metricRow);
    const row = rows.get(key) ?? {
      profile: metricRow.profile,
      phase: metricRow.phase,
      memoryMb: metricRow.memoryMb,
      parallel: metricRow.parallel,
      metrics: {},
    };
    row.metrics[metricRow.metricName] = metricRow;
    rows.set(key, row);
  }
  return [...rows.values()].sort(comparePhaseGroups);
}

function phaseTitle(row: PhaseComparisonRow): string {
  const memory = row.memoryMb === null ? "" : ` at ${row.memoryMb} MiB`;
  const parallel = row.parallel === null ? "" : ` / parallel ${row.parallel}`;
  return `${row.profile} ${row.phase}${memory}${parallel}`;
}

function svgBenchmarkLabel(rows: PhaseComparisonRow[]): string {
  const memoryValues = unique(rows.map((row) => row.memoryMb));
  const parallelValues = unique(rows.map((row) => row.parallel));
  if (memoryValues.length === 0) {
    return "Lambda benchmark";
  }
  const parallel = parallelValues.length === 0 ? "" : `, parallel ${parallelValues.join("/")}`;
  return `${memoryValues.join("/")} MiB${parallel} Lambda benchmark`;
}

function buildBenchmarkChartContext(
  records: BenchmarkRecord[],
  rows: PhaseComparisonRow[],
): BenchmarkChartContext {
  const comparableRecords = records.filter((record) => record.phase && record.profile);
  const baseline =
    comparableRecords.find(
      (record) =>
        implementationLabel(record).startsWith("shin") &&
        record.phase === "cold-create" &&
        record.state === "baseline",
    ) ??
    comparableRecords.find((record) => record.fileCount !== null && record.totalBytes !== null);
  const durationRows = rows
    .map((row) => row.metrics.providerDurationSeconds)
    .filter((row) => row !== undefined);
  const memoryRows = rows.map((row) => row.metrics.maxMemoryMb).filter((row) => row !== undefined);
  const bestDuration = maxBy(durationRows, (row) => row.ratio);
  const peakMemory = maxBy(memoryRows, (row) => row.diff);
  const catalogSkips = Math.max(
    ...records.map((record) => providerSummaryCount(record, "catalogSkips")),
    0,
  );

  return {
    profile: unique(comparableRecords.map((record) => record.profile)).join("/") || "unknown",
    memory: svgBenchmarkLabel(rows).replace(" Lambda benchmark", ""),
    fileCount: formatOptionalInteger(baseline?.fileCount),
    totalBytes: formatOptionalBytes(baseline?.totalBytes),
    bestDurationSpeedup:
      bestDuration === undefined ? "n/a" : `${formatChartRatio(bestDuration.ratio)} faster`,
    peakMemorySaved:
      peakMemory === undefined ? "n/a" : `${formatNumber(Math.max(0, peakMemory.diff))} MiB`,
    catalogSkips: catalogSkips === 0 ? "n/a" : formatInteger(catalogSkips),
  };
}

function maxBy<T>(values: T[], select: (value: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const selected = select(value);
    if (selected > bestValue) {
      best = value;
      bestValue = selected;
    }
  }
  return best;
}

function providerSummaryCount(record: BenchmarkRecord, name: string): number {
  if (!record.providerSummary || typeof record.providerSummary !== "object") {
    return 0;
  }
  const counts = (record.providerSummary as { counts?: Record<string, unknown> }).counts;
  const value = counts?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metricPairs(records: BenchmarkRecord[], metric: MetricName): MetricPair[] {
  const rows = aggregateRows(records, metric);
  const grouped = new Map<string, AggregatedRow[]>();
  for (const row of rows) {
    const key = `${row.profile}\u0000${row.phase}\u0000${row.memoryMb ?? ""}\u0000${row.parallel ?? ""}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .map((group) => {
      const aws = group.find((row) => row.implementation.startsWith("aws"));
      const shin = group.find((row) => row.implementation.startsWith("shin"));
      if (!aws || !shin || shin.median === 0) {
        return undefined;
      }
      return {
        key: comparisonKey(shin),
        profile: shin.profile,
        phase: shin.phase,
        memoryMb: shin.memoryMb,
        parallel: shin.parallel,
        shin: shin.median,
        aws: aws.median,
        ratio: aws.median / shin.median,
      };
    })
    .filter((row) => row !== undefined)
    .sort(compareMetricPairs);
}

type MetricComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly metricName: MetricName;
  readonly metricLabel: string;
  readonly metricIndex: number;
  readonly unit: string;
  readonly shin: number;
  readonly aws: number;
  readonly diff: number;
  readonly ratio: number;
  readonly percentDelta: number;
};

type PhaseComparisonRow = {
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly metrics: Partial<Record<MetricName, MetricComparisonRow>>;
};

type MetricPair = {
  readonly key: string;
  readonly profile: string;
  readonly phase: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly shin: number;
  readonly aws: number;
  readonly ratio: number;
};

type AggregatedRow = {
  readonly profile: string;
  readonly phase: string;
  readonly implementation: string;
  readonly memoryMb: number | null;
  readonly parallel: number | null;
  readonly count: number;
  readonly median: number;
  readonly p90: number;
  readonly min: number;
  readonly max: number;
};

function aggregateRows(records: BenchmarkRecord[], metric: MetricName): AggregatedRow[] {
  const groups = new Map<string, { record: BenchmarkRecord; values: number[] }>();
  for (const record of records) {
    const value = record[metric];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    const key = [
      record.profile,
      record.phase,
      implementationLabel(record),
      record.memoryMb,
      record.parallel,
    ].join("\u0000");
    const group = groups.get(key) ?? { record, values: [] };
    group.values.push(value);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ record, values }) => {
      const sorted = [...values].sort((left, right) => left - right);
      return {
        profile: record.profile ?? "unknown",
        phase: record.phase ?? "unknown",
        implementation: implementationLabel(record),
        memoryMb: record.memoryMb ?? null,
        parallel: record.parallel ?? null,
        count: sorted.length,
        median: percentile(sorted, 0.5),
        p90: percentile(sorted, 0.9),
        min: sorted[0] ?? 0,
        max: sorted.at(-1) ?? 0,
      };
    })
    .sort(compareAggregatedRows);
}

function comparisonKey(row: {
  profile: string;
  phase: string;
  memoryMb: number | null;
  parallel: number | null;
}): string {
  return [row.profile, row.phase, row.memoryMb ?? "", row.parallel ?? ""].join("\u0000");
}

function compareMetricPairs(left: MetricPair, right: MetricPair): number {
  return comparePhaseGroups(left, right);
}

function compareMetricComparisonRows(
  left: MetricComparisonRow,
  right: MetricComparisonRow,
): number {
  return comparePhaseGroups(left, right) || left.metricIndex - right.metricIndex;
}

function compareAggregatedRows(left: AggregatedRow, right: AggregatedRow): number {
  return comparePhaseGroups(left, right) || left.implementation.localeCompare(right.implementation);
}

function comparePhaseGroups(
  left: { profile: string; phase: string; memoryMb: number | null; parallel: number | null },
  right: { profile: string; phase: string; memoryMb: number | null; parallel: number | null },
): number {
  return (
    left.profile.localeCompare(right.profile) ||
    (left.memoryMb ?? 0) - (right.memoryMb ?? 0) ||
    (left.parallel ?? 0) - (right.parallel ?? 0) ||
    phaseRank(left.phase) - phaseRank(right.phase) ||
    left.phase.localeCompare(right.phase)
  );
}

function percentile(sorted: number[], quantile: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.ceil(sorted.length * quantile) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function unique<T>(values: Array<T | null | undefined>): T[] {
  return [...new Set(values.filter((value): value is T => value !== null && value !== undefined))];
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatOptionalInteger(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? formatInteger(value) : "n/a";
}

function formatOptionalBytes(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  if (value >= 1024 * 1024) {
    return `${formatNumber(value / (1024 * 1024))} MiB`;
  }
  if (value >= 1024) {
    return `${formatNumber(value / 1024)} KiB`;
  }
  return `${formatInteger(value)} B`;
}

function formatValue(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

function formatComparisonCell(row: MetricComparisonRow): string {
  return `${formatValue(row.shin, row.unit)} vs ${formatValue(row.aws, row.unit)} (${formatShinAdvantage(row.ratio)})`;
}

function formatOptionalComparisonCell(row: MetricComparisonRow | undefined): string {
  return row === undefined ? "" : formatComparisonCell(row);
}

function formatMemoryCell(row: MetricComparisonRow): string {
  return `${formatValue(row.shin, row.unit)} vs ${formatValue(row.aws, row.unit)} (${formatMemoryAdvantage(row)})`;
}

function formatOptionalMemoryCell(row: MetricComparisonRow | undefined): string {
  return row === undefined ? "" : formatMemoryCell(row);
}

function formatSignedValue(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value))} ${unit}`;
}

function formatRatio(value: number): string {
  return `${formatNumber(value)}x`;
}

function formatShinAdvantage(value: number): string {
  return value >= 1 ? `${formatRatio(value)} faster` : `${formatRatio(1 / value)} slower`;
}

function formatChartShinAdvantage(value: number): string {
  return value >= 1 ? `${formatChartRatio(value)} faster` : `${formatChartRatio(1 / value)} slower`;
}

function formatMemoryAdvantage(row: MetricComparisonRow): string {
  const reduction = ((row.aws - row.shin) / row.aws) * 100;
  return reduction >= 0
    ? `${formatNumber(reduction)}% lower`
    : `${formatNumber(Math.abs(reduction))}% higher`;
}

function formatChartMemoryAdvantage(row: MetricComparisonRow): string {
  const reduction = ((row.aws - row.shin) / row.aws) * 100;
  return reduction >= 0
    ? `${formatChartNumber(reduction)}% lower`
    : `${formatChartNumber(Math.abs(reduction))}% higher`;
}

function formatChartRatio(value: number): string {
  return `${formatChartNumber(value)}x`;
}

function formatChartNumber(value: number): string {
  if (value >= 10) {
    return value.toFixed(1).replace(/0$/, "").replace(/\.$/, "");
  }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value))}%`;
}

function formatSvgNumber(value: number): string {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeMarkdownPath(path: string): string {
  return path.split("\\").join("/");
}

function parseArgs(args: string[]): RenderOptions {
  const values = parseCliOptions(args, CLI_OPTIONS, usage);

  return {
    inputFile: values.get("input-file") ?? "benchmarks/results.jsonl",
    outputFile: values.get("output-file") ?? "benchmarks/report.md",
    chartOutputFile: values.get("chart-output-file"),
    chartReference: values.get("chart-reference"),
    chartLayout: parseChartLayout(values.get("chart-layout")),
    chartTheme: parseChartTheme(values.get("chart-theme")),
    memoryMb: parsePositiveInteger(values.get("lambda-memory-mb")),
    parallel: parsePositiveInteger(values.get("lambda-max-parallel-transfers")),
    assetProfile: values.get("asset-profile"),
  };
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  usage();
}

function parseChartLayout(value: string | undefined): ChartLayoutName | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "split" || value === "scorecard" || value === "cards") {
    return value;
  }
  usage();
}

function parseChartTheme(value: string | undefined): ChartThemeName | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "signal" || value === "forge" || value === "circuit") {
    return value;
  }
  usage();
}

function usage(): never {
  console.error(
    "Usage: node dist/benchmarks/src/render/comparison-report.js [--input-file benchmarks/results.jsonl] [--output-file benchmarks/report.md] [--chart-output-file <path>] [--chart-reference <markdown-path>] [--chart-layout split|scorecard|cards] [--chart-theme signal|forge|circuit] [--asset-profile <name>] [--lambda-max-parallel-transfers <n>] [--lambda-memory-mb <n>]",
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
