// Throwaway spike page (Track G, L139). Not part of the app.
import { compareResults } from '../src/grader';
import type { QueryResult } from '../src/db/run';

const qs = new URLSearchParams(location.search);
const BASE = qs.get('base') === 'self' ? location.origin + '/py/' : 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
const PLOT = qs.get('plot') === '1';
const PG_ONLY = qs.get('pg') === 'only';
const out: Record<string, unknown> = { base: BASE };
const log = (k: string, v: unknown) => { out[k] = v; document.getElementById('log')!.textContent += `${k}: ${JSON.stringify(v)}\n`; };

function rpc(w: Worker) {
  let n = 0;
  const wait = new Map<string, (d: any) => void>();
  w.onmessage = (e) => { wait.get(e.data.id)?.(e.data); wait.delete(e.data.id); };
  const call = (msg: object) => new Promise<any>((res, rej) => {
    const id = String(++n);
    wait.set(id, (d) => (d.err ? rej(new Error(d.err)) : res(d.ok)));
    w.postMessage({ id, ...msg });
  });
  const on = (id: string) => new Promise<any>((res) => wait.set(id, (d) => res(d.ok)));
  return { call, on };
}

// PGlite returns Date and numeric-as-string; turn dates into ISO text before crossing to Python.
const plain = (q: QueryResult) => ({ ...q, rows: q.rows.map((r) => r.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))) });

async function main() {
  const T0 = performance.now();
  const pgW = new Worker(new URL('./pg.worker.ts', import.meta.url), { type: 'module' });
  const pg = rpc(pgW);
  const pgReady = pg.on('ready');
  if (PG_ONLY) { log('pgReadyMs', (await pgReady).ms); return; }
  const pyW = new Worker(new URL('./py.worker.js', import.meta.url), { type: 'module' });
  const py = rpc(pyW);
  const boot = py.call({ op: 'boot', base: BASE, pkgs: ['pandas'] });
  log('pgReadyMs', (await pgReady).ms);
  log('boot', await boot);
  log('pandasReadyWallMs', performance.now() - T0);

  const sql = `SELECT o.id AS order_id, o.store_id, o.order_date, o.channel, o.status, i.product_id, i.qty, i.unit_price_vnd
               FROM orders o JOIN order_items i ON i.order_id = o.id`;
  let t = performance.now();
  const q = await pg.call({ sql });
  log('sqlMs', performance.now() - t);
  t = performance.now();
  log('toDf', await py.call({ op: 'df', name: 'items', q: plain(q) }));
  log('sqlToDfWallMs', performance.now() - t);
  const stores = await pg.call({ sql: 'SELECT * FROM stores' });
  await py.call({ op: 'df', name: 'stores', q: plain(stores) });

  const ex: Record<string, string> = {
    groupby: `items.assign(rev=items.qty*items.unit_price_vnd).query("status=='PAID'").groupby(['store_id','channel'], as_index=False)['rev'].sum().shape`,
    merge: `m = items.merge(stores, left_on='store_id', right_on='id', how='left'); m.shape`,
    pivot: `items['month'] = pd.to_datetime(items.order_date).dt.to_period('M').astype(str)
p = items.assign(rev=items.qty*items.unit_price_vnd).pivot_table(index='month', columns='store_id', values='rev', aggfunc='sum', fill_value=0); p.shape`,
  };
  const times: Record<string, number> = {};
  for (const [k, code] of Object.entries(ex)) times[k] = (await py.call({ op: 'run', code })).ms;
  log('exerciseMs', times);

  // Grading: both DataFrames -> QueryResult -> the SQL grader's compareResults.
  const toQ = (expr: string) => `import json
_d = ${expr}.reset_index(drop=True)
json.dumps({'columns': [str(c) for c in _d.columns], 'types': [0]*len(_d.columns), 'rows': json.loads(_d.to_json(orient='values', date_format='iso'))})`;
  const sol = `items.assign(rev=items.qty*items.unit_price_vnd).query("status=='PAID'").groupby('store_id', as_index=False)['rev'].sum().sort_values('store_id')`;
  const right = `items[items.status=='PAID'].assign(r=lambda d: d.qty*d.unit_price_vnd).groupby('store_id')['r'].sum().reset_index()`;
  const wrong = `items.assign(rev=items.qty*items.unit_price_vnd).groupby('store_id', as_index=False)['rev'].sum()`;
  t = performance.now();
  const [e, r, w] = await Promise.all([sol, right, wrong].map(async (x) => JSON.parse((await py.call({ op: 'run', code: toQ(x) })).out) as QueryResult));
  log('gradeConvertMs', performance.now() - t);
  log('grade', { right: compareResults(e, r, false).ok, wrong: compareResults(e, w, false).ok });

  if (qs.get('extra') === '1') {
    // numeric (string from PGlite) + nullable int column -> dtypes
    const q2 = await pg.call({ sql: `SELECT store_id, customer_id, round(avg(qty * unit_price_vnd), 2) AS avg_rev FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY 1, 2` });
    log('typesOid', q2.types);
    await py.call({ op: 'df', name: 'q2', q: plain(q2) });
    log('dtypesRaw', (await py.call({ op: 'run', code: `str(dict(q2.dtypes.astype(str)))` })).out);
    // OID-aware conversion: 1700 numeric -> float, ints with NULL -> Int64
    log('dtypesMapped', (await py.call({ op: 'run', code: `q2['avg_rev'] = pd.to_numeric(q2.avg_rev); q2['customer_id'] = q2.customer_id.astype('Int64'); str(dict(q2.dtypes.astype(str)))` })).out);
    // ~50k rows (MAX_ROWS_WORKER)
    t = performance.now();
    const big = await pg.call({ sql: `SELECT o.id, o.store_id, o.customer_id, o.order_date, o.channel, i.qty, i.unit_price_vnd, g FROM orders o JOIN order_items i ON i.order_id = o.id CROSS JOIN generate_series(1, 12) g LIMIT 50000` });
    const tSql = performance.now() - t;
    const d = await py.call({ op: 'df', name: 'big', q: plain(big) });
    log('big', { rows: big.rows.length, cols: big.columns.length, sqlMs: tSql, toDfMs: d.ms, wallMs: performance.now() - t });
    // learner answer as a Series with the key in the index; normalise with reset_index() (keep the index)
    const norm = (expr: string) => `import json
_d = ${expr}
_d = _d.to_frame() if isinstance(_d, pd.Series) else _d
_d = _d.reset_index() if not isinstance(_d.index, pd.RangeIndex) else _d
json.dumps({'columns': [str(c) for c in _d.columns], 'types': [0]*len(_d.columns), 'rows': json.loads(_d.to_json(orient='values', date_format='iso'))})`;
    const series = `items[items.status=='PAID'].assign(r=lambda d: d.qty*d.unit_price_vnd).groupby('store_id')['r'].sum()`;
    const e2 = JSON.parse((await py.call({ op: 'run', code: norm(sol) })).out) as QueryResult;
    const s2 = JSON.parse((await py.call({ op: 'run', code: norm(series) })).out) as QueryResult;
    const s1 = JSON.parse((await py.call({ op: 'run', code: toQ(series + '.to_frame()') })).out) as QueryResult;
    log('seriesGrade', { normalised: compareResults(e2, s2, false).ok, dropIndex: compareResults(e, s1, false).ok, dropIndexCols: s1.columns });
  }

  if (PLOT) {
    log('matplotlib', await py.call({ op: 'more', pkgs: ['matplotlib'] }));
    const svg = await py.call({ op: 'run', code: `import matplotlib
matplotlib.use('svg')
import matplotlib.pyplot as plt, io
fig, ax = plt.subplots(figsize=(6,3))
items.assign(rev=items.qty*items.unit_price_vnd).groupby('store_id')['rev'].sum().plot.bar(ax=ax)
b = io.StringIO(); fig.savefig(b, format='svg'); plt.close(fig); b.getvalue()` });
    log('plotMs', svg.ms);
    log('svgBytes', svg.out.length);
    document.getElementById('plot')!.innerHTML = svg.out;
    // second plot (warm matplotlib)
    log('plot2Ms', (await py.call({ op: 'run', code: `fig, ax = plt.subplots(); items.groupby('channel').size().plot.bar(ax=ax); b = io.StringIO(); fig.savefig(b, format='svg'); plt.close(fig); len(b.getvalue())` })).ms);
  }
  log('heap', await py.call({ op: 'heap' }));
  log('resources', await py.call({ op: 'res' }));
  log('totalMs', performance.now() - T0);
}
main().then(
  () => { (window as any).__result = out; (window as any).__done = true; },
  (e) => { (window as any).__result = { ...out, error: String(e) }; (window as any).__done = true; },
);
