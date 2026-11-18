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

/**
 * Header glyph of SQL module n (1–12, one per chapter). `accent`: the chapter's fill class (chapterColor(n).fill), else the
 * accent colour. Accent parts carry `data-acc` 0, 1… in drawing order: the module page's glyph-in pops them in turn (v5 B1).
 */
export function moduleGlyph(n: number, accent?: string): SVGSVGElement {
  let k = 0;
  const acc = (x: Attrs): Attrs => ({ ...x, 'data-acc': k++ });
  const fx = (): Attrs => acc(accent ? { class: accent } : { fill: A });
  const f = (x: number, y: number, w: number, h: number, extra: Attrs = {}): SVGElement => e('rect', { x, y, width: w, height: h, rx: 2, ...fx(), ...extra });
  const grid = (x: number, y: number, cols: number, rows: number): SVGElement =>
    e('g', {}, rect(x, y, cols * 16, rows * 10, PANEL, { stroke: LINE }),
      ...Array.from({ length: rows - 1 }, (_, r) => line(x, y + (r + 1) * 10, x + cols * 16, y + (r + 1) * 10, LINE, 1)));
  const body: Record<number, () => Kid[]> = {
    1: () => [grid(40, 14, 5, 4), f(72, 14, 16, 40, { opacity: 0.85 })],
    2: () => [path('M30 16 H70 L56 34 V48 L44 52 V34 Z', ink), path('M96 18 H120 L106 32 L120 46 H96', acc({ ...ink, stroke: A }))],
    3: () => [grid(18, 16, 3, 3), grid(98, 16, 3, 3), path('M66 26 C80 26 84 36 98 36', acc({ ...ink, stroke: A }))],
    4: () => [rect(30, 16, 44, 34, PANEL, { rx: 4, stroke: LINE }), f(30, 16, 44, 8), circle(110, 33, 16, PANEL, ring), path('M110 24 V33 H118', ink)],
    5: () => [path('M30 32 H70 M70 32 L100 16 H130 M70 32 H130 M70 32 L100 48 H130', ink), circle(70, 32, 5, A, acc({}))],
    6: () => [rect(28, 22, 70, 6, LINE, { rx: 3 }), rect(28, 34, 50, 6, LINE, { rx: 3 }), f(52, 22, 22, 6), circle(108, 30, 13, 'none', { ...ring, 'stroke-width': 3 }), line(117, 40, 130, 52, 'var(--muted)', 4)],
    7: () => [rect(36, 12, 88, 40, PANEL, { rx: 6, ...ring }), rect(52, 20, 56, 24, SOFT, { rx: 4, ...ring }), f(68, 27, 24, 10)],
    8: () => [f(40, 40, 30, 12), f(46, 26, 30, 12, { opacity: 0.8 }), f(52, 12, 30, 12, { opacity: 0.6 }), path('M98 46 C118 46 118 18 98 18 M98 18 l6 -4 M98 18 l6 4', ink)],
    9: () => [circle(66, 32, 18, 'none', ring), circle(94, 32, 18, 'none', ring), e('path', { d: 'M80 21 A18 18 0 0 1 80 43 A18 18 0 0 1 80 21 Z', ...fx() })],
    10: () => [...[0, 1, 2, 3, 4, 5].map((i) => rect(24 + i * 20, 38 - (i % 3) * 8, 12, (i % 3) * 8 + 10, LINE, { rx: 2 })), rect(60, 12, 48, 42, 'none', acc({ rx: 6, stroke: A, 'stroke-width': 3 }))],
    11: () => [rect(44, 12, 64, 42, PANEL, { rx: 4, ...ring }), line(76, 12, 76, 54), f(88, 12, 10, 22), path('M88 34 L93 29 L98 34', { fill: SOFT })],
    12: () => [rect(30, 12, 100, 42, PANEL, { rx: 6, stroke: LINE, 'stroke-width': 2 }), path('M44 44 A20 20 0 0 1 84 44', ink), e('line', acc({ x1: 64, y1: 44, x2: 76, y2: 30, stroke: A, 'stroke-width': 3, 'stroke-linecap': 'round' })), f(96, 34, 8, 12), f(108, 26, 8, 20), f(120, 20, 8, 26)],
  };
  return root(160, 64, rect(4, 4, 152, 56, SOFT, { rx: 12 }), ...(body[n] ?? body[1])());
}

/** Header glyph of an advanced group: A windows + recursion (tree), B funnel + cohort steps, C star schema, D arrow out of the frame. */
export function trackGlyph(g: 'A' | 'B' | 'C' | 'D'): SVGSVGElement {
  const body: Record<'A' | 'B' | 'C' | 'D', Kid[]> = {
    A: [rect(22, 14, 40, 36, 'none', { rx: 4, stroke: A, 'stroke-width': 3 }), path('M112 14 V26 M112 26 L94 40 M112 26 L130 40 M94 40 V50 M130 40 V50', ink), circle(112, 14, 4, A)],
    B: [path('M22 14 H66 L52 32 V46 L36 50 V32 Z', ink), path('M86 50 V40 H102 V30 H118 V20 H134', { ...ink, stroke: A, 'stroke-width': 3 })],
    C: [path('M80 10 V54 M46 32 H114', ink), rect(70, 24, 20, 16, A, { rx: 3 }), ...[[80, 10], [80, 54], [46, 32], [114, 32]].map(([x, y]) => circle(x, y, 7, PANEL, ring))],
    D: [rect(24, 12, 64, 40, 'none', { rx: 6, ...ring }), path('M60 32 H132 M120 22 L132 32 L120 42', { ...ink, stroke: A, 'stroke-width': 3 })],
  };
  return root(160, 64, rect(4, 4, 152, 56, SOFT, { rx: 12 }), ...body[g]);
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

/** Finance "coming soon": a columned hall, two towers, a dashed growth line in the sky and a stack of coins. */
export function financeSoon(): SVGSVGElement {
  return root(480, 200,
    rect(0, 0, 480, 200, 'var(--sky)', { rx: 16 }),
    path('M40 120 L130 96 L210 104 L300 70 L400 54 L450 30', { fill: 'none', stroke: A, 'stroke-width': 3, 'stroke-dasharray': '8 8', 'stroke-linecap': 'round' }),
    circle(450, 30, 6, A),
    rect(0, 168, 480, 32, 'var(--ground)'),
    path('M60 92 L130 70 L200 92 Z', { fill: LINE }),
    rect(66, 92, 128, 10, PANEL, { stroke: LINE }),
    ...[78, 104, 130, 156, 180].map((x) => rect(x - 4, 104, 8, 56, PANEL, { stroke: LINE })),
    rect(60, 160, 140, 8, LINE),
    rect(250, 60, 60, 108, 'var(--bar)', { rx: 4 }), rect(320, 90, 48, 78, 'var(--land)', { rx: 4 }),
    ...[0, 1, 2, 3, 4].flatMap((r) => [rect(262, 72 + r * 18, 12, 10, 'var(--sun)'), rect(286, 72 + r * 18, 12, 10, 'var(--sun)')]),
    ...[0, 1, 2, 3].map((i) => e('ellipse', { cx: 412, cy: 160 - i * 9, rx: 22, ry: 7, fill: 'var(--sun)', stroke: 'var(--sun-ink)', 'stroke-width': 1.5 })));
}
