import type * as I18n from '../i18n';
import type * as Theme from '../theme';
import type * as Svg from '../ui/svg';

// Main-bundle values come in through initArt (only `import type` from main modules, Plan 6 U3: a value import makes
// Rolldown split main into shared chunks). src/ui/ecomArt.ts calls it right after the chunk loads.
let t: typeof I18n.t;
let chapterColor: typeof Theme.chapterColor;
let s: typeof Svg.s;
export function initArt(deps: { t: typeof I18n.t; chapterColor: typeof Theme.chapterColor; s: typeof Svg.s }): void {
  ({ t, chapterColor, s } = deps);
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

export function deliveryMap(st: EcomArtState): SVGSVGElement {
  const open = openCities(st.passed);
  const route = (c: (typeof CITIES)[number]): SVGPathElement => {
    const mx = (HUB.x + c.x) / 2;
    const my = Math.min(HUB.y, c.y) - 40;
    const isOpen = open.has(c.name);
    return s('path', {
      d: `M${HUB.x} ${HUB.y} Q${mx} ${my} ${c.x} ${c.y}`, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round',
      class: isOpen ? chapterColor(Math.max(1, c.opens)).stroke : 'stroke-slate-400 dark:stroke-slate-500',
      'stroke-dasharray': isOpen ? false : '6 6',
    });
  };
  return s('svg', {
    viewBox: '0 0 980 300', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('ecom.map.label', { cities: deliveryItems(st).join('; ') }),
  },
    s('rect', { width: 980, height: 300, rx: 12, class: 'fill-sky-100 dark:fill-slate-800' }),
    s('path', { d: COAST, class: 'fill-slate-300 dark:fill-slate-700' }),
    s('g', {}, ...CITIES.map(route)),
    s('g', { 'font-family': FONT, 'font-size': 14, 'font-weight': 600 },
      ...CITIES.flatMap((c) => {
        const isOpen = open.has(c.name);
        return [
          s('circle', { cx: c.x, cy: c.y, r: 6, class: isOpen ? chapterColor(Math.max(1, c.opens)).fill : 'fill-slate-400 dark:fill-slate-500' }),
          s('text', { x: c.lx, y: c.ly, class: isOpen ? 'fill-slate-900 dark:fill-slate-100' : 'fill-slate-600 dark:fill-slate-300' }, c.name),
        ];
      })),
    // the warehouse: a small roofed box on the hub
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: `M${HUB.x - 14} ${HUB.y - 2} L${HUB.x} ${HUB.y - 14} L${HUB.x + 14} ${HUB.y - 2} Z`, fill: '#b45309' }),
      s('rect', { x: HUB.x - 11, y: HUB.y - 2, width: 22, height: 14, fill: '#fef3c7', stroke: '#b45309', 'stroke-width': 2 })),
    s('text', { x: HUB.x + 20, y: HUB.y + 4, 'font-family': FONT, 'font-size': 14, 'font-weight': 700, class: 'fill-slate-900 dark:fill-slate-100' }, t('ecom.map.hub')));
}

/** Parcels on the shelf: one per completed task, at most 30 (6 chapters × 5 tasks), coloured by chapter. Shelf r sits at y = 278 − 48r. */
const SHELF = { x: 640, cols: 10, w: 30, h: 22 };

export function storeScene(st: EcomArtState): SVGSVGElement {
  const parcels = Math.min(st.done, 30);
  const box = (i: number): SVGRectElement => {
    const col = i % SHELF.cols;
    const row = Math.floor(i / SHELF.cols);
    return s('rect', {
      x: SHELF.x + col * (SHELF.w + 4), y: 278 - row * 48 - SHELF.h, width: SHELF.w, height: SHELF.h, rx: 3,
      class: chapterColor(1 + Math.floor(i / 5)).fill,
    });
  };
  const stripes = Array.from({ length: 8 }, (_, i) =>
    s('path', { d: `M${90 + i * 40} 120 h40 v34 q-20 14 -40 0 z`, fill: i % 2 ? '#f8fafc' : '#dc2626' }));
  return s('svg', {
    viewBox: '0 0 1100 400', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('ecom.scene.label', { boxes: parcels }),
  },
    s('rect', { width: 1100, height: 400, class: 'fill-sky-100 dark:fill-slate-800' }),
    s('rect', { y: 330, width: 1100, height: 70, class: 'fill-slate-300 dark:fill-slate-700' }),
    // the shop: wall, striped awning, window with lanterns, door
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 100, y: 150, width: 300, height: 180, fill: '#fde68a' }),
      ...stripes,
      s('rect', { x: 130, y: 190, width: 140, height: 90, fill: '#bae6fd', stroke: '#92400e', 'stroke-width': 4 }),
      ...[160, 200, 240].map((cx) => s('ellipse', { cx, cy: 214, rx: 10, ry: 14, fill: '#f97316' })),
      s('rect', { x: 300, y: 220, width: 60, height: 110, fill: '#92400e' }),
      s('circle', { cx: 350, cy: 276, r: 4, fill: '#fde68a' })),
    s('text', { x: 250, y: 108, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 22, 'font-weight': 800, class: 'fill-slate-900 dark:fill-slate-100' }, t('ecom.company')),
    // the warehouse: roof, roller door, shelf of parcels
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: 'M600 120 L820 70 L1040 120 Z', fill: '#475569' }),
      s('rect', { x: 610, y: 120, width: 420, height: 210, fill: '#e2e8f0', stroke: '#475569', 'stroke-width': 3 }),
      ...[0, 1, 2].map((r) => s('rect', { x: 630, y: 278 - r * 48, width: 352, height: 4, fill: '#64748b' })),
      s('rect', { x: 990, y: 200, width: 32, height: 130, fill: '#94a3b8' })),
    s('g', {}, ...Array.from({ length: parcels }, (_, i) => box(i))),
    // the delivery scooter at the kerb
    s('g', { 'aria-hidden': 'true', transform: 'translate(470,282)' },
      s('rect', { x: 18, y: 0, width: 34, height: 26, rx: 3, fill: '#f97316' }),
      s('path', { d: 'M0 34 H70 L78 22 H60', fill: 'none', stroke: '#1e293b', 'stroke-width': 4 }),
      ...[10, 66].map((cx) => s('circle', { cx, cy: 42, r: 8, fill: '#0f172a' }))));
}
