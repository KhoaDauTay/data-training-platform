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
  /** box (default), key (pill), grid (cells; `label` above, `sub` below), bars (horizontal bars), note (text only),
   * table (v40: a cylinder, a stored table), doc (v40: a page with a folded corner, a file or document) */
  shape?: 'box' | 'key' | 'grid' | 'bars' | 'note' | 'table' | 'doc';
  label?: Bi; sub?: Bi; tone?: Tone; mono?: boolean;
  head?: Bi[]; cells?: Bi[][]; toneOf?: Record<string, Tone>; rowTone?: (Tone | null)[]; colTone?: (Tone | null)[]; strike?: number[];
  /** v40: one grid cell, `"<body row>:<col>"` → tone, drawn with a bold edge (the highlight; words still carry the meaning) */
  cellTone?: Record<string, Tone>;
  items?: { label: Bi; value: number; note?: Bi; tone?: Tone }[]; mark?: number;
  /** v40 R2 (E-03): a box or key that shows a crow's-foot mark before its label (a legend entry) */
  card?: Card;
}
/** v40 R2 (E-03): a crow's-foot end mark: exactly one, zero or one, one or more, zero or more. */
export type Card = 'one' | 'zero-one' | 'many' | 'zero-many';
/** `from`/`to` = a node id, or `grid#row` (v40 R2: `grid#row.col`, the line leaves that cell's facing edge) for a link; `link` =
 * a plain line (a `grid#row` link is drawn only side by side; a node-to-node link (v40) is routed like an arrow across rows,
 * without a head). v40 R2: `ends` = crow's-foot marks at the from/to ends of a node-to-node link; `near` = drawn only between
 * neighbouring rows or side by side (never on a side lane; the text alternative keeps it). */
export interface FigEdge { from: string; to: string; label?: Bi; dash?: boolean; link?: boolean; ends?: [Card | null, Card | null]; near?: boolean }
/** v40: a dashed frame around whole author rows (one level), its label in a band on top. */
export interface FigGroup { id: string; label: Bi; nodes: string[] }
type Patch = Record<string, Partial<FigNode>>;
/** `alt` (v39 R1 E11, L628): a hand-written text alternative; it wins over the generated one (figure, step or variant). */
export interface FigStep { say: Bi; show?: string[]; set?: Patch; alt?: Bi }
export interface FigSpec {
  title: Bi; caption: Bi; nodes: FigNode[]; rows: string[][]; edges?: FigEdge[]; steps?: FigStep[]; alt?: Bi; groups?: FigGroup[];
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
// v40 R2: a no-break space (U+00A0, written " " in YAML) keeps two words on one line (wrap breaks at ' ' only) and measures as a space
const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/ /g, ' ');
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
/** A grid's or bars' title and sub lines (R1 E14: one line up to NOTE_CH on a wide figure, like a note). */
const titleLines = (n: FigNode, lang: Lang, k: 'label' | 'sub', wide = false): Line[] =>
  n[k] === undefined ? [] : wrap(tr(n[k], lang), wide ? NOTE_CH : MAX_CH).map((s) => ({ s, size: k === 'label' ? LS : SS, b: k === 'label', mono: false }));
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
    const wide = room + 2 * MARGIN >= WIDE;
    const t = titleLines(n, lang, 'label', wide), sb = titleLines(n, lang, 'sub', wide);
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
  const padX = shape === 'key' ? 14 : shape === 'doc' ? 16 : 10;
  return { w: Math.ceil(Math.max(64, widest(ls) + 2 * padX + (n.card ? CARD_W : 0))), h: tall(ls) + 2 * PAD_Y + (shape === 'table' ? CAP : 0) };
}
/** v40 R2: room a legend entry's mark takes before its label. */
const CARD_W = 34;
/** v40: a cylinder's cap is an ellipse 2·5 tall (cubic halves, no arc: the checker's path sampler reads M L H V Q C Z). */
const CAP = 10;

// ── layout (svg-system §2.1–2.3, §3) ─────────────────────────────────────────────────────────────────────────────
export interface Rect { x: number; y: number; w: number; h: number }
const base = (end: string): string => end.split('#')[0];
/** an edge that names a grid row (grid#2) at either end */
const rowEnd = (e: FigEdge): boolean => e.from.includes('#') || e.to.includes('#');
/** An edge end `id`, `id#row` or (v40 R2) `id#row.col` → [id, row?, col?]. */
const cellOf = (end: string): [string, number?, number?] => {
  const [id, rc] = end.split('#');
  return [id, ...(rc?.split('.').map(Number) ?? [])] as [string, number?, number?];
};
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
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const wide = W >= WIDE;
  // every frame's version of a node gets the same box: the largest; a table's title height too, so tables in one row line up
  const dims = new Map<string, Sized>();
  const heads = new Map<string, number>();
  for (const p of ps) for (const n of p.nodes) {
    const s = size(n, lang, W - 2 * MARGIN);
    const o = dims.get(n.id);
    dims.set(n.id, o ? { w: Math.max(o.w, s.w), h: Math.max(o.h, s.h) } : s);
    if (n.shape === 'grid' || n.shape === 'bars') {
      const t = titleLines(n, lang, 'label', wide);
      heads.set(n.id, Math.max(heads.get(n.id) ?? 0, tall(t) + (t.length ? 4 : 0)));
    }
  }
  const edges = spec.edges ?? [];
  const gridLink = (e: FigEdge): boolean => !!e.link && rowEnd(e);
  // v40 (L634): a side lane (16 units at the right) for every edge between rows that are not neighbours; reserving them can
  // change the wrapping, so lay out again until the count is stable
  let reserve = 0;
  let pl = placeRows(spec, lang, W, new Map(dims), reserve, heads);
  for (let i = 0; i < 3; i++) {
    const need = edges.filter((e) => !gridLink(e) && !e.near && Math.abs(pl.rowOf.get(base(e.from))! - pl.rowOf.get(base(e.to))!) > 1).length;
    if (need <= reserve) break;
    reserve = need;
    pl = placeRows(spec, lang, W, new Map(dims), reserve, heads);
  }
  const { vrows, rowOf, at, bands, H, CW } = pl;

  // routes: decided once from the geometry (the same for every frame)
  const lanes = new Map<number, number>();
  const laneY = (gap: number, k: number): number => Math.round((bands[gap][1] + bands[gap + 1][0]) / 2) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8;
  const nextLane = (gap: number): number => {
    const k = lanes.get(gap) ?? 0;
    lanes.set(gap, k + 1);
    return laneY(gap, k);
  };
  // R1 E10: ≥ 2 arrows entering one side of a box from another row never land side by side: straight ones spread over it
  // (⅓ ⅔ …, sorted by where they come from) when each lands above its own source, else they join one bus with one arrowhead.
  // v40: arrows on a side lane share the spread (they can land anywhere on the box), never the bus.
  const far = (e: FigEdge): boolean => Math.abs(rowOf.get(base(e.from))! - rowOf.get(base(e.to))!) > 1;
  const dropped = (e: FigEdge): boolean => !!e.near && far(e); // v40 R2: a `near` edge is not drawn on a side lane
  /** v40 R2 (E-01): an arrow leaves a node whose text sits on its edge (a table's sub or title) 8 units clear of it */
  const out = (id: string): number => (['grid', 'bars'].includes(byId.get(base(id))?.shape ?? '') ? 8 : 2);
  const side = (e: FigEdge): string | undefined => {
    const ra = rowOf.get(base(e.from))!, rb = rowOf.get(base(e.to))!;
    return e.link || ra === rb || dropped(e) ? undefined : `${base(e.to)}|${rb > ra}`;
  };
  const cx = (e: FigEdge): number => { const a = at.get(base(e.from))!; return a.x + a.w / 2; };
  const spread = (e: FigEdge, g: FigEdge[]): number => { const b = at.get(base(e.to))!; return Math.round(b.x + (b.w * (g.indexOf(e) + 1)) / (g.length + 1)); };
  const fits = (e: FigEdge, x: number): boolean => { const a = at.get(base(e.from))!; return x >= a.x + 12 && x <= a.x + a.w - 12; };
  /** undefined = alone on its side; a number = its landing x; 'bus' = it joins the bus */
  const land = (e: FigEdge): number | 'bus' | undefined => {
    const g = edges.filter((f) => side(f) !== undefined && side(f) === side(e)).sort((p, q) => cx(p) - cx(q));
    if (g.length < 2) return undefined;
    return far(e) || g.every((f) => far(f) || fits(f, spread(f, g))) ? spread(e, g) : 'bus';
  };
  /** v40 R2 (E-08): ≥ 2 arrows leaving one side of a box toward neighbouring rows leave it at ⅓, ⅔ … (sorted by where they go),
   * so an elbow's first leg never runs beside a straight arrow and through its label; undefined = alone (it leaves the middle). */
  const leave = (e: FigEdge): number | undefined => {
    const dir = (f: FigEdge): number => Math.sign(rowOf.get(base(f.to))! - rowOf.get(base(f.from))!);
    const g = edges.filter((f) => !f.link && !far(f) && base(f.from) === base(e.from) && dir(f) && dir(f) === dir(e)).sort((p, q) => at.get(base(p.to))!.x - at.get(base(q.to))!.x);
    const a = at.get(base(e.from))!;
    return g.length < 2 ? undefined : Math.round(a.x + (a.w * (g.indexOf(e) + 1)) / (g.length + 1));
  };
  let laneNo = 0;
  const routes = edges.map((e) => {
    const a = at.get(base(e.from)) ?? fail(`edge: không có node "${e.from}"`);
    const b = at.get(base(e.to)) ?? fail(`edge: không có node "${e.to}"`);
    const ra = rowOf.get(base(e.from))!, rb = rowOf.get(base(e.to))!;
    const label = tr(e.label, lang);
    const plain = !!e.link; // a link has no head and ends on the box edge
    if (dropped(e)) return undefined;
    if (e.link && (gridLink(e) || ra === rb)) {
      if (ra !== rb) return undefined; // a table-row link stacked on a phone: the text alternative keeps it
      const [l, r] = a.x < b.x ? [e.from, e.to] : [e.to, e.from];
      const L = at.get(base(l))!, R = at.get(base(r))!;
      const y1 = anchorY(l, L, e), y2 = anchorY(r, R, e), x1 = anchorX(l, L, true), x2 = anchorX(r, R, false);
      return { e, rev: l !== e.from, d: `M${x1} ${y1} L${x2} ${y2}`, lab: label && y1 === y2 ? { x: (x1 + x2) / 2, y: y1 - 6 - lineH(SS) / 2, a: 'm' as const, s: label } : undefined };
    }
    if (ra === rb && rowEnd(e)) return label ? fail(`${e.from}: dòng bảng, không nhãn`) : rowArrow(e, a, b);
    if (ra === rb) {
      if (Math.abs(vrows[ra].indexOf(base(e.from)) - vrows[ra].indexOf(base(e.to))) !== 1) fail(`${e.from}→${e.to}: cùng hàng nhưng không cạnh nhau`);
      const cy = Math.round((Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2);
      const right = a.x < b.x;
      const x1 = right ? a.x + a.w + 2 : a.x - 2;
      const [x2] = stopAt(x1, cy, b.x + b.w / 2, cy, STROKE, b); // the core's rule (L620): the tip stays 3 units outside b
      return { e, d: `M${x1} ${cy} L${x2} ${cy}`, lab: label ? { x: (x1 + x2) / 2, y: cy - 6 - lineH(SS) / 2, a: 'm' as const, s: label } : undefined };
    }
    const down = rb > ra;
    const y1 = plain ? (down ? a.y + a.h : a.y) : down ? a.y + a.h + out(e.from) : a.y - out(e.from);
    const end = (x: number, from: number): number => (plain ? (down ? b.y : b.y + b.h) : stopAt(x, from, x, b.y + b.h / 2, STROKE, b)[1]);
    const L = land(e);
    if (far(e)) {
      if (label) fail(`${e.from}→${e.to}: nhãn trên làn bên chưa hỗ trợ`);
      return { e, d: laneRoute(a, y1, b, ra, rb, CW + 8 + 16 * laneNo++, nextLane, end, typeof L === 'number' ? L : undefined) };
    }
    const lo = Math.max(a.x, b.x), hi = Math.min(a.x + a.w, b.x + b.w);
    const D = leave(e);
    const straight = L === undefined ? hi - lo >= 24 : L !== 'bus' && fits(e, L);
    if (straight) {
      const x = typeof L === 'number' ? L : D === undefined ? Math.round((lo + hi) / 2) : Math.min(hi - 12, Math.max(lo + 12, D));
      const ye = end(x, y1);
      return { e, d: `M${x} ${y1} L${x} ${ye}`, lab: label ? { x: x + 6, y: (y1 + ye) / 2, a: undefined, s: label } : undefined };
    }
    const gap = Math.min(ra, rb);
    const k = L === 'bus' ? 0 : lanes.get(gap) ?? 0; // a bus shares the gap's middle lane and its one arrowhead
    lanes.set(gap, L === 'bus' ? Math.max(1, lanes.get(gap) ?? 0) : k + 1); // ponytail: a lone elbow placed before a bus in the same gap may share its lane
    const ym = laneY(gap, k);
    // a lone elbow lands on the part of b nearest the source (or its spread place); a bus lands in b's middle
    const ax = D ?? Math.round(a.x + a.w / 2);
    const bx = L === 'bus' ? Math.round(b.x + b.w / 2) : typeof L === 'number' ? L : Math.round(Math.min(b.x + b.w - 12, Math.max(b.x + 12, ax)));
    if (label && L === 'bus') fail(`${e.from}→${e.to}: nhãn trên đường bus chưa hỗ trợ`);
    return { e, d: `M${ax} ${y1} L${ax} ${ym} L${bx} ${ym} L${bx} ${end(bx, ym)}`, lab: label ? elbowLabel(label, ax, bx, ym, e) : undefined };
  });
  /** v41 (R2 lesson 2, L651): an arrow naming a grid row (`page#2`) leaves from that row's cells when the nodes sit side by
   * side, straight or with one step in the gap (no label: the row and the target name it); stacked, it is routed from the node like any arrow. */
  function rowArrow(e: FigEdge, a: Rect, b: Rect) {
    const s = a.x < b.x ? 1 : -1;
    /** the x where a node's cells end on the side facing (out = 1) or away from (out = -1) the other node */
    const edge = (end: string, r: Rect, out: number): number => {
      const n = byId.get(base(end))!, gw = n.shape === 'grid' ? gridCols(n, lang).reduce((p, q) => p + q, 0) : r.w;
      return r.x + Math.round((r.w - gw) / 2) + (out * s > 0 ? gw : 0);
    };
    const y1 = anchorY(e.from, a, e), yb = e.to.includes('#') ? anchorY(e.to, b, e) : Math.min(b.y + b.h - 8, Math.max(b.y + 8, y1));
    const x1 = edge(e.from, a, 1) + 2 * s, tx = edge(e.to, b, -1), xm = Math.round((x1 + tx) / 2);
    // the tip (end + 0.75·w) stays 3 short of the cells, as stopAt() does
    return { e, d: `M${x1} ${y1} L${xm} ${y1} L${xm} ${yb} L${tx - (3 + 0.75 * STROKE) * s} ${yb}`, lab: undefined };
  }
  /** A link end's y: a grid row's middle (`grid#2`), else the node's middle; v40 R2 (E-02): links sharing one row end spread 8 apart. */
  function anchorY(end: string, r: Rect, e: FigEdge): number {
    const [id, row] = cellOf(end);
    if (row === undefined) return Math.round(r.y + r.h / 2);
    const n = byId.get(id)!;
    const share = edges.filter((f) => f.from === end || f.to === end);
    return Math.round(r.y + tall(titleLines(n, lang, 'label', wide)) + (n.label === undefined ? 0 : 4) + ((n.head ? 1 : 0) + row + 0.5) * ROW_H + (share.indexOf(e) - (share.length - 1) / 2) * 8);
  }
  /** v40 R2 (E-02): a link end's x: the node's facing edge, or for `grid#row.col` the facing edge of that cell, which must be the
   * table's outer column on that side (a line from an inner cell would cross its neighbours). */
  function anchorX(end: string, r: Rect, right: boolean): number {
    const [id, , col] = cellOf(end);
    if (col === undefined) return r.x + (right ? r.w : 0);
    const cols = gridCols(byId.get(id)!, lang);
    const sum = cols.reduce((a, b) => a + b, 0);
    if (col !== (right ? cols.length - 1 : 0)) fail(`${end}: ô không ở mép`);
    return r.x + Math.round((r.w - sum) / 2) + (right ? sum : 0);
  }

  /** data-from/data-to name a box the checker can find: a box, key, table or doc end (a grid or bars end has no single rect, the checker finds its nearest cell). */
  const boxy = (end: string): boolean => ['box', 'key', 'table', 'doc'].includes(byId.get(base(end))?.shape ?? 'box');
  const ends = (e: FigEdge): Record<string, string> => ({ ...(boxy(e.from) ? { 'data-from': `n:${base(e.from)}` } : {}), ...(boxy(e.to) ? { 'data-to': `n:${base(e.to)}` } : {}) });
  const parentOf = groupOf(spec);
  const groupBg = groupShapes(spec, lang, at, CW, routes.flatMap((r) => (r ? [r.d] : [])));
  const frames: Frame[] = ps.map((p) => {
    const shapes: Shape[] = [...groupBg]; // under everything: frame order is paint order
    routes.forEach((r, i) => {
      if (!r || !p.show.has(base(r.e.from)) || !p.show.has(base(r.e.to))) return;
      const k = `e:${i}`;
      shapes.push(r.e.link
        ? { k, t: 'p', d: r.d, ink: r.e.ends ? 'edge' : 'new', w: STROKE, dash: r.e.dash }
        : { k, t: 'p', d: r.d, ink: 'edge', w: STROKE, arrow: true, dash: r.e.dash, attrs: ends(r.e) });
      if (r.e.ends) shapes.push(...crowEnds(k, r.d, r.e.ends, !!r.rev));
      if (r.lab) shapes.push({ k: `${k}.l`, t: 't', x: r.lab.x, y: r.lab.y, s: r.lab.s, size: SS, a: r.lab.a, ink: 'muted' });
    });
    for (const n of p.nodes) if (p.show.has(n.id)) shapes.push(...draw(n, at.get(n.id)!, lang, wide, parentOf.get(n.id)));
    return { say: p.say, nodes: shapes };
  });
  return { title: tr(variantOf(spec, variant)?.title ?? spec.title, lang), w: W, h: H, frames, maxW: 640 };
}

// ── v40 layout pieces (L632–L637): rows and groups, side lanes, elbow labels ───────────────────────────────────────
const GPAD = 10, GBAND = 20, GAP_ELBOW = 64;
/** Node id → its group's key (`g:<id>`); a group must hold whole author rows, consecutive. */
function groupOf(spec: FigSpec): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of spec.groups ?? []) {
    const rs = spec.rows.map((r, i) => [r, i] as const).filter(([r]) => r.some((id) => g.nodes.includes(id)));
    if (rs.some(([r]) => !r.every((id) => g.nodes.includes(id))) || rs.flatMap(([r]) => r).length !== g.nodes.length
      || rs.some(([, i], j) => j > 0 && i !== rs[j - 1][1] + 1)) fail(`nhóm ${g.id}: phải gồm trọn các hàng liền nhau`);
    for (const id of g.nodes) m.set(id, `g:${g.id}`);
  }
  return m;
}
/**
 * Wraps the author rows into rows that fit and places them (v39: `align` columns, linked neighbours widen toward linkGap, a
 * row of tables is top-aligned and, v40, lines up their first rows; notes as headings), leaving room for group bands and
 * `reserve` side lanes at the right (CW = where boxes must end). `dims` is a copy: `align` stretches boxes in it.
 */
function placeRows(spec: FigSpec, lang: Lang, W: number, dims: Map<string, Sized>, reserve: number, heads: Map<string, number>) {
  const CW = W - MARGIN - 16 * reserve;
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const edges = spec.edges ?? [];
  const parentOf = groupOf(spec);
  const roomOf = (id: string): number => CW - MARGIN - (parentOf.has(id) ? 2 * GPAD : 0);
  const between = (a: string, b: string): FigEdge | undefined => edges.find((e) => (base(e.from) === a && base(e.to) === b) || (base(e.from) === b && base(e.to) === a));
  const gapOf = (a: string, b: string): number => {
    const e = between(a, b);
    return !e ? GAP_X : e.link ? Math.max(32, (e.label ? Math.ceil(textWidth(tr(e.label, lang), SS)) + 12 : 0) + (e.ends ? 2 * CROW : 0)) : Math.max(rowEnd(e) ? 40 : 24, e.label ? Math.ceil(textWidth(tr(e.label, lang), SS)) + 12 : 0); // v41: a row arrow may step in the gap
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
      const fits = cols.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0) <= roomOf(run[0][0]);
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
    const room = roomOf(row[0]);
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
  const near = (e: FigEdge): boolean => Math.abs(rowOf.get(base(e.from))! - rowOf.get(base(e.to))!) === 1;
  // a labelled edge between neighbouring rows widens its gap (v40: 64, room for a label beside a straight arrow or above an elbow)
  const labelled = new Set(edges.filter((e) => (e.label || e.ends) && near(e)).map((e) => Math.min(rowOf.get(base(e.from))!, rowOf.get(base(e.to))!)));
  const isNote = (id: string): boolean => byId.get(id)?.shape === 'note';
  const linked = (i: number): boolean => edges.some((e) => Math.min(rowOf.get(base(e.from))!, rowOf.get(base(e.to))!) === i && near(e));
  const group = (i: number): string | undefined => parentOf.get(vrows[i]?.[0]);
  const at = new Map<string, Rect>();
  let y = MARGIN;
  const bands: [number, number][] = [];
  vrows.forEach((r, i) => {
    if (group(i) && group(i) !== group(i - 1)) y += GBAND + GPAD;
    // R1 E3: a row of tables starts every table at the same top; v40: a shorter title is pushed down so the first rows line up
    const top = r.every((id) => ['grid', 'bars'].includes(byId.get(id)?.shape ?? 'box'));
    const lift = Math.max(0, ...r.map((id) => heads.get(id) ?? 0));
    const off = (id: string): number => (top ? lift - (heads.get(id) ?? 0) : 0);
    const hh = Math.max(...r.map((id) => dims.get(id)!.h + off(id)));
    const room = roomOf(r[0]);
    const sl = vslot[i];
    const xs: number[] = [];
    if (sl) {
      let x = Math.round((CW + MARGIN - sl.cols.reduce((a, b) => a + b, 0) - sl.gaps.reduce((a, b) => a + b, 0)) / 2);
      // a node narrower than its column hugs the gap toward its neighbours (first column right, last left), so arrows stay short
      r.forEach((id, c) => { const rm = sl.cols[c] - dims.get(id)!.w; xs.push(x + (c === 0 ? rm : c === r.length - 1 ? 0 : Math.round(rm / 2))); x += sl.cols[c] + (sl.gaps[c] ?? 0); });
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
      let x = Math.round((CW + MARGIN - r.reduce((a, id, j) => a + dims.get(id)!.w + g[j], 0)) / 2);
      r.forEach((id, j) => { x += g[j]; xs.push(x); x += dims.get(id)!.w; });
    }
    r.forEach((id, j) => {
      const d = dims.get(id)!;
      at.set(id, { x: xs[j], y: top ? y + off(id) : y + Math.round((hh - d.h) / 2), w: d.w, h: d.h });
    });
    bands.push([y, y + hh]);
    y += hh;
    if (group(i) && group(i) !== group(i + 1)) y += GPAD;
    // R1 E14: a row of notes is a heading for the row below: GAP_NOTE when no edge crosses the gap
    if (i < vrows.length - 1) y += labelled.has(i) ? GAP_ELBOW : r.every(isNote) && !linked(i) && !group(i) && !group(i + 1) ? GAP_NOTE : GAP_Y;
  });
  return { vrows, rowOf, at, bands, H: y + MARGIN, CW };
}
/** The dashed group frames and their labels, keys `g:<id>` (the checker's parent of every member box). */
function groupShapes(spec: FigSpec, lang: Lang, at: Map<string, Rect>, CW: number, paths: string[]): Shape[] {
  return (spec.groups ?? []).flatMap((g) => {
    const rs = g.nodes.map((id) => at.get(id)!);
    const y0 = Math.min(...rs.map((r) => r.y)), y1 = Math.max(...rs.map((r) => r.y + r.h));
    const [s, more] = wrap(tr(g.label, lang));
    if (more !== undefined) fail(`nhóm ${g.id}: nhãn > 18 ký tự`);
    const k = `g:${g.id}`;
    const top = y0 - GBAND - GPAD;
    // the label sits in the band, as far left as no arrow crossing the band allows
    const w = textWidth(s, SS, true);
    const xs = paths.flatMap((d) => vertXs(d, top, top + GBAND));
    const free = (x0: number): boolean => xs.every((x) => x < x0 - 6 || x > x0 + w + 6);
    let lx = MARGIN + 10;
    while (!free(lx)) if ((lx += 4) > CW - 10 - w) fail(`nhóm ${g.id}: mũi tên chắn mọi chỗ đặt nhãn`);
    return [{ k, t: 'r', x: MARGIN, y: top, w: CW - MARGIN, h: y1 + GPAD - top, tone: 'ghost', rx: 12 } as Shape,
      { k: `${k}.t`, t: 't', x: lx, y: top + GBAND / 2 + 2, s, size: SS, b: true, ink: 'muted', attrs: { 'data-owner': k } } as Shape];
  });
}
/** The x of every vertical segment of an absolute M/L path that crosses the band [y0, y1]. */
function vertXs(d: string, y0: number, y1: number): number[] {
  const p = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const out: number[] = [];
  for (let i = 2; i + 1 < p.length; i += 2) if (p[i] === p[i - 2] && Math.max(p[i + 1], p[i - 1]) > y0 && Math.min(p[i + 1], p[i - 1]) < y1) out.push(p[i]);
  return out;
}
/** A side lane: out into the gap next to the source row, across to the lane at the right, along it, then back through the
 * gap next to the target row and into the target (never across a row's neighbours). */
function laneRoute(a: Rect, y1: number, b: Rect, ra: number, rb: number, lx: number, lane: (gap: number) => number, end: (x: number, from: number) => number, land?: number): string {
  const down = rb > ra;
  const ax = Math.round(a.x + a.w / 2), bx = land ?? Math.round(b.x + b.w / 2);
  const ys = lane(down ? ra : ra - 1), yt = lane(down ? rb - 1 : rb);
  return `M${ax} ${y1} L${ax} ${ys} L${lx} ${ys} L${lx} ${yt} L${bx} ${yt} L${bx} ${end(bx, yt)}`;
}
/** An elbow's label sits above its run, between the two legs; a run too short for it is a content error. */
function elbowLabel(s: string, ax: number, bx: number, ym: number, e: FigEdge): { x: number; y: number; a: 'm'; s: string } {
  if (Math.abs(bx - ax) < textWidth(s, SS) + 16) fail(`${e.from}→${e.to}: đoạn ngang quá ngắn cho nhãn "${s}"`);
  return { x: (ax + bx) / 2, y: ym - 6 - lineH(SS) / 2, a: 'm', s };
}

// ── v40 R2 (E-03): crow's-foot marks, drawn at a link's ends along its last segment (so they turn with a stacked link) ──
/** The marks of a link with `ends` (from, to): the path's first and last points with their neighbours; `rev` = the path starts at `to`. */
function crowEnds(k: string, d: string, ends: [Card | null, Card | null], rev: boolean): Shape[] {
  const p = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number), n = p.length;
  return [[p[0], p[1], p[2], p[3]], [p[n - 2], p[n - 1], p[n - 4], p[n - 3]]].flatMap(([x, y, px, py], i) => {
    const c = ends[rev ? 1 - i : i];
    return c ? crowMark(`${k}.m${i}`, x, y, px, py, c) : [];
  });
}
/** One end mark at (x, y), the box edge, the line coming from (px, py): the outer mark (bar = 1, foot = many) touches the box, the
 * inner one (bar = at least 1, circle = may be 0) sits further out; the circle is hollow and painted over the line. */
function crowMark(k: string, x: number, y: number, px: number, py: number, c: Card): Shape[] {
  // ponytail: assumes the end segment is level or upright (true for cross-row links and same-row links between equal-height
  // boxes, as in ds-cardinality); a same-row link between boxes of different heights is diagonal: normalise with hypot then
  const ux = Math.sign(x - px), uy = Math.sign(y - py);
  const pt = (t: number, s: number): string => `${x - ux * t - uy * s} ${y - uy * t + ux * s}`; // links run at right angles: ux, uy are 0 or ±1
  const bar = (t: number): string => `M${pt(t, -5)} L${pt(t, 5)}`;
  const many = c.endsWith('many'), zero = c.startsWith('zero');
  // a stem first (on a link it lies on the line; a legend entry has no other line)
  const d = `M${pt(0, 0)} L${pt(28, 0)} ` + (many ? `M${pt(10, 0)} L${pt(0, -5)} M${pt(10, 0)} L${pt(0, 5)}` : bar(6)) + (zero ? '' : ` ${bar(many ? 14 : 12)}`);
  const o = many ? 18 : 16;
  return [{ k, t: 'p', d, ink: 'edge', w: STROKE }, ...(zero ? [{ k: `${k}.o`, t: 'c', x: x - ux * o, y: y - uy * o, r: 3.5, tone: 'plain' } as Shape] : [])];
}
/** Room a mark takes along the line (the zero-or-more circle reaches 21.5 from the box). */
const CROW = 24;

/** v40: a cylinder (`table`) or a folded page (`doc`): one filled path (the box, key `n:<id>`), one open path (the cap's
 * front edge or the fold), then the text, kept clear of both. */
function pageShapes(n: FigNode, r: Rect, lang: Lang, attrs?: Record<string, string>): Shape[] {
  const k = `n:${n.id}`;
  const { x, y, w, h } = r;
  const tone = n.tone ?? 'cell';
  const q = (CAP / 2) * (4 / 3); // a cubic through the ellipse's far point
  const [body, edge] = n.shape === 'table'
    ? [`M${x} ${y + CAP / 2} C${x} ${y + CAP / 2 - q} ${x + w} ${y + CAP / 2 - q} ${x + w} ${y + CAP / 2} L${x + w} ${y + h - CAP / 2} C${x + w} ${y + h - CAP / 2 + q} ${x} ${y + h - CAP / 2 + q} ${x} ${y + h - CAP / 2} Z`,
      `M${x} ${y + CAP / 2} C${x} ${y + CAP / 2 + q} ${x + w} ${y + CAP / 2 + q} ${x + w} ${y + CAP / 2}`]
    : [`M${x} ${y} L${x + w - CAP} ${y} L${x + w} ${y + CAP} L${x + w} ${y + h} L${x} ${y + h} Z`, `M${x + w - CAP} ${y} L${x + w - CAP} ${y + CAP} L${x + w} ${y + CAP}`];
  const top = n.shape === 'table' ? CAP : 0, ls = boxLines(n, lang);
  return [{ k, t: 'p', d: body, tone, ink: 'edge', w: 1.2, attrs }, { k: `${k}.e`, t: 'p', d: edge, ink: 'edge', w: 1.2 },
    ...lines(`${k}.t`, ls, x + w / 2, mid(y + top, h - top, ls), { ink: tone === 'ghost' ? 'muted' : 'ink' }, k)];
}
/** v40 R2 (E-13): the top of a box's text block, centred in its height (a box is as tall as its tallest frame). */
const mid = (y: number, h: number, ls: Line[]): number => y + (h - tall(ls)) / 2;

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
function draw(n: FigNode, r: Rect, lang: Lang, wide = false, parent?: string): Shape[] {
  const k = `n:${n.id}`;
  const shape = n.shape ?? 'box';
  const ink = n.tone === 'ghost' ? 'muted' : 'ink';
  const attrs = parent ? { 'data-parent': parent } : undefined;
  if (shape === 'box' || shape === 'key') {
    const ls = boxLines(n, lang);
    const cy = r.y + r.h / 2;
    return [{ k, t: 'r', x: r.x, y: r.y, w: r.w, h: r.h, tone: n.tone ?? 'cell', rx: shape === 'key' ? r.h / 2 : 8, attrs },
      // v40 R2 (E-03): a legend entry: its mark at the right of a short stem, as if the entity stood there
      ...(n.card ? crowMark(`${k}.m`, r.x + CARD_W + 6, cy, r.x, cy, n.card) : []),
      ...lines(`${k}.t`, ls, r.x + (r.w + (n.card ? CARD_W : 0)) / 2, mid(r.y, r.h, ls), { ink }, k)];
  }
  if (shape === 'table' || shape === 'doc') return pageShapes(n, r, lang, attrs);
  if (shape === 'note') return lines(`${k}.t`, boxLines(n, lang, wide), r.x + r.w / 2, r.y, { ink: 'ink' });
  const out: Shape[] = [];
  const t = titleLines(n, lang, 'label', wide), sb = titleLines(n, lang, 'sub', wide);
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
        const hl = head ? undefined : n.cellTone?.[`${body}:${c}`];
        const tone: Tone = head ? 'cell' : hl ?? n.toneOf?.[s] ?? n.rowTone?.[body] ?? n.colTone?.[c] ?? n.tone ?? 'plain';
        if (s) {
          out.push({ k: ck, t: 'r', x, y, w: cols[c], h: ROW_H, tone, rx: 0, bold: !!hl, attrs }, // v40 R2: a grid in a group names it too
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
  vi: { alt: 'Sơ đồ bằng lời', has: 'Hình có', now: 'Lúc này', arrow: 'trỏ tới', link: 'nối với', dashed: 'nét đứt', struck: 'gạch bỏ', table: 'Bảng', mark: 'vạch ở' },
  en: { alt: 'The figure in words', has: 'The figure shows', now: 'Now', arrow: 'points to', link: 'is linked to', dashed: 'dashed', struck: 'struck out', table: 'A table', mark: 'mark at' },
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
    const [id, row] = cellOf(x);
    const n = byId.get(id)!;
    return row === undefined ? tr(n.label, lang) || id : `${tr(n.label, lang) || w.table} (${(n.cells?.[row] ?? []).map((c) => tr(c, lang)).filter(Boolean).join(', ')})`;
  };
  const parts = (ns: FigNode[]): string => ns.map((n) => said(n, lang)).filter(Boolean).join('; ');
  const edges = (spec.edges ?? []).map((e) => `${end(e.from)} ${e.link ? w.link : w.arrow} ${end(e.to)}${e.label ? ` (${tr(e.label, lang)})` : ''}${e.dash ? ` (${w.dashed})` : ''}`);
  // the spec's own alt describes the plain figure (step 1); a variant that draws another step alone is generated
  const first = spec.alt && !generated && v?.step === undefined ? tr(spec.alt, lang)
    : `${w.has}: ${parts(ps[0].nodes.filter((n) => ps[0].show.has(n.id)))}.${edges.length ? ` ${cap(edges.join('; '))}.` : ''}`;
  if (ps.length < 2) return [first];
  // v40 R2 (E-16): [the figure, then one entry per step]; the core shows the steps as its numbered list, each step read once:
  // its own alt, else its sentence plus what changed
  return [first, ...ps.map((p, j) => {
    const own = !generated && spec.steps?.[j]?.alt;
    if (own) return tr(own, lang);
    const prev = ps[j - 1];
    const changed = prev ? p.nodes.filter((n) => p.show.has(n.id) && (!prev.show.has(n.id) || JSON.stringify(n) !== JSON.stringify(prev.nodes.find((m) => m.id === n.id)))) : [];
    return changed.length ? `${p.say} ${w.now}: ${parts(changed)}.` : p.say;
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
    const a = altText(spec, lang, ref.variant);
    v = mount(host, layout(spec, lang, W, ref.variant), lang, i, { name: ref.name, caption: tr(variantOf(spec, ref.variant)?.caption ?? spec.caption, lang), alt: a.slice(0, 1), steps: a.slice(1), altTitle: WORDS[lang].alt });
  };
  draw();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => draw()) : undefined;
  ro?.observe(host);
  return { get index() { return v?.index ?? 0; }, destroy: () => { ro?.disconnect(); v?.destroy(); } };
}
