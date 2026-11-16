export const MEMO_MAX = 20;

/**
 * Caches one promise per key (SQL text or schema name). A rejected promise is dropped so the
 * next call retries (timeouts, DB restarts). Oldest key is evicted past `max`.
 */
export function memoByKey<T>(load: (key: string) => Promise<T>, max = MEMO_MAX): (key: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
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
