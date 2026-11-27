/**
 * v27 (L411, design-v27 §2.5): the Engine interview room's device pref `cargo-query/engine-interview`, pure. Results, the run
 * in progress, take-home drafts and the questions due for another look live here, never in the Save (0 XP, like the
 * General room's `cargo-query/interview`, L144); Export progress does not carry it. Bad data is dropped on read, never thrown.
 */
export const IV_KEY = 'cargo-query/engine-interview';
export const ANSWER_MAX = 4000;
export const DRAFT_MAX = 8000;

export interface IvResult { at: string; score: number; total: number; ms: number; skipped: number }
/** A run: question ids (a review run's are picked at start), answers, rubric ticks, skipped/revealed flags, time in the room. */
export interface IvLive { qs: string[]; i: number; answers: string[]; ticks: number[][]; skipped: boolean[]; shown: boolean[]; ms: number; timer: boolean }
export interface IvTakeHome { drafts: string[]; ticks?: number[]; at?: string }
export interface IvPrefs {
  results: Record<string, IvResult>;
  live: Record<string, IvLive>;
  th: Record<string, IvTakeHome>;
  /** question id → the local day (YYYY-MM-DD) it is due again. */
  again: Record<string, string>;
  /** run ids whose time-up note has shown (once per run). */
  noted: string[];
}

// v48 (L1144): + the seven tracks' codes; sets up to 9 (v36's mg-senior-4 / dy-senior-4 results were dropped by [1-3])
const SET_ID = /^((pg|mg|dy|rd|ts|ol|sr|tm|sm|gr)-(junior|mid|senior|staff)-[1-9]|again)$/;
const Q_ID = /^e-iv-(pg|mg|dy|rd|ts|ol|sr|tm|sm|gr)-(junior|mid|senior|staff)-\d\d$/;
const TH_ID = /^e-iv-(pg|mg|dy|rd|ts|ol|sr|tm|sm|gr)-th-[1-9]$/;
const DAY = /^\d{4}-\d\d-\d\d$/;
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
const text = (x: unknown, max: number): string => (typeof x === 'string' ? x.slice(0, max) : '');
const ints = (x: unknown): number[] => (Array.isArray(x) ? x.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 10).slice(0, 10) : []);
const pick = <T>(o: unknown, key: RegExp, f: (v: unknown) => T | undefined, max: number): Record<string, T> =>
  Object.fromEntries(Object.entries(obj(o)).filter(([k]) => key.test(k)).slice(0, max).flatMap(([k, v]) => { const y = f(v); return y === undefined ? [] : [[k, y]]; }));

export function parseIvPrefs(raw: unknown): IvPrefs {
  const o = obj(raw);
  return {
    results: pick(o.results, SET_ID, (v) => {
      const r = obj(v);
      return typeof r.at === 'string' ? { at: r.at.slice(0, 40), score: num(r.score), total: num(r.total), ms: num(r.ms), skipped: num(r.skipped) } : undefined;
    }, 40),
    live: pick(o.live, SET_ID, (v) => {
      const r = obj(v);
      const qs = Array.isArray(r.qs) ? r.qs.filter((q): q is string => typeof q === 'string' && Q_ID.test(q)).slice(0, 5) : [];
      if (!qs.length) return undefined;
      const arr = <T>(x: unknown, f: (y: unknown) => T): T[] => qs.map((_, i) => f(Array.isArray(x) ? x[i] : undefined));
      return {
        qs, i: Math.min(Math.floor(num(r.i)), qs.length), answers: arr(r.answers, (y) => text(y, ANSWER_MAX)), ticks: arr(r.ticks, ints),
        skipped: arr(r.skipped, (y) => y === true), shown: arr(r.shown, (y) => y === true), ms: num(r.ms), timer: r.timer === true,
      };
    }, 40),
    th: pick(o.th, TH_ID, (v) => {
      const r = obj(v);
      return {
        drafts: (Array.isArray(r.drafts) ? r.drafts : []).slice(0, 6).map((y) => text(y, DRAFT_MAX)),
        ...(Array.isArray(r.ticks) ? { ticks: ints(r.ticks) } : {}), ...(typeof r.at === 'string' ? { at: r.at.slice(0, 40) } : {}),
      };
    }, 12),
    again: pick(o.again, Q_ID, (v) => (typeof v === 'string' && DAY.test(v) ? v : undefined), 180),
    noted: Array.isArray(o.noted) ? o.noted.filter((x): x is string => typeof x === 'string' && x.length <= 80).slice(-50) : [],
  };
}

/** The local day `n` days after `day` (YYYY-MM-DD, the machine's calendar like the Leitner boxes, never the in-game date). */
export function dayPlus(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
/** Questions due on `today`, oldest first, at most `max` (a review run holds 5). */
export const dueAgain = (p: IvPrefs, today: string, max = 5): string[] =>
  Object.entries(p.again).filter(([, day]) => day <= today).sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).slice(0, max).map(([id]) => id);
/** A finished question's self-score (ticked / rubric size); a skipped one counts its ticks too (it was still self-checked). */
export const shareOf = (ticks: number[], total: number): number => (total ? new Set(ticks).size / total : 0);
