import { parse as parseYaml } from 'yaml';
import kpiSource from '../content/kpis.yml?raw';
import type { QueryResult } from './db/run';
import { currentChapter, nextTicket, type Bilingual, type Chapter, type Skill } from './progress';
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
  const learned = new Set(solved.flatMap((t) => t.grants));
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
        own.length === 0 ? 'soon' : done === own.length ? 'done' : c.chapter === chapter ? 'current' : 'locked';
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
/** A company dashboard tile (L18 ★5): opens when `ticket` is completed; its value comes from that ticket's Solution (step `step`). */
export interface Kpi { id: string; ticket: string; step: number; col: number; kind: KpiKind; label: Bilingual }
const KPI_KINDS: KpiKind[] = ['number', 'rowcount', 'bar'];

export function parseKpis(src: string, origin = 'kpis.yml'): Kpi[] {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  return data.map((raw: unknown, i) => {
    const k = (raw ?? {}) as Record<string, unknown>;
    const label = (k.label ?? {}) as Record<string, unknown>;
    if (typeof k.id !== 'string' || typeof k.ticket !== 'string' || !KPI_KINDS.includes(k.kind as KpiKind)
      || typeof label.vi !== 'string' || typeof label.en !== 'string') {
      throw new Error(`${origin}: mục ${i} cần id, ticket, kind (${KPI_KINDS.join(' | ')}) và label { vi, en }`);
    }
    return {
      id: k.id, ticket: k.ticket, kind: k.kind as KpiKind, label: { vi: label.vi, en: label.en },
      step: typeof k.step === 'number' ? k.step : 0, col: typeof k.col === 'number' ? k.col : 0,
    };
  });
}
export const KPIS: Kpi[] = parseKpis(kpiSource);

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
export const chapterOfId = (id: string): number => Number(/^ch(\d+)-/.exec(id)?.[1] ?? 0);

export type KpiValue = { text: string } | { bars: { label: string; value: number; text: string }[] };
const BARS = 5;
/** PGlite returns numeric as strings and bigint counts as bigint: Number() covers both. */
export function kpiValue(k: Kpi, r: QueryResult, lang: Lang): KpiValue {
  const fmt = new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 2 });
  if (k.kind === 'rowcount') return { text: fmt.format(r.rows.length) };
  if (k.kind === 'number') return { text: fmt.format(Number(r.rows[0]?.[k.col] ?? 0)) };
  const bars = r.rows
    .map((row) => ({ label: row.slice(0, -1).map(String).join(' · '), value: Number(row[row.length - 1]) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, BARS);
  return { bars: bars.map((b) => ({ ...b, text: fmt.format(b.value) })) };
}
