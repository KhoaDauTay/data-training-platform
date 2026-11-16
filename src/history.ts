import type { KV } from './save';
import { readJson, writeJson } from './storage';

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

export function loadHistory(storage: KV | undefined): History {
  const h = readJson<unknown>(HISTORY_KEY, storage);
  return h && typeof h === 'object' && !Array.isArray(h) ? (h as History) : {};
}

export function writeHistory(storage: KV | undefined, h: History): void {
  writeJson(HISTORY_KEY, h, storage);
}
