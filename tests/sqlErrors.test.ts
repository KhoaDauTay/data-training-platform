import { describe, expect, it } from 'vitest';
import { sqlErrorInfo, type SqlErrorInfo } from '../src/db/run';
import { explainError } from '../src/ui/sqlErrors';
import { runner } from './helpers';
import { mascotOf } from '../src/ui/feedback';
import { DbRestartError, QueryTimeoutError } from '../src/db/client';

// Real PGlite errors: if a new PGlite build changes a message or SQLSTATE, this fails here, not in front of a player.
const CASES: [string, string][] = [
  [`SELECT code FROM ports WHERE region = "Europe"`, 'sqlerr.doubleQuote'],
  ['SELECT cde FROM ports', 'sqlerr.42703'],
  ['SELECT code FROM portz', 'sqlerr.42P01'],
  // Plan 7 (v6 §4.4-7): an old card or draft that still says public.ports gets told where the tables went.
  ['SELECT code FROM public.ports', 'sqlerr.publicPrefix'],
  ['SELECT code FROM ports WHERE', 'sqlerr.42601'],
  ['SELECT customer_id FROM shipments WHERE count(*) > 1 GROUP BY customer_id', 'sqlerr.aggWhere'],
  ['SELECT customer_id, ref FROM shipments GROUP BY customer_id', 'sqlerr.42803'],
  // Same 42803 code: a window inside an aggregate must not get the GROUP BY note.
  ['SELECT SUM(ROW_NUMBER() OVER ()) FROM shipments', 'sqlerr.aggWindow'],
  ['SELECT id FROM shipments s JOIN customers c ON c.id = s.customer_id', 'sqlerr.42702'],
  ['SELECT x.ref FROM shipments s', 'sqlerr.missingFrom'],
  [`SELECT ref FROM shipments WHERE eta = '31/10/2026'`, 'sqlerr.date'],
  [`SELECT ref FROM shipments WHERE eta = 'abc'`, 'sqlerr.date'],
  ['SELECT ref FROM shipments WHERE eta = 5', 'sqlerr.42883'],
  ['SELECT 1; SELECT 2', 'sqlerr.multi'],
  ['SELECT 1/0', 'sqlerr.22012'],
  ['SELECT date_trunc(booking_date) FROM shipments', 'sqlerr.dateTrunc'],
  ['SELECT date_trunc(MONTH, booking_date) FROM shipments', 'sqlerr.unitQuote'],
  ['SELECT round(ref) FROM shipments', 'sqlerr.fnArgs'],
  [`SELECT CASE WHEN eta < '2026-10-31' THEN ref ELSE 0 END FROM shipments`, 'sqlerr.42804'],
  [`SELECT CASE WHEN eta < '2026-10-31' THEN 1 ELSE 'late' END FROM shipments`, 'sqlerr.22P02'],
  ['SELECT q.quote_no, (SELECT r.buy_usd FROM rate_contracts r WHERE r.pod = q.pod) FROM quotations q', 'sqlerr.21000'],
  ['SELECT ref FROM shipments WHERE ROW_NUMBER() OVER (ORDER BY ref) <= 3', 'sqlerr.windowWhere'],
  ['SELECT customer_id FROM shipments GROUP BY RANK() OVER (ORDER BY customer_id)', 'sqlerr.windowWhere'],
  ['SELECT customer_id FROM shipments GROUP BY customer_id HAVING RANK() OVER (ORDER BY customer_id) = 1', 'sqlerr.windowHaving'],
  // Same 42P20 code, but a frame mistake: must not get the "filter in an outer query" note.
  ['SELECT SUM(gross_weight_kg) OVER (ORDER BY eta, ref RANGE BETWEEN 1 PRECEDING AND CURRENT ROW) FROM shipments', 'sqlerr.windowFrame'],
  ['SELECT SUM(gross_weight_kg) OVER (ORDER BY eta ROWS BETWEEN CURRENT ROW AND 1 PRECEDING) FROM shipments', 'sqlerr.windowFrame'],
  ['SELECT ref, LAG(ref) FROM shipments', 'sqlerr.windowOver'],
  ['SELECT mbl_no, issue_date FROM master_bills UNION SELECT hbl_no FROM house_bills', 'sqlerr.setColumns'],
  ['SELECT id, ref FROM shipments EXCEPT SELECT shipment_id FROM invoices', 'sqlerr.setColumns'],
  ['SELECT mbl_no FROM master_bills UNION SELECT id FROM house_bills', 'sqlerr.setTypes'],
  [`SELECT DISTINCT ON (b.id) b.bill_no FROM vendor_bills b JOIN exchange_rates r ON r.currency = b.currency ORDER BY r.rate_date DESC`, 'sqlerr.distinctOn'],
  // Same SQLSTATE 42P10, different mistakes: they must not get the DISTINCT ON note.
  ['SELECT DISTINCT customer_id FROM shipments ORDER BY eta', 'sqlerr.distinctOrder'],
  ['SELECT ref FROM shipments ORDER BY 2', 'sqlerr.position'],
  ['SELECT customer_id FROM shipments GROUP BY 3', 'sqlerr.position'],
  ['SELECT ref FROM shipments WHERE customer_id IN (SELECT id, name FROM customers)', 'sqlerr.subqueryColumns'],
];

async function errorOf(sql: string): Promise<SqlErrorInfo> {
  const run = await runner();
  try {
    await run(sql);
  } catch (e) {
    return sqlErrorInfo(e)!;
  }
  throw new Error(`no error: ${sql}`);
}

describe('lỗi biết dạy', () => {
  it.each(CASES)('%s → %s', async (sql, key) => {
    expect(explainError(await errorOf(sql))).toBe(key);
  });

  it('có position để gạch chân (trừ lỗi nhiều câu lệnh)', async () => {
    expect((await errorOf('SELECT cde FROM ports')).position).toBe(8);
    expect((await errorOf('SELECT 1; SELECT 2')).position).toBeUndefined();
  });

  it('lỗi lạ thì không có giải thích', () => {
    expect(explainError({ message: 'something else', code: '99999' })).toBeUndefined();
    expect(explainError({ message: 'something else', code: '42P20' })).toBeUndefined(); // 42P20 is told apart by message only
  });
});

describe('mascotOf (V7: Boon giải thích lỗi, không linh vật khi không có gì để giải thích)', () => {
  it('lỗi Postgres có lời giải thích → Boon nghĩ; timeout/khởi động lại → Boon ối; còn lại → không', async () => {
    const run = await runner();
    const err = await run('SELECT cde FROM ports').then(() => undefined, (e: unknown) => e);
    expect(mascotOf(err)).toEqual(['boon', 'think']);
    expect(mascotOf(new QueryTimeoutError(5000))).toEqual(['boon', 'oops']);
    expect(mascotOf(new DbRestartError())).toEqual(['boon', 'oops']);
    expect(mascotOf(new Error('boom'))).toBeUndefined();
    expect(mascotOf(undefined)).toBeUndefined();
  });
});
