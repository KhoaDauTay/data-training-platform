// Plan 8b Task 6: drawn illustrations (lazy chunk `illustrations`, src/art/load.ts loadIllustrations()). Plain shapes,
// colours only through CSS variables (they follow the theme) or a class passed in, no text (words go beside them in
// HTML), aria-hidden. No runtime import from main (D8b-2): elements are made here with createElementNS.

const NS = 'http://www.w3.org/2000/svg';
type Kid = SVGElement | null | false | undefined;
type Attrs = Record<string, string | number>;

function e(tag: string, attrs: Attrs, ...kids: Kid[]): SVGElement {
  const el = document.createElementNS(NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const k of kids) if (k) el.append(k);
  return el;
}
const root = (w: number, h: number, ...kids: Kid[]): SVGSVGElement =>
  e('svg', { viewBox: `0 0 ${w} ${h}`, class: 'block h-auto w-full', 'aria-hidden': 'true', focusable: 'false' }, ...kids) as SVGSVGElement;
const rect = (x: number, y: number, width: number, height: number, fill: string, extra: Attrs = {}): SVGElement => e('rect', { x, y, width, height, fill, ...extra });
const circle = (cx: number, cy: number, r: number, fill: string, extra: Attrs = {}): SVGElement => e('circle', { cx, cy, r, fill, ...extra });
const path = (d: string, extra: Attrs): SVGElement => e('path', { d, ...extra });
const line = (x1: number, y1: number, x2: number, y2: number, stroke = 'var(--muted)', w = 2): SVGElement =>
  e('line', { x1, y1, x2, y2, stroke, 'stroke-width': w, 'stroke-linecap': 'round' });
const ink: Attrs = { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const ring: Attrs = { stroke: 'var(--muted)', 'stroke-width': 2 };

const A = 'var(--accent)';
const SOFT = 'var(--accent-soft)';
const PANEL = 'var(--panel)';
const LINE = 'var(--border)';

// ui-ux-v6 S4: module and track glyphs in the Phosphor duotone grammar (the icon set, src/ui/iconData.ts) on a 96x64
// grid: one colour (the accent: General pages have no chapter colours, L82), round 4-unit strokes, a 0.2 tone layer.
const W = 96;
const H = 64;
const pen: Attrs = { fill: 'none', stroke: A, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const tile = (): SVGElement => rect(2, 2, W - 4, H - 4, SOFT, { rx: 12 });

/** One shape drawn twice: its tone layer (opacity 0.2) under its outline. `acc` marks it for the module page's glyph-in pop. */
function duo(tag: string, attrs: Attrs, acc?: number): SVGElement {
  return e('g', acc === undefined ? {} : { 'data-acc': acc }, e(tag, { ...attrs, fill: A, opacity: 0.2 }), e(tag, { ...attrs, ...pen }));
}
const d = (x: string): SVGElement => path(x, pen);
const box = (x: number, y: number, w: number, h: number, acc?: number, rx = 4): SVGElement => duo('rect', { x, y, width: w, height: h, rx }, acc);
const ringC = (cx: number, cy: number, r: number, acc?: number): SVGElement => duo('circle', { cx, cy, r }, acc);
/** A table outline with row rules at the given y's. */
const table = (x: number, y: number, w: number, h: number, rows: number[]): SVGElement =>
  e('g', {}, rect(x, y, w, h, 'none', { ...pen, rx: 4 }), ...rows.map((ry) => d(`M${x} ${ry} H${x + w}`)));
/** A tone-only row (no outline) inside a table. */
const toneRow = (x: number, y: number, w: number, h: number, acc: number): SVGElement => rect(x, y, w, h, A, { opacity: 0.2, 'data-acc': acc });

/** Header glyph of SQL module n (1–12, one per chapter). Tone parts carry `data-acc` 0, 1… in drawing order (v5 B1 glyph-in). */
export function moduleGlyph(n: number): SVGSVGElement {
  const body: Record<number, () => Kid[]> = {
    // reading and filtering: a table, one row picked, a funnel letting it through
    1: () => [toneRow(14, 24, 30, 10, 0), table(14, 14, 30, 36, [24, 34, 42]), duo('path', { d: 'M52 16 H84 L72 31 V46 L64 50 V31 Z' }, 1)],
    // aggregating and grouping: two clusters of rows become two bars
    2: () => [...[[16, 20], [26, 16], [22, 28], [16, 42], [26, 40], [22, 50]].map(([cx, cy]) => circle(cx, cy, 3.5, A)),
      d('M36 32 H48 M42 26 L48 32 L42 38'), box(56, 18, 10, 34, 0, 2), box(72, 32, 10, 20, 1, 2), d('M52 52 H86')],
    // joining tables: two tables, matching rows linked
    3: () => [toneRow(12, 14, 24, 10, 0), toneRow(60, 24, 24, 10, 1), table(12, 14, 24, 36, [24, 34]), table(60, 14, 24, 36, [24, 34]),
      d('M36 19 C48 19 48 29 60 29'), d('M36 29 C48 29 48 41 60 41')],
    // dates and NULLs: a calendar with one day marked, and the empty set
    4: () => [box(14, 16, 38, 36, undefined, 5), d('M14 26 H52 M24 11 V20 M42 11 V20'), box(34, 32, 10, 10, 0, 2), ringC(72, 34, 11, 1), d('M62 48 L82 20')],
    // conditional logic: a decision with two branches
    5: () => [duo('path', { d: 'M26 20 L38 32 L26 44 L14 32 Z' }, 0), d('M38 32 C48 32 48 18 58 18 M38 32 C48 32 48 46 58 46'), box(58, 11, 24, 14, 1), box(58, 39, 24, 14)],
    // text and data types: lines of text with a cursor, a square turned into a circle
    6: () => [d('M14 20 H40 M14 32 H34 M14 44 H40'), d('M46 14 V50 M42 14 H50 M42 50 H50'), box(58, 12, 16, 16, 0, 3), ringC(74, 44, 9, 1), d('M78 18 C86 22 86 30 80 34 M80 34 L80 27 M80 34 L86 31')],
    // subqueries: a query inside a query
    7: () => [box(12, 10, 72, 44, undefined, 7), box(28, 21, 40, 22, 0), d('M36 29 H60 M36 36 H52')],
    // CTEs and latest rows: steps building on each other, a flag on the newest
    8: () => [box(12, 42, 22, 12, undefined, 3), box(30, 30, 22, 12, 0, 3), box(48, 18, 22, 12, 1, 3), d('M78 30 V10 L88 14 L78 18')],
    // set operations: two overlapping sets
    9: () => [ringC(38, 32, 17, 0), ringC(58, 32, 17, 1)],
    // window functions: a frame sliding over rows
    10: () => [...[0, 1, 2, 3, 4, 5].map((i) => d(`M${18 + i * 12} 46 V${40 - ((i * 7) % 4) * 6}`)), box(32, 12, 32, 40, 0, 6), d('M40 58 H56 M51 54 L56 58 L51 62')],
    // performance and indexes: a speed gauge
    11: () => [duo('path', { d: 'M18 48 A30 30 0 0 1 78 48 Z' }, 0), d('M48 48 L64 28'), circle(48, 48, 4, A), d('M24 34 L28 36 M34 24 L37 28 M48 19 V23 M62 24 L59 28')],
    // capstone: a magnifier over a chart
    12: () => [d('M14 52 H54 M20 52 V38 M30 52 V30 M40 52 V42'), ringC(60, 26, 14, 0), d('M70 36 L82 48')],
  };
  return root(W, H, tile(), ...(body[n] ?? body[1])());
}

/** Header glyph of an advanced group: A windows + recursion (tree), B funnel + cohort steps, C star schema, D arrow out of the frame. */
export function trackGlyph(g: 'A' | 'B' | 'C' | 'D'): SVGSVGElement {
  const body: Record<'A' | 'B' | 'C' | 'D', Kid[]> = {
    A: [box(12, 16, 28, 32, 0, 5), d('M66 14 V26 M66 26 L52 40 M66 26 L80 40 M52 40 V50 M80 40 V50'), ringC(66, 14, 5)],
    B: [duo('path', { d: 'M12 16 H44 L34 30 V44 L22 48 V30 Z' }, 0), d('M52 50 V40 H64 V30 H76 V20 H86')],
    C: [d('M48 10 V54 M18 32 H78'), box(38, 24, 20, 16, 0, 3), ...[[48, 10], [48, 54], [18, 32], [78, 32]].map(([cx, cy]) => ringC(cx, cy, 6))],
    D: [box(10, 14, 44, 36, 0, 6), d('M34 32 H86 M76 22 L86 32 L76 42')],
  };
  return root(W, H, tile(), ...body[g]);
}

const TICK = 'M7.5 12.5 L10.5 15.5 L16.5 9';
/** The tick's start shape: a dot in the middle (General has no locks to open, L88; ui-ux-v6 S4 said a padlock, L121). */
export const UNLOCK_FROM = 'M11.6 12 L12 12 L12.4 12';
export const UNLOCK_MS = 900;

/** A module whose skills are all learned: a ring and a tick (`data-ring`/`data-mark`, pathLength 1 so CSS can draw them too). */
export function doneBadge(): SVGSVGElement {
  return e('svg', { viewBox: '0 0 24 24', class: 'block size-full', 'aria-hidden': 'true', focusable: 'false' },
    circle(12, 12, 11.5, PANEL),
    circle(12, 12, 9.5, 'none', { 'data-ring': '', stroke: 'var(--good)', 'stroke-width': 2.5, pathLength: 1 }),
    path(TICK, { 'data-mark': '', fill: 'none', stroke: 'var(--good)', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 })) as SVGSVGElement;
}

/**
 * ui-ux-v6 S4: a module just completed this session. The ring draws in (DrawSVG), the dot grows into the tick (MorphSVG), the
 * badge pops; 900 ms, only on the badge's own leaves (L93). GSAP comes in from the caller (this chunk never imports it).
 * The badge's children are put back at the end, so it equals a fresh doneBadge() (GSAP leaves inline residue, L116).
 */
export function playUnlock(badge: SVGSVGElement, g: typeof import('./gsap')): void {
  const snap = badge.cloneNode(true) as SVGSVGElement;
  const ring = badge.querySelector('[data-ring]');
  const mark = badge.querySelector('[data-mark]');
  const disc = badge.firstElementChild;
  if (!ring || !mark || !disc) return;
  for (const x of [ring, mark]) x.removeAttribute('pathLength'); // DrawSVG measures real lengths; the snapshot puts it back
  const s = UNLOCK_MS / 1000;
  const tl = g.timeline();
  tl.fromTo([disc, ring], { scale: 0.6, svgOrigin: '12 12' }, { scale: 1, duration: s * 0.4, ease: 'back.out(2.4)' }, 0)
    .fromTo(ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: s * 0.55, ease: 'power2.out' }, 0)
    .fromTo(mark, { morphSVG: UNLOCK_FROM }, { morphSVG: TICK, duration: s * 0.5, ease: 'back.out(2)' }, s * 0.35)
    .set({}, {}, s)
    .eventCallback('onComplete', () => { tl.kill(); badge.replaceChildren(...snap.childNodes); });
  tl.play();
}

/** Practise SQL with nothing due: an empty board with a tick; room on the right for Lily asleep (sprite in HTML). */
export function emptyDrills(): SVGSVGElement {
  return root(240, 120,
    path('M0 96 Q120 84 240 96 V120 H0 Z', { fill: 'var(--ground)' }),
    rect(30, 18, 120, 74, PANEL, { rx: 8, stroke: LINE, 'stroke-width': 2 }),
    ...[34, 48, 62].map((y) => line(46, y, 110, y, LINE, 3)),
    circle(124, 70, 14, SOFT),
    path('M117 70 L122 75 L131 64', { ...ink, stroke: A, 'stroke-width': 3 }),
    line(60, 92, 54, 108, 'var(--muted)', 3), line(120, 92, 126, 108, 'var(--muted)', 3));
}
