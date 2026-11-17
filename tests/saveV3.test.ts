import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import v2 from './fixtures/save-v2.json?raw';
import v3 from './fixtures/save-v3.json?raw';
import { MAX_CARD_SQL, MAX_CARDS } from '../src/dashboard';
import { emptySave, loadSave, MIGRATIONS, oldSaveKey, parseSave, SAVE_KEY, serializeSave, type Known } from '../src/save';
import type { KV } from '../src/storage';

// Lane side tasks (r-1, r-2) are known ids like tickets: their drafts, graded SQL and hints survive a reload.
const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05', 'ch2-01', 'ch2-02', 'ch2-03', 'r-1', 'r-2']),
  laneIds: new Set(['r-1', 'r-2']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};

function memStore(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save v3 (Plan 5: bảng điều hành + bài tuyến)', () => {
  it('đọc save mẫu v3 nguyên vẹn', () => {
    expect(parseSave(v3, known, MIGRATIONS, 3)).toMatchObject(JSON.parse(v3)); // v4 adds byDomain (tests/saveV4.test.ts)
  });

  it('migrate v1 và v2 lên v3 (fixture giữ mãi)', () => {
    for (const raw of [v1, v2]) expect(parseSave(raw, known, MIGRATIONS, 3)).toMatchObject({ version: 3, dashboard: { cards: [], hidden: [] }, lanes: [] });
  });

  it('loadSave từ v2: giữ bản gốc ở oldSaveKey(2) rồi migrate', () => {
    const store = memStore({ [SAVE_KEY]: v2 });
    const r = loadSave(store, known, MIGRATIONS, 3);
    expect(r.warning).toBeUndefined();
    expect(r.save.version).toBe(3);
    expect(store.data[oldSaveKey(2)]).toBe(v2);
  });

  it('build cũ (v2) gặp save v3 → cất vào .bak, không ghi đè (lý do nâng version)', () => {
    const store = memStore({ [SAVE_KEY]: v3 });
    const r = loadSave(store, known, undefined, 2);
    expect(r.warning).toEqual({ kind: 'newer', version: 3 });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe(v3);
  });

  it('bỏ card hỏng và id bài tuyến lạ, giữ phần còn lại', () => {
    const ok = { id: 'c1', title: 'A', sql: 'SELECT 1', kind: 'number', col: 0, source: 'sandbox' };
    const raw = JSON.stringify({
      ...JSON.parse(v3),
      dashboard: {
        cards: [
          ok,
          { ...ok, title: 'trùng id' },
          { ...ok, id: 'c2', kind: 'pie' },
          { ...ok, id: 'c3', sql: 'x'.repeat(MAX_CARD_SQL + 1) },
          { ...ok, id: 'c4', title: '' },
          { ...ok, id: 'c5', col: -1 },
          { ...ok, id: 'c6', source: undefined },
          { ...ok, id: 'c7', slow: 'yes', kind: 'line' },
          'not a card',
        ],
        hidden: ['a', 'a', 7, ''],
      },
      lanes: ['r-1', 'gone', 'r-1', 3, 'ch1-01'], // a story id is not a lane task
    });
    const s = parseSave(raw, known);
    expect(s.dashboard.cards.map((c) => c.id)).toEqual(['c1', 'c7']);
    expect(s.dashboard.cards[1]).not.toHaveProperty('slow');
    expect(s.dashboard.hidden).toEqual(['a']);
    expect(s.lanes).toEqual(['r-1']);
  });

  it(`tối đa ${MAX_CARDS} card; dashboard không phải object → rỗng`, () => {
    const cards = Array.from({ length: MAX_CARDS + 5 }, (_, i) => ({ id: `c${i}`, title: 'T', sql: 'SELECT 1', kind: 'table', source: 'sandbox' }));
    expect(parseSave(JSON.stringify({ ...emptySave(), dashboard: { cards } }), known).dashboard.cards).toHaveLength(MAX_CARDS);
    expect(parseSave(JSON.stringify({ ...emptySave(), dashboard: [] }), known).dashboard).toEqual({ cards: [], hidden: [] });
  });

  it('Xuất → Nhập giữ card, ô ẩn và bài tuyến đã xong', () => {
    const save = parseSave(v3, known);
    expect(parseSave(serializeSave(save), known)).toEqual(save);
  });
});
