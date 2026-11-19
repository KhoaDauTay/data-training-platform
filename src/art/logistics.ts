// Plan 8b D8b-2: the Logistics pictures (Tien Sa scene, route map) and the bodies of the completion scenes, one lazy
// chunk loaded through src/art/load.ts. Moved verbatim from ui/harbor.ts, ui/routeMap.ts and ui/stage.ts; the dock,
// Skip/Esc and the announced sentence stay in ui/stage.ts (main) so a completion is announced before this chunk arrives.
import type { getLang as GetLang, Key, t as T } from '../i18n';
import type { Rank } from '../progress';
import type { durationOf as DurationOf, GATE_WAIT as GateWait, Harbor, Lane, routeOpenedBy as RouteOpenedBy, ROUTES as Routes, Scene, STEPS as Steps } from '../scene';
import type { CHAPTER_COLOR as ChapterColors, chapterColor as ChapterColorOf, cx as Cx } from '../theme';
import type { Lang, textOf as TextOf, Ticket } from '../tickets';
import type { avatar as Avatar } from '../ui/avatar';
import type { h as H, nodes as Nodes, reducedMotion as ReducedMotion } from '../ui/dom';
import type { mascot as Mascot } from '../ui/mascots';
import type { callout as Callout, routeItems as RouteItems } from '../ui/routeText';
import type { s as S } from '../ui/svg';
import { ambient } from './ambient';
import { COAST, LAND } from './coast';
import { arrivalPulse, drawNewRoutes, sailFleet } from './mapMotion';
import { HUB, LANE_GEO, laneCurve, lanePath, xy, type Pt } from './seaLanes';

/**
 * Everything this chunk uses from main, handed over by src/art/load.ts (D8b-2 stop rule): a runtime import of a main
 * module here makes Rolldown hoist the shared code into a preloaded chunk (Plan 6 U3), measured at +75 KB on the first try.
 */
export interface ArtDeps {
  t: typeof T; getLang: typeof GetLang; textOf: typeof TextOf;
  ROUTES: typeof Routes; STEPS: typeof Steps; GATE_WAIT: typeof GateWait; routeOpenedBy: typeof RouteOpenedBy; durationOf: typeof DurationOf;
  CHAPTER_COLOR: typeof ChapterColors; chapterColor: typeof ChapterColorOf; cx: typeof Cx; PILL: string; DONE_PILL: string;
  h: typeof H; s: typeof S; nodes: typeof Nodes; reducedMotion: typeof ReducedMotion;
  avatar: typeof Avatar; mascot: typeof Mascot; callout: typeof Callout; routeItems: typeof RouteItems;
}
let t: typeof T, getLang: typeof GetLang, textOf: typeof TextOf;
let ROUTES: typeof Routes, STEPS: typeof Steps, GATE_WAIT: typeof GateWait, routeOpenedBy: typeof RouteOpenedBy, durationOf: typeof DurationOf;
let CHAPTER_COLOR: typeof ChapterColors, chapterColor: typeof ChapterColorOf, cx: typeof Cx, PILL: string, DONE_PILL: string;
let h: typeof H, s: typeof S, nodes: typeof Nodes, reducedMotion: typeof ReducedMotion;
let avatar: typeof Avatar, mascot: typeof Mascot, callout: typeof Callout, routeItems: typeof RouteItems;
export { parallax } from './mapMotion';

/** Called once by loadArt() before anything else here runs. */
export function init(d: ArtDeps): void {
  ({ t, getLang, textOf, ROUTES, STEPS, GATE_WAIT, routeOpenedBy, durationOf, CHAPTER_COLOR, chapterColor, cx, PILL, DONE_PILL } = d);
  ({ h, s, nodes, reducedMotion, avatar, mascot, callout, routeItems } = d);
}

// ---- the Tien Sa scene (was ui/harbor.ts) ----

/** Tallest stack drawn per yard bay; more containers show as "+n" (chapters have 5–6 tickets). */
export const MAX_TIERS = 6;
/** Crane home: trolley above the berthed ship, spreader at rest. The stage (Task 18) tweens from here. */
export const CRANE = { x: 555, y: 170 } as const;

/** The parts the completion scenes animate (A2). Everything else is static or one of Home's ambient loops (harborLife). */
export interface HarborParts {
  svg: SVGSVGElement;
  yard: SVGGElement;
  drop: SVGGElement;
  ship: SVGGElement;
  trolley: SVGGElement;
  /** Cable, spreader and load: swings about the trolley (rotate(a 0 125), v6 A2). */
  hoist: SVGGElement;
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
/** Home's drifting clouds: [y, scale, seconds per crossing, start offset in seconds] (Plan 8b Task 4). */
const CLOUDS: [number, number, number, number][] = [[46, 1, 60, 12], [84, 0.7, 80, 50], [30, 0.85, 100, 70]];
/** Where the sun (moon at dusk) sits: over open water, so its glint lands on the sea (ui-ux-v6 S1). */
const SUN = { x: 168, y: 64 } as const;

/**
 * A container in three tones (S1): face (`paint`: a chapter fill class or a hex), shaded right side, corrugation
 * grooves and a lit top edge. Only black/white alpha on top of the face, so the chapter colours stay the only colours.
 */
function container(x: number, y: number, w: number, hh: number, paint: Record<string, string | number | false>): SVGElement[] {
  const side = Math.max(2, Math.round(w * 0.12));
  let d = '';
  for (let gx = x + 2.5; gx < x + w - side - 1; gx += 3.5) d += `M${gx.toFixed(1)} ${y + 1.4}V${y + hh - 1}`;
  return [
    s('rect', { x, y, width: w, height: hh, rx: 0.6, ...paint }),
    s('rect', { x: x + w - side, y, width: side, height: hh, fill: '#000000', opacity: 0.24 }),
    s('path', { d, stroke: '#000000', 'stroke-opacity': 0.16, 'stroke-width': 0.9 }),
    s('rect', { x, y, width: w, height: Math.min(1.4, hh * 0.16), fill: '#ffffff', opacity: 0.38 }),
  ];
}

/** Redraws the yard from `h.bays`. `fresh`: chapters whose top container gets a bright edge and a "New" tag. */
export function drawYard(p: HarborParts, h: Harbor, fresh: ReadonlySet<number> = new Set()): void {
  const out: SVGElement[] = [];
  for (const ch of [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]) { // back row first: the front row covers it
    const pad = bayBox(ch, -1);
    out.push(s('rect', { x: pad.x - 1, y: pad.base, width: pad.w + 2, height: 2, style: 'fill:var(--hs-wall)' }));
    const n = h.bays[ch] ?? 0;
    const shown = Math.min(n, MAX_TIERS);
    if (shown) out.push(s('path', { d: `M${pad.x + pad.w} ${pad.base} l7 0 l-7 ${-Math.min(shown, 3) * 4} Z`, fill: '#000000', opacity: 0.12 })); // stack shadow
    for (let k = 0; k < shown; k++) {
      const b = bayBox(ch, k);
      const top = fresh.has(ch) && k === shown - 1;
      out.push(...container(b.x, b.y, b.w, b.h - 0.6, { class: chapterColor(ch).fill, stroke: top ? '#ffffff' : false, 'stroke-width': top ? 1.6 : false }));
    }
    const label = n > MAX_TIERS ? `+${n - MAX_TIERS}` : fresh.has(ch) && shown ? t('harbor.new') : '';
    if (label) {
      const b = bayBox(ch, shown);
      out.push(s('text', { x: b.x + b.w / 2, y: b.y + 7, 'text-anchor': 'middle', 'font-family': FONT, 'font-size': 12, 'font-weight': 700, fill: '#0f172a', stroke: '#ffffff', 'stroke-width': 3, 'paint-order': 'stroke' }, label));
    }
  }
  p.yard.replaceChildren(...out);
}

/**
 * The Tien Sa scene (L26, redrawn in ui-ux-v6 S1: three depth layers, light from the sun over the bay, dusk with yard
 * lights in dark mode). `ambient`: Home; harborLife() animates its loops (GSAP, only while on screen). The stage
 * passes false and drives the ship, crane, truck, barrier and shutter itself. `crop`: the stage's close-up of berth,
 * crane load path (y ≥ 140, so the lifted container stays in frame), yard, gate and CFS. Gradient ids get a per-build prefix: Home (hidden) and the stage can both be in the DOM.
 */
export function harborScene(h: Harbor, opts: { ambient: boolean; current: number; crop?: boolean; fresh?: ReadonlySet<number> }): HarborParts {
  const n = ++uid;
  const id = (k: string): string => `cq${n}-${k}`;
  const url = (k: string): string => `url(#${id(k)})`;
  const tok = (k: string): string => `fill:var(--hs-${k})`;
  const amb = (k: string, data: Record<string, string | number> = {}): Record<string, string | number> =>
    (opts.ambient ? { 'data-amb': k, ...Object.fromEntries(Object.entries(data).map(([a, v]) => [`data-${a}`, v])) } : {});
  const grad = (k: string, stops: [number, string, number?][], dir: [number, number, number, number] = [0, 0, 0, 1]): SVGLinearGradientElement =>
    s('linearGradient', { id: id(k), x1: dir[0], y1: dir[1], x2: dir[2], y2: dir[3] },
      // style, not the attribute: a stop colour may be a theme token (var(--hs-*), dusk in dark mode, v10 critic #8)
      ...stops.map(([offset, color, alpha]) => s('stop', { offset, style: `stop-color:${color};stop-opacity:${alpha ?? 1}` })));
  const glow = (k: string, color: string): SVGRadialGradientElement =>
    s('radialGradient', { id: id(k) }, s('stop', { offset: 0, style: `stop-color:${color};stop-opacity:0.95` }),
      s('stop', { offset: 0.35, style: `stop-color:${color};stop-opacity:0.45` }), s('stop', { offset: 1, style: `stop-color:${color};stop-opacity:0` }));
  const text = (x: number, y: number, size: number, fill: string, label: string, anchor = 'start'): SVGTextElement =>
    s('text', { x, y, 'text-anchor': anchor, 'font-family': FONT, 'font-size': size, 'font-weight': 700, fill }, label);
  /** S1: a place name on a translucent pill (never straight on the picture); the whole label hides below lg (L23/L34). */
  const label = (x: number, y: number, size: number, str: string, anchor: 'start' | 'middle' | 'end' = 'start'): SVGGElement => {
    const fit = (tw: number): [number, number] => {
      const w = tw + 16;
      return [anchor === 'start' ? x - 8 : anchor === 'middle' ? x - w / 2 : x - w + 8, w];
    };
    const [left, w] = fit(str.length * size * 0.55); // a guess until the text is laid out
    const pill = s('rect', { x: left, y: y - size - 3, width: w, height: size + 10, rx: (size + 10) / 2, fill: '#0f172a', 'fill-opacity': 0.66 });
    const txt = text(x, y, size, '#f8fafc', str, anchor);
    // v6 review: the pill hugs the real text (the guess left a wide empty end on one side); hidden below lg = no layout, keep the guess
    setTimeout(() => { // after the caller has put the scene in the page
      const tw = txt.isConnected ? txt.getComputedTextLength() : 0;
      if (tw > 0) { const [l, ww] = fit(tw); pill.setAttribute('x', String(l)); pill.setAttribute('width', String(ww)); }
    });
    return s('g', { class: 'max-lg:hidden' }, pill, txt);
  };

  const yard = s('g', {});
  const drop = s('g', { 'aria-hidden': 'true' });
  const cable = s('line', { x1: 0, y1: 125, x2: 0, y2: CRANE.y, stroke: '#1e293b', 'stroke-width': 2 });
  const spreader = s('rect', { x: -18, y: CRANE.y, width: 36, height: 4, rx: 1, fill: '#facc15' });
  const carry = s('rect', { x: -16, y: CRANE.y + 4, width: 32, height: 10, rx: 0.6, class: chapterColor(opts.current).fill, opacity: opts.ambient ? 1 : 0 });
  const hoist = s('g', {}, cable, spreader, carry);
  const trolley = s('g', { transform: `translate(${CRANE.x},0)` },
    s('rect', { x: -13, y: 117, width: 26, height: 8, rx: 1.5, fill: '#334155' }),
    s('rect', { x: -13, y: 117, width: 26, height: 2, rx: 1, fill: '#64748b' }),
    hoist);

  // the berthed feeder: shadow + reflection inside the group, so they sail with it (setShip)
  const ship = s('g', { 'aria-hidden': 'true' },
    s('rect', { x: 480, y: 284, width: 204, height: 18, fill: url('reflect') }),
    s('ellipse', { cx: 580, cy: 285, rx: 112, ry: 4, fill: '#000000', opacity: 0.28 }),
    s('path', { d: 'M462 248 L690 248 L683 284 L490 284 Q470 270 462 248 Z', fill: url('hull') }),
    s('path', { d: 'M486 276 L685 276 L683 284 L490 284 Z', fill: '#9f1239' }), // antifouling below the waterline
    s('path', { d: 'M462 248 L690 248 L689 253 L465 253 Z', fill: '#f8fafc', opacity: 0.85 }), // sheer line
    ...[['#0284c7', 494, 232], ['#7c3aed', 524, 232], ['#e11d48', 554, 232], ['#059669', 584, 232], ['#d97706', 614, 232]]
      .flatMap(([fill, x, y]) => container(x as number, y as number, 28, 16, { fill })),
    ...container(509, 218, 28, 14, { fill: '#d97706' }),
    ...container(569, 218, 28, 14, { fill: '#0284c7' }),
    // bridge: lit face, shaded side, a window band
    s('rect', { x: 648, y: 212, width: 32, height: 36, fill: '#f8fafc' }),
    s('rect', { x: 672, y: 212, width: 8, height: 36, fill: '#cbd5e1' }),
    s('rect', { x: 644, y: 210, width: 40, height: 4, fill: '#e2e8f0' }),
    s('rect', { x: 652, y: 218, width: 24, height: 5, rx: 1, fill: '#0f172a' }),
    s('rect', { x: 652, y: 218, width: 24, height: 5, rx: 1, style: 'fill:#fde68a;opacity:var(--hs-lamp)' }),
    s('rect', { x: 662, y: 196, width: 10, height: 14, fill: '#334155' }),
    s('rect', { x: 662, y: 199, width: 10, height: 3, fill: '#dc2626' }),
    s('circle', { ...amb('smoke'), cx: 667, cy: 190, r: 6, fill: '#cbd5e1', opacity: opts.ambient ? 0.35 : 0 }),
    s('circle', { ...amb('smoke', { o: 1.5 }), cx: 667, cy: 190, r: 6, fill: '#cbd5e1', opacity: 0 }),
    text(578, 270, 12, '#e0f2fe', 'CARGO QUERY', 'middle'));

  const truckBox = s('rect', { x: 0, y: 322, width: 56, height: 20, rx: 0.8, class: chapterColor(opts.current).fill });
  const truck = s('g', { opacity: 0, transform: 'translate(640,0)', 'aria-hidden': 'true' },
    s('ellipse', { cx: 40, cy: 354, rx: 40, ry: 3, fill: '#000000', opacity: 0.25 }),
    truckBox,
    s('rect', { x: 50, y: 322, width: 6, height: 20, fill: '#000000', opacity: 0.22 }),
    s('path', { d: 'M4 325 V339 M10 325 V339 M16 325 V339 M22 325 V339 M28 325 V339 M34 325 V339 M40 325 V339 M46 325 V339', stroke: '#000000', 'stroke-opacity': 0.16 }),
    s('rect', { x: 0, y: 322, width: 56, height: 1.5, fill: '#ffffff', opacity: 0.4 }),
    s('rect', { x: 0, y: 342, width: 76, height: 5, fill: '#1e293b' }),
    s('path', { d: 'M58 328 H69 Q72 328 74 331 L77 337 V347 H58 Z', fill: '#f1f5f9', stroke: '#1e293b', 'stroke-width': 1 }),
    s('path', { d: 'M66 331 H70 L74 337 H66 Z', fill: '#7dd3fc' }),
    ...[10, 22, 48, 68].flatMap((cx) => [s('circle', { cx, cy: 350, r: 4.2, fill: '#0f172a' }), s('circle', { cx, cy: 350, r: 1.6, fill: '#94a3b8' })]));
  const shutter = s('rect', { x: 1026, y: 316, width: 62, height: 44, fill: url('shutter') });
  const barrier = s('g', {},
    s('rect', { x: 858, y: 337, width: 48, height: 5, rx: 1, fill: '#dc2626' }),
    s('rect', { x: 866, y: 337, width: 8, height: 5, fill: '#f8fafc' }),
    s('rect', { x: 882, y: 337, width: 8, height: 5, fill: '#f8fafc' }));
  const gateText = text(844, 379, 12, '#f8fafc', '', 'middle');
  const gateTag = s('g', { opacity: 0, class: 'max-lg:hidden', 'aria-hidden': 'true' }, s('rect', { x: 796, y: 364, width: 96, height: 22, rx: 6, fill: '#0f172a' }), gateText);

  /** A light mast: pole, lamp head and, at dusk (--hs-lamp 1), a glow and a pool of light on the ground. */
  const mast = (x: number, top: number, base: number): SVGElement[] => [
    s('ellipse', { cx: x, cy: base, rx: 34, ry: 7, fill: url('lamp'), style: 'opacity:calc(var(--hs-lamp) * 0.55)' }),
    s('rect', { x: x - 1.5, y: top, width: 3, height: base - top, fill: '#475569' }),
    s('rect', { x: x - 7, y: top - 3, width: 14, height: 4, rx: 1, fill: '#334155' }),
    s('circle', { cx: x, cy: top, r: 22, fill: url('lamp'), style: 'opacity:var(--hs-lamp)' }),
  ];

  const [callA, callB] = callout(h, opts.current);
  const bays = Object.entries(h.bays).map(([ch, k]) => t('harbor.bay', { n: Number(ch), k })).join(', ');
  const svg = s('svg', {
    // L23/L34: labels show only from lg, where the smallest (12 units) renders at ≥ ~11px: Home is ≥ 977px wide for
    // 1100 units, the stage dock 640px for 660. Below lg every label hides (Home shows callout() as HTML instead).
    viewBox: opts.crop ? '440 140 660 260' : '0 0 1100 400', class: 'block w-full max-lg:[&_text]:hidden', role: 'img',
    'aria-label': t('harbor.label', { bays: bays || t('harbor.empty') }),
  },
    s('defs', {},
      grad('sky', [[0, 'var(--hs-sky0)'], [0.62, 'var(--hs-sky1)'], [1, 'var(--hs-sky2)']]),
      grad('sea', [[0, 'var(--hs-sea0)'], [0.35, 'var(--hs-sea0)', 0.85], [1, 'var(--hs-sea1)']]),
      grad('haze', [[0, 'var(--hs-sky2)', 0], [1, 'var(--hs-sky2)', 0.75]]),
      grad('far', [[0, 'var(--hs-far)'], [1, 'var(--hs-far)', 0.7]]),
      grad('mid', [[0, 'var(--hs-mid)'], [1, 'var(--hs-mid)', 0.9]]),
      grad('near', [[0, 'var(--hs-near)'], [1, 'var(--hs-near2)']]),
      grad('quay', [[0, 'var(--hs-quay0)'], [1, 'var(--hs-quay1)']]),
      grad('hull', [[0, '#27448f'], [0.55, '#1e3a8a'], [1, '#132a63']]),
      grad('reflect', [[0, '#1e3a8a', 0.45], [1, '#1e3a8a', 0]]),
      grad('shed', [[0, 'var(--hs-shed0)'], [1, 'var(--hs-shed1)']]),
      grad('wall', [[0, '#000000', 0.28], [1, '#000000', 0]], [0, 0, 1, 0]),
      glow('sunglow', 'var(--hs-sun)'),
      glow('lamp', '#fde68a'),
      s('pattern', { id: id('rip0'), width: 60, height: 6, patternUnits: 'userSpaceOnUse' },
        s('path', { d: 'M0 3 Q7.5 0.5 15 3 T30 3', fill: 'none', stroke: '#e0f2fe', 'stroke-opacity': 0.35, 'stroke-width': 1, 'stroke-linecap': 'round' })),
      s('pattern', { id: id('rip1'), width: 90, height: 10, patternUnits: 'userSpaceOnUse' },
        s('path', { d: 'M4 5 Q15 1 26 5 M50 6 Q61 2 72 6', fill: 'none', stroke: '#e0f2fe', 'stroke-opacity': 0.42, 'stroke-width': 1.5, 'stroke-linecap': 'round' })),
      s('pattern', { id: id('rip2'), width: 120, height: 14, patternUnits: 'userSpaceOnUse' },
        s('path', { d: 'M6 8 Q21 2 36 8 M70 9 Q86 3 102 9', fill: 'none', stroke: '#e0f2fe', 'stroke-opacity': 0.5, 'stroke-width': 2, 'stroke-linecap': 'round' })),
      s('pattern', { id: id('shutter'), width: 8, height: 5, patternUnits: 'userSpaceOnUse' },
        s('rect', { width: 8, height: 5, fill: '#94a3b8' }), s('rect', { y: 4, width: 8, height: 1, fill: '#64748b' }))),
    s('rect', { width: 1100, height: 400, fill: url('sky') }),
    // Plan 8b: far layer (sun, clouds, ridges, lighthouse) and mid layer (ripples, feeder) move a few units with the
    // pointer on Home (parallax()); the full-bleed sky and sea never move, so no edge shows. Ridges start at x -12 for that.
    s('g', { 'data-layer': 'far' },
      s('circle', { cx: SUN.x, cy: SUN.y, r: 70, fill: url('sunglow'), opacity: 0.55 }),
      s('circle', { cx: SUN.x, cy: SUN.y, r: 24, style: tok('sun') }),
      ...(opts.ambient ? CLOUDS.map(([y, k, dur, delay]) => s('g', { transform: `translate(0,${y}) scale(${k})`, 'aria-hidden': 'true' },
        s('g', { ...amb('cloud', { s: dur, o: delay }), transform: `translate(${((delay / dur) * 1380 - 140).toFixed(0)},0)` },
          s('path', { d: 'M-40 8 Q-44 -2 -30 -3 Q-26 -14 -10 -11 Q0 -22 16 -12 Q32 -14 34 -1 Q46 1 42 8 Z', style: 'fill:var(--hs-cloud)', opacity: 0.92 }),
          s('path', { d: 'M-40 8 Q-20 4 0 6 Q22 4 42 8 Z', fill: '#000000', opacity: 0.06 })))) : []),
      // Son Tra: far ridge (pale, bluish), mid ridge, near headland with shaded slopes away from the sun
      s('path', { d: 'M-12 214 L40 196 L120 168 L200 150 L270 124 L330 104 L392 116 L452 100 L520 128 L590 150 L670 176 L760 196 L780 232 L-12 232 Z', fill: url('far') }),
      s('path', { d: 'M-12 222 L50 204 L130 186 L210 160 L290 148 L350 158 L420 142 L486 162 L548 186 L610 204 L700 222 L700 234 L-12 234 Z', fill: url('mid') }),
      s('path', { d: 'M-12 228 L60 214 L150 204 L240 182 L312 176 L380 186 L460 174 L530 194 L596 206 L640 218 L660 236 L-12 236 Z', fill: url('near') }),
      s('path', { d: 'M312 176 L380 186 L364 236 L320 236 Z M460 174 L530 194 L560 236 L490 236 Z M596 206 L640 218 L660 236 L610 236 Z', fill: '#000000', opacity: 0.16 }),
      s('path', { d: 'M240 182 L312 176 L300 190 L250 194 Z M380 186 L460 174 L440 186 L392 194 Z', fill: '#ffffff', opacity: 0.1 }),
      label(330, 92, 15, t('harbor.sontra'), 'middle'),
      // lighthouse on the headland: lit side, shaded side, lantern with a soft halo
      s('g', { 'aria-hidden': 'true' },
        s('path', { d: 'M597 206 L599 182 L605 182 L607 206 Z', fill: '#f8fafc' }),
        s('path', { d: 'M603 182 L605 182 L607 206 L604 206 Z', fill: '#cbd5e1' }),
        s('path', { d: 'M598.2 190 L605.8 190 L606.2 195 L597.8 195 Z', fill: '#dc2626' }),
        s('rect', { x: 597, y: 177, width: 10, height: 5, rx: 1, fill: '#334155' }),
        s('circle', { ...amb('beacon'), cx: 602, cy: 179, r: 16, fill: url('lamp'), opacity: 0.9 }),
        s('circle', { cx: 602, cy: 179, r: 2.6, fill: '#fef08a' }))),
    // sea: depth gradient, haze at the horizon, the sun's glint, ripples smaller toward the horizon
    s('rect', { y: 230, width: 1100, height: 170, fill: url('sea') }),
    s('rect', { y: 222, width: 1100, height: 14, fill: url('haze') }),
    s('g', { ...amb('glint'), 'aria-hidden': 'true', opacity: 0.7 },
      ...[[238, 46], [246, 38], [255, 50], [265, 30], [276, 40], [288, 22], [301, 30]].map(([y, w], i) =>
        s('rect', { x: SUN.x - w / 2 + ((i * 7) % 11) - 5, y, width: w, height: 2.2, rx: 1.1, style: tok('sun'), opacity: 0.85 - i * 0.09 }))),
    s('g', { 'data-layer': 'mid' },
      s('g', { ...amb('wave', { w: 60, s: 10 }), 'aria-hidden': 'true' }, s('rect', { x: 0, y: 240, width: 1340, height: 6, fill: url('rip0') })),
      s('g', { ...amb('wave', { w: -90, s: 9 }), 'aria-hidden': 'true' }, s('rect', { x: -120, y: 268, width: 1340, height: 10, fill: url('rip1') })),
      s('g', { ...amb('wave', { w: 120, s: 7 }), 'aria-hidden': 'true' }, s('rect', { x: 0, y: 312, width: 1340, height: 14, fill: url('rip2') })),
      s('g', { ...amb('wave', { w: -120, s: 8 }), 'aria-hidden': 'true' }, s('rect', { x: -120, y: 364, width: 1340, height: 14, fill: url('rip2') })),
      // a small feeder leaving for the open sea (Home only)
      opts.ambient ? s('g', { 'aria-hidden': 'true' }, s('g', amb('feeder'),
        s('ellipse', { cx: 646, cy: 317, rx: 50, ry: 2.5, fill: '#000000', opacity: 0.22 }),
        s('path', { d: 'M598 300 L700 300 L694 316 L610 316 Q602 309 598 300 Z', fill: '#334155' }),
        s('path', { d: 'M598 300 L700 300 L699 303 L600 303 Z', fill: '#f8fafc', opacity: 0.8 }),
        ...[['#d97706', 612], ['#0284c7', 632], ['#7c3aed', 652]].flatMap(([fill, x]) => container(x as number, 288, 18, 12, { fill })),
        s('rect', { x: 676, y: 282, width: 16, height: 18, fill: '#f1f5f9' }),
        s('rect', { x: 686, y: 282, width: 6, height: 18, fill: '#cbd5e1' }),
        s('rect', { x: 678, y: 286, width: 12, height: 3, fill: '#0f172a' }))) : null),
    // land: quay wall with fenders and its shadow on the water, apron, road, verge
    s('rect', { x: 672, y: 236, width: 28, height: 76, fill: '#000000', opacity: 0.12 }),
    s('path', { d: 'M700 236 H1100 V400 H660 L700 312 Z', fill: url('quay') }),
    s('path', { d: 'M700 236 H1100 V241 H704 V312 L700 312 Z', style: tok('wall') }),
    ...[252, 272, 292].map((y) => s('rect', { x: 696, y, width: 6, height: 10, rx: 1.5, fill: '#1e293b' })),
    s('path', { d: 'M712 312 L771 312 L792 326 L733 326 Z', fill: '#000000', opacity: 0.1 }), // crane shadow
    s('rect', { x: 684, y: 334, width: 416, height: 26, style: tok('road') }),
    s('rect', { x: 684, y: 334, width: 416, height: 2, fill: '#000000', opacity: 0.18 }),
    s('line', { x1: 690, y1: 347, x2: 1010, y2: 347, stroke: '#f8fafc', 'stroke-opacity': 0.85, 'stroke-width': 2, 'stroke-dasharray': '12 10' }),
    s('rect', { x: 672, y: 360, width: 428, height: 40, style: tok('verge') }),
    ...mast(784, 222, 312),
    ...mast(1004, 214, 334),
    yard,
    drop,
    ship,
    // STS crane: lit and shaded faces (light from the sun on the left), truss boom, portal legs with cross beams
    s('g', { 'aria-hidden': 'true' },
      s('path', { d: 'M740 66 L470 110 M740 66 L1015 110', style: 'stroke:var(--hs-crane-d)', 'stroke-width': 2 }),
      s('rect', { x: 735, y: 58, width: 10, height: 52, style: tok('crane') }),
      s('rect', { x: 741, y: 58, width: 4, height: 52, style: tok('crane-d') }),
      s('circle', { cx: 740, cy: 56, r: 2.5, fill: '#ef4444' }),
      ...[712, 762].flatMap((x) => [
        s('rect', { x, y: 118, width: 9, height: 194, style: tok('crane') }),
        s('rect', { x: x + 6, y: 118, width: 3, height: 194, style: tok('crane-d') }),
        s('rect', { x: x - 3, y: 306, width: 15, height: 6, rx: 1, fill: '#334155' })]),
      s('rect', { x: 712, y: 150, width: 59, height: 6, style: tok('crane') }),
      s('rect', { x: 712, y: 154, width: 59, height: 2, style: tok('crane-d') }),
      s('rect', { x: 712, y: 226, width: 59, height: 5, style: tok('crane') }),
      s('path', { d: 'M718 160 L766 222 M766 160 L718 222 M718 234 L766 300 M766 234 L718 300', style: 'stroke:var(--hs-crane-d)', 'stroke-width': 2.5 }),
      // boom: top and bottom chords with a zigzag web
      s('rect', { x: 470, y: 106, width: 545, height: 4, style: tok('crane') }),
      s('rect', { x: 470, y: 114, width: 545, height: 4, style: tok('crane-d') }),
      s('path', { d: Array.from({ length: 45 }, (_, i) => `${i ? 'L' : 'M'}${472 + i * 12} ${i % 2 ? 114 : 110}`).join(' '), fill: 'none', style: 'stroke:var(--hs-crane)', 'stroke-width': 1.6 }),
      s('rect', { x: 702, y: 88, width: 78, height: 18, rx: 1, style: tok('crane') }),
      s('rect', { x: 702, y: 88, width: 78, height: 3, fill: '#ffffff', opacity: 0.25 }),
      s('rect', { x: 764, y: 88, width: 16, height: 18, style: tok('crane-d') }),
      s('rect', { x: 710, y: 93, width: 16, height: 7, rx: 1, fill: '#7dd3fc' }),
      s('rect', { x: 710, y: 93, width: 16, height: 7, rx: 1, style: 'fill:#fde68a;opacity:var(--hs-lamp)' }),
      s('g', amb('trolley'), trolley)),
    // CFS warehouse interior, the truck (drawn between interior and facade so it disappears inside), facade + shutter
    s('rect', { x: 1012, y: 282, width: 88, height: 78, fill: '#334155' }),
    s('rect', { x: 1026, y: 316, width: 62, height: 44, fill: '#0f172a' }),
    truck,
    s('path', { d: 'M1012 282 H1100 V360 H1088 V316 H1026 V360 H1012 Z', fill: url('shed') }),
    s('rect', { x: 1012, y: 282, width: 6, height: 78, fill: '#000000', opacity: 0.12 }),
    s('path', { d: 'M1004 285 L1056 260 L1100 268 V285 Z', style: tok('roof') }),
    s('path', { d: 'M1004 285 L1056 260 L1058 263 L1008 286 Z', fill: '#ffffff', opacity: 0.25 }),
    ...[1024, 1046, 1068].map((x) => s('rect', { x, y: 292, width: 16, height: 5, rx: 1, fill: '#475569' })),
    ...[1024, 1046, 1068].map((x) => s('rect', { x, y: 292, width: 16, height: 5, rx: 1, style: 'fill:#fde68a;opacity:var(--hs-lamp)' })),
    shutter,
    s('rect', { x: 1024, y: 313, width: 66, height: 4, fill: '#475569' }),
    label(1057, 254, 12, t('harbor.cfs'), 'middle'),
    // customs gate: booth with a lit sign
    s('rect', { x: 881, y: 362, width: 80, height: 26, rx: 2, fill: '#f8fafc', stroke: '#334155' }),
    s('rect', { x: 881, y: 356, width: 80, height: 7, rx: 1, fill: '#1d4ed8' }),
    text(921, 380, 12, '#1e3a8a', t('harbor.customs'), 'middle'),
    s('rect', { x: 902, y: 330, width: 6, height: 30, fill: '#334155' }),
    barrier,
    gateTag,
    label(872, 388, 12, t('harbor.yardLabel'), 'end'),
    label(1088, 30, 13, t('harbor.port'), 'end'),
    // status callout (outside the stage's crop); HTML repeats it below lg, so the empty box hides there too
    s('g', { class: 'max-lg:hidden' },
      s('rect', { x: 24, y: 312, width: 360, height: 64, rx: 14, fill: '#0f172a', 'fill-opacity': 0.72, stroke: '#ffffff', 'stroke-opacity': 0.12 }),
      s('text', { x: 40, y: 338, 'font-family': FONT, 'font-size': 14, 'font-weight': 600, fill: '#f8fafc' }, callA),
      s('text', { x: 40, y: 360, 'font-family': FONT, 'font-size': 14, 'font-weight': 600, fill: '#bae6fd' }, callB)));

  const parts: HarborParts = { svg, yard, drop, ship, trolley, hoist, cable, spreader, carry, truck, truckBox, barrier, shutter, gateTag, gateText };
  drawYard(parts, h, opts.fresh);
  return parts;
}

/** Home's truck (S1): from the road's end to the gate, into the CFS, a wait, then back out; one 18 s loop, seconds. */
export const TRUCK_LOOP = 18;
export const TRUCK_PLAN: { at: number; dur: number; part: 'truck' | 'barrier' | 'shutter'; from: number; to: number; ease: string }[] = [
  { part: 'truck', at: 0, dur: 3.2, from: 640, to: 778, ease: 'power2.out' },
  { part: 'barrier', at: 3.4, dur: 0.6, from: 0, to: 80, ease: 'back.out(1.6)' },
  { part: 'truck', at: 4.2, dur: 2, from: 778, to: 940, ease: 'power1.in' },
  { part: 'shutter', at: 5, dur: 1, from: 0, to: 1, ease: 'power2.inOut' },
  { part: 'truck', at: 6.4, dur: 1.2, from: 940, to: 1020, ease: 'power2.out' },
  { part: 'barrier', at: 6.6, dur: 0.6, from: 80, to: 0, ease: 'power2.inOut' },
  { part: 'shutter', at: 7.8, dur: 0.8, from: 1, to: 0, ease: 'power2.inOut' },
  { part: 'shutter', at: 10.2, dur: 0.8, from: 0, to: 1, ease: 'power2.inOut' },
  { part: 'barrier', at: 10.4, dur: 0.6, from: 0, to: 80, ease: 'back.out(1.6)' },
  { part: 'truck', at: 11.2, dur: 1.2, from: 1020, to: 930, ease: 'power2.in' },
  { part: 'shutter', at: 12.6, dur: 0.8, from: 1, to: 0, ease: 'power2.inOut' },
  { part: 'truck', at: 12.6, dur: 2, from: 930, to: 778, ease: 'power2.out' },
  { part: 'barrier', at: 14.8, dur: 0.6, from: 80, to: 0, ease: 'power2.inOut' },
  { part: 'truck', at: 15.6, dur: 2, from: 778, to: 640, ease: 'power1.in' },
];

/**
 * S1: Home's ambient loops on GSAP (waves, clouds, the lighthouse every 2.4 s, the glint, funnel smoke, the leaving
 * feeder, the crane, the truck). Every loop is a paused timeline scrubbed from the shared ambient() clock, so it stops
 * while the scene is off screen or the tab is hidden, and a redraw never restarts it. Nothing under reduced motion
 * (the static frame stays); the scene is static until the gsap chunk is in. Returns stop.
 */
export const harborLife = (p: HarborParts): (() => void) => withGsap(p.svg, (g) => live(p, g));

/** Starts `f` once the gsap chunk is in, if `svg` is still in the page; nothing under reduced motion. Returns stop. */
function withGsap(svg: SVGSVGElement, f: (g: Gsap) => () => void): () => void {
  if (reducedMotion()) return () => {};
  let stop = (): void => {};
  let dead = false;
  prefetchGsap();
  gsapMod?.then((g) => { if (!dead && svg.isConnected) stop = f(g); }, () => {});
  return () => { dead = true; stop(); };
}

function live(p: HarborParts, g: Gsap): () => void {
  const loops: [Timeline, number, number][] = [];
  const loop = (period: number, offset: number, f: (tl: Timeline) => void): void => {
    const tl = g.timeline();
    f(tl);
    loops.push([tl, period, offset]);
  };
  const q = (k: string): SVGElement[] => [...p.svg.querySelectorAll<SVGElement>(`[data-amb="${k}"]`)];
  const num = (el: SVGElement, k: string): number => Number(el.dataset[k] ?? 0);
  for (const el of q('wave')) loop(num(el, 's'), 0, (tl) => tl.fromTo(el, { x: 0 }, { x: -num(el, 'w'), duration: num(el, 's'), ease: 'none' }));
  for (const el of q('cloud')) loop(num(el, 's'), num(el, 'o'), (tl) => tl.fromTo(el, { x: -140 }, { x: 1240, duration: num(el, 's'), ease: 'none' }));
  for (const el of q('beacon')) loop(2.4, 0, (tl) => tl.set(el, { opacity: 0.9 }, 0).to(el, { opacity: 0.12, duration: 0.5, ease: 'power1.in' }, 1.2).to(el, { opacity: 0.9, duration: 0.5, ease: 'power1.out' }, 1.9));
  for (const el of q('glint')) loop(3.2, 0, (tl) => tl.fromTo(el, { opacity: 0.45 }, { opacity: 0.9, duration: 1.6, ease: 'sine.inOut' }).to(el, { opacity: 0.45, duration: 1.6, ease: 'sine.inOut' }));
  for (const el of q('smoke')) loop(3, num(el, 'o'), (tl) => tl.fromTo(el, { opacity: 0.6, x: 0, y: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 0, x: -30, y: -40, scale: 1.6, duration: 3, ease: 'power1.out' }));
  for (const el of q('feeder')) loop(16, 0, (tl) => tl.fromTo(el, { x: 0, y: 0, scale: 1, opacity: 1, transformOrigin: '50% 50%' }, { x: -420, y: -14, scale: 0.6, duration: 16, ease: 'none' }).to(el, { opacity: 0, duration: 2.4, ease: 'none' }, 13.6));
  // crane: lift from the ship, travel to the quay, set down, lift, back (7 s, like the v5 CSS loop it replaces)
  for (const el of q('trolley')) loop(7, 0, (tl) => {
    const k = { y: 0 };
    const hoist = (): void => setHoist(p, CRANE.y + k.y);
    tl.set(el, { x: 0 }, 0).set(k, { y: 0, onUpdate: hoist }, 0)
      .to(k, { y: 50, duration: 0.8, ease: 'power2.inOut', onUpdate: hoist }, 0.6).to(k, { y: 0, duration: 0.8, ease: 'power2.inOut', onUpdate: hoist }, 1.6)
      .to(el, { x: 250, duration: 1.6, ease: 'cq-crane' }, 2.4)
      .to(k, { y: 60, duration: 0.6, ease: 'power2.inOut', onUpdate: hoist }, 4.1).to(k, { y: 0, duration: 0.6, ease: 'power2.inOut', onUpdate: hoist }, 4.8)
      .to(el, { x: 0, duration: 1.4, ease: 'cq-crane' }, 5.5);
  });
  loop(TRUCK_LOOP, 0, (tl) => {
    const put = { truck: (x: number) => setTruck(p, x, Math.min(1, Math.max(0, (x - 640) / 40))), barrier: (x: number) => setBarrier(p, x), shutter: (x: number) => setShutter(p, x) };
    for (const sg of TRUCK_PLAN) drive(tl, sg.at, sg.dur, sg.ease, (x) => put[sg.part](sg.from + (sg.to - sg.from) * x));
    tl.call(() => {}, undefined, TRUCK_LOOP); // the loop is 18 s even though the last move ends earlier
  });
  const stopClock = ambient(p.svg, (ms) => {
    if (!p.svg.isConnected) return end();
    const sec = ms / 1000;
    for (const [tl, period, offset] of loops) tl.time((sec + offset) % period);
  });
  function end(): void {
    stopClock();
    for (const [tl] of loops) tl.kill();
  }
  return end;
}

// ---- the route map (was ui/routeMap.ts; ui-ux-v6 S2: Natural Earth coastline, src/art/coast.ts + seaLanes.ts) ----

/** AA on the sea and on the land in both themes; every label also has a sea-coloured halo (paint-order stroke). */
const OPEN_TEXT = 'fill-slate-900 dark:fill-slate-100';
const LOCKED_TEXT = 'fill-slate-600 dark:fill-slate-300';
const LOCKED_LINE = 'stroke-slate-400 dark:stroke-slate-500';
const LOCKED_PIN = 'fill-slate-400 dark:fill-slate-500';
/** Map units: 14 units ≥ 11 CSS px once the map is ≥ 786 px wide, true wherever labels show (lg and up, full card width; probed in v6 T8). */
const LABEL_SIZE = 14;
const HALO = { stroke: 'var(--map-halo)', 'stroke-width': 4, 'stroke-linejoin': 'round', 'paint-order': 'stroke' } as const;

export interface MapParts {
  svg: SVGSVGElement;
  ship: SVGGElement;
  wake: SVGPathElement;
  routes: Record<string, SVGPathElement>;
  pins: Record<string, SVGCircleElement>;
  /** The faint ring around an open port's pin (S2: dot + ring). */
  halos: Record<string, SVGCircleElement>;
  labels: Record<string, SVGTextElement>;
  /** Pulsing rings (Plan 8b): the hub and the next lane to open. Under reduced motion they stay still, like a pin outline. */
  rings: SVGGElement;
}
export const portXY = (port: string): Pt => xy(LANE_GEO[port].port);
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
    p.halos[r.port].setAttribute('class', open ? color.stroke : 'stroke-transparent');
    p.labels[r.port].setAttribute('class', open ? OPEN_TEXT : LOCKED_TEXT);
    p.labels[r.port].textContent = r.name + (trips ? ` · ${trips}` : '');
  }
  p.svg.setAttribute('aria-label', t('routes.label', { lanes: routeItems(h).join('; ') }));
  const next = ROUTES.filter((r) => !h.open.has(r.port)).sort((a, b) => a.opens - b.opens)[0];
  const ring = ([x, y]: Pt, cls: string): SVGCircleElement => s('circle', { cx: x, cy: y, r: 6, fill: 'none', 'stroke-width': 2, class: cx('cq-pulse', cls) });
  p.rings.replaceChildren(ring(xy(HUB), 'stroke-red-600'), ...(next ? [ring(portXY(next.port), chapterColor(Math.max(1, next.opens)).stroke)] : []));
}

let mapUid = 0;
/** Faint meridians and parallels every 20° (S2), one path. */
function graticule(): string {
  let d = '';
  for (let lon = 0; lon <= 240; lon += 20) d += `M${xy([lon, 0])[0]} 0V${COAST.h}`;
  for (let lat = -40; lat <= 60; lat += 20) d += `M0 ${xy([0, lat])[1]}H${COAST.w}`;
  return d;
}

/** Lanes radiating from Tien Sa (L26) over the real coastline (S2, viewBox 1000×400). */
export function routeMap(h: Harbor): MapParts {
  const id = `cqm${++mapUid}`;
  const routes: Record<string, SVGPathElement> = {};
  const pins: Record<string, SVGCircleElement> = {};
  const halos: Record<string, SVGCircleElement> = {};
  const labels: Record<string, SVGTextElement> = {};
  for (const r of ROUTES) {
    const [x, y] = portXY(r.port);
    const [dx, dy, anchor] = LANE_GEO[r.port].label;
    routes[r.port] = s('path', { d: lanePath(r.port), fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    halos[r.port] = s('circle', { cx: x, cy: y, r: 11, fill: 'none', 'stroke-width': 2, 'stroke-opacity': 0.35 });
    pins[r.port] = s('circle', { cx: x, cy: y, r: 6, stroke: 'var(--map-halo)', 'stroke-width': 2 });
    labels[r.port] = s('text', { x: x + dx, y: y + dy, 'text-anchor': anchor, ...HALO });
  }
  const rings = s('g', { 'aria-hidden': 'true', 'pointer-events': 'none' });
  const wake = s('path', { fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0, 'aria-hidden': 'true' });
  // v6 T1: the inner <g> is the ship's mirror (set by the GSAP sail, never by GSAP itself); the outer one takes the motion transform.
  const ship = s('g', { opacity: 0, 'aria-hidden': 'true' }, s('g', {},
    s('path', { d: 'M-11 -2 L11 -2 L8 5 L-8 5 Z', fill: '#1e3a8a', stroke: 'var(--map-halo)', 'stroke-width': 1 }),
    s('rect', { x: -7, y: -7, width: 8, height: 5, fill: '#d97706' }),
    s('rect', { x: 2, y: -9, width: 5, height: 7, fill: '#f8fafc', stroke: '#1e3a8a', 'stroke-width': 0.8 })));
  const [hx, hy] = xy(HUB);
  // L23/L34: labels hide below lg (the page and the dialog list routeItems() as HTML there); from lg the map is the card's full width
  const svg = s('svg', { viewBox: `0 0 ${COAST.w} ${COAST.h}`, 'data-map': 'routes', class: 'block w-full rounded-(--r-ctl) max-lg:[&_text]:hidden', role: 'img' },
    s('defs', {},
      s('linearGradient', { id: `${id}-sea`, x1: 0, y1: 0, x2: 0, y2: 1 },
        s('stop', { offset: 0, style: 'stop-color:var(--map-sea-1)' }), s('stop', { offset: 1, style: 'stop-color:var(--map-sea-2)' }))),
    s('rect', { width: COAST.w, height: COAST.h, fill: `url(#${id}-sea)` }),
    s('path', { d: graticule(), fill: 'none', stroke: 'var(--map-grid)', 'stroke-width': 0.8, 'aria-hidden': 'true' }),
    s('path', { d: LAND, 'fill-rule': 'evenodd', fill: '#000000', opacity: 0.12, transform: 'translate(0,2)', 'aria-hidden': 'true' }), // soft shadow under the land
    s('path', { d: LAND, 'fill-rule': 'evenodd', style: 'fill:var(--ground);stroke:var(--map-coast)', 'stroke-width': 0.9, 'stroke-linejoin': 'round', 'aria-hidden': 'true' }),
    s('g', {}, ...Object.values(routes)),
    wake,
    s('g', { 'aria-hidden': 'true' }, ...Object.values(halos)),
    s('g', { 'font-family': FONT, 'font-size': LABEL_SIZE, 'font-weight': 700 }, ...Object.values(pins), ...Object.values(labels)),
    rings,
    ship,
    s('circle', { cx: hx, cy: hy, r: 8, fill: '#dc2626', stroke: 'var(--map-halo)', 'stroke-width': 3 }),
    s('text', { x: hx + 14, y: hy + 14, 'font-family': FONT, 'font-size': LABEL_SIZE, 'font-weight': 800, class: OPEN_TEXT, ...HALO }, t('routes.hub')));
  const parts: MapParts = { svg, ship, wake, routes, pins, halos, labels, rings };
  paintRoutes(parts, h);
  return parts;
}

/** The dock's map (A2): a 1000×265 band around `port`'s lane, so the dock is no taller than with the v5 map (375 px: never over the editor); text hidden. */
export function cropToLane(p: MapParts, port: string | undefined): void {
  // place names would render at ~9 px in the 640 px dock (gate: ≥ 11 px), and the dock's sentence names the lanes
  p.svg.setAttribute('class', 'block w-full [&_text]:hidden');
  if (!port || !LANE_GEO[port]) return; // no lane (promotions from chapter 6): the whole map, no band holds every pin
  const ys = laneCurve(port).flat().map(([, y]) => y);
  const band = 265;
  const top = Math.min(COAST.h - band, Math.max(0, (Math.min(...ys) + Math.max(...ys)) / 2 - band / 2));
  p.svg.setAttribute('viewBox', `0 ${Math.round(top)} ${COAST.w} ${band}`);
}

/** The map on a reading page or the open map dialog: new lanes draw in one after another, then (GSAP in) the fleet sails. Returns stop. */
export function liveMap(p: MapParts, h: Harbor, draw: string[], order: string[]): () => void {
  void drawNewRoutes(p, draw);
  return withGsap(p.svg, (g) => sailFleet(g, p, h, order));
}

// ---- completion scenes (were in ui/stage.ts; on GSAP timelines since ui-ux-v6 A2) ----

/** One completion animation. `fast`: skipped or reduced motion, so the scene draws its end state at once. */
export interface Run {
  fast: boolean;
  done: boolean;
  /** Set while a GSAP timeline plays (src/art/gsap.ts play()): jumps it to its end state. ui/stage.ts calls it after setting `fast`. */
  skip?: () => void;
}

type Gsap = typeof import('./gsap');
type Timeline = ReturnType<Gsap['timeline']>;
let gsapMod: Promise<Gsap> | undefined;
let gsapReady: Gsap | undefined;
/**
 * ui-ux-v6 §2.1: GSAP's own lazy chunk, never a static import, fetched when idle after the art chunk (src/art/load.ts
 * prefetchArt) and again by a completion that found it missing. A failed load is dropped so the next call retries.
 */
export const prefetchGsap = (): void => {
  gsapMod ??= import('./gsap').then((m) => (gsapReady = m), (e: unknown) => { gsapMod = undefined; throw e; });
  gsapMod.catch(() => {});
};
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

const titleOf = (c: Ctx): string => textOf(c.tk, getLang()).title;
/** Lanes this completion opened (L32: the chapter's lane and/or the lane its ship sailed), as port names. */
const openedNames = (c: Ctx): string[] => ROUTES.filter((r) => c.after.open.has(r.port) && !c.before.open.has(r.port)).map((r) => r.name);
/** Where each step of `steps` (ms) starts, in seconds, then the end: marks([400, 400]) = [0, 0.4, 0.8]. */
const marks = (steps: readonly number[]): number[] => steps.reduce<number[]>((a, ms) => [...a, a[a.length - 1] + ms / 1000], [0]);

// ---- scene parts (geometry of mockup v5); §2.3: GSAP tweens a state object and these setters write the attributes ----
function setCrane(p: HarborParts, x: number, y: number, carry?: string | false): void {
  p.trolley.setAttribute('transform', `translate(${x},0)`);
  setHoist(p, y);
  if (carry === false) p.carry.setAttribute('opacity', '0');
  else if (carry) {
    p.carry.setAttribute('class', carry);
    p.carry.setAttribute('opacity', '1');
  }
}
/** Spreader (and load) at height `y`, the cable reaching down to it. */
function setHoist(p: HarborParts, y: number): void {
  p.cable.setAttribute('y2', String(y));
  p.spreader.setAttribute('y', String(y));
  p.carry.setAttribute('y', String(y + 4));
}
/** The load swings `deg` about the trolley (0 = hanging straight: no attribute). */
function setSway(p: HarborParts, deg: number): void {
  if (Math.abs(deg) < 0.01) p.hoist.removeAttribute('transform');
  else p.hoist.setAttribute('transform', `rotate(${deg.toFixed(2)} 0 125)`);
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
const setShutter = (p: HarborParts, open: number): void => p.shutter.setAttribute('height', String(Math.max(0, 44 * (1 - open))));
function gateTag(p: HarborParts, label: string): void {
  p.gateText.textContent = label;
  p.gateTag.setAttribute('opacity', label ? '1' : '0');
}

/** Tweens 0 → 1 over [at, at + dur] seconds and hands the eased value to `f` (one of the setters above). */
function drive(tl: Timeline, at: number, dur: number, ease: string, f: (x: number) => void): void {
  const o = { x: 0 };
  tl.to(o, { x: 1, duration: dur, ease, onUpdate: () => f(o.x) }, at);
}

/** End frame of every harbour scene: ship berthed, crane home, truck gone, gate shut, yard redrawn from `after` with the new container marked. */
function harborEnd(c: Ctx): void {
  const p = c.harbor;
  if (!p) return;
  p.drop.replaceChildren();
  setShip(p, 0, 1);
  setCrane(p, CRANE.x, CRANE.y, false);
  setSway(p, 0);
  setTruck(p, 640, 0);
  setBarrier(p, 0);
  setShutter(p, 0);
  gateTag(p, '');
  drawYard(p, c.after, new Set([c.tk.chapter]));
}
/** End frame of the map: no ship, no wake, no half-drawn lane; lanes repainted from `after`. */
function mapEnd(c: Ctx): void {
  const m = c.map;
  if (!m) return;
  m.ship.setAttribute('opacity', '0');
  m.wake.setAttribute('opacity', '0');
  for (const path of Object.values(m.routes)) { // DrawSVG's inline dashes go, so paintRoutes() attributes win afterwards
    path.style.removeProperty('stroke-dasharray');
    path.style.removeProperty('stroke-dashoffset');
  }
  paintRoutes(m, c.after);
}

/** +1 container falls into this chapter's bay over [at, at + dur] (§1.1), then the yard is redrawn with it. */
function dropBox(c: Ctx, tl: Timeline, at: number, dur: number): void {
  const p = c.harbor;
  if (!p) return;
  const ch = c.tk.chapter;
  const tier = (c.after.bays[ch] ?? 1) - 1;
  if (tier >= MAX_TIERS) return;
  const b = bayBox(ch, tier);
  const box = s('rect', { x: b.x, y: b.y - 30, width: b.w, height: b.h - 0.6, class: chapterColor(ch).fill, opacity: 0 });
  p.drop.append(box);
  drive(tl, at, dur, 'power2.in', (x) => {
    box.setAttribute('y', String(b.y - 30 * (1 - x)));
    box.setAttribute('opacity', String(Math.min(1, x * 3)));
  });
  tl.call(() => { box.remove(); drawYard(p, c.after, new Set([ch])); }, undefined, at + dur);
}

/** The truck (in this chapter's colour) rolls up to the gate and stops. */
function toGate(c: Ctx, tl: Timeline, at: number, dur: number): void {
  const p = c.harbor!;
  tl.call(() => { p.truckBox.setAttribute('class', chapterColor(c.tk.chapter).fill); setBarrier(p, 0); }, undefined, at);
  drive(tl, at, dur, 'power2.out', (x) => setTruck(p, 640 + 138 * x, Math.min(1, x * 3)));
}
/** The barrier swings up to 80° with a little spring, or back down. */
function barrier(c: Ctx, tl: Timeline, at: number, dur: number, up: boolean): void {
  drive(tl, at, dur, up ? 'elastic.out(1,0.6)' : 'power2.inOut', (x) => setBarrier(c.harbor!, 80 * (up ? x : 1 - x)));
}

/** The map ship runs the lane to `port` over [at, at + dur] by MotionPath, its wake drawn behind it (DrawSVG); the port pulses on arrival. */
function mapSail(c: Ctx, g: Gsap, tl: Timeline, port: string, at: number, dur: number): void {
  const m = c.map;
  const r = ROUTES.find((x) => x.port === port);
  if (!m || !r) return;
  const path = m.routes[port];
  const mirror = m.ship.firstElementChild as SVGGElement;
  const color = chapterColor(c.tk.chapter).stroke;
  m.wake.setAttribute('d', path.getAttribute('d') ?? '');
  m.wake.setAttribute('class', color);
  tl.call(() => { m.wake.setAttribute('opacity', '0.55'); m.ship.setAttribute('opacity', '1'); }, undefined, at)
    .fromTo(m.wake, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'power1.inOut', immediateRender: false }, at)
    .to(m.ship, {
      duration: dur, ease: 'power1.inOut',
      motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true },
      onUpdate: () => { // heading left: mirror upright instead of sailing upside down
        const deg = Number(g.gsap.getProperty(m.ship, 'rotation'));
        mirror.setAttribute('transform', Math.cos((deg * Math.PI) / 180) < 0 ? 'scale(1,-1)' : '');
      },
    }, at)
    // Plan 8b: the port pulses during the last 250 ms of the voyage (inside the step, never after it)
    .call(() => { if (!c.run.fast) arrivalPulse(m, ...portXY(port), color); }, undefined, at + dur - 0.25)
    .call(() => { m.ship.setAttribute('opacity', '0'); m.wake.setAttribute('opacity', '0'); }, undefined, at + dur);
}

// ---- cards over the art ----
const CARD_OV = 'w-64 max-w-[calc(100vw-4rem)] rounded-(--r-ctl) bg-panel p-3 text-body-sm shadow-(--shadow-2) ring-1 ring-line';
const STAMP = 'absolute rounded-(--r-inset) border-[3px] px-2 py-0.5 text-[15px] font-extrabold tracking-wide uppercase';
/** Lane colour is never the only signal: the stamp spells the lane out (§6). */
const LANE: Record<Lane, { key: Key; stamp: string }> = {
  green: { key: 'anim.laneGreen', stamp: 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200' },
  yellow: { key: 'anim.laneYellow', stamp: 'border-yellow-700 bg-yellow-50 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-200' },
  red: { key: 'anim.laneRed', stamp: 'border-red-700 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-200' },
};
const GATE: Record<Lane, Key | undefined> = { green: undefined, yellow: 'anim.gateYellow', red: 'anim.gateRed' };

/** Top right over a picture; on its own when the kind has no picture (quote, ledger, chat). */
function overlay(c: Ctx, card: HTMLElement): HTMLElement {
  const pictured = Boolean(c.harbor || c.map);
  card.style.opacity = '0';
  c.art.append(h('div', { class: pictured ? 'absolute top-2 right-2' : 'p-3' }, card));
  return card;
}
/** End frame of a card part: shown, nothing left of a tween. */
function shown(...els: HTMLElement[]): void {
  for (const el of els) {
    el.style.opacity = '1';
    el.style.transform = '';
  }
}
function cardIn(tl: Timeline, card: HTMLElement, at: number, dur: number): void {
  tl.fromTo(card, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: dur, ease: 'power2.out', immediateRender: false }, at);
}

interface Stamp { el: HTMLElement; ring: SVGEllipseElement }
/** A rubber stamp with an ink ring round it (drawn by DrawSVG once the stamp lands). */
function stampEl(text: string, cls: string): Stamp {
  const ring = s('ellipse', { cx: 50, cy: 50, rx: 48, ry: 44, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', opacity: 0.5 });
  const el = h('span', { class: cx(STAMP, cls) }, text,
    s('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', class: 'pointer-events-none absolute -top-2 -left-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] overflow-visible' }, ring));
  el.style.opacity = '0';
  return { el, ring };
}
/** It slams down (scale 1.5 → 1, a little past and back), then the ink spreads round it. */
function slam(tl: Timeline, st: Stamp, at: number, dur: number): void {
  tl.fromTo(st.el, { opacity: 0, scale: 1.5, rotation: -10 }, { opacity: 1, scale: 1, rotation: -10, duration: dur, ease: 'back.out(2.2)', immediateRender: false }, at)
    .fromTo(st.ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out' }, at + dur * 0.5);
}
function stampEnd(st: Stamp): void {
  st.el.style.opacity = '1';
  st.el.style.transform = 'rotate(-10deg)';
}

function promoCard(c: Ctx): HTMLElement {
  const lang = getLang();
  const from = c.rankBefore.tier?.[lang] ?? t('career.intern');
  const to = c.rankAfter.tier?.[lang] ?? t('career.intern');
  const opened = openedNames(c);
  // Plan 8b D8b-6 (Plan 7 V18): Boon cheers beside the promotion card; Lily cheers in the dock (ui/stage.ts)
  // v21 U12: a band between the harbour and the map (never over the scene), the kicker one short line; Lily stands at its right
  // end (ui/stage.ts fills [data-lily-slot]), out of the map.
  return h('div', { class: 'flex items-center gap-3 border-y border-amber-500/60 bg-panel px-4 py-2' },
    mascot('boon', 'cheer', 'size-12 shrink-0'),
    h('div', { class: 'min-w-0 flex-1' },
      h('p', { class: 'm-0 text-caption font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200' }, t('anim.promoKicker', { n: c.tk.chapter })),
      h('p', { class: 'm-0 text-body font-bold' }, from !== to ? `${from} → ${to}` : t('anim.promoStep', { career: c.rankAfter.career?.[lang] ?? to })),
      opened.length ? h('p', { class: 'm-0 text-caption text-muted' }, t('anim.promoRoute', { port: opened.join(', ') })) : null),
    h('span', { class: 'shrink-0', 'data-lily-slot': '' }));
}

// ---- promotion: schedule and confetti (v6 A2) ----
/**
 * The promotion's 3.0 s, [from, to] in seconds. With no new lane to draw the ship sails from lane[0] to sail[1]. `lily`:
 * ui/stage.ts starts her cheer (MOVES.cheer, 700 ms) there, so it ends with the scene.
 */
export const PROMO = {
  drop: [0, 0.4], lane: [0.4, 1.3], sail: [1.3, 2.6], card: [0.4, 0.8], confetti: [0.6, 2.4], berth: [0.4, 2.4], lily: [2.3, 3.0],
} as const satisfies Record<string, readonly [number, number]>;

export interface ConfettiBit {
  /** 0 = the cannon in the lower left corner, 1 = lower right. */
  side: 0 | 1;
  /** Physics2D launch angle in degrees (0 = right, -90 = up) and speed in viewBox units per second. */
  angle: number;
  velocity: number;
  /** Seconds after PROMO.confetti[0] this piece leaves. */
  delay: number;
  /** Degrees turned over the flight. */
  spin: number;
  /** Seconds per half flip (the scaleY flutter that makes a flat piece read as paper). */
  flip: number;
  shape: number;
  /** CHAPTER_COLOR index 1–12. */
  color: number;
}
/** 28 pieces from two cannons, seeded by the ticket id (mulberry32 over an FNV-1a hash): a promotion always throws the same burst. */
export function confettiBits(id: string, n = 28): ConfettiBit[] {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 16777619);
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, (_, i) => {
    const side = (i % 2) as 0 | 1;
    const tilt = 56 + rnd() * 24; // degrees above the horizon, toward the middle
    return {
      side, angle: side ? -180 + tilt : -tilt, velocity: 560 + rnd() * 160, delay: rnd() * 0.3,
      spin: (rnd() < 0.5 ? -1 : 1) * (240 + rnd() * 480), flip: 0.14 + rnd() * 0.16, shape: Math.floor(rnd() * 3), color: 1 + Math.floor(rnd() * 12),
    };
  });
}
/** Strip, square, triangle, centred on 0,0 (viewBox units of the dock's harbour crop). */
const BIT_SHAPE = ['M-6 -2.2h12v4.4h-12z', 'M-3.6 -3.6h7.2v7.2h-7.2z', 'M0 -4.4L4.2 3.2H-4.2z'];
/**
 * Physics2D pieces inside the harbour picture (no canvas, never over the page), PROMO.confetti[0] → [1], gone by then.
 * None at all for a fast run (reduced motion, or skipped before it started).
 */
function confetti(c: Ctx, tl: Timeline): SVGGElement | undefined {
  const p = c.harbor;
  if (!p || c.run.fast) return undefined;
  const [from, to] = PROMO.confetti;
  const group = s('g', { 'aria-hidden': 'true', 'pointer-events': 'none' });
  for (const b of confettiBits(c.tk.id)) {
    const piece = s('path', { d: BIT_SHAPE[b.shape], class: CHAPTER_COLOR[b.color].fill, 'data-confetti': '', opacity: 0 });
    // the crop is x 440–1100, y 140–400: the cannons sit just inside its lower corners (an outer <g> places, GSAP moves the path)
    group.append(s('g', { transform: `translate(${b.side ? 1080 : 460},392)` }, piece));
    const at = from + b.delay;
    const dur = to - at;
    tl.set(piece, { opacity: 1 }, at)
      .to(piece, { duration: dur, ease: 'none', physics2D: { velocity: b.velocity, angle: b.angle, gravity: 460, friction: 0.045 } }, at)
      .to(piece, { rotation: b.spin, duration: dur, ease: 'none' }, at)
      .to(piece, { scaleY: -1, duration: b.flip, ease: 'sine.inOut', yoyo: true, repeat: Math.max(1, Math.floor(dur / b.flip) - 1) }, at)
      .to(piece, { opacity: 0, duration: 0.45, ease: 'power1.in' }, to - 0.45);
  }
  p.svg.append(group);
  return group;
}

// ---- the eight kinds (§2), step lengths from STEPS; each scene ends exactly at durationOf with its end frame ----
/**
 * No GSAP (still loading or failed, §2.1): the end frame at once. Otherwise a paused timeline built by `build` and closed
 * by `end` at durationOf, so the card scenes keep their trailing wait and the end frame is the same either way.
 */
function scene(c: Ctx, g: Gsap | undefined, end: () => void, build: (tl: Timeline, g: Gsap) => void): Timeline | undefined {
  if (!g) {
    end();
    return undefined;
  }
  const tl = g.timeline();
  build(tl, g);
  return tl.call(end, undefined, durationOf(c.scene) / 1000);
}

type Kind = (c: Ctx, g: Gsap | undefined) => Timeline | undefined;
const SCENES: Record<Scene['kind'], Kind> = {
  // leave the berth (1.6 s) while sailing the lane on the map (2.2 s); berth back + container drop
  ship: (c, g) => scene(c, g, () => { harborEnd(c); mapEnd(c); }, (tl, g) => {
    const [, sail, end] = marks(STEPS.ship);
    const p = c.harbor;
    if (p) {
      drive(tl, 0, 1.6, 'power1.in', (x) => setShip(p, x, x < 0.7 ? 1 : 1 - (x - 0.7) / 0.3));
      tl.call(() => setShip(p, 0, 0), undefined, 1.6);
      drive(tl, sail, end - sail, 'power1.inOut', (a) => setShip(p, 0, a));
      dropBox(c, tl, sail, end - sail);
    }
    if (c.scene.to) mapSail(c, g, tl, c.scene.to, 0, sail);
  }),

  // lower, lift, travel (inertia; the load swings ±3°), lower (the swing settles), release, trolley home
  yard: (c, g) => scene(c, g, () => harborEnd(c), (tl) => {
    const p = c.harbor!;
    const T = marks(STEPS.yard);
    const ch = c.tk.chapter;
    const b = bayBox(ch, Math.min((c.after.bays[ch] ?? 1) - 1, MAX_TIERS - 1));
    const bayX = b.x + b.w / 2;
    const k = { x: CRANE.x, y: CRANE.y, a: 0 };
    const draw = (): void => { setCrane(p, k.x, k.y); setSway(p, k.a); };
    const travel = T[3] - T[2];
    tl.to(k, { y: 220, duration: T[1], ease: 'power2.inOut', onUpdate: draw }, 0)
      .call(() => setCrane(p, k.x, 220, chapterColor(ch).fill), undefined, T[1])
      .to(k, { y: 160, duration: T[2] - T[1], ease: 'power2.out', onUpdate: draw }, T[1])
      .to(k, { x: bayX, duration: travel, ease: 'cq-crane', onUpdate: draw }, T[2])
      // the load lags while the trolley speeds up, swings ahead while it brakes, then settles as it is lowered
      .to(k, { a: 3, duration: travel * 0.3, ease: 'sine.out', onUpdate: draw }, T[2])
      .to(k, { a: -3, duration: travel * 0.7, ease: 'sine.inOut', onUpdate: draw }, T[2] + travel * 0.3)
      .to(k, { a: 0, duration: T[4] - T[3], ease: 'elastic.out(1,0.5)', onUpdate: draw }, T[3])
      .to(k, { y: b.y - 4, duration: T[4] - T[3], ease: 'power2.inOut', onUpdate: draw }, T[3])
      .call(() => { setCrane(p, bayX, b.y - 4, false); drawYard(p, c.after, new Set([ch])); }, undefined, T[4])
      .to(k, { y: CRANE.y, duration: T[5] - T[4], ease: 'power2.out', onUpdate: draw }, T[4])
      .to(k, { x: CRANE.x, duration: T[6] - T[5], ease: 'cq-crane', onUpdate: draw }, T[5]);
  }),

  // declaration, stamp, truck to gate, [lane wait], barrier, drive through
  customs: (c, g) => {
    const p = c.harbor!;
    const lane = c.scene.lane ?? 'green';
    const st = stampEl(t('anim.stamp', { lane: t(LANE[lane].key) }), cx('right-3 bottom-2', LANE[lane].stamp));
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative pb-12') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.declaration')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      st.el));
    const keep = reducedMotion(); // §5: under reduced motion the card stays until Close
    return scene(c, g, () => { harborEnd(c); stampEnd(st); card.style.transform = ''; card.style.opacity = keep ? '1' : '0'; }, (tl) => {
      const [showS, stampS, gateS, barrierS, driveS] = STEPS.customs.map((ms) => ms / 1000);
      const atGate = showS + stampS + gateS;
      const up = atGate + GATE_WAIT[lane] / 1000;
      const go = up + barrierS;
      cardIn(tl, card, 0, showS);
      slam(tl, st, showS, stampS);
      toGate(c, tl, showS + stampS, gateS);
      const gate = GATE[lane];
      if (gate) tl.call(() => gateTag(p, t(gate)), undefined, atGate).call(() => gateTag(p, ''), undefined, up);
      barrier(c, tl, up, barrierS, true);
      drive(tl, go, driveS, 'none', (x) => setTruck(p, 778 + 182 * x, x > 0.7 ? 1 - (x - 0.7) / 0.3 : 1));
      barrier(c, tl, go + driveS * 0.72, driveS * 0.28, false); // down once the truck's tail is past the arm (x > 906)
      dropBox(c, tl, go, 0.4);
      if (!keep) tl.to(card, { opacity: 0, duration: 0.3, ease: 'power1.in' }, go);
    });
  },

  // to gate, barrier, through + shutter opens, into the CFS (barrier down), shutter closes
  truck: (c, g) => scene(c, g, () => harborEnd(c), (tl) => {
    const p = c.harbor!;
    const T = marks(STEPS.truck);
    toGate(c, tl, 0, T[1]);
    barrier(c, tl, T[1], T[2] - T[1], true);
    drive(tl, T[2], T[3] - T[2], 'power1.in', (x) => setTruck(p, 778 + 182 * x));
    drive(tl, T[2], T[3] - T[2], 'power2.inOut', (x) => setShutter(p, x));
    drive(tl, T[3], T[4] - T[3], 'power2.out', (x) => setTruck(p, 960 + 60 * x));
    barrier(c, tl, T[3], T[4] - T[3], false);
    drive(tl, T[4], T[5] - T[4], 'power2.inOut', (x) => setShutter(p, 1 - x));
    dropBox(c, tl, T[4], T[5] - T[4]);
  }),

  // show, wait, flip (a turn about the vertical axis), wait; card-only scenes keep their card (v10 B3)
  quote: (c, g) => {
    const front = h('div', {},
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, titleOf(c)),
      h('span', { class: cx(PILL, 'mt-1 bg-code text-muted') }, t('anim.quoteWaiting')));
    const back = h('div', { hidden: true },
      h('p', { class: 'm-0 font-semibold text-emerald-800 dark:text-emerald-200' }, t('anim.quoteCard')),
      h('p', { class: 'm-0 font-bold' }, t('anim.quoteAccepted')));
    const card = overlay(c, h('div', { class: CARD_OV }, front, back));
    const turn = (): void => { front.hidden = true; back.hidden = false; };
    return scene(c, g, () => { turn(); shown(card); }, (tl) => {
      const T = marks(STEPS.quote);
      const half = (T[3] - T[2]) / 2;
      cardIn(tl, card, 0, T[1]);
      tl.to(card, { rotationY: 90, transformPerspective: 700, duration: half, ease: 'power2.in' }, T[2])
        .call(turn, undefined, T[2] + half)
        .fromTo(card, { rotationY: -90 }, { rotationY: 0, duration: half, ease: 'back.out(1.6)', immediateRender: false }, T[2] + half);
    });
  },

  // show, PAID stamp, coins drop onto the ledger and pile up, wait
  ledger: (c, g) => {
    const paid = stampEl(t('anim.paid'), cx('top-3 right-3', LANE.green.stamp));
    const coins = Array.from({ length: 6 }, (_, i) =>
      h('span', { class: 'absolute right-8 block h-2.5 w-7 rounded-[50%] bg-amber-400 ring-1 ring-amber-700', style: `bottom:${50 + i * 4}px;opacity:0` }));
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'relative') },
      h('p', { class: 'm-0 font-semibold text-muted' }, t('anim.invoice')),
      h('p', { class: 'm-0 pr-20 font-bold' }, titleOf(c)),
      paid.el,
      ...coins,
      h('p', { class: 'mt-10 mb-0 rounded-(--r-inset) bg-ink px-3 py-1.5 text-panel' }, t('anim.ledgerBook'))));
    return scene(c, g, () => { shown(card, ...coins); stampEnd(paid); }, (tl) => {
      const T = marks(STEPS.ledger);
      const each = 0.45;
      cardIn(tl, card, 0, T[1]);
      slam(tl, paid, T[1], T[2] - T[1]);
      tl.fromTo(coins, { y: -56, opacity: 0 }, {
        y: 0, opacity: 1, duration: each, ease: 'bounce.out', stagger: (T[3] - T[2] - each) / (coins.length - 1), immediateRender: false,
      }, T[2]);
    });
  },

  // show, typing (three dots bounce out of phase), bubble, wait
  chat: (c, g) => {
    const dots = [0, 1, 2].map(() => h('span', { class: 'size-1.5 rounded-full bg-muted' }));
    const typing = h('span', { class: 'inline-flex gap-1 rounded-(--r-card) rounded-tl-sm bg-code px-3 py-2' }, ...dots);
    const bubble = h('p', { class: 'm-0 rounded-(--r-card) rounded-tl-sm bg-code px-3 py-2', hidden: true }, t('anim.thanks'));
    const happy = h('span', { class: cx(PILL, DONE_PILL) }, t('anim.happy'));
    happy.style.opacity = '0';
    const card = overlay(c, h('div', { class: cx(CARD_OV, 'space-y-2') },
      h('p', { class: 'm-0 flex items-center gap-2' }, avatar({ name: '', dept: 'CS' }, 'md'), h('b', {}, t('anim.customer'))),
      typing, bubble, happy));
    const answered = (): void => { typing.hidden = true; bubble.hidden = false; };
    return scene(c, g, () => { answered(); shown(card, bubble, happy, ...dots); }, (tl) => {
      const T = marks(STEPS.chat);
      cardIn(tl, card, 0, T[1]);
      tl.to(dots, { y: -4, duration: 0.13, ease: 'sine.out', yoyo: true, repeat: 3, stagger: 0.08 }, T[1])
        .call(answered, undefined, T[2])
        .fromTo(bubble, { opacity: 0, y: 6, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, transformOrigin: '0% 0%', duration: 0.3, ease: 'back.out(1.6)', immediateRender: false }, T[2])
        .fromTo(happy, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, T[2] + 0.1);
    });
  },

  // PROMO: last container, the new lane drawn, the ship sails it, the title card, confetti; Lily cheers in the dock (ui/stage.ts)
  promotion: (c, g) => {
    const card = c.art.querySelector<HTMLElement>('[data-promo]') ?? c.art.appendChild(promoCard(c)); // build() put it between the pictures
    let bits: SVGGElement | undefined;
    return scene(c, g, () => { harborEnd(c); mapEnd(c); bits?.remove(); shown(card); }, (tl, g) => {
      dropBox(c, tl, PROMO.drop[0], PROMO.drop[1] - PROMO.drop[0]);
      const p = c.harbor;
      if (p) { // the berthed ship leaves, a new one berths in the last 0.4 s
        const [b0, b1] = PROMO.berth;
        drive(tl, b0, b1 - b0 - 0.4, 'power1.in', (x) => setShip(p, x, x < 0.7 ? 1 : 1 - (x - 0.7) / 0.3));
        tl.call(() => setShip(p, 0, 0), undefined, b1 - 0.4);
        drive(tl, b1 - 0.4, 0.4, 'power1.inOut', (a) => setShip(p, 0, a));
      }
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: PROMO.card[1] - PROMO.card[0], ease: 'power2.out', immediateRender: false }, PROMO.card[0]); // a band in the layout: opacity only
      const route = c.scene.to ?? routeOpenedBy(c.tk.chapter);
      const m = c.map;
      const r = ROUTES.find((x) => x.port === route);
      if (m && route && r) {
        if (c.after.open.has(route) && !c.before.open.has(route)) { // a new lane: drawn in, its port lights up, then the ship sails it
          const [l0, l1] = PROMO.lane;
          const color = chapterColor(Math.max(1, r.opens)).stroke;
          tl.call(() => paintRoutes(m, c.after), undefined, l0)
            .fromTo(m.routes[route], { drawSVG: '0%' }, { drawSVG: '100%', duration: l1 - l0, ease: 'power1.inOut', immediateRender: false }, l0)
            .call(() => { if (!c.run.fast) arrivalPulse(m, ...portXY(route), color, 400); }, undefined, l1 - 0.3);
          mapSail(c, g, tl, route, PROMO.sail[0], PROMO.sail[1] - PROMO.sail[0]);
        } else mapSail(c, g, tl, route, PROMO.lane[0], PROMO.sail[1] - PROMO.lane[0]);
      }
      bits = confetti(c, tl);
    });
  },
};

/** Picture per kind (§4): the harbour close-up for port work, the route map when a ship has somewhere to go. */
export function build(c: Ctx): void {
  const k = c.scene.kind;
  if (k === 'ship' || k === 'yard' || k === 'customs' || k === 'truck' || k === 'promotion') {
    c.harbor = harborScene(c.before, { ambient: false, current: c.tk.chapter, crop: true });
  }
  if ((k === 'ship' && c.scene.to) || k === 'promotion') {
    c.map = routeMap(c.before);
    cropToLane(c.map, c.scene.to ?? routeOpenedBy(c.tk.chapter));
    c.map.rings.replaceChildren(); // no endless pulse in the dock (Plan 8b: loops only on reading pages); arrivalPulse() uses the group once
  }
  // v21 U12: the promotion band sits in the layout between the pictures from the start (the dock's height and Lily's place are
  // known before the scene plays); the scene only fades it in.
  const band = k === 'promotion' ? promoCard(c) : undefined;
  if (band) {
    band.dataset.promo = '';
    band.style.opacity = '0';
  }
  c.art.replaceChildren(...nodes(c.harbor?.svg, band, c.map?.svg));
}
/**
 * Plays the scene of `c` (§2; ui-ux-v6 A2: one GSAP timeline of durationOf). A fast run draws the end state at once; with
 * GSAP not in yet (§2.1) the end state shows at once too and the chunk is fetched for next time, never waited for.
 */
export async function play(c: Ctx): Promise<void> {
  const g = gsapReady;
  if (!g) prefetchGsap();
  const tl = SCENES[c.scene.kind](c, g);
  if (tl && g) await g.play(tl, c.run);
}
