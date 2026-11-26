/**
 * v47 R1 (L1014–L1019): BoonData's Elasticsearch-style teaching interpreter. Pure TS, no dependency, no eval: a request is
 * Kibana-console text (`GET products/_search` + a JSON body) read with JSON.parse and walked as data. It is a SIMULATION of a
 * subset, never Elasticsearch code: analyzers (standard / whitespace / keyword tokenizers; lowercase, asciifolding, edge_ngram,
 * ngram filters), an inverted index with positions, mappings (text, keyword, numbers, boolean, date; dynamic mapping =
 * text + `.keyword`), the queries match (operator, fuzziness), match_phrase, term, terms, range, bool, match_all, a terms
 * aggregation with avg/sum/min/max sub-aggregations, sort, from/size, `_source`, plus `_analyze` and `_mapping`.
 *
 * Scores follow Lucene's BM25 as Elasticsearch builds it (checked against the sources, 2026-11-27):
 * - ES SimilarityProviders.createBM25Similarity → LegacyBM25Similarity(k1 = 1.2f, b = 0.75f, discount_overlaps = true), whose
 *   scorer multiplies the boost by (1 + k1): the explain output's "boost 2.2".
 * - Lucene BM25Similarity: idf = (float) ln(1 + (N − n + 0.5) / (n + 0.5)) with N = docs that have the field; avgdl =
 *   (float) (sumTotalTermFreq / N); per-length cache 1f / (k1 · ((1 − b) + b · dl / avgdl)); score = w − w / (1 + freq · cache),
 *   w = boost · idf; dl = SmallFloat.byte4ToInt(intToByte4(tokens − overlaps)), exact below 40 tokens.
 * - Fields without norms (keyword, boolean) score with dl = 1; their freq is 1.
 * - Phrase: idf = the sum of the terms' float idfs, freq = the number of exact phrase matches.
 * Everything is float32 (Math.fround) where Lucene uses float. Known ceilings (ponytail): bool sums are summed in double then
 * rounded once (Lucene's scorers may round per clause: last digit only); fuzzy scores do not reproduce Lucene's blended
 * rewrite, so a fuzzy result is graded on its documents only (`approx`); the standard tokenizer is a regex approximation of
 * Unicode word breaks (UAX #29) good for the lesson data; one index, flat documents, slop 0 phrases.
 */
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

/** An Elasticsearch-shaped error: `code` = the error `type` (parsing_exception…), `message` = its `reason`. */
export class EsError extends Error {
  code: string;
  status: number;
  constructor(type: string, reason: string, status = 400) {
    super(reason);
    this.name = 'EsError';
    this.code = type;
    this.status = status;
  }
}
const fail = (type: string, reason: string, status = 400): never => { throw new EsError(type, reason, status); };
const unsupported = (what: string): never => fail('simulation_unsupported_exception', `${what} is not in BoonData's simulation`);
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);

// ---------- float32 BM25, as Lucene computes it ----------
const f = Math.fround;
export const K1 = f(1.2);
export const B = f(0.75);
/** Lucene SmallFloat.intToByte4 → byte4ToInt: the field length the norm keeps (exact for 0–39 tokens). */
export function normLength(n: number): number {
  if (n < 24) return n;
  const i = n - 24;
  const bits = 32 - Math.clz32(i);
  if (bits < 4) return n;
  const shift = bits - 4;
  return 24 + (((i >>> shift) & 0x07) | 0x08) * 2 ** shift;
}
export const idfOf = (n: number, N: number): number => f(Math.log(1 + (N - n + 0.5) / (n + 0.5)));
/** One term's (or phrase's) score: `idf` already float, `boost` the query boost. */
export function bm25(idf: number, freq: number, dl: number, avgdl: number, boost = 1): number {
  const w = f(f(boost * f(1 + K1)) * idf);
  const inv = f(1 / f(K1 * f(f(1 - B) + f(f(B * dl) / avgdl))));
  return f(w - f(w / f(1 + f(freq * inv))));
}
/** The shortest decimal that is the same float32 (Java's Float.toString digits, as `_score` prints). */
export function f32(x: number): number {
  const v = f(x);
  for (let p = 1; p <= 9; p++) {
    const y = Number(v.toPrecision(p));
    if (f(y) === v) return y;
  }
  return v;
}

// ---------- analysis ----------
export interface Tok { term: string; pos: number }
const WORD = /[\p{L}\p{M}\p{N}_]+(?:['.][\p{L}\p{M}\p{N}_]+)*/gu; // ponytail: UAX #29 approximated; enough for the lesson data
const TOKENIZERS: Record<string, (s: string) => Tok[]> = {
  standard: (s) => [...s.normalize('NFC').matchAll(WORD)].map((m, i) => ({ term: m[0], pos: i })),
  whitespace: (s) => s.split(/\s+/).filter(Boolean).map((term, i) => ({ term, pos: i })),
  keyword: (s) => [{ term: s, pos: 0 }],
};
/** asciifolding for Vietnamese: strip the combining marks after NFD, and đ/Đ (a letter of its own, not a mark). */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
type Filt = (t: Tok[]) => Tok[];
const grams = (edge: boolean, min: number, max: number): Filt => (ts) => ts.flatMap((t) => {
  const cp = [...t.term];
  const out: Tok[] = [];
  for (let s = 0; s < (edge ? 1 : cp.length); s++) for (let n = min; n <= max && s + n <= cp.length; n++) out.push({ term: cp.slice(s, s + n).join(''), pos: t.pos });
  return out;
});
const BUILTIN_FILTERS: Record<string, Filt> = {
  lowercase: (ts) => ts.map((t) => ({ ...t, term: t.term.toLowerCase() })),
  asciifolding: (ts) => ts.map((t) => ({ ...t, term: fold(t.term) })),
};
export interface Analyzer { tokenizer: string; filter: string[] }
const BUILTIN_ANALYZERS: Record<string, Analyzer> = {
  standard: { tokenizer: 'standard', filter: ['lowercase'] },
  whitespace: { tokenizer: 'whitespace', filter: [] },
  keyword: { tokenizer: 'keyword', filter: [] },
};

// ---------- mapping and index ----------
const TYPES = ['text', 'keyword', 'long', 'integer', 'float', 'double', 'boolean', 'date'] as const;
type FType = (typeof TYPES)[number];
interface FieldDef { path: string; type: FType; analyzer: string; search: string }
interface FieldIdx {
  def: FieldDef;
  post: Map<string, Map<number, number[]>>;
  len: number[];
  docCount: number;
  sumTtf: number;
  /** Raw values per document (keyword, numbers, booleans, dates: term/range/sort/aggs). */
  vals: (string | number | boolean)[][];
}
export interface EsIndex {
  name: string;
  ids: string[];
  docs: Obj[];
  fields: Map<string, FieldIdx>;
  /** Top-level source fields in mapping order (the hits table's columns). */
  cols: string[];
  analyzers: Map<string, Analyzer>;
  filters: Map<string, Filt>;
}
const scored = (t: FType): boolean => t === 'text' || t === 'keyword' || t === 'boolean';
const numeric = (t: FType): boolean => t === 'long' || t === 'integer' || t === 'float' || t === 'double';

/** Checks a parsed JSON value as data: no prototype keys, bounded depth (the walk every request body goes through). */
export function checkJson(x: Json, depth = 0): void {
  if (depth > 32) fail('parsing_exception', 'request is nested too deeply');
  if (Array.isArray(x)) for (const v of x) checkJson(v, depth + 1);
  else if (isObj(x)) for (const k of Object.keys(x)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') fail('parsing_exception', `unsafe key [${k}]`);
    checkJson(x[k], depth + 1);
  }
}
const parseJson = (text: string, what: string): Json => {
  if (text.length > 100_000) unsupported(`a ${what} over 100,000 characters`);
  let j: Json;
  try {
    j = JSON.parse(text) as Json;
  } catch (e) {
    return fail('x_content_parse_exception', `[${what}] ${(e as Error).message}`);
  }
  checkJson(j);
  return j;
};

export function analyze(ix: Pick<EsIndex, 'analyzers' | 'filters'>, name: string, text: string | string[]): Tok[] {
  const a = ix.analyzers.get(name) ?? BUILTIN_ANALYZERS[name] ?? fail('illegal_argument_exception', `failed to find analyzer [${name}]`);
  const out: Tok[] = [];
  let base = 0;
  for (const s of Array.isArray(text) ? text : [text]) {
    let ts = (TOKENIZERS[a.tokenizer] ?? fail('illegal_argument_exception', `failed to find tokenizer under [${a.tokenizer}]`))(s);
    for (const fl of a.filter) ts = (ix.filters.get(fl) ?? BUILTIN_FILTERS[fl] ?? fail('illegal_argument_exception', `failed to find filter under [${fl}]`))(ts);
    for (const t of ts) out.push({ term: t.term, pos: base + t.pos });
    base = (out.at(-1)?.pos ?? base - 101) + 101; // position_increment_gap 100 between the values of an array
  }
  return out;
}

/** The lab's setup: `{ "index", "settings"?, "mappings"?, "docs": [...] }` (a document may carry its own `_id`). */
export function buildIndex(setup: string): EsIndex {
  const j = parseJson(setup, 'setup');
  if (!isObj(j) || typeof j.index !== 'string' || !Array.isArray(j.docs)) return fail('mapper_parsing_exception', 'setup needs "index" and "docs"');
  const ix: EsIndex = { name: j.index, ids: [], docs: [], fields: new Map(), cols: [], analyzers: new Map(), filters: new Map() };
  const an = isObj(j.settings) && isObj(j.settings.analysis) ? j.settings.analysis : {};
  for (const [k, v] of Object.entries(isObj(an.filter) ? an.filter : {})) {
    if (!isObj(v)) continue;
    const min = Number(v.min_gram ?? 1), max = Number(v.max_gram ?? 2);
    ix.filters.set(k, v.type === 'edge_ngram' ? grams(true, min, max) : v.type === 'ngram' ? grams(false, min, max)
      : BUILTIN_FILTERS[String(v.type)] ?? fail('illegal_argument_exception', `Unknown filter type [${String(v.type)}] for [${k}]`));
  }
  for (const [k, v] of Object.entries(isObj(an.analyzer) ? an.analyzer : {})) {
    if (!isObj(v)) continue;
    ix.analyzers.set(k, { tokenizer: String(v.tokenizer ?? 'standard'), filter: Array.isArray(v.filter) ? v.filter.map(String) : [] });
  }
  const defs = new Map<string, FieldDef>();
  const add = (path: string, p: Obj): void => {
    const type = String(p.type ?? 'object') as FType;
    if (!TYPES.includes(type)) fail('mapper_parsing_exception', `No handler for type [${type}] declared on field [${path}]`);
    const analyzer = String(p.analyzer ?? 'standard');
    defs.set(path, { path, type, analyzer, search: String(p.search_analyzer ?? analyzer) });
    for (const [sub, sp] of Object.entries(isObj(p.fields) ? p.fields : {})) if (isObj(sp)) add(`${path}.${sub}`, sp);
  };
  const props = isObj(j.mappings) && isObj(j.mappings.properties) ? j.mappings.properties : {};
  for (const [k, p] of Object.entries(props)) if (isObj(p)) { add(k, p); ix.cols.push(k); }
  j.docs.forEach((raw, i) => {
    if (!isObj(raw)) fail('mapper_parsing_exception', 'a document must be a JSON object');
    const { _id, ...doc } = raw as Obj;
    ix.ids.push(_id === undefined ? String(i + 1) : String(_id));
    ix.docs.push(doc);
    for (const [k, v] of Object.entries(doc)) {
      const first = Array.isArray(v) ? v[0] : v;
      if (defs.has(k) || first === null || first === undefined) continue;
      if (isObj(first)) unsupported('an object field');
      // dynamic mapping, as Elasticsearch does it: a string becomes text with a keyword sub-field
      if (typeof first === 'string') { add(k, { type: 'text', fields: { keyword: { type: 'keyword' } } }); } else add(k, { type: typeof first === 'boolean' ? 'boolean' : Number.isInteger(first) ? 'long' : 'float' });
      ix.cols.push(k);
    }
  });
  for (const def of defs.values()) {
    const fi: FieldIdx = { def, post: new Map(), len: [], docCount: 0, sumTtf: 0, vals: [] };
    ix.docs.forEach((doc, d) => {
      const top = def.path.split('.')[0];
      const v = doc[def.path] ?? (def.path !== top ? doc[top] : undefined);
      const vs = (Array.isArray(v) ? v : [v]).filter((x): x is string | number | boolean => x !== null && x !== undefined && !isObj(x) && !Array.isArray(x));
      if (def.path !== top && def.type === 'keyword') vs.splice(0, vs.length, ...vs.filter((x) => String(x).length <= 256)); // ignore_above 256
      fi.vals[d] = numeric(def.type) ? vs.map(Number) : vs;
      fi.len[d] = 0;
      if (!vs.length) return;
      fi.docCount++;
      if (def.type === 'text') {
        const ts = analyze(ix, def.analyzer, vs.map(String));
        let prev = -1;
        for (const t of ts) {
          const p = fi.post.get(t.term) ?? new Map<number, number[]>();
          fi.post.set(t.term, p.set(d, [...(p.get(d) ?? []), t.pos]));
          if (t.pos !== prev) fi.len[d]++; // discount_overlaps: a token at the same position (an n-gram) is not counted
          prev = t.pos;
        }
        fi.sumTtf += ts.length;
      } else if (scored(def.type)) {
        for (const x of new Set(vs.map(String))) {
          const p = fi.post.get(x) ?? new Map<number, number[]>();
          fi.post.set(x, p.set(d, [0]));
          fi.sumTtf++; // index_options docs: sumTotalTermFreq = sumDocFreq
        }
      }
    });
    ix.fields.set(def.path, fi);
  }
  return ix;
}

// ---------- queries ----------
type Hits = Map<number, number>;
const all = (ix: EsIndex, score: number): Hits => new Map(ix.docs.map((_, d) => [d, score]));
const one = (q: Json, what: string): [string, Json] => {
  if (!isObj(q)) return fail('parsing_exception', `[${what}] query malformed, no start_object after query name`);
  const ks = Object.keys(q);
  if (ks.length !== 1) return fail('parsing_exception', ks.length ? `[${what}] query doesn't support multiple fields, found [${ks[0]}] and [${ks[1]}]` : `[${what}] query malformed, no field after start_object`);
  return [ks[0], q[ks[0]]];
};
const allow = (o: Obj, keys: string[], what: string): void => {
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail('parsing_exception', `[${what}] query does not support [${k}]`);
};
const list = (x: Json | undefined): Json[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

/** Edit distance with adjacent transpositions (Lucene's fuzzy default), on code points. */
export function edits(a: string, b: string): number {
  const x = [...a], y = [...b];
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array<number>(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[x.length][y.length];
}

class Searcher {
  approx = false;
  private ix: EsIndex;
  constructor(ix: EsIndex) { this.ix = ix; }
  field(name: string): FieldIdx | undefined { return this.ix.fields.get(name); }
  termHits(fi: FieldIdx, term: string, boost: number, dfOverride?: number): Hits {
    const p = fi.post.get(term);
    const out: Hits = new Map();
    if (!p) return out;
    const idf = idfOf(dfOverride ?? p.size, fi.docCount);
    const avgdl = f(fi.sumTtf / fi.docCount);
    const text = fi.def.type === 'text';
    for (const [d, pos] of p) out.set(d, bm25(idf, text ? pos.length : 1, text ? normLength(fi.len[d]) : 1, avgdl, boost));
    return out;
  }
  query(q: Json): Hits {
    if (isObj(q) && Object.keys(q).length > 1) fail('parsing_exception', `[${Object.keys(q)[0]}] malformed query, expected [END_OBJECT] but found [FIELD_NAME]`);
    const [kind, body] = one(q, '_na');
    switch (kind) {
      case 'match_all': return all(this.ix, isObj(body) && typeof body.boost === 'number' ? body.boost : 1);
      case 'match_none': return new Map();
      case 'match': return this.match(body);
      case 'match_phrase': return this.phrase(body);
      case 'term': return this.term(body);
      case 'terms': return this.terms(body);
      case 'range': return this.range(body);
      case 'bool': return this.bool(body);
      case 'multi_match': case 'query_string': case 'simple_query_string': case 'wildcard': case 'regexp': case 'prefix': case 'fuzzy':
      case 'exists': case 'ids': case 'nested': case 'script': case 'script_score': case 'function_score': case 'constant_score': case 'dis_max':
        return unsupported(`the [${kind}] query`);
      default: return fail('parsing_exception', `unknown query [${kind}]`);
    }
  }
  private exact(fi: FieldIdx, v: Json, boost: number): Hits {
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return fail('parsing_exception', '[term] query does not support an object or array value');
    if (scored(fi.def.type)) return this.termHits(fi, String(v), boost);
    const want = numeric(fi.def.type) ? Number(v) : String(v);
    return new Map(fi.vals.flatMap((vs, d) => (vs.includes(want) ? [[d, boost] as [number, number]] : [])));
  }
  private match(body: Json): Hits {
    const [name, spec] = one(body, 'match');
    const o: Obj = isObj(spec) ? spec : { query: spec };
    allow(o, ['query', 'operator', 'fuzziness', 'boost'], 'match');
    const boost = typeof o.boost === 'number' ? o.boost : 1;
    const fi = this.field(name);
    if (!fi || o.query === undefined || o.query === null) return new Map();
    if (fi.def.type !== 'text') return this.exact(fi, o.query, boost);
    const terms = analyze(this.ix, fi.def.search, String(o.query)).map((t) => t.term);
    const and = String(o.operator ?? 'or').toLowerCase() === 'and';
    const fz = o.fuzziness;
    const parts = terms.map((t) => {
      if (fz === undefined || fz === 0 || fz === '0') return this.termHits(fi, t, boost);
      const len = [...t].length;
      const max = fz === 'AUTO' ? (len <= 2 ? 0 : len <= 5 ? 1 : 2) : Number(fz);
      if (!(max >= 0 && max <= 2)) fail('parsing_exception', `[match] fuzziness [${String(fz)}] must be 0, 1, 2 or AUTO`);
      this.approx = true; // ponytail: no blended rewrite; graded on the documents only
      const near = [...fi.post.keys()].map((x) => [x, edits(t, x)] as const).filter(([, e]) => e <= max).slice(0, 50);
      const df = Math.max(0, ...near.map(([x]) => fi.post.get(x)!.size));
      return sum(near.map(([x, e]) => this.termHits(fi, x, boost * (1 - e / Math.min(len, [...x].length)), df)), 1);
    });
    return parts.length ? sum(parts, and ? parts.length : 1) : new Map();
  }
  private phrase(body: Json): Hits {
    const [name, spec] = one(body, 'match_phrase');
    const o: Obj = isObj(spec) ? spec : { query: spec };
    allow(o, ['query', 'slop', 'boost'], 'match_phrase');
    if (o.slop !== undefined && o.slop !== 0) unsupported('a phrase slop above 0');
    const boost = typeof o.boost === 'number' ? o.boost : 1;
    const fi = this.field(name);
    if (!fi || o.query === undefined || o.query === null) return new Map();
    if (fi.def.type !== 'text') return this.exact(fi, o.query, boost);
    const ts = analyze(this.ix, fi.def.search, String(o.query));
    if (ts.length <= 1) return ts.length ? this.termHits(fi, ts[0].term, boost) : new Map();
    const posts = ts.map((t) => fi.post.get(t.term));
    if (posts.some((p) => !p)) return new Map();
    let idfSum = 0;
    for (const p of posts) idfSum += idfOf(p!.size, fi.docCount); // Lucene sums the float idfs in double, then casts
    const idf = f(idfSum);
    const avgdl = f(fi.sumTtf / fi.docCount);
    const out: Hits = new Map();
    for (const [d, starts] of posts[0]!) {
      const freq = starts.filter((s) => ts.every((t, i) => posts[i]!.get(d)?.includes(s + t.pos - ts[0].pos))).length;
      if (freq) out.set(d, bm25(idf, freq, normLength(fi.len[d]), avgdl, boost));
    }
    return out;
  }
  private term(body: Json): Hits {
    const [name, spec] = one(body, 'term');
    const o: Obj = isObj(spec) ? spec : { value: spec };
    allow(o, ['value', 'boost'], 'term');
    const fi = this.field(name);
    return fi && o.value !== undefined ? this.exact(fi, o.value, typeof o.boost === 'number' ? o.boost : 1) : new Map();
  }
  private terms(body: Json): Hits {
    if (!isObj(body)) return fail('parsing_exception', '[terms] query malformed');
    const boost = typeof body.boost === 'number' ? body.boost : 1;
    const ks = Object.keys(body).filter((k) => k !== 'boost');
    if (ks.length !== 1 || !Array.isArray(body[ks[0]])) return fail('parsing_exception', '[terms] query requires one field with an array of values');
    const fi = this.field(ks[0]);
    const want = new Set((body[ks[0]] as Json[]).map((x) => (fi && numeric(fi.def.type) ? Number(x) : String(x))));
    return new Map((fi?.vals ?? []).flatMap((vs, d) => (vs.some((x) => want.has(numeric(fi!.def.type) ? Number(x) : String(x))) ? [[d, boost] as [number, number]] : [])));
  }
  private range(body: Json): Hits {
    const [name, spec] = one(body, 'range');
    if (!isObj(spec)) return fail('parsing_exception', '[range] query malformed, no start_object after query name');
    allow(spec, ['gt', 'gte', 'lt', 'lte', 'boost'], 'range');
    const fi = this.field(name);
    if (!fi) return new Map();
    if (fi.def.type === 'text') unsupported('a range on a text field');
    const num = numeric(fi.def.type);
    const cmp = (a: string | number | boolean, b: Json): number => (num ? Number(a) - Number(b) : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
    const ok = (v: string | number | boolean): boolean => (spec.gt === undefined || cmp(v, spec.gt) > 0) && (spec.gte === undefined || cmp(v, spec.gte) >= 0)
      && (spec.lt === undefined || cmp(v, spec.lt) < 0) && (spec.lte === undefined || cmp(v, spec.lte) <= 0);
    const boost = typeof spec.boost === 'number' ? spec.boost : 1;
    return new Map(fi.vals.flatMap((vs, d) => (vs.some(ok) ? [[d, boost] as [number, number]] : [])));
  }
  private bool(body: Json): Hits {
    if (!isObj(body)) return fail('parsing_exception', '[bool] query malformed, no start_object after query name');
    allow(body, ['must', 'should', 'filter', 'must_not', 'minimum_should_match', 'boost'], 'bool');
    const must = list(body.must).map((q) => this.query(q));
    const should = list(body.should).map((q) => this.query(q));
    const filter = list(body.filter).map((q) => this.query(q));
    const not = list(body.must_not).map((q) => this.query(q));
    if (!must.length && !should.length && !filter.length && !not.length) return all(this.ix, 1);
    const msm = body.minimum_should_match !== undefined ? Number(body.minimum_should_match) : must.length || filter.length ? 0 : 1;
    const out: Hits = new Map();
    for (let d = 0; d < this.ix.docs.length; d++) {
      if (!must.every((h) => h.has(d)) || !filter.every((h) => h.has(d)) || not.some((h) => h.has(d))) continue;
      const sh = should.filter((h) => h.has(d));
      if (sh.length < msm) continue;
      let s = 0; // query context only: filter and must_not add nothing (ponytail: a must_not-only bool scores 0 here)
      for (const h of [...must, ...sh]) s += h.get(d)!;
      out.set(d, f(s * (typeof body.boost === 'number' ? body.boost : 1)));
    }
    return out;
  }
}
/** A disjunction (min = 1) or conjunction (min = parts) of scored clauses: scores summed in double, rounded once. */
function sum(parts: Hits[], min: number): Hits {
  const out: Hits = new Map();
  const docs = new Set(parts.flatMap((p) => [...p.keys()]));
  for (const d of docs) {
    const hit = parts.filter((p) => p.has(d));
    if (hit.length < min) continue;
    let s = 0;
    for (const p of hit) s += p.get(d)!;
    out.set(d, f(s));
  }
  return out;
}

// ---------- requests ----------
export interface EsResult {
  kind: 'hits' | 'aggs' | 'tokens' | 'mapping';
  columns: string[];
  rows: unknown[][];
  /** What grading compares, one string per row (hits: `_id|score`, aggs: buckets without the aggregation's own name). */
  keys: string[];
  /** A fuzzy query ran: scores are not Lucene's, grade the documents only. */
  approx?: boolean;
  total?: number;
}
export interface EsRequest { method: string; index?: string; api: string; body: Obj; head: boolean }

/** Kibana console text: `#` / `//` comment lines, an optional `GET|POST <index>/<_search|_analyze|_mapping>` line, a JSON body. */
export function parseRequest(text: string): EsRequest {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((x) => !/^\s*(#|\/\/)/.test(x));
  while (lines.length && !lines[0].trim()) lines.shift();
  let method = 'GET', index: string | undefined, api = '_search';
  const head = /^\s*([A-Za-z]+)\s+(\S+)\s*$/.exec(lines[0] ?? '');
  if (head) {
    lines.shift();
    method = head[1].toUpperCase();
    if (method !== 'GET' && method !== 'POST') unsupported(`[${method}]: the simulation only reads (GET or POST)`);
    const m = /^\/?(?:([a-z0-9_.-]+)\/)?(_search|_analyze|_mapping)\/?$/.exec(head[2]);
    if (!m) return fail('illegal_argument_exception', `no handler found for uri [/${head[2].replace(/^\//, '')}] and method [${method}]`);
    [, index, api] = m;
  }
  const raw = lines.join('\n').trim();
  const body = raw ? parseJson(raw, 'body') : {};
  if (!isObj(body)) return fail('parsing_exception', 'request body must be a JSON object');
  return { method, index, api, body, head: !!head };
}

const FIELDDATA = (f0: string): string => `Text fields are not optimised for operations that require per-document field data like aggregations and sorting, so these operations are disabled by default. Please use a keyword field instead. Alternatively, set fielddata=true on [${f0}] in order to load field data by uninverting the inverted index. Note that this can use significant memory.`;
const tokenOf = (x: Json): string => (x === null ? 'VALUE_NULL' : Array.isArray(x) ? 'START_ARRAY' : typeof x === 'object' ? 'START_OBJECT' : typeof x === 'string' ? 'VALUE_STRING' : typeof x === 'number' ? 'VALUE_NUMBER' : 'VALUE_BOOLEAN');
const round = (x: unknown): string => (typeof x === 'number' ? x.toFixed(4) : String(x));

/** Runs one console request on the index. */
export function run(ix: EsIndex, text: string): EsResult {
  const r = parseRequest(text);
  if (r.index !== undefined && r.index !== ix.name) fail('index_not_found_exception', `no such index [${r.index}]`, 404);
  if (r.head && r.index === undefined && r.api !== '_analyze') fail('illegal_argument_exception', `${r.api} needs an index: ${r.method} ${ix.name}/${r.api}`);
  if (r.api === '_mapping') {
    const rows = [...ix.fields.values()].map((x) => [x.def.path, x.def.type]);
    return { kind: 'mapping', columns: ['field', 'type'], rows, keys: rows.map((x) => x.join('|')) };
  }
  if (r.api === '_analyze') return analyzeApi(r.index ? ix : { ...ix, analyzers: new Map(), filters: new Map(), fields: new Map() }, r.body);
  return searchApi(ix, r.body);
}

function analyzeApi(ix: EsIndex, b: Obj): EsResult {
  allow(b, ['analyzer', 'field', 'text', 'tokenizer', 'filter'], '_analyze');
  if (typeof b.text !== 'string' && !Array.isArray(b.text)) fail('action_request_validation_exception', 'Validation Failed: 1: text is missing;');
  const text = Array.isArray(b.text) ? b.text.map(String) : String(b.text);
  let ts: Tok[];
  if (b.tokenizer !== undefined || b.filter !== undefined) {
    const name = '\u0000adhoc';
    ts = analyze({ ...ix, analyzers: new Map([[name, { tokenizer: String(b.tokenizer ?? 'keyword'), filter: list(b.filter).map(String) }]]) }, name, text);
  } else if (b.field !== undefined) {
    const fi = ix.fields.get(String(b.field));
    ts = fi?.def.type === 'text' ? analyze(ix, fi.def.analyzer, text) : (Array.isArray(text) ? text : [text]).map((term, pos) => ({ term, pos }));
  } else ts = analyze(ix, String(b.analyzer ?? 'standard'), text);
  const rows = ts.map((t) => [t.term, t.pos]);
  return { kind: 'tokens', columns: ['token', 'position'], rows, keys: rows.map((x) => x.join('|')) };
}

function searchApi(ix: EsIndex, b: Obj): EsResult {
  for (const k of Object.keys(b)) if (!['query', 'size', 'from', 'sort', '_source', 'aggs', 'aggregations', 'track_total_hits'].includes(k)) fail('parsing_exception', `Unknown key for a ${tokenOf(b[k])} in [${k}].`);
  const s = new Searcher(ix);
  const hits = b.query === undefined ? all(ix, 1) : s.query(b.query);
  const aggs = b.aggs ?? b.aggregations;
  if (aggs !== undefined) return aggsApi(ix, aggs, [...hits.keys()].sort((x, y) => x - y));
  const size = b.size === undefined ? 10 : Number(b.size), from = b.from === undefined ? 0 : Number(b.from);
  if (!(size >= 0 && from >= 0)) fail('illegal_argument_exception', '[from] and [size] must be 0 or more');
  if (from + size > 10_000) fail('illegal_argument_exception', `Result window is too large, from + size must be less than or equal to: [10000] but was [${from + size}]. See the scroll api for a more efficient way to request large data sets. This limit can be set by changing the [index.max_result_window] index level setting.`);
  let order = [...hits.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]);
  let withScore = true;
  if (b.sort !== undefined) {
    const keys = list(b.sort).map((x) => (typeof x === 'string' ? [x, x === '_score' ? 'desc' : 'asc'] : isObj(x) && Object.keys(x).length === 1
      ? [Object.keys(x)[0], String(isObj(Object.values(x)[0]) ? (Object.values(x)[0] as Obj).order : Object.values(x)[0])] : fail('parsing_exception', '[sort] malformed')) as [string, string]);
    withScore = keys.some(([k]) => k === '_score');
    for (const [k] of keys) {
      if (k === '_score') continue;
      const fi = ix.fields.get(k) ?? fail('query_shard_exception', `No mapping found for [${k}] in order to sort on`);
      if (fi.def.type === 'text') fail('illegal_argument_exception', FIELDDATA(k));
    }
    const val = (d: number, k: string, desc: boolean): string | number | boolean | undefined => {
      const vs = ix.fields.get(k)!.vals[d];
      return vs.length ? [...vs].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)).at(desc ? -1 : 0) : undefined;
    };
    order = order.sort((x, y) => {
      for (const [k, dir] of keys) {
        const desc = dir === 'desc';
        if (k === '_score') { if (x[1] !== y[1]) return desc ? y[1] - x[1] : x[1] - y[1]; continue; }
        const a = val(x[0], k, desc), c = val(y[0], k, desc);
        if (a === c) continue;
        if (a === undefined) return 1; // missing values sort last
        if (c === undefined) return -1;
        return (a < c ? -1 : 1) * (desc ? -1 : 1);
      }
      return x[0] - y[0];
    });
  }
  const src = b._source;
  const cols = src === false ? [] : Array.isArray(src) ? src.map(String) : ix.cols;
  const page = order.slice(from, from + size);
  const rows = page.map(([d, sc]) => [ix.ids[d], withScore ? f32(sc) : null,
    ...cols.map((c) => { const v = ix.docs[d][c]; return Array.isArray(v) ? v.join(', ') : v ?? null; })]);
  return {
    kind: 'hits', columns: ['_id', '_score', ...cols], rows, total: hits.size, approx: s.approx || undefined,
    keys: rows.map((x) => (s.approx ? String(x[0]) : `${String(x[0])}|${round(x[1])}`)),
  };
}

function aggsApi(ix: EsIndex, aggs: Json, docs: number[]): EsResult {
  if (!isObj(aggs)) return fail('parsing_exception', 'Expected [START_OBJECT] under [aggs]');
  const rows: unknown[][] = [];
  const subNames = new Set<string>();
  const metric = (kind: string, field: string, ds: number[]): number | null => {
    const fi = ix.fields.get(field);
    if (fi && !numeric(fi.def.type)) fail('illegal_argument_exception', `Field [${field}] of type [${fi.def.type}] is not supported for aggregation [${kind}]`);
    const xs = fi ? ds.flatMap((d) => fi.vals[d] as number[]) : [];
    if (!xs.length) return kind === 'sum' ? 0 : null;
    const s = xs.reduce((a, x) => a + x, 0);
    return kind === 'avg' ? s / xs.length : kind === 'sum' ? s : kind === 'min' ? Math.min(...xs) : Math.max(...xs);
  };
  const out: { name: string; key: unknown; n: number; subs: Record<string, number | null> }[] = [];
  for (const [name, spec] of Object.entries(aggs)) {
    const ks = isObj(spec) ? Object.keys(spec) : [];
    const kind = ks.find((k) => k !== 'aggs' && k !== 'aggregations');
    if (!kind || !isObj(spec)) return fail('parsing_exception', `Aggregation definition for [${name}] does not specify an aggregation type`);
    if (kind !== 'terms') return kind === 'avg' || kind === 'sum' || kind === 'min' || kind === 'max' ? unsupported('a metric aggregation outside a terms aggregation') : fail('parsing_exception', `Unknown aggregation type [${kind}] did you mean [terms]?`);
    const t = spec.terms;
    if (!isObj(t) || typeof t.field !== 'string') return fail('illegal_argument_exception', `Required one of fields [field, script], but none were specified.`);
    const fi = ix.fields.get(t.field);
    if (fi?.def.type === 'text') fail('illegal_argument_exception', FIELDDATA(t.field));
    const count = new Map<string | number | boolean, number[]>();
    if (fi) for (const d of docs) for (const v of new Set(fi.vals[d])) count.set(v, [...(count.get(v) ?? []), d]);
    const size = t.size === undefined ? 10 : Number(t.size);
    const buckets = [...count.entries()].sort((x, y) => y[1].length - x[1].length || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).slice(0, size);
    const sub = isObj(spec.aggs) ? spec.aggs : isObj(spec.aggregations) ? spec.aggregations : {};
    for (const [key, ds] of buckets) {
      const subs: Record<string, number | null> = {};
      for (const [sn, ss] of Object.entries(sub)) {
        const [mk, mv] = one(ss, sn);
        if (!['avg', 'sum', 'min', 'max'].includes(mk)) unsupported(`the [${mk}] sub-aggregation`);
        if (!isObj(mv) || typeof mv.field !== 'string') fail('illegal_argument_exception', `Required one of fields [field, script], but none were specified.`);
        subs[sn] = metric(mk, (mv as Obj).field as string, ds);
        subNames.add(sn);
      }
      out.push({ name, key, n: ds.length, subs });
    }
  }
  const names = [...subNames];
  for (const o of out) rows.push([o.name, o.key, o.n, ...names.map((n) => o.subs[n] ?? null)]);
  return {
    kind: 'aggs', columns: ['agg', 'key', 'doc_count', ...names], rows, total: docs.length,
    keys: rows.map((x) => x.slice(1).map(round).join('|')),
  };
}
