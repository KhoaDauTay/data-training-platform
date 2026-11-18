import type { Card, CardKind } from './dashboard';
import type { DomainId } from './domains';
import type { Key } from './i18n';

/**
 * Starter cards (D-DB1, L86): ready-made dashboard cards we wrote, one set per domain, shown while the player has no card of
 * their own. Pure data, never stored in the Save (derived on every draw), so Save stays v4. They read only tables the domain
 * opens in chapter 1, use literal dates, a full ORDER BY, and must not equal any ticket Solution or KPI tile
 * (tests/starterCards.test.ts runs them on the seeded DB).
 */
export interface StarterCard { id: string; title: Key; sql: string; kind: CardKind; col?: number; tables: string[] }

export const STARTERS: Partial<Record<DomainId, StarterCard[]>> = {
  logistics: [
    { id: 's-customers', title: 'starter.lg.customers', kind: 'number', tables: ['customers'], sql: 'SELECT COUNT(*) AS customers\nFROM customers' },
    {
      id: 's-industry', title: 'starter.lg.industry', kind: 'bar', col: 1, tables: ['customers'],
      sql: 'SELECT industry, COUNT(*) AS customers\nFROM customers\nGROUP BY industry\nORDER BY customers DESC, industry',
    },
    {
      id: 's-tonnes', title: 'starter.lg.tonnes', kind: 'line', col: 1, tables: ['shipments'],
      sql: "SELECT date_trunc('month', booking_date)::date AS month, ROUND(SUM(gross_weight_kg) / 1000, 1) AS tonnes\nFROM shipments\nWHERE booking_date >= DATE '2025-11-01' AND booking_date < DATE '2026-11-01'\nGROUP BY 1\nORDER BY 1",
    },
    { id: 's-carriers', title: 'starter.lg.carriers', kind: 'table', tables: ['carriers'], sql: 'SELECT name, code, mode\nFROM carriers\nORDER BY mode, name, code' },
  ],
  ecommerce: [
    { id: 's-customers', title: 'starter.ec.customers', kind: 'number', tables: ['customers'], sql: 'SELECT COUNT(*) AS customers\nFROM customers' },
    {
      id: 's-channel', title: 'starter.ec.channel', kind: 'bar', col: 1, tables: ['customers'],
      sql: 'SELECT channel, COUNT(*) AS customers\nFROM customers\nGROUP BY channel\nORDER BY customers DESC, channel',
    },
    {
      id: 's-signups', title: 'starter.ec.signups', kind: 'line', col: 1, tables: ['customers'],
      sql: "SELECT date_trunc('month', signup_date)::date AS month, COUNT(*) AS customers\nFROM customers\nWHERE signup_date >= DATE '2025-11-01' AND signup_date < DATE '2026-11-01'\nGROUP BY 1\nORDER BY 1",
    },
    { id: 's-sellers', title: 'starter.ec.sellers', kind: 'table', tables: ['sellers'], sql: 'SELECT name, city, joined_on\nFROM sellers\nORDER BY joined_on DESC, name\nLIMIT 10' },
  ],
};

/** The domain's starter cards whose tables are all open; `title` is the resolved text, `source` marks them as ours, the id carries the domain. */
export function starterCards(domain: DomainId, unlocked: readonly string[], title: (k: Key) => string): Card[] {
  const open = new Set(unlocked);
  return (STARTERS[domain] ?? []).filter((s) => s.tables.every((x) => open.has(x))).map((s) => ({
    id: `${domain}/${s.id}`, title: title(s.title), sql: s.sql, kind: s.kind, source: 'starter', ...(s.col !== undefined ? { col: s.col } : {}),
  }));
}
