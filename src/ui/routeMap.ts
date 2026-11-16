import { t } from '../i18n';
import { ROUTES, type Harbor } from '../scene';
import { chapterColor } from '../theme';
import { s } from './svg';

const FONT = 'system-ui, sans-serif';
/** Stylised land masses (mockup v4): Europe, Asia, Australia, Americas. Not a geographic map. */
const LAND = [
  'M40 60 Q120 40 210 70 Q260 90 250 140 Q200 170 150 150 Q90 140 60 110 Z',
  'M330 40 Q460 20 600 50 Q660 70 650 110 Q610 150 560 140 Q520 170 470 160 Q420 140 380 120 Q330 90 330 40 Z',
  'M600 170 Q660 160 700 190 Q690 225 640 230 Q600 215 600 170 Z',
  'M760 60 Q860 40 930 70 Q940 120 900 140 Q840 150 790 120 Z',
];
/** AA on the sea (sky-100 / slate-800) and on land (slate-300 / slate-700) in both themes. */
const OPEN_TEXT = 'fill-slate-900 dark:fill-slate-100';
const LOCKED_TEXT = 'fill-slate-600 dark:fill-slate-300';
const LOCKED_LINE = 'stroke-slate-400 dark:stroke-slate-500';
const LOCKED_PIN = 'fill-slate-400 dark:fill-slate-500';

export interface MapParts {
  svg: SVGSVGElement;
  ship: SVGGElement;
  wake: SVGPathElement;
  routes: Record<string, SVGPathElement>;
  pins: Record<string, SVGCircleElement>;
  labels: Record<string, SVGTextElement>;
}

/** One line per lane ("Rotterdam: open (3 trips)"): the map's accessible description, and Home's legend below sm. */
export const routeItems = (h: Harbor): string[] => ROUTES.map((r) => {
  const n = h.trips[r.port] ?? 0;
  return t(h.open.has(r.port) ? 'routes.open' : 'routes.locked', { name: r.name }) + (n ? ` (${t('routes.trips', { n })})` : '');
});

/** Lanes, pins, trip counts and the accessible description from `h`. A promotion repaints after its ship arrives. */
export function paintRoutes(p: MapParts, h: Harbor): void {
  for (const r of ROUTES) {
    const open = h.open.has(r.port);
    const color = chapterColor(Math.max(1, r.opens));
    const n = h.trips[r.port] ?? 0;
    const trips = n ? t('routes.trips', { n }) : '';
    p.routes[r.port].setAttribute('class', open ? color.stroke : LOCKED_LINE);
    if (open) p.routes[r.port].removeAttribute('stroke-dasharray');
    else p.routes[r.port].setAttribute('stroke-dasharray', '6 6');
    p.pins[r.port].setAttribute('class', open ? color.fill : LOCKED_PIN);
    p.labels[r.port].setAttribute('class', open ? OPEN_TEXT : LOCKED_TEXT);
    p.labels[r.port].textContent = (open ? '' : '🔒 ') + r.name + (trips ? ` · ${trips}` : '');
  }
  p.svg.setAttribute('aria-label', t('routes.label', { lanes: routeItems(h).join('; ') }));
}

/** Lanes radiating from Tien Sa (L26, mockup v5 coordinates, viewBox 980×260). */
export function routeMap(h: Harbor): MapParts {
  const routes: Record<string, SVGPathElement> = {};
  const pins: Record<string, SVGCircleElement> = {};
  const labels: Record<string, SVGTextElement> = {};
  for (const r of ROUTES) {
    routes[r.port] = s('path', { d: r.d, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' });
    pins[r.port] = s('circle', { cx: r.x, cy: r.y, r: 6 });
    labels[r.port] = s('text', { x: r.lx, y: r.ly });
  }
  const wake = s('path', { fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0, 'aria-hidden': 'true' });
  const ship = s('g', { opacity: 0, 'aria-hidden': 'true' },
    s('path', { d: 'M-11 -2 L11 -2 L8 5 L-8 5 Z', fill: '#1e3a8a' }),
    s('rect', { x: -7, y: -7, width: 8, height: 5, fill: '#d97706' }),
    s('rect', { x: 2, y: -9, width: 5, height: 7, fill: '#f8fafc', stroke: '#1e3a8a', 'stroke-width': 0.8 }));
  // L23/L34: labels are ~4px at 375px, so they hide below sm (Home lists routeItems() as HTML there)
  const svg = s('svg', { viewBox: '0 0 980 260', class: 'block w-full max-sm:[&_text]:hidden', role: 'img' },
    s('rect', { width: 980, height: 260, rx: 12, class: 'fill-sky-100 dark:fill-slate-800' }),
    ...LAND.map((d) => s('path', { d, class: 'fill-slate-300 dark:fill-slate-700' })),
    s('g', {}, ...Object.values(routes)),
    wake,
    s('g', { 'font-family': FONT, 'font-size': 14, 'font-weight': 600 }, ...Object.values(pins), ...Object.values(labels)),
    ship,
    s('circle', { cx: 560, cy: 132, r: 9, fill: '#dc2626', stroke: '#ffffff', 'stroke-width': 3 }),
    s('text', { x: 575, y: 150, 'font-family': FONT, 'font-size': 14, 'font-weight': 700, class: OPEN_TEXT }, t('routes.hub')));
  const parts: MapParts = { svg, ship, wake, routes, pins, labels };
  paintRoutes(parts, h);
  return parts;
}
