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
}
/** `from`/`to` = a node id, or `grid#row` for a link; `link` = a plain line between neighbours (a `grid#row` link is drawn
 * only side by side; a node-to-node link (v40) is routed like an arrow, without a head). */
export interface FigEdge { from: string; to: string; label?: Bi; dash?: boolean; link?: boolean }
/** v40: a dashed frame around whole author rows (one level), its label in a band on top. */
export interface FigGroup { id: string; label: Bi; nodes: string[] }
type Patch = Record<string, Partial<FigNode>>;
export interface FigStep { say: Bi; show?: string[]; set?: Patch }
export interface FigSpec {
  title: Bi; caption: Bi; nodes: FigNode[]; rows: string[][]; edges?: FigEdge[]; steps?: FigStep[]; groups?: FigGroup[];
  /** v40 (R1 E11): the text alternative written by hand; without it one is generated from the nodes and arrows */
  alt?: Bi;
  /** P5: `set`/`show` change the static figure; `step: i` draws step i alone, static; v40 (R1 E8): own title, caption, alt */
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
/** ≤ 18 characters a line, ≤ 2 lines, broken at the most balanced space; anything longer is a content error (never "…"). */
export function wrap(s: string): string[] {
  if ([...s].length <= MAX_CH) return [s];
  let best: string[] | undefined;
  for (let i = s.indexOf(' '); i > 0; i = s.indexOf(' ', i + 1)) {
    const a = s.slice(0, i), b = s.slice(i + 1);
    if ([...a].length <= MAX_CH && [...b].length <= MAX_CH && (!best || Math.abs(a.length - b.length) < Math.abs(best[0].length - best[1].length))) best = [a, b];
  }
  return best ?? fail(`"${s}": > 18 ký tự một dòng hoặc > 2 dòng`);
}

// ── grammar (svg-system §2) ──────────────────────────────────────────────────────────────────────────────────────
const LS = 14, SS = 13, PAD_Y = 6, CELL_X = 6, ROW_H = 24, BAR_H = 22;
export const GAP_X = 16, GAP_Y = 36, GAP_LABEL = 52, MARGIN = 8, STROKE = 1.5;
type Line = { s: string; size: number; b: boolean; mono: boolean };
interface Sized { w: number; h: number }

/** One node's text lines (label lines bold 14, or 13 mono; sub lines 13), at most two in all. */
function boxLines(n: FigNode, lang: Lang): Line[] {
  const lab = wrap(tr(n.label, lang)).filter(Boolean).map((s): Line => ({ s, size: n.mono ? SS : LS, b: !n.mono, mono: !!n.mono }));
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
  const ls = boxLines(n, lang);
  if (shape === 'note') return { w: Math.ceil(widest(ls)), h: tall(ls) };
  const padX = shape === 'key' ? 14 : shape === 'doc' ? 16 : 10;
  return { w: Math.ceil(Math.max(64, widest(ls) + 2 * padX)), h: tall(ls) + 2 * PAD_Y + (shape === 'table' ? CAP : 0) };
}
/** v40: a cylinder's cap is an ellipse 2·5 tall (cubic halves, no arc: the checker's path sampler reads M L H V Q C Z). */
const CAP = 10;

// ── layout (svg-system §2.1–2.3, §3) ─────────────────────────────────────────────────────────────────────────────
export interface Rect { x: number; y: number; w: number; h: number }
const base = (end: string): string => end.split('#')[0];
const merge = (nodes: FigNode[], set?: Patch): FigNode[] => nodes.map((n) => (set?.[n.id] ? { ...n, ...set[n.id] } : n));
interface Plan { say: string; show: Set<string>; nodes: FigNode[] }

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
  // every frame's version of a node gets the same box: the largest
  const dims = new Map<string, Sized>();
  for (const p of ps) for (const n of p.nodes) {
    const s = size(n, lang, W - 2 * MARGIN);
    const o = dims.get(n.id);
    dims.set(n.id, o ? { w: Math.max(o.w, s.w), h: Math.max(o.h, s.h) } : s);
  }
  const edges = spec.edges ?? [];
  const gridLink = (e: FigEdge): boolean => !!e.link && (e.from.includes('#') || e.to.includes('#'));
  // v40: a side lane (16 units at the right) for every edge between rows that are not neighbours; reserving them can
  // change the wrapping, so lay out again until the count is stable
  let reserve = 0;
  let pl = placeRows(spec, lang, W, dims, reserve);
  for (let i = 0; i < 3; i++) {
    const need = edges.filter((e) => !gridLink(e) && Math.abs(pl.rowOf.get(base(e.from))! - pl.rowOf.get(base(e.to))!) > 1).length;
    if (need <= reserve) break;
    reserve = need;
    pl = placeRows(spec, lang, W, dims, reserve);
  }
  const { vrows, rowOf, at, bands, H, CW } = pl;

  // routes: decided once from the geometry (the same for every frame)
  const lanes = new Map<number, number>();
  let side = 0;
  const lane = (gap: number): number => {
    const k = lanes.get(gap) ?? 0;
    lanes.set(gap, k + 1);
    return Math.round((bands[gap][1] + bands[gap + 1][0]) / 2) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 8;
  };
  const lands = spreadTips(edges, at, rowOf);
  const routes = edges.map((e) => {
    const a = at.get(base(e.from)) ?? fail(`edge: không có node "${e.from}"`);
    const b = at.get(base(e.to)) ?? fail(`edge: không có node "${e.to}"`);
    const ra = rowOf.get(base(e.from))!, rb = rowOf.get(base(e.to))!;
    const label = tr(e.label, lang);
    const plain = !!e.link; // a link has no head and ends on the box edge
    if (gridLink(e)) {
      if (ra !== rb) return undefined; // stacked on a phone: the text alternative keeps it
      const [l, r] = a.x < b.x ? [e.from, e.to] : [e.to, e.from];
      const L = at.get(base(l))!, R = at.get(base(r))!;
      return { e, d: `M${L.x + L.w} ${anchorY(l, L)} L${R.x} ${anchorY(r, R)}` };
    }
    if (ra === rb) {
      if (Math.abs(vrows[ra].indexOf(base(e.from)) - vrows[ra].indexOf(base(e.to))) !== 1) fail(`${e.from}→${e.to}: cùng hàng nhưng không cạnh nhau`);
      const cy = Math.round((Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2);
      const right = a.x < b.x;
      const x1 = plain ? (right ? a.x + a.w : a.x) : right ? a.x + a.w + 2 : a.x - 2;
      const x2 = plain ? (right ? b.x : b.x + b.w) : stopAt(x1, cy, b.x + b.w / 2, cy, STROKE, b)[0]; // the core's rule (L620): the tip stays 3 units outside b
      return { e, d: `M${x1} ${cy} L${x2} ${cy}`, lab: label ? { x: (x1 + x2) / 2, y: cy - 6 - lineH(SS) / 2, a: 'm' as const, s: label } : undefined };
    }
    const down = rb > ra;
    const y1 = plain ? (down ? a.y + a.h : a.y) : down ? a.y + a.h + 2 : a.y - 2;
    const end = (x: number, from: number): number => (plain ? (down ? b.y : b.y + b.h) : stopAt(x, from, x, b.y + b.h / 2, STROKE, b)[1]);
    if (Math.abs(ra - rb) !== 1) {
      if (label) fail(`${e.from}→${e.to}: nhãn trên làn bên chưa hỗ trợ`);
      return { e, d: laneRoute(a, b, ra, rb, CW + 8 + 16 * side++, lane, end) };
    }
    const land = lands.get(e);
    if (land !== undefined) { // v40 (R1 E10): several arrows into one box land apart
      if (land >= a.x + 8 && land <= a.x + a.w - 8) return { e, d: `M${land} ${y1} L${land} ${end(land, y1)}`, lab: label ? { x: land + 6, y: (y1 + end(land, y1)) / 2, a: undefined, s: label } : undefined };
      const ym = lane(Math.min(ra, rb)), ax = Math.round(a.x + a.w / 2);
      return { e, d: `M${ax} ${y1} L${ax} ${ym} L${land} ${ym} L${land} ${end(land, ym)}`, lab: label ? elbowLabel(label, ax, land, ym, e) : undefined };
    }
    const lo = Math.max(a.x, b.x), hi = Math.min(a.x + a.w, b.x + b.w);
    if (hi - lo >= 24) {
      const x = Math.round((lo + hi) / 2);
      const ye = end(x, y1);
      return { e, d: `M${x} ${y1} L${x} ${ye}`, lab: label ? { x: x + 6, y: (y1 + ye) / 2, a: undefined, s: label } : undefined };
    }
    const ym = lane(Math.min(ra, rb));
    // the elbow lands on the part of b nearest the source, so two arrows into one box never share a tip
    const ax = Math.round(a.x + a.w / 2), bx = Math.round(Math.min(b.x + b.w - 12, Math.max(b.x + 12, ax)));
    return { e, d: `M${ax} ${y1} L${ax} ${ym} L${bx} ${ym} L${bx} ${end(bx, ym)}`, lab: label ? elbowLabel(label, ax, bx, ym, e) : undefined };
  });
  /** A link end's y: a grid row's middle (`grid#2`), else the node's middle. */
  function anchorY(end: string, r: Rect): number {
    const [id, row] = end.split('#');
    if (row === undefined) return Math.round(r.y + r.h / 2);
    const n = byId.get(id)!;
    return Math.round(r.y + tall(titleLines(n, lang, 'label')) + (n.label === undefined ? 0 : 4) + ((n.head ? 1 : 0) + Number(row) + 0.5) * ROW_H);
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
        ? { k, t: 'p', d: r.d, ink: 'new', w: STROKE, dash: r.e.dash }
        : { k, t: 'p', d: r.d, ink: 'edge', w: STROKE, arrow: true, dash: r.e.dash, attrs: ends(r.e) });
      if (r.lab) shapes.push({ k: `${k}.l`, t: 't', x: r.lab.x, y: r.lab.y, s: r.lab.s, size: SS, a: r.lab.a, ink: 'muted' });
    });
    for (const n of p.nodes) if (p.show.has(n.id)) shapes.push(...draw(n, at.get(n.id)!, lang, parentOf.get(n.id)));
    return { say: p.say, nodes: shapes };
  });
  const v = variant === undefined ? undefined : spec.variants?.[variant];
  return { title: tr(v?.title ?? spec.title, lang), w: W, h: H, frames, maxW: 640 };
}

// ── v40 layout pieces: rows and groups, side lanes, elbow labels ───────────────────────────────────────────────────
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
/** Wraps the author rows into rows that fit, places them (a row with two or more tables or charts aligns their tops, R1 E3),
 * and leaves room for group bands and `reserve` side lanes at the right (CW = the width boxes may use). */
function placeRows(spec: FigSpec, lang: Lang, W: number, dims: Map<string, Sized>, reserve: number) {
  const CW = W - MARGIN - 16 * reserve; // boxes end before CW; lanes run at CW + 8, CW + 24…
  const edges = spec.edges ?? [];
  const parentOf = groupOf(spec);
  const between = (a: string, b: string): FigEdge[] => edges.filter((e) => (base(e.from) === a && base(e.to) === b) || (base(e.from) === b && base(e.to) === a));
  const gapOf = (a: string, b: string, room: number): number => {
    const es = between(a, b);
    if (!es.length) return GAP_X;
    const lab = Math.max(0, ...es.map((e) => (e.label ? Math.ceil(textWidth(tr(e.label, lang), SS)) + 12 : 0)));
    // R1 E4/E5: crossing pair lines need room to be traced; take what the row has left, up to 24 + 16 per line
    const links = es.filter((e) => e.link).length;
    const want = links ? Math.max(32, Math.min(24 + 16 * links, room - dims.get(a)!.w - dims.get(b)!.w)) : 24;
    return Math.max(want, lab);
  };
  const vrows: string[][] = [];
  const vg: (string | undefined)[] = [];
  for (const row of spec.rows) {
    const g = parentOf.get(row[0]);
    const room = CW - MARGIN - (g ? 2 * GPAD : 0);
    let cur: string[] = [];
    let used = 0;
    for (const id of row) {
      const d = dims.get(id) ?? fail(`rows: không có node "${id}"`);
      if (d.w > room) fail(`${id} rộng ${d.w} > ${room} (W ${W})`);
      const add = (cur.length ? gapOf(cur[cur.length - 1], id, room) : 0) + d.w;
      if (cur.length && used + add > room) {
        vrows.push(cur);
        vg.push(g);
        cur = [id];
        used = d.w;
      } else {
        cur.push(id);
        used += add;
      }
    }
    if (cur.length) {
      vrows.push(cur);
      vg.push(g);
    }
  }
  const rowOf = new Map<string, number>();
  vrows.forEach((r, i) => r.forEach((id) => rowOf.set(id, i)));
  for (const n of spec.nodes) if (!rowOf.has(n.id)) fail(`node "${n.id}" không nằm trong rows`);
  // a labelled edge between neighbouring rows widens its gap (room for the label beside a straight arrow or above an elbow)
  const labelled = new Set(edges.filter((e) => e.label && Math.abs(rowOf.get(base(e.from))! - rowOf.get(base(e.to))!) === 1)
    .map((e) => Math.min(rowOf.get(base(e.from))!, rowOf.get(base(e.to))!)));
  const at = new Map<string, Rect>();
  let y = MARGIN;
  const bands: [number, number][] = [];
  vrows.forEach((r, i) => {
    if (vg[i] && vg[i] !== vg[i - 1]) y += GBAND + GPAD;
    const hh = Math.max(...r.map((id) => dims.get(id)!.h));
    const room = CW - MARGIN - (vg[i] ? 2 * GPAD : 0);
    const width = r.reduce((a, id, j) => a + dims.get(id)!.w + (j ? gapOf(r[j - 1], id, room) : 0), 0);
    const top = r.filter((id) => ['grid', 'bars'].includes(spec.nodes.find((n) => n.id === id)?.shape ?? '')).length >= 2;
    let x = Math.round((CW + MARGIN - width) / 2);
    r.forEach((id, j) => {
      if (j) x += gapOf(r[j - 1], id, room);
      const d = dims.get(id)!;
      at.set(id, { x, y: y + (top ? 0 : Math.round((hh - d.h) / 2)), w: d.w, h: d.h });
      x += d.w;
    });
    bands.push([y, y + hh]);
    y += hh;
    if (vg[i] && vg[i] !== vg[i + 1]) y += GPAD;
    if (i < vrows.length - 1) y += labelled.has(i) ? GAP_ELBOW : GAP_Y;
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
    // the label sits in the band at the left, or at the right when an arrow enters the group through the left spot
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
/** Arrows between neighbouring rows that share a target and a side land at ⅓/⅔… of its width, in the order of their sources. */
function spreadTips(edges: FigEdge[], at: Map<string, Rect>, rowOf: Map<string, number>): Map<FigEdge, number> {
  const out = new Map<FigEdge, number>();
  const by = new Map<string, FigEdge[]>();
  for (const e of edges) {
    if (e.link) continue;
    const ra = rowOf.get(base(e.from))!, rb = rowOf.get(base(e.to))!;
    if (Math.abs(ra - rb) !== 1) continue;
    const key = `${base(e.to)}|${rb > ra}`;
    by.set(key, [...(by.get(key) ?? []), e]);
  }
  for (const es of by.values()) {
    if (es.length < 2) continue;
    const b = at.get(base(es[0].to))!;
    const cx = (e: FigEdge): number => { const a = at.get(base(e.from))!; return a.x + a.w / 2; };
    [...es].sort((p, q) => cx(p) - cx(q)).forEach((e, i) => out.set(e, Math.round(b.x + (b.w * (i + 1)) / (es.length + 1))));
  }
  return out;
}
/** A side lane: out into the gap next to the source row, across to the lane at the right, along it, then back through the
 * gap next to the target row and into the target (never across a row's neighbours). */
function laneRoute(a: Rect, b: Rect, ra: number, rb: number, lx: number, lane: (gap: number) => number, end: (x: number, from: number) => number): string {
  const down = rb > ra;
  const ax = Math.round(a.x + a.w / 2), bx = Math.round(b.x + b.w / 2);
  const y1 = down ? a.y + a.h + 2 : a.y - 2;
  const ys = lane(down ? ra : ra - 1), yt = lane(down ? rb - 1 : rb);
  return `M${ax} ${y1} L${ax} ${ys} L${lx} ${ys} L${lx} ${yt} L${bx} ${yt} L${bx} ${end(bx, yt)}`;
}
/** An elbow's label sits above its run, between the two legs; a run too short for it is a content error. */
function elbowLabel(s: string, ax: number, bx: number, ym: number, e: FigEdge): { x: number; y: number; a: 'm'; s: string } {
  if (Math.abs(bx - ax) < textWidth(s, SS) + 16) fail(`${e.from}→${e.to}: đoạn ngang quá ngắn cho nhãn "${s}"`);
  return { x: (ax + bx) / 2, y: ym - 6 - lineH(SS) / 2, a: 'm', s };
}

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
  return [{ k, t: 'p', d: body, tone, ink: 'edge', w: 1.2, attrs }, { k: `${k}.e`, t: 'p', d: edge, ink: 'edge', w: 1.2 },
    ...lines(`${k}.t`, boxLines(n, lang), x + w / 2, y + PAD_Y + (n.shape === 'table' ? CAP : 0), { ink: tone === 'ghost' ? 'muted' : 'ink' }, k)];
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
function draw(n: FigNode, r: Rect, lang: Lang, parent?: string): Shape[] {
  const k = `n:${n.id}`;
  const shape = n.shape ?? 'box';
  const ink = n.tone === 'ghost' ? 'muted' : 'ink';
  const attrs = parent ? { 'data-parent': parent } : undefined;
  if (shape === 'box' || shape === 'key') {
    const ls = boxLines(n, lang);
    return [{ k, t: 'r', x: r.x, y: r.y, w: r.w, h: r.h, tone: n.tone ?? 'cell', rx: shape === 'key' ? r.h / 2 : 8, attrs },
      ...lines(`${k}.t`, ls, r.x + r.w / 2, r.y + PAD_Y, { ink }, k)];
  }
  if (shape === 'table' || shape === 'doc') return pageShapes(n, r, lang, attrs);
  if (shape === 'note') return lines(`${k}.t`, boxLines(n, lang), r.x + r.w / 2, r.y, { ink: 'ink' });
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
        const hl = head ? undefined : n.cellTone?.[`${body}:${c}`];
        const tone: Tone = head ? 'cell' : hl ?? n.toneOf?.[s] ?? n.rowTone?.[body] ?? n.colTone?.[c] ?? n.tone ?? 'plain';
        if (s) {
          out.push({ k: ck, t: 'r', x, y, w: cols[c], h: ROW_H, tone, rx: 0, bold: !!hl },
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

// ── text alternative (svg-system §6): every node and every edge, generated ────────────────────────────────────
const WORDS = {
  vi: { parts: 'Thành phần', arrows: 'Mũi tên', links: 'Đường nối', dashed: 'nét đứt', alt: 'Sơ đồ bằng lời', box: 'hộp', key: 'nhãn', grid: 'bảng', bars: 'biểu đồ cột', note: 'ghi chú', mark: 'mốc', table: 'bảng lưu', doc: 'tệp' },
  en: { parts: 'Parts', arrows: 'Arrows', links: 'Links', dashed: 'dashed', alt: 'The figure in words', box: 'box', key: 'label', grid: 'table', bars: 'bar chart', note: 'note', mark: 'mark', table: 'stored table', doc: 'file' },
};
const nameOf = (n: FigNode, lang: Lang): string => [tr(n.label, lang), tr(n.sub, lang)].filter(Boolean).join(', ');
export function altText(spec: FigSpec, lang: Lang, variant?: string): string[] {
  const own = (variant === undefined ? undefined : spec.variants?.[variant]?.alt) ?? spec.alt; // v40 (R1 E11): written by hand
  if (own !== undefined) return [tr(own, lang)];
  const w = WORDS[lang];
  const nodes = merge(spec.nodes, variant ? spec.variants?.[variant]?.set : undefined);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const one = (n: FigNode): string => {
    const shape = n.shape ?? 'box';
    if (shape === 'grid') {
      const rows = [...(n.head ? [n.head] : []), ...(n.cells ?? [])].map((r) => r.map((c) => tr(c, lang)).filter(Boolean).join(' '));
      return `${nameOf(n, lang) || w.grid} (${w.grid}): ${rows.join('; ')}`;
    }
    if (shape === 'bars') return `${nameOf(n, lang)} (${w.bars}): ${(n.items ?? []).map((i) => `${tr(i.label, lang)} ${tr(i.note, lang) || i.value}`).join('; ')}${n.mark === undefined ? '' : `; ${w.mark} ${n.mark}`}`;
    return `${nameOf(n, lang)} (${w[shape]})`;
  };
  const end = (x: string): string => {
    const [id, row] = x.split('#');
    const n = byId.get(id)!;
    return row === undefined ? nameOf(n, lang) || id : `${tr(n.label, lang) || id} ${(n.cells?.[Number(row)] ?? []).map((c) => tr(c, lang)).join(' ')}`;
  };
  const es = spec.edges ?? [];
  const list = (link: boolean): string => es.filter((e) => !!e.link === link)
    .map((e) => `${end(e.from)} ${link ? '–' : '→'} ${end(e.to)}${e.label ? `: ${tr(e.label, lang)}` : ''}${e.dash ? ` (${w.dashed})` : ''}`).join('. ');
  return [`${w.parts}: ${nodes.map(one).join('; ')}.`, ...(es.some((e) => !e.link) ? [`${w.arrows}: ${list(false)}.`] : []), ...(es.some((e) => e.link) ? [`${w.links}: ${list(true)}.`] : [])];
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
    v = mount(host, layout(spec, lang, W, ref.variant), lang, i, { name: ref.name, caption: tr((ref.variant === undefined ? undefined : spec.variants?.[ref.variant]?.caption) ?? spec.caption, lang), alt: altText(spec, lang, ref.variant), altTitle: WORDS[lang].alt });
  };
  draw();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => draw()) : undefined;
  ro?.observe(host);
  return { get index() { return v?.index ?? 0; }, destroy: () => { ro?.disconnect(); v?.destroy(); } };
}
