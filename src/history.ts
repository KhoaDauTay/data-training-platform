import { readJson, writeJson, type KV } from './storage';

export interface HistoryEntry { sql: string; at: number; ok: boolean; rows?: number }
/** Key: ticket id (Sandbox keeps no history). Not part of Save: losing it costs nothing. */
export type History = Record<string, HistoryEntry[]>;

export const HISTORY_KEY = 'cargo-query/history';
export const HISTORY_MAX = 15;
export const HISTORY_SQL_MAX = 2000;

/** Newest first. Skips SQL longer than HISTORY_SQL_MAX and a repeat of the newest entry. */
export function pushHistory(h: History, key: string, e: HistoryEntry): History {
  const list = h[key] ?? [];
  if (e.sql.length > HISTORY_SQL_MAX || list[0]?.sql === e.sql) return h;
  return { ...h, [key]: [e, ...list].slice(0, HISTORY_MAX) };
}

const isEntry = (x: unknown): x is HistoryEntry => {
  const e = x as Partial<HistoryEntry> | null;
  return !!e && typeof e === 'object' && typeof e.sql === 'string' && typeof e.at === 'number' && typeof e.ok === 'boolean'
    && (e.rows === undefined || typeof e.rows === 'number');
};

/** Never throws: anything that is not an array of well-formed entries is dropped (storage is user-editable). */
export function loadHistory(storage: KV | undefined): History {
  const h = readJson<unknown>(HISTORY_KEY, storage);
  const out: History = {};
  if (!h || typeof h !== 'object' || Array.isArray(h)) return out;
  for (const [k, list] of Object.entries(h)) {
    if (Array.isArray(list)) out[k] = list.filter(isEntry).slice(0, HISTORY_MAX);
  }
  return out;
}

export function writeHistory(storage: KV | undefined, h: History): void {
  writeJson(HISTORY_KEY, h, storage);
}
