import type { EngineId, EngineLesson, Level } from './content';
import { DEEP } from './deepLinks';

/**
 * v47 S2 (L940–L949, ia-plan I4/I7/I8): pure track data and "next" rules for the lazy `engineTrack` chunk (src/ui/engineTrack.ts),
 * its only value importer. Who a track is for is text (`for.<e>`, src/i18n/engineTrack.ts); everything else is here.
 */

/** One prerequisite: SQL route Parts a..b (`#/learn/sql/<a>`), or another track up to a level. */
export type Prereq = { sql: [number, number] } | { engine: EngineId; to: Level };
/** I4: what to know before a track. A track missing here (a new one) shows no line until it gets a row. */
export const PREREQS: Partial<Record<EngineId, Prereq[]>> = {
  postgres: [{ sql: [1, 2] }],
  mongodb: [],
  dynamodb: [],
  design: [{ sql: [1, 3] }],
  stack: [{ sql: [1, 7] }, { engine: 'postgres', to: 'L1' }],
  olap: [{ sql: [1, 7] }, { engine: 'postgres', to: 'L1' }], // v47 (L991)
};

/** Total minutes of a list of lessons (track card: "≈ N h"). */
export const minutesOf = (ls: readonly EngineLesson[]): number => ls.reduce((a, x) => a + x.minutes, 0);

/**
 * I7, a lesson's end once it is done: the next unfinished lesson after it in its level, else the level's unfinished capstone,
 * else any unfinished lesson of the level, else the first unfinished lesson of a later level; undefined = back to the track page.
 * `all` is the track (or the Extensions shelf) in order.
 */
export function afterLesson(all: readonly EngineLesson[], l: EngineLesson, ok: ReadonlySet<string>): EngineLesson | undefined {
  const todo = (x: EngineLesson): boolean => x.id !== l.id && !ok.has(x.id);
  const later = all.slice(all.findIndex((x) => x.id === l.id) + 1);
  const level = all.filter((x) => x.level === l.level);
  return later.find((x) => x.level === l.level && todo(x)) ?? level.find((x) => x.kind === 'capstone' && todo(x)) ?? level.find(todo) ?? later.find(todo);
}

/** I7, a level page: its first unfinished lesson, else the first unfinished lesson of a later level (undefined = all done). */
export function levelNext(all: readonly EngineLesson[], lv: Level, ok: ReadonlySet<string>): EngineLesson | undefined {
  const from = all.findIndex((x) => x.level === lv);
  return from < 0 ? undefined : all.find((x) => x.level === lv && !ok.has(x.id)) ?? all.slice(from).find((x) => !ok.has(x.id));
}

/** I7, a Best Practice card: its first related lesson not done yet, else its first one. */
export const relatedLesson = (ids: readonly string[], ok: ReadonlySet<string>): string | undefined => ids.find((id) => !ok.has(id)) ?? ids[0];

/** I7, a glossary term: the first lesson of its engine and level whose title names it (whole word); undefined = the level page. */
export function termLesson(words: readonly string[], engines: readonly EngineId[], level: Level, lessons: readonly EngineLesson[]): EngineLesson | undefined {
  const res = words.filter((w) => w.length > 1).map((w) => new RegExp(`(^|[^\\w])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w])`, 'i'));
  for (const e of engines) {
    const hit = lessons.filter((x) => x.engine === e && x.level === level).sort((a, b) => a.order - b.order).find((x) => res.some((r) => r.test(x.title.en)));
    if (hit) return hit;
  }
  return undefined;
}

/** I8 extra Engine lesson → SQL route skills, where the topic matches (Design and Data stack included). */
const MORE: Record<string, string[]> = {
  'e-pg-l1-15': ['insert_select', 'update_join'], 'e-pg-l1-16': ['upsert'], 'e-pg-l1-17': ['cast', 'sargable'], 'e-pg-l2-03': ['index_design'],
  'e-pg-l2-15': ['explain_read'], 'e-pg-l4-02': ['explain_read'],
  'e-ds-l2-03': ['join'], 'e-ds-l3-02': ['group_by', 'having'], 'e-ds-l4-05': ['group_by'], 'e-ds-l5-01': ['where', 'join', 'union', 'except'], 'e-ds-l5-02': ['exists', 'anti_join'],
  'e-st-l1-02': ['cast', 'coalesce'], 'e-st-l1-03': ['window_rank', 'distinct_on'], 'e-st-l2-01': ['cte', 'multi_cte'], 'e-st-l2-03': ['upsert'],
  'e-st-l2-06': ['window_lag'], 'e-st-l2-08': ['group_by', 'multi_join'], 'e-st-l3-02': ['date_bucket', 'window_rank'],
};
/**
 * I8 "Luyện thêm": Engine lesson id → route skill ids, the one table: the inverse of the "Đào sâu" chips (DEEP, skill → lessons;
 * advanced nodes a7/a10/c2 dropped) plus MORE. Engine → General is allowed: L82 only keeps domains off General pages.
 */
export const PRACTICE: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [skill, ids] of Object.entries(DEEP)) if (!/^[a-d]\d+$/.test(skill)) for (const id of ids) (out[id] ??= []).push(skill);
  for (const [id, ss] of Object.entries(MORE)) out[id] = [...new Set([...(out[id] ?? []), ...ss])];
  return out;
})();

/** I8 "Đào sâu" from Design and Data stack lessons → the PostgreSQL lessons that show it inside the engine. */
export const DIVE: Record<string, string[]> = {
  'e-ds-l1-01': ['e-pg-l1-06'], 'e-ds-l1-02': ['e-pg-l1-04'], 'e-ds-l2-03': ['e-pg-l1-02', 'e-pg-l1-04'], 'e-ds-l2-06': ['e-pg-l1-19', 'e-pg-l2-26'],
  'e-ds-l2-07': ['e-pg-l1-04', 'e-pg-l2-26'], 'e-ds-l4-05': ['e-pg-l1-08'], 'e-ds-l4-07': ['e-pg-l3-03'], 'e-ds-l4-08': ['e-pg-l1-19', 'e-pg-l5-10'],
  'e-ds-l4-10': ['e-pg-l5-10', 'e-pg-l4-20'], 'e-ds-l5-04': ['e-pg-l4-12', 'e-pg-l4-13'], 'e-ds-l5-05': ['e-pg-l3-04', 'e-pg-l4-10'],
  'e-ds-l5-06': ['e-pg-l4-04', 'e-pg-l5-12'], 'e-ds-l5-07': ['e-pg-l3-12', 'e-pg-l5-09'], 'e-ds-l5-08': ['e-pg-l4-20'],
  'e-st-l1-02': ['e-pg-l1-01'], 'e-st-l1-03': ['e-pg-l1-16'], 'e-st-l1-05': ['e-pg-l2-11'], 'e-st-l2-03': ['e-pg-l1-08', 'e-pg-l1-16'],
  'e-st-l2-04': ['e-pg-l1-04'], 'e-st-l2-08': ['e-pg-l1-08'], 'e-st-l3-04': ['e-pg-l4-07'],
};
