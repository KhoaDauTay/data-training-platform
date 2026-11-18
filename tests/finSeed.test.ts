// Plan 11 T1: the finance schema (src/db/fin/), seeded lazily by ensureSchema(db, 'fin'). md5 pins = product-design-v9
// §3.4 (T0 draft). Any change to an existing block re-rolls these tables and breaks the tickets; append new blocks at the
// end with their own setseed(). Hook numbers = §3.2 (H1–H11).
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { schema } from '../src/db/finSeed';
import { ensureSchema } from '../src/db/lab';
import { runSandboxed } from '../src/db/run';
import { FIN_TABLES, SCHEMAS } from '../src/domains';
import { freshDb } from './helpers';

const PINS: Record<string, string> = {
  branches: '29ea83fd3b09d4042b492af5e6d480ce',
  products: '4bdb8346cfbd8072efab7c80e527dbd3',
  customers: '883cfae002b49a040bbddb6aa3cb5a03',
  applications: '11fd57c75cb1bcb9c5a52757df1d070a',
  loans: '49a87fa31caf957dd9ff0a0c696d7062',
  schedules: '3b58631edf2395c5b7e33cd09bd4f0d2',
  repayments: 'df9c07904109d81a7ced52c49ddc32d6',
  loan_snapshots: '3a80ac28c9cd3054cd3c5a152fe7b553',
  accounts: 'ee29a1debd8f07acca52de160e9726b8',
  budgets: '907e7b22b71012356656c9272484a1d6',
  gl_entries: '1417358b46ad6985a738bdfd3c03644f',
  collection_calls: 'a180801e6b5ccf26b39d801593066ac4',
};
const hashOf = (t: string) => `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) FROM ${t} x`;

let shared: Promise<PGlite> | undefined;
const db = (): Promise<PGlite> => (shared ??= freshDb().then(async (d) => { await ensureSchema(d, 'fin'); return d; }));
const rows = async (sql: string): Promise<unknown[][]> => (await runSandboxed(await db(), sql, undefined, { schema: 'fin' })).rows;
const one = async (sql: string): Promise<number[]> => (await rows(sql))[0].map(Number);
const num = async (sql: string): Promise<number> => (await one(sql))[0];
const pct = (x: number) => Math.round(x * 10) / 10;

/** Share (%) of outstanding with dpd > 30 per branch name at one month end. */
const dpdShare = (monthEnd: string) => `SELECT b.name, 100.0 * sum(s.outstanding) FILTER (WHERE s.dpd > 30) / sum(s.outstanding)
  FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN branches b ON b.id = l.branch_id
  WHERE s.month_end = '${monthEnd}' GROUP BY b.name`;

describe('seed finance (Plan 11 T1)', () => {
  it('12 bảng = FIN_TABLES = CREATE TABLE trong schema.sql, đúng md5 ghim; ensure lần hai không làm gì', async () => {
    const created = [...schema.matchAll(/^CREATE TABLE (\w+)/gm)].map((m) => m[1]);
    expect(created).toEqual([...FIN_TABLES]);
    const d = await db();
    const names = (await d.query<{ t: string }>(`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = '${SCHEMAS.fin}' ORDER BY 1`)).rows.map((r) => r.t);
    expect(names).toEqual([...FIN_TABLES].sort());
    for (const t of FIN_TABLES) expect((await rows(hashOf(t)))[0][0], t).toBe(PINS[t]);
    await ensureSchema(d, 'fin');
    expect(await num('SELECT count(*) FROM loans')).toBe(3182);
  });

  it('không chạm Logistics; cùng DB với E-com, `customers` không tiền tố trả đúng domain', async () => {
    const d = await db();
    expect((await d.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
    expect(Number((await d.query<{ n: number }>("SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public'")).rows[0].n)).toBe(0);
    await ensureSchema(d, 'ecom');
    const count = async (schema: 'fin' | 'ecom') => Number((await runSandboxed(d, 'SELECT count(*) FROM customers', undefined, { schema })).rows[0][0]);
    expect(await count('fin')).toBe(3200);
    expect(await count('ecom')).not.toBe(3200);
    // Logistics tables stay out of reach
    await expect(runSandboxed(d, 'SELECT * FROM shipments', undefined, { schema: 'fin' })).rejects.toMatchObject({ code: '42P01' });
  });

  it('móc cốt truyện H1–H11 ở đầu seed.sql', async () => {
    // H1 Quang Ngai: 58 partner loans 2026-03..05; dpd > 30 share 4.2 → 14.2% (Jun..Oct), others ≤ 3.4% in October
    expect(await num(`SELECT count(*) FROM loans l JOIN applications a ON a.id = l.application_id
      WHERE l.branch_id = 7 AND a.channel = 'partner' AND l.disbursed_on BETWEEN '2026-03-01' AND '2026-05-31'`)).toBe(58);
    const qn: number[] = [];
    for (const m of ['2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31']) {
      qn.push(pct(Number((await rows(dpdShare(m))).find((r) => r[0] === 'Quang Ngai')![1])));
    }
    expect(qn).toEqual([4.2, 6.4, 10.0, 11.1, 14.2]);
    const oct = (await rows(dpdShare('2026-10-31'))).filter((r) => r[0] !== 'Quang Ngai').map((r) => pct(Number(r[1])));
    expect(Math.max(...oct)).toBe(3.4);
    // H2 Tet cohorts: share of the cohort's loans with dpd > 30 at its month-3 end (F4-05 step 1) 12.43% / 7.61%
    const cohort = async (m: string) => num(`SELECT round(100.0 * count(*) FILTER (WHERE s.dpd > 30) / count(*), 2)
      FROM loans l LEFT JOIN loan_snapshots s ON s.loan_id = l.id AND s.month_end = (DATE '${m}' + interval '4 months' - interval '1 day')::date
      WHERE date_trunc('month', l.disbursed_on) = '${m}'`);
    expect(await cohort('2026-01-01')).toBe(12.43);
    expect(await cohort('2026-02-01')).toBe(7.61);
    // H3 Hoi An Marketing Q3 2026: 144.8 M actual vs 90.5 M budget
    const q3 = `BETWEEN '2026-07-01' AND '2026-09-30'`;
    expect(pct(await num(`SELECT sum(amount) / 1e6 FROM gl_entries WHERE branch_id = 3 AND account_id = 5 AND posted_on ${q3}`))).toBe(144.8);
    expect(pct(await num(`SELECT sum(amount) / 1e6 FROM budgets WHERE branch_id = 3 AND account_id = 5 AND month ${q3}`))).toBe(90.5);
    // H4 scores: < 520 always rejected; October dpd > 30 loans by band 28/473, 26/781, 4/303
    expect(await num("SELECT count(*) FROM applications WHERE score < 520 AND decision <> 'rejected'")).toBe(0);
    expect(await num("SELECT min(score) FROM applications WHERE decision = 'approved'")).toBe(520);
    expect((await rows(`SELECT CASE WHEN a.score < 600 THEN 1 WHEN a.score < 700 THEN 2 ELSE 3 END AS band,
      count(*) FILTER (WHERE s.dpd > 30), count(*)
      FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id JOIN applications a ON a.id = l.application_id
      WHERE s.month_end = '2026-10-31' GROUP BY 1 ORDER BY 1`)).map((r) => r.map(Number))).toEqual([[1, 28, 473], [2, 26, 781], [3, 4, 303]]);
    // H5 no applications on Sundays or 2026-02-14..22
    expect(await num("SELECT count(*) FROM applications WHERE extract(dow FROM applied_on) = 0 OR applied_on BETWEEN '2026-02-14' AND '2026-02-22'")).toBe(0);
    // H6 17.8% undeclared income
    expect(pct(await num('SELECT 100.0 * count(*) FILTER (WHERE monthly_income IS NULL) / count(*) FROM customers'))).toBe(17.8);
    // H7 October: 58 loans dpd > 30; 24 of them without a call that month, 21 at Quang Ngai
    expect(await one(`SELECT count(*), count(*) FILTER (WHERE l.branch_id = 7) FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id
      WHERE s.month_end = '2026-10-31' AND s.dpd > 30 AND NOT EXISTS (SELECT 1 FROM collection_calls c
        WHERE c.loan_id = s.loan_id AND c.called_on BETWEEN '2026-10-01' AND '2026-10-31')`)).toEqual([24, 21]);
    expect(await num("SELECT count(*) FROM loan_snapshots WHERE month_end = '2026-10-31' AND dpd > 30")).toBe(58);
    // H8 IT billed only in a quarter's last month; Other Opex has actuals and no budget
    expect(await num("SELECT count(*) FROM gl_entries WHERE account_id = 6 AND extract(month FROM posted_on)::int % 3 <> 0")).toBe(0);
    expect(await num('SELECT count(*) FROM budgets WHERE account_id = 9')).toBe(0);
    expect(await num('SELECT count(DISTINCT branch_id) FROM gl_entries WHERE account_id = 9')).toBe(8);
    // H9 late share by method: auto_debit lowest, cash highest
    const late = (await rows(`SELECT r.method FROM repayments r JOIN schedules s ON s.id = r.schedule_id
      GROUP BY 1 ORDER BY avg((r.paid_on > s.due_on)::int)`)).map((r) => r[0]);
    expect(late).toEqual(['auto_debit', 'ewallet', 'bank_transfer', 'cash']);
    // H10 78 written off, no snapshot on or after the write-off date
    expect(await num("SELECT count(*) FROM loans WHERE status = 'written_off'")).toBe(78);
    expect(await num(`SELECT count(*) FROM loan_snapshots s JOIN loans l ON l.id = s.loan_id
      WHERE l.status = 'written_off' AND s.month_end >= l.closed_on`)).toBe(0);
    // H11 Motorbike largest average principal, Salary Advance smallest
    const byAvg = (await rows('SELECT p.name FROM loans l JOIN products p ON p.id = l.product_id GROUP BY 1 ORDER BY avg(l.principal) DESC')).map((r) => r[0]);
    expect(byAvg).toEqual(['Motorbike Instalment', 'Cash Loan', 'Phone Instalment', 'Appliance Instalment', 'Salary Advance']);
  });
});
