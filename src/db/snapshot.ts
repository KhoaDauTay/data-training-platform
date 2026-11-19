import { PGlite } from '@electric-sql/pglite';
import { SCHEMAS, type SchemaId } from '../domains';
import { SANDBOX_SETUP_SQL } from './import';
import { initEngine } from './init';
import { ensureSchema, markSeeded, seededSchemas } from './lab';

/**
 * V16-OFFLINE (L143, spike S-a L137): the seeded cluster, dumped once a schema is seeded and loaded on the next boot
 * instead of seeding again. One record per browser (`dumpDataDir` takes the whole cluster), keyed by the PGlite version
 * and a build-time hash of each schema's seed files (`__SEED_HASH__`, vite.config.ts). Only a cache: any mismatch or
 * error drops it and the worker seeds as before. Worker only (main never imports this).
 */

/** Bump when anything besides the seed files changes what a seeded schema holds (ensureSchema, SANDBOX_SETUP_SQL). */
export const SNAPSHOT_FORMAT = 1;

export interface SnapshotKey { pglite: string; hashes: Readonly<Record<string, string>> }
export const CURRENT_KEY: SnapshotKey = { pglite: __PGLITE__, hashes: __SEED_HASH__ };

export interface SnapshotRecord {
  format: number;
  pglite: string;
  /** Schema id → the seed hash it was built from. */
  schemas: Partial<Record<SchemaId, string>>;
  /** gzip tarball of the data dir (bootDb unzips it before loadDataDir). */
  blob: Blob;
}

/** Where the record lives: IndexedDB in the worker (idbStore), a variable in the tests. */
export interface SnapshotStore {
  get(): Promise<unknown>;
  /** Writes `rec` only if `replace(current record)` is true, in one transaction. */
  put(rec: SnapshotRecord, replace: (old: unknown) => boolean): Promise<void>;
  delete(): Promise<void>;
}

const isSchemaId = (id: string): id is SchemaId => Object.hasOwn(SCHEMAS, id);

/** The schemas a stored record holds, or undefined when it does not fit this build (then it is deleted and not loaded). */
export function snapshotSchemas(rec: unknown, key: SnapshotKey = CURRENT_KEY): SchemaId[] | undefined {
  if (typeof rec !== 'object' || rec === null) return undefined;
  const r = rec as Partial<SnapshotRecord>;
  if (r.format !== SNAPSHOT_FORMAT || r.pglite !== key.pglite || !(r.blob instanceof Blob)) return undefined;
  if (typeof r.schemas !== 'object' || r.schemas === null) return undefined;
  const entries = Object.entries(r.schemas);
  if (!entries.length || entries.some(([id, h]) => !isSchemaId(id) || key.hashes[id] === undefined || key.hashes[id] !== h)) return undefined;
  return entries.map(([id]) => id as SchemaId);
}

/** A new snapshot of `next` replaces the stored one only if that one is unusable or holds no schema `next` lacks (two tabs). */
export function mayReplace(old: unknown, next: readonly SchemaId[], key: SnapshotKey = CURRENT_KEY): boolean {
  const have = snapshotSchemas(old, key);
  return !have || have.every((id) => next.includes(id));
}

/**
 * Boots the engine: from the stored snapshot when it fits (sandbox emptied: its UNLOGGED import tables come back empty,
 * and imports are replayed by DbClient as after any restart), else empty as before v16. Never throws for a bad snapshot.
 */
async function emptyDb(): Promise<{ db: PGlite; restored: SchemaId[] }> {
  const db = new PGlite();
  await db.waitReady;
  await initEngine(db);
  cleanMark.set(db, await nextXid(db));
  return { db, restored: [] };
}

export async function bootDb(store?: SnapshotStore, key: SnapshotKey = CURRENT_KEY): Promise<{ db: PGlite; restored: SchemaId[] }> {
  if (store) {
    const rec = await store.get().catch(() => undefined);
    const ids = snapshotSchemas(rec, key);
    if (rec !== undefined && !ids) await store.delete().catch(() => undefined);
    if (ids) {
      let db: PGlite | undefined;
      try {
        // Unzipped here, not by PGlite: its own gunzip leaves an unhandled rejection behind on a corrupt blob.
        const gz = (rec as SnapshotRecord).blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const tar = new Blob([await new Response(gz).arrayBuffer()], { type: 'application/x-tar' });
        db = new PGlite({ loadDataDir: tar });
        await db.waitReady;
        const names = ids.map((id) => SCHEMAS[id]);
        const found = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM pg_namespace WHERE nspname = ANY($1)', [names]);
        if (found.rows[0]?.n !== names.length) throw new Error('snapshot: schema missing');
        await db.exec(`DROP SCHEMA IF EXISTS sandbox CASCADE; ${SANDBOX_SETUP_SQL}`);
        markSeeded(db, ids);
        cleanMark.set(db, await nextXid(db));
        return { db, restored: ids };
      } catch {
        await db?.close().catch(() => undefined);
        // Dropped only once an empty engine boots: if that fails too (offline without the engine's files), the snapshot was not the problem.
        const fresh = await emptyDb();
        await store.delete().catch(() => undefined);
        return fresh;
      }
    }
  }
  return emptyDb();
}

/**
 * Next transaction id after the last seed or boot, or null once anything else wrote. A rolled-back write still leaves
 * dead tuples (and moved sequences): the planner sizes tables by their pages, so a dump then would bake in other plan
 * costs than the seed's (chapter 11). Read-only queries take no transaction id, so a session of SELECTs stays clean.
 */
const cleanMark = new WeakMap<PGlite, string | null>();
const nextXid = async (db: PGlite): Promise<string> =>
  (await db.query<{ x: string }>('SELECT pg_snapshot_xmax(pg_current_snapshot())::text AS x')).rows[0].x;

/** ensureSchema for the worker: returns true when it seeded something new on a DB nothing else has written to (dumpSeeded may run). */
export async function ensureTracked(db: PGlite, id: SchemaId): Promise<boolean> {
  const mark = cleanMark.get(db);
  if (mark === undefined || (mark !== null && mark !== (await nextXid(db)))) cleanMark.set(db, null);
  const before = seededSchemas(db).size;
  await ensureSchema(db, id);
  if (seededSchemas(db).size === before) return false;
  if (cleanMark.get(db) === null) return false;
  cleanMark.set(db, await nextXid(db));
  return true;
}

/** Uncompressed dump (~0.1 s), taken inside the worker queue. None while `sandbox` holds an imported table, none after a write. */
export async function dumpSeeded(db: PGlite): Promise<{ tar: Blob; schemas: SchemaId[] } | undefined> {
  const schemas = [...seededSchemas(db)];
  if (!schemas.length || !cleanMark.get(db) || cleanMark.get(db) !== (await nextXid(db))) return undefined;
  const r = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM pg_class WHERE relnamespace = 'sandbox'::regnamespace");
  if (r.rows[0]?.n !== 0) return undefined;
  return { tar: await db.dumpDataDir('none'), schemas };
}

/** gzip (outside the queue) and store, unless the stored record holds a schema this dump lacks. */
export async function storeDump(store: SnapshotStore, d: { tar: Blob; schemas: SchemaId[] }, key: SnapshotKey = CURRENT_KEY): Promise<void> {
  const gz = await new Response(d.tar.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  const rec: SnapshotRecord = {
    format: SNAPSHOT_FORMAT,
    pglite: key.pglite,
    schemas: Object.fromEntries(d.schemas.map((id) => [id, key.hashes[id]])),
    blob: new Blob([gz], { type: 'application/gzip' }),
  };
  await store.put(rec, (old) => mayReplace(old, d.schemas, key));
}

const IDB_NAME = 'cargo-query-snap';
const IDB_STORE = 'snap';
const IDB_KEY = 'latest';
const IDB_OPEN_MS = 3000;

/** IndexedDB `cargo-query-snap` / `snap`, key `latest` (its own database: the imports DB keeps its version). Browser only. */
export function idbStore(): SnapshotStore {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('snapshot: idb open timeout')), IDB_OPEN_MS);
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => {
        clearTimeout(timer);
        resolve(r.result);
      };
      r.onerror = r.onblocked = () => {
        clearTimeout(timer);
        reject(r.error ?? new Error('snapshot: idb blocked'));
      };
    });
  const tx = <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> =>
    open().then(
      (db) =>
        new Promise<T | undefined>((resolve, reject) => {
          const t = db.transaction(IDB_STORE, mode);
          const req = f(t.objectStore(IDB_STORE));
          t.oncomplete = () => {
            db.close();
            resolve(req ? (req.result as T) : undefined);
          };
          t.onerror = t.onabort = () => {
            db.close();
            reject(t.error ?? new Error('snapshot: idb aborted'));
          };
        }),
    );
  return {
    get: () => tx<unknown>('readonly', (s) => s.get(IDB_KEY)),
    put: (rec, replace) =>
      tx<void>('readwrite', (s) => {
        const cur = s.get(IDB_KEY);
        cur.onsuccess = () => {
          if (replace(cur.result)) s.put(rec, IDB_KEY);
        };
      }).then(() => undefined),
    delete: () => tx<void>('readwrite', (s) => s.delete(IDB_KEY)).then(() => undefined),
  };
}
