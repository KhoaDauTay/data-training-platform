import { describe, expect, it } from 'vitest';
import { niceTicks } from '../src/viz/ticks';
import { caretAt } from '../src/ui/feedback';
import { isSingleValue, typeName } from '../src/ui/resultTable';
import { dockEnd } from '../src/ui/stage';

describe('ui-ux-v7 C1: niceTicks', () => {
  it('mốc đẹp 1–2–5 × 10ⁿ phủ cả khoảng', () => {
    expect(niceTicks(0, 17034)).toEqual([0, 5000, 10000, 15000, 20000]);
    expect(niceTicks(0, 1)).toEqual([0, 0.5, 1]);
    expect(niceTicks(0, 0.03)).toEqual([0, 0.01, 0.02, 0.03]);
  });
  it('âm, 0, khoảng rất nhỏ, NaN, đảo đầu', () => {
    expect(niceTicks(-120, 80)).toEqual([-150, -100, -50, 0, 50, 100]);
    expect(niceTicks(0, 0)).toEqual([0, 1]);
    expect(niceTicks(5, 5)[0]).toBeLessThanOrEqual(5);
    expect(niceTicks(5, 5).at(-1)).toBeGreaterThanOrEqual(5);
    expect(niceTicks(1000, 1000.004).length).toBeGreaterThan(1);
    expect(niceTicks(NaN, 3)).toEqual([]);
    expect(niceTicks(0, Infinity)).toEqual([]);
    expect(niceTicks(100, 0)).toEqual(niceTicks(0, 100));
    expect(niceTicks(-0.3, 0).includes(-0)).toBe(true);
    expect(Object.is(niceTicks(-0.3, 0).at(-1), -0)).toBe(false);
  });
});

describe('ui-ux-v7 W1: dòng lỗi có dấu ^ và bảng kết quả', () => {
  it('^ đúng cột trên đúng dòng', () => {
    const sql = 'SELECT a\nFROM t\nHAVING cnt > 3';
    expect(caretAt(sql, sql.indexOf('cnt') + 1)).toEqual({ line: 'HAVING cnt > 3', caret: '       ^', col: 8 });
    expect(caretAt('SELECT x', 1)).toEqual({ line: 'SELECT x', caret: '^', col: 1 });
  });
  it('tab giữ nguyên, chữ Việt (dựng sẵn hay tổ hợp) là một cột', () => {
    const sql = "SELECT 1\n\tWHERE ten = 'Đà Nẵng' AND bad";
    const at = caretAt(sql, sql.indexOf('bad') + 1)!;
    expect(at.caret).toBe(`\t${' '.repeat("WHERE ten = 'Đà Nẵng' AND ".length)}^`);
    const nfd = "SELECT 'Nẵng'.normalize('NFD') x".replace("'Nẵng'.normalize('NFD')", `'${'Nẵng'.normalize('NFD')}'`);
    const at2 = caretAt(nfd, nfd.indexOf(' x') + 2)!;
    expect(at2.caret.length).toBe("SELECT 'Nẵng' ".length + 1);
  });
  it('vị trí ngoài câu thì không có dòng', () => {
    expect(caretAt('SELECT 1', 0)).toBeUndefined();
    expect(caretAt('SELECT 1', 99)).toBeUndefined();
  });
  it('kiểu cột dưới tên; 1 × 1 có thẻ số', () => {
    expect([20, 23, 1700, 1082, 25].map(typeName)).toEqual(['bigint', 'int', 'numeric', 'date', 'text']);
    expect(typeName(99999)).toBe('');
    expect(isSingleValue({ columns: ['count'], types: [20], rows: [[3]] })).toBe(true);
    expect(isSingleValue({ columns: ['a', 'b'], types: [20, 20], rows: [[3, 4]] })).toBe(false);
    expect(isSingleValue({ columns: ['a'], types: [20], rows: [[3], [4]] })).toBe(false);
  });
});

describe('ui-ux-v7 W2: dock thu gọn', () => {
  it('việc thường thu thành một dòng, thăng tiến giữ cả cảnh', () => {
    for (const k of ['ship', 'yard', 'customs', 'truck', 'quote', 'ledger', 'chat']) expect(dockEnd(k)).toBe('mini');
    expect(dockEnd('promotion')).toBe('full');
  });
});
