// v48 L4–L5 (L1210–L1214): the interpreter's new parts, each pinned to a value computed by hand or written independently of
// src/engine/search/es.ts from the Lucene / Elasticsearch sources (branch main, 2026-11-27): DisjunctionMaxScorer, SynonymQuery
// (df = max, freq = sum), SloppyPhraseMatcher + PhraseScorer (freq = Σ 1 / (1 + matchLength)), FunctionScoreQuery +
// CombineFunction + FieldValueFactorFunction (log1p = log10(x + 1)), dense_vector scores ((1 + cos) / 2, 1 / (1 + d²)),
// per-shard statistics vs dfs_query_then_fetch, deleted documents counted until a merge.
import { describe, expect, it } from 'vitest';
import { buildIndex, EsError, run, sloppyFreq, type EsIndex } from '../src/engine/search/es';

const ix = (docs: unknown[], mappings?: unknown, settings?: unknown): EsIndex => buildIndex(JSON.stringify({ index: 'p', mappings, settings, docs }));
const q = (i: EsIndex, body: unknown, path = '_search'): ReturnType<typeof run> => run(i, `GET p/${path}\n${JSON.stringify(body)}`);
const err = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(EsError);
    return (e as EsError).code;
  }
  return 'no error';
};
/** Classic BM25 in double (ES: idf · (k1 + 1) · tf / (tf + k1 · (1 − b + b · dl / avgdl))), written apart from the interpreter. */
const classic = (n: number, N: number, freq: number, dl: number, avgdl: number, boost = 1): number =>
  boost * Math.log(1 + (N - n + 0.5) / (n + 0.5)) * (2.2 * freq) / (freq + 1.2 * (0.25 + 0.75 * dl / avgdl));
const score = (r: ReturnType<typeof run>, id: string): number => r.rows.find((x) => x[0] === id)![1] as number;

describe('multi_match và dis_max (DisjunctionMaxScorer)', () => {
  // name: "den do" | "non la" ; tag: "den" | "den den": N = 2 on both fields
  const i = ix([{ name: 'den do', tag: 'den' }, { name: 'non la', tag: 'den den' }]);
  const nameDen = classic(1, 2, 1, 2, 2), tag1 = classic(2, 2, 1, 1, 1.5), tag2 = classic(2, 2, 2, 2, 1.5);
  it('best_fields mặc định: điểm của trường tốt nhất, tie_breaker 0', () => {
    const r = q(i, { query: { multi_match: { query: 'den', fields: ['name', 'tag'] } } });
    expect(score(r, '1')).toBeCloseTo(Math.max(nameDen, tag1), 5); // 0.6931 · 2.2 / 2.2 ≈ 0.47 vs tag 0.18
    expect(score(r, '2')).toBeCloseTo(tag2, 5);
  });
  it('tie_breaker 0.3: tốt nhất + 0.3 × các trường khác', () => {
    const r = q(i, { query: { multi_match: { query: 'den', fields: ['name', 'tag'], tie_breaker: 0.3 } } });
    expect(score(r, '1')).toBeCloseTo(nameDen + 0.3 * tag1, 5);
    expect(q(i, { query: { dis_max: { queries: [{ match: { name: 'den' } }, { match: { tag: 'den' } }], tie_breaker: 0.3 } } }).rows).toEqual(r.rows);
  });
  it('most_fields cộng mọi trường; name^3 nhân boost của trường đó', () => {
    expect(score(q(i, { query: { multi_match: { query: 'den', fields: ['name', 'tag'], type: 'most_fields' } } }), '1')).toBeCloseTo(nameDen + tag1, 5);
    expect(score(q(i, { query: { multi_match: { query: 'den', fields: ['name^3', 'tag'] } } }), '1')).toBeCloseTo(3 * nameDen, 5);
  });
  it('operator and áp dụng trong từng trường: "den la" không khớp vì không trường nào có cả hai từ', () => {
    expect(q(i, { query: { multi_match: { query: 'den la', fields: ['name', 'tag'], operator: 'and' } } }).rows).toEqual([]);
  });
});

describe('đồng nghĩa (SynonymQuery: df = max, freq = tổng)', () => {
  const syn = { analysis: { filter: { vi_syn: { type: 'synonym_graph', synonyms: ['mu, non'] } }, analyzer: { q: { tokenizer: 'standard', filter: ['lowercase', 'vi_syn'] } } } };
  it('đồng nghĩa lúc tìm: "mu" thấy "non"; một tài liệu có cả hai từ được freq 2', () => {
    const i = ix([{ t: 'non la' }, { t: 'mu len' }, { t: 'ao' }, { t: 'non mu' }], { properties: { t: { type: 'text', search_analyzer: 'q' } } }, syn);
    const r = q(i, { query: { match: { t: 'mu' } } });
    expect(r.rows.map((x) => x[0]).sort()).toEqual(['1', '2', '4']);
    // df(mu) = 2 (docs 2, 4), df(non) = 2 (docs 1, 4): max = 2; N = 4; avgdl = 7 / 4
    expect(score(r, '1')).toBeCloseTo(classic(2, 4, 1, 2, 7 / 4), 5);
    expect(score(r, '4')).toBeCloseTo(classic(2, 4, 2, 2, 7 / 4), 5);
  });
  it('đồng nghĩa lúc lưu: token chồng không tăng độ dài, nhưng vẫn vào avgdl (sumTotalTermFreq)', () => {
    const i = ix([{ t: 'non la' }, { t: 'ao' }], { properties: { t: { type: 'text', analyzer: 'q', search_analyzer: 'standard' } } }, syn);
    // doc 1 = non, mu (pos 0), la: dl 2, ttf 3; doc 2: dl 1; avgdl = 4 / 2 = 2
    expect(score(q(i, { query: { match: { t: 'mu' } } }), '1')).toBeCloseTo(classic(1, 2, 1, 2, 2), 5);
  });
  it('"a => b" thay thế; đồng nghĩa nhiều từ bị từ chối', () => {
    const rep = { analysis: { filter: { s: { type: 'synonym', synonyms: ['mu => non'] } }, analyzer: { q: { tokenizer: 'standard', filter: ['lowercase', 's'] } } } };
    expect(q(ix([{ a: 1 }], undefined, rep), { analyzer: 'q', text: 'Mu' }, '_analyze').rows).toEqual([['non', 0]]);
    const multi = { analysis: { filter: { s: { type: 'synonym', synonyms: ['ca phe, coffee'] } }, analyzer: { q: { tokenizer: 'standard', filter: ['lowercase', 's'] } } } };
    expect(err(() => q(ix([{ a: 1 }], undefined, multi), { analyzer: 'q', text: 'coffee' }, '_analyze'))).toBe('simulation_unsupported_exception');
  });
});

describe('cụm từ có slop (SloppyPhraseMatcher)', () => {
  it('khoảng cách và thứ tự ngược: matchLength 1 → 1/2, đảo hai từ cần slop 2 → 1/3', () => {
    expect(sloppyFreq([[0], [2]], [0, 1], 1)).toBe(0.5); // "a x b"
    expect(sloppyFreq([[1], [0]], [0, 1], 2)).toBe(Math.fround(1 / 3)); // "b a"
    expect(sloppyFreq([[1], [0]], [0, 1], 1)).toBe(0);
    expect(sloppyFreq([[0, 3], [1, 4]], [0, 1], 1)).toBe(2); // "a b x a b": two exact matches
  });
  it('điểm dùng freq thực: "den x long" với slop 1 = BM25 với tf 0.5', () => {
    const i = ix([{ t: 'den x long' }, { t: 'den long' }, { t: 'long den' }]);
    const r = q(i, { query: { match_phrase: { t: { query: 'den long', slop: 1 } } } });
    expect(r.rows.map((x) => x[0])).toEqual(['2', '1']);
    const idf = Math.fround(Math.fround(Math.log(1 + 0.5 / 3.5)) * 2); // both words in all 3 docs
    expect(score(r, '1')).toBeCloseTo(idf * 2.2 * 0.5 / (0.5 + 1.2 * (0.25 + 0.75 * 3 / (7 / 3))), 5);
    expect(q(i, { query: { match_phrase: { t: { query: 'den long', slop: 2 } } } }).rows.map((x) => x[0])).toEqual(['2', '1', '3']);
  });
});

describe('function_score (FieldValueFactorFunction, CombineFunction)', () => {
  const i = ix([{ n: 'den', sold: 99 }, { n: 'den', sold: 9 }, { n: 'den' }]);
  it('log1p là log10(x + 1): 99 → 2, 9 → 1; boost_mode multiply với match_all (1)', () => {
    const r = q(i, { query: { function_score: { query: { match_all: {} }, field_value_factor: { field: 'sold', modifier: 'log1p', missing: 0 } } } });
    expect(r.rows.map((x) => [x[0], x[1]])).toEqual([['1', 2], ['2', 1], ['3', 0]]);
  });
  it('boost_mode sum cộng; weight nhân; thiếu giá trị mà không có missing thì lỗi', () => {
    expect(score(q(i, { query: { function_score: { field_value_factor: { field: 'sold', modifier: 'log1p', missing: 0 }, boost_mode: 'sum' } } }), '1')).toBe(3);
    expect(score(q(i, { query: { function_score: { functions: [{ field_value_factor: { field: 'sold', modifier: 'log1p', missing: 0 }, weight: 2 }] } } }), '1')).toBe(4);
    expect(err(() => q(i, { query: { function_score: { field_value_factor: { field: 'sold' } } } }))).toBe('illegal_argument_exception');
    expect(err(() => q(i, { query: { function_score: { field_value_factor: { field: 'sold', modifier: 'log' } } } }))).toBe('illegal_argument_exception'); // log10(0) for doc 3 (missing → error first)
  });
  it('max_boost chặn hệ số; filter chỉ áp dụng cho tài liệu khớp', () => {
    expect(score(q(i, { query: { function_score: { field_value_factor: { field: 'sold', missing: 0 }, max_boost: 10 } } }), '1')).toBe(10);
    const r = q(i, { query: { function_score: { functions: [{ filter: { range: { sold: { gte: 50 } } }, weight: 5 }] } } });
    expect(r.rows.map((x) => [x[0], x[1]])).toEqual([['1', 5], ['2', 1], ['3', 1]]);
  });
});

describe('knn trên dense_vector (điểm theo tài liệu dense_vector)', () => {
  const m = { properties: { v: { type: 'dense_vector', dims: 2, similarity: 'cosine' }, w: { type: 'dense_vector', dims: 2, similarity: 'l2_norm' } } };
  const i = ix([{ v: [1, 0], w: [1, 0] }, { v: [0, 1], w: [0, 1] }, { v: [1, 1], w: [1, 1] }], m);
  it('cosine: (1 + cos) / 2 → 1, (1 + 0.7071) / 2, 0.5', () => {
    const r = run(i, `GET p/_search\n${JSON.stringify({ knn: { field: 'v', query_vector: [1, 0], k: 3, num_candidates: 10 }, _source: false })}`);
    expect(r.rows).toEqual([['1', 1], ['3', 0.8535534], ['2', 0.5]]);
  });
  it('l2_norm: 1 / (1 + d²); k cắt danh sách; num_candidates < k bị từ chối; sai số chiều bị từ chối', () => {
    const r = run(i, `GET p/_search\n${JSON.stringify({ knn: { field: 'w', query_vector: [1, 0], k: 2, num_candidates: 10 }, _source: false })}`);
    expect(r.rows).toEqual([['1', 1], ['3', 0.5]]);
    expect(err(() => run(i, `GET p/_search\n${JSON.stringify({ knn: { field: 'v', query_vector: [1, 0], k: 5, num_candidates: 2 } })}`))).toBe('illegal_argument_exception');
    expect(err(() => run(i, `GET p/_search\n${JSON.stringify({ knn: { field: 'v', query_vector: [1, 0, 0], k: 1 } })}`))).toBe('illegal_argument_exception');
    expect(err(() => ix([{ v: [1, 2, 3] }], m))).toBe('mapper_parsing_exception');
  });
});

describe('date_histogram (UTC)', () => {
  const i = ix([{ d: '2026-08-15', x: 10 }, { d: '2026-10-02', x: 20 }, { d: '2026-10-30T23:00:00Z', x: 40 }], { properties: { d: { type: 'date' }, x: { type: 'integer' } } });
  const agg = (h: unknown, sub?: unknown): ReturnType<typeof run> => q(i, { size: 0, aggs: { m: { date_histogram: h, ...(sub ? { aggs: sub } : {}) } } });
  it('tháng: bucket rỗng ở giữa được giữ (min_doc_count 0); key mặc định dạng ISO', () => {
    expect(agg({ field: 'd', calendar_interval: 'month' }).rows).toEqual([['m', '2026-08-01T00:00:00.000Z', 1], ['m', '2026-09-01T00:00:00.000Z', 0], ['m', '2026-10-01T00:00:00.000Z', 2]]);
    expect(agg({ field: 'd', calendar_interval: '1M', format: 'yyyy-MM', min_doc_count: 1 }, { s: { sum: { field: 'x' } } }).rows).toEqual([['m', '2026-08', 1, 10], ['m', '2026-10', 2, 60]]);
  });
  it('calendar 2M, tuần và trường không phải date bị từ chối', () => {
    expect(err(() => agg({ field: 'd', calendar_interval: '2M' }))).toBe('illegal_argument_exception');
    expect(err(() => agg({ field: 'd', calendar_interval: 'week' }))).toBe('simulation_unsupported_exception');
    expect(err(() => agg({ field: 'x', calendar_interval: 'day' }))).toBe('illegal_argument_exception');
  });
  it('fixed_interval: bucket bắt đầu ở bội số của bước tính từ 1970-01-01', () => {
    const day = 86_400_000, step = 30 * day;
    const start = (s: string): string => new Date(Math.floor(Date.parse(s) / step) * step).toISOString().slice(0, 10);
    expect(agg({ field: 'd', fixed_interval: '30d', format: 'yyyy-MM-dd', min_doc_count: 1 }).rows.map((x) => x[1])).toEqual([...new Set(['2026-08-15', '2026-10-02', '2026-10-30T23:00:00Z'].map(start))]);
  });
});

describe('search_after, highlight', () => {
  const i = ix([{ sku: 'a', p: 10, n: 'Đèn lồng đỏ' }, { sku: 'b', p: 10, n: 'Nón lá' }, { sku: 'c', p: 20, n: 'Đèn tre' }, { sku: 'd', p: 30, n: 'Trà sen' }],
    { properties: { sku: { type: 'keyword' }, p: { type: 'integer' }, n: { type: 'text', analyzer: 'f' } } },
    { analysis: { analyzer: { f: { tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] } } } });
  const sort = [{ p: 'asc' }, { sku: 'asc' }];
  it('trang sau [10, "b"] bắt đầu từ c; cột sort là giá trị của hit cuối', () => {
    const p1 = q(i, { size: 2, sort, _source: false });
    expect(p1.rows).toEqual([['1', null, '10, a'], ['2', null, '10, b']]);
    expect(q(i, { size: 2, sort, search_after: [10, 'b'], _source: false }).rows).toEqual([['3', null, '20, c'], ['4', null, '30, d']]);
    expect(err(() => q(i, { search_after: [10] }))).toBe('illegal_argument_exception');
    expect(err(() => q(i, { sort, search_after: [10, 'b'], from: 1 }))).toBe('illegal_argument_exception');
  });
  it('highlight bọc chữ gốc của token khớp (chữ có dấu khi tìm không dấu)', () => {
    const r = q(i, { query: { match: { n: 'den' } }, highlight: { fields: { n: {} } }, _source: false });
    expect(r.rows.map((x) => x[2])).toEqual(['<em>Đèn</em> tre', '<em>Đèn</em> lồng đỏ']);
    expect(q(i, { query: { match: { n: 'den do' } }, highlight: { fields: { n: {} }, pre_tags: ['['], post_tags: [']'] }, _source: false }).rows[0][2]).toBe('[Đèn] lồng [đỏ]');
    expect(err(() => q(i, { query: { match_phrase: { n: 'den long' } }, highlight: { fields: { n: {} } } }))).toBe('simulation_unsupported_exception');
  });
});

describe('shard, refresh, segment (thống kê từng shard; tài liệu đã xóa vẫn được đếm tới khi merge)', () => {
  // shard 0: "den", "den", "non"; shard 1: "den", "tra", "tra"
  const docs = [{ t: 'den', _shard: 0 }, { t: 'den', _shard: 0 }, { t: 'non', _shard: 0 }, { t: 'den', _shard: 1 }, { t: 'tra', _shard: 1 }, { t: 'tra', _shard: 1 }];
  const i = ix(docs, undefined, { number_of_shards: 2 });
  it('query_then_fetch: idf của từng shard (2/3 và 1/3); dfs_query_then_fetch: idf chung (3/6)', () => {
    const r = q(i, { query: { match: { t: 'den' } } });
    expect(score(r, '1')).toBeCloseTo(classic(2, 3, 1, 1, 1), 5);
    expect(score(r, '4')).toBeCloseTo(classic(1, 3, 1, 1, 1), 5);
    expect(r.rows[0][0]).toBe('4'); // rare on its shard: ranks first
    const g = run(i, `GET p/_search?search_type=dfs_query_then_fetch\n${JSON.stringify({ query: { match: { t: 'den' } } })}`);
    expect(new Set(g.rows.map((x) => x[1])).size).toBe(1);
    expect(score(g, '4')).toBeCloseTo(classic(3, 6, 1, 1, 1), 5);
  });
  it('tài liệu chưa refresh không thấy; _refresh làm nó thấy được, thành segment mới', () => {
    const j = ix([{ t: 'den' }, { t: 'den moi', _refreshed: false }]);
    expect(q(j, {}, '_count').rows).toEqual([[1]]);
    expect(run(j, 'POST p/_refresh\nGET p/_count').rows).toEqual([[2]]);
    expect(run(j, 'POST p/_refresh\nGET p/_segments').rows).toEqual([['_0', 1, 0], ['_1', 1, 0]]);
  });
  it('tài liệu đã xóa vẫn trong df tới khi _forcemerge', () => {
    const j = ix([{ t: 'den' }, { t: 'den', _deleted: true }, { t: 'non' }]);
    const before = q(j, { query: { match: { t: 'den' } } });
    expect(before.rows.map((x) => x[0])).toEqual(['1']);
    expect(score(before, '1')).toBeCloseTo(classic(2, 3, 1, 1, 1), 5);
    expect(q(j, {}, '_segments').rows).toEqual([['_0', 2, 1]]);
    const after = run(j, `POST p/_forcemerge?max_num_segments=1\nGET p/_search\n${JSON.stringify({ query: { match: { t: 'den' } } })}`);
    expect(score(after, '1')).toBeCloseTo(classic(1, 2, 1, 1, 1), 5);
    expect(err(() => run(j, 'GET p/_forcemerge'))).toBe('illegal_argument_exception');
  });
});
