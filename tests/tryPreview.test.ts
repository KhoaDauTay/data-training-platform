import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { QueryResult } from '../src/db/run';
import { compareResults } from '../src/grader';
import { setLang } from '../src/i18n';
import { hasDiff, tablesIn, verdictText } from '../src/ui/tryPreview';

const res = (rows: unknown[][]): QueryResult => ({ columns: rows[0].map((_, i) => `c${i}`), types: [], rows });
const carriers = res([['OSL', 'Oceanic Star Line'], ['VNA', 'Vietnam Air'], ['FDX', 'FedEx']]);
const verdict = (actual: unknown[][], expected = carriers, ordered = false): string => {
  const r = compareResults(expected, res(actual), ordered);
  if (r.ok) throw new Error('expected a failure');
  return verdictText(r);
};

describe('verdictText (L84: một câu, không lộ giá trị đáp án)', () => {
  // setLang() also relabels static markup: a stub document is enough here (Node, no DOM)
  beforeAll(async () => {
    vi.stubGlobal('document', { querySelectorAll: () => [], documentElement: {} });
    await setLang('vi');
  });
  afterAll(() => vi.unstubAllGlobals());

  it('lời than của user: cột 1 là cột 2 của đáp án, cột 2 chưa khớp', async () => {
    const actual = [['Oceanic Star Line', 'SEA'], ['Vietnam Air', 'AIR'], ['FedEx', 'AIR']];
    expect(verdict(actual)).toBe('Cột 1 của bạn là cột 2 của đáp án, cột 2 chưa khớp.');
    await setLang('en');
    expect(verdict(actual)).toBe('Your column 1 is column 2 of the answer, column 2 does not match.');
    await setLang('vi');
  });

  it('hai cột đổi chỗ; một cột sai, cột kia đúng; ghép dòng sai', () => {
    expect(verdict(carriers.rows.map(([a, b]) => [b, a]))).toBe('Cột 1 và 2 bị đổi chỗ.');
    expect(verdict([['OSL', 'x'], ['VNA', 'Vietnam Air'], ['FDX', 'FedEx']])).toBe('Cột 2 chưa khớp, cột 1 đúng.');
    expect(verdict([['OSL', 'Vietnam Air'], ['VNA', 'Oceanic Star Line'], ['FDX', 'FedEx']])).toBe('Mỗi cột đủ giá trị nhưng các giá trị ghép thành dòng chưa đúng.');
  });

  it('khác số dòng, số cột, thứ tự', () => {
    expect(verdict([['OSL', 'Oceanic Star Line']])).toBe('Bạn có 1 dòng, đáp án có 3 dòng.');
    expect(verdict([['OSL'], ['VNA'], ['FDX']])).toBe('Bạn có 1 cột, đáp án có 2 cột.');
    // B-11 (L1130): the engine labs say "lời giải", like every other runtime there
    const r = compareResults(carriers, res([['OSL', 'Oceanic Star Line']]), false);
    expect(!r.ok && verdictText(r, true)).toBe('Bạn có 1 dòng, lời giải có 3 dòng.');
    expect(verdict([...carriers.rows].reverse(), carriers, true)).toBe('Đúng dữ liệu, nhưng thứ tự dòng chưa đúng yêu cầu.');
  });
});

describe('tablesIn', () => {
  it('chỉ tên bảng có thật, theo thứ tự xuất hiện, bỏ EXTRACT(… FROM cột)', () => {
    const known = ['orders', 'customers', 'stores'];
    expect(tablesIn('SELECT EXTRACT(year FROM ordered_at) FROM orders o JOIN customers c ON c.id = o.customer_id', known)).toEqual(['orders', 'customers']);
    expect(tablesIn('WITH x AS (SELECT 1) SELECT * FROM x', known)).toEqual([]);
  });
});

describe('hasDiff (v13 G6: Boon talks about "these two small tables" only when they show)', () => {
  const fail = (actual: unknown[][], expected = carriers, ordered = false) => {
    const r = compareResults(expected, res(actual), ordered);
    if (r.ok) throw new Error('expected a failure');
    return r;
  };
  it('rows extra or missing: the diff shows', () => {
    expect(hasDiff(fail([['OSL', 'Oceanic Star Line']]))).toBe(true);
  });
  it('wrong column count or only the order differs: no diff tables', () => {
    expect(hasDiff(fail([['OSL'], ['VNA'], ['FDX']]))).toBe(false);
    expect(hasDiff(fail([['FDX', 'FedEx'], ['VNA', 'Vietnam Air'], ['OSL', 'Oceanic Star Line']], carriers, true))).toBe(false);
  });
});
