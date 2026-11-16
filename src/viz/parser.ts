import { loadModule } from 'libpg-query';

let ready: Promise<void> | undefined;

/**
 * Node (tests) loads libpg-query.wasm from node_modules by itself. In the browser Vite does
 * not bundle that file, so it is imported as a URL and handed to loadModule (verified by spike).
 */
export function ensureParser(): Promise<void> {
  ready ??= (async () => {
    // No @types/node in this project: read process through globalThis.
    const isNode = !!(globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node;
    if (isNode) return;
    const { default: url } = await import('libpg-query/wasm/libpg-query.wasm?url');
    await loadModule({ wasm: await (await fetch(url)).arrayBuffer() });
  })();
  return ready;
}
