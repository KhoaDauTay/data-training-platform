// v47 R1 (L1014–L1017): BoonData's Elasticsearch-style interpreter (src/engine/search/es.ts). BM25 pinned against Elasticsearch's
// own explain example and hand calculations; analyzers; the Query DSL subset; aggregations; unsafe input refused as data.
import { describe, expect, it } from 'vitest';
import { bm25, buildIndex, EsError, f32, fold, idfOf, normLength, run, type EsIndex } from '../src/engine/search/es';

const ix = (docs: unknown[], mappings?: unknown, settings?: unknown): EsIndex => buildIndex(JSON.stringify({ index: 'p', mappings, settings, docs }));
const q = (i: EsIndex, body: unknown, api = '_search'): ReturnType<typeof run> => run(i, `GET p/${api}\n${JSON.stringify(body)}`);
const err = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(EsError);
    return (e as EsError).code;
  }
  return 'no error';
};
/** Classic BM25 in double, written independently of the interpreter (ES: idf · (k1 + 1) · tf / (tf + k1 · (1 − b + b · dl / avgdl))). */
const classic = (n: number, N: number, freq: number, dl: number, avgdl: number): number =>
  Math.log(1 + (N - n + 0.5) / (n + 0.5)) * (2.2 * freq) / (freq + 1.2 * (0.25 + 0.75 * dl / avgdl));

describe('BM25 như Elasticsearch (LegacyBM25Similarity, Lucene float)', () => {
  it('ví dụ explain trong tài liệu Elasticsearch: N = 5, n = 1, dl = 3, avgdl = 5,4 → 1.6943598', () => {
    const i = ix([{ m: 'elasticsearch is fast' }, ...Array.from({ length: 4 }, () => ({ m: 'a b c d e f' }))]);
    const r = q(i, { query: { match: { m: 'elasticsearch' } } });
    expect(r.rows).toEqual([['1', 1.6943598, 'elasticsearch is fast']]);
    expect(f32(bm25(idfOf(1, 5), 1, 3, 5.4))).toBe(1.6943598);
    expect(f32(idfOf(1, 5))).toBe(1.3862944);
  });
  it('một tài liệu, một từ: ln(4/3) = 0.2876821 (boost 2.2 × tf 1/2.2)', () => {
    expect(q(ix([{ m: 'quick' }]), { query: { match: { m: 'quick' } } }).rows[0][1]).toBe(0.2876821);
  });
  it('tính tay trên ba tài liệu: idf = ln 1.6, avgdl = 7/3; tài liệu ngắn hơn điểm cao hơn', () => {
    const i = ix([{ name: 'den long do' }, { name: 'den long' }, { name: 'non la' }]);
    const r = q(i, { query: { match: { name: 'long' } } });
    expect(r.rows.map((x) => x[0])).toEqual(['2', '1']);
    expect(r.rows[0][1] as number).toBeCloseTo(classic(2, 3, 1, 2, 7 / 3), 5); // 0.49918
    expect(r.rows[1][1] as number).toBeCloseTo(classic(2, 3, 1, 3, 7 / 3), 5); // 0.42082
    expect(r.rows[0][1]).toBeCloseTo(0.49918, 5);
    // two terms: the bool of term queries sums them
    const two = q(i, { query: { match: { name: 'den do' } } });
    expect(two.rows[0][0]).toBe('1');
    expect(two.rows[0][1] as number).toBeCloseTo(classic(2, 3, 1, 3, 7 / 3) + classic(1, 3, 1, 3, 7 / 3), 5);
  });
  it('tần suất bão hòa: từ lặp 2 lần không gấp đôi điểm', () => {
    const i = ix([{ t: 'tea tea' }, { t: 'tea cup' }, { t: 'cup' }]);
    const [a, b] = q(i, { query: { match: { t: 'tea' } } }).rows.map((x) => x[1] as number);
    expect(a).toBeCloseTo(classic(2, 3, 2, 2, 5 / 3), 5); // avgdl = (2 + 2 + 1) / 3
    expect(a / b).toBeLessThan(2);
  });
  it('keyword: không có norms (dl = 1), freq 1, nên term = idf', () => {
    const i = ix([{ b: 'Lan' }, { b: 'Mai' }, { b: 'Mai' }], { properties: { b: { type: 'keyword' } } });
    expect(q(i, { query: { term: { b: 'Lan' } } }).rows[0][1] as number).toBeCloseTo(Math.log(1 + 2.5 / 1.5), 5);
  });
  it('cụm từ: idf = tổng idf các từ, freq = số lần khớp đúng thứ tự', () => {
    const i = ix([{ t: 'den long do' }, { t: 'long den' }, { t: 'den long' }]);
    const r = q(i, { query: { match_phrase: { t: 'den long' } } });
    expect(r.rows.map((x) => x[0])).toEqual(['3', '1']);
    const idf = Math.fround(Math.fround(Math.log(1 + 0.5 / 3.5)) * 2);
    expect(r.rows[0][1] as number).toBeCloseTo(idf * 2.2 / (1 + 1.2 * (0.25 + 0.75 * 2 / (7 / 3))), 5);
  });
  it('độ dài trường giữ trong 1 byte (SmallFloat): đúng tới 39, 41 thành 40', () => {
    expect([0, 23, 24, 39, 40, 41, 56].map(normLength)).toEqual([0, 23, 24, 39, 40, 40, 56]);
  });
  it('bộ lọc không tính điểm: bool chỉ có filter cho _score 0, range trong must cho 1', () => {
    const i = ix([{ name: 'den', price: 5 }, { name: 'non', price: 50 }]);
    expect(q(i, { query: { bool: { filter: { range: { price: { lt: 10 } } } } } }).rows[0][1]).toBe(0);
    expect(q(i, { query: { bool: { must: { range: { price: { lt: 10 } } } } } }).rows[0][1]).toBe(1);
    expect(q(i, { query: { bool: { must: { match: { name: 'den' } }, filter: { range: { price: { lt: 10 } } } } } }).rows[0][1])
      .toBe(q(i, { query: { match: { name: 'den' } } }).rows[0][1]);
  });
});

describe('analyzer, mapping, Query DSL', () => {
  it('standard giữ dấu; asciifolding bỏ dấu và đổi đ thành d', () => {
    expect(q(ix([{ a: 1 }]), { analyzer: 'standard', text: 'Đà Nẵng' }, '_analyze').rows).toEqual([['đà', 0], ['nẵng', 1]]);
    expect(fold('Đèn lồng Hội An')).toBe('Den long Hoi An');
    const i = ix([{ c: 'Đà Nẵng' }, { c: 'Hà Nội' }], { properties: { c: { type: 'text', analyzer: 'vi' } } },
      { analysis: { analyzer: { vi: { tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] } } } });
    expect(q(i, { query: { match: { c: 'da nang' } } }).rows.map((x) => x[0])).toEqual(['1']);
    expect(q(ix([{ c: 'Đà Nẵng' }]), { query: { match: { c: 'da nang' } } }).rows).toEqual([]);
  });
  it('mapping động: chuỗi = text + .keyword; term trên text trượt vì chữ hoa', () => {
    const i = ix([{ name: 'Ao Thun', price: 120 }]);
    expect(q(i, {}, '_mapping').rows).toEqual([['name', 'text'], ['name.keyword', 'keyword'], ['price', 'long']]);
    expect(q(i, { query: { term: { name: 'Ao Thun' } } }).rows).toEqual([]);
    expect(q(i, { query: { term: { 'name.keyword': 'Ao Thun' } } }).rows.length).toBe(1);
    expect(q(i, { query: { match: { name: 'AO' } } }).rows.length).toBe(1);
  });
  it('edge_ngram khi ghi, standard khi tìm: gõ "den" thấy "đèn"', () => {
    const i = ix([{ n: 'Đèn lồng' }, { n: 'Nón lá' }], { properties: { n: { type: 'text', analyzer: 'ac', search_analyzer: 'vi' } } }, {
      analysis: { filter: { g: { type: 'edge_ngram', min_gram: 2, max_gram: 5 } }, analyzer: { ac: { tokenizer: 'standard', filter: ['lowercase', 'asciifolding', 'g'] }, vi: { tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] } } },
    });
    expect(q(i, { query: { match: { n: 'den' } } }).rows.map((x) => x[0])).toEqual(['1']);
    expect(q(i, { query: { match: { n: 'lo' } } }).rows.map((x) => x[0])).toEqual(['1']);
  });
  it('fuzziness AUTO sửa một lỗi gõ; kết quả được đánh dấu xấp xỉ', () => {
    const r = q(ix([{ n: 'lantern' }, { n: 'silk' }]), { query: { match: { n: { query: 'lantren', fuzziness: 'AUTO' } } } });
    expect(r.rows.map((x) => x[0])).toEqual(['1']);
    expect(r.approx).toBe(true);
  });
  it('bool: should tùy chọn khi có must, bắt buộc ít nhất một khi đứng một mình; must_not loại', () => {
    const i = ix([{ t: 'den do' }, { t: 'den xanh' }, { t: 'non' }]);
    expect(q(i, { query: { bool: { must: { match: { t: 'den' } }, should: { match: { t: 'do' } } } } }).rows.map((x) => x[0])).toEqual(['1', '2']);
    expect(q(i, { query: { bool: { should: [{ match: { t: 'do' } }, { match: { t: 'non' } }] } } }).rows.map((x) => x[0]).sort()).toEqual(['1', '3']);
    expect(q(i, { query: { bool: { must: { match: { t: 'den' } }, must_not: { match: { t: 'xanh' } } } } }).rows.map((x) => x[0])).toEqual(['1']);
  });
  it('terms aggregation: nhiều trước, bằng nhau thì theo khóa; trên text thì lỗi fielddata', () => {
    const i = ix([{ c: 'tea', p: 10 }, { c: 'lamp', p: 30 }, { c: 'tea', p: 20 }, { c: 'silk', p: 5 }]);
    const r = q(i, { size: 0, aggs: { by: { terms: { field: 'c.keyword' }, aggs: { avg_p: { avg: { field: 'p' } } } } } });
    expect(r.rows).toEqual([['by', 'tea', 2, 15], ['by', 'lamp', 1, 30], ['by', 'silk', 1, 5]]);
    expect(err(() => q(i, { aggs: { by: { terms: { field: 'c' } } } }))).toBe('illegal_argument_exception');
  });
  it('sort theo trường: _score là null; sort trên text bị từ chối', () => {
    const i = ix([{ n: 'a', p: 30 }, { n: 'b', p: 10 }]);
    expect(q(i, { sort: [{ p: 'asc' }] }).rows).toEqual([['2', null, 'b', 10], ['1', null, 'a', 30]]);
    expect(err(() => q(i, { sort: ['n'] }))).toBe('illegal_argument_exception');
  });
});

describe('đầu vào là dữ liệu: không eval, lỗi có dạng Elasticsearch', () => {
  const i = ix([{ n: 'x' }]);
  it.each([
    ['khóa __proto__', 'GET p/_search\n{"query": {"__proto__": {}}}', 'parsing_exception'],
    ['khóa constructor', 'GET p/_search\n{"constructor": 1}', 'parsing_exception'],
    ['script', 'GET p/_search\n{"query": {"script": {"script": "1"}}}', 'simulation_unsupported_exception'],
    ['regexp', 'GET p/_search\n{"query": {"regexp": {"n": ".*"}}}', 'simulation_unsupported_exception'],
    ['truy vấn lạ', 'GET p/_search\n{"query": {"magic": {}}}', 'parsing_exception'],
    ['JSON hỏng', 'GET p/_search\n{"query": ', 'x_content_parse_exception'],
    ['mã JS', 'GET p/_search\nfunction(){ return 1 }', 'x_content_parse_exception'],
    ['lồng quá sâu', `GET p/_search\n${'['.repeat(40)}${']'.repeat(40)}`, 'parsing_exception'],
    ['chỉ mục khác', 'GET other/_search\n{}', 'index_not_found_exception'],
    ['ghi', 'PUT p/_doc/1\n{"n": "y"}', 'simulation_unsupported_exception'],
    ['khóa lạ', 'GET p/_search\n{"qeury": {}}', 'parsing_exception'],
    ['hai truy vấn trong một', 'GET p/_search\n{"query": {"match": {"n": "x"}, "term": {"n": "x"}}}', 'parsing_exception'],
    ['cửa sổ quá lớn', 'GET p/_search\n{"from": 9995, "size": 10}', 'illegal_argument_exception'],
  ])('%s', (_, text, code) => {
    expect(err(() => run(i, text))).toBe(code);
  });
  it('eye-v47b B-05 (L1113): a method the simulation does not know reads as one sentence; typed SQL is told the lab wants Elasticsearch requests', () => {
    const msg = (text: string): string => { try { run(i, text); } catch (e) { return (e as Error).message; } return ''; };
    expect(msg('PUT p/_doc/1\n{}')).toBe('[PUT] is not a request the simulation knows: it takes GET or POST <index>/_search (also _analyze and _mapping) with a JSON body');
    expect(msg('SELECT 1')).toMatch(/^\[SELECT\] is not a request .*\. This lab takes Elasticsearch requests, not SQL$/);
  });
  it('dòng chú thích # và // bị bỏ; không có dòng GET thì là _search', () => {
    expect(run(i, '# tìm\n// x\n{"query": {"match": {"n": "x"}}}').rows.length).toBe(1);
  });
});
