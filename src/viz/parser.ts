import { loadModule } from 'libpg-query';
import { once } from './memo';

/**
 * Node (tests) loads libpg-query.wasm from node_modules by itself. In the browser Vite does
 * not bundle that file, so it is imported as a URL and handed to loadModule (verified by spike).
 * A failed download is not cached: the next call (next tab open) tries again.
 */
export const ensureParser = once(async (): Promise<void> => {
  // No @types/node in this project: read process through globalThis.
  const isNode = !!(globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node;
  if (isNode) return;
  const { default: url } = await import('libpg-query/wasm/libpg-query.wasm?url');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`libpg-query.wasm: HTTP ${res.status}`);
  await loadModule({ wasm: await res.arrayBuffer() });
});
