import { readJson, writeJson, type KV } from './storage';

/**
 * v16 I2 (product-design-v7 §7, D-I1/D-N7, L142): learner statistics kept on this device only, never in the Save (no version
 * bump; losing them loses only statistics) and never sent anywhere. Codes and counts only: no SQL, no data. Study days are
 * the existing `cargo-query/days` (src/lily.ts). The #/me page (lazy chunk) reads them through these parsers.
 */
export const ERRORS_KEY = 'cargo-query/errors';
export const ATTEMPTS_KEY = 'cargo-query/attempts';
const MAX_CODES = 50;
const MAX_TASKS = 600;
/** `passedOn` = the Submit count when the task first passed (1 = right on the first Submit). */
export interface Attempt { runs: number; submits: number; passedOn?: number }

const count = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 1e7;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** SQLSTATE → times seen; anything else (bad codes, counts, more than 50 codes) is dropped. */
export function readErrors(storage?: KV): Record<string, number> {
  const v = readJson<unknown>(ERRORS_KEY, storage);
  return obj(v) ? Object.fromEntries(Object.entries(v).filter(([k, n]) => /^[0-9A-Z]{5}$/.test(k) && count(n)).slice(0, MAX_CODES)) as Record<string, number> : {};
}

/** Task id → runs, submits and when it passed; bad entries are dropped. */
export function readAttempts(storage?: KV): Record<string, Attempt> {
  const v = readJson<unknown>(ATTEMPTS_KEY, storage);
  const out: Record<string, Attempt> = {};
  if (!obj(v)) return out;
  for (const [k, a] of Object.entries(v).slice(0, MAX_TASKS)) {
    if (!/^[a-z0-9#-]{1,60}$/.test(k) || !obj(a) || !count(a.runs) || !count(a.submits)) continue;
    out[k] = { runs: a.runs, submits: a.submits, ...(count(a.passedOn) ? { passedOn: a.passedOn } : {}) };
  }
  return out;
}

/** One Run or Submit of a task (`id`, undefined in the Sandbox/Practice) that failed with `code` (a Postgres error) or not. */
export function noteTry(id: string | undefined, kind: 'runs' | 'submits', code?: string, storage?: KV): void {
  if (code && /^[0-9A-Z]{5}$/.test(code)) {
    const e = readErrors(storage);
    if (code in e || Object.keys(e).length < MAX_CODES) writeJson(ERRORS_KEY, { ...e, [code]: (e[code] ?? 0) + 1 }, storage);
  }
  if (!id) return;
  const all = readAttempts(storage);
  if (!all[id] && Object.keys(all).length >= MAX_TASKS) return;
  const a = all[id] ?? { runs: 0, submits: 0 };
  a[kind]++;
  writeJson(ATTEMPTS_KEY, { ...all, [id]: a }, storage);
}

/** The task passed the grader: the first pass keeps its Submit count. */
export function notePass(id: string, storage?: KV): void {
  const all = readAttempts(storage);
  const a = all[id];
  if (a && a.passedOn === undefined) writeJson(ATTEMPTS_KEY, { ...all, [id]: { ...a, passedOn: Math.max(1, a.submits) } }, storage);
}
