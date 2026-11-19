import { describe, expect, it, vi } from 'vitest';
import type { QueryResult } from '../src/db/run';
import type { StepsResult } from '../src/viz/steps';

// No DOM here: h() builds plain objects, enough to read what the line shows.
interface El { tag: string; attrs: Record<string, unknown>; kids: unknown[]; hidden: boolean; replaceChildren(...c: unknown[]): void }
vi.mock('../src/ui/dom', () => ({
  h: (tag: string, attrs: Record<string, unknown> = {}, ...kids: unknown[]): El => {
    const el: El = { tag, attrs, kids, hidden: attrs.hidden === true, replaceChildren: (...c) => { el.kids = c; } };
    return el;
  },
}));

const { app } = await import('../src/state');
const { wordsLine } = await import('../src/ui/sqlWordsView');
const { WORDS_ONLY } = await import('../src/viz/stepText');

const text = (n: unknown): string => (typeof n === 'string' ? n : n && typeof n === 'object' && 'kids' in n ? (n as El).kids.map(text).join('') : '');
const result = (): QueryResult => ({ columns: ['a'], rows: [[1]], ms: 1 } as QueryResult);
const words: StepsResult = { ok: true, steps: [], ranges: {}, words: [{ k: 'select', cols: 1, star: false, aggs: [] }, { k: 'from', tables: [{ c: 'ports' }], joins: [] }] };

function setup(editor = 'SELECT a FROM ports') {
  const pending: { sql: string; resolve(r: StepsResult): void; reject(e: unknown): void }[] = [];
  const db = {
    loadParser: () => Promise.resolve(),
    steps: <T>(sql: string) => new Promise<T>((resolve, reject) => pending.push({ sql, resolve: resolve as (r: StepsResult) => void, reject })),
  };
  let sql = editor;
  let lab = false;
  const line = wordsLine(() => sql, db, () => lab);
  return { line, pending, el: line.el as unknown as El, edit: (s: string) => { sql = s; line.draw(); }, setLab: (v: boolean) => { lab = v; line.draw(); } };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('dòng "SQL bằng lời" dưới editor (V19-A)', () => {
  it('mô tả lần chạy cuối bằng request chỉ-parse, một request mỗi lần chạy, dấu "đã đổi" khi editor khác', async () => {
    const { line, pending, el, edit } = setup();
    app.lastRun = { key: '', sql: 'SELECT a FROM ports', offset: 0, result: result() };
    line.draw();
    expect(el.hidden).toBe(true); // waiting: nothing yet
    line.draw();
    await flush();
    expect(pending.map((p) => p.sql)).toEqual([`${WORDS_ONLY}SELECT a FROM ports`]);
    pending[0].resolve(words);
    await flush();
    expect(el.hidden).toBe(false);
    expect(text(el)).toBe('Truy vấn này: lấy 1 cột từ ports');
    edit('SELECT b FROM ports');
    expect(text(el)).toMatch(/^đã đổiTruy vấn này/);
    expect(pending.length).toBe(1); // an edit never asks again
  });

  it('lỗi, index lab: không có dòng, không request', async () => {
    const { line, pending, el, setLab } = setup();
    app.lastRun = { key: '', sql: 'SELECT x', offset: 0, error: new Error('x') };
    line.draw();
    app.lastRun = undefined;
    line.draw();
    await flush();
    expect(el.hidden).toBe(true);
    expect(pending.length).toBe(0);
    // a review whose next step is an index lab keeps the earlier step's run in lastRun: the line hides there
    app.lastRun = { key: '', sql: 'SELECT a FROM ports', offset: 0, result: result() };
    line.draw();
    await flush();
    pending[0].resolve(words);
    await flush();
    expect(el.hidden).toBe(false);
    setLab(true);
    expect(el.hidden).toBe(true);
  });

  it('request hỏng: ẩn và không hỏi lại cho cùng lần chạy (không vòng lặp sau restart)', async () => {
    const { line, pending, el } = setup();
    app.lastRun = { key: '', sql: 'SELECT 2', offset: 0, result: result() };
    line.draw();
    await flush();
    pending[0].reject(new Error('restart'));
    await flush();
    line.draw();
    line.draw();
    await flush();
    expect(el.hidden).toBe(true);
    expect(pending.length).toBe(1);
  });

  it('kết quả về muộn của lần chạy cũ bị bỏ; câu không hỗ trợ hiện một dòng', async () => {
    const { line, pending, el } = setup('WITH x AS (SELECT 1) SELECT * FROM x');
    app.lastRun = { key: '', sql: 'SELECT a FROM ports', offset: 0, result: result() };
    line.draw();
    app.lastRun = { key: '', sql: 'WITH x AS (SELECT 1) SELECT * FROM x', offset: 0, result: result() };
    line.draw();
    await flush();
    pending[0].resolve(words);
    await flush();
    expect(el.hidden).toBe(true);
    pending[1].resolve({ ok: false, reason: 'withUnion' });
    await flush();
    expect(text(el)).toBe('Chưa mô tả được câu này bằng lời.');
  });

  it('db giả không có steps (tests/workRace): không ném, không dòng', () => {
    const line = wordsLine(() => '', {}, () => false);
    app.lastRun = { key: '', sql: 'SELECT 1', offset: 0, result: result() };
    expect(() => line.draw()).not.toThrow();
    expect((line.el as unknown as El).hidden).toBe(true);
  });
});
