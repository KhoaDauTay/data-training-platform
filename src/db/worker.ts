import { PGlite } from '@electric-sql/pglite';
import { initDb } from './init';
import { runSandboxed } from './run';

const ready = (async () => {
  const db = new PGlite();
  await initDb(db);
  return db;
})();

ready.then(
  () => postMessage({ type: 'ready' }),
  (e: unknown) => postMessage({ type: 'initError', message: e instanceof Error ? e.message : String(e) }),
);

// One query at a time: BEGIN … ROLLBACK pairs from two runs must never interleave.
let queue: Promise<void> = Promise.resolve();

onmessage = (e: MessageEvent<{ id: number; sql: string }>) => {
  const { id, sql } = e.data;
  queue = queue.then(async () => {
    try {
      const db = await ready;
      postMessage({ type: 'result', id, result: await runSandboxed(db, sql) });
    } catch (err) {
      postMessage({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
