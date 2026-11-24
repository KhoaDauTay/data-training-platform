import type { Attempt } from './insights';
import type { Review } from './practice';
import type { Save } from './save';
import type { Ticket, TicketText } from './tickets';

/**
 * v16 "Của tôi" (I2 + I6, product-design-v7 §5/§7, L142): the pure part of the #/me page and of every export (dashboard
 * file, portfolio; the certificates were removed in v24, L323). Lazy only (chunk `meView`): it imports only types from main modules. Nothing here reads
 * the DOM, storage or the clock. v33 (L536): the export builders and the imported-data guard moved to src/meExport.ts (chunk `meExport`).
 */

// ---------- insights (v7 §7) ----------

export interface TrySummary { passed: number; first: number; runs: number; wrong: number }
/**
 * Tasks passed (with a recorded submit), share passed on the first Submit, mean runs + submits before passing, and (L312)
 * Submits whose result was not the answer: before the first pass, or every Submit of a task not passed yet. A wrong result
 * is no Postgres error, so it never shows among the error codes: the errors card names it apart.
 */
export function trySummary(attempts: Record<string, Attempt>): TrySummary {
  const all = Object.values(attempts);
  const passed = all.filter((a) => a.passedOn !== undefined);
  return {
    wrong: all.reduce((n, a) => n + (a.passedOn !== undefined ? a.passedOn - 1 : a.submits), 0),
    passed: passed.length,
    first: passed.length ? passed.filter((a) => a.passedOn === 1).length / passed.length : 0,
    runs: passed.length ? passed.reduce((n, a) => n + a.runs, 0) / passed.length : 0,
  };
}

/**
 * F03 (L485): "What to do next" names one skill on the 0–4 mastery scale: the first due for review, else the first one only met
 * (route order). The Leitner box is the review schedule, never a second level.
 */
export const nextSkill = (ids: readonly string[], levels: ReadonlyMap<string, { level: number; review?: boolean }>): string | undefined =>
  ids.find((id) => levels.get(id)?.review) ?? ids.find((id) => levels.get(id)?.level === 1);

export const topErrors = (errors: Record<string, number>, n = 5): [string, number][] =>
  Object.entries(errors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);

const pad = (n: number): string => String(n).padStart(2, '0');
const dayOf = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** `weeks` columns of 7 days (Monday first) ending with the week of `today`; days after today are `future`. */
export function calendar(days: readonly string[], today: Date, weeks = 8): { day: string; on: boolean; future: boolean }[] {
  const set = new Set(days);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) - 7 * (weeks - 1));
  const end = dayOf(today);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const day = dayOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    return { day, on: set.has(day), future: day > end };
  });
}

// ---------- portfolio (I6) ----------

export interface PortfolioEntry { title: string; question: string; steps: { title?: string; sql: string }[]; conclusion?: string }

/**
 * One entry per completed task of `tickets` whose SQL passed the grader: the SQL comes from `save.graded` only (never the
 * draft, never the Solution). A step without graded SQL is left out; a task with none is left out.
 */
export function portfolioEntries(tickets: readonly Ticket[], save: Pick<Save, 'completed' | 'graded'>, text: (t: Ticket) => TicketText): PortfolioEntry[] {
  const done = new Set(save.completed);
  return tickets.flatMap((tk) => {
    if (!done.has(tk.id)) return [];
    const x = text(tk);
    const steps = tk.steps.flatMap((s, i) => {
      const sql = save.graded[`${tk.id}#${i}`];
      return sql?.trim() ? [{ ...(tk.steps.length > 1 ? { title: x.steps[i]?.title || s.title } : {}), sql }] : [];
    });
    if (!steps.length) return [];
    const conclusion = tk.conclusion && x.conclusion ? x.conclusion.options[tk.conclusion.answer] : undefined;
    return [{ title: x.title, question: (x.task || x.body).trim(), steps, ...(conclusion ? { conclusion } : {}) }];
  });
}

/** v24 (L323): the portfolio's "current skill levels" section, already worded (skills at level ≥ 2, badges held). */
export interface PortfolioLevels { skills: { label: string; level: string }[]; badges: string[] }
