/**
 * v47 Telemetry R1 (L1036–L1041): a small PromQL subset, evaluated in TypeScript over in-memory samples. A simulation for
 * lessons, not Prometheus. The query is parsed as data (recursive descent; never eval, never `Function`), then evaluated at
 * one fixed instant (the virtual clock). Semantics follow the Prometheus docs and source, pinned to v3.5.0:
 * - https://prometheus.io/docs/prometheus/latest/querying/basics/ : matchers `= != =~ !~`, regexes fully anchored (RE2),
 *   range selectors left-open `(t − range, t]`, instant selectors take the newest sample within the 5 m lookback, a selector
 *   needs a name or a matcher that does not match the empty string.
 * - https://prometheus.io/docs/prometheus/latest/querying/functions/ and promql/functions.go `extrapolatedRate`: counter
 *   resets corrected, extrapolation to the range ends (a gap ≥ 1.1 × the average interval counts as half an interval),
 *   the counter zero clamp; rate = increase / range seconds; fewer than two samples → no result.
 * - promql/quantile.go `BucketQuantile`: linear interpolation inside the bucket, lower edge 0, +Inf bucket required,
 *   monotonicity forced, rank in the +Inf bucket → the second highest bound.
 * Supported: selectors, `rate`, `increase`, `sum|avg|min|max|count [by (…)]`, `histogram_quantile`. Anything else is refused
 * with code `promql`.
 */

export type Labels = Readonly<Record<string, string>>;
export interface Series { labels: Labels; points: readonly (readonly [number, number])[] }
export type MatchOp = '=' | '!=' | '=~' | '!~';
export interface Matcher { name: string; op: MatchOp; value: string }
export type Node =
  | { t: 'sel'; matchers: Matcher[]; range?: number }
  | { t: 'num'; v: number }
  | { t: 'fn'; fn: 'rate' | 'increase'; arg: Node }
  | { t: 'hq'; q: number; arg: Node }
  | { t: 'agg'; op: AggOp; by: string[]; arg: Node };
export type AggOp = 'sum' | 'avg' | 'min' | 'max' | 'count';
export interface Row { labels: Labels; value: number; t?: number }

export class PromqlError extends Error {
  readonly code = 'promql';
  constructor(message: string, readonly position?: number) {
    super(message);
    this.name = 'PromqlError';
  }
}

export const LOOKBACK_MS = 5 * 60_000;
const MAX_QUERY = 400;
const MAX_REGEX = 64;
const AGG: readonly string[] = ['sum', 'avg', 'min', 'max', 'count'];
/** Label names that would touch Object.prototype if anything ever stored them in a plain object. */
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);
const UNIT: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000, y: 31_536_000_000 };

/** A null-prototype label set (no inherited keys). */
const labelsOf = (entries: Iterable<readonly [string, string]>): Labels => {
  const o = Object.create(null) as Record<string, string>;
  for (const [k, v] of entries) o[k] = v;
  return o;
};

// ---------- lexer ----------
type Tok = { k: 'id' | 'str' | 'num' | 'dur' | 'op'; v: string; at: number };
function lex(src: string): Tok[] {
  if (src.length > MAX_QUERY) throw new PromqlError(`query longer than ${MAX_QUERY} characters`);
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^(?:\d+(?:ms|s|m|h|d|w|y))+/.exec(rest)) && !/^\d+(?:\.\d|e)/i.test(rest)) { out.push({ k: 'dur', v: m[0], at: i }); i += m[0].length; continue; }
    if ((m = /^(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i.exec(rest))) { out.push({ k: 'num', v: m[0], at: i }); i += m[0].length; continue; }
    if ((m = /^[a-zA-Z_:][a-zA-Z0-9_:]*/.exec(rest))) { out.push({ k: 'id', v: m[0], at: i }); i += m[0].length; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') {
          const n = src[j + 1];
          if (n === undefined) break;
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n === c || n === '\\' ? n : `\\${n}`; // other escapes reach the regex as written
          j += 2;
        } else s += src[j++];
      }
      if (src[j] !== c) throw new PromqlError('unterminated string', i + 1);
      out.push({ k: 'str', v: s, at: i });
      i = j + 1;
      continue;
    }
    if ((m = /^(=~|!~|!=|=|[{}()[\],])/.exec(rest))) { out.push({ k: 'op', v: m[0], at: i }); i += m[0].length; continue; }
    throw new PromqlError(`unexpected character "${c}"`, i + 1);
  }
  return out;
}

export function durationMs(d: string): number {
  let ms = 0;
  let last = Infinity;
  for (const m of d.matchAll(/(\d+)(ms|s|m|h|d|w|y)/g)) {
    const u = UNIT[m[2]];
    if (u >= last) throw new PromqlError(`duration units out of order: ${d}`);
    last = u;
    ms += Number(m[1]) * u;
  }
  if (!ms) throw new PromqlError(`zero duration: ${d}`);
  return ms;
}

// ---------- parser ----------
/** Parses a query into data. Throws PromqlError (code `promql`, 1-based `position`) on anything outside the subset. */
export function parse(src: string): Node {
  const toks = lex(src);
  let p = 0;
  const peek = (): Tok | undefined => toks[p];
  const fail = (msg: string, t = peek()): never => { throw new PromqlError(t ? `${msg}, got "${t.v}"` : `${msg}, got end of query`, t ? t.at + 1 : src.length + 1); };
  const take = (v: string): Tok => (peek()?.v === v && peek()!.k === 'op' ? toks[p++] : fail(`expected "${v}"`));
  const labelName = (): string => {
    const t = peek();
    if (t?.k !== 'id' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t.v)) return fail('expected a label name');
    if (FORBIDDEN.has(t.v)) return fail('label name not allowed');
    p++;
    return t.v;
  };
  const by = (): string[] => {
    const t = peek();
    if (t?.k === 'id' && t.v === 'without') fail('"without" is not in this simulation; use "by"');
    if (!(t?.k === 'id' && t.v === 'by')) return [];
    p++;
    take('(');
    const names: string[] = [];
    while (peek()?.v !== ')') {
      names.push(labelName());
      if (peek()?.v === ',') p++; else break;
    }
    take(')');
    return names;
  };
  const selector = (): Node => {
    const matchers: Matcher[] = [];
    const t = peek();
    if (t?.k === 'id') {
      if (FORBIDDEN.has(t.v)) fail('metric name not allowed');
      matchers.push({ name: '__name__', op: '=', value: t.v });
      p++;
    }
    if (peek()?.v === '{') {
      p++;
      while (peek()?.v !== '}') {
        const name = labelName();
        const op = peek();
        if (op?.k !== 'op' || !['=', '!=', '=~', '!~'].includes(op.v)) fail('expected = != =~ or !~');
        p++;
        const v = peek();
        if (v?.k !== 'str') fail('expected a quoted label value');
        p++;
        if (op!.v === '=~' || op!.v === '!~') checkRegex(v!.v, v!.at + 1);
        matchers.push({ name, op: op!.v as MatchOp, value: v!.v });
        if (peek()?.v === ',') p++; else break;
      }
      take('}');
    }
    if (!matchers.length) fail('expected a metric name or {');
    if (!matchers.some((m) => !matchesEmpty(m))) fail('a selector needs a name or a matcher that does not match the empty string', t);
    let range: number | undefined;
    if (peek()?.v === '[') {
      p++;
      const d = peek();
      if (d?.k !== 'dur') fail('expected a duration such as 5m');
      p++;
      range = durationMs(d!.v);
      take(']');
    }
    return { t: 'sel', matchers, ...(range ? { range } : {}) };
  };
  const expr = (): Node => {
    const t = peek();
    if (!t) return fail('empty query');
    if (t.k === 'num') { p++; return { t: 'num', v: Number(t.v) }; }
    if (t.k === 'id' && peek() && toks[p + 1]?.v === '(' && (t.v === 'rate' || t.v === 'increase')) {
      p += 2;
      const arg = expr();
      take(')');
      if (arg.t !== 'sel' || !arg.range) fail(`${t.v}() needs a range vector such as metric[5m]`, t);
      return { t: 'fn', fn: t.v, arg };
    }
    if (t.k === 'id' && t.v === 'histogram_quantile' && toks[p + 1]?.v === '(') {
      p += 2;
      const q = peek();
      if (q?.k !== 'num') fail('histogram_quantile() needs a number first');
      p++;
      take(',');
      const arg = expr();
      take(')');
      return { t: 'hq', q: Number(q!.v), arg };
    }
    if (t.k === 'id' && AGG.includes(t.v) && (toks[p + 1]?.v === '(' || toks[p + 1]?.v === 'by' || toks[p + 1]?.v === 'without')) {
      p++;
      let names = by();
      take('(');
      const arg = expr();
      take(')');
      if (!names.length) names = by();
      if (arg.t === 'sel' && arg.range) fail(`${t.v}() needs an instant vector; wrap the range in rate() or increase()`, t);
      return { t: 'agg', op: t.v as AggOp, by: names, arg };
    }
    if (t.k === 'id' && toks[p + 1]?.v === '(') return fail(`function "${t.v}" is not in this simulation`);
    if (t.k === 'id' || t.v === '{') return selector();
    return fail('unexpected token');
  };
  const node = expr();
  if (p < toks.length) fail('unexpected token after the end of the expression');
  return node;
}

// ---------- regex matchers (RE2-like subset, fully anchored) ----------
/**
 * JavaScript regexes are not RE2. To keep the anchored meaning and stay linear, a matcher regex may use only literals,
 * `. | ( ) [ ] ^ - * + ?` and simple escapes; refused: backreferences, lookaround and named or inline groups (`(?`), counted
 * repeats `{…}`, a repeat applied to a group (`)*`, the nested-quantifier shape), and anything longer than 64 characters.
 */
export function checkRegex(re: string, at?: number): void {
  const no = (why: string): never => { throw new PromqlError(`regex not allowed in this simulation: ${why}`, at); };
  if (re.length > MAX_REGEX) no(`longer than ${MAX_REGEX} characters`);
  if (/\(\?/.test(re)) no('(? groups or lookaround');
  if (/\\[1-9kpPbB]/.test(re)) no('backreference or unsupported escape');
  if (/[{}]/.test(re)) no('counted repeat {…}');
  if (/\)[*+?]/.test(re)) no('a repeat applied to a group');
  if (/[*+?][*+?]/.test(re)) no('stacked repeats');
  try { new RegExp(`^(?:${re})$`); } catch { no('invalid pattern'); }
}
const regexCache = new Map<string, RegExp>();
const anchored = (re: string): RegExp => {
  let r = regexCache.get(re);
  if (!r) { checkRegex(re); r = new RegExp(`^(?:${re})$`); regexCache.set(re, r); }
  return r;
};
const matchOne = (m: Matcher, v: string): boolean =>
  m.op === '=' ? v === m.value : m.op === '!=' ? v !== m.value : m.op === '=~' ? anchored(m.value).test(v) : !anchored(m.value).test(v);
const matchesEmpty = (m: Matcher): boolean => matchOne(m, '');
const get = (l: Labels, k: string): string => (Object.prototype.hasOwnProperty.call(l, k) ? l[k] : '');

// ---------- evaluation ----------
type Vec = Row[];
const dropName = (l: Labels): Labels => labelsOf(Object.entries(l).filter(([k]) => k !== '__name__'));
const keyOf = (l: Labels): string => JSON.stringify(Object.keys(l).sort().map((k) => [k, l[k]]));

/**
 * Prometheus' extrapolatedRate for float counters (functions.go, v3.5.0). `pts` are the samples in (start, end], ms.
 * Returns undefined with fewer than two samples (no result for that series).
 */
export function extrapolatedRate(pts: readonly (readonly [number, number])[], start: number, end: number, isRate: boolean): number | undefined {
  if (pts.length < 2) return undefined;
  const [first, last] = [pts[0], pts[pts.length - 1]];
  let result = last[1] - first[1];
  for (let i = 1; i < pts.length; i++) if (pts[i][1] < pts[i - 1][1]) result += pts[i - 1][1]; // a drop = a counter reset
  let toStart = (first[0] - start) / 1000;
  let toEnd = (end - last[0]) / 1000;
  const sampled = (last[0] - first[0]) / 1000;
  const avg = sampled / (pts.length - 1);
  const threshold = avg * 1.1;
  if (toStart >= threshold) toStart = avg / 2; // source order (v3.5.0): threshold, then the zero clamp, then the end
  if (result > 0 && first[1] >= 0) {
    const toZero = sampled * (first[1] / result);
    if (toZero < toStart) toStart = toZero;
  }
  if (toEnd >= threshold) toEnd = avg / 2;
  let factor = (sampled + toStart + toEnd) / sampled;
  if (isRate) factor /= (end - start) / 1000;
  return result * factor;
}

/** Prometheus' BucketQuantile for classic float buckets (quantile.go, v3.5.0). */
export function bucketQuantile(q: number, buckets: { le: number; count: number }[]): number {
  if (Number.isNaN(q)) return NaN;
  if (q < 0) return -Infinity;
  if (q > 1) return Infinity;
  const b = [...buckets].sort((x, y) => x.le - y.le);
  if (!b.length || b[b.length - 1].le !== Infinity) return NaN;
  const co: { le: number; count: number }[] = [];
  for (const x of b) if (co.length && co[co.length - 1].le === x.le) co[co.length - 1].count += x.count; else co.push({ ...x });
  for (let i = 1; i < co.length; i++) if (co[i].count < co[i - 1].count || Math.abs(co[i].count - co[i - 1].count) < 1e-12) co[i].count = co[i - 1].count;
  if (co.length < 2) return NaN;
  const obs = co[co.length - 1].count;
  if (obs === 0) return NaN;
  let rank = q * obs;
  let i = 0;
  while (i < co.length - 1 && !(co[i].count >= rank)) i++;
  if (i === co.length - 1) return co[co.length - 2].le;
  if (i === 0 && co[0].le <= 0) return co[0].le;
  let startLe = 0;
  let count = co[i].count;
  if (i > 0) { startLe = co[i - 1].le; count -= co[i - 1].count; rank -= co[i - 1].count; }
  return startLe + (co[i].le - startLe) * (rank / count);
}

const leOf = (v: string): number => (v === '+Inf' || v === 'Inf' || v === '+inf' ? Infinity : v.trim() === '' ? NaN : Number(v));

function select(data: readonly Series[], ms: Matcher[]): Series[] {
  return data.filter((s) => ms.every((m) => matchOne(m, get(s.labels, m.name))));
}

/** Evaluates `node` at `at` (ms). A bare range selector returns every sample of the window, one row each (with `t`). */
export function evaluate(node: Node, data: readonly Series[], at: number): Vec {
  switch (node.t) {
    case 'num': return [{ labels: labelsOf([]), value: node.v }];
    case 'sel': {
      const hit = select(data, node.matchers);
      if (node.range) {
        const from = at - node.range;
        return hit.flatMap((s) => s.points.filter(([t]) => t > from && t <= at).map(([t, v]) => ({ labels: s.labels, value: v, t })));
      }
      return hit.flatMap((s) => {
        const last = [...s.points].reverse().find(([t]) => t <= at && t > at - LOOKBACK_MS);
        return last ? [{ labels: s.labels, value: last[1] }] : [];
      });
    }
    case 'fn': {
      const sel = node.arg as Extract<Node, { t: 'sel' }>;
      const from = at - sel.range!;
      return select(data, sel.matchers).flatMap((s) => {
        const v = extrapolatedRate(s.points.filter(([t]) => t > from && t <= at), from, at, node.fn === 'rate');
        return v === undefined ? [] : [{ labels: dropName(s.labels), value: v }];
      });
    }
    case 'agg': {
      const groups = new Map<string, { labels: Labels; vals: number[] }>();
      for (const r of evaluate(node.arg, data, at)) {
        const l = labelsOf(node.by.flatMap((k) => (get(r.labels, k) !== '' ? [[k, get(r.labels, k)] as const] : [])));
        const k = keyOf(l);
        const g = groups.get(k) ?? { labels: l, vals: [] };
        g.vals.push(r.value);
        groups.set(k, g);
      }
      return [...groups.values()].map((g) => ({ labels: g.labels, value: aggregate(node.op, g.vals) }));
    }
    case 'hq': {
      const groups = new Map<string, { labels: Labels; b: { le: number; count: number }[] }>();
      for (const r of evaluate(node.arg, data, at)) {
        if (r.t !== undefined) throw new PromqlError('histogram_quantile() needs an instant vector');
        if (!Object.prototype.hasOwnProperty.call(r.labels, 'le')) continue; // samples without `le` are silently ignored
        const l = labelsOf(Object.entries(r.labels).filter(([k]) => k !== 'le' && k !== '__name__'));
        const k = keyOf(l);
        const g = groups.get(k) ?? { labels: l, b: [] };
        g.b.push({ le: leOf(r.labels.le), count: r.value });
        groups.set(k, g);
      }
      return [...groups.values()].map((g) => ({ labels: g.labels, value: bucketQuantile(node.q, g.b) }));
    }
  }
}
function aggregate(op: AggOp, v: number[]): number {
  if (op === 'count') return v.length;
  if (op === 'min') return Math.min(...v);
  if (op === 'max') return Math.max(...v);
  const s = v.reduce((a, x) => a + x, 0);
  return op === 'sum' ? s : s / v.length;
}

/** `{job="api", path="/track"}`, name first when kept, other labels sorted; `{}` for none. */
export function seriesText(l: Labels): string {
  const name = get(l, '__name__');
  const rest = Object.keys(l).filter((k) => k !== '__name__').sort().map((k) => `${k}="${l[k]}"`);
  return `${name}{${rest.join(', ')}}`;
}

/** The lab table: one row per result, `series`, `value` (+ `time` for a raw range), sorted by series then time. */
export function toTable(rows: Vec): { columns: string[]; rows: unknown[][] } {
  const ranged = rows.some((r) => r.t !== undefined);
  const out = rows.map((r) => [seriesText(r.labels), ...(ranged ? [new Date(r.t!).toISOString().slice(11, 19)] : []), r.value] as unknown[])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])));
  return { columns: ranged ? ['series', 'time', 'value'] : ['series', 'value'], rows: out };
}

/** Raw rows (`metric`, labels JSON text, epoch ms, value) → series; label names outside the PromQL grammar are refused. */
export function seriesOf(rows: readonly (readonly unknown[])[]): Series[] {
  const by = new Map<string, { labels: Labels; points: [number, number][] }>();
  for (const [metric, json, t, v] of rows) {
    const raw = JSON.parse(String(json)) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PromqlError('labels must be a JSON object');
    const entries: [string, string][] = [['__name__', String(metric)]];
    for (const k of Object.keys(raw)) {
      if (FORBIDDEN.has(k) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) throw new PromqlError(`bad label name "${k}"`);
      entries.push([k, String((raw as Record<string, unknown>)[k])]);
    }
    const labels = labelsOf(entries);
    const key = keyOf(labels);
    const s = by.get(key) ?? { labels, points: [] };
    s.points.push([Number(t), Number(v)]);
    by.set(key, s);
  }
  return [...by.values()].map((s) => ({ labels: s.labels, points: s.points.sort((a, b) => a[0] - b[0]) }));
}

/** One query on samples at `at`: parse, evaluate, table. */
export function runPromql(query: string, data: readonly Series[], at: number): { columns: string[]; rows: unknown[][] } {
  return toTable(evaluate(parse(query), data, at));
}
