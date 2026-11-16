import { describe, expect, it } from 'vitest';
import { HISTORY_KEY, HISTORY_MAX, loadHistory, pushHistory, type History } from '../src/history';

const entry = (sql: string) => ({ sql, at: 1, ok: true, rows: 1 });

describe('lịch sử query', () => {
  it('mới nhất ở đầu, bỏ qua khi trùng mục mới nhất', () => {
    let h: History = {};
    h = pushHistory(h, 'ch1-01', entry('SELECT 1'));
    h = pushHistory(h, 'ch1-01', entry('SELECT 2'));
    h = pushHistory(h, 'ch1-01', entry('SELECT 2'));
    expect(h['ch1-01'].map((e) => e.sql)).toEqual(['SELECT 2', 'SELECT 1']);
  });

  it(`giữ tối đa ${HISTORY_MAX} mục mỗi ticket, bỏ SQL quá dài`, () => {
    let h: History = {};
    for (let i = 0; i < 20; i++) h = pushHistory(h, 'ch1-01', entry(`SELECT ${i}`));
    expect(h['ch1-01']).toHaveLength(HISTORY_MAX);
    expect(h['ch1-01'][0].sql).toBe('SELECT 19');
    expect(pushHistory(h, 'ch1-01', entry('x'.repeat(2001)))).toBe(h);
  });

  it('JSON hỏng hoặc storage lỗi → {}', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    expect(loadHistory({ getItem: () => '{oops', setItem: () => {} })).toEqual({});
    expect(loadHistory({ getItem: blocked, setItem: () => {} })).toEqual({});
    expect(loadHistory(undefined)).toEqual({});
    expect(loadHistory({ getItem: (k) => (k === HISTORY_KEY ? '{"a":[]}' : null), setItem: () => {} })).toEqual({ a: [] });
  });
});
