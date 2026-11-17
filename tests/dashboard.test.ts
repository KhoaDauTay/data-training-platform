import { describe, expect, it } from 'vitest';
import { KIND_SKILL, moveCard, nextCardId, PIN_MAX_MS, pinBlock, valueCols, type Card } from '../src/dashboard';
import type { QueryResult } from '../src/db/run';

const card = (id: string): Card => ({ id, title: id, sql: 'SELECT 1', kind: 'table', source: 'sandbox' });
const res = (types: number[], rows: unknown[][]): QueryResult => ({ columns: types.map((_, i) => `c${i}`), types, rows });
const TEXT = 25;
const INT8 = 20;
const NUM = 1700;
const DATE = 1082;

describe('card của người chơi (src/dashboard.ts)', () => {
  it('Lên/Xuống đổi chỗ với card bên cạnh; ở đầu/cuối thì giữ nguyên', () => {
    const cards = ['a', 'b', 'c'].map(card);
    expect(moveCard(cards, 1, -1).map((c) => c.id)).toEqual(['b', 'a', 'c']);
    expect(moveCard(cards, 1, 1).map((c) => c.id)).toEqual(['a', 'c', 'b']);
    expect(moveCard(cards, 0, -1)).toBe(cards);
    expect(moveCard(cards, 2, 1)).toBe(cards);
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c']); // pure
  });

  it('id mới lớn hơn mọi id cũ', () => {
    expect(nextCardId([])).toBe('c1');
    expect(nextCardId([card('c2'), card('c9'), card('x')])).toBe('c10');
  });

  it('dạng card mở theo kỹ năng (D-A3)', () => {
    expect(KIND_SKILL).toEqual({ table: 'select', number: 'aggregate', bar: 'group_by', line: 'date_bucket' });
  });

  it('cột giá trị hợp với từng dạng', () => {
    const bar = res([TEXT, INT8, NUM], [['FOB', 146, '16204.5'], ['FCA', 94, '15877.1']]);
    expect(valueCols('table', bar)).toEqual([0]);
    expect(valueCols('number', bar)).toEqual([1, 2]);
    expect(valueCols('bar', bar)).toEqual([1, 2]);
    expect(valueCols('line', bar)).toEqual([]);
    const line = res([DATE, NUM], [[new Date('2026-07-01'), '603']]);
    expect(valueCols('line', line)).toEqual([1]);
    expect(valueCols('bar', line)).toEqual([]);
    expect(valueCols('number', res([INT8], []))).toEqual([]); // no row: nothing to show
    expect(valueCols('table', res([], []))).toEqual([]);
    // More rows than a chart takes: the card shows the first ones, so it still fits.
    expect(valueCols('bar', res([TEXT, INT8], Array.from({ length: 245 }, (_, i) => [`k${i}`, i])))).toEqual([1]);
  });

  it('nút Ghim: SQL đã đổi → chạy lại trước; đủ 24 card; SQL quá dài; query quá 2 s', () => {
    const run = { sql: 'SELECT 1', ms: 3 };
    expect(pinBlock(run, ' SELECT 1 \n', 5)).toBeUndefined();
    expect(pinBlock(run, 'SELECT 2', 5)).toBe('stale');
    expect(pinBlock(run, 'SELECT 1', 24)).toBe('full');
    expect(pinBlock({ sql: `SELECT ${'1'.repeat(4000)}`, ms: 1 }, `SELECT ${'1'.repeat(4000)}`, 0)).toBe('long');
    expect(pinBlock({ sql: 'SELECT 1', ms: PIN_MAX_MS + 1 }, 'SELECT 1', 0)).toBe('slow');
    expect(pinBlock({ sql: 'SELECT 1', ms: PIN_MAX_MS }, 'SELECT 1', 0)).toBeUndefined();
  });
});
