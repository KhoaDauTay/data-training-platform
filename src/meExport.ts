import type { Card, CardKind, Dashboard } from './dashboard';
import type { DomainId } from './domains';
import type { Lang } from './i18n';
import { exportText, type ExportKey } from './i18n/meExport';
import type { PortfolioEntry, PortfolioLevels } from './me';

/**
 * v33 (L536): the pure part of the #/me exports (dashboard card file, portfolio file, the imported-data guard), moved out of
 * src/me.ts into the lazy `meExport` chunk (with src/ui/meExport.ts): reached only from an export, share or import click.
 * It imports only types from main modules. Nothing it builds contains player-imported data (`sandbox` schema, `touchesSandbox`).
 */

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
export function portfolioMd(p: { lang: Lang; scope: DomainId; what: string; name: string; date: string; entries: PortfolioEntry[]; cards: readonly { id?: string; title: string; sql: string }[]; imported: readonly string[]; pics?: ReadonlySet<string>; levels?: PortfolioLevels }): string {
  const m = (k: ExportKey, q?: Record<string, string | number>): string => exportText(p.lang, k, q);
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
