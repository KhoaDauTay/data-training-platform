import type * as Load from '../../art/load';
import type * as I18n from '../../i18n';
import type * as Dom from '../../ui/dom';
import type * as Svg from '../../ui/svg';
import { type Lang, registerViz, type VizHandle } from './registry';

/**
 * ENG-VIZ (product-design-db-engine §5.1, L235): one drawing engine for every Database Engine diagram. A diagram is a
 * pure `model → Frame[]`; a frame is one sentence plus keyed shapes, each frame a complete end state. The renderer
 * draws a frame; going forward it tweens every shape whose key survives (numbers only, through put(), the one attribute
 * writer), fades new ones in and old ones out. Back, reduced motion and a missing gsap chunk show the frame at once.
 * Colours are tokens only (style.css, both themes). Main values come through init() (only `import type` from main
 * modules, Plan 6 U3); GSAP only through the injected loader.
 */
export interface Deps {
  h: typeof Dom.h;
  s: typeof Svg.s;
  reducedMotion: typeof Dom.reducedMotion;
  loadedGsap: typeof Load.loadedGsap;
  loadGsap: typeof Load.loadGsap;
  getLang: typeof I18n.getLang;
}
let D: Deps;
export const init = (deps: Deps): void => void (D = deps);

// ── shapes ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Fill + edge pairs (tokens contrast-tested in tests/theme.test.ts; text on any of them is --text). Meaningful strokes are
 * never --border/--border-strong (1.3–1.8:1, engine-ux-spec §1.2): neutral edges use --muted (≥ 4.5:1). */
export type Tone = 'cell' | 'live' | 'dead' | 'new' | 'ptr' | 'warm' | 'free' | 'ghost' | 'plain';
/** Text and line colours. */
export type Ink = 'ink' | 'muted' | 'live' | 'dead' | 'new' | 'ptr' | 'warm' | 'edge';
/** `attrs` (v39 figures, L603): extra attributes written once per frame (data-owner, data-from, data-to, lang) for the overlap checker. */
type Base = { k: string; o?: number; attrs?: Record<string, string> };
export type Shape =
  | (Base & { t: 'r'; x: number; y: number; w: number; h: number; tone?: Tone; rx?: number; bold?: boolean; ok?: boolean })
  | (Base & { t: 't'; x: number; y: number; s: string; ink?: Ink; size?: number; a?: 'm' | 'e'; b?: boolean; mono?: boolean })
  | (Base & { t: 'l'; x1: number; y1: number; x2: number; y2: number; ink?: Ink; w?: number; arrow?: boolean; dash?: boolean })
  | (Base & { t: 'c'; x: number; y: number; r: number; tone?: Tone })
  | (Base & { t: 'p'; d: string; ink?: Ink; w?: number; arrow?: boolean; dash?: boolean; tone?: Tone });
export interface Frame { say: string; nodes: Shape[] }
/**
 * v31 F5 (L510): the smallest label, in viewBox units. Every diagram is 340 units wide and its svg is ≥ 335 px wide at a
 * 375 px phone (figure padding 4 px there), so 12.5 units render ≥ 12 px; tests/engineViz.test.ts checks every frame.
 * Labels never shrink below it: a long one is cut (`cut`) or its box grows. On wide screens the svg stops at 480 px.
 */
export const SM = 12.5;
/** `maxW` (v39 figures): the svg's max width in px (480 by default; a figure laid out for its host's width uses 640, 1 unit = 1 px). */
export interface Diagram { title: string; w: number; h: number; frames: Frame[]; maxW?: number }
export type Tr = (vi: string, en: string) => string;

// v39 (L604): the --eng-* aliases (style.css), the same colours as the v7 tokens they point at; figures and old diagrams share them.
const FILL: Record<Tone, [string, string]> = {
  cell: ['--eng-head', '--eng-edge'], live: ['--eng-live-soft', '--eng-live'], dead: ['--eng-dead-soft', '--eng-dead'],
  new: ['--eng-active-soft', '--eng-active'], ptr: ['--eng-ptr-soft', '--eng-ptr'], warm: ['--eng-hot-soft', '--eng-hot'],
  free: ['--eng-cell', '--eng-edge'], ghost: ['--eng-cell', '--eng-edge'], plain: ['--eng-cell', '--eng-edge'],
};
const INK: Record<Ink, string> = {
  ink: '--eng-ink', muted: '--eng-sub', live: '--eng-live', dead: '--eng-dead', new: '--eng-active', ptr: '--eng-ptr', warm: '--eng-hot', edge: '--eng-edge',
};
const TAG = { r: 'rect', t: 'text', l: 'line', c: 'circle', p: 'path' } as const;
/** Model key → SVG attribute of the numbers a tween may move. */
const NUM: Record<Shape['t'], [string, string][]> = {
  r: [['x', 'x'], ['y', 'y'], ['w', 'width'], ['h', 'height']],
  t: [['x', 'x'], ['y', 'y']],
  l: [['x1', 'x1'], ['y1', 'y1'], ['x2', 'x2'], ['y2', 'y2']],
  c: [['x', 'cx'], ['y', 'cy'], ['r', 'r']],
  p: [],
};
const r2 = (v: number): string => String(Math.round(v * 100) / 100);
const nums = (n: Shape): number[] => NUM[n.t].map(([m]) => (n as unknown as Record<string, number>)[m]);

/** Every non-number attribute of a shape (style, marker, text), written once per frame. */
function look(el: SVGElement, n: Shape, id: string): void {
  const set = (a: string, v: string | false): void => (v === false ? el.removeAttribute(a) : el.setAttribute(a, v));
  if (n.t === 'r' || n.t === 'c') {
    const [f, e] = FILL[n.tone ?? 'cell'];
    const dash = n.tone === 'free' || n.tone === 'ghost';
    set('style', `fill:var(${f});stroke:var(${e});stroke-width:${n.t === 'r' && n.bold ? 2.2 : 1.2}${dash ? ';stroke-dasharray:3 2' : ''}`);
    if (n.t === 'r') {
      set('rx', String(n.rx ?? 3));
      set('data-overlap', n.ok ? 'ok' : false); // v39 F3 (L622): overlaps other boxes by design (the overlap checker skips it)
    }
  } else if (n.t === 't') {
    set('style', `fill:var(${INK[n.ink ?? 'ink']});font-size:${Math.max(SM, n.size ?? SM)}px${n.b ? ';font-weight:700' : ''}${n.mono ? ';font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : ''}`);
    set('text-anchor', n.a === 'm' ? 'middle' : n.a === 'e' ? 'end' : false);
    set('dominant-baseline', 'middle');
    if (el.textContent !== n.s) el.textContent = n.s;
  } else {
    const ink = n.ink ?? 'edge';
    const fill = n.t === 'p' && n.tone ? `var(${FILL[n.tone][0]})` : 'none';
    set('style', `fill:${fill};stroke:var(${INK[ink]});stroke-width:${n.w ?? 1.4};stroke-linecap:round${n.dash ? ';stroke-dasharray:4 3' : ''}`);
    set('marker-end', n.arrow ? `url(#${id}-${ink})` : false);
    if (n.t === 'p') set('d', n.d);
  }
  for (const [a, v] of Object.entries(n.attrs ?? {})) set(a, v);
}
const putNums = (el: SVGElement, n: Shape, v: number[]): void => NUM[n.t].forEach(([, a], i) => el.setAttribute(a, r2(v[i])));

let uid = 0;
/** One <svg> that shows frames by key. Returns draw(frame, animate) and stop() (jumps a running tween to its end). */
function stage(d: Diagram): { svg: SVGSVGElement; draw(f: Frame, animate: boolean): void; stop(): void } {
  const id = `ev${++uid}`;
  const marker = (ink: Ink) => D.s('marker', { id: `${id}-${ink}`, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
    D.s('path', { d: 'M0 0 L8 4 L0 8 z', style: `fill:var(${INK[ink]})` }));
  const svg = D.s('svg', {
    viewBox: `0 0 ${d.w} ${d.h}`, role: 'img', class: 'mx-auto block h-auto w-full', style: `max-width:${d.maxW ?? 480}px;font-family:inherit;overflow:visible`, // R1 E15/E22/E24: mx-auto centres it in a wider frame
  }, D.s('defs', {}, ...(Object.keys(INK) as Ink[]).map(marker)));
  const els = new Map<string, SVGElement>();
  let end: (() => void) | undefined;
  let tl: { progress(v: number): unknown; kill(): unknown } | undefined;
  const stop = (): void => {
    tl?.kill();
    tl = undefined;
    end?.();
    end = undefined;
  };
  const draw = (f: Frame, animate: boolean): void => {
    stop();
    const g = animate && !D.reducedMotion() ? D.loadedGsap() : undefined;
    if (animate && !g) D.loadGsap(); // next time
    const gone = new Map(els);
    const moves: { el: SVGElement; n: Shape; from: number[]; to: number[]; o0: number; o1: number }[] = [];
    for (const n of f.nodes) {
      let el = els.get(n.k);
      if (el && el.tagName !== TAG[n.t]) {
        el.remove();
        el = undefined;
      }
      const from = el ? NUM[n.t].map(([, a]) => Number(el!.getAttribute(a))) : undefined;
      const o0 = el ? Number(el.getAttribute('opacity') ?? 1) : 0;
      el ??= D.s(TAG[n.t], { 'data-k': n.k });
      els.set(n.k, el);
      gone.delete(n.k);
      look(el, n, id);
      const to = nums(n);
      const o1 = n.o ?? 1;
      putNums(el, n, to);
      el.setAttribute('opacity', r2(o1));
      svg.append(el); // frame order is paint order
      if (g) moves.push({ el, n, from: from ?? to, to, o0, o1 });
    }
    const leaving = [...gone.entries()];
    leaving.forEach(([k]) => els.delete(k));
    const finish = (): void => {
      for (const m of moves) {
        putNums(m.el, m.n, m.to);
        m.el.setAttribute('opacity', r2(m.o1));
      }
      leaving.forEach(([, el]) => el.remove());
    };
    if (!g) return finish();
    const fades = leaving.map(([, el]) => ({ el, o: Number(el.getAttribute('opacity') ?? 1) }));
    const st = { p: 0 };
    const write = (): void => {
      const p = st.p;
      for (const m of moves) {
        putNums(m.el, m.n, m.to.map((v, i) => m.from[i] + (v - m.from[i]) * p));
        m.el.setAttribute('opacity', r2(m.o0 + (m.o1 - m.o0) * p));
      }
      for (const x of fades) x.el.setAttribute('opacity', r2(x.o * (1 - Math.min(1, p * 2))));
    };
    write();
    end = finish;
    tl = g.gsap.to(st, { p: 1, duration: 0.55, ease: 'power2.inOut', onUpdate: write, onComplete: () => { tl = undefined; end = undefined; finish(); } });
  };
  return { svg, draw, stop };
}

// ── the step-through shell ──────────────────────────────────────────────────────────────────────────────────────
const UI = {
  vi: { back: 'Trước', next: 'Tiếp', play: 'Chạy hết', pause: 'Dừng', step: 'Bước {i}/{n}', all: 'Mô tả từng bước', keys: 'Dùng ← → để chuyển bước' },
  en: { back: 'Back', next: 'Next', play: 'Play', pause: 'Pause', step: 'Step {i} of {n}', all: 'Every step in words', keys: 'Use ← → to change steps' },
};
const BTN = 'rounded-full border border-accent bg-panel px-3 py-1 font-bold text-accent hover:bg-accent-soft aria-disabled:border-line aria-disabled:text-disabled';
/** Play: each step tweens (≤ 0.55 s) then holds; the whole step stays under 3 s (L101). Stops at the last step, never loops. */
const HOLD_MS = 2050; // the 0.55 s tween + 1.5 s rest (engine-ux-spec §6); 4 s per frame under reduced motion

/**
 * v39 figures (F1, L602): `fig` marks a figure built from a content spec (src/engine/viz/figure.ts): the root carries
 * `data-fig`, the caption follows the title, and the generated text alternative (every node and arrow) sits in a <details>.
 * A figure with one frame is static (P3): no buttons, counter, status line or focus stop.
 */
export interface FigOpts { name: string; caption: string; alt: string[]; altTitle: string }
let figs = 0;
export function mount(host: HTMLElement, d: Diagram, lang: Lang, start = 0, fo?: FigOpts): VizHandle {
  const ui = UI[lang];
  const n = d.frames.length;
  const st = stage(d);
  const one = !!fo && n === 1;
  const id = `fig${++figs}`;
  const say = D.h('p', { role: 'status', 'aria-live': 'polite', class: 'm-0 text-body-sm [grid-area:1/1]' });
  const counter = D.h('span', { class: 'muted tabular-nums', 'aria-hidden': 'true' });
  const back = D.h('button', { type: 'button', class: BTN }, `‹ ${ui.back}`);
  const play = D.h('button', { type: 'button', class: BTN, 'aria-pressed': 'false' }, ui.play);
  const next = D.h('button', { type: 'button', class: BTN }, `${ui.next} ›`);
  const items = d.frames.map((f, i) => D.h('li', {}, f.say));
  const alt = fo ? D.h('div', { id: `${id}-alt` }, ...fo.alt.map((p) => D.h('p', { class: 'm-0' }, p))) : null;
  if (one) st.svg.setAttribute('aria-labelledby', `${id}-cap ${id}-alt`);
  const fig = D.h('figure', one ? { class: 'm-0 grid gap-2', 'data-fig': fo!.name } : {
    class: 'm-0 grid gap-2', tabindex: '0', 'aria-roledescription': lang === 'vi' ? 'sơ đồ từng bước' : 'step-through diagram',
    'aria-label': `${d.title}. ${ui.keys}`, ...(fo ? { 'data-fig': fo!.name } : { 'data-viz': '' }),
  },
  D.h('figcaption', { id: `${id}-cap`, class: fo ? '' : 'font-bold' }, ...(fo ? [D.h('b', { class: 'block' }, d.title), fo.caption] : [d.title])), // R1 E12: the caption on its own line
  D.h('div', { class: 'overflow-hidden rounded-(--r-ctl) bg-panel p-2 ring-1 ring-line max-sm:p-1' }, st.svg),
  ...(one ? [d.frames[0].say ? D.h('p', { class: 'm-0 text-body-sm' }, d.frames[0].say) : '', D.h('details', { class: 'text-body-sm' }, D.h('summary', {}, fo!.altTitle), alt)] : [
    // A5 (v31, L515): every step's sentence sits in the same grid cell, hidden but the shown one, so the cell is as tall as the
    // longest and the buttons below never move between steps
    D.h('div', { class: 'grid' }, say, ...d.frames.map((f) => D.h('p', { class: 'invisible m-0 text-body-sm [grid-area:1/1]', 'aria-hidden': 'true' }, f.say))),
    D.h('div', { class: 'flex flex-wrap items-center gap-2' }, back, play, next, counter),
    D.h('details', { class: 'text-body-sm' }, D.h('summary', {}, ui.all), D.h('ol', {}, ...items), alt)]));
  let at = -1;
  let timer: number | undefined;
  const halt = (): void => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    play.textContent = ui.play;
    play.setAttribute('aria-pressed', 'false');
  };
  const go = (i: number, animate = false): void => {
    const to = Math.max(0, Math.min(n - 1, i));
    if (to === at) return;
    st.draw(d.frames[to], animate && to === at + 1);
    at = to;
    const label = ui.step.replace('{i}', String(to + 1)).replace('{n}', String(n));
    if (!one) st.svg.setAttribute('aria-label', `${d.title}. ${label}: ${d.frames[to].say}`);
    say.textContent = d.frames[to].say;
    counter.textContent = `${to + 1} / ${n}`;
    items.forEach((li, j) => (j === to ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current')));
    // aria-disabled, not disabled: the control keeps its focus at either end (engine-ux-spec §6)
    back.setAttribute('aria-disabled', String(to === 0));
    next.setAttribute('aria-disabled', String(to === n - 1));
    play.setAttribute('aria-disabled', String(to === n - 1 && timer === undefined));
  };
  const tick = (): void => {
    if (at >= n - 1 || !fig.isConnected) return halt();
    go(at + 1, true);
    if (at >= n - 1) {
      halt();
      play.setAttribute('aria-disabled', 'true');
      return;
    }
    timer = window.setTimeout(tick, D.reducedMotion() ? 4000 : HOLD_MS);
  };
  back.onclick = () => { halt(); go(at - 1); };
  next.onclick = () => { halt(); go(at + 1, true); };
  play.onclick = () => {
    if (timer !== undefined) return halt();
    if (at >= n - 1) return;
    play.textContent = ui.pause;
    play.setAttribute('aria-pressed', 'true');
    tick();
  };
  if (!one) fig.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    const to = k === 'ArrowRight' ? at + 1 : k === 'ArrowLeft' ? at - 1 : k === 'Home' ? 0 : k === 'End' ? n - 1 : undefined;
    if (to === undefined) return;
    e.preventDefault();
    halt();
    go(to, k === 'ArrowRight');
  });
  go(start);
  host.append(fig);
  return {
    el: fig,
    get count() { return n; },
    get index() { return at; },
    steps: d.frames.map((f) => ({ text: f.say })),
    texts: d.frames.map((f) => f.say),
    go: (i, animate) => { halt(); go(i, animate); },
    destroy: () => { halt(); st.stop(); fig.remove(); },
  };
}

/** Registers a diagram: `build(model, tr)` turns a model (or the sample) into frames in the asked language. */
export function define<M>(name: string, sample: M, build: (m: M, tr: Tr, lang: Lang) => Diagram): void {
  registerViz(name, (host, opts = {}) => {
    const lang = opts.lang ?? D.getLang();
    const tr: Tr = (vi, en) => (lang === 'vi' ? vi : en);
    return mount(host, build((opts.model as M | undefined) ?? sample, tr, lang), lang, opts.start);
  });
}

// ── drawing helpers shared by the diagrams (pure: they only return shapes) ─────────────────────────────────────
/** A labelled box: rect + centred text (`sub` = a second, smaller line). */
export function box(k: string, x: number, y: number, w: number, h: number, label: string, tone: Tone = 'cell', sub?: string, o?: number): Shape[] {
  const out: Shape[] = [{ k, t: 'r', x, y, w, h, tone, o }];
  if (label) out.push({ k: `${k}.t`, t: 't', x: x + w / 2, y: y + h / 2 - (sub ? 7 : 0), s: label, a: 'm', size: SM, b: true, o });
  if (sub) out.push({ k: `${k}.s`, t: 't', x: x + w / 2, y: y + h / 2 + 8, s: sub, a: 'm', size: SM, ink: 'ink', o });
  return out;
}
export const text = (k: string, x: number, y: number, s: string, more: Partial<Extract<Shape, { t: 't' }>> = {}): Shape => ({ k, t: 't', x, y, s, ...more });
/** The box an arrow points at (a rect, or a circle's bounding square). */
export interface Rect { x: number; y: number; w: number; h: number }
/** v39 F3 (L620): how far an arrow's tip stays outside the box it points at (svg-system §2.2; the checker flags < 2). */
export const TIP = 3;
/**
 * Where an arrow aimed from (fx,fy) through (x,y) must end so its tip stops TIP units outside `to`: the ray's entry into
 * `to` grown by TIP, minus the 0.75·w the marker reaches past the line's end (viewBox 8, refX 7, markerWidth 6). A ray that
 * misses the box keeps (x,y); the end never comes closer than 1 unit to (fx,fy), so a short arrow never flips.
 */
export function stopAt(fx: number, fy: number, x: number, y: number, w: number, to: Rect): [number, number] {
  const dx = x - fx, dy = y - fy, len = Math.hypot(dx, dy);
  if (!len) return [x, y];
  let t = 0, out = Infinity;
  for (const [p, d, lo, hi] of [[fx, dx, to.x - TIP, to.x + to.w + TIP], [fy, dy, to.y - TIP, to.y + to.h + TIP]]) {
    if (d === 0) { if (p < lo || p > hi) return [x, y]; continue; }
    t = Math.max(t, Math.min((lo - p) / d, (hi - p) / d));
    out = Math.min(out, Math.max((lo - p) / d, (hi - p) / d));
  }
  if (t > out) return [x, y];
  const s = Math.max(1, t * len - 0.75 * w);
  return [fx + (dx / len) * s, fy + (dy / len) * s];
}
type To = { to?: Rect };
/** A straight line; with `arrow` and `to` (the target box) it stops short so the tip stays TIP outside it. */
export const line = (k: string, x1: number, y1: number, x2: number, y2: number, more: Partial<Extract<Shape, { t: 'l' }>> & To = {}): Shape => {
  const { to, ...rest } = more;
  const [ex, ey] = to && rest.arrow ? stopAt(x1, y1, x2, y2, rest.w ?? 1.4, to) : [x2, y2];
  return { k, t: 'l', x1, y1, x2: ex, y2: ey, ...rest };
};
/** A curved pointer from (x1,y1) to (x2,y2), bulging by `bend` (negative = upwards); `to` stops it short like line(). */
export const arc = (k: string, x1: number, y1: number, x2: number, y2: number, bend: number, more: Partial<Extract<Shape, { t: 'p' }>> & To = {}): Shape => {
  const { to, ...rest } = more;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + bend;
  const [ex, ey] = to ? stopAt(cx, cy, x2, y2, rest.w ?? 1.4, to) : [x2, y2];
  return { k, t: 'p', d: `M${r2(x1)} ${r2(y1)} Q${r2(cx)} ${r2(cy)} ${r2(ex)} ${r2(ey)}`, arrow: true, ...rest };
};
/** The rect of a circle shape (an arrow's `to`). */
export const square = (x: number, y: number, r: number): Rect => ({ x: x - r, y: y - r, w: 2 * r, h: 2 * r });
/** Cuts a label to `n` characters (no text measuring: jsdom has no geometry). */
export const cut = (v: string, n: number): string => (v.length > n ? `${v.slice(0, n - 1)}…` : v);
/** Catalog values arrive as numbers, numeric strings or NULL (PGlite): a number or undefined. */
export const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
};
export const fill = (s: string, vars: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
