import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SqlError } from '../src/db/run';
import { setLang } from '../src/i18n';
import { lineAt, runSummary } from '../src/ui/feedback';

describe('A1 (v12.0): một câu cho screen reader sau khi Chạy', () => {
  // setLang() also relabels static markup: a stub document is enough here (Node, no DOM)
  beforeAll(() => vi.stubGlobal('document', { querySelectorAll: () => [], documentElement: {} }));
  afterAll(() => vi.unstubAllGlobals());
  it('lineAt: dòng của ký tự thứ pos (1-based)', () => {
    expect(lineAt('SELECT 1', 3)).toBe(1);
    expect(lineAt('SELECT\n  x\nFROM t', 10)).toBe(2);
    expect(lineAt('a\nb', 3)).toBe(2);
  });
  it('kết quả: số dòng và số cột; lỗi: dòng của lỗi trong editor (cộng offset của vùng chọn)', async () => {
    await setLang('vi');
    expect(runSummary({ offset: 0, result: { columns: ['a', 'b', 'c'], types: [0, 0, 0], rows: [[1, 2, 3], [4, 5, 6]] } }, '')).toBe('Chạy xong: 2 dòng, 3 cột.');
    const doc = 'SELECT 1;\nSELECT nope FROM ports';
    const err = new SqlError({ message: 'column "nope" does not exist', position: 8 });
    expect(runSummary({ offset: 10, error: err }, doc)).toBe('Truy vấn lỗi ở dòng 2.');
    expect(runSummary({ offset: 0, error: new Error('x') }, doc)).toBe('Truy vấn lỗi.');
  });
  it('EN: số ít / số nhiều', async () => {
    await setLang('en');
    expect(runSummary({ offset: 0, result: { columns: ['a'], types: [0], rows: [[1]] } }, '')).toBe('Run finished: 1 row, 1 column.');
    await setLang('vi');
  });
});
