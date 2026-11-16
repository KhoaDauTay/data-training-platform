import { PGlite } from '@electric-sql/pglite';
import { initDb } from './init';
import { runSandboxed, sqlErrorInfo } from './run';

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

// One query at a time: BEGIN … ROLLBACK pairs from two runs must never interleave.
// DbClient also sends one query at a time; this queue is the second line of defence.
let queue: Promise<void> = Promise.resolve();

onmessage = (e: MessageEvent<{ id: number; sql: string }>) => {
  const { id, sql } = e.data;
  queue = queue.then(async () => {
    try {
      const { db } = await ready;
      postMessage({ type: 'result', id, result: await runSandboxed(db, sql) });
    } catch (err) {
      // Custom Error fields do not survive postMessage, so send plain fields.
      const error = sqlErrorInfo(err) ?? { message: err instanceof Error ? err.message : String(err) };
      postMessage({ type: 'error', id, error });
    }
  });
};
