import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureSchema, seededSchemas } from '../src/db/lab';
import {
  bootDb,
  CURRENT_KEY,
  dumpSeeded,
  mayReplace,
  SNAPSHOT_FORMAT,
  snapshotSchemas,
  storeDump,
  type SnapshotRecord,
  type SnapshotStore,
} from '../src/db/snapshot';

// V16-OFFLINE (L143): the seeded-DB snapshot. The IndexedDB store itself is checked by hand in the browser (review-log v16).

/** In-memory stand-in for the IndexedDB store. */
function memStore(init?: unknown): SnapshotStore & { rec: unknown } {
  const s = {
    rec: init,
    get: async () => s.rec,
    put: async (rec: SnapshotRecord, replace: (old: unknown) => boolean) => {
      if (replace(s.rec)) s.rec = rec;
    },
    delete: async () => {
      s.rec = undefined;
    },
  };
  return s;
}

const rec = (schemas: Record<string, string>, over: Partial<SnapshotRecord> = {}): SnapshotRecord => ({
  format: SNAPSHOT_FORMAT,
  pglite: CURRENT_KEY.pglite,
  schemas,
  blob: new Blob(['x']),
  ...over,
});

describe('snapshot key (pure)', () => {
  it('build-time key: a hash per seeded schema and the installed PGlite version', () => {
    expect(Object.keys(CURRENT_KEY.hashes).sort()).toEqual(['ecom', 'fin', 'game', 'lab']);
    for (const h of Object.values(CURRENT_KEY.hashes)) expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(CURRENT_KEY.pglite).toBe('0.5.16'); // package.json pins it exactly; the seed's random() depends on it
  });

  it('a record fits only this format, PGlite version and seed hashes', () => {
    const { game, lab } = CURRENT_KEY.hashes;
    expect(snapshotSchemas(rec({ game, lab }))).toEqual(['game', 'lab']);
    expect(snapshotSchemas(rec({ game: 'deadbeefdeadbeef' }))).toBeUndefined(); // seed changed
    expect(snapshotSchemas(rec({ game }, { pglite: '0.5.15' }))).toBeUndefined();
    expect(snapshotSchemas(rec({ game }, { format: SNAPSHOT_FORMAT + 1 }))).toBeUndefined();
    expect(snapshotSchemas(rec({ game, nope: 'x' }))).toBeUndefined(); // unknown schema id
    expect(snapshotSchemas(rec({}))).toBeUndefined();
    expect(snapshotSchemas({ ...rec({ game }), blob: 'x' })).toBeUndefined();
    for (const bad of [undefined, null, 1, 'x', []]) expect(snapshotSchemas(bad)).toBeUndefined();
  });

  it('a new dump replaces the stored one only when it holds every schema the stored one has', () => {
    const { game, lab } = CURRENT_KEY.hashes;
    expect(mayReplace(undefined, ['lab'])).toBe(true);
    expect(mayReplace(rec({ game: 'old' }), ['lab'])).toBe(true); // stored one is stale
    expect(mayReplace(rec({ game }), ['game', 'lab'])).toBe(true);
    expect(mayReplace(rec({ game, lab }), ['lab'])).toBe(false); // another tab stored more
  });
});

describe('snapshot round trip (real PGlite)', () => {
  const PLAN = 'EXPLAIN (FORMAT JSON) SELECT * FROM logistics.container_events WHERE container_id = 42';
  const md5 = async (db: PGlite, table: string) =>
    (await db.query<{ m: string; n: number }>(`SELECT md5(string_agg(x::text, ',' ORDER BY x::text)) AS m, count(*)::int AS n FROM ${table} x`)).rows[0];
  const cost = async (db: PGlite) => ((await db.query<{ 'QUERY PLAN': [{ Plan: { 'Total Cost': number } }] }>(PLAN)).rows[0]['QUERY PLAN'][0].Plan['Total Cost']);
  const sandboxRels = async (db: PGlite) =>
    (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = 'sandbox'::regnamespace")).rows[0].n;

  let seeded: PGlite;
  const store = memStore();
  let want: { events: unknown; orders: unknown; cost: number; stats: number };

  beforeAll(async () => {
    ({ db: seeded } = await bootDb()); // no store: an empty engine, as before v16
    await ensureSchema(seeded, 'game');
    await ensureSchema(seeded, 'lab');
    want = {
      events: await md5(seeded, 'logistics.container_events'),
      orders: await md5(seeded, 'lab.orders'),
      cost: await cost(seeded),
      stats: (await seeded.query<{ n: number }>('SELECT count(*)::int AS n FROM pg_statistic')).rows[0].n,
    };
    const d = await dumpSeeded(seeded);
    expect(d?.schemas.sort()).toEqual(['game', 'lab']);
    await storeDump(store, d!);
  });
  afterAll(() => seeded?.close());

  it('loads the same data, statistics and chapter 11 plan cost, and ensureSchema is then a no-op', async () => {
    expect(snapshotSchemas(store.rec)).toEqual(['game', 'lab']);
    expect((store.rec as SnapshotRecord).blob.type).toBe('application/gzip');
    const { db, restored } = await bootDb(store);
    try {
      expect(restored.sort()).toEqual(['game', 'lab']);
      expect([...seededSchemas(db)].sort()).toEqual(['game', 'lab']);
      expect(await md5(db, 'logistics.container_events')).toEqual(want.events);
      expect(await md5(db, 'lab.orders')).toEqual(want.orders);
      expect(await cost(db)).toBe(want.cost);
      expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM pg_statistic')).rows[0].n).toBe(want.stats);
      // search_path is per session: bootDb sets it again (unqualified names resolve to Logistics, then sandbox).
      expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM shipments')).rows[0].n).toBeGreaterThan(0);
      await ensureSchema(db, 'game', 'SELECT 1/0'); // already there: the (broken) source is never run
    } finally {
      await db.close();
    }
  });

  it('no dump while sandbox holds an imported table', async () => {
    await seeded.exec('CREATE UNLOGGED TABLE sandbox.my_csv AS SELECT 1 AS x');
    try {
      expect(await dumpSeeded(seeded)).toBeUndefined();
    } finally {
      await seeded.exec('DROP TABLE sandbox.my_csv');
    }
  });

  it('a snapshot that still holds sandbox tables loads with an empty sandbox', async () => {
    await seeded.exec('CREATE UNLOGGED TABLE sandbox.u AS SELECT g AS x FROM generate_series(1, 100) g; CREATE TABLE sandbox.l AS SELECT 1 AS x');
    const tar = await seeded.dumpDataDir('none');
    await seeded.exec('DROP TABLE sandbox.u, sandbox.l');
    const s = memStore();
    await storeDump(s, { tar, schemas: ['game', 'lab'] });
    const { db, restored } = await bootDb(s);
    try {
      expect(restored.length).toBe(2);
      expect(await sandboxRels(db)).toBe(0);
      await db.exec('CREATE TABLE sandbox.t AS SELECT 1 AS x'); // the CSV import replay still has its schema
    } finally {
      await db.close();
    }
  });

  it('a record from another seed is deleted and the engine boots empty', async () => {
    const s = memStore({ ...(store.rec as SnapshotRecord), schemas: { game: 'deadbeefdeadbeef' } });
    const { db, restored } = await bootDb(s);
    try {
      expect(restored).toEqual([]);
      expect(s.rec).toBeUndefined();
      expect([...seededSchemas(db)]).toEqual([]);
      expect((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM pg_namespace WHERE nspname IN ('logistics', 'lab')")).rows[0].n).toBe(0);
    } finally {
      await db.close();
    }
  });

  it('a corrupt blob or a failing store falls back to an empty engine', async () => {
    const s = memStore({ ...(store.rec as SnapshotRecord), blob: new Blob([new Uint8Array(64)], { type: 'application/gzip' }) });
    const a = await bootDb(s);
    expect(a.restored).toEqual([]);
    expect(s.rec).toBeUndefined();
    expect(await sandboxRels(a.db)).toBe(0);
    await a.db.close();
    const failing: SnapshotStore = { get: () => Promise.reject(new Error('quota')), put: async () => {}, delete: async () => {} };
    const b = await bootDb(failing);
    expect(b.restored).toEqual([]);
    await b.db.close();
  });
});
