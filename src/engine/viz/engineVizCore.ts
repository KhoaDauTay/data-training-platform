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
/** Fill + edge pairs (tokens contrast-tested in tests/theme.test.ts; text on any of them is --text). */
export type Tone = 'cell' | 'live' | 'dead' | 'new' | 'ptr' | 'warm' | 'free' | 'ghost' | 'plain';
/** Text and line colours. */
export type Ink = 'ink' | 'muted' | 'live' | 'dead' | 'new' | 'ptr' | 'warm' | 'edge';
type Base = { k: string; o?: number };
export type Shape =
  | (Base & { t: 'r'; x: number; y: number; w: number; h: number; tone?: Tone; rx?: number; bold?: boolean })
  | (Base & { t: 't'; x: number; y: number; s: string; ink?: Ink; size?: number; a?: 'm' | 'e'; b?: boolean; mono?: boolean })
  | (Base & { t: 'l'; x1: number; y1: number; x2: number; y2: number; ink?: Ink; w?: number; arrow?: boolean; dash?: boolean })
  | (Base & { t: 'c'; x: number; y: number; r: number; tone?: Tone })
  | (Base & { t: 'p'; d: string; ink?: Ink; w?: number; arrow?: boolean; dash?: boolean; tone?: Tone });
export interface Frame { say: string; nodes: Shape[] }
export interface Diagram { title: string; w: number; h: number; frames: Frame[] }
export type Tr = (vi: string, en: string) => string;

const FILL: Record<Tone, [string, string]> = {
  cell: ['--surface-2', '--border-strong'], live: ['--good-soft', '--good'], dead: ['--bad-soft', '--bad'],
  new: ['--accent-soft', '--accent'], ptr: ['--info-soft', '--eng-ptr'], warm: ['--warn-soft', '--warn'],
  free: ['--panel', '--border-strong'], ghost: ['--panel', '--border-strong'], plain: ['--panel', '--border-strong'],
};
const INK: Record<Ink, string> = {
  ink: '--text', muted: '--muted', live: '--good', dead: '--bad', new: '--accent', ptr: '--eng-ptr', warm: '--warn', edge: '--border-strong',
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
    if (n.t === 'r') set('rx', String(n.rx ?? 3));
  } else if (n.t === 't') {
    set('style', `fill:var(${INK[n.ink ?? 'ink']});font-size:${n.size ?? 11}px${n.b ? ';font-weight:700' : ''}${n.mono ? ';font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : ''}`);
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
}
const putNums = (el: SVGElement, n: Shape, v: number[]): void => NUM[n.t].forEach(([, a], i) => el.setAttribute(a, r2(v[i])));

let uid = 0;
/** One <svg> that shows frames by key. Returns draw(frame, animate) and stop() (jumps a running tween to its end). */
function stage(d: Diagram): { svg: SVGSVGElement; draw(f: Frame, animate: boolean): void; stop(): void } {
  const id = `ev${++uid}`;
  const marker = (ink: Ink) => D.s('marker', { id: `${id}-${ink}`, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' },
    D.s('path', { d: 'M0 0 L8 4 L0 8 z', style: `fill:var(${INK[ink]})` }));
  const svg = D.s('svg', {
    viewBox: `0 0 ${d.w} ${d.h}`, role: 'img', class: 'block h-auto w-full', style: 'max-width:600px;font-family:inherit;overflow:visible',
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
const BTN = 'rounded-full border border-accent bg-panel px-3 py-1 font-bold text-accent hover:bg-accent-soft disabled:border-line disabled:text-disabled';
/** Play: each step tweens (≤ 0.55 s) then holds; the whole step stays under 3 s (L101). Stops at the last step, never loops. */
const HOLD_MS = 2200;

export function mount(host: HTMLElement, d: Diagram, lang: Lang, start = 0): VizHandle {
  const ui = UI[lang];
  const n = d.frames.length;
  const st = stage(d);
  const say = D.h('p', { role: 'status', 'aria-live': 'polite', class: 'm-0 min-h-[3em] text-body-sm' });
  const counter = D.h('span', { class: 'muted tabular-nums', 'aria-hidden': 'true' });
  const back = D.h('button', { type: 'button', class: BTN }, `‹ ${ui.back}`);
  const play = D.h('button', { type: 'button', class: BTN, 'aria-pressed': 'false' }, ui.play);
  const next = D.h('button', { type: 'button', class: BTN }, `${ui.next} ›`);
  const items = d.frames.map((f, i) => D.h('li', {}, f.say));
  const fig = D.h('figure', {
    class: 'm-0 grid gap-2', tabindex: '0', 'aria-roledescription': lang === 'vi' ? 'sơ đồ từng bước' : 'step-through diagram',
    'aria-label': `${d.title}. ${ui.keys}`, 'data-viz': '',
  },
  D.h('figcaption', { class: 'font-bold' }, d.title),
  D.h('div', { class: 'overflow-hidden rounded-(--r-ctl) bg-panel p-2 ring-1 ring-line' }, st.svg),
  say,
  D.h('div', { class: 'flex flex-wrap items-center gap-2' }, back, play, next, counter),
  D.h('details', { class: 'text-body-sm' }, D.h('summary', {}, ui.all), D.h('ol', {}, ...items)));
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
    st.svg.setAttribute('aria-label', `${d.title}. ${label}: ${d.frames[to].say}`);
    say.textContent = d.frames[to].say;
    counter.textContent = `${to + 1} / ${n}`;
    items.forEach((li, j) => (j === to ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current')));
    back.disabled = to === 0;
    next.disabled = to === n - 1;
    play.disabled = to === n - 1 && timer === undefined;
  };
  const tick = (): void => {
    if (at >= n - 1 || !fig.isConnected) return halt();
    go(at + 1, true);
    if (at >= n - 1) {
      halt();
      play.disabled = true;
      return;
    }
    timer = window.setTimeout(tick, HOLD_MS);
  };
  back.onclick = () => { halt(); go(at - 1); };
  next.onclick = () => { halt(); go(at + 1, true); };
  play.onclick = () => {
    if (timer !== undefined) return halt();
    play.textContent = ui.pause;
    play.setAttribute('aria-pressed', 'true');
    tick();
  };
  fig.addEventListener('keydown', (e) => {
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
/** Font size that keeps s inside w (estimated: k × size per character), never under 8. */
const fit = (s: string, w: number, size: number, k: number): number => Math.max(8, Math.min(size, Math.floor(((w - 6) / (s.length * k)) * 10) / 10));
/** A labelled box: rect + centred text (`sub` = a second, smaller line). */
export function box(k: string, x: number, y: number, w: number, h: number, label: string, tone: Tone = 'cell', sub?: string, o?: number): Shape[] {
  const out: Shape[] = [{ k, t: 'r', x, y, w, h, tone, o }];
  if (label) out.push({ k: `${k}.t`, t: 't', x: x + w / 2, y: y + h / 2 - (sub ? 6 : 0), s: label, a: 'm', size: fit(label, w, 11, 0.58), b: true, o });
  if (sub) out.push({ k: `${k}.s`, t: 't', x: x + w / 2, y: y + h / 2 + 7, s: sub, a: 'm', size: fit(sub, w, 9.5, 0.55), ink: 'ink', o });
  return out;
}
export const text = (k: string, x: number, y: number, s: string, more: Partial<Extract<Shape, { t: 't' }>> = {}): Shape => ({ k, t: 't', x, y, s, ...more });
export const line = (k: string, x1: number, y1: number, x2: number, y2: number, more: Partial<Extract<Shape, { t: 'l' }>> = {}): Shape => ({ k, t: 'l', x1, y1, x2, y2, ...more });
/** A curved pointer from (x1,y1) to (x2,y2), bulging by `bend` (negative = upwards). */
export const arc = (k: string, x1: number, y1: number, x2: number, y2: number, bend: number, more: Partial<Extract<Shape, { t: 'p' }>> = {}): Shape =>
  ({ k, t: 'p', d: `M${r2(x1)} ${r2(y1)} Q${r2((x1 + x2) / 2)} ${r2((y1 + y2) / 2 + bend)} ${r2(x2)} ${r2(y2)}`, arrow: true, ...more });
/** Cuts a label to `n` characters (no text measuring: jsdom has no geometry). */
export const cut = (v: string, n: number): string => (v.length > n ? `${v.slice(0, n - 1)}…` : v);
/** Catalog values arrive as numbers, numeric strings or NULL (PGlite): a number or undefined. */
export const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
};
export const fill = (s: string, vars: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
