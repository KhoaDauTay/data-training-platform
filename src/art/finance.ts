import type * as I18n from '../i18n';
import type { Harbor } from '../scene';
import type * as Theme from '../theme';
import type * as Dom from '../ui/dom';
import type * as Svg from '../ui/svg';
import type * as Load from './load';
import type { Ctx } from './logistics';

// Main-bundle values come in through initArt (only `import type` from main modules, Plan 6 U3: a value import makes
// Rolldown split main into shared chunks). src/ui/domainArt.ts calls it right after the chunk loads.
let t: typeof I18n.t;
let chapterColor: typeof Theme.chapterColor;
let s: typeof Svg.s;
let h: typeof Dom.h;
let getLang: typeof I18n.getLang;
let loadedGsap: typeof Load.loadedGsap;
let loadGsap: typeof Load.loadGsap;
export function initArt(deps: {
  t: typeof I18n.t; chapterColor: typeof Theme.chapterColor; s: typeof Svg.s; h: typeof Dom.h; getLang: typeof I18n.getLang;
  loadedGsap: typeof Load.loadedGsap; loadGsap: typeof Load.loadGsap;
}): void {
  ({ t, chapterColor, s, h, getLang, loadedGsap, loadGsap } = deps);
}

/**
 * Finance art (Plan 11, product-design-v9 §5.3, ui-ux-v6 S6): the Silver Jar counter in Da Nang with its glass jar
 * (Overview hero), the branch map (Map page, the task bar's map dialog) and the completion dock. Lazy chunk `finance`
 * (budget finart). Same contract as art/ecommerce: no SVG text below lg (L35: the page repeats it as HTML through
 * items()), decorative parts aria-hidden, colours as hex, theme tokens or whole literal Tailwind classes.
 */

/** D-F11: text only the pictures use (labels, aria-label), kept in the chunk like src/i18n/learn.ts. */
export const FIN_TEXT = {
  vi: {
    company: 'Hũ Bạc',
    scene: 'Quầy giao dịch Hũ Bạc ở Đà Nẵng: {coins} đồng xu trong hũ, {stars} nhãn sao',
    map: 'Bản đồ chi nhánh Hũ Bạc quanh trụ sở Đà Nẵng: {list}',
    open: '{name}: đang hoạt động',
    locked: '{name}: mở sau đánh giá thăng tiến chương {n}',
    hq: 'Trụ sở',
  },
  en: {
    company: 'Silver Jar',
    scene: 'The Silver Jar counter in Da Nang: {coins} coins in the jar, {stars} star labels',
    map: 'Silver Jar branches around the Da Nang head office: {list}',
    open: '{name}: open',
    locked: '{name}: opens after the chapter {n} promotion review',
    hq: 'Head office',
  },
};
const tx = (k: keyof typeof FIN_TEXT.vi, v: Record<string, string | number> = {}): string =>
  FIN_TEXT[getLang()][k].replace(/\{(\w+)\}/g, (_, n: string) => String(v[n]));

const FONT = 'Nunito, system-ui, sans-serif';

/** What the art shows: chapters whose promotion review is passed (derive().passed) and tasks completed in this domain. */
export interface FinArtState { passed: ReadonlySet<number>; done: number }

/**
 * ★ chapters (content/domains/fin/chapters.yml `tier`): each promotion review there sticks a star on the jar. v20 (L186):
 * chapter 7 opens no branch (all 8 are open after chapter 6), so its milestone is the fourth star.
 */
export const TIER = [1, 4, 6, 7] as const;

/**
 * Branches. `name` = branches.name in the finance seed (tests/finArt.test.ts). `opens`: the chapter whose promotion
 * review opens it (0 = open from the start). x/y: viewBox 980×300, the central coast turned on its side (north on the
 * left, the sea on top), stylised; lx/ly: label anchor (text-anchor middle).
 */
export const BRANCHES = [
  { name: 'Da Nang', opens: 0, x: 420, y: 204, lx: 420, ly: 236 },
  { name: 'Hoi An', opens: 0, x: 508, y: 188, lx: 516, ly: 220 },
  { name: 'Hue', opens: 1, x: 214, y: 196, lx: 214, ly: 228 },
  { name: 'Lien Chieu', opens: 2, x: 336, y: 224, lx: 320, ly: 256 },
  { name: 'Tam Ky', opens: 3, x: 614, y: 176, lx: 614, ly: 208 },
  { name: 'Dong Ha', opens: 4, x: 92, y: 214, lx: 92, ly: 246 },
  { name: 'Quang Ngai', opens: 5, x: 742, y: 160, lx: 742, ly: 192 },
  { name: 'Quy Nhon', opens: 6, x: 892, y: 136, lx: 892, ly: 168 },
] as const;
type Branch = (typeof BRANCHES)[number];
const HQ = BRANCHES[0];
/** The shoreline, west (north) to east (south), with Son Tra jutting out past Da Nang. */
const SHORE = 'M-10 150 C60 160 120 176 180 164 C240 152 280 140 320 146 C350 150 360 134 384 124 C404 116 418 132 410 150 C404 164 440 162 470 156 C540 142 600 132 680 118 C760 104 830 92 900 84 C930 80 960 76 990 74';
const LAND = `${SHORE} L990 310 L-10 310 Z`;

/** Control point of the route from the head office to `b`: bends seaward, over the labels, more for a farther branch. */
export const bend = (b: Branch): { x: number; y: number } =>
  ({ x: (HQ.x + b.x) / 2, y: Math.min(HQ.y, b.y) - 16 - Math.abs(b.x - HQ.x) / 8 });
export { HQ };

export const openBranches = (passed: ReadonlySet<number>): Set<string> =>
  new Set(BRANCHES.filter((b) => b.opens === 0 || passed.has(b.opens)).map((b) => b.name));

/** One line per branch ("Hue: open"): the map's accessible description and the HTML legend below lg. */
export const items = (st: FinArtState): string[] => {
  const open = openBranches(st.passed);
  return BRANCHES.map((b) => (open.has(b.name) ? tx('open', { name: b.name }) : tx('locked', { name: b.name, n: b.opens })));
};

let uid = 0;
type El = SVGElement;
const only = (els: (El | null | false | undefined)[]): El[] => els.filter((x): x is El => Boolean(x));
const colourOf = (b: Branch): Theme.ChapterColor => chapterColor(Math.max(1, b.opens));

/** `ring` (as E-com): a pulse on the branch opened last; the dock leaves it out and draws its own, once. */
export function map(st: FinArtState, ring = true): SVGSVGElement {
  const n = ++uid;
  const open = openBranches(st.passed);
  const last = ring ? BRANCHES.filter((b) => b.opens && open.has(b.name)).pop() : undefined;
  const route = (b: Branch): SVGPathElement => {
    const isOpen = open.has(b.name);
    const k = bend(b);
    return s('path', {
      d: `M${HQ.x} ${HQ.y} Q${k.x} ${k.y} ${b.x} ${b.y}`, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round',
      class: isOpen ? colourOf(b).stroke : 'stroke-slate-400 dark:stroke-slate-500',
      'stroke-dasharray': isOpen ? false : '6 6', 'data-branch': b.name,
    });
  };
  let waves = '';
  for (let y = 26; y < 120; y += 22) for (let x = 20 + (y % 44); x < 960; x += 88) if (y < 130 - x / 12) waves += `M${x} ${y}q8 -5 16 0t16 0`;
  // the Truong Son range inland: two rows of peaks, the far row paler
  const ridge = (base: number, hs: number[], step: number, x0: number): string => {
    let d = `M-10 310V${base}`;
    for (let x = x0, i = 0; x < 1000; x += step, i++) d += `L${x + step / 2} ${base - hs[i % hs.length]}L${x + step} ${base}`;
    return `${d}V310Z`;
  };
  return s('svg', {
    viewBox: '0 0 980 300', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': tx('map', { list: items(st).join('; ') }),
  },
    s('defs', {},
      s('linearGradient', { id: `fm${n}-sea`, x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, style: 'stop-color:var(--map-sea-2)' }), s('stop', { offset: 1, style: 'stop-color:var(--map-sea-1)' })),
      s('clipPath', { id: `fm${n}-c` }, s('rect', { width: 980, height: 300, rx: 12 }))),
    s('g', { 'clip-path': `url(#fm${n}-c)`, 'aria-hidden': 'true' },
      s('rect', { width: 980, height: 300, fill: `url(#fm${n}-sea)` }),
      s('path', { d: waves, fill: 'none', stroke: 'var(--map-coast)', 'stroke-opacity': 0.45, 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
      s('path', { d: LAND, style: 'fill:var(--land)' }),
      s('path', { d: ridge(286, [26, 40, 30, 48, 34, 22, 44], 64, -40), style: 'fill:var(--ground)', opacity: 0.6, 'stroke-linejoin': 'round' }),
      s('path', { d: ridge(300, [18, 28, 14, 24, 32, 20], 52, -10), style: 'fill:var(--ground)', 'stroke-linejoin': 'round' }),
      s('path', { d: SHORE, fill: 'none', stroke: 'var(--map-coast)', 'stroke-width': 3, 'stroke-linejoin': 'round' })),
    s('g', {}, ...BRANCHES.filter((b) => b !== HQ).map(route)),
    last && s('circle', { cx: last.x, cy: last.y, r: 7, fill: 'none', 'stroke-width': 2, class: ['cq-pulse', colourOf(last).stroke].join(' '), 'aria-hidden': 'true' }),
    // the head office: a bank front on the Da Nang pin
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: `M${HQ.x - 16} ${HQ.y - 14} L${HQ.x} ${HQ.y - 25} L${HQ.x + 16} ${HQ.y - 14} Z`, fill: '#0f766e' }),
      s('rect', { x: HQ.x - 13, y: HQ.y - 14, width: 26, height: 14, fill: '#f0fdfa', stroke: '#0f766e', 'stroke-width': 2 }),
      s('path', { d: `M${HQ.x - 7} ${HQ.y - 11}v9M${HQ.x} ${HQ.y - 11}v9M${HQ.x + 7} ${HQ.y - 11}v9`, stroke: '#0f766e', 'stroke-width': 2 })),
    s('g', { 'font-family': FONT, 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', 'paint-order': 'stroke', 'stroke-width': 4, 'stroke-linejoin': 'round', style: 'stroke:var(--map-halo)' },
      ...BRANCHES.flatMap((b) => {
        const isOpen = open.has(b.name);
        return only([
          b !== HQ && s('circle', {
            cx: b.x, cy: b.y, r: 7, 'stroke-width': 2.5, style: 'stroke:var(--map-halo)',
            class: isOpen ? colourOf(b).fill : 'fill-slate-400 dark:fill-slate-500', 'data-branch': b.name,
          }),
          s('text', { x: b.lx, y: b.ly, class: isOpen ? 'fill-slate-900 dark:fill-slate-100' : 'fill-slate-600 dark:fill-slate-300', 'data-branch': b.name }, b.name),
          b === HQ && s('text', { x: b.lx, y: b.ly + 17, 'font-size': 14, 'font-weight': 600, class: 'fill-teal-800 dark:fill-teal-300' }, tx('hq')),
        ]);
      })));
}

// ---- the Silver Jar counter (Overview hero; the dock draws it too) ----

const WARM = '#fde68a';
/** The jar's centre line and the coin pile inside it: 5 coins a layer, 6 layers (30 tasks = a full jar). */
const JX = 730;
const PER_LAYER = 5;
const MAX_COINS = 30;
/** Top-face centre of coin i (layer r from the bottom, staggered by row). */
export const slot = (i: number): { x: number; y: number } => {
  const r = Math.floor(i / PER_LAYER);
  return { x: JX - 60 + (i % PER_LAYER) * 30 + (r % 2 ? 5 : -5), y: 282 - r * 17 };
};
/** A coin lying flat: rim (shaded), face in the chapter colour, an embossed ring, a glint. No transform: GSAP moves the group. */
function coin(i: number): SVGGElement {
  const { x, y } = slot(i);
  const fill = chapterColor(1 + Math.floor(i / PER_LAYER)).fill;
  const rim = `M${x - 14} ${y}v6a14 6 0 0 0 28 0v-6z`;
  return s('g', { 'data-coin': '' },
    s('path', { d: rim, class: fill }),
    s('path', { d: rim, fill: '#000000', opacity: 0.32 }),
    s('ellipse', { cx: x, cy: y, rx: 14, ry: 6, class: fill }),
    s('ellipse', { cx: x, cy: y, rx: 9, ry: 3.6, fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.55, 'stroke-width': 1.2 }),
    s('path', { d: `M${x - 10} ${y - 2}q6 -3 13 -3`, fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.7, 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
}
/** A five-point star centred on (x, y). */
const star = (x: number, y: number, r: number): string =>
  `${Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    return `${k ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join('')}Z`;
/** The star sticker of ★ chapter `ch` on the jar's neck label. */
const STAR_X = (k: number): number => JX + (k - (TIER.length - 1) / 2) * 26;
function sticker(ch: number): SVGGElement {
  const x = STAR_X(TIER.indexOf(ch as (typeof TIER)[number]));
  return s('g', { 'data-star': String(ch) },
    s('circle', { cx: x, cy: 147, r: 10, fill: '#fffbeb', stroke: '#f59e0b', 'stroke-width': 1.5 }),
    s('path', { d: star(x, 147.5, 8), fill: '#f59e0b', stroke: '#b45309', 'stroke-width': 1, 'stroke-linejoin': 'round' }));
}

/** A skyline across the whole bleed (-420…1520), so a wide card never shows empty bands; `windows`: lit at night (--es-win). */
function skyline(fill: string, base: number, hs: number[], ws: number[]): El[] {
  let d = `M-420 ${base}`;
  let lit = '';
  for (let x = -420, i = 0; x < 1520; i++) {
    const w = ws[i % ws.length];
    const hh = hs[i % hs.length];
    d += `V${base - hh}H${x + w}`;
    for (let wy = base - hh + 10; wy < base - 12; wy += 16) {
      for (let wx = x + 8; wx < x + w - 10; wx += 14) if ((wx * 7 + wy * 3 + i) % 5 < 2) lit += `M${wx} ${wy}h5v7h-5z`;
    }
    x += w;
  }
  return [s('path', { d: `${d}V${base}Z`, style: `fill:${fill}` }), s('path', { d: lit, fill: WARM, style: 'opacity:var(--es-win)' })];
}

/** Areca palm (cây cau) at x, rooted on the sidewalk: ringed trunk, green crownshaft, drooping two-tone fronds, a nut bunch. */
function palm(x: number, ambient: boolean): El[] {
  const top = { x: x - 8, y: 150 };
  let rings = '';
  for (let y = 300; y > 172; y -= 13) rings += `M${x - 4 - (300 - y) / 32} ${y}h8`;
  const fronds = [-170, -140, -112, -80, -52, -22, 8].map((deg, k) => {
    const a = (deg * Math.PI) / 180;
    const len = 74 - Math.abs(deg + 80) / 6;
    const ex = top.x + Math.cos(a) * len;
    const ey = top.y + Math.sin(a) * len + 26;
    const cx = top.x + Math.cos(a) * len * 0.55;
    const cy = top.y + Math.sin(a) * len * 0.55 - 10;
    const [nx, ny] = [Math.cos(a), Math.sin(a)];
    const w = 9;
    return s('path', {
      d: `M${top.x} ${top.y}Q${(cx - ny * w).toFixed(1)} ${(cy + nx * w).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}Q${(cx + ny * w).toFixed(1)} ${(cy - nx * w).toFixed(1)} ${top.x} ${top.y}Z`,
      fill: k % 2 ? '#4d7c0f' : '#65a30d',
    });
  });
  return [
    s('path', { d: `M${x} 318C${x} 260 ${x - 2} 200 ${top.x} ${top.y + 18}`, fill: 'none', stroke: '#8b7355', 'stroke-width': 7, 'stroke-linecap': 'round' }),
    s('path', { d: rings, stroke: '#5b4a37', 'stroke-opacity': 0.55, 'stroke-width': 1.5 }),
    s('g', { class: ambient ? 'cq-palm' : false },
      s('path', { d: `M${top.x} ${top.y + 22}V${top.y + 2}`, stroke: '#4d7c0f', 'stroke-width': 8, 'stroke-linecap': 'round' }),
      ...fronds,
      ...[[-4, 176], [3, 179], [-1, 182], [6, 174]].map(([dx, y]) => s('circle', { cx: top.x + dx, cy: y, r: 3.2, fill: dx % 2 ? '#ea580c' : '#ca8a04' }))),
  ];
}

/** Street lamp: post at x, arm and lamp, a warm glow that follows the theme. */
const lamp = (x: number, glow: string): El[] => [
  s('circle', { cx: x + 16, cy: 212, r: 44, fill: glow, style: 'opacity:var(--es-glow)' }),
  s('rect', { x: x - 2, y: 214, width: 5, height: 108, fill: '#334155' }),
  s('path', { d: `M${x} 216q0 -12 14 -12h4`, fill: 'none', stroke: '#334155', 'stroke-width': 4 }),
  s('rect', { x: x + 10, y: 204, width: 14, height: 7, rx: 3, fill: WARM }),
];

/** The jar outline: neck, shoulders, body; also its clip path (the glint stays on the glass). */
const JAR = `M${JX - 58} 132V160C${JX - 92} 166 ${JX - 92} 180 ${JX - 92} 198V270Q${JX - 92} 298 ${JX - 64} 298H${JX + 64}Q${JX + 92} 298 ${JX + 92} 270V198C${JX + 92} 180 ${JX + 92} 166 ${JX + 58} 160V132Z`;

interface Counter { svg: SVGSVGElement; coins: SVGGElement; label: SVGGElement; glows: SVGElement[]; glint: SVGGElement }

/**
 * The street, the counter and the jar. Sky, street, night and window light reuse the Lantern Market tokens (`--es-*`,
 * style.css: day in light, evening in dark); the facade has its own two (`--fs-wall*`). Ids get a per-build prefix.
 */
function drawCounter(st: FinArtState, ambient: boolean, lit: boolean): Counter {
  const n = ++uid;
  const id = (k: string): string => `fs${n}-${k}`;
  const url = (k: string): string => `url(#${id(k)})`;
  const lin = (k: string, stops: [number, string, number?][], x2 = 0, y2 = 1): El => s('linearGradient', { id: id(k), x1: 0, y1: 0, x2, y2 },
    ...stops.map(([offset, c, a]) => s('stop', { offset, style: `stop-color:${c};stop-opacity:${a ?? 1}` })));
  const done = Math.min(st.done, MAX_COINS);
  const stars = TIER.filter((ch) => st.passed.has(ch));
  const glow = (cx: number, cy: number, r: number): SVGElement =>
    s('circle', { cx, cy, r, fill: url('glow'), style: lit ? 'opacity:1' : 'opacity:var(--es-glow)', 'data-glow': '' });
  const glows = [glow(380, 262, 90), glow(195, 270, 60), glow(JX, 230, 120)];
  const coinG = s('g', { 'data-coins': '' }, ...Array.from({ length: done }, (_, i) => coin(i)));
  const label = s('g', {},
    s('rect', { x: JX - 52, y: 136, width: 104, height: 22, rx: 4, fill: '#fef3c7', stroke: '#d97706', 'stroke-width': 1.5 }),
    ...TIER.map((_, k) => s('path', { d: star(STAR_X(k), 147.5, 7), fill: 'none', stroke: '#d6b98a', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' })),
    ...stars.map(sticker));
  const glint = s('g', { class: ambient ? 'cq-shine' : false },
    s('path', { d: `M${JX - 140} 300L${JX - 110} 120H${JX - 92}L${JX - 122} 300Z`, fill: '#ffffff', opacity: 0.55 }));
  // awning: cream canvas, teal stripes following the slope, scalloped valance
  let stripes = '';
  for (let k = 0; k < 17; k++) {
    const [a, b] = [k / 17, (k + 0.5) / 17];
    stripes += `M${112 + 396 * a} 196H${112 + 396 * b}L${100 + 420 * b} 222H${100 + 420 * a}Z`;
  }
  let valance = 'M100 222';
  for (let k = 0; k < 17; k++) valance += 'a12.35 9 0 0 0 24.7 0';
  const svg = s('svg', {
    viewBox: '0 0 1100 400', class: ['block w-full max-lg:[&_text]:hidden', ambient ? 'overflow-visible' : ''].join(' ').trim(), role: 'img',
    'aria-label': tx('scene', { coins: done, stars: stars.length }),
  },
    s('defs', {},
      lin('sky', [[0, 'var(--es-sky0)'], [0.6, 'var(--es-sky1)'], [1, 'var(--es-sky2)']]),
      lin('road', [[0, 'var(--es-road)'], [1, 'var(--es-road)', 0.85]]),
      lin('glass', [[0, 'var(--es-glass)'], [1, '#fcd34d', 0.6]]),
      lin('lid', [[0, '#e2e8f0'], [0.45, '#94a3b8'], [1, '#475569']], 1, 0),
      lin('jar', [[0, '#ffffff', 0.34], [0.35, '#e0f2fe', 0.12], [0.8, '#ffffff', 0.08], [1, '#ffffff', 0.3]], 1, 0),
      s('radialGradient', { id: id('glow') }, s('stop', { offset: 0, style: `stop-color:${WARM};stop-opacity:0.8` }),
        s('stop', { offset: 0.45, style: 'stop-color:#fb923c;stop-opacity:0.25' }), s('stop', { offset: 1, style: 'stop-color:#fb923c;stop-opacity:0' })),
      s('clipPath', { id: id('clip') }, s('path', { d: JAR }))),
    // sky, stars and moon (evening only), the Hai Van ridge, the city, sidewalk, kerb, road, lamps
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: -420, y: -40, width: 1940, height: 380, fill: url('sky') }),
      s('path', { d: 'M70 40h0M200 24h0M330 60h0M460 30h0M640 20h0M760 54h0M880 28h0M990 50h0M1080 22h0M-110 36h0M-250 58h0M1210 42h0M1370 26h0', stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-linecap': 'round', style: 'opacity:var(--es-night)' }),
      s('circle', { cx: 430, cy: 50, r: 15, fill: '#fef3c7', style: 'opacity:var(--es-night)' }), // v22 P3-5: above the shop, clear of the status pill (top right)
      s('path', { d: 'M-420 250Q-200 150 0 214Q190 128 420 206Q620 112 860 196Q1080 134 1300 204Q1420 170 1520 212V330H-420Z', style: 'fill:var(--es-far)' }),
      ...skyline('var(--es-mid)', 320, [64, 96, 78, 120, 86, 104, 70, 92], [58, 46, 70, 52, 64, 48, 56, 74]),
      s('rect', { x: -420, y: 318, width: 1940, height: 18, style: 'fill:var(--es-walk)' }),
      s('path', { d: Array.from({ length: 49 }, (_, i) => `M${-410 + i * 40} 318v18`).join(''), stroke: '#000000', 'stroke-opacity': 0.1, 'stroke-width': 1.5 }),
      s('rect', { x: -420, y: 336, width: 1940, height: 6, style: 'fill:var(--es-curb)' }),
      s('rect', { x: -420, y: 342, width: 1940, height: 70, fill: url('road') }),
      s('path', { d: Array.from({ length: 33 }, (_, i) => `M${-400 + i * 60} 374h32`).join(''), stroke: '#f8fafc', 'stroke-opacity': 0.55, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      ...lamp(1010, url('glow')), ...lamp(-230, url('glow')), ...lamp(1320, url('glow'))),
    // the counter: cornice with a coin emblem, signboard, striped awning, a glass door and the teller window
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 120, y: 120, width: 380, height: 198, style: 'fill:var(--fs-wall)' }),
      s('rect', { x: 484, y: 120, width: 16, height: 198, style: 'fill:var(--fs-wall2)' }),
      s('rect', { x: 110, y: 108, width: 400, height: 16, rx: 3, fill: '#0f766e' }),
      s('rect', { x: 110, y: 120, width: 400, height: 4, fill: '#000000', opacity: 0.2 }),
      s('rect', { x: 268, y: 92, width: 84, height: 18, rx: 4, fill: '#0f766e' }),
      s('circle', { cx: 310, cy: 101, r: 7, fill: '#facc15', stroke: '#a16207', 'stroke-width': 1.5 }),
      s('rect', { x: 160, y: 134, width: 300, height: 46, rx: 8, fill: '#115e59', stroke: '#facc15', 'stroke-width': 3 }),
      // a small jar mark at the sign's left end
      s('path', { d: 'M183 146h14v4c6 2 7 5 7 9v9c0 3 -2 5 -5 5h-18c-3 0 -5 -2 -5 -5v-9c0 -4 1 -7 7 -9z', fill: '#e2e8f0' }),
      s('rect', { x: 181, y: 142, width: 18, height: 5, rx: 1.5, fill: '#facc15' }),
      s('path', { d: 'M112 196H508L520 222H100Z', fill: '#f0fdfa' }),
      s('path', { d: stripes, fill: '#14b8a6' }),
      s('path', { d: `${valance}Z`, fill: '#0f766e' }),
      s('rect', { x: 112, y: 192, width: 396, height: 6, rx: 3, fill: '#134e4a' }),
      // glass door (left opening)
      s('rect', { x: 146, y: 234, width: 98, height: 84, rx: 2, fill: '#134e4a' }),
      s('rect', { x: 152, y: 240, width: 41, height: 78, fill: url('glass') }),
      s('rect', { x: 197, y: 240, width: 41, height: 78, fill: url('glass') }),
      s('path', { d: 'M187 268v16M203 268v16', stroke: '#facc15', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      s('rect', { x: 152, y: 240, width: 86, height: 78, fill: WARM, 'fill-opacity': 0.35, style: 'opacity:var(--es-win)' }),
      // teller window (right opening): a teller behind the glass, a pendant lamp, the counter ledge
      s('rect', { x: 284, y: 234, width: 192, height: 84, rx: 2, fill: '#134e4a' }),
      s('rect', { x: 290, y: 240, width: 180, height: 50, fill: url('glass') }),
      s('rect', { x: 290, y: 240, width: 180, height: 50, fill: WARM, 'fill-opacity': 0.4, style: 'opacity:var(--es-win)' }),
      s('path', { d: 'M372 240v8', stroke: '#334155', 'stroke-width': 1.5 }),
      s('path', { d: 'M364 254h16l-3 -6h-10z', fill: '#334155' }),
      s('circle', { cx: 336, cy: 268, r: 8, fill: '#475569', opacity: 0.75 }),
      s('path', { d: 'M322 290q0 -14 14 -14t14 14z', fill: '#475569', opacity: 0.75 }),
      s('path', { d: 'M402 290v-10h28v10M410 280v-6h12v6', fill: 'none', stroke: '#64748b', 'stroke-width': 1.5 }),
      s('path', { d: 'M310 240h22l-30 50h-12zM400 240h8l-30 50h-8z', fill: '#ffffff', opacity: 0.22 }),
      s('rect', { x: 284, y: 288, width: 192, height: 8, fill: '#92400e' }),
      s('rect', { x: 284, y: 296, width: 192, height: 22, style: 'fill:var(--fs-wall2)' }),
      s('rect', { x: 112, y: 314, width: 396, height: 6, fill: '#000000', opacity: 0.15 })),
    s('text', { x: 316, y: 165, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 22, 'font-weight': 800, fill: '#fef9c3' }, tx('company')),
    s('g', { 'aria-hidden': 'true' }, ...palm(560, ambient)),
    // a bench under the lamp
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 880, y: 294, width: 76, height: 6, rx: 2, fill: '#92400e' }),
      s('rect', { x: 880, y: 282, width: 76, height: 5, rx: 2, fill: '#b45309' }),
      s('path', { d: 'M886 300v18M950 300v18', stroke: '#334155', 'stroke-width': 4 })),
    // the jar on its plinth: light behind it, back glass, the coin pile, front glass with highlights, the lid with its slot
    s('g', { 'aria-hidden': 'true' },
      // ui-ux-v7 I1 (L148): a dark display case behind the jar, so the glass never sinks into a pale sky
      s('rect', { x: JX - 132, y: 84, width: 264, height: 222, rx: 22, fill: '#0f3d3a' }),
      s('rect', { x: JX - 132, y: 84, width: 264, height: 222, rx: 22, fill: 'none', stroke: '#facc15', 'stroke-opacity': 0.55, 'stroke-width': 3 }),
      s('path', { d: `M${JX - 116} 100H${JX + 116}`, stroke: '#ffffff', 'stroke-opacity': 0.12, 'stroke-width': 6, 'stroke-linecap': 'round' }),
      ...glows,
      s('ellipse', { cx: JX, cy: 320, rx: 120, ry: 7, fill: '#000000', opacity: 0.18 }),
      s('rect', { x: JX - 110, y: 298, width: 220, height: 20, rx: 3, fill: '#94a3b8' }),
      s('rect', { x: JX - 110, y: 298, width: 220, height: 5, rx: 2, fill: '#cbd5e1' }),
      s('path', { d: JAR, fill: '#bae6fd', opacity: 0.2 })),
    coinG,
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: JAR, fill: url('jar'), stroke: '#cfeaf5', 'stroke-width': 4, 'stroke-linejoin': 'round' }),
      s('g', { 'clip-path': url('clip') }, glint),
      s('path', { d: `M${JX - 80} 200V266`, stroke: '#ffffff', 'stroke-opacity': 0.75, 'stroke-width': 6, 'stroke-linecap': 'round' }),
      s('path', { d: `M${JX - 46} 140V154M${JX + 74} 214V250`, stroke: '#ffffff', 'stroke-opacity': 0.5, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      s('ellipse', { cx: JX, cy: 110, rx: 66, ry: 8, fill: '#e2e8f0' }),
      s('rect', { x: JX - 66, y: 110, width: 132, height: 22, fill: url('lid') }),
      s('path', { d: Array.from({ length: 11 }, (_, i) => `M${JX - 60 + i * 12} 114v16`).join(''), stroke: '#000000', 'stroke-opacity': 0.12, 'stroke-width': 2 }),
      s('ellipse', { cx: JX, cy: 132, rx: 66, ry: 4, fill: '#334155', opacity: 0.6 }),
      s('rect', { x: JX - 16, y: 106, width: 32, height: 5, rx: 2.5, fill: '#1e293b' }),
      label));
  return { svg, coins: coinG, label, glows, glint };
}

/**
 * The counter and the jar. `ambient` (the Overview): the palm sways and a glint crosses the glass now and then (CSS
 * loops, off under reduced motion), and the street bleeds past the viewBox (ui/domainArt.ts clips it). The dock draws
 * it still. `lit`: the window and jar lights at full strength.
 */
export const scene = (st: FinArtState, ambient = true, lit = false): SVGSVGElement => drawCounter(st, ambient, lit).svg;

// ---- completion dock (ui-ux-v6 S6): the build/play contract of art/logistics; ui/stage.ts owns the dock, Skip, Esc and Lily ----

type Timeline = ReturnType<typeof import('./gsap')['timeline']>;

const stateOf = (hb: Harbor): FinArtState => ({ passed: hb.passed, done: Object.values(hb.bays).reduce((a, b) => a + b, 0) });

interface Dock {
  counter: Counter; coin?: SVGGElement; flyer?: SVGGElement; path?: SVGPathElement; star?: SVGGElement;
  map?: SVGSVGElement; card?: HTMLElement; ring?: SVGCircleElement;
}
const docks = new WeakMap<Ctx, Dock>();

/** A task: the teller window and the jar, close up. A promotion review: the whole counter, the branch map and the title card. */
export function build(c: Ctx): void {
  const before = stateOf(c.before);
  const after = stateOf(c.after);
  const boss = c.tk.beat === 'boss';
  const counter = drawCounter(before, false, false);
  const d: Dock = { counter };
  const stars = TIER.filter((ch) => after.passed.has(ch)).length;
  counter.svg.setAttribute('aria-label', tx('scene', { coins: Math.min(after.done, MAX_COINS), stars }));
  if (before.done < MAX_COINS) {
    d.coin = coin(before.done);
    d.coin.setAttribute('opacity', '0');
    counter.coins.append(d.coin);
  }
  if (boss) {
    if (TIER.includes(c.tk.chapter as (typeof TIER)[number]) && !before.passed.has(c.tk.chapter)) {
      d.star = sticker(c.tk.chapter);
      d.star.setAttribute('opacity', '0');
      counter.label.append(d.star);
    }
    d.map = map(after, false);
    // top left, over the counter's sign: the jar (and its new star) stays in view; no translate class, so GSAP's y never fights it
    d.card = h('div', { class: 'absolute top-3 left-3 w-64 max-w-[55%] rounded-(--r-card) bg-panel p-2 text-center sm:p-3 shadow-(--shadow-2) ring-2 ring-amber-500' },
      h('p', { class: 'm-0 text-body-sm font-semibold text-amber-800 dark:text-amber-200' }, t('anim.promoKicker', { n: c.tk.chapter })),
      h('p', { class: 'm-0 text-body font-bold sm:text-title' }, (c.rankAfter.career ?? c.rankAfter.tier)?.[getLang()] ?? t('career.intern')));
    d.card.style.opacity = '0';
  } else {
    // the teller window and the jar (the dock's 520×276 frame, a little wider); the coin leaves the counter ledge, arcs over to the lid's slot
    counter.svg.setAttribute('viewBox', '290 54 580 308');
    d.path = s('path', { d: `M440 280C500 120 640 64 ${JX} 98`, fill: 'none' });
    const fill = chapterColor(c.tk.chapter).fill;
    d.flyer = s('g', { 'data-flyer': '', opacity: 0 },
      s('circle', { cx: 440, cy: 280, r: 13, class: fill }),
      s('circle', { cx: 440, cy: 280, r: 13, fill: 'none', stroke: '#000000', 'stroke-opacity': 0.3, 'stroke-width': 2.5 }),
      s('circle', { cx: 440, cy: 280, r: 8, fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.6, 'stroke-width': 1.5 }));
    counter.svg.append(d.path, d.flyer);
  }
  docks.set(c, d);
  c.art.replaceChildren(counter.svg, ...(d.map && d.card ? [d.map, d.card] : []));
}

/** End frame: the new coin in its slot; a task: the flying coin gone; a promotion: lights on, the star stuck, card shown. */
function end(d: Dock): void {
  d.coin?.setAttribute('opacity', '1');
  d.flyer?.setAttribute('opacity', '0');
  d.star?.setAttribute('opacity', '1');
  if (d.card) {
    for (const g of d.counter.glows) g.setAttribute('style', 'opacity:1');
    d.card.style.opacity = '1';
    d.ring?.remove();
  }
}

/**
 * Task 2.2 s: the coin arcs from the teller's ledge to the lid (MotionPath, 0–0.8), turns edge-on into the slot
 * (0.8–0.95), drops onto its place in the pile (bounce.out, 0.9–1.5), a glint crosses the glass (1.45–2.1), rest.
 * Promotion 3.0 s: the coin drops (0–0.6), title card (0.4–0.8), the lights come on (0.6–1.4), the star label sticks
 * (back.out, 0.7–1.15, ★ chapters only), the route to the branch this review opens draws in (DrawSVG, 0.6–1.8), the
 * branch pops in (1.7) and pulses once (1.85–2.85). A fast run, or GSAP not in yet, draws the end frame at once.
 */
export async function play(c: Ctx): Promise<void> {
  const d = docks.get(c);
  if (!d) return;
  const g = loadedGsap(); // ui-ux-v6 §2.1: the shared `gsap-*` chunk main fetches when idle after the first screen
  if (c.run.fast || !g) {
    if (!c.run.fast) loadGsap();
    end(d);
    return;
  }
  const tl: Timeline = g.timeline();
  const drop = Math.min(-12, 168 - slot(Math.min(stateOf(c.before).done, MAX_COINS - 1)).y); // from just under the neck
  const { map: m, card } = d;
  if (m && card) {
    if (d.coin) tl.fromTo(d.coin, { y: drop, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'bounce.out' }, 0);
    tl.fromTo(card, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', immediateRender: false }, 0.4)
      .to(d.counter.glows, { opacity: 1, duration: 0.5, ease: 'power1.out', stagger: 0.15 }, 0.6);
    if (d.star) tl.fromTo(d.star, { opacity: 0, scale: 1.8, rotation: -25, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.5)' }, 0.7);
    const b = BRANCHES.find((x) => x.opens === c.tk.chapter);
    if (b) {
      const route = m.querySelector<SVGPathElement>(`path[data-branch="${b.name}"]`);
      const dot = [...m.querySelectorAll<SVGElement>(`[data-branch="${b.name}"]:not(path)`)];
      if (route) tl.fromTo(route, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power1.inOut' }, 0.6);
      if (dot.length) tl.fromTo(dot, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 1.7);
      d.ring = s('circle', { cx: b.x, cy: b.y, r: 7, fill: 'none', 'stroke-width': 3, class: chapterColor(c.tk.chapter).stroke, opacity: 0 });
      m.append(d.ring);
      tl.fromTo(d.ring, { attr: { r: 7 }, opacity: 0.85 }, { attr: { r: 24 }, opacity: 0, duration: 1, ease: 'power2.out', immediateRender: false }, 1.85);
    }
  } else if (d.flyer && d.path) {
    tl.set(d.flyer, { opacity: 1 }, 0)
      .to(d.flyer, { duration: 0.8, ease: 'power1.inOut', motionPath: { path: d.path, align: d.path, alignOrigin: [0.5, 0.5] } }, 0)
      .to(d.flyer, { scaleX: 0.15, y: '+=10', opacity: 0, transformOrigin: '50% 50%', duration: 0.15, ease: 'power1.in' }, 0.8);
    if (d.coin) tl.fromTo(d.coin, { y: drop, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'bounce.out', immediateRender: false }, 0.9);
    tl.fromTo(d.counter.glint, { x: 0 }, { x: 270, duration: 0.65, ease: 'power1.inOut' }, 1.45);
  }
  tl.call(() => end(d), undefined, ms(c) / 1000);
  await g.play(tl, c.run);
}

/** Dock length, for Lily's entry at its end (ui/stage.ts). */
export const ms = (c: Ctx): number => (c.tk.beat === 'boss' ? 3000 : 2200);

/** V22-A: the result map (ui/mapTeach.ts) places branches where this map draws them. */
export { BRANCHES as places };
