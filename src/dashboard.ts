import type { QueryResult } from './db/run';
import { chartSpec, MAX_POINTS, NUMERIC, type ChartSpec } from './viz/chart';

/**
 * Player cards on the dashboard (product-design-v3 §4–§7, L48/L49). Pure: no DOM, no DB. Stored in Save v3 (`save.dashboard`),
 * so they travel with Export/Import; company KPI tiles (content/kpis.yml) are never stored here, only their `hidden` ids.
 */
export const CARD_KINDS = ['table', 'number', 'bar', 'line'] as const;
export type CardKind = (typeof CARD_KINDS)[number];
/** `col`: value column (number, bar, line); bars and lines take their labels from column 0 (chartSpec). Array position = order. */
export interface Card { id: string; title: string; sql: string; kind: CardKind; col?: number; slow?: true; source: string }
export interface Dashboard { cards: Card[]; hidden: string[] }

export const MAX_CARDS = 24;
export const MAX_CARD_SQL = 4000;
export const MAX_CARD_TITLE = 80;
/** A card re-runs every time the dashboard opens: a query slower than this cannot be pinned (D-A4). */
export const PIN_MAX_MS = 2000;
/** Rows a table card shows, bars a bar card shows. Lines show up to MAX_POINTS points. */
export const TABLE_ROWS = 10;
export const BAR_ROWS = 12;

/** D-A3: a kind opens with the skill that makes that shape of result (table ch1, number and bar ch2, line ch4). */
export const KIND_SKILL: Record<CardKind, string> = { table: 'select', number: 'aggregate', bar: 'group_by', line: 'date_bucket' };

export const emptyDashboard = (): Dashboard => ({ cards: [], hidden: [] });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isShort = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= max;

/** Save v3 field, checked like every other field: a broken card is dropped, never the whole save. */
export function readDashboard(v: unknown): Dashboard {
  const out = emptyDashboard();
  if (!isRecord(v)) return out;
  const ids = new Set<string>();
  for (const c of Array.isArray(v.cards) ? v.cards : []) {
    if (out.cards.length >= MAX_CARDS) break;
    if (!isRecord(c) || !isShort(c.id, 40) || ids.has(c.id) || !isShort(c.title, MAX_CARD_TITLE) || !isShort(c.sql, MAX_CARD_SQL)
      || !CARD_KINDS.includes(c.kind as CardKind) || !isShort(c.source, 40)) continue;
    if (c.col !== undefined && !(Number.isInteger(c.col) && (c.col as number) >= 0)) continue;
    ids.add(c.id);
    out.cards.push({
      id: c.id, title: c.title, sql: c.sql, kind: c.kind as CardKind, source: c.source,
      ...(c.col !== undefined ? { col: c.col as number } : {}), ...(c.slow === true ? { slow: true as const } : {}),
    });
  }
  if (Array.isArray(v.hidden)) out.hidden = [...new Set(v.hidden.filter((x): x is string => isShort(x, 40)))].slice(0, 64);
  return out;
}

/** Bars and lines use the chart rules of the Chart tab on the rows the card shows. */
export const cardSpec = (r: QueryResult): ChartSpec | null => chartSpec({ ...r, rows: r.rows.slice(0, MAX_POINTS) });
/** Numeric columns: candidates for a number card. */
export const numericCols = (r: QueryResult): number[] => r.types.flatMap((t, i) => (NUMERIC.has(t) ? [i] : []));

/** Value columns `kind` can use with this result; [] = the kind does not fit (a table fits any result with columns). */
export function valueCols(kind: CardKind, r: QueryResult): number[] {
  if (r.columns.length === 0) return [];
  if (kind === 'table') return [0];
  if (kind === 'number') return r.rows.length ? numericCols(r) : [];
  const spec = cardSpec(r);
  return spec?.kind === kind ? spec.values : [];
}

/** Why the Pin button cannot be used now; undefined = it can. `stale`: the editor no longer holds the SQL that ran. */
export type PinBlock = 'stale' | 'full' | 'long' | 'slow';
export function pinBlock(run: { sql: string; ms?: number }, editorSql: string, cards: number): PinBlock | undefined {
  if (editorSql.trim() !== run.sql.trim()) return 'stale';
  if (cards >= MAX_CARDS) return 'full';
  if (run.sql.trim().length > MAX_CARD_SQL) return 'long';
  if ((run.ms ?? 0) > PIN_MAX_MS) return 'slow';
  return undefined;
}

/** c1, c2, …: the smallest number above every existing card id. */
export function nextCardId(cards: Card[]): string {
  const n = Math.max(0, ...cards.map((c) => Number(/^c(\d+)$/.exec(c.id)?.[1] ?? 0)));
  return `c${n + 1}`;
}

/** Lên/Xuống: a new array with card `i` swapped with its neighbour; the same array when it cannot move. */
export function moveCard(cards: Card[], i: number, dir: -1 | 1): Card[] {
  const j = i + dir;
  if (i < 0 || i >= cards.length || j < 0 || j >= cards.length) return cards;
  const out = [...cards];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
