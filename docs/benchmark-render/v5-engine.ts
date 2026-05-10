/**
 * Benchmark SVG render engine for signal-split-v5.
 * All positions derived from layout constants — change one value and everything adapts.
 */

// ═══ LAYOUT CONSTANTS ═══
const CANVAS_PAD_LEFT = 24;
const CANVAS_PAD_RIGHT = 30;

const HEADER_H = 60;          // header band height (title + subtitle + padding)
const SECTION_HDR_H = 22;     // section column-header band
const SECTION_HDR_PAD_TOP = 15; // text baseline within section header

const BAR_H = 11;             // bar thickness
const BAR_RX = 5.5;           // bar corner radius
const BAR_GAP = 6;            // gap between shin and aws bar
const BAR_X = 180;            // bar left edge
const BAR_W = 400;            // max bar width

const ROW_PAD_TOP = 11;       // space from separator to shin bar top
const ROW_PAD_BOTTOM = 11;    // space from aws bar bottom to next separator
const ROW_H = ROW_PAD_TOP + BAR_H + BAR_GAP + BAR_H + ROW_PAD_BOTTOM; // total row height

const COL_SHIN_X = BAR_X + BAR_W + 20;  // shin value column
const COL_AWS_X = COL_SHIN_X + 90;      // aws value column
const COL_DELTA_X = COL_AWS_X + 90;     // delta badge column
const BADGE_W = 60;
const BADGE_H = 22;
const BADGE_RX = 5;

const DIVIDER_PAD = 6;        // extra space before section divider

const CANVAS_W = COL_DELTA_X + BADGE_W + CANVAS_PAD_RIGHT;

// ═══ TYPOGRAPHY CONSTANTS ═══
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SUBTITLE = 12;
const FONT_SIZE_HEADER_LEGEND = 11;
const FONT_SIZE_SECTION_HEADER = 11;
const FONT_SIZE_ROW_LABEL = 13;
const FONT_SIZE_METRIC_VALUE = 12;
const FONT_SIZE_BADGE = 11;

// ═══ DATA ═══
interface Row { label: string; shin: number; aws: number; delta: string; best?: boolean; }

const duration: Row[] = [
  { label: 'cold-create', shin: 14.3, aws: 27.3, delta: '1.92×' },
  { label: 'forced-unchanged', shin: 0.46, aws: 28.3, delta: '61.4×', best: true },
  { label: 'sparse-update', shin: 0.62, aws: 28.8, delta: '46.2×' },
  { label: 'prune-update', shin: 15.8, aws: 28.4, delta: '1.8×' },
];
const memory: Row[] = [
  { label: 'cold-create', shin: 79, aws: 212, delta: '−63%', best: true },
  { label: 'forced-unchanged', shin: 89, aws: 214, delta: '−58%' },
  { label: 'sparse-update', shin: 89, aws: 214, delta: '−58%' },
  { label: 'prune-update', shin: 95, aws: 214, delta: '−56%' },
];
const MAX_DUR = 28.8;
const MAX_MEM = 214;

// ═══ DERIVED POSITIONS ═══
const sectionATop = HEADER_H;
const sectionARowsTop = sectionATop + SECTION_HDR_H + 1; // +1 for bottom line
const sectionABottom = sectionARowsTop + ROW_H * duration.length - 1;
const dividerY = sectionABottom;
const sectionBTop = dividerY + 1;
const sectionBRowsTop = sectionBTop + SECTION_HDR_H + 1;
const sectionBBottom = sectionBRowsTop + ROW_H * memory.length - 1;
const CANVAS_H = sectionBBottom;

// ═══ HELPERS ═══
function barWidth(val: number, max: number): number {
  return Math.max(4, (val / max) * BAR_W);
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

function renderRow(row: Row, index: number, sectionRowsTop: number, max: number, isMem: boolean, isLast: boolean): string {
  const { shinY, awsY, textY, badgeY, sepY } = rowY(sectionRowsTop, index);
  const sw = barWidth(row.shin, max);
  const aw = barWidth(row.aws, max);
  const shinVal = isMem ? `${row.shin} MiB` : `${row.shin}s`;
  const awsVal = isMem ? `${row.aws} MiB` : `${row.aws}s`;
  const useGlowShin = sw > 30;
  const badgeFill = row.best ? '#0a3028' : '#12202c';
  const badgeStroke = row.best ? ' stroke="#0ee89e" stroke-width="0.5"' : '';
  const badgeTextFill = row.best ? '#6ef0d0' : '#f0f8ff';

  // Determine winner: lower is better
  const shinWins = row.shin < row.aws;
  const shinValFill = shinWins ? '#6ef0d0' : '#5a7a94';
  const awsValFill = shinWins ? '#5a7a94' : '#ffa033';

  let s = '';
  // Label
  s += `<text x="${CANVAS_PAD_LEFT}" y="${textY}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_ROW_LABEL}" font-weight="600" fill="#c8e0f0">${row.label}</text>\n`;
  // Shin bar
  s += `<rect x="${BAR_X}" y="${shinY}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_RX}" fill="#12202c"/>\n`;
  if (useGlowShin) s += `<rect x="${BAR_X}" y="${shinY}" width="${sw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#shin)" filter="url(#gS)" opacity="0.5"/>\n`;
  s += `<rect x="${BAR_X}" y="${shinY}" width="${sw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#shin)"/>\n`;
  // AWS bar
  s += `<rect x="${BAR_X}" y="${awsY}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_RX}" fill="#12202c"/>\n`;
  s += `<rect x="${BAR_X}" y="${awsY}" width="${aw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#aws)" filter="url(#gA)" opacity="0.35"/>\n`;
  s += `<rect x="${BAR_X}" y="${awsY}" width="${aw}" height="${BAR_H}" rx="${BAR_RX}" fill="url(#aws)" opacity="0.75"/>\n`;
  // Values — winner gets colored
  s += `<text x="${COL_SHIN_X}" y="${textY}" font-family="JetBrains Mono, monospace" font-size="${FONT_SIZE_METRIC_VALUE}" font-weight="700" fill="${shinValFill}">${shinVal}</text>\n`;
  s += `<text x="${COL_AWS_X}" y="${textY}" font-family="JetBrains Mono, monospace" font-size="${FONT_SIZE_METRIC_VALUE}" font-weight="${shinWins ? '400' : '700'}" fill="${awsValFill}">${awsVal}</text>\n`;
  // Badge
  s += `<rect x="${COL_DELTA_X}" y="${badgeY}" width="${BADGE_W}" height="${BADGE_H}" rx="${BADGE_RX}" fill="${badgeFill}"${badgeStroke} filter="url(#badgeShadow)"/>\n`;
  s += `<text x="${COL_DELTA_X + BADGE_W / 2}" y="${badgeY + 15}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="${FONT_SIZE_BADGE}" font-weight="800" fill="${badgeTextFill}">${row.delta}</text>\n`;
  // Separator (skip for last row)
  if (!isLast) {
    s += `<rect x="${CANVAS_PAD_LEFT}" y="${sepY}" width="${CANVAS_W - CANVAS_PAD_LEFT - CANVAS_PAD_RIGHT}" height="1" fill="#142230"/>\n`;
  }
  return s;
}

function renderSectionHeader(y: number, title: string, deltaLabel: string): string {
  let s = '';
  s += `<rect y="${y}" width="${CANVAS_W}" height="${SECTION_HDR_H}" fill="#0c1420"/>\n`;
  s += `<text x="${CANVAS_PAD_LEFT}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="#4a6a80" letter-spacing="0.8">${title}</text>\n`;
  s += `<text x="${COL_SHIN_X}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="#4a6a80" letter-spacing="0.8">SHIN</text>\n`;
  s += `<text x="${COL_AWS_X}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="#4a6a80" letter-spacing="0.8">AWS</text>\n`;
  s += `<text x="${COL_DELTA_X + 10}" y="${y + SECTION_HDR_PAD_TOP}" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SECTION_HEADER}" font-weight="700" fill="#4a6a80" letter-spacing="0.8">${deltaLabel}</text>\n`;
  s += `<rect x="0" y="${y + SECTION_HDR_H}" width="${CANVAS_W}" height="1" fill="#142230"/>\n`;
  return s;
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
<text x="${CANVAS_PAD_LEFT}" y="26" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_TITLE}" font-weight="800" fill="#f0f8ff" letter-spacing="-0.3">ShinBucketDeployment</text>
<text x="${CANVAS_PAD_LEFT}" y="46" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_SUBTITLE}" font-weight="500" fill="#5a7a94">vs AWS BucketDeployment · 1024 MiB · tiny-many · 2,584 objects · 7.8 MiB</text>
<rect x="${CANVAS_W - 200}" y="12" width="12" height="8" rx="2" fill="url(#shin)"/>
<text x="${CANVAS_W - 182}" y="20" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="700" fill="#8ab8d0">SHIN</text>
<rect x="${CANVAS_W - 130}" y="12" width="12" height="8" rx="2" fill="url(#aws)"/>
<text x="${CANVAS_W - 112}" y="20" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="700" fill="#8ab8d0">AWS</text>
<text x="${CANVAS_W - 200}" y="42" font-family="Inter, -apple-system, sans-serif" font-size="${FONT_SIZE_HEADER_LEGEND}" font-weight="500" fill="#3d5a70">▼ lower is better</text>
<rect x="0" y="${HEADER_H - 1}" width="${CANVAS_W}" height="1" fill="#1a2a38"/>

`;

  // Section A: Duration
  svg += renderSectionHeader(sectionATop, 'HANDLER DURATION', 'GAIN');
  for (let i = 0; i < duration.length; i++) {
    svg += renderRow(duration[i], i, sectionARowsTop, MAX_DUR, false, i === duration.length - 1);
  }

  // Divider
  svg += `<rect x="0" y="${dividerY}" width="${CANVAS_W}" height="1" fill="#1a2a38"/>\n`;

  // Section B: Memory
  svg += renderSectionHeader(sectionBTop, 'MAX MEMORY', 'SAVED');
  for (let i = 0; i < memory.length; i++) {
    svg += renderRow(memory[i], i, sectionBRowsTop, MAX_MEM, true, i === memory.length - 1);
  }

  svg += `</svg>`;
  return svg;
}

// ═══ OUTPUT ═══
import * as fs from 'fs';
import * as path from 'path';
const outPath = path.join(__dirname, '..', 'benchmark-preview-assets', 'signal-split-v5.svg');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, render());
console.log(`Written: ${outPath}`);
console.log(`Canvas: ${CANVAS_W}×${CANVAS_H}, Row height: ${ROW_H}px, Bar: ${BAR_H}px`);
