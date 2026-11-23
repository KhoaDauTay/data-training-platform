import type { Card, CardKind, Dashboard } from './dashboard';
import type { DomainId } from './domains';
import type { Lang } from './i18n';
import { meText, type MeKey } from './i18n/me';
import type { Attempt } from './insights';
import type { Review } from './practice';
import type { Save } from './save';
import type { Ticket, TicketText } from './tickets';

/**
 * v16 "Của tôi" (I2 + I6, product-design-v7 §5/§7, L142): the pure part of the #/me page and of every export (dashboard
 * file, portfolio; the certificates were removed in v24, L323). Lazy only (chunk `meView`): it imports only types from main modules. Nothing here reads
 * the DOM, storage or the clock; nothing it builds contains player-imported data (`sandbox` schema, `touchesSandbox`).
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

/** Learned skills with their Leitner box (0 = learned, no review card yet), the ones that most need review first. */
export function strengths(known: Iterable<string>, review: Review): { id: string; box: number }[] {
  return [...known].map((id) => ({ id, box: review[id]?.box ?? 0 }))
    .sort((a, b) => (a.box || 9) - (b.box || 9) || (review[a.id]?.due ?? '').localeCompare(review[b.id]?.due ?? '') || a.id.localeCompare(b.id));
}

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

// ---------- player-imported data never leaves (v7 §5) ----------

/** The SQL reads the `sandbox` schema or a table the player imported (by name, quoted or not, any case). */
export function touchesSandbox(sql: string, imported: readonly string[]): boolean {
  const s = sql.toLowerCase();
  if (/\bsandbox\s*\.|"sandbox"\s*\./.test(s)) return true;
  return imported.some((n) => new RegExp(`(^|[^a-z0-9_$])"?${n.toLowerCase().replace(/[^a-z0-9_]/g, '')}"?($|[^a-z0-9_$])`).test(s));
}

// ---------- dashboard file (v7 §5.1) ----------

export interface DashFile { format: 1; app: 'boondata'; domain: DomainId; cards: { title: string; kind: CardKind; sql: string; col?: number }[] }

/** `boondata-<domain>.boondash.json`: title, kind, SQL (and value column) per card; no results, no card on imported data. */
export function dashFile(domain: DomainId, cards: readonly Card[], imported: readonly string[]): { file: DashFile; dropped: number } {
  const kept = cards.filter((c) => !touchesSandbox(c.sql, imported));
  return {
    file: { format: 1, app: 'boondata', domain, cards: kept.map((c) => ({ title: c.title, kind: c.kind, sql: c.sql, ...(c.col !== undefined ? { col: c.col } : {}) })) },
    dropped: cards.length - kept.length,
  };
}

export type DashImport = { error: 'bad' } | { error: 'domain'; domain: DomainId } | { cards: Card[]; added: number; skipped: number };
/**
 * Appends a file's cards after `existing`, with new ids and source 'import'. `read` is the Save's own check
 * (src/dashboard.ts readDashboard: max 24 cards, SQL ≤ 4,000 chars, a broken card dropped), so an imported card is never
 * looser than a saved one. Imported cards are never marked "ran" (cards-ran), so they wait for Run.
 */
export function importDash(text: string, domain: DomainId, existing: readonly Card[], read: (v: unknown) => Dashboard, domains: readonly DomainId[]): DashImport {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { error: 'bad' };
  }
  const f = v as Partial<DashFile> | null;
  if (!f || typeof f !== 'object' || f.format !== 1 || !Array.isArray(f.cards)) return { error: 'bad' };
  if (f.domain !== domain) return domains.includes(f.domain as DomainId) ? { error: 'domain', domain: f.domain as DomainId } : { error: 'bad' };
  let n = Math.max(0, ...existing.map((c) => Number(/^c(\d+)$/.exec(c.id)?.[1] ?? 0)));
  const fresh = f.cards.map((c) => ({ ...(c && typeof c === 'object' ? c : {}), id: `c${++n}`, source: 'import' }));
  const cards = read({ cards: [...existing, ...fresh] }).cards;
  const added = cards.length - existing.length;
  return { cards, added, skipped: fresh.length - added };
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

/**
 * V19-D (L170): the cards a portfolio may run again for a picture: ran on this device, not slow, no imported data. Filtered
 * before running (imported SQL never runs by itself; a picture carries result rows, not only SQL).
 */
export const pictureCards = (cards: readonly Card[], imported: readonly string[], ranHere: (c: Card) => boolean): Card[] =>
  cards.filter((c) => !c.slow && ranHere(c) && !touchesSandbox(c.sql, imported));

/** v24 (L323): the portfolio's "current skill levels" section, already worded (skills at level ≥ 2, badges held). */
export interface PortfolioLevels { skills: { label: string; level: string }[]; badges: string[] }

/** A fence longer than any backtick run inside the SQL. */
const fence = (sql: string): string => '`'.repeat(Math.max(3, ...[...sql.matchAll(/`+/g)].map((r) => r[0].length + 1)));

/**
 * The portfolio file. cards: the domain's dashboard cards; those reading imported data (imported names) are left out.
 * pics: ids of cards with a picture beside the file (V19-D, L170: the zip's cards/<id>.png).
 */
export function portfolioMd(p: { lang: Lang; scope: DomainId; what: string; name: string; date: string; entries: PortfolioEntry[]; cards: readonly { id?: string; title: string; sql: string }[]; imported: readonly string[]; pics?: ReadonlySet<string>; levels?: PortfolioLevels }): string {
  const m = (k: MeKey, q?: Record<string, string | number>): string => meText(p.lang, k, q);
  const out = [
    `# ${m('pf.h1', { domain: p.what })}`, '',
    m('pf.by', { name: p.name.trim() || m('pf.anon'), date: p.date, company: m(`co.${p.scope}`) }), '',
    `> ${m('pf.note')}`, '',
  ];
  // v24 (L323): the current skill levels (Can do and above) and the badges held, self-measured
  if (p.levels && (p.levels.skills.length || p.levels.badges.length)) {
    out.push(`## ${m('pf.levels')}`, '');
    if (p.levels.skills.length) out.push(`| ${m('pf.skill')} | ${m('pf.level')} |`, '|---|---|', ...p.levels.skills.map((s) => `| ${s.label.replace(/\|/g, '\\|')} | ${s.level} |`), '');
    if (p.levels.badges.length) out.push(`**${m('pf.badges')}:** ${p.levels.badges.join(' · ')}`, '');
  }
  for (const e of p.entries) {
    out.push(`## ${e.title}`, '', `**${m('pf.question')}:** ${e.question.replace(/\n+/g, ' ')}`, '');
    e.steps.forEach((s, i) => {
      const f = fence(s.sql);
      out.push(...(s.title ? [`### ${m('pf.step', { i: i + 1, title: s.title })}`, ''] : [`**${m('pf.sql')}:**`, '']), `${f}sql`, s.sql.trim(), f, '');
    });
    if (e.conclusion) out.push(`**${m('pf.conclusion')}:** ${e.conclusion}`, '');
  }
  const cards = p.cards.filter((c) => !touchesSandbox(c.sql, p.imported));
  if (cards.length) {
    out.push(`## ${m('pf.cards')}`, '', `_${m('pf.cardsNote')}_`, '');
    for (const c of cards) {
      const f = fence(c.sql);
      const pic = c.id && p.pics?.has(c.id) ? [`![${c.title.replace(/[[\]]/g, '')}](cards/${c.id}.png)`, ''] : [];
      out.push(`### ${c.title}`, '', ...pic, `${f}sql`, c.sql.trim(), f, '');
    }
  }
  return out.join('\n');
}
