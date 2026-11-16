import type { KV } from './save';

/** window.localStorage, or undefined when blocked (private mode, sandboxed iframe) or outside a browser. */
export function localStore(): KV | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Device preferences (not progress): undefined when missing, unreadable or not JSON. */
export function readJson<T>(key: string, storage: KV | undefined = localStore()): T | undefined {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(key: string, value: unknown, storage: KV | undefined = localStore()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
