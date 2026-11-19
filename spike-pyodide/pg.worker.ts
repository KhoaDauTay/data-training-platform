import { PGlite } from '@electric-sql/pglite';
import { initEngine } from '../src/db/init';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed } from '../src/db/run';

const t0 = performance.now();
const ready = (async () => {
  const db = new PGlite();
  await db.waitReady;
  await initEngine(db);
  await ensureSchema(db, 'lab');
  return db;
})();
ready.then(() => postMessage({ id: 'ready', ok: { ms: performance.now() - t0 } }));
onmessage = async (e) => {
  const db = await ready;
  try {
    postMessage({ id: e.data.id, ok: await runSandboxed(db, e.data.sql, 50_000, { schema: 'lab' }) });
  } catch (err) {
    postMessage({ id: e.data.id, err: String(err) });
  }
};
