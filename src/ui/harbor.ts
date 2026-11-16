import { t } from '../i18n';
import type { Harbor } from '../scene';
import { chapterColor } from '../theme';
import { s } from './svg';

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

/** The two status lines (tasks done and ships out; chapters passed and current): in the SVG, and as HTML below lg. */
export function callout(h: Harbor, current: number): [string, string] {
  const trips = Object.values(h.trips).reduce((a, b) => a + b, 0) + h.departures;
  const done = Object.values(h.bays).reduce((a, b) => a + b, 0);
  return [t('harbor.callA', { done, trips }), t('harbor.callB', { passed: h.passed.size, n: current })];
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
    s('rect', { x: 902, y: 362, width: 38, height: 26, rx: 2, fill: '#f8fafc', stroke: '#334155' }),
    s('rect', { x: 902, y: 356, width: 38, height: 7, fill: '#1d4ed8' }),
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
