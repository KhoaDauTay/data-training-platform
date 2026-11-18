import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../src/db/run';
import { cellKey, compareResults, grade } from '../src/grader';
import { runner, seededDb } from './helpers';

const res = (rows: unknown[][], columns = rows[0]?.map((_, i) => `c${i}`) ?? ['c0']): QueryResult => ({
  columns, types: columns.map(() => 0), rows,
});

describe('cellKey', () => {
  it('số: int, float, chuỗi numeric đều làm tròn 2 chữ số', () => {
    expect(cellKey(3)).toBe('3.00');
    expect(cellKey('3.004')).toBe('3.00');
    expect(cellKey(18827.3127)).toBe('18827.31');
    expect(cellKey(-0.001)).toBe('0.00');
  });
  it('NULL, ngày, chữ', () => {
    expect(cellKey(null)).toBe('∅');
    expect(cellKey(new Date('2026-10-31T00:00:00Z'))).toBe('2026-10-31');
    expect(cellKey('CQ2610')).toBe('CQ2610');
  });
  it('ngày: nửa đêm UTC (date) và nửa đêm giờ máy (timestamp) cùng khóa; thời điểm khác vẫn khác', () => {
    expect(cellKey(new Date(2026, 9, 1))).toBe('2026-10-01'); // local midnight, how PGlite reads a timestamp
    expect(cellKey(new Date(Date.UTC(2026, 9, 1)))).toBe('2026-10-01');
    expect(cellKey(new Date(2026, 9, 1, 8, 30))).not.toBe(cellKey(new Date(2026, 9, 1)));
    expect(cellKey(new Date(Date.UTC(2026, 9, 1, 0, 0, 1)))).not.toBe(cellKey(new Date(Date.UTC(2026, 9, 1, 0, 0, 2))));
  });
  it("trên PGlite: date_trunc('month', timestamp) khớp cùng tháng kiểu date", async () => {
    const run = await runner();
    const ts = await run("SELECT date_trunc('month', TIMESTAMP '2026-10-15 13:45:00')");
    const d = await run("SELECT DATE '2026-10-01'");
    expect(compareResults(d, ts, false)).toEqual({ ok: true });
    expect(compareResults(d, await run("SELECT TIMESTAMP '2026-10-01 08:30:00'"), false).ok).toBe(false); // not 07:00: in UTC+7 that is UTC midnight, keyed as a day (cellKey has no column types)
  });
});

describe('compareResults', () => {
  const exp = res([[1, 'a'], [2, 'b']]);
  it('khớp khi không xét thứ tự', () => {
    expect(compareResults(exp, res([[2, 'b'], [1, 'a']]), false)).toEqual({ ok: true });
  });
  it('bỏ qua tên cột', () => {
    expect(compareResults(exp, res([[1, 'a'], [2, 'b']], ['x', 'y']), false)).toEqual({ ok: true });
  });
  it('sai thứ tự khi ordered', () => {
    expect(compareResults(exp, res([[2, 'b'], [1, 'a']]), true)).toEqual({ ok: false, reason: 'order' });
  });
  it('sai số cột', () => {
    expect(compareResults(exp, res([[1], [2]]), false)).toEqual({ ok: false, reason: 'columns', expected: 2, actual: 1 });
  });
  it('thiếu dòng', () => {
    // toMatchObject since L84 added extraRows/missingRows/row counts to the 'rows' result (tested below)
    expect(compareResults(exp, res([[1, 'a']]), false)).toMatchObject({ ok: false, reason: 'rows', missing: 1, extra: 0, sample: undefined });
  });
  it('giá trị lệch: báo dòng của người chơi', () => {
    expect(compareResults(exp, res([[1, 'a'], [2, 'z']]), false)).toMatchObject({ ok: false, reason: 'rows', missing: 1, extra: 1, sample: [2, 'z'] });
  });
  it('dòng trùng được đếm đúng', () => {
    expect(compareResults(res([[1], [1]]), res([[1]]), false)).toMatchObject({ reason: 'rows', missing: 1, extra: 0 });
  });
});

describe('compareResults: chi tiết cho Thử ngay và drill (L84)', () => {
  const carriers = res([['OSL', 'Oceanic Star Line'], ['VNA', 'Vietnam Air'], ['FDX', 'FedEx']]);
  it('dòng thừa và dòng thiếu (tối đa 3), số dòng hai bên; sample vẫn là dòng của người chơi', () => {
    const actual = res([[1, 'a'], [9, 'x'], [8, 'y'], [7, 'z'], [6, 'w']]);
    const r = compareResults(exp4(), actual, false);
    expect(r).toMatchObject({ reason: 'rows', missing: 3, extra: 4, expectedRows: 4, actualRows: 5, extraRows: [[9, 'x'], [8, 'y'], [7, 'z']], missingRows: [[2, 'b'], [3, 'c'], [4, 'd']] });
    expect(r.ok === false && r.reason === 'rows' && r.sample).toBe(actual.rows[1]);
    expect(r).not.toHaveProperty('cols'); // row counts differ: no column analysis
  });
  it('dòng trùng: chỉ phần thiếu', () => {
    expect(compareResults(res([[1], [1], [2]]), res([[1], [2]]), false)).toMatchObject({ missingRows: [[1]], extraRows: [] });
  });
  it('cột 1 của người chơi là cột 2 của đáp án, cột 2 không khớp gì (lời than của user)', () => {
    const actual = res([['Oceanic Star Line', 'SEA'], ['Vietnam Air', 'AIR'], ['FedEx', 'AIR']]);
    expect(compareResults(carriers, actual, false)).toMatchObject({ cols: { mismatched: [0, 1], moved: [{ from: 0, to: 1 }] } });
  });
  it('hai cột đổi chỗ: moved theo cả hai chiều', () => {
    const actual = res(carriers.rows.map(([a, b]) => [b, a]));
    expect(compareResults(carriers, actual, false)).toMatchObject({ cols: { mismatched: [0, 1], moved: [{ from: 0, to: 1 }, { from: 1, to: 0 }] } });
  });
  it('một cột sai, cột kia đúng', () => {
    const actual = res([['OSL', 'x'], ['VNA', 'Vietnam Air'], ['FDX', 'FedEx']]);
    expect(compareResults(carriers, actual, false)).toMatchObject({ cols: { mismatched: [1], moved: [] } });
  });
  it('mọi cột đủ giá trị nhưng ghép dòng sai: mismatched rỗng', () => {
    const actual = res([['OSL', 'Vietnam Air'], ['VNA', 'Oceanic Star Line'], ['FDX', 'FedEx']]);
    expect(compareResults(carriers, actual, false)).toMatchObject({ reason: 'rows', cols: { mismatched: [], moved: [] } });
  });
});

function exp4(): QueryResult {
  return res([[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd']]);
}

describe('grade trên DB thật', () => {
  const sol = "SELECT code, name FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'";

  it('alias và thứ tự cột-dòng khác vẫn đúng', async () => {
    const run = await runner();
    const r = await grade(run, sol, "SELECT p.code AS ma, p.name AS ten FROM ports p WHERE kind = 'SEAPORT' AND region = 'Europe' ORDER BY name", false);
    expect(r).toEqual({ ok: true });
  });

  it('ROUND(AVG) khớp AVG không làm tròn', async () => {
    const run = await runner();
    const r = await grade(run, 'SELECT AVG(gross_weight_kg) FROM shipments', 'SELECT ROUND(AVG(gross_weight_kg), 2) FROM shipments', false);
    expect(r).toEqual({ ok: true });
  });

  it('lỗi SQL của người chơi → reason error', async () => {
    const run = await runner();
    const r = await grade(run, sol, 'SELEC 1', false);
    expect(r).toMatchObject({ ok: false, reason: 'error' });
  });

  it('lỗi SQL khi Nộp kèm error (position, code) để editor gạch lỗi', async () => {
    const run = await runner();
    const r = await grade(run, sol, 'SELECT cde FROM ports', false);
    expect(r).toMatchObject({
      ok: false, reason: 'error', message: 'column "cde" does not exist',
      error: { message: 'column "cde" does not exist', position: 8, code: '42703' },
    });
  });

  it('lỗi không phải SQL → reason error, không có error', async () => {
    const r = await grade(() => Promise.reject(new Error('worker chết')), sol, 'SELECT 1', false);
    expect(r).toEqual({ ok: false, reason: 'error', message: 'worker chết' });
  });

  it('nhiều câu lệnh bị từ chối', async () => {
    const run = await runner();
    const r = await grade(run, sol, 'SELECT 1; SELECT 2', false);
    expect(r).toMatchObject({ ok: false, reason: 'error' });
  });

  it('UPDATE thành công của người chơi vẫn bị rollback', async () => {
    const run = await runner();
    // Câu lệnh chạy được (không lỗi FK), nên grader báo sai số cột chứ không phải lỗi SQL.
    expect(await grade(run, sol, "UPDATE ports SET name = 'x'", false)).toMatchObject({ ok: false, reason: 'columns' });
    const db = await seededDb();
    expect((await db.query<{ n: number }>("SELECT count(*) AS n FROM ports WHERE name = 'x'")).rows[0].n).toBe(0);
  });

  it('Solution lỗi thì throw (bug nội dung)', async () => {
    const run = await runner();
    await expect(grade(run, 'SELEC broken', 'SELECT 1', false)).rejects.toThrow();
  });
});

describe('precision (L4, v12.0 D10-12)', () => {
  it('không có precision: như cũ, làm tròn 2 chữ số rồi so', () => {
    expect(compareResults(res([['1235']]), res([['1234.996']]), false).ok).toBe(true);
  });
  it('precision 0: số chưa làm tròn tới đồng là sai; đã làm tròn (kể cả 1235.00) là đúng', () => {
    expect(compareResults(res([['1235']]), res([['1234.6']]), false, 0).ok).toBe(false);
    expect(compareResults(res([['1235']]), res([['1235.00']]), false, 0).ok).toBe(true);
    expect(compareResults(res([[1235]]), res([['1235']]), false, 0).ok).toBe(true);
  });
  it('precision 2: số còn chữ số thứ ba là sai', () => {
    expect(compareResults(res([['0.33']]), res([['0.333']]), false, 2).ok).toBe(false);
    expect(compareResults(res([['0.33']]), res([['0.330']]), false, 2).ok).toBe(true);
  });
  it('-0 sau khi làm tròn vẫn bằng 0', () => {
    expect(cellKey('-0.001')).toBe(cellKey(0));
    expect(cellKey('-0.4', 0)).not.toBe(cellKey(0, 0)); // strict: -0.4 is not rounded
    expect(cellKey('-0', 0)).toBe(cellKey(0, 0));
  });
  it('grade() chuyển precision cho compareResults', async () => {
    const run = await runner();
    expect((await grade(run, 'SELECT 1235', 'SELECT 1234.996', false)).ok).toBe(true);
    expect((await grade(run, 'SELECT 1235', 'SELECT 1234.996', false, 0)).ok).toBe(false);
  });
});
