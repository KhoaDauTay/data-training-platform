import type * as I18n from '../i18n';
import type { Harbor } from '../scene';
import type * as Theme from '../theme';
import type * as Dom from '../ui/dom';
import type * as Svg from '../ui/svg';
import type { Ctx } from './logistics';

// Main-bundle values come in through initArt (only `import type` from main modules, Plan 6 U3: a value import makes
// Rolldown split main into shared chunks). src/ui/ecomArt.ts calls it right after the chunk loads.
let t: typeof I18n.t;
let chapterColor: typeof Theme.chapterColor;
let s: typeof Svg.s;
let h: typeof Dom.h;
let getLang: typeof I18n.getLang;
export function initArt(deps: { t: typeof I18n.t; chapterColor: typeof Theme.chapterColor; s: typeof Svg.s; h: typeof Dom.h; getLang: typeof I18n.getLang }): void {
  ({ t, chapterColor, s, h, getLang } = deps);
}

/**
 * E-commerce art (Plan 9): the Lantern Market warehouse and shop (Overview hero) and the delivery map (Map page and the
 * task bar's map dialog). Lazy chunk, like art/logistics (Plan 8b). Plain shapes, no text below lg (L23/L35: the page
 * repeats the lines as HTML through deliveryItems()), decorative parts aria-hidden, colours as hex or whole literal
 * Tailwind classes (tests/theme.test.ts).
 */

const FONT = 'Nunito, system-ui, sans-serif';

/** What the art shows: chapters whose promotion review is passed (derive().passed) and tasks completed in this domain. */
export interface EcomArtState { passed: ReadonlySet<number>; done: number }

/**
 * Delivery cities around the Da Nang warehouse. `name` = customers.city / deliveries.city in the ecom seed
 * (tests/ecomArt.test.ts). `opens`: the chapter whose promotion review opens it (0 = open from the start).
 * x/y: viewBox 980×300, north on the left, south on the right (a stylised coast, not a geographic map).
 */
export const CITIES = [
  { name: 'Da Nang', opens: 0, x: 500, y: 196, lx: 470, ly: 232 },
  { name: 'Hue', opens: 0, x: 420, y: 120, lx: 388, ly: 100 },
  { name: 'Ha Noi', opens: 1, x: 110, y: 80, lx: 70, ly: 60 },
  { name: 'Ho Chi Minh City', opens: 2, x: 810, y: 214, lx: 730, ly: 254 },
  { name: 'Hai Phong', opens: 3, x: 200, y: 54, lx: 196, ly: 34 },
  { name: 'Nha Trang', opens: 4, x: 690, y: 150, lx: 660, ly: 128 },
  { name: 'Can Tho', opens: 5, x: 900, y: 262, lx: 880, ly: 290 },
] as const;
const HUB = { x: 520, y: 160 };
const COAST = 'M20 40 Q160 20 260 60 Q380 90 460 150 Q540 210 660 170 Q780 140 860 210 Q920 250 970 250 L970 300 L20 300 Z';

export const openCities = (passed: ReadonlySet<number>): Set<string> =>
  new Set(CITIES.filter((c) => c.opens === 0 || passed.has(c.opens)).map((c) => c.name));

/** One line per city ("Ha Noi: delivering"): the map's accessible description and the HTML legend below lg. */
export const deliveryItems = (st: EcomArtState): string[] => {
  const open = openCities(st.passed);
  return CITIES.map((c) => (open.has(c.name) ? t('ecom.map.open', { name: c.name }) : t('ecom.map.locked', { name: c.name, n: c.opens })));
};

/** `ring` (ui-ux-v5 B3): a pulse on the city opened last; the dock leaves it out and draws its own, once. */
export function deliveryMap(st: EcomArtState, ring = true): SVGSVGElement {
  const open = openCities(st.passed);
  const last = ring ? CITIES.filter((c) => c.opens && open.has(c.name)).pop() : undefined;
  const route = (c: (typeof CITIES)[number]): SVGPathElement => {
    const mx = (HUB.x + c.x) / 2;
    const my = Math.min(HUB.y, c.y) - 40;
    const isOpen = open.has(c.name);
    return s('path', {
      d: `M${HUB.x} ${HUB.y} Q${mx} ${my} ${c.x} ${c.y}`, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round',
      class: isOpen ? chapterColor(Math.max(1, c.opens)).stroke : 'stroke-slate-400 dark:stroke-slate-500',
      'stroke-dasharray': isOpen ? false : '6 6', 'data-city': c.name,
    });
  };
  return s('svg', {
    viewBox: '0 0 980 300', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('ecom.map.label', { cities: deliveryItems(st).join('; ') }),
  },
    s('rect', { width: 980, height: 300, rx: 12, class: 'fill-sky-100 dark:fill-slate-800' }),
    s('path', { d: COAST, class: 'fill-slate-300 dark:fill-slate-700', stroke: '#ffffff', 'stroke-opacity': 0.55, 'stroke-width': 2 }),
    s('g', {}, ...CITIES.map(route)),
    s('g', { 'font-family': FONT, 'font-size': 14, 'font-weight': 600 },
      ...CITIES.flatMap((c) => {
        const isOpen = open.has(c.name);
        return [
          s('circle', { cx: c.x, cy: c.y, r: 6, class: isOpen ? chapterColor(Math.max(1, c.opens)).fill : 'fill-slate-400 dark:fill-slate-500', 'data-city': c.name }),
          s('text', { x: c.lx, y: c.ly, class: isOpen ? 'fill-slate-900 dark:fill-slate-100' : 'fill-slate-600 dark:fill-slate-300' }, c.name),
        ];
      })),
    last && s('circle', { cx: last.x, cy: last.y, r: 6, fill: 'none', 'stroke-width': 2, class: ['cq-pulse', chapterColor(last.opens).stroke].join(' '), 'aria-hidden': 'true' }),
    // the warehouse: a small roofed box on the hub
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: `M${HUB.x - 14} ${HUB.y - 2} L${HUB.x} ${HUB.y - 14} L${HUB.x + 14} ${HUB.y - 2} Z`, fill: '#b45309' }),
      s('rect', { x: HUB.x - 11, y: HUB.y - 2, width: 22, height: 14, fill: '#fef3c7', stroke: '#b45309', 'stroke-width': 2 })),
    s('text', { x: HUB.x + 20, y: HUB.y + 4, 'font-family': FONT, 'font-size': 14, 'font-weight': 700, class: 'fill-slate-900 dark:fill-slate-100' }, t('ecom.map.hub')));
}

/**
 * ui-ux-v6 S3: the Lantern Market street. Shophouse (tiled roofs, signboard, lit shop window with shelves, three silk
 * lanterns with a glow), the warehouse (racking seen through the open bay, roller door), the delivery scooter, a
 * sidewalk and the road, two skyline layers. Sky, walls and street are theme tokens (`--es-*`, style.css): a day
 * market in light, a night market in dark. Gradient ids get a per-build prefix (the Overview and the dock can both be in the page).
 */
let uid = 0;
type El = SVGElement;
const cxs = (...c: (string | false)[]): string => c.filter(Boolean).join(' ');
const only = (els: (El | null)[]): El[] => els.filter((x): x is El => x !== null);

/** Parcels on the shelf: one per completed task, at most 30 (6 chapters × 5 tasks), coloured by chapter. Shelf r sits at y = 278 − 48r. */
const SHELF = { x: 640, cols: 10, w: 30, h: 22 };
const MAX_PARCELS = 30;
/** A cardboard box: face in the chapter colour, shaded side, lit flap, packing tape, label. The group has no transform (GSAP moves it, §2.3). */
function parcel(i: number): SVGGElement {
  const x = SHELF.x + (i % SHELF.cols) * (SHELF.w + 4);
  const y = 278 - Math.floor(i / SHELF.cols) * 48 - SHELF.h;
  return s('g', { 'data-parcel': '' },
    s('rect', { x, y, width: SHELF.w, height: SHELF.h, rx: 2, class: chapterColor(1 + Math.floor(i / 5)).fill }),
    s('rect', { x: x + SHELF.w - 5, y, width: 5, height: SHELF.h, fill: '#000000', opacity: 0.2 }),
    s('rect', { x, y, width: SHELF.w, height: 3, fill: '#ffffff', opacity: 0.3 }),
    s('rect', { x: x + 11, y, width: 6, height: SHELF.h, fill: '#ffffff', opacity: 0.32 }),
    s('rect', { x: x + 3, y: y + 11, width: 6, height: 5, fill: '#ffffff', opacity: 0.75 }));
}
/** Hoi An silk lanterns: x, silk colour, its shaded edge. */
const LANTERNS: [number, string, string][] = [[150, '#ef4444', '#991b1b'], [205, '#fbbf24', '#b45309'], [260, '#fb923c', '#c2410c']];
const GOODS = ['#0d9488', '#f59e0b', '#e11d48', '#6366f1', '#84cc16', '#0ea5e9'];
const WARM = '#fde68a';

/** The delivery scooter, facing right, wheels on the ground at (x, y). The outer group (`data-rider`) has no transform: the dock drives it. */
function scooter(x: number, y: number): SVGGElement {
  const wheel = (cx: number): El[] => [
    s('circle', { cx, cy: -11, r: 11, fill: '#111827' }),
    s('circle', { cx, cy: -11, r: 5.5, fill: '#cbd5e1' }),
    s('circle', { cx, cy: -11, r: 2, fill: '#475569' }),
  ];
  return s('g', { 'data-rider': '', 'aria-hidden': 'true' },
    s('g', { transform: `translate(${x},${y})` },
      s('ellipse', { cx: 44, cy: 0, rx: 50, ry: 4, fill: '#000000', opacity: 0.22 }),
      ...wheel(12), ...wheel(80),
      // rear shell, footboard and leg shield in brand teal, a lit edge on top
      s('path', { d: 'M-2 -17C-2 -33 10 -39 30 -37L46 -35L50 -21L66 -21L72 -17Z', fill: '#0f766e' }),
      s('path', { d: 'M4 -30C10 -36 22 -37 34 -36', fill: 'none', stroke: '#5eead4', 'stroke-width': 2, 'stroke-linecap': 'round' }),
      s('path', { d: 'M64 -19L73 -52L83 -52L80 -19Z', fill: '#0f766e' }),
      s('path', { d: 'M76 -24L88 -14', stroke: '#334155', 'stroke-width': 4, 'stroke-linecap': 'round' }),
      s('path', { d: 'M70 -58L76 -52M66 -58H80', fill: 'none', stroke: '#1f2937', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      s('circle', { cx: 84, cy: -46, r: 3.5, fill: '#fde047' }),
      s('path', { d: 'M14 -39Q26 -46 42 -41L42 -37L12 -36Z', fill: '#1f2937' }),
      // delivery box on the rear rack: lid, shaded side, the lantern mark
      s('rect', { x: -8, y: -72, width: 36, height: 32, rx: 3, fill: '#f97316' }),
      s('rect', { x: -8, y: -72, width: 36, height: 6, rx: 2, fill: '#c2410c' }),
      s('rect', { x: 22, y: -66, width: 6, height: 26, fill: '#000000', opacity: 0.18 }),
      s('circle', { cx: 10, cy: -54, r: 5, fill: '#fef3c7' }),
      s('rect', { x: -6, y: -40, width: 34, height: 3, fill: '#334155' })));
}

/** A skyline across the whole bleed (-420…1520), so a wide card never shows empty bands; `windows`: lit at night (--es-win). */
function skyline(fill: string, base: number, hs: number[], ws: number[], windows: boolean): El[] {
  let d = `M-420 ${base}`;
  let lit = '';
  for (let x = -420, i = 0; x < 1520; i++) {
    const w = ws[i % ws.length];
    const hh = hs[i % hs.length];
    d += `V${base - hh}H${x + w}`;
    if (windows) {
      for (let wy = base - hh + 10; wy < base - 12; wy += 16) {
        for (let wx = x + 8; wx < x + w - 10; wx += 14) if ((wx * 7 + wy * 3 + i) % 5 < 2) lit += `M${wx} ${wy}h5v7h-5z`;
      }
    }
    x += w;
  }
  return only([s('path', { d: `${d}V${base}Z`, style: `fill:${fill}` }), lit ? s('path', { d: lit, fill: WARM, style: 'opacity:var(--es-win)' }) : null]);
}

/** A tiled roof over [x0, x1] with its eave at `y`: terracotta gradient, tile lines, scalloped tile ends, a curled ridge. */
function roof(x0: number, x1: number, y: number, depth: number, fill: string, ridge: boolean): El[] {
  let lines = '';
  for (let x = x0 + 12; x < x1 - 4; x += 12) lines += `M${x} ${y - depth + 2}V${y - 1}`;
  let tiles = `M${x0 - 10} ${y}`;
  for (let x = x0 - 10; x < x1 + 10; x += 12) tiles += 'a6 6 0 0 0 12 0';
  return only([
    s('path', { d: `M${x0 - 22} ${y}Q${x0 - 10} ${y - depth + 4} ${x0 + 8} ${y - depth}L${x1 - 8} ${y - depth}Q${x1 + 10} ${y - depth + 4} ${x1 + 22} ${y}Z`, fill }),
    s('path', { d: lines, stroke: '#000000', 'stroke-opacity': 0.2, 'stroke-width': 1.5 }),
    s('path', { d: `${tiles}V${y}Z`, fill: '#7c2d12' }),
    ridge ? s('rect', { x: x0, y: y - depth - 8, width: x1 - x0, height: 9, rx: 4.5, fill: '#7c2d12' }) : null,
    ridge ? s('path', { d: `M${x0 - 2} ${y - depth - 4}q-10 -2 -12 -12M${x1 + 2} ${y - depth - 4}q10 -2 12 -12`, fill: 'none', stroke: '#7c2d12', 'stroke-width': 4, 'stroke-linecap': 'round' }) : null,
  ]);
}

interface Store { svg: SVGSVGElement; parcels: SVGGElement; glows: SVGElement[]; rider: SVGGElement; shutter?: SVGRectElement }
/**
 * Draws the street; storeScene() returns the SVG, the dock keeps the parts it animates. `task`: the dock's close-up
 * (roller door open with a shutter to close, the scooter waiting in front of it).
 */
function drawStore(st: EcomArtState, ambient: boolean, lit: boolean, task = false): Store {
  const n = ++uid;
  const id = (k: string): string => `es${n}-${k}`;
  const url = (k: string): string => `url(#${id(k)})`;
  const lin = (k: string, stops: [number, string, number?][]): El => s('linearGradient', { id: id(k), x1: 0, y1: 0, x2: 0, y2: 1 },
    ...stops.map(([offset, c, a]) => s('stop', { offset, style: `stop-color:${c};stop-opacity:${a ?? 1}` })));
  const parcels = Math.min(st.done, MAX_PARCELS);
  const glows = LANTERNS.map(([x]) => s('circle', { cx: x, cy: 247, r: 54, fill: url('glow'), style: lit ? 'opacity:1' : 'opacity:var(--es-glow)', 'data-glow': '' }));
  const lanterns = LANTERNS.map(([x, c0], i) => s('g', { class: ambient && 'cq-sway', style: ambient && `animation-delay:${-1.1 * i}s` },
    s('path', { d: `M${x} 212V229`, stroke: '#44403c', 'stroke-width': 1.5 }),
    s('rect', { x: x - 7, y: 228, width: 14, height: 5, rx: 1.5, fill: '#78350f' }),
    s('ellipse', { cx: x, cy: 248, rx: 16, ry: 17, fill: url(`l${i}`), 'data-lantern': '' }),
    s('path', { d: `M${x - 8} 233Q${x - 14} 248 ${x - 8} 263M${x} 231V265M${x + 8} 233Q${x + 14} 248 ${x + 8} 263`, fill: 'none', stroke: '#000000', 'stroke-opacity': 0.22, 'stroke-width': 1.2 }),
    s('rect', { x: x - 7, y: 263, width: 14, height: 5, rx: 1.5, fill: '#78350f' }),
    s('path', { d: `M${x} 268v13`, stroke: c0, 'stroke-width': 2.5, 'stroke-linecap': 'round' })));
  // goods on the shop's two shelves, seen through the glass
  const goods: El[] = [];
  for (const [y, seed] of [[262, 1], [286, 4]] as const) {
    for (let x = 124, i = seed; x < 284; i++) {
      const w = 9 + ((i * 5) % 8);
      const hh = 9 + ((i * 3) % 9);
      goods.push(s('rect', { x, y: y - hh, width: w, height: hh, rx: 1.5, fill: GOODS[i % GOODS.length] }));
      x += w + 3;
    }
  }
  let corr = '';
  for (let x = 614; x < 1030; x += 9) corr += `M${x} 138V318`;
  let slats = '';
  for (let y = 180; y < 318; y += 7) slats += `M994 ${y}H1026`;
  let rail = '';
  for (let x = 110; x < 414; x += 10) rail += `M${x} 188V200`;
  const parcelG = s('g', { 'data-parcels': '' }, ...Array.from({ length: parcels }, (_, i) => parcel(i)));
  const rider = task ? scooter(940, 330) : scooter(470, 334);
  const shutter = task ? s('rect', { x: 994, y: 174, width: 32, height: 0, fill: '#94a3b8' }) : undefined;
  const lamp = (x: number): El[] => [
    s('circle', { cx: x + 16, cy: 212, r: 44, fill: url('glow'), style: 'opacity:var(--es-glow)' }),
    s('rect', { x: x - 2, y: 214, width: 5, height: 108, fill: '#334155' }),
    s('path', { d: `M${x} 216q0 -12 14 -12h4`, fill: 'none', stroke: '#334155', 'stroke-width': 4 }),
    s('rect', { x: x + 10, y: 204, width: 14, height: 7, rx: 3, fill: WARM }),
  ];
  const svg = s('svg', {
    viewBox: '0 0 1100 400', class: cxs('block w-full max-lg:[&_text]:hidden', ambient && 'overflow-visible'), role: 'img',
    'aria-label': t('ecom.scene.label', { boxes: parcels }),
  },
    s('defs', {},
      lin('sky', [[0, 'var(--es-sky0)'], [0.6, 'var(--es-sky1)'], [1, 'var(--es-sky2)']]),
      lin('roof', [[0, '#c2410c'], [1, '#8a3412']]),
      lin('shed', [[0, 'var(--es-shed0)'], [1, 'var(--es-shed1)']]),
      lin('wroof', [[0, 'var(--es-roof)'], [1, 'var(--es-roof)', 0.8]]),
      lin('glass', [[0, 'var(--es-glass)'], [1, '#fcd34d', 0.7]]),
      lin('road', [[0, 'var(--es-road)'], [1, 'var(--es-road)', 0.85]]),
      s('radialGradient', { id: id('glow') }, s('stop', { offset: 0, style: `stop-color:${WARM};stop-opacity:0.85` }),
        s('stop', { offset: 0.4, style: 'stop-color:#fb923c;stop-opacity:0.3' }), s('stop', { offset: 1, style: 'stop-color:#fb923c;stop-opacity:0' })),
      ...LANTERNS.map(([, c0, c1], i) => s('radialGradient', { id: id(`l${i}`), cx: 0.4, cy: 0.38, r: 0.7 },
        s('stop', { offset: 0, style: 'stop-color:#fff7d6' }), s('stop', { offset: 0.45, style: `stop-color:${c0}` }), s('stop', { offset: 1, style: `stop-color:${c1}` })))),
    // sky, stars and moon (night only), two skylines, sidewalk, kerb, road with lane marks, street lamps
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: -420, y: -40, width: 1940, height: 380, fill: url('sky') }),
      s('path', { d: 'M60 40h0M180 22h0M300 58h0M420 30h0M610 18h0M700 52h0M840 26h0M960 48h0M1060 20h0M-120 34h0M-260 60h0M1200 40h0M1360 24h0M520 84h0', stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-linecap': 'round', style: 'opacity:var(--es-night)' }),
      s('circle', { cx: 540, cy: 60, r: 15, fill: '#fef3c7', style: 'opacity:var(--es-night)' }),
      ...skyline('var(--es-far)', 300, [120, 160, 95, 180, 140, 110, 170, 130], [70, 50, 84, 60, 76, 54, 66, 90], false),
      ...skyline('var(--es-mid)', 320, [70, 110, 85, 130, 95, 120, 75, 100, 90], [60, 44, 70, 52, 66, 48, 58, 72, 40], true),
      s('rect', { x: -420, y: 318, width: 1940, height: 18, style: 'fill:var(--es-walk)' }),
      s('path', { d: Array.from({ length: 49 }, (_, i) => `M${-410 + i * 40} 318v18`).join(''), stroke: '#000000', 'stroke-opacity': 0.1, 'stroke-width': 1.5 }),
      s('rect', { x: -420, y: 336, width: 1940, height: 6, style: 'fill:var(--es-curb)' }),
      s('rect', { x: -420, y: 342, width: 1940, height: 70, fill: url('road') }),
      s('path', { d: Array.from({ length: 33 }, (_, i) => `M${-400 + i * 60} 374h32`).join(''), stroke: '#f8fafc', 'stroke-opacity': 0.55, 'stroke-width': 3, 'stroke-linecap': 'round' }),
      ...lamp(540), ...lamp(-220), ...lamp(1290)),
    // the shophouse: upper storey with shutters, balcony and signboard; pent roof; shop window and glass door
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 98, y: 104, width: 324, height: 214, style: 'fill:var(--es-wall)' }),
      s('rect', { x: 404, y: 104, width: 18, height: 214, style: 'fill:var(--es-wall2)' }),
      ...roof(98, 422, 112, 18, url('roof'), true),
      ...[112, 364].flatMap((x) => [
        s('rect', { x, y: 128, width: 44, height: 56, rx: 2, fill: '#134e4a' }),
        s('path', { d: `M${x + 22} 128V184${Array.from({ length: 6 }, (_, i) => `M${x + 3} ${135 + i * 8}H${x + 41}`).join('')}`, stroke: '#2dd4bf', 'stroke-opacity': 0.45, 'stroke-width': 2 }),
      ]),
      s('path', { d: `M104 188H416M104 200H416${rail}`, stroke: '#78350f', 'stroke-width': 2.5 }),
      s('rect', { x: 172, y: 126, width: 176, height: 42, rx: 6, fill: '#b91c1c', stroke: '#facc15', 'stroke-width': 3 }),
      ...roof(104, 416, 220, 14, url('roof'), false),
      s('rect', { x: 112, y: 234, width: 190, height: 80, rx: 2, fill: '#7c2d12' }),
      s('rect', { x: 118, y: 240, width: 178, height: 68, fill: url('glass') }),
      ...goods,
      s('path', { d: 'M120 262H294M120 286H294', stroke: '#78350f', 'stroke-width': 3 }),
      s('rect', { x: 205, y: 240, width: 4, height: 68, fill: '#7c2d12' }),
      s('path', { d: 'M150 240h26l-36 68h-24zM232 240h10l-36 68h-10z', fill: '#ffffff', opacity: 0.2 }),
      s('rect', { x: 318, y: 232, width: 88, height: 86, rx: 2, fill: '#7c2d12' }),
      s('rect', { x: 324, y: 238, width: 36, height: 80, fill: url('glass') }),
      s('rect', { x: 364, y: 238, width: 36, height: 80, fill: url('glass') }),
      s('path', { d: 'M354 272v14M370 272v14', stroke: '#facc15', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      s('rect', { x: 92, y: 314, width: 336, height: 6, fill: '#000000', opacity: 0.15 })),
    s('text', { x: 260, y: 154, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 20, 'font-weight': 800, fill: '#fef9c3' }, t('ecom.company')),
    // glows stay outside the swaying groups (cq-sway pivots on the lantern's own box)
    s('g', { 'aria-hidden': 'true' }, ...glows, ...lanterns),
    // the warehouse: gable roof, corrugated wall, sign band, open bay with racking, roller door, a wall lamp
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: 'M592 132L825 86L1058 132Z', fill: url('wroof') }),
      s('rect', { x: 596, y: 130, width: 458, height: 8, fill: '#000000', opacity: 0.3 }),
      s('rect', { x: 610, y: 138, width: 420, height: 180, fill: url('shed') }),
      s('path', { d: corr, stroke: '#000000', 'stroke-opacity': 0.07, 'stroke-width': 2 }),
      s('rect', { x: 700, y: 146, width: 250, height: 16, rx: 8, fill: '#0f766e' }),
      s('rect', { x: 714, y: 150, width: 12, height: 8, rx: 1, fill: '#f0fdfa' }),
      s('rect', { x: 626, y: 170, width: 362, height: 148, style: 'fill:var(--es-inside)' }),
      s('rect', { x: 626, y: 170, width: 362, height: 6, fill: '#000000', opacity: 0.3 }),
      ...[630, 805, 980].map((x) => s('rect', { x, y: 176, width: 6, height: 142, fill: '#1d4ed8' })),
      ...[0, 1, 2].map((r) => s('rect', { x: 630, y: 278 - r * 48, width: 356, height: 5, fill: '#f97316' })),
      // stock on pallets under the bottom beam (plain cardboard: only the shelf parcels carry chapter colours)
      ...[[650, 2], [712, 1], [846, 2], [916, 1]].flatMap(([x, k]) => [
        s('rect', { x: x - 3, y: 312, width: 46, height: 6, fill: '#a16207' }),
        ...Array.from({ length: k }, (_, j) => s('rect', { x: x + j * 21, y: 293, width: 19, height: 19, rx: 1.5, fill: '#c8955a', stroke: '#8a5a2b', 'stroke-width': 1.2 })),
      ]),
      s('rect', { x: 990, y: 166, width: 40, height: 8, rx: 2, fill: '#475569' }),
      s('rect', { x: 994, y: 174, width: 32, height: 144, fill: '#94a3b8' }),
      s('path', { d: slats, stroke: '#475569', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }),
      task && s('rect', { x: 994, y: 174, width: 32, height: 144, style: 'fill:var(--es-inside)' }),
      shutter,
      s('circle', { cx: 960, cy: 168, r: 40, fill: url('glow'), style: 'opacity:var(--es-glow)' })),
    parcelG,
    // the scooter at the kerb (the CSS loop moves a wrapper: the scooter keeps its own transform attribute)
    ambient ? s('g', { class: 'cq-scoot' }, rider) : rider);
  return { svg, parcels: parcelG, glows, rider, shutter };
}

/**
 * The shop and warehouse. `ambient` (the Overview, ui-ux-v5 B3): the lanterns sway and the scooter leaves the kerb and
 * comes back (CSS loops, off under reduced motion), and the street bleeds past the viewBox so a wide card shows no
 * empty bands (ui/ecomArt.ts clips it). The dock draws it still. `lit`: the lanterns glow at full strength.
 */
export const storeScene = (st: EcomArtState, ambient = true, lit = false): SVGSVGElement => drawStore(st, ambient, lit).svg;

// ---- completion dock (ui-ux-v5 B3, on GSAP since ui-ux-v6 S3): the build/play contract of art/logistics; ui/stage.ts owns the dock, Skip, Esc and Lily ----

type Gsap = typeof import('./gsap');
type Timeline = ReturnType<Gsap['timeline']>;
let gsapMod: Promise<Gsap> | undefined;
let gsapReady: Gsap | undefined;
/** ui-ux-v6 §2.1: the shared lazy `gsap-*` chunk (ui/ecomArt.ts asks for it once this chunk is in). A failed load is dropped so the next call retries. */
export const prefetchGsap = (): void => {
  gsapMod ??= import('./gsap').then((m) => (gsapReady = m), (e: unknown) => { gsapMod = undefined; throw e; });
  gsapMod.catch(() => {});
};

const stateOf = (hb: Harbor): EcomArtState => ({ passed: hb.passed, done: Object.values(hb.bays).reduce((a, b) => a + b, 0) });

interface Dock { store: Store; box?: SVGGElement; road?: SVGPathElement; map?: SVGSVGElement; card?: HTMLElement; ring?: SVGCircleElement }
const docks = new WeakMap<Ctx, Dock>();

/** A task: the warehouse close-up. A promotion review: the whole shop, the delivery map and the title card. */
export function build(c: Ctx): void {
  const before = stateOf(c.before);
  const after = stateOf(c.after);
  const boss = c.tk.beat === 'boss';
  const store = drawStore(before, false, false, !boss);
  store.svg.setAttribute('aria-label', t('ecom.scene.label', { boxes: Math.min(after.done, MAX_PARCELS) }));
  const d: Dock = { store };
  if (before.done < MAX_PARCELS) {
    d.box = parcel(before.done);
    d.box.setAttribute('opacity', '0');
    store.parcels.append(d.box);
  }
  if (boss) {
    d.map = deliveryMap(after, false);
    d.card = h('div', { class: 'absolute top-3 left-1/2 w-72 max-w-[calc(100vw-4rem)] -translate-x-1/2 rounded-2xl bg-panel p-3 text-center shadow-xl ring-2 ring-amber-500' },
      h('p', { class: 'm-0 text-sm font-semibold text-amber-800 dark:text-amber-200' }, t('anim.promoKicker', { n: c.tk.chapter })),
      h('p', { class: 'm-0 text-lg font-bold' }, (c.rankAfter.career ?? c.rankAfter.tier)?.[getLang()] ?? t('career.intern')));
    d.card.style.opacity = '0';
  } else {
    // the warehouse and the street in front of it; the roller door is open and the scooter waits at it
    store.svg.setAttribute('viewBox', '590 80 520 276');
    d.road = s('path', { d: 'M982 330C1030 330 1036 350 1080 350L1220 350', fill: 'none' });
    store.svg.append(d.road);
  }
  docks.set(c, d);
  c.art.replaceChildren(store.svg, ...(d.map && d.card ? [d.map, d.card] : []));
}

/** End frame: the new parcel on its shelf; a task: door shut, scooter gone; a promotion: lanterns lit, card shown (the map is drawn from `after`). */
function end(d: Dock): void {
  d.box?.setAttribute('opacity', '1');
  if (d.card) {
    for (const g of d.store.glows) g.setAttribute('style', 'opacity:1');
    d.card.style.opacity = '1';
    d.card.style.transform = '';
    d.ring?.remove();
  } else {
    d.store.shutter?.setAttribute('height', '144');
    d.store.rider.setAttribute('opacity', '0');
  }
}

/**
 * Task 2.2 s: the parcel drops onto its shelf (0–0.6, bounce.out), the roller door comes down (0.6–1.0), the scooter
 * rides off along the street (MotionPath, 1.0–1.9), rest. Promotion 3.0 s: parcel (0–0.6), title card (0.4–0.8),
 * lanterns light one after another (0.6–1.5), the route to the city this review opens draws in (DrawSVG, 0.6–1.8),
 * the city pops in (1.7) and pulses once (1.85–2.85). A fast run, or GSAP not in yet, draws the end frame at once.
 */
export async function play(c: Ctx): Promise<void> {
  const d = docks.get(c);
  if (!d) return;
  const g = gsapReady;
  if (c.run.fast || !g) {
    if (!c.run.fast) prefetchGsap();
    end(d);
    return;
  }
  const tl: Timeline = g.timeline();
  if (d.box) tl.fromTo(d.box, { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'bounce.out' }, 0);
  const { map, card } = d;
  if (map && card) {
    tl.fromTo(card, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', immediateRender: false }, 0.4)
      .to(d.store.glows, { opacity: 1, duration: 0.5, ease: 'power1.out', stagger: 0.2 }, 0.6);
    const city = CITIES.find((x) => x.opens === c.tk.chapter);
    if (city) {
      const route = map.querySelector<SVGPathElement>(`path[data-city="${city.name}"]`);
      const dot = [...map.querySelectorAll<SVGElement>(`[data-city="${city.name}"]:not(path)`)];
      if (route) tl.fromTo(route, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power1.inOut' }, 0.6);
      if (dot.length) tl.fromTo(dot, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 1.7);
      d.ring = s('circle', { cx: city.x, cy: city.y, r: 6, fill: 'none', 'stroke-width': 3, class: chapterColor(c.tk.chapter).stroke, opacity: 0 });
      map.append(d.ring);
      tl.fromTo(d.ring, { attr: { r: 6 }, opacity: 0.85 }, { attr: { r: 22 }, opacity: 0, duration: 1, ease: 'power2.out', immediateRender: false }, 1.85);
    }
  } else {
    if (d.store.shutter) tl.to(d.store.shutter, { attr: { height: 144 }, duration: 0.4, ease: 'power2.in' }, 0.6);
    if (d.road) {
      tl.to(d.store.rider, { duration: 0.9, ease: 'power1.in', motionPath: { path: d.road, align: d.road, alignOrigin: [0.5, 1] } }, 1.0)
        .to(d.store.rider, { opacity: 0, duration: 0.3, ease: 'none' }, 1.6);
    }
  }
  tl.call(() => end(d), undefined, ms(c) / 1000);
  await g.play(tl, c.run);
}

/** Dock length, for Lily's entry at its end (ui/stage.ts). */
export const ms = (c: Ctx): number => (c.tk.beat === 'boss' ? 3000 : 2200);
