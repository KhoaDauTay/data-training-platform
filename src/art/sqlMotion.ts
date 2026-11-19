import type * as I18n from '../i18n';
import type * as Dom from '../ui/dom';
import type * as Svg from '../ui/svg';
import type { GroupSample, JoinMatch } from '../viz/stepText';
import type * as Load from './load';
import type { Timeline } from './gsap';

/**
 * v10 Track A (product-design-v10 N1/N2/N5, A1–A3; L154): the teaching motion of the Execution order tab, one lazy chunk
 * `sqlMotion` (budget group sqlmotion, 8 KB). Every picture is drawn in its end state (the base frame); a timeline only
 * runs from a click (Play, a step button, a guess), ≤ 3 s, never while drawing, and never under reduced motion or
 * before the gsap chunk is in. Tweens move a state object and write attributes through put(), the same writer that drew
 * the base frame, so progress(1) leaves exactly the static DOM (tests/sqlMotion.test.ts); no DrawSVG or MotionPath
 * (jsdom has no path geometry): wires use pathLength=1 + dash offset, curves are computed here. No @keyframes, no CSS.
 * Main values come through init() (only `import type` from main modules, Plan 6 U3).
 */
let h: typeof Dom.h;
let s: typeof Svg.s;
let fmt: typeof Dom.fmt;
let getLang: typeof I18n.getLang;
let loadedGsap: typeof Load.loadedGsap;
let loadGsap: typeof Load.loadGsap;
let reducedMotion: typeof Dom.reducedMotion;
export function init(deps: {
  h: typeof Dom.h; s: typeof Svg.s; fmt: typeof Dom.fmt; getLang: typeof I18n.getLang;
  loadedGsap: typeof Load.loadedGsap; loadGsap: typeof Load.loadGsap; reducedMotion: typeof Dom.reducedMotion;
}): void {
  ({ h, s, fmt, getLang, loadedGsap, loadGsap, reducedMotion } = deps);
}

/** L154: the words of these pictures, VI/EN, kept in the chunk (not en.ts). */
export const SQLM_TEXT = {
  vi: {
    caption: 'Chấm là hình minh họa: bước đầu 24 chấm, mỗi bước sau giữ số chấm theo tỉ lệ dòng còn lại. Số dưới mỗi cột là số dòng thật.',
    film: 'Các bước chạy lần lượt: {list}.',
    rows: 'dòng',
    groups: 'nhóm',
    guessQ: 'Đoán trước khi xem: sau WHERE còn khoảng bao nhiêu dòng?',
    band0: 'Dưới 10 %',
    band1: '10–50 %',
    band2: 'Trên 50 %',
    right: 'Boon: Đúng rồi! WHERE giữ {pct} ({after} trên {before} dòng).',
    wrong: 'Boon: Chưa đúng. WHERE giữ {pct} ({after} trên {before} dòng), tức là "{band}".',
    fold: 'GROUP BY gộp các dòng cùng khóa thành một dòng: {list}.',
    foldItem: '{key}: {n} dòng thành 1',
    sampleRows: 'Dòng (mẫu)',
    groupsHead: 'Nhóm',
    chip: '{key} · {n} dòng',
    join: '{kind} ghép {left} với {right}: {list}.',
    pair: '{l} khớp {r}',
    none: '{l} không có cặp, cột bên phải là NULL',
    dropped: '{l} không có cặp, dòng bị loại',
    droppedTag: 'bị loại',
  },
  en: {
    caption: 'The dots are a picture: 24 at the first step, then each step keeps dots in proportion to the rows left. The number under each column is the real row count.',
    film: 'The steps run in this order: {list}.',
    rows: 'rows',
    groups: 'groups',
    guessQ: 'Guess before you watch: how many rows are left after WHERE?',
    band0: 'Under 10%',
    band1: '10–50%',
    band2: 'Over 50%',
    right: 'Boon: Right! WHERE keeps {pct} ({after} of {before} rows).',
    wrong: 'Boon: Not quite. WHERE keeps {pct} ({after} of {before} rows), that is "{band}".',
    fold: 'GROUP BY folds the rows that share a key into one row: {list}.',
    foldItem: '{key}: {n} rows into 1',
    sampleRows: 'Rows (sample)',
    groupsHead: 'Groups',
    chip: '{key} · {n} rows',
    join: '{kind} pairs {left} with {right}: {list}.',
    pair: '{l} matches {r}',
    none: '{l} has no partner, the right-hand columns are NULL',
    dropped: '{l} has no partner, the row is dropped',
    droppedTag: 'dropped',
  },
};
type TextKey = keyof typeof SQLM_TEXT.vi;
const tx = (k: TextKey, v: Record<string, string | number> = {}): string =>
  SQLM_TEXT[getLang()][k].replace(/\{(\w+)\}/g, (_, n: string) => String(v[n]));

/** Every duration of this chunk, in ms (tests/sqlMotion.test.ts: each one-shot ≤ 3000). */
export const MS = { film: 3000, step: 350, tail: 400, fold: 2500, join: 2500, wire: 120 };

/** May a picture move now? Else it stays on its end frame (and the gsap chunk is fetched for next time). */
export function canPlay(): boolean {
  if (reducedMotion()) return false;
  if (loadedGsap()) return true;
  loadGsap();
  return false;
}

type Pose = Record<string, number>;
const num = (v: number): string => String(Math.round(v * 100) / 100);
/** The one attribute writer: base frames and tweens both go through it. `s` = scale of a transform-free <g> (1 = none). */
function put(el: Element, pose: Pose): void {
  for (const [k, v] of Object.entries(pose)) {
    if (k === 'x' || k === 'y') el.setAttribute('transform', `translate(${num(pose.x ?? 0)} ${num(pose.y ?? 0)})`);
    else if (k === 's') {
      if (v === 1) el.removeAttribute('transform');
      else el.setAttribute('transform', `scale(${num(v)})`);
    } else el.setAttribute(k, num(v));
  }
}
const mix = (a: Pose, b: Pose, p: number): Pose => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, (a[k] ?? v) + (v - (a[k] ?? v)) * p]));
/** A timeline being built, with the base attributes of every element it touches (first snapshot wins). */
type Run = { t: Timeline; snap: Map<Element, (string | null)[]> };
const ATTRS = ['transform', 'opacity', 'cx', 'cy', 'stroke-dasharray', 'stroke-dashoffset'];
const keep = (r: Run, el: Element): void => {
  if (!r.snap.has(el)) r.snap.set(el, ATTRS.map((a) => el.getAttribute(a)));
};
/** Ends the timeline by writing every base attribute back, so its last frame is exactly the static drawing. */
function seal(r: Run): Timeline {
  r.t.call(() => r.snap.forEach((v, el) => ATTRS.forEach((a, i) => (v[i] === null ? el.removeAttribute(a) : el.setAttribute(a, v[i]!)))), undefined, r.t.duration());
  return r.t;
}
/** Tween `el` from `from` to `to` on `r`: the from pose is written now (so the first frame is right), the base comes back at seal(). */
function tween(r: Run, el: Element, from: Pose, to: Pose, at: number, dur: number, ease = 'power2.inOut', bend = 0): void {
  keep(r, el);
  put(el, from);
  const st = { p: 0 };
  r.t.to(st, {
    p: 1, duration: dur, ease,
    onUpdate: () => {
      const pose = mix(from, to, st.p);
      const lift = bend * 4 * st.p * (1 - st.p); // a light arc instead of a straight slide
      if ('y' in pose) pose.y -= lift;
      if ('cy' in pose) pose.cy -= lift;
      put(el, st.p === 1 ? to : pose);
    },
  }, at);
}

// ── A1: the film ──────────────────────────────────────────────────────────────────────────────────────────────
export interface FilmStep { label: string; count?: number; groups: boolean }
const COLW = 78;
const DOT = 11;
const PER_COL = 24;
/** Dots per column: 24 at the first step, then in proportion to the rows kept (≥ 1 while rows remain); GROUP BY keeps at most one dot per group. */
export function dotCounts(steps: FilmStep[]): number[] {
  const out: number[] = [];
  steps.forEach((st, i) => {
    const prev = out[i - 1] ?? PER_COL;
    const c = st.count;
    const p = steps.slice(0, i).reverse().find((x) => x.count !== undefined)?.count;
    if (c === undefined) out.push(i ? prev : PER_COL);
    else if (c === 0) out.push(0);
    else if (!i || !p) out.push(Math.min(PER_COL, i ? c : PER_COL));
    else if (st.groups && !steps[i - 1].groups) out.push(Math.min(prev, c));
    else out.push(Math.max(1, Math.min(PER_COL, Math.round((prev * c) / p))));
  });
  return out;
}
const dotAt = (col: number, j: number): Pose => ({ cx: col * COLW + 17 + (j % 4) * DOT, cy: 10 + Math.floor(j / 4) * DOT });

export interface Film { el: Element; build(onStep: (i: number) => void): Timeline | undefined; play(onStep: (i: number) => void): Promise<void>; stop(): void }
/**
 * The steps as columns of dots with the clause, the real count and its unit under each (base = every column drawn).
 * play(): column by column, min(350, 2600 / n) ms each + 400 ms: dots move on from the column before; rows a step
 * removes fall and fade (WHERE, HAVING, LIMIT), rows GROUP BY / DISTINCT fold slide into a kept dot and fade.
 */
export function film(steps: FilmStep[]): Film {
  const dots = dotCounts(steps);
  const unit = (st: FilmStep) => tx(st.groups ? 'groups' : 'rows');
  const svg = s('svg', {
    viewBox: `0 0 ${steps.length * COLW} 128`, role: 'img', class: 'h-auto w-full min-w-[480px]',
    'aria-label': tx('film', { list: steps.map((st) => `${st.label} ${st.count === undefined ? '–' : fmt(st.count)} ${unit(st)}`).join(', ') }),
  });
  type Col = { g: SVGGElement; kept: SVGCircleElement[]; ghosts: SVGCircleElement[]; count?: SVGTextElement };
  const cols: Col[] = steps.map((st, i) => {
    const g = s('g', {});
    const dot = (fill: string) => s('circle', { r: 4, style: `fill:var(${fill})` });
    const kept = Array.from({ length: dots[i] }, () => dot('--accent'));
    kept.forEach((c, j) => put(c, dotAt(i, j)));
    const lost = Math.max(0, (dots[i - 1] ?? 0) - dots[i]);
    const merge = st.groups && !steps[i - 1]?.groups || st.label === 'DISTINCT';
    const ghosts = Array.from({ length: i ? lost : 0 }, (_, j) => {
      const c = dot(merge ? '--accent' : '--bad');
      put(c, { ...(merge ? dotAt(i, j % Math.max(1, dots[i])) : { ...dotAt(i - 1, dots[i] + j), cy: dotAt(i - 1, dots[i] + j).cy + 18 }), opacity: 0 });
      return c;
    });
    const text = (y: number, body: string, cls: string) => s('text', { x: i * COLW + 33, y, 'text-anchor': 'middle', class: cls }, body);
    const count = st.count === undefined ? undefined : text(102, fmt(st.count), 'fill-ink text-caption font-semibold tabular-nums');
    g.append(...kept, ...ghosts, text(88, st.label.length > 12 ? `${st.label.slice(0, 11)}…` : st.label, 'fill-ink text-caption font-semibold'), count ?? '', text(116, unit(st), 'fill-ink text-caption'));
    if (i) g.prepend(s('line', { x1: i * COLW - 6, x2: i * COLW + 4, y1: 38, y2: 38, style: 'stroke:var(--border)', 'stroke-width': 2 }));
    svg.append(g);
    return { g, kept, ghosts, count: count ?? undefined };
  });

  let tl: Timeline | undefined;
  const stop = (): void => {
    tl?.progress(1);
    tl?.kill();
    tl = undefined;
  };
  /** The paused film (undefined without GSAP). */
  const build = (onStep: (i: number) => void): Timeline | undefined => {
    const g = loadedGsap();
    if (!g) return undefined;
    const per = Math.min(MS.step, 2600 / steps.length) / 1000;
    const r: Run = { t: g.timeline(), snap: new Map() };
    const t = r.t;
    cols.forEach((c, i) => {
      const at = i * per;
      t.call(() => onStep(i), undefined, at);
      if (!i) {
        c.kept.forEach((d, j) => tween(r, d, { ...dotAt(0, j), opacity: 0 }, { ...dotAt(0, j), opacity: 1 }, j * 0.004, per * 0.8));
        return;
      }
      tween(r, c.g, { opacity: 0 }, { opacity: 1 }, at, 0.12, 'none');
      const prev = Math.max(1, dots[i - 1]);
      c.kept.forEach((d, j) => tween(r, d, dotAt(i - 1, j % prev), dotAt(i, j), at, per * 0.9, 'power2.inOut', 6));
      c.ghosts.forEach((d, j) => {
        const end = { cx: Number(d.getAttribute('cx')), cy: Number(d.getAttribute('cy')), opacity: 0 };
        tween(r, d, { ...dotAt(i - 1, dots[i] + j), opacity: 1 }, end, at, per * 0.9, 'power1.in');
      });
      const from = steps[i - 1].count;
      const to = steps[i].count;
      if (c.count && from !== undefined && to !== undefined) {
        const st = { n: from };
        const el = c.count;
        el.textContent = fmt(from);
        t.to(st, { n: to, duration: per, ease: 'power1.out', onUpdate: () => { el.textContent = fmt(Math.round(st.n)); } }, at);
      }
    });
    t.to({}, { duration: MS.tail / 1000 }, cols.length * per); // the last column settles
    return seal(r);
  };
  const play = (onStep: (i: number) => void): Promise<void> => {
    stop();
    const t = reducedMotion() ? undefined : build(onStep);
    if (!t) return Promise.resolve();
    tl = t;
    t.eventCallback('onUpdate', () => { if (!svg.isConnected) stop(); });
    return new Promise((done) => {
      t.eventCallback('onComplete', () => { tl = undefined; done(); });
      t.play();
    });
  };
  return { el: h('div', {}, h('p', { class: 'muted' }, tx('caption')), h('div', { class: 'overflow-auto' }, svg)), build, play, stop };
}

/** Counts a number up or down over `ms`, handing each whole value to `set` (the element is tabular-nums); ends on `to`. */
export function countTo(set: (n: number) => void, from: number, to: number, ms: number): void {
  const g = loadedGsap();
  if (!g || reducedMotion() || from === to) return;
  const st = { n: from };
  set(from);
  g.gsap.to(st, { n: to, duration: ms / 1000, ease: 'power1.out', onUpdate: () => set(Math.round(st.n)), onComplete: () => set(to) });
}
/** The "after" bar shrinks from the "before" width to its own (an HTML leaf <i>, width only, never a transform). */
export function shrink(el: HTMLElement, fromPct: number, ms: number): void {
  const g = loadedGsap();
  const base = el.style.width;
  if (!g || reducedMotion()) return;
  const st = { w: fromPct };
  const end = parseFloat(base);
  el.style.width = `${fromPct}%`;
  g.gsap.to(st, { w: end, duration: ms / 1000, ease: 'power2.out', onUpdate: () => { el.style.width = `${st.w}%`; }, onComplete: () => { el.style.width = base; } });
}

// ── N5: guess before the film ─────────────────────────────────────────────────────────────────────────────────
/** Share of rows WHERE keeps: 0 = under 10 %, 1 = 10–50 %, 2 = over 50 %. */
export const guessBand = (before: number, after: number): 0 | 1 | 2 => {
  const r = before > 0 ? after / before : 1;
  return r < 0.1 ? 0 : r <= 0.5 ? 1 : 2;
};
const BANDS: TextKey[] = ['band0', 'band1', 'band2'];
/** Three answers; a pick disables them, runs the film (`start`) and then says Boon's one sentence (role=status). 0 XP, never saved. */
export function guessBox(before: number, after: number, start: (then: () => void) => void): HTMLElement {
  const line = h('p', { role: 'status', class: 'muted' });
  const buttons = BANDS.map((k, i) => h('button', {
    type: 'button',
    onclick: () => {
      buttons.forEach((b) => { b.disabled = true; b.setAttribute('aria-pressed', String(b === buttons[i])); });
      const band = guessBand(before, after);
      const pct = `${fmt(before ? (after / before) * 100 : 100, 1)} %`;
      start(() => { line.textContent = tx(band === i ? 'right' : 'wrong', { pct, after: fmt(after), before: fmt(before), band: tx(BANDS[band]) }); });
    },
  }, tx(k)));
  return h('fieldset', { class: 'my-2' }, h('legend', {}, tx('guessQ')), h('div', { class: 'actions' }, ...buttons), line);
}

// ── A2: GROUP BY folds rows ───────────────────────────────────────────────────────────────────────────────────
const short = (v: string, n = 14): string => (v.length > n ? `${v.slice(0, n - 1)}…` : v);
/** A chip: outer <g> placed by put(), inner <g> without a transform (the one a pop scales), centred on 0,0. */
function chip(text: string, w: number, fill: string, dashed = false): { g: SVGGElement; pop: SVGGElement } {
  const pop = s('g', {},
    s('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 6, style: `fill:var(${fill});stroke:var(--border)`, 'stroke-dasharray': dashed ? '3 2' : false }),
    s('text', { y: 4, 'text-anchor': 'middle', class: 'fill-ink text-caption tabular-nums' }, text));
  return { g: s('g', {}, pop), pop };
}
export interface Shot { el: Element; build(): Timeline | undefined; play(): void }
/** One click, one run: the paused timeline from build() plays once (nothing under reduced motion or without GSAP). */
const shot = (el: Element, build: () => Timeline | undefined): Shot => ({ el, build, play: () => { if (!reducedMotion()) build()?.play(); } });

/**
 * Sample rows (≤ 8, dealt round-robin from up to 3 groups, at most 3 per group: every row shows its key) on the left, the
 * groups with their real size on the right, a line from each row to its group. play(), ≤ 2.5 s: a copy of each row
 * arcs into its group one after another, then the group chip pops.
 */
export function fold(groups: GroupSample[]): Shot {
  const rows: number[] = [];
  for (let r = 0; r < 3; r++) groups.forEach((g, gi) => { if (r < Math.min(g.n, 3)) rows.push(gi); });
  rows.splice(8);
  const H = Math.max(rows.length, groups.length) * 26 + 30;
  const gy = (gi: number) => 30 + ((gi + 0.5) * (H - 30)) / groups.length;
  const svg = s('svg', {
    viewBox: `0 0 380 ${H}`, role: 'img', class: 'h-auto w-full max-w-[520px]',
    'aria-label': tx('fold', { list: groups.map((g) => tx('foldItem', { key: g.key, n: fmt(g.n) })).join('; ') }),
  },
  s('text', { x: 70, y: 14, 'text-anchor': 'middle', class: 'fill-ink text-caption font-semibold' }, tx('sampleRows')),
  s('text', { x: 290, y: 14, 'text-anchor': 'middle', class: 'fill-ink text-caption font-semibold' }, tx('groupsHead')));
  const lines = rows.map((gi, j) => {
    const l = s('path', { d: `M130 ${43 + j * 26} C185 ${43 + j * 26} 185 ${gy(gi)} 215 ${gy(gi)}`, fill: 'none', style: 'stroke:var(--border)', 'stroke-width': 1.5, pathLength: 1 });
    svg.append(l);
    return l;
  });
  const sources = rows.map((gi, j) => {
    const c = chip(short(groups[gi].key), 120, '--panel');
    put(c.g, { x: 70, y: 43 + j * 26 });
    svg.append(c.g);
    return c;
  });
  const movers = rows.map((gi) => {
    const c = chip(short(groups[gi].key), 120, '--accent-soft');
    put(c.g, { x: 290, y: gy(gi) });
    c.g.setAttribute('opacity', '0');
    svg.append(c.g);
    return c;
  });
  const heads = groups.map((g, gi) => {
    const c = chip(tx('chip', { key: short(g.key, 12), n: fmt(g.n) }), 150, '--accent-soft');
    put(c.g, { x: 290, y: gy(gi) });
    svg.append(c.g);
    return c;
  });
  return shot(svg, () => {
    const g = loadedGsap();
    if (!g) return undefined;
    const r: Run = { t: g.timeline(), snap: new Map() };
    const step = 0.15;
    lines.forEach((l, j) => {
      tween(r, l, { 'stroke-dashoffset': 1 }, { 'stroke-dashoffset': 0 }, j * step, 0.5, 'none');
      l.setAttribute('stroke-dasharray', '1 1');
    });
    movers.forEach((c, j) => {
      tween(r, c.g, { x: 70, y: 43 + j * 26, opacity: 1 }, { x: 290, y: gy(rows[j]), opacity: 1 }, j * step, 0.7, 'power2.inOut', 24);
      tween(r, c.g, { opacity: 1 }, { opacity: 0 }, j * step + 0.7, 0.25, 'none');
      put(c.g, { opacity: 0 }); // hidden until its turn
    });
    heads.forEach((c, gi) => {
      const at = Math.max(0, rows.lastIndexOf(gi)) * step + 0.75;
      tween(r, c.g, { opacity: 0 }, { opacity: 1 }, at, 0.2, 'none');
      tween(r, c.pop, { s: 0.6 }, { s: 1 }, at, 0.45, 'back.out(2.5)');
    });
    return seal(r);
  });
}

// ── A3: JOIN pairs keys ───────────────────────────────────────────────────────────────────────────────────────
/**
 * Left keys (the sample rows) and the distinct right keys they matched; a wire per match. A LEFT JOIN row with no
 * partner gets an ∅ chip (NULL columns); an INNER JOIN one is struck through and tagged "dropped". play(), ≤ 2.5 s:
 * wires draw one by one (120 ms apart), then each ∅ pops and each dropped row fades.
 */
export function joinPairs(m: JoinMatch, kindLabel: string): Shot {
  const rights = [...new Set(m.pairs.map((p) => p.r).filter((r): r is string => r !== null))];
  const H = Math.max(m.pairs.length, rights.length) * 26 + 30;
  const ly = (j: number) => 43 + j * 26;
  const ry = (r: string) => 43 + rights.indexOf(r) * 26;
  const item = (p: JoinMatch['pairs'][number]) =>
    p.r !== null ? tx('pair', { l: p.l, r: p.r }) : tx(m.kind === 'left' ? 'none' : 'dropped', { l: p.l });
  const svg = s('svg', {
    viewBox: `0 0 400 ${H}`, role: 'img', class: 'h-auto w-full max-w-[520px]',
    'aria-label': tx('join', { kind: kindLabel, left: m.left, right: m.right, list: m.pairs.map(item).join('; ') }),
  },
  s('text', { x: 60, y: 14, 'text-anchor': 'middle', class: 'fill-ink text-caption font-semibold' }, m.left),
  s('text', { x: 330, y: 14, 'text-anchor': 'middle', class: 'fill-ink text-caption font-semibold' }, m.right));
  const wires: SVGPathElement[] = [];
  const pops: SVGGElement[] = [];
  const faded: SVGGElement[] = [];
  m.pairs.forEach((p, j) => {
    if (p.r !== null) {
      const w = s('path', { d: `M110 ${ly(j)} C200 ${ly(j)} 200 ${ry(p.r)} 280 ${ry(p.r)}`, fill: 'none', style: 'stroke:var(--accent)', 'stroke-width': 2, pathLength: 1 });
      wires.push(w);
      svg.append(w);
    }
  });
  m.pairs.forEach((p, j) => {
    const c = chip(short(p.l), 100, '--panel');
    put(c.g, { x: 60, y: ly(j) });
    svg.append(c.g);
    if (p.r !== null) return;
    if (m.kind === 'left') {
      const n = chip('∅ NULL', 70, '--surface-2', true);
      put(n.g, { x: 190, y: ly(j) });
      svg.append(n.g);
      pops.push(n.pop);
    } else {
      c.pop.append(s('line', { x1: -42, x2: 42, y1: 0, y2: 0, style: 'stroke:var(--bad)', 'stroke-width': 1.5 }));
      c.g.setAttribute('opacity', '0.55');
      faded.push(c.g);
      svg.append(s('text', { x: 125, y: ly(j) + 4, class: 'fill-ink text-caption' }, tx('droppedTag')));
    }
  });
  rights.forEach((r) => {
    const c = chip(short(r), 100, '--accent-soft');
    put(c.g, { x: 330, y: ry(r) });
    svg.append(c.g);
  });
  return shot(svg, () => {
    const g = loadedGsap();
    if (!g) return undefined;
    const r: Run = { t: g.timeline(), snap: new Map() };
    wires.forEach((w, j) => {
      tween(r, w, { 'stroke-dashoffset': 1 }, { 'stroke-dashoffset': 0 }, (j * MS.wire) / 1000, 0.35, 'power1.out');
      w.setAttribute('stroke-dasharray', '1 1');
    });
    const at = (wires.length * MS.wire) / 1000 + 0.2;
    pops.forEach((p) => tween(r, p, { s: 0.3, opacity: 0 }, { s: 1, opacity: 1 }, at, 0.45, 'back.out(3)'));
    faded.forEach((f) => tween(r, f, { opacity: 1 }, { opacity: 0.55 }, at, 0.5, 'none'));
    return seal(r);
  });
}
