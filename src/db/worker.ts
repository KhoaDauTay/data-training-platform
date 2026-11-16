import { PGlite } from '@electric-sql/pglite';
import { initDb } from './init';
import { countingFetch } from './loadProgress';
import type { RequestKind } from './client';
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

async function handle(db: PGlite, kind: RequestKind, sql: string): Promise<unknown> {
  if (kind === 'explain') return runExplain(db, sql);
  if (kind === 'parser') {
    // Both downloads (wasm + the steps chunk) happen here, under the long parser budget.
    const [{ ensureParser }] = await Promise.all([import('../viz/parser'), import('../viz/steps')]);
    await ensureParser();
    return null;
  }
  if (kind === 'steps') {
    const { runSteps } = await import('../viz/steps'); // loads the parser only when this tab is used
    return runSteps(db, sql);
  }
  return runSandboxed(db, sql);
}

// One query at a time: BEGIN … ROLLBACK pairs from two runs must never interleave.
// DbClient also sends one query at a time; this queue is the second line of defence.
let queue: Promise<void> = Promise.resolve();

onmessage = (e: MessageEvent<{ id: number; kind: RequestKind; sql: string }>) => {
  const { id, kind, sql } = e.data;
  queue = queue.then(async () => {
    try {
      const { db } = await ready;
      postMessage({ type: 'result', id, result: await handle(db, kind, sql) });
    } catch (err) {
      // Custom Error fields do not survive postMessage, so send plain fields. Only Postgres errors are SQL errors.
      const error = sqlErrorInfo(err);
      if (error) postMessage({ type: 'error', id, error });
      else postMessage({ type: 'fault', id, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
