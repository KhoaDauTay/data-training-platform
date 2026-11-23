import type { PGlite } from '@electric-sql/pglite';
import { countingFetch } from './loadProgress';
import type { WorkerBody } from './client';
import { dropImport, importCsv } from './import';
import { bootDb, dumpSeeded, ensureTracked, idbStore, storeDump } from './snapshot';
import { runExplain, runLab, runSandboxed, sqlErrorInfo } from './run';

// PGlite fetches its .wasm/.data with the global fetch; count the bytes for the loading status.
globalThis.fetch = countingFetch(fetch.bind(globalThis), (p) => postMessage({ type: 'progress', ...p }));

// V16-OFFLINE (L143): the seeded cluster is kept in IndexedDB (src/db/snapshot.ts). Not in dev: a seed edit would keep
// the old __SEED_HASH__ until the dev server restarts.
const store = !import.meta.env.DEV && typeof indexedDB !== 'undefined' ? idbStore() : undefined;

const ready = (async () => {
  const t0 = performance.now();
  // v12.0 P1: no seed here; ensure requests seed each schema (lab.ts LAZY_SEEDS), unless a snapshot already holds it.
  const { db, restored } = await bootDb(store);
  // seedMs is 0 since v12.0 (the seeds are the client's `db:ensure:<schema>` measures); kept for the diagnostics shape.
  const timings = { bootMs: Math.round(performance.now() - t0), seedMs: 0, restored };
  return { db, timings };
})();

ready.then(
  ({ timings }) => postMessage({ type: 'ready', timings }),
  (e: unknown) => postMessage({ type: 'initError', message: e instanceof Error ? e.message : String(e) }),
);

async function handle(db: PGlite, body: WorkerBody): Promise<unknown> {
  if (body.kind === 'import') return importCsv(db, body.req, body.file);
  if (body.kind === 'dropImport') return dropImport(db, body.table);
  if (body.kind === 'ensure') {
    if (await ensureTracked(db, body.schema)) queue = queue.then(() => snapshot(db)); // after this result is posted
    return undefined;
  }
  const opts = { schema: body.schema };
  if (body.kind === 'explain') return runExplain(db, body.sql, opts);
  if (body.kind === 'lab') return runLab(db, body.ddl, body.sql, body.table, opts);
  if (body.kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, body.sql, opts);
  }
  return runSandboxed(db, body.sql, undefined, { ...opts, check: body.check });
}

// One query at a time: BEGIN … ROLLBACK pairs from two runs must never interleave.
// DbClient also sends one query at a time; this queue is the second line of defence.
let queue: Promise<void> = Promise.resolve();

/** Downloads the parser (wasm + the steps chunk). Needs no DB, so it runs beside the query queue, not in it. */
async function loadParser(id: number): Promise<void> {
  try {
    const [{ ensureParser }] = await Promise.all([import('../viz/parser'), import('../viz/steps')]);
    await ensureParser();
    postMessage({ type: 'result', id, result: null });
  } catch (err) {
    postMessage({ type: 'fault', id, message: err instanceof Error ? err.message : String(err) });
  }
}

/** Queued right after a seed's result is posted: the dump (~0.1 s) waits for its turn like any query, the gzip runs outside. */
async function snapshot(db: PGlite): Promise<void> {
  if (!store) return;
  const d = await dumpSeeded(db).catch(() => undefined);
  if (!d) return;
  // Two dumps compressing at once: storeDump keeps the record with more schemas (mayReplace), so the newer one wins.
  void (async () => {
    await storeDump(store, d);
    postMessage({ type: 'snapshot', schemas: d.schemas });
  })().catch(() => undefined); // only a cache: the next seed tries again
}

onmessage = (e: MessageEvent<{ id: number } & WorkerBody>) => {
  const { id } = e.data;
  const body: WorkerBody = e.data;
  if (body.kind === 'parser') return void loadParser(id);
  queue = queue.then(async () => {
    try {
      const { db } = await ready;
      postMessage({ type: 'result', id, result: await handle(db, body) });
    } catch (err) {
      // Custom Error fields do not survive postMessage, so send plain fields. Only Postgres errors are SQL errors.
      const error = sqlErrorInfo(err);
      if (error) postMessage({ type: 'error', id, error });
      else postMessage({ type: 'fault', id, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
