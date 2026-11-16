/** Bytes of PGlite's .wasm/.data received so far. `total` only when every response so far had an uncompressed Content-Length. */
export interface LoadProgress { loaded: number; total?: number }

const ASSET_RE = /\.(wasm|data)(\?|$)/;

/**
 * Wraps fetch so PGlite's asset downloads report progress. Counts decoded bytes; with gzip/brotli
 * Content-Length is the compressed size, so `total` becomes unknown rather than wrong.
 * Fails open: anything unexpected returns the original response.
 */
export function countingFetch(base: typeof fetch, report: (p: LoadProgress) => void): typeof fetch {
  let loaded = 0;
  let total: number | undefined = 0;
  return async (input, init) => {
    const res = await base(input, init);
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!ASSET_RE.test(url) || !res.ok || !res.body) return res;
      const length = Number(res.headers.get('content-length'));
      total = total !== undefined && length > 0 && !res.headers.get('content-encoding') ? total + length : undefined;
      const headers = new Headers(res.headers);
      headers.delete('content-length');
      headers.delete('content-encoding'); // the body below is already decoded
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          loaded += chunk.byteLength;
          report({ loaded, total });
          controller.enqueue(chunk);
        },
      });
      return new Response(res.body.pipeThrough(counter), { status: res.status, statusText: res.statusText, headers });
    } catch {
      return res;
    }
  };
}
