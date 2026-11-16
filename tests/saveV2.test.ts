import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import v2 from './fixtures/save-v2.json?raw';
import { emptySave, loadSave, NewerSaveError, oldSaveKey, parseSave, SANDBOX_DRAFT_MAX, SAVE_KEY, type Known } from '../src/save';
import type { KV } from '../src/storage';

const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};

function memStore(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save v2', () => {
  it('emptySave có đủ trường v2 và giữ graded', () => {
    expect(emptySave()).toMatchObject({ version: 2, graded: {}, review: {}, practice: { solved: 0, failed: 0 }, sandboxDraft: '', bossStep: {} });
  });

  it('đọc save mẫu v2 nguyên vẹn', () => {
    expect(parseSave(v2, known)).toEqual(JSON.parse(v2));
  });

  it('migrate v1 → v2: giữ dữ liệu v1, thêm trường v2 rỗng', () => {
    expect(parseSave(v1, known)).toEqual({
      ...emptySave(),
      completed: ['ch1-01', 'ch1-02'],
      xp: 350,
      hintsUsed: { 'ch1-02': 1 },
      drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' },
    });
  });

  it('bỏ giá trị v2 sai kiểu hoặc không còn tồn tại', () => {
    const raw = JSON.stringify({
      version: 2, completed: [], xp: 0, hintsUsed: {}, drafts: {}, graded: {},
      review: {
        select: { box: 2, due: '2026-11-20' },
        gone: { box: 1, due: '2026-11-20' },
        where: { box: 6, due: '2026-11-20' },
        limit: { box: 1, due: '20/11/2026' },
      },
      practice: { solved: -1, failed: 2.5 },
      sandboxDraft: 'x'.repeat(SANDBOX_DRAFT_MAX + 10),
      bossStep: { 'ch1-05': 1, gone: 1, 'ch1-04': -1 },
    });
    const s = parseSave(raw, known);
    expect(s.review).toEqual({ select: { box: 2, due: '2026-11-20' } });
    expect(s.practice).toEqual({ solved: 0, failed: 0 });
    expect(s.sandboxDraft).toHaveLength(SANDBOX_DRAFT_MAX);
    expect(s.bossStep).toEqual({ 'ch1-05': 1 });
  });

  it('từ chối save v3', () => {
    expect(() => parseSave(JSON.stringify({ version: 3 }), known)).toThrow(NewerSaveError);
  });

  it('loadSave từ v1 bằng MIGRATIONS thật: giữ bản gốc ở oldSaveKey(1), migrate lên v2', () => {
    const store = memStore({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known);
    expect(r.warning).toBeUndefined();
    expect(r.save).toMatchObject({ version: 2, completed: ['ch1-01', 'ch1-02'], review: {}, bossStep: {}, graded: {} });
    expect(store.data[oldSaveKey(1)]).toBe(v1);
  });
});
