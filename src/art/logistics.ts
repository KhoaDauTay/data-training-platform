// Plan 8b D8b-2: the Logistics pictures (Tien Sa scene, route map) and the bodies of the completion scenes, one lazy
// chunk loaded through src/art/load.ts. Moved verbatim from ui/harbor.ts, ui/routeMap.ts and ui/stage.ts; the dock,
// Skip/Esc and the announced sentence stay in ui/stage.ts (main) so a completion is announced before this chunk arrives.
import type { getLang as GetLang, Key, t as T } from '../i18n';
import type { Rank } from '../progress';
import type { GATE_WAIT as GateWait, Harbor, Lane, routeOpenedBy as RouteOpenedBy, ROUTES as Routes, Scene, STEPS as Steps } from '../scene';
import type { CHAPTER_COLOR as ChapterColors, chapterColor as ChapterColorOf, cx as Cx } from '../theme';
import type { Lang, textOf as TextOf, Ticket } from '../tickets';
import type { avatar as Avatar } from '../ui/avatar';
import type { h as H, nodes as Nodes, reducedMotion as ReducedMotion } from '../ui/dom';
import type { mascot as Mascot } from '../ui/mascots';
import type { callout as Callout, routeItems as RouteItems } from '../ui/routeText';
import type { s as S } from '../ui/svg';

/**
 * Everything this chunk uses from main, handed over by src/art/load.ts (D8b-2 stop rule): a runtime import of a main
 * module here makes Rolldown hoist the shared code into a preloaded chunk (Plan 6 U3), measured at +75 KB on the first try.
 */
export interface ArtDeps {
  t: typeof T; getLang: typeof GetLang; textOf: typeof TextOf;
  ROUTES: typeof Routes; STEPS: typeof Steps; GATE_WAIT: typeof GateWait; routeOpenedBy: typeof RouteOpenedBy;
  CHAPTER_COLOR: typeof ChapterColors; chapterColor: typeof ChapterColorOf; cx: typeof Cx; PILL: string; DONE_PILL: string;
  h: typeof H; s: typeof S; nodes: typeof Nodes; reducedMotion: typeof ReducedMotion;
  avatar: typeof Avatar; mascot: typeof Mascot; callout: typeof Callout; routeItems: typeof RouteItems;
}
let t: typeof T, getLang: typeof GetLang, textOf: typeof TextOf;
let ROUTES: typeof Routes, STEPS: typeof Steps, GATE_WAIT: typeof GateWait, routeOpenedBy: typeof RouteOpenedBy;
let CHAPTER_COLOR: typeof ChapterColors, chapterColor: typeof ChapterColorOf, cx: typeof Cx, PILL: string, DONE_PILL: string;
let h: typeof H, s: typeof S, nodes: typeof Nodes, reducedMotion: typeof ReducedMotion;
let avatar: typeof Avatar, mascot: typeof Mascot, callout: typeof Callout, routeItems: typeof RouteItems;
/** Called once by loadArt() before anything else here runs. */
export function init(d: ArtDeps): void {
  ({ t, getLang, textOf, ROUTES, STEPS, GATE_WAIT, routeOpenedBy, CHAPTER_COLOR, chapterColor, cx, PILL, DONE_PILL } = d);
  ({ h, s, nodes, reducedMotion, avatar, mascot, callout, routeItems } = d);
}

// ---- the Tien Sa scene (was ui/harbor.ts) ----

/** Tallest stack drawn per yard bay; more containers show as "+n" (chapters have 5–6 tickets). */
export const MAX_TIERS = 6;
/** Crane home: trolley above the berthed ship, spreader at rest. The stage (Task 18) tweens from here. */
export const CRANE = { x: 555, y: 170 } as const;

/** The parts Task 18 animates. Everything else in the scene is static or a CSS ambient loop. */
export interface HarborParts {
  svg: SVGSVGElement;
  yard: SVGGElement;
  drop: SVGGElement;
  ship: SVGGElement;
  trolley: SVGGElement;
  cable: SVGLineElement;
  spreader: SVGRectElement;
  carry: SVGRectElement;
  truck: SVGGElement;
  truckBox: SVGRectElement;
  barrier: SVGGElement;
  shutter: SVGRectElement;
  gateTag: SVGGElement;
  gateText: SVGTextElement;
}

export interface Box { x: number; y: number; w: number; h: number; base: number }
/** Bay of chapter `ch` (1–6 front row, 7–12 back row, smaller), tier 0 = ground. Geometry of mockup v5 (viewBox 1100×400). */
export function bayBox(ch: number, tier: number): Box {
  const front = ch <= 6;
  const i = front ? ch - 1 : ch - 7;
  const w = front ? 32 : 30;
  const h = front ? 9 : 8;
  const x = (front ? 790 : 800) + i * 36;
  const base = front ? 312 : 270;
  return { x, y: base - h * (tier + 1), w, h, base };
}

const FONT = 'system-ui, sans-serif';
let uid = 0;

/** Redraws the yard from `h.bays`. `fresh`: chapters whose top container gets a bright edge and a "New" tag. */
export function drawYard(p: HarborParts, h: Harbor, fresh: ReadonlySet<number> = new Set()): void {
  const out: SVGElement[] = [];
  for (const ch of [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]) { // back row first: the front row covers it
    const pad = bayBox(ch, -1);
    out.push(s('rect', { x: pad.x - 1, y: pad.base, width: pad.w + 2, height: 2, fill: '#64748b' }));
    const n = h.bays[ch] ?? 0;
    const shown = Math.min(n, MAX_TIERS);
    for (let k = 0; k < shown; k++) {
      const b = bayBox(ch, k);
      const top = fresh.has(ch) && k === shown - 1;
      out.push(s('rect', {
        x: b.x, y: b.y, width: b.w, height: b.h - 0.6, rx: 0.8, class: chapterColor(ch).fill,
        stroke: top ? '#ffffff' : false, 'stroke-width': top ? 1.6 : false,
      }));
      out.push(s('rect', { x: b.x + 2, y: b.y + 1.5, width: b.w - 4, height: 1, fill: '#ffffff', opacity: 0.25 }));
    }
    const label = n > MAX_TIERS ? `+${n - MAX_TIERS}` : fresh.has(ch) && shown ? t('harbor.new') : '';
    if (label) {
      const b = bayBox(ch, shown);
      out.push(s('text', { x: b.x + b.w / 2, y: b.y + 7, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 12, 'font-weight': 700, fill: '#0f172a' }, label));
    }
  }
  p.yard.replaceChildren(...out);
}

/**
 * The Tien Sa scene (L26). `ambient`: CSS loops (waves, smoke, lighthouse, departing ship, crane) for Home; the stage
 * passes false and drives the ship, crane, truck, barrier and shutter itself. `crop`: the stage's close-up of berth,
 * crane load path (y ≥ 140, so the lifted container stays in frame), yard, gate and CFS. Gradient ids get a per-build prefix: Home (hidden) and the stage can both be in the DOM.
 */
export function harborScene(h: Harbor, opts: { ambient: boolean; current: number; crop?: boolean; fresh?: ReadonlySet<number> }): HarborParts {
  const n = ++uid;
  const id = (k: string): string => `cq${n}-${k}`;
  const url = (k: string): string => `url(#${id(k)})`;
  const amb = (cls: string): string | false => (opts.ambient ? cls : false);
  const grad = (k: string, stops: [number, string, number?][]): SVGLinearGradientElement =>
    s('linearGradient', { id: id(k), x1: 0, y1: 0, x2: 0, y2: 1 },
      ...stops.map(([offset, color, alpha]) => s('stop', { offset, 'stop-color': color, 'stop-opacity': alpha ?? 1 })));
  const text = (x: number, y: number, size: number, fill: string, label: string, anchor = 'start'): SVGTextElement =>
    s('text', { x, y, 'text-anchor': anchor, 'font-family': FONT, 'font-size': size, 'font-weight': 700, fill }, label);

  const yard = s('g', {});
  const drop = s('g', { 'aria-hidden': 'true' });
  const cable = s('line', { x1: 0, y1: 125, x2: 0, y2: CRANE.y, stroke: '#334155', 'stroke-width': 2 });
  const spreader = s('rect', { x: -18, y: CRANE.y, width: 36, height: 4, fill: '#facc15' });
  const carry = s('rect', { x: -16, y: CRANE.y + 4, width: 32, height: 10, class: chapterColor(opts.current).fill, opacity: opts.ambient ? 1 : 0 });
  const trolley = s('g', { transform: `translate(${CRANE.x},0)` },
    s('rect', { x: -13, y: 117, width: 26, height: 8, rx: 1, fill: '#334155' }),
    s('g', { class: amb('cq-hoist') }, cable, spreader, carry));
  const ship = s('g', { 'aria-hidden': 'true' },
    s('path', { d: 'M470 250 L690 250 L676 284 L486 284 Z', fill: url('hull') }),
    s('rect', { x: 470, y: 250, width: 220, height: 4, fill: '#dc2626' }),
    ...[['#0284c7', 494, 234], ['#7c3aed', 524, 234], ['#e11d48', 554, 234], ['#059669', 584, 234], ['#d97706', 614, 234]]
      .map(([fill, x, y]) => s('rect', { x, y, width: 28, height: 16, fill })),
    s('rect', { x: 509, y: 220, width: 28, height: 14, fill: '#d97706' }),
    s('rect', { x: 569, y: 220, width: 28, height: 14, fill: '#0284c7' }),
    s('rect', { x: 650, y: 216, width: 28, height: 34, fill: '#f8fafc' }),
    s('rect', { x: 655, y: 222, width: 18, height: 5, fill: '#0ea5e9' }),
    s('rect', { x: 664, y: 204, width: 8, height: 12, fill: '#334155' }),
    s('circle', { class: amb('cq-smoke'), cx: 668, cy: 198, r: 6, fill: '#cbd5e1', opacity: opts.ambient ? 1 : 0 }),
    s('circle', { class: amb('cq-smoke cq-smoke2'), cx: 668, cy: 198, r: 6, fill: '#cbd5e1', opacity: opts.ambient ? 1 : 0 }),
    text(580, 276, 12, '#e0f2fe', 'CARGO QUERY', 'middle'));
  const truckBox = s('rect', { x: 0, y: 322, width: 56, height: 20, class: chapterColor(opts.current).fill });
  const truck = s('g', { opacity: 0, transform: 'translate(640,0)', 'aria-hidden': 'true' },
    truckBox,
    s('path', { d: 'M4 326 V338 M12 326 V338 M20 326 V338 M28 326 V338 M36 326 V338 M44 326 V338 M52 326 V338', stroke: '#000000', 'stroke-opacity': 0.18 }),
    s('rect', { x: 0, y: 342, width: 76, height: 5, fill: '#1e293b' }),
    s('path', { d: 'M58 330 H70 L76 338 V347 H58 Z', fill: '#f8fafc', stroke: '#1e293b' }),
    s('rect', { x: 66, y: 332, width: 7, height: 6, fill: '#7dd3fc' }),
    ...[10, 20, 48, 68].map((cx) => s('circle', { cx, cy: 350, r: 4, fill: '#0f172a' })));
  const shutter = s('rect', { x: 1026, y: 316, width: 62, height: 44, fill: url('shutter') });
  const barrier = s('g', {},
    s('rect', { x: 858, y: 337, width: 48, height: 5, fill: '#dc2626' }),
    s('rect', { x: 866, y: 337, width: 8, height: 5, fill: '#f8fafc' }),
    s('rect', { x: 882, y: 337, width: 8, height: 5, fill: '#f8fafc' }));
  const gateText = text(844, 379, 12, '#f8fafc', '', 'middle');
  const gateTag = s('g', { opacity: 0, class: 'max-lg:hidden', 'aria-hidden': 'true' }, s('rect', { x: 796, y: 364, width: 96, height: 22, rx: 6, fill: '#0f172a' }), gateText);

  const [callA, callB] = callout(h, opts.current);
  const bays = Object.entries(h.bays).map(([ch, k]) => t('harbor.bay', { n: Number(ch), k })).join(', ');
  const svg = s('svg', {
    // L23/L34: labels show only from lg, where the smallest (12 units) renders at ≥ ~11px: Home is ≥ 977px wide for
    // 1100 units, the stage dock 640px for 660. Below lg every label hides (Home shows callout() as HTML instead).
    viewBox: opts.crop ? '440 140 660 260' : '0 0 1100 400', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('harbor.label', { bays: bays || t('harbor.empty') }),
  },
    s('defs', {},
      grad('sky', [[0, '#7dd3fc'], [0.6, '#e0f2fe'], [1, '#fef3c7']]),
      grad('sea', [[0, '#0ea5e9'], [1, '#0c4a6e']]),
      grad('mtn', [[0, '#166534'], [1, '#14532d']]),
      grad('mtn2', [[0, '#4d7c0f', 0.75], [1, '#365314', 0.75]]),
      grad('quay', [[0, '#cbd5e1'], [1, '#94a3b8']]),
      grad('hull', [[0, '#1e3a8a'], [1, '#172554']]),
      grad('shed', [[0, '#e2e8f0'], [1, '#cbd5e1']]),
      s('pattern', { id: id('ripple'), width: 120, height: 14, patternUnits: 'userSpaceOnUse' },
        s('path', { d: 'M0 7 Q15 0 30 7 T60 7 T90 7 T120 7', fill: 'none', stroke: '#e0f2fe', 'stroke-opacity': 0.5, 'stroke-width': 2 })),
      s('pattern', { id: id('shutter'), width: 8, height: 5, patternUnits: 'userSpaceOnUse' },
        s('rect', { width: 8, height: 5, fill: '#94a3b8' }), s('rect', { y: 4, width: 8, height: 1, fill: '#64748b' }))),
    // sky, sun, Son Tra peninsula (two ridges), lighthouse
    s('rect', { width: 1100, height: 400, fill: url('sky') }),
    s('circle', { cx: 930, cy: 62, r: 30, fill: '#fde68a', opacity: 0.9 }),
    s('path', { d: 'M0 210 L80 170 L170 150 L250 120 L330 95 L410 110 L470 92 L540 128 L600 150 L680 172 L760 190 L760 230 L0 230 Z', fill: url('mtn2') }),
    s('path', { d: 'M0 220 L60 190 L140 178 L220 150 L300 140 L360 152 L430 136 L500 160 L560 185 L620 205 L620 236 L0 236 Z', fill: url('mtn') }),
    text(300, 132, 15, '#f8fafc', t('harbor.sontra'), 'middle'),
    s('g', { 'aria-hidden': 'true' },
      s('rect', { x: 596, y: 178, width: 8, height: 26, fill: '#f8fafc' }),
      s('rect', { x: 596, y: 186, width: 8, height: 5, fill: '#dc2626' }),
      s('circle', { class: amb('cq-beacon'), cx: 600, cy: 176, r: 5, fill: '#fde047' })),
    // sea and drifting ripples
    s('rect', { y: 230, width: 1100, height: 170, fill: url('sea') }),
    s('g', { class: amb('cq-wave'), 'aria-hidden': 'true' }, s('rect', { x: 0, y: 246, width: 1340, height: 14, fill: url('ripple') })),
    s('g', { class: amb('cq-wave2'), 'aria-hidden': 'true' }, s('rect', { x: -120, y: 300, width: 1340, height: 14, fill: url('ripple') })),
    s('g', { class: amb('cq-wave'), 'aria-hidden': 'true' }, s('rect', { x: 0, y: 362, width: 1340, height: 14, fill: url('ripple') })),
    // a small feeder leaving for the open sea (Home only)
    opts.ambient ? s('g', { class: 'cq-ship-out', 'aria-hidden': 'true' },
      s('path', { d: 'M600 300 L700 300 L692 316 L608 316 Z', fill: '#334155' }),
      s('rect', { x: 612, y: 288, width: 18, height: 12, fill: '#d97706' }),
      s('rect', { x: 632, y: 288, width: 18, height: 12, fill: '#0284c7' }),
      s('rect', { x: 652, y: 288, width: 18, height: 12, fill: '#7c3aed' }),
      s('rect', { x: 676, y: 280, width: 16, height: 20, fill: '#f1f5f9' })) : null,
    // land: quay apron, road, verge, labels
    s('path', { d: 'M700 236 H1100 V400 H660 L700 312 Z', fill: url('quay') }),
    s('rect', { x: 700, y: 236, width: 400, height: 5, fill: '#475569' }),
    s('rect', { x: 700, y: 241, width: 4, height: 71, fill: '#475569' }),
    s('rect', { x: 684, y: 334, width: 416, height: 26, fill: '#475569' }),
    s('line', { x1: 690, y1: 347, x2: 1010, y2: 347, stroke: '#f8fafc', 'stroke-width': 2, 'stroke-dasharray': '12 10' }),
    s('rect', { x: 672, y: 360, width: 428, height: 40, fill: '#a3b18a', opacity: 0.55 }),
    text(700, 382, 12, '#1e293b', t('harbor.yardLabel')),
    text(1094, 395, 13, '#0f172a', t('harbor.port'), 'end'),
    yard,
    drop,
    ship,
    // STS crane: back-stays, tower, legs, bracing, boom, cab; trolley + spreader move
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: 'M740 70 L470 112 M740 70 L1015 112', stroke: '#9a3412', 'stroke-width': 2 }),
      s('rect', { x: 736, y: 62, width: 8, height: 50, fill: '#ea580c' }),
      s('rect', { x: 712, y: 118, width: 9, height: 194, fill: '#f97316' }),
      s('rect', { x: 762, y: 118, width: 9, height: 194, fill: '#f97316' }),
      s('path', { d: 'M716 160 L766 220 M766 160 L716 220 M716 230 L766 290 M766 230 L716 290', stroke: '#ea580c', 'stroke-width': 3 }),
      s('rect', { x: 470, y: 108, width: 545, height: 10, fill: '#ea580c' }),
      s('rect', { x: 704, y: 92, width: 74, height: 16, fill: '#f97316' }),
      s('rect', { x: 712, y: 96, width: 14, height: 7, fill: '#7dd3fc' }),
      s('g', { class: amb('cq-trolley') }, trolley)),
    // CFS warehouse interior, the truck (drawn between interior and facade so it disappears inside), facade + shutter
    s('rect', { x: 1012, y: 282, width: 88, height: 78, fill: '#334155' }),
    s('rect', { x: 1026, y: 316, width: 62, height: 44, fill: '#0f172a' }),
    truck,
    s('path', { d: 'M1012 282 H1100 V360 H1088 V316 H1026 V360 H1012 Z', fill: url('shed') }),
    s('path', { d: 'M1006 284 L1056 262 L1100 270 V284 Z', fill: '#64748b' }),
    shutter,
    text(1057, 306, 12, '#0f172a', t('harbor.cfs'), 'middle'),
    // customs gate
    s('rect', { x: 881, y: 362, width: 80, height: 26, rx: 2, fill: '#f8fafc', stroke: '#334155' }),
    s('rect', { x: 881, y: 356, width: 80, height: 7, fill: '#1d4ed8' }),
    text(921, 380, 12, '#1e3a8a', t('harbor.customs'), 'middle'),
    s('rect', { x: 902, y: 330, width: 6, height: 30, fill: '#334155' }),
    barrier,
    gateTag,
    // status callout (outside the stage's crop)
    s('rect', { x: 24, y: 312, width: 360, height: 64, rx: 10, fill: '#0f172a', 'fill-opacity': 0.72 }),
    s('text', { x: 40, y: 338, 'font-family': FONT, 'font-size': 14, 'font-weight': 600, fill: '#f8fafc' }, callA),
    s('text', { x: 40, y: 360, 'font-family': FONT, 'font-size': 14, 'font-weight': 600, fill: '#bae6fd' }, callB));

  const parts: HarborParts = { svg, yard, drop, ship, trolley, cable, spreader, carry, truck, truckBox, barrier, shutter, gateTag, gateText };
  drawYard(parts, h, opts.fresh);
  return parts;
}

// ---- the route map (was ui/routeMap.ts) ----

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
    p.labels[r.port].textContent = r.name + (trips ? ` · ${trips}` : '');
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
  // L23/L34: 14-unit labels are ≥ ~13px from lg (≥ 937px for 980 units) and too small below it, so they hide below lg (Home lists routeItems() as HTML there)
  const svg = s('svg', { viewBox: '0 0 980 260', class: 'block w-full max-lg:[&_text]:hidden', role: 'img' },
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

// ---- completion scenes (were in ui/stage.ts) ----

/** One completion animation. `fast`: skipped or reduced motion, so every tween draws its end state at once. */
export interface Run { fast: boolean; done: boolean }
export interface Ctx {
  run: Run;
  tk: Ticket;
  scene: Scene;
  before: Harbor;
  after: Harbor;
  rankBefore: Rank;
  rankAfter: Rank;
  art: HTMLElement;
  /** Language the art was drawn in: relabelStage() redraws it after a switch. */
  lang: Lang;
  harbor?: HarborParts;
  map?: MapParts;
}

const easeInOut = (x: number): number => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = (x: number): number => x * x;
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);
const linear = (x: number): number => x;
const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;

/** Draws f(0 → 1) over `ms` with requestAnimationFrame. A fast run draws f(1) at once: skip = jump to the end state. */
function tween(run: Run, ms: number, f: (x: number) => void, ease = easeInOut): Promise<void> {
  return new Promise((resolve) => {
    if (run.fast) {
      f(1);
      resolve();
      return;
    }
    const t0 = performance.now();
    const step = (now: number): void => {
      const x = run.fast ? 1 : Math.min(1, (now - t0) / ms);
      f(ease(x));
      if (x < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
const wait = (run: Run, ms: number): Promise<void> => tween(run, ms, () => {});

const titleOf = (c: Ctx): string => textOf(c.tk, getLang()).title;
/** Lanes this completion opened (L32: the chapter's lane and/or the lane its ship sailed), as port names. */
const openedNames = (c: Ctx): string[] => ROUTES.filter((r) => c.after.open.has(r.port) && !c.before.open.has(r.port)).map((r) => r.name);

// ---- scene parts (geometry of mockup v5) ----
function setCrane(p: HarborParts, x: number, y: number, carry?: string | false): void {
  p.trolley.setAttribute('transform', `translate(${x},0)`);
  p.cable.setAttribute('y2', String(y));
  p.spreader.setAttribute('y', String(y));
  p.carry.setAttribute('y', String(y + 4));
  if (carry === false) p.carry.setAttribute('opacity', '0');
  else if (carry) {
    p.carry.setAttribute('class', carry);
    p.carry.setAttribute('opacity', '1');
  }
}
/** x: 0 = at the berth, 1 = out at sea, shrinking toward Son Tra. */
function setShip(p: HarborParts, x: number, alpha: number): void {
  p.ship.setAttribute('transform', `translate(${-430 * x},${-12 * x}) translate(580,266) scale(${1 - 0.45 * x}) translate(-580,-266)`);
  p.ship.setAttribute('opacity', String(alpha));
}
function setTruck(p: HarborParts, x: number, alpha = 1): void {
  p.truck.setAttribute('transform', `translate(${x},0)`);
  p.truck.setAttribute('opacity', String(alpha));
}
const setBarrier = (p: HarborParts, deg: number): void => p.barrier.setAttribute('transform', `rotate(${deg} 905 339)`);
const setShutter = (p: HarborParts, open: number): void => p.shutter.setAttribute('height', String(44 * (1 - open)));
function gateTag(p: HarborParts, label: string): void {
  p.gateText.textContent = label;
  p.gateTag.setAttribute('opacity', label ? '1' : '0');
}

/** The berthed ship sails out (1.6 s), then sits hidden until berthBack(). */
async function departBerth(c: Ctx): Promise<void> {
  const p = c.harbor;
  if (!p) return;
  await tween(c.run, 1600, (x) => setShip(p, x, x < 0.7 ? 1 : 1 - (x - 0.7) / 0.3), easeIn);
  setShip(p, 0, 0);
}
async function berthBack(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor;
  if (p) await tween(c.run, ms, (x) => setShip(p, 0, x));
}

/** +1 container in this chapter's bay (§1.1), then the yard is redrawn from `after` with a bright edge on it. */
async function dropContainer(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor;
  if (!p) return;
  const ch = c.tk.chapter;
  const tier = (c.after.bays[ch] ?? 1) - 1;
  if (tier < MAX_TIERS) {
    const b = bayBox(ch, tier);
    const box = s('rect', { x: b.x, y: b.y - 30, width: b.w, height: b.h - 0.6, class: chapterColor(ch).fill, opacity: 0 });
    p.drop.append(box);
    await tween(c.run, ms, (x) => {
      box.setAttribute('y', String(b.y - 30 * (1 - x)));
      box.setAttribute('opacity', String(Math.min(1, x * 2)));
    }, easeIn);
    box.remove();
  }
  drawYard(p, c.after, new Set([ch]));
}

async function toGate(c: Ctx, ms: number): Promise<void> {
  const p = c.harbor!;
  p.truckBox.setAttribute('class', chapterColor(c.tk.chapter).fill);
  setBarrier(p, 0);
  await tween(c.run, ms, (x) => setTruck(p, lerp(640, 778, x), Math.min(1, x * 3)), easeOut);
}

/** A ship runs the lane to `port`, its wake lights up, then the lanes repaint from `after` (a new lane turns solid). */
async function sail(c: Ctx, port: string, ms: number): Promise<void> {
  const m = c.map;
  if (!m) return wait(c.run, ms);
  const path = m.routes[port];
  const len = path.getTotalLength();
  m.wake.setAttribute('d', path.getAttribute('d') ?? '');
  m.wake.setAttribute('class', chapterColor(c.tk.chapter).stroke);
  m.wake.setAttribute('stroke-dasharray', String(len));
  m.wake.setAttribute('opacity', '0.55');
  m.ship.setAttribute('opacity', '1');
  await tween(c.run, ms, (x) => {
    const at = path.getPointAtLength(x * len);
    const ahead = path.getPointAtLength(Math.min(len, x * len + 1));
    const deg = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
    const flip = Math.abs(deg) > 90;
    m.ship.setAttribute('transform', `translate(${at.x},${at.y}) rotate(${flip ? deg + 180 : deg}) scale(${flip ? -1 : 1},1)`);
    m.wake.setAttribute('stroke-dashoffset', String(len * (1 - x)));
  });
  m.ship.setAttribute('opacity', '0');
  m.wake.setAttribute('opacity', '0');
  paintRoutes(m, c.after);
}

// ---- cards over the art ----
const CARD_OV = 'w-64 max-w-[calc(100vw-4rem)] rounded-xl bg-panel p-3 text-sm shadow-lg ring-1 ring-line';
const STAMP = 'absolute rounded-md border-[3px] px-2 py-0.5 text-[15px] font-extrabold tracking-wide uppercase';
/** Lane colour is never the only signal: the stamp spells the lane out (§6). */
const LANE: Record<Lane, { key: Key; stamp: string }> = {
  green: { key: 'anim.laneGreen', stamp: 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200' },
  yellow: { key: 'anim.laneYellow', stamp: 'border-yellow-700 bg-yellow-50 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-200' },
  red: { key: 'anim.laneRed', stamp: 'border-red-700 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200' },
};
const GATE: Record<Lane, Key | undefined> = { green: undefined, yellow: 'anim.gateYellow', red: 'anim.gateRed' };

/** Top right over a picture (centred for the promotion card); on its own when the kind has no picture (quote, ledger, chat). */
function overlay(c: Ctx, card: HTMLElement, centre = false): HTMLElement {
  const pictured = Boolean(c.harbor || c.map);
  card.style.opacity = '0';
  c.art.append(h('div', { class: pictured ? (centre ? 'absolute top-3 left-1/2 -translate-x-1/2' : 'absolute top-2 right-2') : 'p-3' }, card));
  return card;
}
const fadeIn = (run: Run, el: HTMLElement, ms: number): Promise<void> =>
  tween(run, ms, (x) => {
    el.style.opacity = String(x);
    el.style.transform = `translateY(${-8 * (1 - x)}px)`;
  });
/** Under reduced motion the final card stays until Close or the next completion (§5). */
const fadeOut = (run: Run, el: HTMLElement, ms: number): Promise<void> =>
  reducedMotion() ? Promise.resolve() : tween(run, ms, (x) => { el.style.opacity = String(1 - x); });

function confetti(c: Ctx, ms: number): Promise<void> {
  const box = h('div', { class: 'pointer-events-none absolute inset-0 overflow-hidden' });
  const bits = Array.from({ length: 42 }, (_, i) => {
    const el = h('span', { class: cx('absolute top-1/3 left-1/2 block h-3 w-2 rounded-sm', CHAPTER_COLOR[(i % 12) + 1].bar) });
    box.append(el);
    return { el, vx: (Math.random() - 0.5) * 520, vy: -120 - Math.random() * 160, spin: Math.random() * 720 };
  });
  c.art.append(box);
  return tween(c.run, ms, (x) => bits.forEach((b) => {
    b.el.style.transform = `translate(${b.vx * x}px, ${b.vy * x + 360 * x * x}px) rotate(${b.spin * x}deg)`;
    b.el.style.opacity = String(1 - x * x);
  }), linear).then(() => box.remove());
}

function promoCard(c: Ctx): HTMLElement {
  const lang = getLang();
  const from = c.rankBefore.tier?.[lang] ?? t('career.intern');
  const to = c.rankAfter.tier?.[lang] ?? t('career.intern');
  const opened = openedNames(c);
  return h('div', { class: 'w-80 max-w-[calc(100vw-4rem)] rounded-2xl bg-panel p-4 text-center shadow-xl ring-2 ring-amber-500' },
    h('p', { class: 'm-0 text-sm font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200' }, t('anim.promoKicker', { n: c.tk.chapter })),
    h('p', { class: 'm-0 text-lg font-bold' }, from !== to ? `${from} → ${to}` : t('anim.promoStep', { career: c.rankAfter.career?.[lang] ?? to })),
    opened.length ? h('p', { class: 'm-0 text-sm text-muted' }, t('anim.promoRoute', { port: opened.join(', ') })) : null);
}

// ---- the eight kinds (§2), step durations from STEPS ----
const PLAY: Record<Scene['kind'], (c: Ctx) => Promise<void>> = {
  async ship(c) {
    const [sailMs, backMs] = STEPS.ship;
    await Promise.all([departBerth(c), c.scene.to ? sail(c, c.scene.to, sailMs) : wait(c.run, sailMs)]);
    await Promise.all([berthBack(c, backMs), dropContainer(c, backMs)]);
  },

  async yard(c) {
    const p = c.harbor!;
    const [lowerMs, liftMs, travelMs, downMs, releaseMs, homeMs] = STEPS.yard;
    const ch = c.tk.chapter;
    const b = bayBox(ch, Math.min((c.after.bays[ch] ?? 1) - 1, MAX_TIERS - 1));
    const bayX = b.x + b.w / 2;
    await tween(c.run, lowerMs, (x) => setCrane(p, CRANE.x, lerp(CRANE.y, 220, x), false));
    setCrane(p, CRANE.x, 220, chapterColor(ch).fill);
    await tween(c.run, liftMs, (x) => setCrane(p, CRANE.x, lerp(220, 160, x)));
    await tween(c.run, travelMs, (x) => setCrane(p, lerp(CRANE.x, bayX, x), 160));
    await tween(c.run, downMs, (x) => setCrane(p, bayX, lerp(160, b.y - 4, x)));
    setCrane(p, bayX, b.y - 4, false);
    drawYard(p, c.after, new Set([ch]));
    await tween(c.run, releaseMs, (x) => setCrane(p, bayX, lerp(b.y - 4, CRANE.y, x)));
    await tween(c.run, homeMs, (x) => setCrane(p, lerp(bayX, CRANE.x, x), CRANE.y));
  },

  async customs(c) {
    const p = c.harbor!;
    const lane = c.scene.lane ?? 'green';
    const [showMs, stampMs, gateMs, barrierMs, driveMs] = STEPS.customs;
    const stamp = h('span', { class: cx(STAMP, 'right-3 bottom-2', LANE[lane].stamp) }, t('anim.stamp', { lane: t(LANE[lane].key) }));
    stamp.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative pb-12') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.declaration')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      stamp));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, stampMs, (x) => {
      stamp.style.opacity = String(Math.min(1, x * 2));
      stamp.style.transform = `rotate(-10deg) scale(${lerp(2.2, 1, x)})`;
    }, easeIn);
    await toGate(c, gateMs);
    const gate = GATE[lane];
    if (gate) {
      gateTag(p, t(gate));
      await wait(c.run, GATE_WAIT[lane]);
      gateTag(p, '');
    }
    await tween(c.run, barrierMs, (x) => setBarrier(p, 80 * x));
    await Promise.all([
      tween(c.run, driveMs, (x) => setTruck(p, lerp(778, 960, x), x > 0.7 ? 1 - (x - 0.7) / 0.3 : 1), linear),
      dropContainer(c, 400),
      fadeOut(c.run, card, 300),
    ]);
    setBarrier(p, 0);
  },

  async truck(c) {
    const p = c.harbor!;
    const [gateMs, barrierMs, throughMs, inMs, closeMs] = STEPS.truck;
    await toGate(c, gateMs);
    await tween(c.run, barrierMs, (x) => setBarrier(p, 80 * x));
    await Promise.all([
      tween(c.run, throughMs, (x) => setTruck(p, lerp(778, 960, x)), linear),
      tween(c.run, throughMs, (x) => setShutter(p, x)),
    ]);
    await tween(c.run, inMs, (x) => setTruck(p, lerp(960, 1020, x)), linear);
    setBarrier(p, 0);
    await Promise.all([tween(c.run, closeMs, (x) => setShutter(p, 1 - x)), dropContainer(c, closeMs)]);
    setTruck(p, 640, 0);
  },

  async quote(c) {
    const [showMs, wait1, flipMs, wait2] = STEPS.quote; // card-only scenes keep their card: fading it left an empty dock (v10 B3)
    const front = h('div', {},
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      h('span', { class: cx(PILL, 'mt-1 bg-code text-muted') }, t('anim.quoteWaiting')));
    const back = h('div', { hidden: true },
      h('p', { class: 'm-0 font-semibold text-emerald-800 dark:text-emerald-200' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, t('anim.quoteAccepted')));
    const card = overlay(c, h('div', { class: CARD_OV }, front, back));
    await fadeIn(c.run, card, showMs);
    await wait(c.run, wait1);
    await tween(c.run, flipMs, (x) => {
      card.style.transform = `scaleX(${Math.abs(1 - 2 * x)})`; // a flat flip: shrink to the edge, swap faces, grow back
      if (x >= 0.5) {
        front.hidden = true;
        back.hidden = false;
      }
    });
    await wait(c.run, wait2);
  },

  async ledger(c) {
    const [showMs, stampMs, coinsMs, waitMs] = STEPS.ledger;
    const paid = h('span', { class: cx(STAMP, 'top-3 right-3', LANE.green.stamp) }, t('anim.paid'));
    paid.style.opacity = '0';
    const coins = Array.from({ length: 6 }, (_, i) =>
      h('span', { class: 'absolute size-4 rounded-full bg-amber-400 ring-2 ring-amber-600', style: `left:${16 + i * 22}px;top:56px` }));
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.invoice')),
      h('p', { class: 'm-0 pr-20 font-bold' }, titleOf(c)),
      paid,
      ...coins,
      h('p', { class: 'mt-8 mb-0 rounded-lg bg-ink px-3 py-1.5 text-panel' }, t('anim.ledgerBook'))));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, stampMs, (x) => {
      paid.style.opacity = String(Math.min(1, x * 2));
      paid.style.transform = `rotate(-10deg) scale(${lerp(2, 1, x)})`;
    }, easeIn);
    await tween(c.run, coinsMs, (x) => coins.forEach((coin, i) => {
      const k = Math.max(0, Math.min(1, x * 1.6 - i * 0.12));
      coin.style.transform = `translate(${lerp(0, 40, k)}px, ${lerp(0, 44, k) - 30 * Math.sin(k * Math.PI)}px)`;
      coin.style.opacity = k >= 1 ? '0' : '1';
    }), linear);
    await wait(c.run, waitMs);
  },

  async chat(c) {
    const [showMs, typingMs, bubbleMs, waitMs] = STEPS.chat;
    const dots = [0, 1, 2].map(() => h('span', { class: 'size-1.5 rounded-full bg-muted' }));
    const typing = h('span', { class: 'inline-flex gap-1 rounded-2xl rounded-tl-sm bg-code px-3 py-2' }, ...dots);
    const bubble = h('p', { class: 'm-0 rounded-2xl rounded-tl-sm bg-code px-3 py-2', hidden: true }, t('anim.thanks'));
    const happy = h('span', { class: cx(PILL, DONE_PILL) }, t('anim.happy'));
    happy.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'space-y-2') },
      h('p', { class: 'm-0 flex items-center gap-2' }, avatar({ name: '', dept: 'CS' }, 'md'), h('b', {}, t('anim.customer'))),
      typing, bubble, happy));
    await fadeIn(c.run, card, showMs);
    await tween(c.run, typingMs, (x) => dots.forEach((d, i) => {
      d.style.transform = `translateY(${-3 * Math.max(0, Math.sin(x * 9 - i))}px)`;
    }), linear);
    typing.hidden = true;
    bubble.hidden = false;
    await tween(c.run, bubbleMs, (x) => {
      bubble.style.opacity = String(x);
      happy.style.opacity = String(x);
    });
    await wait(c.run, waitMs);
  },

  async promotion(c) {
    const [dropMs, restMs] = STEPS.promotion;
    const route = c.scene.to ?? routeOpenedBy(c.tk.chapter);
    const card = overlay(c, promoCard(c), true);
    await dropContainer(c, dropMs);
    if (!c.run.fast) void confetti(c, restMs);
    await Promise.all([
      departBerth(c).then(() => berthBack(c, 400)),
      route ? sail(c, route, 2200) : wait(c.run, 2200),
      fadeIn(c.run, card, 400),
      wait(c.run, restMs),
    ]);
  },
};

/** Picture per kind (§4): the harbour close-up for port work, the route map when a ship has somewhere to go. */
export function build(c: Ctx): void {
  const k = c.scene.kind;
  if (k === 'ship' || k === 'yard' || k === 'customs' || k === 'truck' || k === 'promotion') {
    c.harbor = harborScene(c.before, { ambient: false, current: c.tk.chapter, crop: true });
  }
  if ((k === 'ship' && c.scene.to) || k === 'promotion') c.map = routeMap(c.before);
  c.art.replaceChildren(...nodes(c.harbor?.svg, c.map?.svg));
}
/** Plays the scene of `c` (§2, step durations from STEPS). A fast run draws the end state at once. */
export const play = (c: Ctx): Promise<void> => PLAY[c.scene.kind](c);
