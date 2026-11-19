import { bilingualOf, DRILL_ID, drillTicket, parseDrill, type Drill } from './general';
import type { Bilingual } from './progress';
import type { Ticket } from './tickets';

/**
 * v17 I5 interview room (docs/team/interview-room.md, L138): timed question sets and take-home assignments on `lab`.
 * Pure parser over already-parsed YAML (content/general/interview.yml), in the lazy chunk src/interviewSources.ts (L144): it
 * imports values only from src/general.ts (lazy), never from a main-bundle module (Plan 6 U3).
 * Ids match DRILL_ID (`g-iv-…`), so the drill engine runs them on `lab` (schemaOf) unchanged; skillOfDrill never reads a
 * skill out of them, and the room never calls complete(): nothing reaches save.completed.
 */

export const LEVELS = ['junior', 'mid'] as const;
export type Level = (typeof LEVELS)[number];
/** A question = a drill without a frame (no starter), tagged with the skills its Solution uses. */
export interface Question extends Drill { skills: string[] }
export interface InterviewSet {
  id: string;
  level: Level;
  /** General modules (= skill chapters) a learner must have finished; every question uses only their skills. */
  modules: number[];
  /** Suggested time for the optional timer. */
  minutes: number;
  title: Bilingual;
  questions: Question[];
}
/** A take-home step = a promotion-review step: graded like a drill, always ordered. */
export interface TakeHomeStep extends Drill { title: Bilingual }
export interface TakeHome {
  id: string;
  modules: number[];
  title: Bilingual;
  /** The request, as a manager would send it. */
  brief: Bilingual;
  steps: TakeHomeStep[];
  /** What the learner writes at the end (self-graded, never machine-graded). */
  conclusion: Bilingual;
  rubric: Bilingual[];
}
export interface Interview { sets: InterviewSet[]; takeHomes: TakeHome[] }

export const SET_SIZE = 5;
type Raw = Record<string, unknown>;
const SET_ID = /^[a-z][a-z0-9-]*$/;

export function parseInterview(data: unknown, origin = 'general/interview.yml'): Interview {
  const root = (data ?? {}) as Raw;
  const fail = (what: string): never => {
    throw new Error(`${origin}: ${what}`);
  };
  const seen = new Set<string>();
  const once = (id: string): string => (seen.has(id) ? fail(`trùng id ${id}`) : (seen.add(id), id));
  const listOf = (v: unknown, what: string): Raw[] => (Array.isArray(v) ? v.map((x) => (x ?? {}) as Raw) : fail(`${what} cần một danh sách`));
  const both = (v: unknown, what: string): Bilingual => bilingualOf(v) ?? fail(`${what} cần { vi, en }`);
  const modulesOf = (v: unknown, what: string): number[] =>
    Array.isArray(v) && v.length > 0 && v.every((n) => Number.isInteger(n) && n > 0) ? (v as number[]) : fail(`${what}: modules cần danh sách số chương`);

  const sets = listOf(root.sets, 'sets').map((o): InterviewSet => {
    const id = typeof o.id === 'string' && SET_ID.test(o.id) ? once(o.id) : fail(`bộ đề id lạ: ${String(o.id)}`);
    const level = LEVELS.includes(o.level as Level) ? (o.level as Level) : fail(`${id}: level lạ: ${String(o.level)}`);
    const minutes = Number.isInteger(o.minutes) && (o.minutes as number) > 0 ? (o.minutes as number) : fail(`${id}: minutes cần số phút`);
    const questions = listOf(o.questions, `${id}.questions`).map((q, i): Question => {
      const qid = `g-iv-${id}-${i + 1}`;
      if (q.id !== qid) fail(`${id}: câu ${i + 1} cần id ${qid}`);
      // no frame in an interview: a starter would be one
      if (q.starter !== undefined) fail(`${qid}: câu phỏng vấn không có starter`);
      const skills = Array.isArray(q.skills) && q.skills.length > 0 && q.skills.every((s) => typeof s === 'string') ? (q.skills as string[]) : fail(`${qid}: skills cần danh sách id`);
      return { ...parseDrill({ ...q, id: once(qid), kind: Array.isArray(q.wrong) ? 'trap' : 'open' }, origin, {}), skills };
    });
    if (questions.length !== SET_SIZE) fail(`${id}: cần đúng ${SET_SIZE} câu`);
    return { id, level, modules: modulesOf(o.modules, id), minutes, title: both(o.title, `${id}.title`), questions };
  });

  const takeHomes = listOf(root.takeHomes, 'takeHomes').map((o): TakeHome => {
    const id = typeof o.id === 'string' && DRILL_ID.test(o.id) && o.id.startsWith('g-iv-th-') ? once(o.id) : fail(`take-home id lạ: ${String(o.id)}`);
    const steps = listOf(o.steps, `${id}.steps`).map((s, i): TakeHomeStep => {
      const step = parseDrill({ ...s, id: once(`${id}-${i + 1}`), kind: 'open' }, origin, {});
      if (!step.ordered) fail(`${step.id}: bước take-home phải ordered (như đánh giá thăng tiến)`);
      return { ...step, title: both(s.title, `${step.id}.title`) };
    });
    if (steps.length < 3 || steps.length > 4) fail(`${id}: cần 3–4 bước`);
    const rubric = listOf(o.rubric, `${id}.rubric`).map((r, i) => both(r, `${id}.rubric[${i}]`));
    if (rubric.length < 3) fail(`${id}: rubric cần ít nhất 3 tiêu chí`);
    return {
      id, modules: modulesOf(o.modules, id), title: both(o.title, `${id}.title`), brief: both(o.brief, `${id}.brief`),
      steps, conclusion: both(o.conclusion, `${id}.conclusion`), rubric,
    };
  });
  return { sets, takeHomes };
}

/**
 * A take-home as a promotion-review Ticket (beat boss, one step per SQL step, no multiple-choice conclusion: the learner
 * writes it and checks it against `rubric`), so work.ts walks its steps like a review. Steps' hints become the hint list.
 */
export function takeHomeTicket(th: TakeHome): Ticket {
  const steps = (lang: 'vi' | 'en') => th.steps.map((s) => ({ title: s.title[lang], prompt: s.task[lang] }));
  return {
    id: th.id,
    chapter: 0,
    title: th.title.vi,
    from: { name: '', dept: '' },
    difficulty: 3,
    beat: 'boss',
    requires: [],
    grants: [],
    tables: [],
    ordered: true,
    body: th.brief.vi,
    task: '',
    hints: th.steps.map((s) => s.hint.vi),
    steps: th.steps.map((s, i) => ({ ...steps('vi')[i], solution: s.solution })),
    en: { title: th.title.en, body: th.brief.en, task: '', hints: th.steps.map((s) => s.hint.en), steps: steps('en') },
  };
}

/** Where an item id (a question `g-iv-<set>-<n>` or a take-home step `g-iv-th-<n>-<k>`) sits: its run, question index, step. */
export interface ItemPlace { run: string; kind: 'set' | 'th'; index: number; step: number }
/** v17 UI (L144): the parsed content plus the lookups the interview room needs. Built in the lazy interview chunk. */
export interface InterviewContent extends Interview {
  /** A set's questions as drill tickets, or a take-home as one stepped ticket; undefined for an unknown id. */
  ticketsOf(run: string): Ticket[] | undefined;
  /** The place of a question or step id from a hash (looked up, never trusted as a pattern). */
  placeOf(item: string): ItemPlace | undefined;
}

export function buildInterview(data: unknown): InterviewContent {
  const iv = parseInterview(data);
  const places = new Map<string, ItemPlace>();
  for (const s of iv.sets) s.questions.forEach((q, index) => places.set(q.id, { run: s.id, kind: 'set', index, step: 0 }));
  for (const th of iv.takeHomes) th.steps.forEach((x, step) => places.set(x.id, { run: th.id, kind: 'th', index: 0, step }));
  return {
    ...iv,
    ticketsOf(run) {
      const set = iv.sets.find((s) => s.id === run);
      if (set) return set.questions.map(drillTicket);
      const th = iv.takeHomes.find((x) => x.id === run);
      return th && [takeHomeTicket(th)];
    },
    placeOf: (item) => places.get(item),
  };
}
