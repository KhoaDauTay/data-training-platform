// v47 Telemetry R1 (L1036–L1041): the PromQL subset (src/engine/telemetry/promql.ts). Values below are worked by hand from the
// rules of Prometheus v3.5.0, read on 2026-11-27:
// - https://prometheus.io/docs/prometheus/latest/querying/basics/ : `=~` fully anchored, range selectors left-open, 5 m lookback,
//   "Vector selectors must either specify a name or at least one label matcher that does not match the empty string".
// - https://prometheus.io/docs/prometheus/latest/querying/functions/ and promql/functions.go `extrapolatedRate` (v3.5.0): reset
//   correction, threshold = 1.1 × average interval (>=: half an interval), then the counter zero clamp (<), then the end.
// - promql/quantile.go `BucketQuantile` (v3.5.0): linear interpolation, lower edge 0, +Inf required, rank in +Inf → second highest.
import { describe, expect, it } from 'vitest';
import { bucketQuantile, checkRegex, evaluate, extrapolatedRate, parse, PromqlError, runPromql, seriesOf, type Series } from '../src/engine/telemetry/promql';

const S = 1000;
const ser = (labels: Record<string, string>, pts: [number, number][]): Series => ({ labels: Object.assign(Object.create(null), labels), points: pts.map(([t, v]) => [t * S, v]) });
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('extrapolatedRate: pinned hand-worked values', () => {
  it('4 samples 15 s apart, 10→40 over [1m] at t=60 s: gap to start 15 s < 16.5 s kept, zero point 15 s not < 15: increase 40, rate 0.6667', () => {
    const pts = [[15, 10], [30, 20], [45, 30], [60, 40]].map(([t, v]) => [t * S, v] as const);
    near(extrapolatedRate(pts, 0, 60 * S, false)!, 40); // 30 × (45 + 15 + 0) / 45
    near(extrapolatedRate(pts, 0, 60 * S, true)!, 40 / 60);
  });
  it('a counter reset (20 → 5) adds the value before the drop: 25 raw, 33.333 extrapolated', () => {
    const pts = [[15, 10], [30, 20], [45, 5], [60, 15]].map(([t, v]) => [t * S, v] as const);
    near(extrapolatedRate(pts, 0, 60 * S, false)!, 25 * 60 / 45); // zero point 45 × 10/25 = 18 s, not < 15
  });
  it('zero clamp: 2→32, zero point 45 × 2/30 = 3 s < 15 s, so increase = 30 × 48/45 = 32', () => {
    const pts = [[15, 2], [30, 12], [45, 22], [60, 32]].map(([t, v]) => [t * S, v] as const);
    near(extrapolatedRate(pts, 0, 60 * S, false)!, 32);
  });
  it('threshold: first sample 40 s after the start (≥ 11 s) extrapolates half an interval (5 s): 20 × 25/20 = 25, rate 25/60', () => {
    const pts = [[40, 100], [50, 110], [60, 120]].map(([t, v]) => [t * S, v] as const);
    near(extrapolatedRate(pts, 0, 60 * S, false)!, 25);
    near(extrapolatedRate(pts, 0, 60 * S, true)!, 25 / 60);
  });
  it('one sample: no result', () => expect(extrapolatedRate([[60 * S, 5]], 0, 60 * S, true)).toBeUndefined());
});

describe('e-tm-l2-01 quiz 2: rate() on the lesson data', () => {
  it('rate(http_requests_total[2m]) at 10:02 = 228.57 / 120 = 1.905 (10:00 excluded, 15 s extrapolated); the SQL of step 3 gives 230 / 120', () => {
    const v = [100, 130, 160, 190, 220, 20, 50, 80, 110];
    const s = [ser({ __name__: 'http_requests_total', route: '/track' }, v.map((x, i) => [i * 15, x]))];
    const r = runPromql('rate(http_requests_total[2m])', s, 120 * S).rows;
    expect(r).toEqual([['{route="/track"}', expect.closeTo(200 * 120 / 105 / 120, 6)]]);
    expect(Math.round((r[0][1] as number) * 100) / 100).toBe(1.9);
  });
});
describe('histogram_quantile (classic buckets)', () => {
  const b = [{ le: 0.1, count: 50 }, { le: 0.25, count: 80 }, { le: 0.5, count: 95 }, { le: 1, count: 100 }, { le: Infinity, count: 100 }];
  it('p90 of 100: rank 90 in (0.25, 0.5], 10 of 15 → 0.41667; p50 lands on 0.1 exactly', () => {
    near(bucketQuantile(0.9, b), 0.25 + 0.25 * 10 / 15);
    near(bucketQuantile(0.5, b), 0.1);
    near(bucketQuantile(0.2, b), 0.1 * 20 / 50); // lowest bucket: lower edge 0
  });
  it('rank in the +Inf bucket → the second highest bound; no +Inf → NaN; q outside [0, 1] → ∓Inf; non-monotonic buckets are raised', () => {
    expect(bucketQuantile(0.99, [...b.slice(0, 4), { le: Infinity, count: 110 }])).toBe(1);
    expect(bucketQuantile(0.5, b.slice(0, 4))).toBeNaN();
    expect(bucketQuantile(-0.1, b)).toBe(-Infinity);
    expect(bucketQuantile(1.1, b)).toBe(Infinity);
    near(bucketQuantile(0.9, [{ le: 0.1, count: 50 }, { le: 0.25, count: 40 }, { le: Infinity, count: 100 }]), 0.25);
  });
});

describe('selectors, aggregations, functions on a small data set', () => {
  // two paths, a 15 s scrape, the virtual clock at t = 120 s; one series has an old sample only (outside the 5 m lookback)
  const data: Series[] = [
    ser({ __name__: 'http_requests_total', job: 'api', path: '/track', code: '200' }, [[0, 0], [15, 10], [30, 20], [45, 30], [60, 40], [75, 50], [90, 60], [105, 70], [120, 80]]),
    ser({ __name__: 'http_requests_total', job: 'api', path: '/track', code: '500' }, [[0, 0], [30, 1], [60, 2], [90, 3], [120, 4]]),
    ser({ __name__: 'http_requests_total', job: 'api', path: '/quote', code: '200' }, [[0, 0], [60, 30], [120, 60]]),
    ser({ __name__: 'up', job: 'api' }, [[-400, 1]]),
  ];
  const at = 120 * S;
  const q = (x: string) => runPromql(x, data, at);
  it('instant selector: newest sample per series within 5 m; an old one drops out', () => {
    expect(q('http_requests_total{path="/track"}').rows).toEqual([
      ['http_requests_total{code="200", job="api", path="/track"}', 80], ['http_requests_total{code="500", job="api", path="/track"}', 4]]);
    expect(q('up').rows).toEqual([]);
  });
  it('matchers = != =~ !~ (anchored): "/tr" never matches "/track"', () => {
    expect(q('http_requests_total{path=~"/tr"}').rows).toEqual([]);
    expect(q('http_requests_total{path=~"/tr.*", code!="500"}').rows).toHaveLength(1);
    expect(q('http_requests_total{path!~"/track"}').rows.map((r) => r[0])).toEqual(['http_requests_total{code="200", job="api", path="/quote"}']);
  });
  it('range selector is left-open: [1m] at 120 s holds 75, 90, 105, 120 (not 60)', () => {
    expect(q('http_requests_total{code="200",path="/track"}[1m]').rows.map((r) => r[1])).toEqual(['00:01:15', '00:01:30', '00:01:45', '00:02:00']);
  });
  it('rate / increase drop the name; sum by (path) adds the codes', () => {
    // /track 200: 4 samples in (60,120], 50→80: 30 × (45+15)/45 = 40, rate 0.6667; 500: 2 samples (90, 120) 3→4, gap 30 ≥ 33? no:
    // avg 30, threshold 33, start gap 30 kept; zero point 30 × 3/1 = 90 not < 30: increase 1 × (30+30)/30 = 2
    expect(q('increase(http_requests_total{path="/track"}[1m])').rows).toEqual([['{code="200", job="api", path="/track"}', expect.closeTo(40, 6)], ['{code="500", job="api", path="/track"}', expect.closeTo(2, 6)]]);
    const s = q('sum by (path) (rate(http_requests_total[1m]))').rows;
    expect(s).toEqual([['{path="/track"}', expect.closeTo(42 / 60, 6)]]); // /quote has one sample in (60,120]: no result
    expect(q('sum(rate(http_requests_total[1m])) by (path)').rows).toEqual(s);
    expect(q('avg by (job) (increase(http_requests_total[2m]))').rows).toHaveLength(1);
  });
  it('histogram_quantile over sum by (le)', () => {
    const h = [['0.1', 50], ['0.25', 80], ['0.5', 95], ['1', 100], ['+Inf', 100]].flatMap(([le, n]) =>
      [ser({ __name__: 'lat_bucket', le: String(le), pod: 'a' }, [[60, 0], [120, Number(n) / 2]]), ser({ __name__: 'lat_bucket', le: String(le), pod: 'b' }, [[60, 0], [120, Number(n) / 2]])]);
    const r = runPromql('histogram_quantile(0.9, sum by (le) (lat_bucket))', h, at).rows;
    expect(r).toEqual([['{}', expect.closeTo(0.25 + 0.25 * 10 / 15, 6)]]);
  });
});

describe('the parser refuses unsafe or unknown input (parse as data, never eval)', () => {
  it.each([
    ['SELECT 1'], ['up; drop'], ['{job=~".*"}'], ['up{__proto__="x"}'], ['constructor'], ['up{constructor="x"}'],
    ['label_replace(up, "a", "b", "c", "d")'], ['sum without (job) (up)'], ['rate(up)'], ['sum(up[5m])'], ['up{job=~"(a+)+"}'],
    ['up{job=~"(?=a)"}'], ['up{job=~"(a)\\\\1"}'], ['up{job=~"a{1,9}"}'], ['up[30s5m]'], ['"x".constructor'], ['up{job="a"'], [`up{job=~"${'a'.repeat(70)}"}`],
    ['x'.repeat(401)], ['process.exit()'], ['`id`'],
  ])('%s', (src) => {
    expect(() => parse(src)).toThrow(PromqlError);
  });
  it('a refusal carries code promql and a 1-based position', () => {
    try { parse('up{job=}'); } catch (e) { expect(e).toMatchObject({ code: 'promql', position: 8 }); }
  });
  it('checkRegex keeps plain alternation and classes', () => {
    expect(() => checkRegex('/track|/quote')).not.toThrow();
    expect(() => checkRegex('5[0-9][0-9]')).not.toThrow();
  });
  it('seriesOf refuses prototype keys in label JSON and keeps labels on null-prototype objects', () => {
    expect(() => seriesOf([['m', '{"__proto__": "x"}', 0, 1]])).toThrow(PromqlError);
    expect(() => seriesOf([['m', '{"constructor": "x"}', 0, 1]])).toThrow(PromqlError);
    const s = seriesOf([['m', '{"job": "api"}', 0, 1]]);
    expect(Object.getPrototypeOf(s[0].labels)).toBeNull();
    expect(evaluate(parse('m{toString="x"}'), s, 0)).toEqual([]);
  });
});
