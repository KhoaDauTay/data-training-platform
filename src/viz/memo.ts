export const MEMO_MAX = 20;

/** Every cache made by memoByKey (plans, steps, ER metadata), so imported data changes can drop them at once. */
const dataCaches = new Set<Map<string, unknown>>();

/** Drops every memoByKey cache: plans, steps and ER metadata are stale once imported tables change. once() is kept. */
export function clearMemos(): void {
  for (const c of dataCaches) c.clear();
}

/**
 * Caches one promise per key (SQL text or schema name). A rejected promise is dropped so the
 * next call retries (timeouts, DB restarts). Oldest key is evicted past `max`.
 */
export function memoByKey<T>(load: (key: string) => Promise<T>, max = MEMO_MAX): (key: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  dataCaches.add(cache);
  return (key) => {
    const hit = cache.get(key);
    if (hit) return hit;
    const p = load(key);
    cache.set(key, p);
    p.catch(() => {
      if (cache.get(key) === p) cache.delete(key);
    });
    if (cache.size > max) cache.delete(cache.keys().next().value as string);
    return p;
  };
}

/** One shared promise for a key-less load (a wasm module, a lazy chunk); a failure is dropped so the next call retries. */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  // Its own slot, not memoByKey: clearMemos() must not reload Mermaid or the parser.
  let p: Promise<T> | undefined;
  return () => {
    if (p) return p;
    const q = load();
    p = q;
    q.catch(() => {
      if (p === q) p = undefined;
    });
    return q;
  };
}
