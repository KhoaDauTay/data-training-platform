import { parse as parseYaml } from 'yaml';
import chaptersSource from '../content/chapters.yml?raw';
import skillsSource from '../content/skills.yml?raw';
import { activeDomain, type DomainId } from './domains';
import { codeOnly } from './planCheck';
import type { Lang, Ticket } from './tickets';

export interface Bilingual { vi: string; en: string }
/** A skill and its card (syntax/when/trap, shown in the handbook). */
export interface Skill { id: string; chapter: number; label: Bilingual; syntax: string; when: Bilingual; trap: Bilingual }
/** "After this chapter you can…"; ticked once every skill in `skills` is learned. */
export interface Outcome extends Bilingual { skills: string[] }
/** career: the step reached by passing this chapter's promotion review; tier: a ★ chapter that changes the job title (L30). */
/** `module`: the domain-neutral name of the chapter's SQL module (Learning path, Practise SQL); `title` is the domain story's.
 * `tables`: the domain tables this chapter reveals (content/domains/<d>/chapters.yml); Logistics keeps CHAPTER_TABLES below. */
export interface Chapter { chapter: number; title: Bilingual; module: Bilingual; career: Bilingual; tier: boolean; story: Bilingual; outcomes: Outcome[]; tables?: string[] }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
/** Strict { vi, en }: both non-empty strings (trimmed), else undefined. people.yml and ticket `columns:` require it. */
export function bilingualOf(v: unknown): Bilingual | undefined {
  const o = v as Partial<Record<keyof Bilingual, unknown>> | null;
  if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.vi !== 'string' || typeof o.en !== 'string') return undefined;
  const b = { vi: o.vi.trim(), en: o.en.trim() };
  return b.vi && b.en ? b : undefined;
}
const bilingual = (v: unknown): Bilingual => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { vi: str(o.vi), en: str(o.en) };
};
const list = (source: string, origin: string): Record<string, unknown>[] => {
  const data = parseYaml(source) as unknown;
  if (!Array.isArray(data) || data.some((x) => !x || typeof x !== 'object')) throw new Error(`${origin}: cần một danh sách`);
  return data as Record<string, unknown>[];
};

/**
 * A `(SELECT …)` that reads `alias.column` for an alias (or table) not declared inside it, i.e. the outer query's row.
 * Keyword-level, not a parser: string literals with a dot inside a subquery could fool it.
 */
function correlatedSubquery(sql: string): boolean {
  for (const m of sql.matchAll(/\(\s*SELECT\b/gi)) {
    let depth = 0;
    let end = m.index;
    for (; end < sql.length; end++) {
      if (sql[end] === '(') depth++;
      else if (sql[end] === ')' && --depth === 0) break;
    }
    const sub = sql.slice(m.index, end);
    const own = new Set<string>();
    for (const d of sub.matchAll(/\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi)) {
      own.add(d[1].toLowerCase());
      if (d[2]) own.add(d[2].toLowerCase());
    }
    for (const r of sub.matchAll(/\b([a-z_]\w*)\.[a-z_]/gi)) if (!own.has(r[1].toLowerCase())) return true;
  }
  return false;
}

/** `SUM(…) OVER`: an aggregate used as a window. Its argument may nest parentheses (SUM(SUM(x)), SUM(COALESCE(x, 0))). */
function aggregateOver(sql: string): boolean {
  const code = codeOnly(sql) ?? sql; // comments and literals out: `SUM(x) /*c*/ OVER`, ')' inside a string
  const close = new Map<number, number>(); // '(' position → its ')', one pass (unclosed ones have none)
  const open: number[] = [];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '(') open.push(i);
    else if (code[i] === ')' && open.length) close.set(open.pop()!, i);
  }
  const over = /\s*OVER\b/iy;
  for (const m of code.matchAll(/\b(SUM|AVG|COUNT|MIN|MAX)\s*\(/gi)) {
    const end = close.get(m.index + m[0].length - 1);
    if (end === undefined) continue;
    over.lastIndex = end + 1;
    if (over.test(code)) return true;
  }
  return false;
}

/** How a Solution shows it really uses a skill (twist → boss check). Skills not listed here are not checked. */
const SKILL_SQL: Record<string, { test(sql: string): boolean }> = {
  order_by: /\bORDER\s+BY\b/i,
  limit: /\bLIMIT\b/i,
  having: /\bHAVING\b/i,
  left_join: /\bLEFT\s+(OUTER\s+)?JOIN\b/i,
  anti_join: /\bIS\s+NULL\b|\bNOT\s+EXISTS\b/i,
  null_logic: /\bIS\s+(NOT\s+)?NULL\b/i,
  cast: /::\s*\w+|\bCAST\s*\(/i,
  correlated_value: { test: correlatedSubquery },
  distinct_on: /\bDISTINCT\s+ON\b/i,
  full_join: /\bFULL\s+(OUTER\s+)?JOIN\b/i,
  // An aggregate used as a window (running total, moving average), not ROW_NUMBER/LAG: `SUM(x) OVER`, `count(*) OVER`.
  window_agg: { test: aggregateOver },
  index_design: /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i,
};

/** curriculum §5.1: from this chapter on, a rest ticket must review older chapters (spaced, interleaved). */
export const REST_RULE_FROM = 4;

/** true/false when `skill` has a keyword pattern, undefined when it cannot be checked. */
export const twistUsed = (skill: string, sql: string): boolean | undefined => SKILL_SQL[skill]?.test(sql);

/** Throws on a broken structure. Empty card fields are reported by contentProblems instead. */
export function parseSkills(source: string, origin = 'skills.yml'): Skill[] {
  const seen = new Set<string>();
  return list(source, origin).map((s, i) => {
    if (typeof s.id !== 'string' || !s.id) throw new Error(`${origin}: mục ${i} thiếu id`);
    if (seen.has(s.id)) throw new Error(`${origin}: trùng id "${s.id}"`);
    seen.add(s.id);
    if (typeof s.chapter !== 'number') throw new Error(`${origin}: "${s.id}" thiếu chapter`);
    return { id: s.id, chapter: s.chapter, label: bilingual(s.label), syntax: str(s.syntax), when: bilingual(s.when), trap: bilingual(s.trap) };
  });
}

export function parseChapters(source: string, origin = 'chapters.yml'): Chapter[] {
  return list(source, origin).map((c, i) => {
    if (typeof c.chapter !== 'number') throw new Error(`${origin}: mục ${i} thiếu chapter`);
    const outcomes = Array.isArray(c.outcomes) ? (c.outcomes as unknown[]) : [];
    return {
      chapter: c.chapter,
      title: bilingual(c.title),
      module: bilingualOf(c.module) ?? bilingual(c.title),
      career: bilingual(c.career),
      tier: c.tier === true,
      story: bilingual(c.story),
      outcomes: outcomes.map((o) => ({ ...bilingual(o), skills: strings((o as { skills?: unknown } | null)?.skills) })),
      ...(Array.isArray(c.tables) ? { tables: strings(c.tables) } : {}),
    };
  });
}

export const SKILLS: Skill[] = parseSkills(skillsSource);
export const CHAPTERS: Chapter[] = parseChapters(chaptersSource);

/** `chapters`: CHAPTERS on General pages (the learning path follows Logistics, Plan 9 D9-12). */
export function chapterTitle(chapter: number, lang: Lang, chapters: Chapter[] = chaptersOf()): string {
  return chapters.find((c) => c.chapter === chapter)?.title[lang] ?? '';
}
/** The General pages' name for a chapter's module (v10 critic #7): about SQL, never the logistics story. */
export function moduleTitle(chapter: number, lang: Lang): string {
  return CHAPTERS.find((c) => c.chapter === chapter)?.module[lang] ?? '';
}

/** Tables that appear in the schema sidebar from this chapter on (spec §4). The DB always has all of them. */
export const CHAPTER_TABLES: Record<number, string[]> = {
  1: ['ports', 'carriers', 'employees', 'customers', 'shipments'],
  2: ['containers'],
  3: [],
  4: ['shipment_events', 'trucking_orders', 'cfs_receipts'],
  5: ['customs_declarations', 'hs_codes', 'duties_taxes'],
  6: ['incoterms'],
  7: ['rate_contracts', 'quotations'],
  8: ['invoices', 'payments', 'vendor_bills', 'exchange_rates'], // no `charges` (Plan 3 R2): revenue is invoices.amount_vnd
  9: ['master_bills', 'house_bills'],
  10: ['free_time_terms', 'container_events'],
  11: [],
  12: ['claims'],
};

/** Chapters of the non-Logistics domains, set by loadDomain() (src/content.ts). Logistics is CHAPTERS. */
const domainChapters = new Map<DomainId, Chapter[]>();
export const setDomainChapters = (d: DomainId, chapters: Chapter[]): void => void domainChapters.set(d, chapters);
/** The open domain's chapters (Plan 9 D9-12). General pages keep CHAPTERS: the learning path follows Logistics. */
export const chaptersOf = (d: DomainId = activeDomain()): Chapter[] => (d === 'logistics' ? CHAPTERS : domainChapters.get(d) ?? []);
export const chapterTablesOf = (d: DomainId = activeDomain()): Record<number, string[]> =>
  d === 'logistics' ? CHAPTER_TABLES : Object.fromEntries(chaptersOf(d).map((c) => [c.chapter, c.tables ?? []]));

/**
 * A domain's skill cards: the shared cards of skills.yml with `chapter` = the chapter of the domain ticket that teaches
 * the skill (Plan 9 D9-6). Skills the domain never teaches are left out, so contentProblems reports any ticket that
 * requires one. Leitner boxes and review stay keyed by the shared skill id.
 */
export function domainSkills(tickets: Ticket[], all: Skill[] = SKILLS): Skill[] {
  const taughtIn = new Map<string, number>();
  for (const t of tickets) for (const s of t.grants) if (!taughtIn.has(s)) taughtIn.set(s, t.chapter);
  return all.filter((s) => taughtIn.has(s.id)).map((s) => ({ ...s, chapter: taughtIn.get(s.id)! }));
}

export function tablesUnlocked(chapter: number, tables: Record<number, string[]> = chapterTablesOf()): string[] {
  return Object.entries(tables)
    .filter(([c]) => Number(c) <= chapter)
    .flatMap(([, tables]) => tables);
}

/** Chapters whose promotion review (beat: boss) is in `completed`. */
export const passedChapters = (tickets: readonly Ticket[], completed: ReadonlySet<string>): Set<number> =>
  new Set(tickets.filter((t) => t.beat === 'boss' && completed.has(t.id)).map((t) => t.chapter));

/**
 * v17 I4 (D-N11, L145): a normal task not done in a chapter whose promotion review is passed (taken early) is optional:
 * still playable with its XP, never "the next task". With a linear save (no review taken early) nothing is optional.
 */
export const isOptional = (t: Ticket, completed: ReadonlySet<string>, passed: ReadonlySet<number>): boolean =>
  t.beat !== 'boss' && !completed.has(t.id) && passed.has(t.chapter);

/** Next task in story order: the first not done that is not optional. A linear save gets the first not done, as before L145. */
export function nextTicket(tickets: Ticket[], completed: Set<string>): Ticket | undefined {
  const passed = passedChapters(tickets, completed);
  return tickets.find((t) => !completed.has(t.id) && !passed.has(t.chapter));
}

/** Tasks the player can open: done, the next one, and the optional ones of chapters passed early (L145). */
export function visibleTickets(tickets: Ticket[], completed: Set<string>): Ticket[] {
  const next = nextTicket(tickets, completed);
  const passed = passedChapters(tickets, completed);
  return tickets.filter((t) => completed.has(t.id) || t === next || isOptional(t, completed, passed));
}

/**
 * v17 I4 (D-N11, L145): the promotion review the player may take now, before the chapter's normal tasks: the review of
 * the chapter they have entered (the next task's chapter), unless the next task already is that review. Whether to offer
 * it is the UI's call (`earlyOffer`, src/ui/chapterView.ts: never to beginners in chapter 1); its tables are open from the
 * chapter's first task, so nothing else changes.
 */
export function earlyReview(tickets: Ticket[], completed: Set<string>): Ticket | undefined {
  const next = nextTicket(tickets, completed);
  if (!next || next.beat === 'boss') return undefined;
  return tickets.find((t) => t.chapter === next.chapter && t.beat === 'boss' && !completed.has(t.id));
}

/** Skills a passed chapter counts as learned (L145): what its tasks teach, done or skipped. */
export const passedSkills = (tickets: readonly Ticket[], completed: ReadonlySet<string>): string[] => {
  const passed = passedChapters(tickets, completed);
  return tickets.filter((t) => passed.has(t.chapter)).flatMap((t) => t.grants);
};

export function currentChapter(tickets: Ticket[], completed: Set<string>): number {
  return nextTicket(tickets, completed)?.chapter ?? Math.max(1, ...tickets.map((t) => t.chapter));
}

/** L54: hints cost nothing anywhere in this chapter (the probation week); elsewhere each costs 25% of the task XP, at most 3. */
export const FREE_HINT_CHAPTER = 1;

export function xpFor(ticket: Ticket, hintsUsed: number): number {
  const paid = ticket.chapter === FREE_HINT_CHAPTER ? 0 : Math.min(hintsUsed, 3);
  return Math.round(ticket.difficulty * 100 * (1 - 0.25 * paid));
}

/** Career after the promotion reviews passed so far (L19: one step per review; the title changes only at ★ chapters). */
export interface Rank {
  /** Chapters whose promotion review (beat: boss) is done, ascending. */
  passed: number[];
  /** Job title: career of the highest ★ chapter passed. undefined = DA intern (i18n `career.intern`). */
  tier?: Bilingual;
  /** Career step of the highest chapter passed. */
  career?: Bilingual;
}

export function rankOf(tickets: Ticket[], completed: Set<string>, chapters: Chapter[] = chaptersOf()): Rank {
  const passed = [...passedChapters(tickets, completed)].sort((a, b) => a - b);
  const reached = chapters.filter((c) => passed.includes(c.chapter));
  const tier = reached.filter((c) => c.tier).pop()?.career;
  const career = reached[reached.length - 1]?.career;
  return { passed, ...(tier ? { tier } : {}), ...(career ? { career } : {}) };
}

/**
 * Soft-lock, pacing and skill-map checks (level-design skill, spec §5). `tickets` must be sorted by byOrder.
 * Skills/outcomes are only required to be granted for chapters that already have tickets,
 * so content can be written chapter by chapter.
 */
export function contentProblems(
  tickets: Ticket[], skills: Skill[] = SKILLS, chapters: Chapter[] = chaptersOf(), tables: Record<number, string[]> = chapterTablesOf(),
): string[] {
  const problems: string[] = [];
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const granted = new Set<string>();
  const grantCount = new Map<string, number>();
  for (const t of tickets) {
    if (seen.has(t.id)) problems.push(`${t.id}: trùng id`);
    seen.add(t.id);
    for (const skill of [...t.requires, ...t.grants]) {
      if (!skillById.has(skill)) problems.push(`${t.id}: kỹ năng "${skill}" không có trong skills.yml`);
    }
    for (const skill of t.requires) {
      if (!granted.has(skill)) problems.push(`${t.id}: cần kỹ năng "${skill}" nhưng chưa ticket nào trước đó dạy`);
    }
    const open = tablesUnlocked(t.chapter, tables);
    for (const table of t.tables) {
      if (!open.includes(table)) problems.push(`${t.id}: dùng bảng "${table}" chưa mở ở chương ${t.chapter}`);
    }
    for (const skill of t.grants) {
      granted.add(skill);
      grantCount.set(skill, (grantCount.get(skill) ?? 0) + 1);
      const k = skillById.get(skill);
      if (k && k.chapter !== t.chapter) problems.push(`${t.id}: dạy "${skill}" nhưng skills.yml ghi chương ${k.chapter}`);
    }
  }

  const ticketChapters = new Set(tickets.map((t) => t.chapter));
  for (const k of skills) {
    if (!k.syntax || !k.when.vi || !k.when.en || !k.trap.vi || !k.trap.en || !k.label.vi || !k.label.en) {
      problems.push(`kỹ năng "${k.id}": thiếu nhãn hoặc thẻ (label, syntax, when, trap đủ vi/en)`);
    }
    const n = grantCount.get(k.id) ?? 0;
    if (ticketChapters.has(k.chapter) && n !== 1) problems.push(`kỹ năng "${k.id}": được dạy ${n} lần, cần đúng 1`);
  }

  for (const c of chapters) {
    if (!c.title.vi || !c.title.en) problems.push(`chương ${c.chapter}: thiếu tiêu đề vi/en`);
    if (!c.career.vi || !c.career.en || !c.story.vi || !c.story.en) problems.push(`chương ${c.chapter}: thiếu career/story vi/en`);
    for (const o of c.outcomes) {
      if (!o.vi || !o.en) problems.push(`chương ${c.chapter}: outcome thiếu vi/en`);
      for (const skill of o.skills) {
        const k = skillById.get(skill);
        if (!k) problems.push(`chương ${c.chapter}: outcome dùng kỹ năng "${skill}" không có trong skills.yml`);
        else if (k.chapter > c.chapter) problems.push(`chương ${c.chapter}: outcome dùng kỹ năng "${skill}" của chương ${k.chapter}`);
      }
    }
  }

  for (const chapter of ticketChapters) {
    const inChapter = tickets.filter((t) => t.chapter === chapter);
    const beats = inChapter.map((t) => t.beat);
    if (!chapters.some((c) => c.chapter === chapter)) problems.push(`chương ${chapter}: thiếu trong chapters.yml`);
    if (beats[0] !== 'teach') problems.push(`chương ${chapter}: ticket đầu phải là teach`);
    if (beats[beats.length - 1] !== 'boss') problems.push(`chương ${chapter}: ticket cuối phải là boss`);
    if (beats[beats.length - 2] !== 'rest') problems.push(`chương ${chapter}: ngay trước boss phải là rest`);
    if (beats.filter((b) => b === 'boss').length !== 1) problems.push(`chương ${chapter}: cần đúng một boss`);
    if (chapter >= REST_RULE_FROM) {
      for (const rest of inChapter.filter((t) => t.beat === 'rest')) {
        const older = rest.requires.map((s) => skillById.get(s)?.chapter ?? chapter).filter((c) => c < chapter);
        if (older.length < 2 || !older.some((c) => c <= chapter - 2)) {
          problems.push(`${rest.id}: rest phải requires ≥ 2 kỹ năng của chương trước, trong đó ≥ 1 kỹ năng từ chương ${chapter - 2} trở về trước`);
        }
      }
    }
    const boss = inChapter.find((t) => t.beat === 'boss');
    if (boss && boss.grants.length) problems.push(`${boss.id}: boss không được dạy kỹ năng (grants phải rỗng)`);
    for (const twist of inChapter.filter((t) => t.beat === 'twist')) {
      for (const skill of twist.grants) {
        if (!boss) continue;
        if (!boss.requires.includes(skill)) problems.push(`${boss.id}: boss phải kiểm tra kỹ năng twist "${skill}" (thêm vào requires)`);
        // A lab step's answer is its reference CREATE INDEX (lab.ddl), not the slow query in its Solution.
        if (boss.steps.every((st) => twistUsed(skill, st.lab?.ddl ?? st.solution) === false)) {
          problems.push(`${boss.id}: không Solution nào của boss dùng kỹ năng twist "${skill}"`);
        }
      }
    }
  }
  return problems;
}
