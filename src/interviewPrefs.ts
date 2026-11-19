/**
 * v17 I5 interview room (L144): the device pref `cargo-query/interview`. Pure (no DOM, no storage, no value import from the
 * interview content or the General chunk), so main, the lazy interview UI and the v16 portfolio can all read it.
 * The interview room writes nothing to the Save: no completed, drafts, graded, history, hints, Leitner card or XP.
 * Every value is validated on read: bad data is dropped, never thrown.
 */

export const INTERVIEW_KEY = 'cargo-query/interview';

/** Best result of a timed set (the last finished run replaces it). `ms` = time taken; `timer` = the clock was on. */
export interface SetResult { at: string; solved: number; total: number; ms: number; timer: boolean }
/**
 * A finished take-home: SQL steps solved, the learner's own conclusion and the rubric lines they ticked (indexes).
 * Stays on this device; the v16 portfolio may offer it (passedTakeHomes) only if the learner chooses to.
 */
export interface TakeHomeResult { at: string; steps: number; total: number; text: string; checks: number[]; rubric: number }
/**
 * The run in progress, so a reload keeps the place (the hash names the question or step, this holds the rest).
 * `start` = Date.now() when it began; `solved` holds question or step ids; `drafts`/`passed` are keyed by those ids.
 */
export interface LiveRun {
  id: string;
  timer: boolean;
  start: number;
  index: number;
  step: number;
  solved: string[];
  drafts: Record<string, string>;
  passed: Record<string, string>;
  hints: string[];
  phase: 'work' | 'write' | 'done';
  text: string;
  checks: number[];
  /** Time taken, set when the run ends. */
  ms?: number;
}
/** `live`: the run in progress per set or take-home, so leaving one never drops another. */
export interface InterviewPrefs { sets: Record<string, SetResult>; takeHomes: Record<string, TakeHomeResult>; live: Record<string, LiveRun> }

export const SQL_MAX = 20_000;
export const TEXT_MAX = 4_000;
const RUN_ID = /^(g-iv-th-\d+|[a-z][a-z0-9-]*)$/;
const ITEM_ID = /^g-iv-[a-z0-9-]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const PHASES = ['work', 'write', 'done'] as const;

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : undefined);
const count = (v: unknown, max = 1000): number | undefined => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : undefined);
const ids = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ITEM_ID.test(x)))] : []);
const indexes = (v: unknown): number[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is number => count(x, 20) !== undefined))].sort((a, b) => a - b) : []);
function texts(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(obj(v) ?? {})) if (ITEM_ID.test(k) && typeof x === 'string') out[k] = x.slice(0, SQL_MAX);
  return out;
}
function records<T>(v: unknown, one: (o: Raw) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, x] of Object.entries(obj(v) ?? {})) {
    const o = obj(x);
    const r = o && RUN_ID.test(k) ? one(o) : undefined;
    if (r) out[k] = r;
  }
  return out;
}

export function parseInterviewPrefs(v: unknown): InterviewPrefs {
  const root = obj(v) ?? {};
  const sets = records<SetResult>(root.sets, (o) => {
    const solved = count(o.solved), total = count(o.total), ms = count(o.ms, 864e5);
    return typeof o.at === 'string' && DAY.test(o.at) && solved !== undefined && total && solved <= total && ms !== undefined && typeof o.timer === 'boolean'
      ? { at: o.at, solved, total, ms, timer: o.timer } : undefined;
  });
  const takeHomes = records<TakeHomeResult>(root.takeHomes, (o) => {
    const steps = count(o.steps), total = count(o.total), rubric = count(o.rubric, 20);
    return typeof o.at === 'string' && DAY.test(o.at) && steps !== undefined && total && steps <= total && rubric && typeof o.text === 'string'
      ? { at: o.at, steps, total, text: o.text.slice(0, TEXT_MAX), checks: indexes(o.checks).filter((i) => i < rubric), rubric } : undefined;
  });
  const live = records<LiveRun>(root.live, (l) => (typeof l.id === 'string' && RUN_ID.test(l.id) && typeof l.timer === 'boolean' && count(l.start, 1e13) !== undefined
    && count(l.index, 20) !== undefined && count(l.step, 20) !== undefined && PHASES.includes(l.phase as LiveRun['phase'])
    ? {
      id: l.id, timer: l.timer, start: l.start as number, index: l.index as number, step: l.step as number, solved: ids(l.solved),
      drafts: texts(l.drafts), passed: texts(l.passed), hints: ids(l.hints), phase: l.phase as LiveRun['phase'],
      text: typeof l.text === 'string' ? l.text.slice(0, TEXT_MAX) : '', checks: indexes(l.checks),
      ...(count(l.ms, 864e5) !== undefined ? { ms: l.ms as number } : {}),
    }
    : undefined));
  for (const [k, l] of Object.entries(live)) if (l.id !== k) delete live[k];
  return { sets, takeHomes, live };
}

/**
 * v16 portfolio hook (L144): take-homes whose SQL steps all passed and whose conclusion was written, newest first. The
 * portfolio may list them (title from content/general/interview.yml by id, the learner's text, the rubric lines ticked);
 * nothing here leaves the device unless the learner exports it.
 */
export const passedTakeHomes = (p: InterviewPrefs): (TakeHomeResult & { id: string })[] =>
  Object.entries(p.takeHomes)
    .filter(([, r]) => r.steps === r.total && r.text.trim() !== '')
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
