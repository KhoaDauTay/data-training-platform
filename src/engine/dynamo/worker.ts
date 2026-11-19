// ENG-DYNAMO: the DynamoDB lab worker. Boots empty; the engine (dynoxide wasm, ~1.2 MB gz) is fetched on the first
// request. One request at a time (DynamoClient queues), so a timeout terminates only this worker.
//
// The package's worker script and both .wasm are copied as plain assets (`?url`), never bundled: its sqlite3 build holds
// `new Worker(new URL('sqlite3-worker1.mjs', import.meta.url))` for a file the package does not ship, which breaks the
// Vite build. The script finds its .wasm next to itself by their unhashed names, so fetch maps those names to the
// hashed asset URLs. The .wasm are not in "exports", hence the path through node_modules.
import engineJs from '@dynoxide/wasm-engine/worker?url';
import engineWasm from '../../../node_modules/@dynoxide/wasm-engine/dynoxide_bg.wasm?url';
import sqliteWasm from '../../../node_modules/@dynoxide/wasm-engine/sqlite3.wasm?url';
import { DynamoEngine } from './engine';
import { DynamoError, DynamoInputError, type DynamoErrorInfo, type DynamoWorkerReply, type DynamoWorkerRequest } from './types';

// Kept before the engine loads: engine.ts swaps the scope's postMessage for its own router (see hook()).
const send = self.postMessage.bind(self) as (m: DynamoWorkerReply) => void;

const ASSETS: Record<string, string> = { 'dynoxide_bg.wasm': engineWasm, 'sqlite3.wasm': sqliteWasm };
const realFetch = fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  return realFetch(ASSETS[url.slice(url.lastIndexOf('/') + 1)] ?? input, init);
};

let engine: Promise<DynamoEngine> | undefined;

function info(e: unknown): DynamoErrorInfo {
  if (e instanceof DynamoError) return { kind: 'dynamo', type: e.type, message: e.message };
  if (e instanceof DynamoInputError) return { kind: 'input', code: e.code, detail: e.detail, line: e.line, column: e.column };
  return { kind: 'failed', message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
}

self.addEventListener('message', async ({ data }: MessageEvent<DynamoWorkerRequest>) => {
  const t = performance.now();
  try {
    engine ??= DynamoEngine.open(() => import(/* @vite-ignore */ engineJs));
    const eng = await engine;
    if (data.kind === 'setup') {
      await eng.setup(data.dataset, data.lab);
      send({ id: data.id, ok: true, ms: performance.now() - t });
    } else send({ id: data.id, ok: true, result: await eng.run(data.req, data.after) });
  } catch (e) {
    send({ id: data.id, ok: false, error: info(e) });
  }
});
