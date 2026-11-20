import type { LabScript } from './script';
import { labTemplate, runLabScript } from './session';

// ENG-PGLAB (L230): the engine lab's own worker and PGlite; never the game worker (src/db/worker.ts) or its data.
// Named pglabWorker, not worker, so its chunk is its own budget group (check-budget `pglab`), not `worker`.

labTemplate().then(
  () => postMessage({ type: 'ready' }),
  (e: unknown) => postMessage({ type: 'initError', message: e instanceof Error ? e.message : String(e) }),
);

let queue: Promise<void> = Promise.resolve();

onmessage = (e: MessageEvent<{ id: number; script: LabScript }>) => {
  const { id, script } = e.data;
  queue = queue.then(async () => {
    try {
      postMessage({ type: 'result', id, result: await runLabScript(script) });
    } catch (err) {
      postMessage({ type: 'fault', id, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
