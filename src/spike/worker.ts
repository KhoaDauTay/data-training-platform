// Spike S-a (throwaway): measures seed vs snapshot restore per schema.
import { PGlite } from '@electric-sql/pglite';
import { initEngine } from '../db/init';
import { ensureSchema } from '../db/lab';
import { SCHEMAS, type SchemaId } from '../domains';

const PGLITE_VERSION = '0.5.16';

const idb = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  const r = indexedDB.open('spike-s-a', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('snap');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> =>
  idb().then((db) => new Promise((res, rej) => {
    const t = db.transaction('snap', mode);
    const r = f(t.objectStore('snap'));
    t.oncomplete = () => res(r.result as T);
    t.onerror = () => rej(t.error);
  }));

const ms = (t: number) => Math.round(performance.now() - t);
const ids = (s: string): SchemaId[] => (s === 'all' ? ['game', 'lab', 'ecom', 'fin'] : (s.split('+') as SchemaId[]));
// One table per schema to check content equality after restore.
const PROBE: Record<SchemaId, string> = {
  game: 'logistics.container_events', lab: 'lab.orders', ecom: 'ecom.order_items', fin: 'finance.loan_snapshots',
};
// Chapter 11 plan check: planner cost must be identical after restore.
const PLAN_SQL = 'EXPLAIN (FORMAT JSON) SELECT * FROM logistics.container_events WHERE container_id = 42';

async function probe(db: PGlite, list: SchemaId[]) {
  const out: Record<string, unknown> = {};
  for (const id of list) {
    const r = await db.query(`SELECT md5(string_agg(x::text, ',' ORDER BY x::text)) md5, count(*)::int n FROM ${PROBE[id]} x`);
    out[id] = r.rows[0];
  }
  if (list.includes('game')) {
    const r = await db.query<Record<string, unknown>>(PLAN_SQL);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out.planCost = (r.rows[0]['QUERY PLAN'] as any)[0].Plan['Total Cost'];
    out.pgStatistic = (await db.query('SELECT count(*)::int n FROM pg_statistic')).rows[0];
  }
  await db.exec('BEGIN'); await db.query('SELECT 1'); await db.exec('ROLLBACK'); // the sandbox round trip still works
  return out;
}

async function key(list: SchemaId[]): Promise<string> {
  const src: string[] = [PGLITE_VERSION];
  for (const id of list) {
    if (id === 'lab') src.push((await import('../db/lab.sql?raw')).default);
    else {
      const m = await (id === 'game' ? import('../db/gameSeed') : id === 'ecom' ? import('../db/ecomSeed') : import('../db/finSeed'));
      src.push(m.schema, m.seed);
    }
  }
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src.join('\0')));
  return list.join('+') + ':' + [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

onmessage = async (e: MessageEvent<{ schema: string; mode: string }>) => {
  const list = ids(e.data.schema);
  const r: Record<string, unknown> = { schema: e.data.schema, mode: e.data.mode };
  try {
    let t = performance.now();
    const k = await key(list); r.keyMs = ms(t); r.key = k;
    if (e.data.mode === 'cold') {
      t = performance.now();
      const db = new PGlite(); await db.waitReady; r.bootMs = ms(t);
      await initEngine(db);
      const ts = performance.now();
      for (const id of list) await ensureSchema(db, id);
      r.seedMs = ms(ts); r.readyMs = ms(t);
      t = performance.now();
      await db.exec('BEGIN'); await db.query(`SELECT count(*) FROM ${PROBE[list[0]]}`); await db.exec('ROLLBACK');
      r.oneRunMs = ms(t);
      t = performance.now(); const tar = await db.dumpDataDir('none'); r.dumpNoneMs = ms(t); r.tarBytes = tar.size;
      t = performance.now(); const tgz = await db.dumpDataDir('gzip'); r.dumpGzipMs = ms(t); r.tgzBytes = tgz.size;
      t = performance.now(); await tx('readwrite', (s) => s.put(tgz, k + ':gz')); r.idbPutGzMs = ms(t);
      t = performance.now(); await tx('readwrite', (s) => s.put(tar, k + ':raw')); r.idbPutRawMs = ms(t);
      r.probe = await probe(db, list);
      r.estimate = await navigator.storage.estimate();
      await db.close();
    } else if (e.data.mode === 'warm' || e.data.mode === 'warmraw') {
      t = performance.now();
      const blob = await tx<Blob | undefined>('readonly', (s) => s.get(k + (e.data.mode === 'warm' ? ':gz' : ':raw')));
      r.idbGetMs = ms(t);
      if (!blob) throw new Error('no snapshot');
      const tl = performance.now();
      const db = new PGlite({ loadDataDir: blob }); await db.waitReady;
      await initEngine(db);
      r.loadMs = ms(tl); r.readyMs = ms(t);
      r.probe = await probe(db, list);
      await db.close();
    } else if (e.data.mode === 'sbxcold') {
      // Does an UNLOGGED import table in `sandbox` survive dump -> load?
      const db = new PGlite(); await initEngine(db);
      for (const id of list) await ensureSchema(db, id);
      await db.exec('CREATE UNLOGGED TABLE sandbox.t AS SELECT g x FROM generate_series(1, 1000) g; CREATE TABLE sandbox.l AS SELECT 1 x;');
      const tgz = await db.dumpDataDir('gzip');
      await tx('readwrite', (s) => s.put(tgz, 'sbx'));
      await db.close();
    } else if (e.data.mode === 'sbxwarm') {
      const blob = await tx<Blob>('readonly', (s) => s.get('sbx'));
      const db = new PGlite({ loadDataDir: blob }); await initEngine(db);
      r.tables = (await db.query("SELECT relname, relpersistence FROM pg_class WHERE relnamespace = 'sandbox'::regnamespace AND relkind = 'r'")).rows;
      for (const t of ['t', 'l']) {
        try { r[t] = (await db.query(`SELECT count(*)::int n FROM sandbox.${t}`)).rows[0]; } catch (err) { r[t] = String(err); }
      }
      await db.close();
    } else if (e.data.mode === 'idb') {
      t = performance.now();
      const db = new PGlite('idb://spike-' + e.data.schema); await db.waitReady; r.bootMs = ms(t);
      await initEngine(db);
      const have = await db.query<{ n: number }>('SELECT count(*)::int n FROM pg_namespace WHERE nspname = ANY($1)', [list.map((i) => SCHEMAS[i])]);
      r.reused = have.rows[0].n === list.length;
      if (!r.reused) for (const id of list) await ensureSchema(db, id);
      r.readyMs = ms(t);
      t = performance.now();
      await db.exec('BEGIN'); await db.query(`SELECT count(*) FROM ${PROBE[list[0]]}`); await db.exec('ROLLBACK');
      r.oneRunMs = ms(t); // what idbfs sync costs per sandboxed Run
      r.probe = await probe(db, list);
      t = performance.now(); await db.close(); r.closeMs = ms(t);
      r.estimate = await navigator.storage.estimate();
    }
  } catch (err) { r.error = err instanceof Error ? err.stack ?? err.message : String(err); }
  postMessage(r);
};
