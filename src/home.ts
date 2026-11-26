import kpiSource from '../content/kpis.yml';
import type { QueryResult } from './db/run';
import { currentChapter, nextTicket, passedChapters, passedSkills, type Bilingual, type Chapter, type Skill } from './progress';
import { activeDomain, type DomainId } from './domains';
import type { Save } from './save';
import type { Lang, Ticket } from './tickets';

/** soon = the chapter has no tickets yet ("Sắp có"); locked = it has tickets the player has not reached (🔒). */
export type ChapterStatus = 'done' | 'current' | 'locked' | 'soon';
export interface ChapterCard { chapter: number; status: ChapterStatus; done: number; total: number; skills: Skill[]; boss?: Ticket }
export type SkillState = 'locked' | 'open' | 'learned';
/** level: 0 = not learned, 1..LEVELS = memory level (Leitner box from Plan 1c; 1 until then). */
export interface SkillCard { skill: Skill; state: SkillState; level: number }
export interface HomeModel {
  /** Next unsolved ticket in story order; undefined when everything is done. */
  next?: Ticket;
  chapter: number;
  done: number;
  total: number;
  learned: number;
  chapters: ChapterCard[];
  skills: SkillCard[];
}

export const LEVELS = 5;

/**
 * v15 Q2: what Home's "Continue" line opens. The last thing passed (Save keeps `completed` in order, no timestamps) was a
 * drill → that skill's page (`learn` for a node drill); a "SQL only" player who has opened no domain → the learning path;
 * else the open domain's next task (none once all are done). It never names a domain the player has not opened (v15 §5).
 */
export type Resume = { kind: 'skill'; skill: string } | { kind: 'learn' } | { kind: 'ticket'; ticket: Ticket } | { kind: 'engine'; engine: string; level?: number };
/**
 * v47 S3 (L912): `intent` = the welcome's goal (onboarding.ts). An Engine goal (internals, engineer) resumes at the level of
 * the last Engine lesson passed when that was the last thing passed, or when nothing else is in progress (SQL only, or no
 * task left); with none passed yet, at the goal's track (PostgreSQL, Data stack). Other goals: unchanged.
 */
export function resumeTarget(completed: readonly string[], next: Ticket | undefined, sqlOnly: boolean, skillIds: readonly string[], intent?: string): Resume | undefined {
  const last = completed.at(-1);
  if (last?.startsWith('g-')) {
    const skill = skillOfDrill(last, skillIds);
    return skill ? { kind: 'skill', skill } : { kind: 'learn' };
  }
  if ((intent === 'internals' || intent === 'engineer') && (engineLevelOf(last ?? '') || sqlOnly || !next)) {
    const lesson = [...completed].reverse().find((id) => engineLevelOf(id));
    return lesson ? { kind: 'engine', ...engineLevelOf(lesson)! } : { kind: 'engine', engine: intent === 'engineer' ? 'stack' : 'postgres' };
  }
  if (sqlOnly) return { kind: 'learn' };
  return next && { kind: 'ticket', ticket: next };
}

const ENGINE_OF: Record<string, string> = { pg: 'postgres', mg: 'mongodb', dy: 'dynamodb', rd: 'redis', ds: 'design', st: 'stack', ol: 'olap', sr: 'search', sm: 'stream' };
/** An Engine lesson id (`e-pg-l3-04`) → its engine and level; undefined for anything else (Best Practice cards, path drills). */
export function engineLevelOf(id: string): { engine: string; level: number } | undefined {
  const m = /^e-(pg|mg|dy|rd|ds|st|ol|sm)-l([1-5])-/.exec(id);
  return m ? { engine: ENGINE_OF[m[1]], level: Number(m[2]) } : undefined;
}

/**
 * Skills taught by the completed tickets, plus every skill of a chapter whose promotion review is passed, also when it
 * was taken early (L145: the review stands for the chapter). Shared by Home, Practice and the chapter goals (Plan 1c).
 */
export const learnedSkills = (tickets: Ticket[], completed: ReadonlySet<string>): Set<string> =>
  new Set([...tickets.filter((t) => completed.has(t.id)).flatMap((t) => t.grants), ...passedSkills(tickets, completed)]);

// Plan 8a (moved from src/learn.ts in Task 11 so the Logistics chapter rows can tick learned skills without the General chunk).
/**
 * The skill of a skill drill, read from its id alone (no General chunk needed): `g-conditional-agg-3` → `conditional_agg`.
 * Undefined for a node drill (`g-a1-2`) or anything that is not a known skill.
 */
export function skillOfDrill(id: string, skillIds: readonly string[]): string | undefined {
  const m = /^g-([a-z0-9-]+)-\d+$/.exec(id);
  const skill = m?.[1].replace(/-/g, '_');
  return skill && skillIds.includes(skill) ? skill : undefined;
}

/**
 * "Learned" (D8a-11): a completed ticket grants it, or ≥ 2 of its drills passed, or it has a review card.
 * One definition for the learning path, the "Relies on" line and Home.
 */
export function knownSkills(save: Save, tickets: Ticket[], skillIds: readonly string[]): Set<string> {
  const done = new Set(save.completed);
  const out = learnedSkills(tickets, done);
  const drills = new Map<string, number>();
  for (const id of save.completed) {
    const s = skillOfDrill(id, skillIds);
    if (s) drills.set(s, (drills.get(s) ?? 0) + 1);
  }
  for (const [s, n] of drills) if (n >= 2) out.add(s);
  for (const s of Object.keys(save.review)) if (skillIds.includes(s)) out.add(s);
  return out;
}

/** v5 §B.9: a chapter relies on what its tickets require or teach (requires ∪ grants), in first-seen order. */
export const reliesOn = (tickets: Ticket[], chapter: number): string[] =>
  [...new Set(tickets.filter((t) => t.chapter === chapter).flatMap((t) => [...t.requires, ...t.grants]))];

/** Everything on Home, recomputed from the save and the content (nothing extra is stored). */
export function homeModel(
  tickets: Ticket[],
  completed: Set<string>,
  chapters: Chapter[],
  skills: Skill[],
  levelOf: (skill: string) => number = () => 1,
): HomeModel {
  const chapter = currentChapter(tickets, completed);
  const solved = tickets.filter((t) => completed.has(t.id));
  const learned = learnedSkills(tickets, completed);
  const passed = passedChapters(tickets, completed);
  return {
    next: nextTicket(tickets, completed),
    chapter,
    done: solved.length,
    total: tickets.length,
    learned: learned.size,
    chapters: chapters.map((c) => {
      const own = tickets.filter((t) => t.chapter === c.chapter);
      const done = own.filter((t) => completed.has(t.id)).length;
      const status: ChapterStatus =
        own.length === 0 ? 'soon' : done === own.length || passed.has(c.chapter) ? 'done' : c.chapter === chapter ? 'current' : 'locked';
      return {
        chapter: c.chapter, status, done, total: own.length,
        skills: skills.filter((s) => s.chapter === c.chapter),
        boss: own.find((t) => t.beat === 'boss'),
      };
    }),
    skills: skills.map((s) => {
      const state: SkillState = learned.has(s.id) ? 'learned' : s.chapter > chapter ? 'locked' : 'open';
      return { skill: s, state, level: state === 'learned' ? Math.min(LEVELS, Math.max(1, levelOf(s.id))) : 0 };
    }),
  };
}

export type KpiKind = 'number' | 'rowcount' | 'bar';
/**
 * A company dashboard tile (L18 ★5): opens when `ticket` is completed; its value comes from that ticket's Solution (step `step`).
 * unit: shown small after the value (L42: "kg" left the label). icon: an icon name (src/ui/icons.ts); missing → by kind.
 */
export interface Kpi { id: string; ticket: string; step: number; col: number; kind: KpiKind; label: Bilingual; unit?: Bilingual; icon?: string }
const KPI_KINDS: KpiKind[] = ['number', 'rowcount', 'bar'];

export function parseKpis(data: unknown, origin = 'kpis.yml'): Kpi[] {
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  return data.map((raw: unknown, i) => {
    const k = (raw ?? {}) as Record<string, unknown>;
    const label = (k.label ?? {}) as Record<string, unknown>;
    if (typeof k.id !== 'string' || typeof k.ticket !== 'string' || !KPI_KINDS.includes(k.kind as KpiKind)
      || typeof label.vi !== 'string' || typeof label.en !== 'string') {
      throw new Error(`${origin}: mục ${i} cần id, ticket, kind (${KPI_KINDS.join(' | ')}) và label { vi, en }`);
    }
    const unit = k.unit as Record<string, unknown> | undefined;
    if (unit !== undefined && (typeof unit?.vi !== 'string' || typeof unit.en !== 'string')) throw new Error(`${origin}: mục ${i}: unit cần { vi, en }`);
    if (k.icon !== undefined && typeof k.icon !== 'string') throw new Error(`${origin}: mục ${i}: icon phải là tên icon`);
    return {
      id: k.id, ticket: k.ticket, kind: k.kind as KpiKind, label: { vi: label.vi, en: label.en },
      step: typeof k.step === 'number' ? k.step : 0, col: typeof k.col === 'number' ? k.col : 0,
      ...(unit ? { unit: { vi: unit.vi as string, en: unit.en as string } } : {}),
      ...(typeof k.icon === 'string' ? { icon: k.icon } : {}),
    };
  });
}
export const KPIS: Kpi[] = parseKpis(kpiSource);
const domainKpis = new Map<DomainId, Kpi[]>();
export const setDomainKpis = (d: DomainId, kpis: Kpi[]): void => void domainKpis.set(d, kpis);
/** The open domain's company tiles (Logistics: content/kpis.yml; E-com: content/domains/ecom/kpis.yml). */
export const kpisOf = (d: DomainId = activeDomain()): Kpi[] => (d === 'logistics' ? KPIS : domainKpis.get(d) ?? []);

/**
 * `ticket` undefined: its chapter has no content yet (the Q3 margin waits for chapter 12). Never opens before completion.
 * A tile whose ticket has no step `kpi.step` is dropped (the content test reports it), so Home never throws.
 */
export interface KpiTile { kpi: Kpi; ticket?: Ticket; open: boolean }
export const kpiTiles = (kpis: Kpi[], tickets: Ticket[], completed: Set<string>): KpiTile[] =>
  kpis.flatMap((kpi) => {
    const ticket = tickets.find((x) => x.id === kpi.ticket);
    if (ticket && !ticket.steps[kpi.step]) return [];
    return [{ kpi, ticket, open: !!ticket && completed.has(ticket.id) }];
  });

/** "ch12-06" → 12: chapter of a tile whose ticket is not written yet. */
export const chapterOfId = (id: string): number => Number(/^(?:ecom-)?ch(\d+)-/.exec(id)?.[1] ?? 0);

/** text: rounded for the tile; full: the exact value (2 decimals) for `title` and screen readers. */
export interface KpiNumber { text: string; full: string }
const COMPACT_FROM = 1_000_000;

/**
 * L42: clean dashboard numbers. >= 1,000,000 → compact with one decimal ("156,5 triệu" / "156.5M"; VI uses the long
 * form because the short "Tr" is unclear); below that, whole numbers stay exact ("9.694") and fractions keep one decimal.
 */
export function kpiNumber(x: number, lang: Lang): KpiNumber {
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
  if (!Number.isFinite(x)) return { text: '—', full: '—' };
  const full = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(x);
  // Decide on the value as it will be shown: 999,999.95 rounds to 1,000,000 and must read "1M"; -0.04 must not read "-0".
  const shown = Math.round(x * 10) / 10 || 0;
  const opts: Intl.NumberFormatOptions = Math.abs(shown) >= COMPACT_FROM
    ? { notation: 'compact', compactDisplay: lang === 'vi' ? 'long' : 'short', maximumFractionDigits: 1 }
    : { maximumFractionDigits: Number.isInteger(x) ? 0 : 1 };
  return { text: new Intl.NumberFormat(locale, opts).format(Math.abs(shown) >= COMPACT_FROM ? x : shown), full };
}

export type KpiValue = KpiNumber | { bars: ({ label: string; value: number } & KpiNumber)[] };
const BARS = 5;
/** PGlite returns numeric as strings and bigint counts as bigint: Number() covers both. */
export function kpiValue(k: Kpi, r: QueryResult, lang: Lang): KpiValue {
  if (k.kind === 'rowcount') return kpiNumber(r.rows.length, lang);
  if (k.kind === 'number') return kpiNumber(Number(r.rows[0]?.[k.col] ?? 0), lang);
  const bars = r.rows
    .map((row) => ({ label: row.slice(0, -1).map(String).join(' · '), value: Number(row[row.length - 1]) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, BARS);
  return { bars: bars.map((b) => ({ ...b, ...kpiNumber(b.value, lang) })) };
}
