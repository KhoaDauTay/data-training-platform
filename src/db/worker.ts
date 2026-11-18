import { PGlite } from '@electric-sql/pglite';
import { initEngine } from './init';
import { countingFetch } from './loadProgress';
import type { WorkerBody } from './client';
import { dropImport, importCsv } from './import';
import { ensureSchema } from './lab';
import { runExplain, runLab, runSandboxed, sqlErrorInfo } from './run';

// PGlite fetches its .wasm/.data with the global fetch; count the bytes for the loading status.
globalThis.fetch = countingFetch(fetch.bind(globalThis), (p) => postMessage({ type: 'progress', ...p }));

const ready = (async () => {
  const t0 = performance.now();
  const db = new PGlite();
  await db.waitReady;
  const t1 = performance.now();
  await initEngine(db); // v12.0 P1: no seed here; ensure requests seed each schema (lab.ts LAZY_SEEDS)
  // seedMs now times only the empty setup; the seeds are the client's `db:ensure:<schema>` measures.
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
  if (body.kind === 'ensure') return ensureSchema(db, body.schema);
  const opts = { schema: body.schema };
  if (body.kind === 'explain') return runExplain(db, body.sql, opts);
  if (body.kind === 'lab') return runLab(db, body.ddl, body.sql, body.table, opts);
  if (body.kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, body.sql, opts);
  }
  return runSandboxed(db, body.sql, undefined, opts);
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
