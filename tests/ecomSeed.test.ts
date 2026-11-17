// Plan 9: the ecom schema (src/db/ecom/), seeded lazily by ensureSchema(db, 'ecom'). md5 pins: any change to an
// existing block re-rolls these tables and breaks the tickets; append new blocks at the end with their own setseed().
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed } from '../src/db/run';
import { ECOM_TABLES } from '../src/domains';
import { freshDb } from './helpers';

const PINS: Record<string, string> = {
  categories: '4811c234f1b7d8b81ab2b4fe342ea15e',
  sellers: '295e51ad10dc4819d9a980542907e159',
  products: '2dc2de4b23b4a4b7eae692e6a976c0a9',
  customers: '2acfea88f3eb0cd541578946b19c022f',
  vouchers: 'cf11fdd4a9fa3f46588098b5cb5fe871',
  orders: '57f8ae3a029e09834ed15a9064896f3b',
  order_items: 'e760cf7b209a6be6de135341ef34f2c7',
  payments: 'a89f78d5af482c01d3642a0259b0283b',
  deliveries: 'bd8cc1a404fc2df062be28b1764f848b',
  returns: '3297cae09a89676da44981145ef53c44',
  reviews: '10bfe729db17d568b0339062d991b486',
  web_sessions: '1124157f56fe1baf2531ae3116ba5bf1',
  ad_spend: '130d56668bb3e09f2793c0ef856aa542',
};
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM ${t} x`;

let shared: Promise<PGlite> | undefined;
const db = (): Promise<PGlite> => (shared ??= freshDb().then(async (d) => { await ensureSchema(d, 'ecom'); return d; }));
const one = async (sql: string): Promise<unknown[]> => (await runSandboxed(await db(), sql, undefined, { schema: 'ecom' })).rows[0];
const num = async (sql: string): Promise<number> => Number((await one(sql))[0]);

describe('seed ecom (Plan 9)', () => {
  it('13 bảng = ECOM_TABLES, đúng md5 ghim; ensure lần hai không làm gì', async () => {
    const d = await db();
    const names = (await d.query<{ t: string }>("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'ecom' ORDER BY 1")).rows.map((r) => r.t);
    expect(names).toEqual([...ECOM_TABLES].sort());
    for (const t of ECOM_TABLES) expect((await one(hashOf(t)))[0], t).toBe(PINS[t]);
    await ensureSchema(d, 'ecom');
    expect(await num('SELECT count(*) FROM orders')).toBe(10868);
  });

  it('không chạm Logistics: đường dẫn phiên vẫn là logistics, sandbox; public trống', async () => {
    const d = await db();
    expect((await d.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
    expect(Number((await d.query<{ n: number }>("SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'")).rows[0].n)).toBe(0);
  });

  it('móc cốt truyện ở đầu seed.sql', async () => {
    // 12% never order (E3 anti join)
    expect(await num('SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)')).toBe(493);
    // sale days dwarf every other day (E4, E6)
    const [saleMin, otherMax] = (await one(`SELECT min(n) FILTER (WHERE s), max(n) FILTER (WHERE NOT s) FROM (
      SELECT ordered_at::date IN ('2025-09-09','2025-10-10','2025-11-11','2025-12-12','2026-09-09','2026-10-10') AS s, count(*) AS n
      FROM orders GROUP BY ordered_at::date, 1) x`)).map(Number);
    expect(saleMin).toBeGreaterThan(5 * otherMax);
    // Kite Logistics late in the central cities from 2026-09-01 only (E4)
    expect(await num(`SELECT avg(delivered_on - promised_on) FROM deliveries
      WHERE courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang') AND shipped_on >= '2026-09-01'`)).toBeGreaterThan(3);
    expect(await num(`SELECT max(abs(a)) FROM (SELECT avg(delivered_on - promised_on) AS a FROM deliveries
      WHERE NOT (courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang') AND shipped_on >= '2026-09-01') GROUP BY courier, city) x`)).toBeLessThan(0.5);
    // seller 7's phones/audio come back damaged in Q3 2026 (E5)
    const [s7, others] = (await one(`SELECT 100.0 * count(r.id) FILTER (WHERE p.seller_id = 7) / count(*) FILTER (WHERE p.seller_id = 7),
      100.0 * count(r.id) FILTER (WHERE p.seller_id <> 7) / count(*) FILTER (WHERE p.seller_id <> 7)
      FROM order_items i JOIN deliveries d ON d.order_id = i.order_id JOIN products p ON p.id = i.product_id
      LEFT JOIN returns r ON r.order_id = i.order_id AND r.product_id = i.product_id AND r.reason = 'damaged'
      WHERE d.delivered_on >= '2026-07-01' AND d.delivered_on < '2026-10-01' AND p.category_id IN (2, 3)`)).map(Number);
    expect(s7).toBeGreaterThan(10);
    expect(others).toBeLessThan(3);
    // cod orders never paid have no payment row; failed card payments are retried (E3)
    expect(await num("SELECT count(*) FROM orders o WHERE o.status = 'cancelled' AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)")).toBe(518);
    expect(await num('SELECT count(*) FROM (SELECT order_id FROM payments GROUP BY 1 HAVING count(*) > 1) x')).toBe(122);
    // retention by first channel: referral > organic > social > ads (E5, E6)
    const order = (await runSandboxed(await db(), `SELECT channel FROM (SELECT c.channel, count(o.id) AS n FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled' GROUP BY c.id, c.channel) x GROUP BY 1 ORDER BY avg(n) DESC`, undefined, { schema: 'ecom' })).rows.map((r) => r[0]);
    expect(order).toEqual(['referral', 'organic', 'social', 'ads']);
    // empty cells (E4)
    expect(await num('SELECT count(*) FROM customers WHERE birth_year IS NULL')).toBe(1251);
    expect(await num("SELECT count(*) FROM orders o JOIN deliveries d ON d.order_id = o.id WHERE o.status = 'pending' OR (o.status = 'shipping') <> (d.delivered_on IS NULL)")).toBe(0);
  });
});
