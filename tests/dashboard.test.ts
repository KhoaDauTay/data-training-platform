import { describe, expect, it } from 'vitest';
import { cardRunner, colGone, KIND_SKILL, loadRan, markRan, RAN_KEY, ranHere, moveCard, nextCardId, PIN_MAX_MS, pinBlock, valueCols, type Card } from '../src/dashboard';
import { DbRestartError, QueryTimeoutError } from '../src/db/client';
import { runSandboxed, type QueryResult } from '../src/db/run';
import { seededDb } from './helpers';

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

  it('cột giá trị không còn trong kết quả → colGone (card hiện "cột không còn", không NaN)', () => {
    const r = res([TEXT, INT8], [['FOB', 146]]);
    expect(colGone({ ...card('a'), kind: 'number', col: 1 }, r)).toBe(false);
    expect(colGone({ ...card('a'), kind: 'number', col: 5 }, r)).toBe(true);
    expect(colGone({ ...card('a'), kind: 'bar', col: 1 }, r)).toBe(false);
    expect(colGone({ ...card('a'), kind: 'bar', col: 2 }, r)).toBe(true);
    expect(colGone({ ...card('a'), kind: 'table', col: 9 }, r)).toBe(false);
    expect(colGone({ ...card('a'), kind: 'bar', col: 2 }, res([TEXT, INT8], []))).toBe(false); // no chart: "chart.empty"
    expect(colGone({ ...card('a'), kind: 'line', col: 1 }, r)).toBe(false); // not a line any more: "chart.empty"
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

describe('chạy card (cardRunner, product-design-v3 §7)', () => {
  const ok: QueryResult = { columns: ['n'], types: [20], rows: [[1]] };
  const sqlCard = (id: string, sql: string): Card => ({ ...card(id), sql });

  it('mỗi card chạy một lần mỗi phiên, lần lượt từng card', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const run = async (sql: string) => {
      order.push(`start ${sql}`);
      if (sql === 'A') await gate;
      order.push(`end ${sql}`);
      return ok;
    };
    const cards = cardRunner(run, () => {});
    const a = cards.result(sqlCard('a', 'A'));
    const b = cards.result(sqlCard('b', 'B'));
    await Promise.resolve();
    expect(order).toEqual(['start A']); // B waits for A
    release();
    await Promise.all([a, b]);
    expect(order).toEqual(['start A', 'end A', 'start B', 'end B']);
    await cards.result(sqlCard('a', 'A'));
    expect(order.filter((x) => x === 'start A')).toHaveLength(1); // cached for the session
    cards.forget('a');
    await cards.result(sqlCard('a', 'A'));
    expect(order.filter((x) => x === 'start A')).toHaveLength(2);
    await cards.result(sqlCard('a', 'B')); // same id from an imported save, other SQL: runs its own SQL
    expect(order.filter((x) => x === 'start B')).toHaveLength(2);
  });

  it('quá giờ → chỉ card đó bị đánh dấu chậm; card bị cắt ngang do khởi động lại thì chạy lại lần sau', async () => {
    const slow: string[] = [];
    let calls = 0;
    const run = async (sql: string) => {
      calls++;
      if (sql === 'SLOW') throw new QueryTimeoutError(5000);
      if (sql === 'CUT' && calls < 4) throw new DbRestartError();
      return ok;
    };
    const cards = cardRunner(run, (id) => slow.push(id));
    await expect(cards.result(sqlCard('s', 'SLOW'))).rejects.toBeInstanceOf(QueryTimeoutError);
    await expect(cards.result(sqlCard('c', 'CUT'))).rejects.toBeInstanceOf(DbRestartError);
    await expect(cards.result(sqlCard('d', 'OK'))).resolves.toBe(ok); // the chain goes on after a failure
    expect(slow).toEqual(['s']);
    await expect(cards.result(sqlCard('c', 'CUT'))).resolves.toBe(ok); // forgotten after the restart, so it ran again
  });
});

describe('card sau khi "Dữ liệu của tôi" đổi, card chạy trên máy này', () => {
  const sqlCard = (id: string, sql: string): Card => ({ ...card(id), sql });

  it('clear(): lỗi 42P01 trước khi restore() xong không bị giữ cả phiên', async () => {
    let restored = false;
    const run = async () => {
      if (!restored) throw new Error('relation "my_csv" does not exist');
      return { columns: ['n'], types: [20], rows: [[1]] };
    };
    const cards = cardRunner(run, () => {});
    const c = sqlCard('c1', 'SELECT * FROM sandbox.my_csv');
    await expect(cards.result(c)).rejects.toThrow('does not exist');
    expect(cards.has(c)).toBe(true);
    restored = true;
    cards.clear();
    expect(cards.has(c)).toBe(false);
    await expect(cards.result(c)).resolves.toMatchObject({ rows: [[1]] });
  });

  it('cards-ran: chỉ card (id + SQL) đã chạy trên máy này; dữ liệu hỏng bị bỏ', () => {
    const data: Record<string, string> = {};
    const kv = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
    const a = sqlCard('c1', 'SELECT 1');
    expect(ranHere(a, kv)).toBe(false);
    markRan(a, kv);
    markRan(a, kv);
    expect(loadRan(kv)).toEqual([`c1
SELECT 1`]);
    expect(ranHere(a, kv)).toBe(true);
    expect(ranHere(sqlCard('c1', 'SELECT 2'), kv)).toBe(false); // an imported c1 with other SQL
    data[RAN_KEY] = '{"x":1}';
    expect(loadRan(kv)).toEqual([]);
    data[RAN_KEY] = JSON.stringify(['ok', 3, null, 'x'.repeat(5000)]);
    expect(loadRan(kv)).toEqual(['ok']);
    data[RAN_KEY] = 'not json';
    expect(loadRan(kv)).toEqual([]);
  });
});

describe('thời gian chạy trong kết quả (luật 2 s khi ghim)', () => {
  it('runSandboxed ghi ms của câu lệnh', async () => {
    const r = await runSandboxed(await seededDb(), 'SELECT count(*) FROM shipments');
    expect(Number.isInteger(r.ms)).toBe(true);
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });
});
