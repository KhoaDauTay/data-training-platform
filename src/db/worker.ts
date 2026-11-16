import { PGlite } from '@electric-sql/pglite';
import { initDb } from './init';
import { countingFetch } from './loadProgress';
import type { WorkerBody } from './client';
import { dropImport, importCsv } from './import';
import { runExplain, runSandboxed, sqlErrorInfo } from './run';

// PGlite fetches its .wasm/.data with the global fetch; count the bytes for the loading status.
globalThis.fetch = countingFetch(fetch.bind(globalThis), (p) => postMessage({ type: 'progress', ...p }));

const ready = (async () => {
  const t0 = performance.now();
  const db = new PGlite();
  await db.waitReady;
  const t1 = performance.now();
  await initDb(db);
  const timings = { bootMs: Math.round(t1 - t0), seedMs: Math.round(performance.now() - t1) };
  return { db, timings };
})();

ready.then(
  ({ timings }) => postMessage({ type: 'ready', timings }),
  (e: unknown) => postMessage({ type: 'initError', message: e instanceof Error ? e.message : String(e) }),
);

async function handle(db: PGlite, body: WorkerBody): Promise<unknown> {
  if (body.kind === 'import') return importCsv(db, body.req, body.file);
  if (body.kind === 'dropImport') return dropImport(db, body.table);
  if (body.kind === 'explain') return runExplain(db, body.sql);
  if (body.kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, body.sql);
  }
  return runSandboxed(db, body.sql);
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
