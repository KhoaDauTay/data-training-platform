import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import v2 from './fixtures/save-v2.json?raw';
import { loadTickets } from '../src/content';
import { resumeStep } from '../src/overview';
import { emptySave, loadSave, NewerSaveError, oldSaveKey, parseSave, SANDBOX_DRAFT_MAX, SAVE_KEY, serializeSave, writeSave, type Known } from '../src/save';
import type { KV } from '../src/storage';

const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05']),
  laneIds: new Set(),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};

function memStore(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save v2', () => {
  it('emptySave có đủ trường v2 và giữ graded', () => {
    expect(emptySave()).toMatchObject({ version: 3, graded: {}, review: {}, practice: { solved: 0, weak: 0 }, sandboxDraft: '', bossStep: {} });
  });

  it('đọc save mẫu v2 nguyên vẹn (Plan 5: migrate lên v3, thêm trường v3 rỗng)', () => {
    expect(parseSave(v2, known)).toEqual({ ...JSON.parse(v2), version: 3, dashboard: { cards: [], hidden: [] }, lanes: [] });
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
        order_by: { box: 1, due: '2026-13-45' },
      },
      practice: { solved: -1, weak: 2.5 },
      sandboxDraft: 'x'.repeat(SANDBOX_DRAFT_MAX + 10),
      bossStep: { 'ch1-05': 1, gone: 1, 'ch1-04': -1 },
    });
    const s = parseSave(raw, known);
    expect(s.review).toEqual({ select: { box: 2, due: '2026-11-20' } });
    expect(s.practice).toEqual({ solved: 0, weak: 0 });
    expect(s.sandboxDraft).toHaveLength(SANDBOX_DRAFT_MAX);
    expect(s.bossStep).toEqual({ 'ch1-05': 1 });
  });

  it('từ chối save v4', () => {
    expect(() => parseSave(JSON.stringify({ version: 4 }), known)).toThrow(NewerSaveError);
  });

  it('loadSave từ v1 bằng MIGRATIONS thật: giữ bản gốc ở oldSaveKey(1), migrate lên v3', () => {
    const store = memStore({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known);
    expect(r.warning).toBeUndefined();
    expect(r.save).toMatchObject({ version: 3, completed: ['ch1-01', 'ch1-02'], review: {}, bossStep: {}, graded: {} });
    expect(store.data[oldSaveKey(1)]).toBe(v1);
  });

  it('Xuất → Nhập (round-trip) giữ review/practice/sandboxDraft/bossStep/graded', () => {
    const save = {
      ...emptySave(),
      completed: ['ch1-01'],
      graded: { 'ch1-01#0': 'SELECT * FROM ports' },
      review: { select: { box: 3, due: '2026-11-20' } },
      practice: { solved: 4, weak: 2 },
      sandboxDraft: 'SELECT 1',
      bossStep: { 'ch1-05': 1 },
    };
    expect(parseSave(serializeSave(save), known)).toEqual(save);
  });

  it('bossStep: lưu xuống storage rồi mở lại đúng bước đánh giá', () => {
    const boss = loadTickets().find((t) => t.id === 'ch1-05')!;
    const store = memStore();
    writeSave(store, { ...emptySave(), completed: ['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04'], bossStep: { 'ch1-05': 1 } });
    const { save } = loadSave(store, known);
    expect(resumeStep(save, boss)).toBe(1);
  });
});
