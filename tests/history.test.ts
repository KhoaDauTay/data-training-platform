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

describe('loadHistory với dữ liệu hỏng', () => {
  const load = (raw: string) => loadHistory({ getItem: (k) => (k === HISTORY_KEY ? raw : null), setItem: () => {} });

  it('bỏ ticket có giá trị không phải mảng', () => {
    expect(load('{"a":"x","b":{"sql":"SELECT 1"},"c":null,"d":[]}')).toEqual({ d: [] });
  });

  it('bỏ mục sai dạng, giữ mục đúng', () => {
    const good = { sql: 'SELECT 1', at: 5, ok: true, rows: 2 };
    const noRows = { sql: 'SELECT 2', at: 6, ok: false };
    const raw = JSON.stringify({ a: [good, null, 'x', { sql: 1, at: 1, ok: true }, { sql: 'S', at: 'x', ok: true }, { sql: 'S', at: 1, ok: 'yes' }, { sql: 'S', at: 1, ok: true, rows: 'many' }, noRows] });
    expect(load(raw)).toEqual({ a: [good, noRows] });
  });

  it('cắt còn HISTORY_MAX mục', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry(`SELECT ${i}`));
    expect(load(JSON.stringify({ a: many })).a).toHaveLength(HISTORY_MAX);
  });

  it('mảng hoặc giá trị nguyên thủy ở gốc → {}', () => {
    expect(load('[1,2]')).toEqual({});
    expect(load('42')).toEqual({});
  });
});
