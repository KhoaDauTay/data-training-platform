import { type Deps, type Diagram, type Frame, init, mount, type Shape, stopAt, type Tone } from './engineVizCore';
import { GLYPHS, W400, W700 } from './glyphs';
import type { Lang } from './registry';

/**
 * v39 figure system (F1, L600–L606; tools/v39/svg-system.md): a lesson's `figures: [{ name, at, variant?, step? }]` names a
 * spec `content/figures/<name>.yml` (one lazy chunk each). This lazy chunk (`engineFigure`) lays the spec out for the host's
 * width (1 viewBox unit = 1 CSS px, 280–640), measuring every label with the Nunito glyph table, and draws it with the shared
 * renderer (engineVizCore's mount). No coordinates in content: boxes grow from their text, rows wrap on phones instead of
 * shrinking, arrows are routed at right angles and stop 3 units short of their target. A name with no spec is an old
 * registry diagram (`viz:` names, Batch 0). Imports only engineVizCore and types (Plan 6 U3); main values come through Deps.
 */
export type Bi = string | { vi: string; en: string };
export interface FigNode {
  id: string;
  /** box (default), key (pill), grid (cells; `label` above, `sub` below), bars (horizontal bars), note (text only) */
  shape?: 'box' | 'key' | 'grid' | 'bars' | 'note';
  label?: Bi; sub?: Bi; tone?: Tone; mono?: boolean;
  head?: Bi[]; cells?: Bi[][]; toneOf?: Record<string, Tone>; rowTone?: (Tone | null)[]; colTone?: (Tone | null)[]; strike?: number[];
  items?: { label: Bi; value: number; note?: Bi; tone?: Tone }[]; mark?: number;
}
/** `from`/`to` = a node id, or `grid#row` for a link; `link` = a plain line between neighbours (drawn only side by side). */
export interface FigEdge { from: string; to: string; label?: Bi; dash?: boolean; link?: boolean }
type Patch = Record<string, Partial<FigNode>>;
/** `alt` (v39 R1 E11, L628): a hand-written text alternative; it wins over the generated one (figure, step or variant). */
export interface FigStep { say: Bi; show?: string[]; set?: Patch; alt?: Bi }
export interface FigSpec {
  title: Bi; caption: Bi; nodes: FigNode[]; rows: string[][]; edges?: FigEdge[]; steps?: FigStep[]; alt?: Bi;
  /** R1 E16: consecutive rows of the same length (≥ 2) line up as columns; their boxes take the column's width */
  align?: boolean;
  /** P5: `set`/`show` change the static figure; `step: i` draws step i alone, static; `title`/`caption`/`alt` replace the spec's */
  variants?: Record<string, { set?: Patch; show?: string[]; step?: number; title?: Bi; caption?: Bi; alt?: Bi }>;
}
export interface FigRef { name: string; at: string; variant?: string; step?: number }

export const tr = (b: Bi | undefined, lang: Lang): string => (b === undefined ? '' : typeof b === 'string' ? b : b[lang]);
const fail = (msg: string): never => {
  throw new Error(`figure: ${msg}`);
};

// ── text fit (svg-system §5) ─────────────────────────────────────────────────────────────────────────────────────
const ADV = { 400: W400.split(',').map(Number), 700: W700.split(',').map(Number) };
const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
/** Estimated advance of `s` at `size` px: the table + 4 % (unknown characters 0.62 em); mono 0.62 em per character. */
export function textWidth(s: string, size: number, bold = false, mono = false): number {
  if (mono) return [...s].length * 0.62 * size;
  let em = 0;
  for (const ch of fold(s)) {
    const i = GLYPHS.indexOf(ch);
    em += i < 0 ? 0.62 : ADV[bold ? 700 : 400][i] / 100;
  }
  return em * size * 1.04;
}
/** Nunito's text box is 1.364 em tall; a line pitch one unit taller keeps stacked lines' boxes apart (checker rule a). */
export const lineH = (size: number): number => Math.ceil(size * 1.37) + 1;
export const MAX_CH = 18;
/** R1 E14 (L629): a note keeps one line up to NOTE_CH characters when the figure is ≥ WIDE units wide. */
export const NOTE_CH = 32, WIDE = 480;
/** ≤ 18 characters a line, ≤ 2 lines, broken at the most balanced space; anything longer is a content error (never "…"). */
export function wrap(s: string, one = MAX_CH): string[] {
  if ([...s].length <= one) return [s];
  let best: string[] | undefined;
  for (let i = s.indexOf(' '); i > 0; i = s.indexOf(' ', i + 1)) {
    const a = s.slice(0, i), b = s.slice(i + 1);
    if ([...a].length <= MAX_CH && [...b].length <= MAX_CH && (!best || Math.abs(a.length - b.length) < Math.abs(best[0].length - best[1].length))) best = [a, b];
  }
  return best ?? fail(`"${s}": > 18 ký tự một dòng hoặc > 2 dòng`);
}

// ── grammar (svg-system §2) ──────────────────────────────────────────────────────────────────────────────────────
const LS = 14, SS = 13, PAD_Y = 6, CELL_X = 6, ROW_H = 24, BAR_H = 22;
export const GAP_X = 16, GAP_Y = 36, GAP_LABEL = 52, GAP_NOTE = 16, MARGIN = 8, STROKE = 1.5;
/** R1 E4/E5 (L626): the gap two linked tables want, from the number of lines crossing it (32 is the floor they wrap at). */
export const linkGap = (lines: number): number => Math.min(120, 24 + 18 * lines);
type Line = { s: string; size: number; b: boolean; mono: boolean };
interface Sized { w: number; h: number }

/** One node's text lines (label lines bold 14, or 13 mono; sub lines 13), at most two in all. */
function boxLines(n: FigNode, lang: Lang, wide = false): Line[] {
  const lab = wrap(tr(n.label, lang), wide && n.shape === 'note' ? NOTE_CH : MAX_CH).filter(Boolean).map((s): Line => ({ s, size: n.mono ? SS : LS, b: !n.mono, mono: !!n.mono }));
  const sub = n.sub === undefined ? [] : wrap(tr(n.sub, lang)).map((s): Line => ({ s, size: SS, b: false, mono: false }));
  const all = n.shape === 'note' ? lab.map((l) => ({ ...l, size: SS, b: false })) : [...lab, ...sub];
  return all.length > 2 ? fail(`${n.id}: > 2 dòng (nhãn + sub)`) : all;
}
const widest = (ls: Line[]): number => Math.max(0, ...ls.map((l) => textWidth(l.s, l.size, l.b, l.mono)));
const tall = (ls: Line[]): number => ls.reduce((a, l) => a + lineH(l.size), 0);
const cellText = (n: FigNode, v: Bi, lang: Lang): string => {
  const s = tr(v, lang);
  return [...s].length > MAX_CH ? fail(`${n.id}: ô "${s}" > 18 ký tự`) : s;
};
const titleLines = (n: FigNode, lang: Lang, k: 'label' | 'sub'): Line[] =>
  n[k] === undefined ? [] : wrap(tr(n[k], lang)).map((s) => ({ s, size: k === 'label' ? LS : SS, b: k === 'label', mono: false }));
/** Column widths of a grid (head bold, cells regular or mono). */
function gridCols(n: FigNode, lang: Lang): number[] {
  const rows = [...(n.head ? [n.head] : []), ...(n.cells ?? [])];
  const k = Math.max(0, ...rows.map((r) => r.length));
  return Array.from({ length: k }, (_, c) => Math.max(22, ...rows.map((r, i) => r[c] === undefined ? 0
    : textWidth(cellText(n, r[c], lang), SS, !!n.head && i === 0, !!n.mono && !(n.head && i === 0)) + 2 * CELL_X)));
}
/** Bars: label column, a unit per value (8–20, from the room left), the value or note after the bar. */
function barsDims(n: FigNode, lang: Lang, room: number): { lw: number; u: number; vw: number } {
  const its = n.items ?? [];
  const lw = Math.max(0, ...its.map((i) => textWidth(cellText(n, i.label, lang), SS)));
  const vw = Math.max(0, ...its.map((i) => textWidth(i.note === undefined ? String(i.value) : cellText(n, i.note, lang), SS)));
  const top = Math.max(1, n.mark ?? 0, ...its.map((i) => i.value));
  return { lw, vw, u: Math.max(8, Math.min(20, Math.floor((room - lw - vw - 16) / top))) };
}
function size(n: FigNode, lang: Lang, room: number): Sized {
  const shape = n.shape ?? 'box';
  if (shape === 'grid' || shape === 'bars') {
    const t = titleLines(n, lang, 'label'), sb = titleLines(n, lang, 'sub');
    let inner: Sized;
    if (shape === 'grid') {
      const cols = gridCols(n, lang);
      inner = { w: cols.reduce((a, b) => a + b, 0), h: ((n.head ? 1 : 0) + (n.cells?.length ?? 0)) * ROW_H };
    } else {
      const { lw, u, vw } = barsDims(n, lang, room);
      inner = { w: lw + 8 + Math.max(1, n.mark ?? 0, ...(n.items ?? []).map((i) => i.value)) * u + 8 + vw, h: (n.items?.length ?? 0) * BAR_H };
    }
    return { w: Math.ceil(Math.max(inner.w, widest(t), widest(sb))), h: tall(t) + (t.length ? 4 : 0) + inner.h + (sb.length ? 4 : 0) + tall(sb) };
  }
  const ls = boxLines(n, lang, room + 2 * MARGIN >= WIDE);
  if (shape === 'note') return { w: Math.ceil(widest(ls)), h: tall(ls) };
  const padX = shape === 'key' ? 14 : 10;
  return { w: Math.ceil(Math.max(64, widest(ls) + 2 * padX)), h: tall(ls) + 2 * PAD_Y };
}

// ── layout (svg-system §2.1–2.3, §3) ─────────────────────────────────────────────────────────────────────────────
export interface Rect { x: number; y: number; w: number; h: number }
const base = (end: string): string => end.split('#')[0];
const merge = (nodes: FigNode[], set?: Patch): FigNode[] => nodes.map((n) => (set?.[n.id] ? { ...n, ...set[n.id] } : n));
interface Plan { say: string; show: Set<string>; nodes: FigNode[] }

const variantOf = (spec: FigSpec, variant?: string) => (variant === undefined ? undefined : spec.variants?.[variant]);
/** The frames a spec draws (a variant may pick one step, or patch the static figure). */
function plans(spec: FigSpec, lang: Lang, variant?: string): Plan[] {
  const v = variant === undefined ? undefined : spec.variants?.[variant] ?? fail(`không có variant "${variant}"`);
  const all = spec.nodes.map((n) => n.id);
  const nodes = merge(spec.nodes, v?.set);
  const steps = v?.step !== undefined ? [spec.steps?.[v.step] ?? fail(`variant ${variant}: không có bước ${v.step}`)] : v || !spec.steps?.length ? undefined : spec.steps;
  if (!steps) return [{ say: '', show: new Set(v?.show ?? all), nodes }];
  return steps.map((st) => ({ say: tr(st.say, lang), show: new Set(st.show ?? v?.show ?? all), nodes: merge(nodes, st.set) }));
}

/** Lays the spec out `W` units wide (W = the svg's own width in px, 280–640) and returns the renderer's Diagram. */
export function layout(spec: FigSpec, lang: Lang, W: number, variant?: string): Diagram {
  const ps = plans(spec, lang, variant);
  const room = W - 2 * MARGIN;
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  // every frame's version of a node gets the same box: the largest
  const dims = new Map<string, Sized>();
  for (const p of ps) for (const n of p.nodes) {
    const s = size(n, lang, room);
    const o = dims.get(n.id);
    dims.set(n.id, o ? { w: Math.max(o.w, s.w), h: Math.max(o.h, s.h) } : s);
  }
  const edges = spec.edges ?? [];
  const between = (a: string, b: string): FigEdge | undefined => edges.find((e) => (base(e.from) === a && base(e.to) === b) || (base(e.from) === b && base(e.to) === a));
  const gapOf = (a: string, b: string): number => {
    const e = between(a, b);
    return !e ? GAP_X : e.link ? 32 : Math.max(24, e.label ? Math.ceil(textWidth(tr(e.label, lang), SS)) + 12 : 0);
  };
  const links = (a: string, b: string): number => edges.filter((e) => e.link && [base(e.from), base(e.to)].sort().join() === [a, b].sort().join()).length;
  // R1 E16: `align` lines up runs of equal-length rows as columns (boxes stretched to the column); a run that does not fit stacks
  const slot = new Map<number, { cols: number[]; gaps: number[] }>();
  const stack = new Set<number>();
  if (spec.align) for (let i = 0; i < spec.rows.length;) {
    const n = spec.rows[i].length;
    let j = i + 1;
    while (j < spec.rows.length && spec.rows[j].length === n) j++;
    const run = spec.rows.slice(i, j);
    if (n >= 2 && run.length >= 2) {
      const w = (id: string): number => (dims.get(id) ?? fail(`rows: không có node "${id}"`)).w;
      const cols = Array.from({ length: n }, (_, c) => Math.max(...run.map((r) => w(r[c]))));
      const gaps = Array.from({ length: n - 1 }, (_, c) => Math.max(...run.map((r) => gapOf(r[c], r[c + 1]))));
      const fits = cols.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0) <= room;
      for (let k = i; k < j; k++) {
        if (!fits) { stack.add(k); continue; }
        slot.set(k, { cols, gaps });
        spec.rows[k].forEach((id, c) => { if (['box', 'key'].includes(byId.get(id)?.shape ?? 'box')) dims.set(id, { ...dims.get(id)!, w: cols[c] }); });
      }
    }
    i = j;
  }
  // rows wrap, in order, when they do not fit
  const vrows: string[][] = [];
  const vslot: ({ cols: number[]; gaps: number[] } | undefined)[] = [];
  spec.rows.forEach((row, ri) => {
    if (slot.has(ri) || stack.has(ri)) {
      for (const r of slot.has(ri) ? [row] : row.map((id) => [id])) { vrows.push(r); vslot.push(slot.get(ri)); }
      return;
    }
    let cur: string[] = [];
    let used = 0;
    for (const id of row) {
      const d = dims.get(id) ?? fail(`rows: không có node "${id}"`);
      if (d.w > room) fail(`${id} rộng ${d.w} > ${room} (W ${W})`);
      const add = (cur.length ? gapOf(cur[cur.length - 1], id) : 0) + d.w;
      if (cur.length && used + add > room) {
        vrows.push(cur);
        vslot.push(undefined);
        cur = [id];
        used = d.w;
      } else {
        cur.push(id);
        used += add;
      }
    }
    if (cur.length) { vrows.push(cur); vslot.push(undefined); }
  });
  const rowOf = new Map<string, number>();
  vrows.forEach((r, i) => r.forEach((id) => rowOf.set(id, i)));
  for (const n of spec.nodes) if (!rowOf.has(n.id)) fail(`node "${n.id}" không nằm trong rows`);
  // a labelled vertical edge widens its gap
  const labelled = new Set(edges.filter((e) => e.label && !e.link && Math.abs(rowOf.get(base(e.from))! - rowOf.get(base(e.to))!) === 1)
    .map((e) => Math.min(rowOf.get(base(e.from))!, rowOf.get(base(e.to))!)));
  const isNote = (id: string): boolean => byId.get(id)?.shape === 'note';
  const linked = (i: number): boolean => edges.some((e) => Math.min(rowOf.get(base(e.from))!, rowOf.get(base(e.to))!) === i && Math.abs(rowOf.get(base(e.from))! - rowOf.get(base(e.to))!) === 1);
  const at = new Map<string, Rect>();
  let y = MARGIN;
  const bands: [number, number][] = [];
  vrows.forEach((r, i) => {
    const hh = Math.max(...r.map((id) => dims.get(id)!.h));
    // R1 E3: a row of tables starts every table at the same top (one title baseline); other rows centre their nodes
    const top = r.every((id) => ['grid', 'bars'].includes(byId.get(id)?.shape ?? 'box'));
    const sl = vslot[i];
    const xs: number[] = [];
    if (sl) {
      let x = Math.round((W - sl.cols.reduce((a, b) => a + b, 0) - sl.gaps.reduce((a, b) => a + b, 0)) / 2);
      r.forEach((id, c) => { xs.push(x + Math.round((sl.cols[c] - dims.get(id)!.w) / 2)); x += sl.cols[c] + (sl.gaps[c] ?? 0); });
    } else {
      const g = r.map((id, j) => (j ? gapOf(r[j - 1], id) : 0));
      let spare = room - r.reduce((a, id, j) => a + dims.get(id)!.w + g[j], 0);
      // R1 E4/E5: linked neighbours spread their gap toward linkGap(lines) from the room left, never wrapping for it
      r.forEach((id, j) => {
        if (!j || !between(r[j - 1], id)?.link) return;
        const add = Math.max(0, Math.min(linkGap(links(r[j - 1], id)) - g[j], spare));
        g[j] += add;
        spare -= add;
      });
      let x = Math.round((W - r.reduce((a, id, j) => a + dims.get(id)!.w + g[j], 0)) / 2);
      r.forEach((id, j) => { x += g[j]; xs.push(x); x += dims.get(id)!.w; });
    }
    r.forEach((id, j) => {
      const d = dims.get(id)!;
      at.set(id, { x: xs[j], y: top ? y : y + Math.round((hh - d.h) / 2), w: d.w, h: d.h });
    });
    bands.push([y, y + hh]);
    // R1 E14: a row of notes is a heading for the row below: GAP_NOTE when no edge crosses the gap
    y += hh + (i < vrows.length - 1 ? (labelled.has(i) ? GAP_LABEL : r.every(isNote) && !linked(i) ? GAP_NOTE : GAP_Y) : 0);
  });
  const H = y + MARGIN;

  // routes: decided once from the geometry (the same for every frame)
  const lanes = new Map<number, number>();
  // R1 E10: arrows entering one side of a box from the next row land spread over it (⅓ ⅔ …), sorted by where they come from
  const side = (e: FigEdge): string | undefined => {
    const ra = rowOf.get(base(e.from))!, rb = rowOf.get(base(e.to))!;
    return e.link || Math.abs(ra - rb) !== 1 ? undefined : `${base(e.to)}|${rb > ra}`;
  };
  const cx = (e: FigEdge): number => { const a = at.get(base(e.from))!; return a.x + a.w / 2; };
  const land = (e: FigEdge): number | undefined => {
    const g = edges.filter((f) => side(f) !== undefined && side(f) === side(e)).sort((p, q) => cx(p) - cx(q));
    if (g.length < 2) return undefined;
    const b = at.get(base(e.to))!;
    return Math.round(b.x + (b.w * (g.indexOf(e) + 1)) / (g.length + 1));
  };
  const routes = edges.map((e) => {
    const a = at.get(base(e.from)) ?? fail(`edge: không có node "${e.from}"`);
    const b = at.get(base(e.to)) ?? fail(`edge: không có node "${e.to}"`);
    const ra = rowOf.get(base(e.from))!, rb = rowOf.get(base(e.to))!;
    const label = tr(e.label, lang);
    if (e.link) {
      if (ra !== rb) return undefined; // stacked on a phone: the text alternative keeps it
      const [l, r] = a.x < b.x ? [e.from, e.to] : [e.to, e.from];
      const L = at.get(base(l))!, R = at.get(base(r))!;
      return { e, d: `M${L.x + L.w} ${anchorY(l, L)} L${R.x} ${anchorY(r, R)}` };
    }
    if (ra === rb) {
      if (Math.abs(vrows[ra].indexOf(base(e.from)) - vrows[ra].indexOf(base(e.to))) !== 1) fail(`${e.from}→${e.to}: cùng hàng nhưng không cạnh nhau`);
      const cy = Math.round((Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2);
      const right = a.x < b.x;
      const x1 = right ? a.x + a.w + 2 : a.x - 2;
      const [x2] = stopAt(x1, cy, b.x + b.w / 2, cy, STROKE, b); // the core's rule (L620): the tip stays 3 units outside b
      return { e, d: `M${x1} ${cy} L${x2} ${cy}`, lab: label ? { x: (x1 + x2) / 2, y: cy - 6 - lineH(SS) / 2, a: 'm' as const, s: label } : undefined };
    }
    if (Math.abs(ra - rb) !== 1) fail(`${e.from}→${e.to}: hai hàng không liền nhau (cần đổi rows)`);
    const down = rb > ra;
    const y1 = down ? a.y + a.h + 2 : a.y - 2;
    const y2 = (x: number, from: number): number => stopAt(x, from, x, b.y + b.h / 2, STROKE, b)[1];
    const lo = Math.max(a.x, b.x), hi = Math.min(a.x + a.w, b.x + b.w);
    const L = land(e);
    if (L === undefined ? hi - lo >= 24 : L >= a.x + 12 && L <= a.x + a.w - 12) {
      const x = L ?? Math.round((lo + hi) / 2);
      const ye = y2(x, y1);
      return { e, d: `M${x} ${y1} L${x} ${ye}`, lab: label ? { x: x + 6, y: (y1 + ye) / 2, a: undefined, s: label } : undefined };
    }
    if (label) fail(`${e.from}→${e.to}: nhãn trên đường gấp khúc chưa hỗ trợ`);
    const gap = Math.min(ra, rb);
    const k = lanes.get(gap) ?? 0;
    lanes.set(gap, k + 1);
    const ym = Math.round((bands[gap][1] + bands[gap + 1][0]) / 2) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8;
    // the elbow lands on the part of b nearest the source, so two arrows into one box never share a tip
    const ax = Math.round(a.x + a.w / 2), bx = L ?? Math.round(Math.min(b.x + b.w - 12, Math.max(b.x + 12, ax)));
    return { e, d: `M${ax} ${y1} L${ax} ${ym} L${bx} ${ym} L${bx} ${y2(bx, ym)}` };
  });
  /** A link end's y: a grid row's middle (`grid#2`), else the node's middle. */
  function anchorY(end: string, r: Rect): number {
    const [id, row] = end.split('#');
    if (row === undefined) return Math.round(r.y + r.h / 2);
    const n = byId.get(id)!;
    return Math.round(r.y + tall(titleLines(n, lang, 'label')) + (n.label === undefined ? 0 : 4) + ((n.head ? 1 : 0) + Number(row) + 0.5) * ROW_H);
  }

  /** data-from/data-to name a box the checker can find: a box or key end (a grid or bars end has no single rect, the checker finds its nearest cell). */
  const boxy = (end: string): boolean => ['box', 'key'].includes(byId.get(base(end))?.shape ?? 'box');
  const ends = (e: FigEdge): Record<string, string> => ({ ...(boxy(e.from) ? { 'data-from': `n:${base(e.from)}` } : {}), ...(boxy(e.to) ? { 'data-to': `n:${base(e.to)}` } : {}) });
  const frames: Frame[] = ps.map((p) => {
    const shapes: Shape[] = [];
    routes.forEach((r, i) => {
      if (!r || !p.show.has(base(r.e.from)) || !p.show.has(base(r.e.to))) return;
      const k = `e:${i}`;
      shapes.push(r.e.link
        ? { k, t: 'p', d: r.d, ink: 'new', w: STROKE, dash: r.e.dash }
        : { k, t: 'p', d: r.d, ink: 'edge', w: STROKE, arrow: true, dash: r.e.dash, attrs: ends(r.e) });
      if (r.lab) shapes.push({ k: `${k}.l`, t: 't', x: r.lab.x, y: r.lab.y, s: r.lab.s, size: SS, a: r.lab.a, ink: 'muted' });
    });
    for (const n of p.nodes) if (p.show.has(n.id)) shapes.push(...draw(n, at.get(n.id)!, lang, W >= WIDE));
    return { say: p.say, nodes: shapes };
  });
  return { title: tr(variantOf(spec, variant)?.title ?? spec.title, lang), w: W, h: H, frames, maxW: 640 };
}

/** Text lines centred on (cx, top…), each its own <text> (dominant-baseline middle). */
function lines(k: string, ls: Line[], cx: number, top: number, more: Partial<Extract<Shape, { t: 't' }>>, owner?: string): Shape[] {
  let y = top;
  return ls.map((l, i) => {
    const h = lineH(l.size);
    y += h;
    return { k: `${k}${i}`, t: 't', x: cx, y: y - h / 2, s: l.s, size: l.size, b: l.b, mono: l.mono, a: 'm', ...more,
      attrs: { ...(owner ? { 'data-owner': owner } : {}), ...(l.mono ? { lang: 'en' } : {}) } };
  });
}

/** One node's shapes. Keys: `n:<id>` (its box), `n:<id>.t<i>` (its lines), `n:<id>:<r>:<c>` (a grid cell)… */
function draw(n: FigNode, r: Rect, lang: Lang, wide = false): Shape[] {
  const k = `n:${n.id}`;
  const shape = n.shape ?? 'box';
  const ink = n.tone === 'ghost' ? 'muted' : 'ink';
  if (shape === 'box' || shape === 'key') {
    const ls = boxLines(n, lang);
    return [{ k, t: 'r', x: r.x, y: r.y, w: r.w, h: r.h, tone: n.tone ?? 'cell', rx: shape === 'key' ? r.h / 2 : 8 },
      ...lines(`${k}.t`, ls, r.x + r.w / 2, r.y + PAD_Y, { ink }, k)];
  }
  if (shape === 'note') return lines(`${k}.t`, boxLines(n, lang, wide), r.x + r.w / 2, r.y, { ink: 'ink' });
  const out: Shape[] = [];
  const t = titleLines(n, lang, 'label'), sb = titleLines(n, lang, 'sub');
  out.push(...lines(`${k}.h`, t, r.x + r.w / 2, r.y, { ink: 'ink' }));
  let y = r.y + tall(t) + (t.length ? 4 : 0);
  if (shape === 'grid') {
    const cols = gridCols(n, lang);
    const x0 = r.x + Math.round((r.w - cols.reduce((a, b) => a + b, 0)) / 2);
    const rows = [...(n.head ? [n.head] : []), ...(n.cells ?? [])];
    rows.forEach((row, i) => {
      const body = n.head ? i - 1 : i;
      const head = body < 0;
      let x = x0;
      row.forEach((v, c) => {
        const s = cellText(n, v, lang);
        const ck = `${k}:${i}:${c}`;
        const tone: Tone = head ? 'cell' : n.toneOf?.[s] ?? n.rowTone?.[body] ?? n.colTone?.[c] ?? n.tone ?? 'plain';
        if (s) {
          out.push({ k: ck, t: 'r', x, y, w: cols[c], h: ROW_H, tone, rx: 0 },
            { k: `${ck}.t`, t: 't', x: x + cols[c] / 2, y: y + ROW_H / 2, s, size: SS, b: head, mono: !!n.mono && !head, a: 'm', ink: tone === 'ghost' ? 'muted' : 'ink',
              attrs: { 'data-owner': ck, ...(n.mono && !head ? { lang: 'en' } : {}) } });
        }
        x += cols[c];
      });
      if (!head && n.strike?.includes(body)) out.push({ k: `${k}:x${body}`, t: 'l', x1: x0 + 3, y1: y + ROW_H / 2, x2: x - 3, y2: y + ROW_H / 2, ink: 'dead', w: 1.5 });
      y += ROW_H;
    });
  } else {
    const { lw, vw } = barsDims(n, lang, 0);
    const its = n.items ?? [];
    const top = Math.max(1, n.mark ?? 0, ...its.map((i) => i.value));
    const unit = Math.max(8, Math.min(20, Math.floor((r.w - lw - vw - 16) / top))); // the node is as wide as size() made it
    const bx = r.x + Math.round((r.w - (lw + 8 + top * unit + 8 + vw)) / 2) + Math.ceil(lw) + 8;
    its.forEach((it, i) => {
      const cy = y + i * BAR_H + BAR_H / 2;
      const s = tr(it.note, lang) || String(it.value);
      out.push({ k: `${k}.l${i}`, t: 't', x: bx - 8, y: cy, s: tr(it.label, lang), size: SS, a: 'e', ink: 'ink' },
        { k: `${k}:b${i}`, t: 'r', x: bx, y: cy - 7, w: it.value * unit, h: 14, tone: it.tone ?? n.tone ?? 'new', rx: 3 },
        { k: `${k}.v${i}`, t: 't', x: bx + Math.max(it.value, n.mark ?? 0) * unit + 8, y: cy, s, size: SS, ink: 'ink' });
    });
    if (n.mark !== undefined) out.push({ k: `${k}.m`, t: 'l', x1: bx + n.mark * unit, y1: y + 1, x2: bx + n.mark * unit, y2: y + its.length * BAR_H - 1, ink: 'warm', w: 1.5, dash: true });
    y += its.length * BAR_H;
  }
  out.push(...lines(`${k}.s`, sb, r.x + r.w / 2, y + (sb.length ? 4 : 0), { ink: 'ink' }));
  return out;
}

// ── text alternative (svg-system §6; R1 E11, L628): sentences, tables read row by row, every step; a hand-written `alt` wins ──
const WORDS = {
  vi: { alt: 'Sơ đồ bằng lời', has: 'Hình có', step: 'Bước', now: 'Lúc này', arrow: 'trỏ tới', link: 'nối với', dashed: 'nét đứt', struck: 'gạch bỏ', table: 'Bảng', mark: 'vạch ở' },
  en: { alt: 'The figure in words', has: 'The figure shows', step: 'Step', now: 'Now', arrow: 'points to', link: 'is linked to', dashed: 'dashed', struck: 'struck out', table: 'A table', mark: 'mark at' },
};
const nameOf = (n: FigNode, lang: Lang): string => [tr(n.label, lang), tr(n.sub, lang)].filter(Boolean).join(', ');
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** One node in words: a box by its label and sub, a table as "first cell, header: value" per row, bars as "label value". */
function said(n: FigNode, lang: Lang): string {
  const w = WORDS[lang];
  if (n.shape === 'grid') {
    const head = (n.head ?? []).map((c) => tr(c, lang));
    const rows = (n.cells ?? []).map((r, i) => r.map((c, j) => {
      const v = tr(c, lang);
      return !v ? '' : j && head[j] ? `${head[j]}: ${v}` : v;
    }).filter(Boolean).join(', ') + (n.strike?.includes(i) ? ` (${w.struck})` : ''));
    return `${nameOf(n, lang) || w.table}: ${rows.join('; ')}`;
  }
  if (n.shape === 'bars') return `${nameOf(n, lang)}: ${(n.items ?? []).map((i) => `${tr(i.label, lang)} ${tr(i.note, lang) || i.value}`).join('; ')}${n.mark === undefined ? '' : `; ${w.mark} ${n.mark}`}`;
  return nameOf(n, lang);
}
/** The text alternative: hand-written `alt` (variant, figure, step) where given, else generated; a stepped figure describes every step. */
export function altText(spec: FigSpec, lang: Lang, variant?: string, generated = false): string[] {
  const w = WORDS[lang];
  const v = variantOf(spec, variant);
  if (v?.alt && !generated) return [tr(v.alt, lang)];
  const ps = plans(spec, lang, variant);
  const byId = new Map(ps[0].nodes.map((n) => [n.id, n]));
  const end = (x: string): string => {
    const [id, row] = x.split('#');
    const n = byId.get(id)!;
    return row === undefined ? tr(n.label, lang) || id : `${tr(n.label, lang) || w.table} (${(n.cells?.[Number(row)] ?? []).map((c) => tr(c, lang)).filter(Boolean).join(', ')})`;
  };
  const parts = (ns: FigNode[]): string => ns.map((n) => said(n, lang)).filter(Boolean).join('; ');
  const edges = (spec.edges ?? []).map((e) => `${end(e.from)} ${e.link ? w.link : w.arrow} ${end(e.to)}${e.label ? ` (${tr(e.label, lang)})` : ''}${e.dash ? ` (${w.dashed})` : ''}`);
  const first = spec.alt && !generated ? tr(spec.alt, lang)
    : `${w.has}: ${parts(ps[0].nodes.filter((n) => ps[0].show.has(n.id)))}.${edges.length ? ` ${cap(edges.join('; '))}.` : ''}`;
  if (ps.length < 2 && (v?.step === undefined || generated)) return [first];
  const stepAlt = (i: number): string | undefined => (generated ? undefined : spec.steps?.[v?.step ?? i]?.alt && tr(spec.steps[v?.step ?? i].alt, lang));
  return [first, ...ps.map((p, i) => {
    const prev = ps[i - 1];
    const changed = p.nodes.filter((n) => p.show.has(n.id) && (!prev || !prev.show.has(n.id) || JSON.stringify(n) !== JSON.stringify(prev.nodes.find((m) => m.id === n.id))));
    const own = stepAlt(i);
    return `${ps.length > 1 ? `${w.step} ${i + 1}: ` : ''}${p.say}${own ? ` ${own}` : changed.length && i ? ` ${w.now}: ${parts(changed)}.` : ''}`;
  })];
}
// ── mounting ───────────────────────────────────────────────────────────────────────────────────────────────────
const SPECS = import.meta.glob<FigSpec>('../../../content/figures/*.yml', { import: 'default' });
const specOf = (name: string): (() => Promise<FigSpec>) | undefined => SPECS[`../../../content/figures/${name}.yml`];
export interface FigMounted { readonly index: number; destroy(): void }

/**
 * Draws figure `ref` into `host`: a spec is laid out for the host's width and laid out again when that width changes (same
 * step, no tween); a name without a spec is an old registry diagram. `engine` = the lesson's short engine id (`pg`, `mg`,
 * `dy`, `ds`, `sql`): a bare name tries `<engine>-<name>`.
 */
export async function mountFigure(host: HTMLElement, ref: FigRef, deps: Deps, engine: string, lang: Lang, step?: number): Promise<FigMounted | undefined> {
  const load = specOf(ref.name) ?? specOf(`${engine}-${ref.name}`);
  if (!load) {
    const v = await import('./engineViz');
    const real = v.resolveViz(ref.name, engine);
    if (!real) return undefined;
    host.dataset.viz = real;
    const m = (await v.vizMount(real, deps))(host, { lang, reducedMotion: false, step: step ?? ref.step });
    return { get index() { return m.index; }, destroy: () => m.destroy() };
  }
  const spec = await load();
  init(deps);
  let v: ReturnType<typeof mount> | undefined;
  let W = 0;
  const draw = (): void => {
    const pad = window.matchMedia?.('(min-width: 640px)').matches ? 16 : 8; // the frame's p-2 / max-sm:p-1
    const w = Math.round(Math.min(640, Math.max(280, host.clientWidth - pad)));
    if (v && w === W) return;
    W = w;
    const i = v?.index ?? step ?? ref.step ?? 0;
    v?.destroy();
    v = mount(host, layout(spec, lang, W, ref.variant), lang, i, { name: ref.name, caption: tr(variantOf(spec, ref.variant)?.caption ?? spec.caption, lang), alt: altText(spec, lang, ref.variant), altTitle: WORDS[lang].alt });
  };
  draw();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => draw()) : undefined;
  ro?.observe(host);
  return { get index() { return v?.index ?? 0; }, destroy: () => { ro?.disconnect(); v?.destroy(); } };
}
