/**
 * v47 R1 (L1014–L1019), v48 L4–L5 (L1210–L1219): BoonData's Elasticsearch-style teaching interpreter. Pure TS, no dependency,
 * no eval: a request is Kibana-console text (`GET products/_search` + a JSON body) read with JSON.parse and walked as data. It is
 * a SIMULATION of a subset, never Elasticsearch code: analyzers (standard / whitespace / keyword tokenizers; lowercase,
 * asciifolding, edge_ngram, ngram, single-word synonym / synonym_graph filters), an inverted index with positions and offsets,
 * mappings (text, keyword, numbers, boolean, date, dense_vector; dynamic mapping = text + `.keyword`), the queries match
 * (operator, fuzziness), match_phrase (slop), multi_match (best_fields, most_fields, phrase; `^` boosts, tie_breaker), dis_max,
 * term, terms, range, bool, match_all, function_score (weight, field_value_factor), a top-level `knn` (exact), highlight,
 * search_after, the terms and date_histogram aggregations with avg/sum/min/max sub-aggregations, sort, from/size, `_source`,
 * plus `_analyze`, `_mapping`, `_count`, `_segments` and the state flips `_refresh` / `_forcemerge` (several requests per run).
 *
 * Scores follow Lucene's BM25 as Elasticsearch builds it (checked against the sources on branch main, 2026-11-27):
 * - ES SimilarityProviders.createBM25Similarity → LegacyBM25Similarity(k1 = 1.2f, b = 0.75f, discount_overlaps = true), whose
 *   scorer multiplies the boost by (1 + k1): the explain output's "boost 2.2".
 * - Lucene BM25Similarity: idf = (float) ln(1 + (N − n + 0.5) / (n + 0.5)) with N = docs that have the field; avgdl =
 *   (float) (sumTotalTermFreq / N); per-length cache 1f / (k1 · ((1 − b) + b · dl / avgdl)); score = w − w / (1 + freq · cache),
 *   w = boost · idf; dl = SmallFloat.byte4ToInt(intToByte4(tokens − overlaps)), exact below 40 tokens.
 * - Fields without norms (keyword, boolean) score with dl = 1; their freq is 1.
 * - Phrase: idf = the sum of the terms' float idfs; exact phrase freq = the number of matches; sloppy phrase (SloppyPhraseMatcher,
 *   PhraseScorer): freq = Σ 1f / (1f + matchLength) over the matches nextMatch() finds (ported below, phrases without a repeated
 *   word only).
 * - Same-position query tokens (synonyms) → SynonymQuery (QueryBuilder.analyzeBoolean / analyzeMultiBoolean): df = the max df of
 *   its terms, freq in a document = the sum of the terms' freqs.
 * - dis_max / multi_match best_fields (DisjunctionMaxScorer): (float) (max + Σ others (double) · tie_breaker), tie_breaker 0.
 * - function_score (FunctionScoreQuery, CombineFunction, FieldValueFactorFunction): functions in double, one float cast at the
 *   combine; `log1p` = log10(x + 1).
 * - Per-shard statistics (query_then_fetch) unless `search_type=dfs_query_then_fetch`; deleted documents keep counting in the
 *   statistics until a merge (docs: "Getting consistent scoring"). A document's shard is given in the lab data (`_shard`): the
 *   simulation does not hash `_routing`.
 * Everything is float32 (Math.fround) where Lucene uses float. Known ceilings (ponytail): bool sums are summed in double then
 * rounded once; fuzzy scores do not reproduce Lucene's blended rewrite, so a fuzzy result is graded on its documents only
 * (`approx`); the standard tokenizer is a regex approximation of UAX #29 good for the lesson data; one index per run, flat
 * documents; a highlight fragment = the whole value; `knn` is exact (Elasticsearch's HNSW is approximate).
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
const num = (x: Json | undefined, dflt: number): number => (typeof x === 'number' ? x : x === undefined ? dflt : Number(x));

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

/** Lucene SloppyPhraseMatcher (no repeated word): `docPos[i]` = the positions of phrase word i, `off[i]` its offset in the
 * phrase. Returns the sloppy freq Σ 1 / (1 + matchLength), 0 when no window fits `slop`. A port of initSimple + nextMatch. */
export function sloppyFreq(docPos: number[][], off: number[], slop: number): number {
  const pps = docPos.map((ps, ord) => ({ ps, i: 0, ord, offset: off[ord], position: ps[0] - off[ord] }));
  const less = (a: typeof pps[0], b: typeof pps[0]): boolean => (a.position === b.position ? (a.offset === b.offset ? a.ord < b.ord : a.offset < b.offset) : a.position < b.position);
  const pq: typeof pps = [];
  const push = (p: typeof pps[0]): void => { pq.push(p); pq.sort((a, b) => (less(a, b) ? -1 : less(b, a) ? 1 : 0)); };
  let end = -Infinity;
  for (const pp of pps) { if (pp.position > end) end = pp.position; push(pp); }
  let positioned = true;
  let matchLength = Infinity;
  const advance = (pp: typeof pps[0]): boolean => {
    if (pp.i + 1 >= pp.ps.length) return false;
    pp.i++;
    pp.position = pp.ps[pp.i] - pp.offset;
    if (pp.position > end) end = pp.position;
    return true;
  };
  const nextMatch = (): boolean => {
    if (!positioned) return false;
    let pp = pq.shift()!;
    matchLength = end - pp.position;
    let next = pq[0].position;
    while (advance(pp)) {
      if (pp.position > next) {
        push(pp);
        if (matchLength <= slop) return true;
        pp = pq.shift()!;
        next = pq[0].position;
        matchLength = end - pp.position;
      } else if (end - pp.position < matchLength) matchLength = end - pp.position;
    }
    positioned = false;
    return matchLength <= slop;
  };
  if (!nextMatch()) return 0;
  let freq = f(1 / f(1 + matchLength));
  while (nextMatch()) freq = f(freq + f(1 / f(1 + matchLength)));
  return freq;
}

// ---------- analysis ----------
export interface Tok { term: string; pos: number; start: number; end: number }
const WORD = /[\p{L}\p{M}\p{N}_]+(?:['.][\p{L}\p{M}\p{N}_]+)*/gu; // ponytail: UAX #29 approximated; enough for the lesson data
const TOKENIZERS: Record<string, (s: string) => Tok[]> = {
  standard: (s) => [...s.normalize('NFC').matchAll(WORD)].map((m, i) => ({ term: m[0], pos: i, start: m.index, end: m.index + m[0].length })),
  whitespace: (s) => [...s.matchAll(/\S+/g)].map((m, i) => ({ term: m[0], pos: i, start: m.index, end: m.index + m[0].length })),
  keyword: (s) => [{ term: s, pos: 0, start: 0, end: s.length }],
};
/** asciifolding for Vietnamese: strip the combining marks after NFD, and đ/Đ (a letter of its own, not a mark). */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
/** A token filter; `norm` analyzes one rule word with the chain before this filter (synonym rules are read that way). */
type Filt = (t: Tok[], norm: (w: string) => string[]) => Tok[];
const grams = (edge: boolean, min: number, max: number): Filt => (ts) => ts.flatMap((t) => {
  const cp = [...t.term];
  const out: Tok[] = [];
  for (let s = 0; s < (edge ? 1 : cp.length); s++) for (let n = min; n <= max && s + n <= cp.length; n++) out.push({ ...t, term: cp.slice(s, s + n).join('') });
  return out;
});
/** synonym / synonym_graph with Solr rules: `a, b` (each also emits the others) and `a, b => c` (replaced). One word per side. */
const synonyms = (rules: string[]): Filt => (ts, norm) => {
  const map = new Map<string, string[]>();
  const word = (w: string): string => {
    const t = norm(w.trim());
    if (t.length !== 1) unsupported(`a multi-word synonym [${w.trim()}]`);
    return t[0];
  };
  for (const r of rules) {
    const [lhs, rhs] = r.split('=>');
    const left = lhs.split(',').filter((x) => x.trim()).map(word);
    const out = rhs === undefined ? left : rhs.split(',').filter((x) => x.trim()).map(word);
    for (const w of left) map.set(w, [...new Set([...(rhs === undefined ? [w] : []), ...(map.get(w) ?? []).filter((x) => rhs === undefined || x !== w), ...out])]);
  }
  return ts.flatMap((t) => (map.get(t.term) ?? [t.term]).map((term) => ({ ...t, term })));
};
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
const TYPES = ['text', 'keyword', 'long', 'integer', 'float', 'double', 'boolean', 'date', 'dense_vector'] as const;
type FType = (typeof TYPES)[number];
interface FieldDef { path: string; type: FType; analyzer: string; search: string; format?: string; dims?: number; similarity?: string }
interface FieldIdx {
  def: FieldDef;
  post: Map<string, Map<number, number[]>>;
  len: number[];
  /** Tokens per document, overlaps included (sumTotalTermFreq's share); keyword/boolean: distinct values. */
  ttf: number[];
  docCount: number;
  sumTtf: number;
  /** Raw values per document (keyword, numbers, booleans, dates: term/range/sort/aggs). */
  vals: (string | number | boolean)[][];
  /** dense_vector values. */
  vec: (number[] | undefined)[];
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
  /** The shard of each document (lab data `_shard`, default 0) and the number of shards. */
  shard: number[];
  shards: number;
  /** Deleted, not yet merged: still in the statistics, never a hit. */
  deleted: boolean[];
  /** The segment of each searchable document (lab data `_seg`, default `_0`). */
  seg: string[];
  /** The parsed setup, kept so `_refresh` / `_forcemerge` can rebuild the index from it. */
  seed: Obj;
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
  const filt = (fl: string): Filt => ix.filters.get(fl) ?? BUILTIN_FILTERS[fl] ?? fail('illegal_argument_exception', `failed to find filter under [${fl}]`);
  const tok = TOKENIZERS[a.tokenizer] ?? fail('illegal_argument_exception', `failed to find tokenizer under [${a.tokenizer}]`);
  const chain = (s: string, upto: number): Tok[] => {
    let ts = tok(s);
    for (let k = 0; k < upto; k++) ts = filt(a.filter[k])(ts, (w) => chain(w, k).map((t) => t.term));
    return ts;
  };
  const out: Tok[] = [];
  let base = 0;
  for (const s of Array.isArray(text) ? text : [text]) {
    for (const t of chain(s, a.filter.length)) out.push({ ...t, pos: base + t.pos });
    base = (out.at(-1)?.pos ?? base - 101) + 101; // position_increment_gap 100 between the values of an array
  }
  return out;
}

const META = new Set(['_id', '_shard', '_seg', '_deleted', '_refreshed']);
/** The lab's setup: `{ "index", "settings"?, "mappings"?, "docs": [...] }`. A document may carry `_id`, and for the scale
 * lessons `_shard` (which shard holds it), `_seg` (its segment), `_deleted: true` (deleted, not merged yet) or
 * `_refreshed: false` (indexed but not refreshed: in no searchable segment yet). */
export function buildIndex(setup: string | Obj): EsIndex {
  const j = typeof setup === 'string' ? parseJson(setup, 'setup') : setup;
  if (!isObj(j) || typeof j.index !== 'string' || !Array.isArray(j.docs)) return fail('mapper_parsing_exception', 'setup needs "index" and "docs"');
  const settings = isObj(j.settings) ? j.settings : {};
  const shards = num(settings.number_of_shards ?? (isObj(settings.index) ? settings.index.number_of_shards : undefined), 1);
  const ix: EsIndex = { name: j.index, ids: [], docs: [], fields: new Map(), cols: [], analyzers: new Map(), filters: new Map(), shard: [], shards, deleted: [], seg: [], seed: j };
  const an = isObj(settings.analysis) ? settings.analysis : {};
  for (const [k, v] of Object.entries(isObj(an.filter) ? an.filter : {})) {
    if (!isObj(v)) continue;
    const min = Number(v.min_gram ?? 1), max = Number(v.max_gram ?? 2);
    ix.filters.set(k, v.type === 'edge_ngram' ? grams(true, min, max) : v.type === 'ngram' ? grams(false, min, max)
      : v.type === 'synonym' || v.type === 'synonym_graph' ? synonyms(Array.isArray(v.synonyms) ? v.synonyms.map(String) : fail('illegal_argument_exception', `synonym requires either [synonyms] or [synonyms_path] to be configured`))
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
    defs.set(path, { path, type, analyzer, search: String(p.search_analyzer ?? analyzer), format: typeof p.format === 'string' ? p.format : undefined,
      dims: typeof p.dims === 'number' ? p.dims : undefined, similarity: type === 'dense_vector' ? String(p.similarity ?? 'cosine') : undefined });
    for (const [sub, sp] of Object.entries(isObj(p.fields) ? p.fields : {})) if (isObj(sp)) add(`${path}.${sub}`, sp);
  };
  const props = isObj(j.mappings) && isObj(j.mappings.properties) ? j.mappings.properties : {};
  for (const [k, p] of Object.entries(props)) if (isObj(p)) { add(k, p); ix.cols.push(k); }
  j.docs.forEach((raw, i) => {
    if (!isObj(raw)) return fail('mapper_parsing_exception', 'a document must be a JSON object');
    if (raw._refreshed === false) return; // in the indexing buffer: not searchable, not in the statistics
    const doc: Obj = Object.fromEntries(Object.entries(raw).filter(([k]) => !META.has(k)));
    const sh = num(raw._shard, 0);
    if (!(Number.isInteger(sh) && sh >= 0 && sh < shards)) fail('mapper_parsing_exception', `_shard [${String(raw._shard)}] is not a shard of an index with ${shards} shards`);
    ix.ids.push(raw._id === undefined ? String(i + 1) : String(raw._id));
    ix.docs.push(doc);
    ix.shard.push(sh);
    ix.deleted.push(raw._deleted === true);
    ix.seg.push(typeof raw._seg === 'string' ? raw._seg : '_0');
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
    const fi: FieldIdx = { def, post: new Map(), len: [], ttf: [], docCount: 0, sumTtf: 0, vals: [], vec: [] };
    ix.docs.forEach((doc, d) => {
      const top = def.path.split('.')[0];
      const v = doc[def.path] ?? (def.path !== top ? doc[top] : undefined);
      fi.len[d] = 0;
      fi.ttf[d] = 0;
      fi.vals[d] = [];
      if (def.type === 'dense_vector') {
        if (v === undefined || v === null) return;
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'number')) fail('mapper_parsing_exception', `failed to parse field [${def.path}] of type [dense_vector]`);
        const xs = v as number[];
        if (def.dims !== undefined && xs.length !== def.dims) fail('mapper_parsing_exception', `The [dense_vector] field [${def.path}] in doc [${ix.ids[d]}] has a different number of dimensions [${xs.length}] than defined in the mapping [${def.dims}]`);
        if (def.similarity === 'cosine' && xs.every((x) => x === 0)) fail('illegal_argument_exception', `The [cosine] similarity does not support vectors with zero magnitude.`);
        fi.vec[d] = xs.map(f);
        fi.docCount++;
        return;
      }
      const vs = (Array.isArray(v) ? v : [v]).filter((x): x is string | number | boolean => x !== null && x !== undefined && !isObj(x) && !Array.isArray(x));
      if (def.path !== top && def.type === 'keyword') vs.splice(0, vs.length, ...vs.filter((x) => String(x).length <= 256)); // ignore_above 256
      fi.vals[d] = numeric(def.type) ? vs.map(Number) : vs;
      if (!vs.length) return;
      fi.docCount++;
      if (def.type === 'text') {
        const ts = analyze(ix, def.analyzer, vs.map(String));
        let prev = -1;
        for (const t of ts) {
          const p = fi.post.get(t.term) ?? new Map<number, number[]>();
          fi.post.set(t.term, p.set(d, [...(p.get(d) ?? []), t.pos]));
          if (t.pos !== prev) fi.len[d]++; // discount_overlaps: a token at the same position (an n-gram, a synonym) is not counted
          prev = t.pos;
        }
        fi.ttf[d] = ts.length;
        fi.sumTtf += ts.length;
      } else if (scored(def.type)) {
        for (const x of new Set(vs.map(String))) {
          const p = fi.post.get(x) ?? new Map<number, number[]>();
          fi.post.set(x, p.set(d, [0]));
          fi.ttf[d]++;
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
  /** Statistics over every shard (dfs_query_then_fetch) instead of each document's own shard. */
  dfs = false;
  /** Terms the query matched per field (highlight); `phrased` = fields a phrase query ran on. */
  hl = new Map<string, Set<string>>();
  phrased = new Set<string>();
  private quiet = 0;
  private ix: EsIndex;
  private memo = new Map<string, { docCount: number; avgdl: number }>();
  constructor(ix: EsIndex) { this.ix = ix; }
  field(name: string): FieldIdx | undefined { return this.ix.fields.get(name); }
  private scope(d: number): number { return this.dfs || this.ix.shards === 1 ? -1 : this.ix.shard[d]; }
  private inScope(d: number, s: number): boolean { return s === -1 || this.ix.shard[d] === s; }
  private stats(fi: FieldIdx, s: number): { docCount: number; avgdl: number } {
    const k = `${fi.def.path}|${s}`;
    let st = this.memo.get(k);
    if (!st) {
      let n = 0, sum = 0;
      fi.ttf.forEach((t, d) => { if (this.inScope(d, s) && (fi.vals[d].length || fi.vec[d])) { n++; sum += t; } });
      this.memo.set(k, st = { docCount: n, avgdl: f(sum / n) });
    }
    return st;
  }
  private df(p: Map<number, number[]> | undefined, s: number): number {
    if (!p) return 0;
    if (s === -1) return p.size;
    let n = 0;
    for (const d of p.keys()) if (this.ix.shard[d] === s) n++;
    return n;
  }
  private mark(fi: FieldIdx, terms: string[]): void {
    if (this.quiet || fi.def.type !== 'text') return;
    const set = this.hl.get(fi.def.path) ?? new Set<string>();
    for (const t of terms) set.add(t);
    this.hl.set(fi.def.path, set);
  }
  /** One position of a query: a term, or a SynonymQuery when several tokens share the position. */
  termHits(fi: FieldIdx, terms: string[], boost: number, dfOverride?: number): Hits {
    this.mark(fi, terms);
    const posts = [...new Set(terms)].map((t) => fi.post.get(t)).filter((p): p is Map<number, number[]> => !!p);
    const out: Hits = new Map();
    const text = fi.def.type === 'text';
    for (const p of posts) for (const d of p.keys()) {
      if (out.has(d)) continue;
      const s = this.scope(d);
      const df = dfOverride ?? Math.max(...posts.map((q) => this.df(q, s)));
      const { docCount, avgdl } = this.stats(fi, s);
      let freq = 0;
      for (const q of posts) freq = f(freq + (text ? (q.get(d)?.length ?? 0) : q.has(d) ? 1 : 0));
      out.set(d, bm25(idfOf(df, docCount), freq, text ? normLength(fi.len[d]) : 1, avgdl, boost));
    }
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
      case 'multi_match': return this.multi(body);
      case 'dis_max': return this.dismax(body);
      case 'term': return this.term(body);
      case 'terms': return this.terms(body);
      case 'range': return this.range(body);
      case 'bool': return this.bool(body);
      case 'function_score': return this.functionScore(body);
      case 'query_string': case 'simple_query_string': case 'wildcard': case 'regexp': case 'prefix': case 'fuzzy':
      case 'exists': case 'ids': case 'nested': case 'script': case 'script_score': case 'constant_score': case 'combined_fields': case 'knn':
        return unsupported(`the [${kind}] query`);
      default: return fail('parsing_exception', `unknown query [${kind}]`);
    }
  }
  private exact(fi: FieldIdx, v: Json, boost: number): Hits {
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return fail('parsing_exception', '[term] query does not support an object or array value');
    if (scored(fi.def.type)) return this.termHits(fi, [String(v)], boost);
    const want = numeric(fi.def.type) ? Number(v) : String(v);
    if (numeric(fi.def.type) && Number.isNaN(want)) return new Map(); // ponytail: ES's lenient false → number_format_exception
    return new Map(fi.vals.flatMap((vs, d) => (vs.includes(want) ? [[d, boost] as [number, number]] : [])));
  }
  /** The match query on one field (shared by match and multi_match). */
  private matchOn(fi: FieldIdx, query: Json, operator: Json | undefined, fz: Json | undefined, boost: number): Hits {
    if (fi.def.type === 'dense_vector') return fail('illegal_argument_exception', `Field [${fi.def.path}] of type [dense_vector] does not support term queries`);
    if (fi.def.type !== 'text') return this.exact(fi, query, boost);
    const toks = analyze(this.ix, fi.def.search, String(query));
    const groups: string[][] = [];
    toks.forEach((t, i) => (i && toks[i - 1].pos === t.pos ? groups.at(-1)!.push(t.term) : groups.push([t.term])));
    const and = String(operator ?? 'or').toLowerCase() === 'and';
    const parts = groups.map((g) => {
      if (fz === undefined || fz === 0 || fz === '0') return this.termHits(fi, g, boost);
      if (g.length > 1) unsupported('fuzziness on a synonym');
      const t = g[0];
      const len = [...t].length;
      const max = fz === 'AUTO' ? (len <= 2 ? 0 : len <= 5 ? 1 : 2) : Number(fz);
      if (!(max >= 0 && max <= 2)) fail('parsing_exception', `[match] fuzziness [${String(fz)}] must be 0, 1, 2 or AUTO`);
      this.approx = true; // ponytail: no blended rewrite; graded on the documents only
      const near = [...fi.post.keys()].map((x) => [x, edits(t, x)] as const).filter(([, e]) => e <= max).slice(0, 50);
      const df = Math.max(0, ...near.map(([x]) => fi.post.get(x)!.size));
      return sum(near.map(([x, e]) => this.termHits(fi, [x], boost * (1 - e / Math.min(len, [...x].length)), df)), 1);
    });
    return parts.length ? sum(parts, and ? parts.length : 1) : new Map();
  }
  private match(body: Json): Hits {
    const [name, spec] = one(body, 'match');
    const o: Obj = isObj(spec) ? spec : { query: spec };
    allow(o, ['query', 'operator', 'fuzziness', 'boost'], 'match');
    const fi = this.field(name);
    if (!fi || o.query === undefined || o.query === null) return new Map();
    return this.matchOn(fi, o.query, o.operator, o.fuzziness, num(o.boost, 1));
  }
  private phraseOn(fi: FieldIdx, query: Json, slop: number, boost: number): Hits {
    if (fi.def.type !== 'text') return this.exact(fi, query, boost);
    this.phrased.add(fi.def.path);
    const ts = analyze(this.ix, fi.def.search, String(query));
    if (new Set(ts.map((t) => t.pos)).size !== ts.length) unsupported('a phrase with synonyms (MultiPhraseQuery)');
    if (ts.length <= 1) return ts.length ? this.termHits(fi, [ts[0].term], boost) : new Map();
    if (slop > 0 && new Set(ts.map((t) => t.term)).size !== ts.length) unsupported('a sloppy phrase that repeats a word');
    const posts = ts.map((t) => fi.post.get(t.term));
    if (posts.some((p) => !p)) return new Map();
    const out: Hits = new Map();
    const p0 = ts[0].pos;
    for (const [d, starts] of posts[0]!) {
      if (!posts.every((p) => p!.has(d))) continue;
      const freq = slop > 0 ? sloppyFreq(posts.map((p) => p!.get(d)!), ts.map((t) => t.pos - p0), slop)
        : starts.filter((st) => ts.every((t, i) => posts[i]!.get(d)?.includes(st + t.pos - p0))).length;
      if (!freq) continue;
      const s = this.scope(d);
      let idfSum = 0;
      for (const p of posts) idfSum += idfOf(this.df(p, s), this.stats(fi, s).docCount); // Lucene sums the float idfs in double, then casts
      out.set(d, bm25(f(idfSum), freq, normLength(fi.len[d]), this.stats(fi, s).avgdl, boost));
    }
    return out;
  }
  private phrase(body: Json): Hits {
    const [name, spec] = one(body, 'match_phrase');
    const o: Obj = isObj(spec) ? spec : { query: spec };
    allow(o, ['query', 'slop', 'boost'], 'match_phrase');
    const slop = num(o.slop, 0);
    if (!(Number.isInteger(slop) && slop >= 0)) fail('parsing_exception', '[match_phrase] slop must be a whole number of 0 or more');
    const fi = this.field(name);
    if (!fi || o.query === undefined || o.query === null) return new Map();
    return this.phraseOn(fi, o.query, slop, num(o.boost, 1));
  }
  /** multi_match: one match (or match_phrase) per field, `name^3` boosts; best_fields / phrase = dis_max, most_fields = sum. */
  private multi(body: Json): Hits {
    if (!isObj(body)) return fail('parsing_exception', '[multi_match] query malformed');
    allow(body, ['query', 'fields', 'type', 'tie_breaker', 'operator', 'slop', 'boost', 'fuzziness'], 'multi_match');
    if (body.query === undefined) fail('parsing_exception', 'No text specified for multi_match query');
    const type = String(body.type ?? 'best_fields');
    if (!['best_fields', 'most_fields', 'phrase'].includes(type)) unsupported(`multi_match type [${type}]`);
    const specs = Array.isArray(body.fields) ? body.fields.map(String) : typeof body.fields === 'string' ? [body.fields] : ['*'];
    const fields: [FieldIdx, number][] = [];
    for (const sp of specs) {
      const m = /^([^\^]+)(?:\^([0-9.]+))?$/.exec(sp) ?? fail('parsing_exception', `[multi_match] bad field [${sp}]`);
      const re = new RegExp(`^${m[1].replace(/[.+?(){}|[\]\\$]/g, '\\$&').replace(/\*/g, '[^.]*')}$`);
      for (const fi of this.ix.fields.values()) if (re.test(fi.def.path) && fi.def.type !== 'dense_vector' && (m[1].includes('*') ? fi.def.type === 'text' || fi.def.type === 'keyword' : true)) fields.push([fi, Number(m[2] ?? 1)]);
    }
    const boost = num(body.boost, 1);
    const parts = fields.map(([fi, b]) => (type === 'phrase' ? this.phraseOn(fi, body.query!, num(body.slop, 0), f(b * boost)) : this.matchOn(fi, body.query!, body.operator, body.fuzziness, f(b * boost))));
    return type === 'most_fields' ? sum(parts, 1) : dismax(parts, num(body.tie_breaker, 0));
  }
  private dismax(body: Json): Hits {
    if (!isObj(body) || !Array.isArray(body.queries)) return fail('parsing_exception', '[dis_max] requires \'queries\' field with at least one clause');
    allow(body, ['queries', 'tie_breaker', 'boost'], 'dis_max');
    const out = dismax(body.queries.map((q) => this.query(q)), num(body.tie_breaker, 0));
    const b = num(body.boost, 1);
    return b === 1 ? out : new Map([...out].map(([d, s]) => [d, f(s * b)]));
  }
  private term(body: Json): Hits {
    const [name, spec] = one(body, 'term');
    const o: Obj = isObj(spec) ? spec : { value: spec };
    allow(o, ['value', 'boost'], 'term');
    const fi = this.field(name);
    return fi && o.value !== undefined ? this.exact(fi, o.value, num(o.boost, 1)) : new Map();
  }
  private terms(body: Json): Hits {
    if (!isObj(body)) return fail('parsing_exception', '[terms] query malformed');
    const boost = num(body.boost, 1);
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
    const isNum = numeric(fi.def.type);
    const cmp = (a: string | number | boolean, b: Json): number => (isNum ? Number(a) - Number(b) : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
    const ok = (v: string | number | boolean): boolean => (spec.gt === undefined || cmp(v, spec.gt) > 0) && (spec.gte === undefined || cmp(v, spec.gte) >= 0)
      && (spec.lt === undefined || cmp(v, spec.lt) < 0) && (spec.lte === undefined || cmp(v, spec.lte) <= 0);
    const boost = num(spec.boost, 1);
    return new Map(fi.vals.flatMap((vs, d) => (vs.some(ok) ? [[d, boost] as [number, number]] : [])));
  }
  private bool(body: Json): Hits {
    if (!isObj(body)) return fail('parsing_exception', '[bool] query malformed, no start_object after query name');
    allow(body, ['must', 'should', 'filter', 'must_not', 'minimum_should_match', 'boost'], 'bool');
    const must = list(body.must).map((q) => this.query(q));
    const should = list(body.should).map((q) => this.query(q));
    const filter = list(body.filter).map((q) => this.query(q));
    this.quiet++; // the highlighter skips MUST_NOT clauses
    const not = list(body.must_not).map((q) => this.query(q));
    this.quiet--;
    if (!must.length && !should.length && !filter.length && !not.length) return all(this.ix, 1);
    const msm = body.minimum_should_match !== undefined ? Number(body.minimum_should_match) : must.length || filter.length ? 0 : 1;
    const out: Hits = new Map();
    for (let d = 0; d < this.ix.docs.length; d++) {
      if (!must.every((h) => h.has(d)) || !filter.every((h) => h.has(d)) || not.some((h) => h.has(d))) continue;
      const sh = should.filter((h) => h.has(d));
      if (sh.length < msm) continue;
      let s = 0; // query context only: filter and must_not add nothing (ponytail: a must_not-only bool scores 0 here)
      for (const h of [...must, ...sh]) s += h.get(d)!;
      out.set(d, f(s * num(body.boost, 1)));
    }
    return out;
  }
  /** function_score with `weight` and `field_value_factor` functions (ES FunctionScoreQuery, in double, one float cast). */
  private functionScore(body: Json): Hits {
    if (!isObj(body)) return fail('parsing_exception', '[function_score] malformed query');
    allow(body, ['query', 'functions', 'field_value_factor', 'weight', 'score_mode', 'boost_mode', 'max_boost', 'min_score', 'boost'], 'function_score');
    const inner = body.query === undefined ? all(this.ix, 1) : this.query(body.query);
    if (Array.isArray(body.functions) && (body.field_value_factor !== undefined || body.weight !== undefined)) fail('parsing_exception', 'failed to parse [function_score] query. already found [functions] array, now encountering [field_value_factor].');
    const specs: Obj[] = Array.isArray(body.functions) ? body.functions.map((x) => (isObj(x) ? x : fail('parsing_exception', '[function_score] a function must be an object')))
      : body.field_value_factor !== undefined || body.weight !== undefined ? [{ ...(body.field_value_factor !== undefined ? { field_value_factor: body.field_value_factor } : {}), ...(body.weight !== undefined ? { weight: body.weight } : {}) }] : [];
    const fns = specs.map((sp) => {
      allow(sp, ['filter', 'weight', 'field_value_factor', 'gauss', 'linear', 'exp', 'script_score', 'random_score'], 'function_score');
      for (const k of ['gauss', 'linear', 'exp', 'script_score', 'random_score']) if (sp[k] !== undefined) unsupported(`the [${k}] function`);
      this.quiet++;
      const filter = sp.filter === undefined ? undefined : this.query(sp.filter);
      this.quiet--;
      const weight = sp.weight === undefined ? 1 : f(num(sp.weight, 1));
      const fv = sp.field_value_factor;
      let score: (d: number) => number = () => 1;
      if (fv !== undefined) {
        if (!isObj(fv) || typeof fv.field !== 'string') return fail('parsing_exception', '[field_value_factor] requires a [field]');
        const fi = this.field(fv.field);
        if (fi && !numeric(fi.def.type) && fi.def.type !== 'date') fail('illegal_argument_exception', `Field [${fv.field}] of type [${fi.def.type}] is not supported for [field_value_factor]`);
        const factor = f(num(fv.factor, 1));
        const mod = String(fv.modifier ?? 'none').toLowerCase();
        const M: Record<string, (n: number) => number> = { none: (n) => n, log: Math.log10, log1p: (n) => Math.log10(n + 1), log2p: (n) => Math.log10(n + 2), ln: Math.log, ln1p: Math.log1p, ln2p: (n) => Math.log1p(n + 1), square: (n) => n ** 2, sqrt: Math.sqrt, reciprocal: (n) => 1 / n };
        const apply = M[mod] ?? fail('illegal_argument_exception', `Illegal modifier: ${mod}`);
        score = (d) => {
          const vs = fi?.vals[d] as number[] | undefined;
          let v: number;
          if (vs?.length) v = Math.min(...vs); // ponytail: a multi-valued field reads its first (smallest) doc value
          else if (fv.missing !== undefined) v = num(fv.missing, 0);
          else return fail('illegal_argument_exception', `Missing value for field [${String(fv.field)}]`);
          const r = apply(v * factor);
          if (!Number.isFinite(r)) fail('illegal_argument_exception', `Result of field modification [${mod}(${v * factor})] must be a number`);
          return r;
        };
      }
      return { filter, weight, score: (d: number) => score(d) * weight };
    });
    const scoreMode = String(body.score_mode ?? 'multiply'), boostMode = String(body.boost_mode ?? 'multiply');
    if (!['multiply', 'sum', 'avg', 'first', 'max', 'min'].includes(scoreMode)) fail('parsing_exception', `failed to parse [function_score] query. illegal score_mode [${scoreMode}]`);
    const maxBoost = num(body.max_boost, f(3.4028234663852886e38));
    const minScore = body.min_score === undefined ? undefined : num(body.min_score, 0);
    const out: Hits = new Map();
    for (const [d, sub] of inner) {
      let final = sub;
      if (fns.length) {
        const on = fns.filter((fn) => !fn.filter || fn.filter.has(d));
        let factor = 1;
        if (scoreMode === 'multiply') for (const fn of on) factor *= fn.score(d);
        else if (scoreMode === 'first') factor = on.length ? on[0].score(d) : 1;
        else if (scoreMode === 'max') factor = on.length ? Math.max(...on.map((fn) => fn.score(d))) : 1;
        else if (scoreMode === 'min') factor = on.length ? Math.min(...on.map((fn) => fn.score(d))) : 1;
        else if (on.length) {
          let total = 0, wsum = 0;
          for (const fn of on) { total += fn.score(d); wsum += fn.weight; }
          factor = scoreMode === 'avg' && wsum !== 0 ? total / wsum : total;
        }
        const g = Math.min(factor, maxBoost);
        final = boostMode === 'multiply' ? f(sub * g) : boostMode === 'replace' ? f(g) : boostMode === 'sum' ? f(sub + g) : boostMode === 'avg' ? f((g + sub) / 2)
          : boostMode === 'min' ? f(Math.min(sub, g)) : boostMode === 'max' ? f(Math.max(sub, g)) : fail('parsing_exception', `failed to parse [function_score] query. illegal boost_mode [${boostMode}]`);
        if (final < 0 || Number.isNaN(final)) fail('illegal_argument_exception', `function score query returned an invalid score: ${final} for doc: ${d}`);
      }
      if (minScore !== undefined && final < minScore) continue;
      out.set(d, f(final * num(body.boost, 1)));
    }
    return out;
  }
  /** Top-level `knn`, exact over every document (Elasticsearch's HNSW is approximate; on lesson-sized data it finds the same k). */
  knn(spec: Json): Hits {
    if (!isObj(spec)) return fail('parsing_exception', '[knn] malformed');
    allow(spec, ['field', 'query_vector', 'k', 'num_candidates', 'filter', 'boost', 'similarity'], 'knn');
    const fi = typeof spec.field === 'string' ? this.field(spec.field) : undefined;
    if (!fi || fi.def.type !== 'dense_vector') return fail('illegal_argument_exception', `[knn] queries are only supported on [dense_vector] fields`);
    const qv = Array.isArray(spec.query_vector) && spec.query_vector.every((x) => typeof x === 'number') ? (spec.query_vector as number[]).map(f) : fail('illegal_argument_exception', '[knn] requires a numeric [query_vector]');
    if (fi.def.dims !== undefined && qv.length !== fi.def.dims) fail('illegal_argument_exception', `The query vector has a different number of dimensions [${qv.length}] than the document vectors [${fi.def.dims}].`);
    const k = num(spec.k, 10), nc = num(spec.num_candidates, Math.max(Math.round(1.5 * k), 100));
    if (!(k >= 1)) fail('illegal_argument_exception', '[k] must be greater than 0');
    if (nc < k) fail('illegal_argument_exception', `[num_candidates] cannot be less than [k]`);
    const filters = list(spec.filter).map((q) => { this.quiet++; const h = this.query(q); this.quiet--; return h; });
    const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * b[i], 0);
    const sim = fi.def.similarity;
    const scores: [number, number][] = [];
    fi.vec.forEach((v, d) => {
      if (!v || this.ix.deleted[d] || !filters.every((h) => h.has(d))) return;
      let s: number;
      if (sim === 'l2_norm') s = 1 / (1 + v.reduce((acc, x, i) => acc + (x - qv[i]) ** 2, 0));
      else if (sim === 'dot_product') s = (1 + dot(v, qv)) / 2;
      else if (sim === 'cosine') s = (1 + dot(v, qv) / Math.sqrt(dot(v, v) * dot(qv, qv))) / 2;
      else return fail('illegal_argument_exception', `[similarity] [${String(sim)}] is not in BoonData's simulation`);
      scores.push([d, f(f(s) * num(spec.boost, 1))]);
    });
    return new Map(scores.sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k));
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
/** Lucene DisjunctionMaxScorer: the best clause plus tie_breaker × the others (summed in double), one float cast. */
function dismax(parts: Hits[], tie: number): Hits {
  const out: Hits = new Map();
  const tb = f(tie);
  for (const d of new Set(parts.flatMap((p) => [...p.keys()]))) {
    let max = 0, other = 0;
    for (const p of parts) {
      const s = p.get(d);
      if (s === undefined) continue;
      if (s >= max) { other += max; max = s; } else other += s;
    }
    out.set(d, f(max + other * tb));
  }
  return out;
}

// ---------- requests ----------
export interface EsResult {
  kind: 'hits' | 'aggs' | 'tokens' | 'mapping' | 'count' | 'segments' | 'ack';
  columns: string[];
  rows: unknown[][];
  /** What grading compares, one string per row (hits: `_id|score`, aggs: buckets without the aggregation's own name). */
  keys: string[];
  /** A fuzzy query ran: scores are not Lucene's, grade the documents only. */
  approx?: boolean;
  total?: number;
}
export interface EsRequest { method: string; index?: string; api: string; body: Obj; head: boolean; params: Record<string, string> }

const HEAD = /^\s*([A-Za-z]+)\s+(\S+)\s*$/;
const APIS = '_search|_analyze|_mapping|_count|_segments|_refresh|_forcemerge';
/** Kibana console text: `#` / `//` comment lines, an optional `GET|POST <index>/<api>[?params]` line, a JSON body. */
export function parseRequest(text: string): EsRequest {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((x) => !/^\s*(#|\/\/)/.test(x));
  while (lines.length && !lines[0].trim()) lines.shift();
  let method = 'GET', index: string | undefined, api = '_search';
  const params: Record<string, string> = {};
  const head = HEAD.exec(lines[0] ?? '');
  if (head) {
    lines.shift();
    method = head[1].toUpperCase();
    // eye-v47b B-05 (L1113): one sentence, and a typed SQL statement is told this lab takes Elasticsearch requests
    if (method !== 'GET' && method !== 'POST') fail('simulation_unsupported_exception', `[${method}] is not a request the simulation knows: it takes GET or POST <index>/_search (also _analyze and _mapping) with a JSON body${/^(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE)$/.test(method) ? '. This lab takes Elasticsearch requests, not SQL' : ''}`);
    const [path, qs] = head[2].split('?');
    const m = new RegExp(`^/?(?:([a-z0-9_.-]+)/)?(${APIS})/?$`).exec(path);
    if (!m) return fail('illegal_argument_exception', `no handler found for uri [/${head[2].replace(/^\//, '')}] and method [${method}]`);
    [, index, api] = m;
    for (const kv of (qs ?? '').split('&').filter(Boolean)) {
      const [k, v = 'true'] = kv.split('=');
      params[k] = v;
    }
  }
  const raw = lines.join('\n').trim();
  const body = raw ? parseJson(raw, 'body') : {};
  if (!isObj(body)) return fail('parsing_exception', 'request body must be a JSON object');
  return { method, index, api, body, head: !!head, params };
}
/** Several console requests in one text: a new one starts at each `GET|POST|PUT|DELETE <path>` line after the first. */
export function splitRequests(text: string): string[] {
  const out: string[][] = [[]];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*(GET|POST|PUT|DELETE|HEAD)\s+\S+\s*$/i.test(line) && out.at(-1)!.some((x) => x.trim() && !/^\s*(#|\/\/)/.test(x))) out.push([]);
    out.at(-1)!.push(line);
  }
  return out.map((x) => x.join('\n'));
}

const FIELDDATA = (f0: string): string => `Text fields are not optimised for operations that require per-document field data like aggregations and sorting, so these operations are disabled by default. Please use a keyword field instead. Alternatively, set fielddata=true on [${f0}] in order to load field data by uninverting the inverted index. Note that this can use significant memory.`;
const tokenOf = (x: Json): string => (x === null ? 'VALUE_NULL' : Array.isArray(x) ? 'START_ARRAY' : typeof x === 'object' ? 'START_OBJECT' : typeof x === 'string' ? 'VALUE_STRING' : typeof x === 'number' ? 'VALUE_NUMBER' : 'VALUE_BOOLEAN');
const round = (x: unknown): string => (typeof x === 'number' ? x.toFixed(4) : String(x));

/** Runs the console text on the index: every request in order, `_refresh` / `_forcemerge` change the state for the requests
 * after them (each run starts from the lab's data); the result is the last request's. */
export function run(ix: EsIndex, text: string): EsResult {
  const reqs = splitRequests(text);
  let cur = ix;
  let res: EsResult | undefined;
  for (const t of reqs) [cur, res] = runOne(cur, t);
  return res!;
}

function runOne(ix: EsIndex, text: string): [EsIndex, EsResult] {
  const r = parseRequest(text);
  if (r.index !== undefined && r.index !== ix.name) fail('index_not_found_exception', `no such index [${r.index}]`, 404);
  if (r.head && r.index === undefined && r.api !== '_analyze') fail('illegal_argument_exception', `${r.api} needs an index: ${r.method} ${ix.name}/${r.api}`);
  const ack = (i: EsIndex, what: string): [EsIndex, EsResult] => [i, { kind: 'ack', columns: ['acknowledged', 'result'], rows: [[true, what]], keys: [`ack|${what}`] }];
  switch (r.api) {
    case '_mapping': {
      const rows = [...ix.fields.values()].map((x) => [x.def.path, x.def.type]);
      return [ix, { kind: 'mapping', columns: ['field', 'type'], rows, keys: rows.map((x) => x.join('|')) }];
    }
    case '_analyze': return [ix, analyzeApi(r.index ? ix : { ...ix, analyzers: new Map(), filters: new Map(), fields: new Map() }, r.body)];
    case '_count': {
      allow(r.body, ['query'], '_count');
      const hits = r.body.query === undefined ? all(ix, 1) : new Searcher(ix).query(r.body.query);
      const n = [...hits.keys()].filter((d) => !ix.deleted[d]).length;
      return [ix, { kind: 'count', columns: ['count'], rows: [[n]], keys: [String(n)] }];
    }
    case '_segments': {
      const segs = [...new Set(ix.seg)];
      const rows = segs.map((s) => [s, ix.seg.filter((x, d) => x === s && !ix.deleted[d]).length, ix.seg.filter((x, d) => x === s && ix.deleted[d]).length]);
      return [ix, { kind: 'segments', columns: ['segment', 'num_docs', 'deleted_docs'], rows, keys: rows.map((x) => x.join('|')) }];
    }
    case '_refresh': {
      if (!(r.body && Object.keys(r.body).length === 0)) fail('parsing_exception', '_refresh takes no body');
      const docs = ix.seed.docs as Json[];
      if (!docs.some((x) => isObj(x) && x._refreshed === false)) return ack(ix, 'refreshed');
      const name = `_${new Set(docs.filter((x) => isObj(x) && x._refreshed !== false).map((x) => (isObj(x) && typeof x._seg === 'string' ? x._seg : '_0'))).size}`;
      return ack(buildIndex({ ...ix.seed, docs: docs.map((x) => (isObj(x) && x._refreshed === false ? { ...Object.fromEntries(Object.entries(x).filter(([k]) => k !== '_refreshed')), _seg: name } : x)) }), 'refreshed');
    }
    case '_forcemerge': {
      if (r.method !== 'POST') fail('illegal_argument_exception', `Incorrect HTTP method for uri [/${ix.name}/_forcemerge] and method [${r.method}], allowed: [POST]`, 405);
      if (r.params.max_num_segments !== undefined && r.params.max_num_segments !== '1') unsupported('max_num_segments other than 1');
      const docs = (ix.seed.docs as Json[]).filter((x) => !(isObj(x) && x._deleted === true));
      const n = new Set(ix.seg).size;
      return ack(buildIndex({ ...ix.seed, docs: docs.map((x) => (isObj(x) && x._refreshed !== false ? { ...x, _seg: `_${n}` } : x)) }), 'merged');
    }
    default: {
      const st = r.params.search_type;
      if (st !== undefined && st !== 'query_then_fetch' && st !== 'dfs_query_then_fetch') fail('illegal_argument_exception', `No search type for [${st}]`);
      return [ix, searchApi(ix, r.body, st === 'dfs_query_then_fetch')];
    }
  }
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
    ts = fi?.def.type === 'text' ? analyze(ix, fi.def.analyzer, text) : (Array.isArray(text) ? text : [text]).map((term, pos) => ({ term, pos, start: 0, end: term.length }));
  } else ts = analyze(ix, String(b.analyzer ?? 'standard'), text);
  const rows = ts.map((t) => [t.term, t.pos]);
  return { kind: 'tokens', columns: ['token', 'position'], rows, keys: rows.map((x) => x.join('|')) };
}

/** The unified highlighter's output for one field, simplified: each value with a match is one fragment (lesson values are
 * one short sentence, under fragment_size 100), every matched token wrapped in pre/post tags; fragments joined by " | ". */
function highlightOf(ix: EsIndex, s: Searcher, d: number, field: string, pre: string, post: string): string | null {
  const fi = ix.fields.get(field);
  const terms = s.hl.get(field);
  if (s.phrased.has(field)) unsupported('highlighting a phrase query');
  if (!fi || fi.def.type !== 'text' || !terms?.size) return null;
  const top = field.split('.')[0];
  const v = ix.docs[d][field] ?? ix.docs[d][top];
  const frags: string[] = [];
  for (const raw of (Array.isArray(v) ? v : [v]).map((x) => String(x ?? '').normalize('NFC'))) {
    const spans = analyze(ix, fi.def.analyzer, raw).filter((t) => terms.has(t.term)).map((t) => [t.start, t.end] as [number, number]).sort((a, b) => a[0] - b[0]);
    if (!spans.length) continue;
    const merged: [number, number][] = [];
    for (const sp of spans) if (merged.length && sp[0] < merged.at(-1)![1]) merged.at(-1)![1] = Math.max(merged.at(-1)![1], sp[1]); else merged.push([...sp]);
    let out = '', at = 0;
    for (const [a, b] of merged) { out += raw.slice(at, a) + pre + raw.slice(a, b) + post; at = b; }
    frags.push(out + raw.slice(at));
  }
  return frags.length ? frags.join(' | ') : null;
}

/** date_histogram keys: calendar units (no week: its first day is not checked) or fixed ms/s/m/h/d multiples, in UTC. */
const CAL: Record<string, string> = { minute: 'minute', '1m': 'minute', hour: 'hour', '1h': 'hour', day: 'day', '1d': 'day', month: 'month', '1M': 'month', quarter: 'quarter', '1q': 'quarter', year: 'year', '1y': 'year' };
const UNIT: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
function formatDate(ms: number, pattern: string | undefined): string {
  const t = new Date(ms);
  if (!pattern || /^(strict_)?date_optional_time/.test(pattern)) return t.toISOString();
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (p) => (p === 'yyyy' ? String(t.getUTCFullYear()) : p === 'MM' ? pad(t.getUTCMonth() + 1) : p === 'dd' ? pad(t.getUTCDate()) : p === 'HH' ? pad(t.getUTCHours()) : p === 'mm' ? pad(t.getUTCMinutes()) : pad(t.getUTCSeconds())));
}
const toMs = (x: string | number | boolean): number => {
  const ms = typeof x === 'number' ? x : Date.parse(String(x));
  return Number.isNaN(ms) ? fail('mapper_parsing_exception', `failed to parse date field [${String(x)}]`) : ms;
};

function searchApi(ix: EsIndex, b: Obj, dfs: boolean): EsResult {
  for (const k of Object.keys(b)) if (!['query', 'size', 'from', 'sort', '_source', 'aggs', 'aggregations', 'track_total_hits', 'highlight', 'search_after', 'knn'].includes(k)) fail('parsing_exception', `Unknown key for a ${tokenOf(b[k])} in [${k}].`);
  const s = new Searcher(ix);
  s.dfs = dfs;
  let hits = b.query === undefined ? (b.knn === undefined ? all(ix, 1) : new Map()) : s.query(b.query);
  if (b.knn !== undefined) { // hybrid: a document in both sets scores the sum (ES: query score + knn score)
    const kn = list(b.knn).map((k) => s.knn(k));
    const merged: Hits = new Map(hits);
    for (const h of kn) for (const [d, sc] of h) merged.set(d, merged.has(d) ? f(merged.get(d)! + sc) : sc);
    hits = merged;
  }
  for (const d of [...hits.keys()]) if (ix.deleted[d]) hits.delete(d);
  const aggs = b.aggs ?? b.aggregations;
  if (aggs !== undefined) return aggsApi(ix, aggs, [...hits.keys()].sort((x, y) => x - y));
  const size = b.size === undefined ? 10 : Number(b.size), from = b.from === undefined ? 0 : Number(b.from);
  if (!(size >= 0 && from >= 0)) fail('illegal_argument_exception', '[from] and [size] must be 0 or more');
  if (from + size > 10_000) fail('illegal_argument_exception', `Result window is too large, from + size must be less than or equal to: [10000] but was [${from + size}]. See the scroll api for a more efficient way to request large data sets. This limit can be set by changing the [index.max_result_window] index level setting.`);
  // ties: shard index, then document (Lucene TopDocs.merge)
  const tie = (x: number, y: number): number => ix.shard[x] - ix.shard[y] || x - y;
  let order = [...hits.entries()].sort((x, y) => y[1] - x[1] || tie(x[0], y[0]));
  let withScore = true;
  let keys: [string, string][] = [];
  const val = (d: number, k: string, desc: boolean): string | number | boolean | undefined => {
    if (k === '_id') return ix.ids[d];
    const vs = ix.fields.get(k)!.vals[d];
    return vs.length ? [...vs].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)).at(desc ? -1 : 0) : undefined;
  };
  const sortVals = (e: [number, number]): (string | number | boolean | null)[] => keys.map(([k, dir]) => (k === '_score' ? f32(e[1]) : val(e[0], k, dir === 'desc') ?? null));
  /** Compares two sort tuples in the request's order: < 0 = a comes first. Missing values sort last. */
  const cmpVals = (a: (string | number | boolean | null | undefined)[], c: (string | number | boolean | null | undefined)[]): number => {
    for (const [i, [, dir]] of keys.entries()) {
      const desc = dir === 'desc';
      const x = a[i] ?? undefined, y = c[i] ?? undefined;
      if (x === y) continue;
      if (x === undefined) return 1;
      if (y === undefined) return -1;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    }
    return 0;
  };
  if (b.sort !== undefined) {
    keys = list(b.sort).map((x) => (typeof x === 'string' ? [x, x === '_score' ? 'desc' : 'asc'] : isObj(x) && Object.keys(x).length === 1
      ? [Object.keys(x)[0], String(isObj(Object.values(x)[0]) ? (Object.values(x)[0] as Obj).order : Object.values(x)[0])] : fail('parsing_exception', '[sort] malformed')) as [string, string]);
    withScore = keys.some(([k]) => k === '_score');
    for (const [k] of keys) {
      if (k === '_score') continue;
      if (k === '_id') fail('illegal_argument_exception', 'Fielddata access on the _id field is disallowed, you can re-enable it by updating the dynamic cluster setting: indices.id_field_data.enabled');
      const fi = ix.fields.get(k) ?? fail('query_shard_exception', `No mapping found for [${k}] in order to sort on`);
      if (fi.def.type === 'text') fail('illegal_argument_exception', FIELDDATA(k));
    }
    order = order.sort((x, y) => cmpVals(sortVals(x), sortVals(y)) || tie(x[0], y[0]));
  }
  if (b.search_after !== undefined) {
    if (b.sort === undefined) fail('illegal_argument_exception', 'Sort must contain at least one field.');
    if (!Array.isArray(b.search_after) || b.search_after.length !== keys.length) fail('illegal_argument_exception', `search_after has ${Array.isArray(b.search_after) ? b.search_after.length : 0} value(s) but sort has ${keys.length}.`);
    if (from > 0) fail('illegal_argument_exception', '[from] parameter must be set to 0 when [search_after] is used');
    const after = (b.search_after as Json[]).map((x, i) => (keys[i][0] !== '_score' && ix.fields.get(keys[i][0]) && numeric(ix.fields.get(keys[i][0])!.def.type) ? Number(x) : x)) as (string | number | boolean | null)[];
    order = order.filter((e) => cmpVals(sortVals(e), after) > 0); // strictly after the last hit's sort values
  }
  let hl: { fields: string[]; pre: string; post: string } | undefined;
  if (b.highlight !== undefined) {
    const h = isObj(b.highlight) ? b.highlight : fail('parsing_exception', '[highlight] malformed');
    allow(h, ['fields', 'pre_tags', 'post_tags', 'type', 'number_of_fragments', 'fragment_size', 'require_field_match'], 'highlight');
    if (h.type !== undefined && h.type !== 'unified') unsupported(`the [${String(h.type)}] highlighter`);
    const fields = Array.isArray(h.fields) ? h.fields.flatMap((x) => (isObj(x) ? Object.keys(x) : [])) : isObj(h.fields) ? Object.keys(h.fields) : fail('parsing_exception', '[highlight] requires [fields]');
    const tag = (x: Json | undefined, dflt: string): string => (Array.isArray(x) ? String(x[0] ?? dflt) : x === undefined ? dflt : String(x));
    hl = { fields: fields.flatMap((x) => (x.includes('*') ? [...ix.fields.keys()].filter((p) => new RegExp(`^${x.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`).test(p)) : [x])), pre: tag(h.pre_tags, '<em>'), post: tag(h.post_tags, '</em>') };
  }
  const src = b._source;
  const cols = src === false ? [] : Array.isArray(src) ? src.map(String) : ix.cols;
  const page = order.slice(from, from + size);
  const hlCols = hl ? hl.fields.map((x) => `highlight.${x}`) : [];
  const rows = page.map((e) => {
    const [d, sc] = e;
    return [ix.ids[d], withScore ? f32(sc) : null,
      ...cols.map((c) => { const v = ix.docs[d][c]; return Array.isArray(v) ? v.join(', ') : v ?? null; }),
      ...(keys.length ? [sortVals(e).map(String).join(', ')] : []),
      ...(hl ? hl.fields.map((x) => highlightOf(ix, s, d, x, hl!.pre, hl!.post)) : [])];
  });
  const n = 2 + cols.length + (keys.length ? 1 : 0);
  return {
    kind: 'hits', columns: ['_id', '_score', ...cols, ...(keys.length ? ['sort'] : []), ...hlCols], rows, total: hits.size, approx: s.approx || undefined,
    keys: rows.map((x) => [s.approx ? String(x[0]) : `${String(x[0])}|${round(x[1])}`, ...x.slice(n).map((v) => String(v))].join('|')),
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
    if (kind !== 'terms' && kind !== 'date_histogram') return kind === 'avg' || kind === 'sum' || kind === 'min' || kind === 'max' ? unsupported('a metric aggregation outside a bucket aggregation') : fail('parsing_exception', `Unknown aggregation type [${kind}] did you mean [terms]?`);
    const t = spec[kind];
    if (!isObj(t) || typeof t.field !== 'string') return fail('illegal_argument_exception', `Required one of fields [field, script], but none were specified.`);
    const fi = ix.fields.get(t.field);
    if (fi?.def.type === 'text') fail('illegal_argument_exception', FIELDDATA(t.field));
    let buckets: [unknown, number[]][];
    if (kind === 'terms') {
      const count = new Map<string | number | boolean, number[]>();
      if (fi) for (const d of docs) for (const v of new Set(fi.vals[d])) count.set(v, [...(count.get(v) ?? []), d]);
      const size = t.size === undefined ? 10 : Number(t.size);
      buckets = [...count.entries()].sort((x, y) => y[1].length - x[1].length || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).slice(0, size);
    } else {
      allow(t, ['field', 'calendar_interval', 'fixed_interval', 'format', 'min_doc_count', 'extended_bounds', 'time_zone'], 'date_histogram');
      if (fi && fi.def.type !== 'date') fail('illegal_argument_exception', `Field [${t.field}] of type [${fi.def.type}] is not supported for aggregation [date_histogram]`);
      if (t.time_zone !== undefined && t.time_zone !== 'UTC' && t.time_zone !== 'Z' && t.time_zone !== '+00:00') unsupported('a time_zone other than UTC');
      if ((t.calendar_interval === undefined) === (t.fixed_interval === undefined)) fail('illegal_argument_exception', t.calendar_interval === undefined ? 'Invalid interval specified, must be non-null and non-empty' : 'Cannot use [fixed_interval] with [calendar_interval] configuration option.');
      let next: (ms: number) => number, floor: (ms: number) => number;
      if (t.calendar_interval !== undefined) {
        const iv = String(t.calendar_interval);
        if (iv === 'week' || iv === '1w') unsupported('a calendar week interval');
        const unit = CAL[iv] ?? fail('illegal_argument_exception', `The supplied interval [${iv}] could not be parsed as a calendar interval.`);
        floor = (ms) => {
          const x = new Date(ms);
          const y = x.getUTCFullYear(), mo = x.getUTCMonth();
          return unit === 'year' ? Date.UTC(y, 0) : unit === 'quarter' ? Date.UTC(y, mo - (mo % 3)) : unit === 'month' ? Date.UTC(y, mo)
            : unit === 'day' ? Date.UTC(y, mo, x.getUTCDate()) : unit === 'hour' ? Date.UTC(y, mo, x.getUTCDate(), x.getUTCHours()) : Date.UTC(y, mo, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes());
        };
        next = (ms) => {
          const x = new Date(ms);
          const add = { year: [1, 0, 0, 0, 0], quarter: [0, 3, 0, 0, 0], month: [0, 1, 0, 0, 0], day: [0, 0, 1, 0, 0], hour: [0, 0, 0, 1, 0], minute: [0, 0, 0, 0, 1] }[unit]!;
          return Date.UTC(x.getUTCFullYear() + add[0], x.getUTCMonth() + add[1], x.getUTCDate() + add[2], x.getUTCHours() + add[3], x.getUTCMinutes() + add[4]);
        };
      } else {
        const iv = String(t.fixed_interval);
        const m = /^(\d+)(ms|s|m|h|d)$/.exec(iv) ?? fail('illegal_argument_exception', `failed to parse setting [date_histogram.fixedInterval] with value [${iv}] as a time value: unit is missing or unrecognized`);
        const step = Number(m[1]) * UNIT[m[2]];
        floor = (ms) => Math.floor(ms / step) * step;
        next = (ms) => ms + step;
      }
      const by = new Map<number, number[]>();
      if (fi) for (const d of docs) for (const k of new Set(fi.vals[d].map((v) => floor(toMs(v))))) by.set(k, [...(by.get(k) ?? []), d]);
      const eb = isObj(t.extended_bounds) ? t.extended_bounds : undefined;
      const ks = [...by.keys(), ...(eb?.min !== undefined ? [floor(toMs(eb.min as string))] : []), ...(eb?.max !== undefined ? [floor(toMs(eb.max as string))] : [])];
      const minDoc = num(t.min_doc_count, 0);
      buckets = [];
      if (ks.length) for (let k = Math.min(...ks), hi = Math.max(...ks), i = 0; k <= hi && i < 10_000; k = next(k), i++) {
        const ds = by.get(k) ?? [];
        if (ds.length >= minDoc) buckets.push([formatDate(k, typeof t.format === 'string' ? t.format : fi?.def.format), ds]);
      }
    }
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
