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
 * file, certificate, portfolio). Lazy only (chunk `meView`): it imports only types from main modules. Nothing here reads
 * the DOM, storage or the clock; nothing it builds contains player-imported data (`sandbox` schema, `touchesSandbox`).
 */

// ---------- insights (v7 §7) ----------

export interface TrySummary { passed: number; first: number; runs: number }
/** Tasks passed (with a recorded submit), share passed on the first Submit, mean runs + submits before passing. */
export function trySummary(attempts: Record<string, Attempt>): TrySummary {
  const passed = Object.values(attempts).filter((a) => a.passedOn !== undefined);
  return {
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

// ---------- certificate (v7 §5.2) ----------

export type CertScope = DomainId | 'general';
export interface CertData {
  scope: CertScope;
  lang: Lang;
  name: string;
  /** Domain name (t(domain.name)) or the General title. */
  what: string;
  tasks: number;
  skills: number;
  rank?: string;
  date: string;
  /** Inner markup of a self-contained mascot (no <use> into the page, no CSS variables), drawn in a 120×120 box. */
  mascot?: string;
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const W = 1123;
const H = 794;
/** Fixed paper colours: the file looks the same whatever the page theme (checked for contrast in tests/me.test.ts). */
export const PAPER = { bg: '#fbf6ee', ink: '#2b2622', muted: '#5f554c', accent: '#0f766e', line: '#d9cfc2' } as const;

/** A4 landscape SVG, self-contained (inline colours, no external reference). Says "not verified" on the picture itself. */
export function certificateSvg(c: CertData): string {
  const m = (k: MeKey, p?: Record<string, string | number>): string => esc(meText(c.lang, k, p));
  const company = c.scope === 'general' ? '' : meText(c.lang, `co.${c.scope}` as MeKey);
  const line = c.scope === 'general' ? m('cert.doneGeneral', { n: c.skills }) : m('cert.done', { n: c.tasks, company });
  const text = (y: number, size: number, body: string, fill: string = PAPER.ink, weight = 400): string =>
    `<text x="${W / 2}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle">${body}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${m('cert.alt', { what: c.what })}">`
    + `<title>${m('cert.alt', { what: c.what })}</title>`
    + `<rect width="${W}" height="${H}" fill="${PAPER.bg}"/>`
    + `<rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="20" fill="none" stroke="${PAPER.accent}" stroke-width="4"/>`
    + `<rect x="44" y="44" width="${W - 88}" height="${H - 88}" rx="14" fill="none" stroke="${PAPER.line}" stroke-width="2"/>`
    + `<g font-family="Nunito, 'Segoe UI', system-ui, sans-serif">`
    + text(128, 22, `BOONDATA · ${esc(c.what.toUpperCase())}`, PAPER.accent, 800)
    + text(178, 40, m('cert.head'), PAPER.ink, 800)
    + `<line x1="${W / 2 - 120}" y1="204" x2="${W / 2 + 120}" y2="204" stroke="${PAPER.line}" stroke-width="2"/>`
    + text(288, 56, esc(c.name.trim() || meText(c.lang, 'cert.anon')), PAPER.ink, 800)
    + text(346, 26, line)
    + (c.rank ? text(392, 24, m('cert.rank', { rank: c.rank })) : '')
    + (c.scope === 'general' ? '' : text(c.rank ? 432 : 392, 22, m('cert.skills', { n: c.skills }), PAPER.muted))
    + text(520, 22, m('cert.date', { date: c.date }), PAPER.muted)
    + text(676, 20, m('cert.verify'), PAPER.ink, 700)
    + text(708, 18, m('cert.fiction'), PAPER.muted)
    + `</g>`
    + (c.mascot ? `<g transform="translate(84 590) scale(1)">${c.mascot}</g>` : '')
    + `</svg>`;
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

/** A fence longer than any backtick run inside the SQL. */
const fence = (sql: string): string => '`'.repeat(Math.max(3, ...[...sql.matchAll(/`+/g)].map((r) => r[0].length + 1)));

/**
 * The portfolio file. cards: the domain's dashboard cards; those reading imported data (imported names) are left out.
 * pics: ids of cards with a picture beside the file (V19-D, L170: the zip's cards/<id>.png).
 */
export function portfolioMd(p: { lang: Lang; scope: DomainId; what: string; name: string; date: string; entries: PortfolioEntry[]; cards: readonly { id?: string; title: string; sql: string }[]; imported: readonly string[]; pics?: ReadonlySet<string> }): string {
  const m = (k: MeKey, q?: Record<string, string | number>): string => meText(p.lang, k, q);
  const out = [
    `# ${m('pf.h1', { domain: p.what })}`, '',
    m('pf.by', { name: p.name.trim() || m('cert.anon'), date: p.date, company: m(`co.${p.scope}` as MeKey) }), '',
    `> ${m('pf.note')}`, '',
  ];
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
