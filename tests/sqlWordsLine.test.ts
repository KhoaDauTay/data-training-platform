import { describe, expect, it, vi } from 'vitest';
import type { QueryResult } from '../src/db/run';
import type { LastRun } from '../src/state';
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
const { setWordsSource, wordsLine, AUTO_MS } = await import('../src/ui/sqlWordsView');

const text = (n: unknown): string => (typeof n === 'string' ? n : n && typeof n === 'object' && 'kids' in n ? (n as El).kids.map(text).join('') : '');
const result = (ms: number): QueryResult => ({ columns: ['a'], rows: [[1]], ms } as QueryResult);
const words: StepsResult = { ok: true, steps: [], ranges: {}, words: [{ k: 'select', cols: 1, star: false, aggs: [] }, { k: 'from', tables: [{ c: 'ports' }], joins: [] }] };

function setup(editor = 'SELECT a FROM ports') {
  const pending: { run: LastRun; resolve(r: StepsResult): void; reject(e: unknown): void }[] = [];
  setWordsSource((run) => new Promise((resolve, reject) => pending.push({ run, resolve, reject })));
  let sql = editor;
  const line = wordsLine(() => sql);
  return { line, pending, el: line.el as unknown as El, edit: (s: string) => { sql = s; line.draw(); } };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('dòng "SQL bằng lời" dưới editor (V19-A)', () => {
  it('mô tả lần chạy cuối, một request mỗi lần chạy, dấu "đã đổi" khi editor khác', async () => {
    const { line, pending, el, edit } = setup();
    app.lastRun = { key: '', sql: 'SELECT a FROM ports', offset: 0, result: result(3) };
    line.draw();
    expect(el.hidden).toBe(true); // waiting: nothing yet
    line.draw();
    expect(pending.length).toBe(1);
    pending[0].resolve(words);
    await flush();
    expect(el.hidden).toBe(false);
    expect(text(el)).toBe('Truy vấn này: lấy 1 cột từ ports');
    edit('SELECT b FROM ports');
    expect(text(el)).toMatch(/^đã đổiTruy vấn này/);
    expect(pending.length).toBe(1); // an edit never asks again
  });

  it('lỗi, index lab (lastRun trống): không có dòng, không request', () => {
    const { line, pending, el } = setup();
    app.lastRun = { key: '', sql: 'SELECT x', offset: 0, error: new Error('x') };
    line.draw();
    app.lastRun = undefined;
    line.draw();
    expect(el.hidden).toBe(true);
    expect(pending.length).toBe(0);
  });

  it('truy vấn chậm: một nút, chỉ đọc khi bấm', async () => {
    const { line, pending, el } = setup();
    app.lastRun = { key: '', sql: 'SELECT a FROM ports', offset: 0, result: result(AUTO_MS + 1) };
    line.draw();
    expect(pending.length).toBe(0);
    const btn = el.kids[0] as El;
    expect(btn.tag).toBe('button');
    (btn.attrs.onclick as () => void)();
    expect(pending.length).toBe(1);
    pending[0].resolve(words);
    await flush();
    expect(text(el)).toContain('lấy 1 cột');
  });

  it('kết quả về muộn của lần chạy cũ bị bỏ; câu không hỗ trợ hiện một dòng, request hỏng thì ẩn', async () => {
    const { line, pending, el } = setup('WITH x AS (SELECT 1) SELECT * FROM x');
    app.lastRun = { key: '', sql: 'SELECT a FROM ports', offset: 0, result: result(1) };
    line.draw();
    app.lastRun = { key: '', sql: 'WITH x AS (SELECT 1) SELECT * FROM x', offset: 0, result: result(1) };
    line.draw();
    pending[0].resolve(words);
    await flush();
    expect(el.hidden).toBe(true);
    pending[1].resolve({ ok: false, reason: 'withUnion' });
    await flush();
    expect(text(el)).toBe('Chưa mô tả được câu này bằng lời.');
    app.lastRun = { key: '', sql: 'SELECT 2', offset: 0, result: result(1) };
    line.draw();
    pending[2].reject(new Error('restart'));
    await flush();
    expect(el.hidden).toBe(true);
  });
});
