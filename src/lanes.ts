import { parse as parseYaml } from 'yaml';
import { bilingualOf, tablesUnlocked, type Bilingual } from './progress';
import { ROUTES } from './scene';
import type { Ticket } from './tickets';

/**
 * Lane briefs and side tasks (product-design-v3 Part B, L48 D-B1..D-B9, L49). Content lives in content/lanes/ and is a lazy
 * chunk (src/laneSources.ts, budget group `lanes`). Side tasks are ticket files with `lane:`; they are never in app.tickets,
 * so chapters, rank, the next ticket, the harbour, KPIs and the practice deck never see them (D-B1, D-B5).
 */

/** Flat XP for a side task, whatever hints were opened (D-B1). Never changes rank. */
export const LANE_XP = 50;

/** Tables a lane brings (D-B4): visible in the schema tabs, the Data page and autocomplete once the lane is open. Story tickets never use them. */
export const LANE_TABLES: Record<string, string[]> = {
  SGSIN: ['lane_profiles'],
  AUSYD: ['lane_profiles', 'bunker_prices'],
};
export const laneTables = (open: Iterable<string>): string[] => [...new Set([...open].flatMap((p) => LANE_TABLES[p] ?? []))];

/** `after`: shown only once that chapter's promotion review is passed (L49: Rotterdam's +40% waits for chapter 7). */
export interface LaneItem { text: Bilingual; label?: Bilingual; value?: string; after?: number }
export interface LaneBrief {
  port: string;
  country: Bilingual;
  intro: Bilingual;
  /** The "numbers to remember" (value + label). */
  numbers: LaneItem[];
  /** Detail rows (label + text). */
  facts: LaneItem[];
  /** "What a DA on this lane gets asked". */
  asked: Bilingual;
}

const item = (v: unknown, origin: string): LaneItem => {
  const o = (v ?? {}) as Record<string, unknown>;
  const text = bilingualOf(o.text);
  if (!text) throw new Error(`${origin}: mỗi mục cần text { vi, en }`);
  const label = o.label === undefined ? undefined : bilingualOf(o.label);
  if (o.label !== undefined && !label) throw new Error(`${origin}: label cần { vi, en }`);
  if (o.after !== undefined && typeof o.after !== 'number') throw new Error(`${origin}: after là số chương`);
  return {
    text,
    ...(label ? { label } : {}),
    ...(typeof o.value === 'string' ? { value: o.value } : {}),
    ...(typeof o.after === 'number' ? { after: o.after } : {}),
  };
};

export function parseLaneBriefs(src: string, origin = 'content/lanes/lanes.yml'): LaneBrief[] {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  return data.map((raw: unknown, i) => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const at = `${origin}: mục ${i}`;
    const country = bilingualOf(b.country);
    const intro = bilingualOf(b.intro);
    const asked = bilingualOf(b.asked);
    if (!ROUTES.some((r) => r.port === b.port) || !country || !intro || !asked || !Array.isArray(b.numbers) || !Array.isArray(b.facts)) {
      throw new Error(`${at} cần port (một cảng của bản đồ), country, intro, numbers, facts, asked`);
    }
    return {
      port: b.port as string, country, intro, asked,
      numbers: b.numbers.map((x) => item(x, at)), facts: b.facts.map((x) => item(x, at)),
    };
  });
}

/** An item is visible once its chapter's promotion review is passed. */
export const shown = (x: LaneItem, passed: ReadonlySet<number>): boolean => x.after === undefined || passed.has(x.after);

export type LaneTaskState = 'done' | 'open' | 'locked';
/**
 * A side task's `chapter` is the chapter whose promotion review opens it (product-design-v3 §13: gated by skills, not only by
 * the lane, since a ship may open a lane early, L32). It also needs its lane open.
 */
export function laneTaskState(task: Ticket, open: ReadonlySet<string>, passed: ReadonlySet<number>, solved: readonly string[]): LaneTaskState {
  if (solved.includes(task.id)) return 'done';
  return task.lane && open.has(task.lane) && passed.has(task.chapter) ? 'open' : 'locked';
}

/** "R-1": the label of a side task on buttons and cards. */
export const laneLabel = (task: Ticket): string => task.id.toUpperCase();

/**
 * Content checks for side tasks (like contentProblems for the story). `story` = the story tickets, sorted by byOrder.
 * A task may only use skills taught up to its chapter and tables open at its chapter or brought by its own lane.
 */
export function laneProblems(tasks: Ticket[], briefs: LaneBrief[], story: Ticket[]): string[] {
  const problems: string[] = [];
  const ids = new Set(story.map((x) => x.id));
  for (const b of briefs) if (briefs.filter((x) => x.port === b.port).length > 1) problems.push(`${b.port}: trùng hồ sơ tuyến`);
  for (const task of tasks) {
    const route = ROUTES.find((r) => r.port === task.lane);
    if (!route) {
      problems.push(`${task.id}: lane phải là một cảng của bản đồ`);
      continue;
    }
    if (ids.has(task.id)) problems.push(`${task.id}: trùng id`);
    ids.add(task.id);
    if (!briefs.some((b) => b.port === task.lane)) problems.push(`${task.id}: tuyến ${task.lane} chưa có hồ sơ`);
    if (task.beat === 'boss' || task.grants.length) problems.push(`${task.id}: bài tuyến không dạy kỹ năng và không phải cột mốc`);
    if (task.chapter < Math.max(1, route.opens)) problems.push(`${task.id}: mở trước khi tuyến ${route.name} mở (chương ${route.opens})`);
    const taught = new Set(story.filter((x) => x.chapter <= task.chapter).flatMap((x) => x.grants));
    for (const s of task.requires) if (!taught.has(s)) problems.push(`${task.id}: cần kỹ năng "${s}" chưa dạy tới chương ${task.chapter}`);
    const tables = [...tablesUnlocked(task.chapter), ...(LANE_TABLES[route.port] ?? [])];
    for (const x of task.tables) if (!tables.includes(x)) problems.push(`${task.id}: dùng bảng "${x}" chưa mở ở chương ${task.chapter} hay ở tuyến ${route.name}`);
  }
  return problems;
}
