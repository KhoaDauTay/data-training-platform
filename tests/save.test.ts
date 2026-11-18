import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import {
  emptySave, InvalidSaveError, loadSave, NewerSaveError, oldSaveKey, parseSave, SAVE_KEY, SAVE_VERSION, serializeSave, writeSave,
  type Known, type Migration,
} from '../src/save';
import type { KV } from '../src/storage';

const known: Known = { ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03']), laneIds: new Set(), skills: new Set(['select', 'where']) };

function memoryStorage(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('parseSave', () => {
  it('round-trip', () => {
    const s = { ...emptySave(), completed: ['ch1-01'], xp: 100, hintsUsed: { 'ch1-01': 2 }, drafts: { 'ch1-02#0': 'SELECT 1' }, graded: { 'ch1-01#0': 'SELECT 2' } };
    expect(parseSave(serializeSave(s), known)).toEqual(s);
  });

  it('đọc được save mẫu v1', () => {
    expect(parseSave(v1, known)).toEqual({
      ...emptySave(), completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' },
    });
  });

  it('bỏ ticket không còn tồn tại và giá trị sai kiểu', () => {
    const raw = JSON.stringify({ version: 1, completed: ['ch1-01', 'gone', 7], xp: -5, hintsUsed: { gone: 1, 'ch1-01': 'x' }, drafts: { 'gone#0': 'x' }, graded: { 'gone#0': 'x', 'ch1-01#0': 3 } });
    expect(parseSave(raw, known)).toEqual({ ...emptySave(), completed: ['ch1-01'] });
  });

  it('save mới hơn → NewerSaveError mang version, không kèm chữ', () => {
    let err: unknown;
    try {
      parseSave(JSON.stringify({ version: 99 }), known);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(NewerSaveError);
    expect((err as NewerSaveError).version).toBe(99);
    expect((err as Error).message).toBe('');
  });

  it('JSON hỏng, không phải object, version sai → InvalidSaveError', () => {
    for (const raw of ['{"version": 1, "compl', 'null', '[]', '"x"', '{"version": 0}', '{"version": "abc"}']) {
      expect(() => parseSave(raw, known), raw).toThrow(InvalidSaveError);
    }
  });

  it('migration chạy tuần tự tới version đích; thiếu migration → InvalidSaveError', () => {
    const migrations: Record<number, Migration> = { 1: (d) => ({ ...d, xp: Number(d.xp) + 1 }) };
    expect(parseSave(v1, known, migrations, 2)).toMatchObject({ version: 2, xp: 351, completed: ['ch1-01', 'ch1-02'] });
    expect(() => parseSave(v1, known, {}, 2)).toThrow(InvalidSaveError);
  });
});

describe('loadSave', () => {
  it('không có save → save rỗng, không cảnh báo', () => {
    expect(loadSave(memoryStorage(), known)).toEqual({ save: emptySave() });
    expect(loadSave(undefined, known)).toEqual({ save: emptySave() });
  });

  it('storage chặn đọc → save rỗng, không throw', () => {
    const blocked: KV = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
    expect(loadSave(blocked, known)).toEqual({ save: emptySave() });
  });

  it('save hỏng → bắt đầu mới, giữ bản .bak, cảnh báo corrupt', () => {
    const store = memoryStorage({ [SAVE_KEY]: '{"version": 1, "compl' });
    expect(loadSave(store, known)).toEqual({ save: emptySave(), warning: { kind: 'corrupt' } });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe('{"version": 1, "compl');
  });

  it('save mới hơn → cảnh báo newer kèm version, giữ bản .bak', () => {
    const raw = JSON.stringify({ version: SAVE_VERSION + 1, completed: [] });
    const store = memoryStorage({ [SAVE_KEY]: raw });
    expect(loadSave(store, known)).toEqual({ save: emptySave(), warning: { kind: 'newer', version: SAVE_VERSION + 1 } });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe(raw);
  });

  it('save cũ hơn → giữ nguyên bản cũ ở cargo-query-save.v<old> trước khi migrate', () => {
    const store = memoryStorage({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known, { 1: (d) => d }, 2);
    expect(oldSaveKey(1)).toBe('cargo-query-save.v1');
    expect(store.data['cargo-query-save.v1']).toBe(v1);
    expect(r.save).toMatchObject({ version: 2, completed: ['ch1-01', 'ch1-02'] });
    expect(r.warning).toBeUndefined();
  });

  it('save đúng version hiện tại → không tạo bản .v<old>', () => {
    const store = memoryStorage({ [SAVE_KEY]: serializeSave(emptySave()) });
    loadSave(store, known);
    expect(Object.keys(store.data)).toEqual([SAVE_KEY]);
  });
});

describe('writeSave', () => {
  it('trả false khi storage lỗi hoặc không có', () => {
    const broken: KV = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(writeSave(broken, emptySave())).toBe(false);
    expect(writeSave(undefined, emptySave())).toBe(false);
    expect(writeSave(memoryStorage(), emptySave())).toBe(true);
  });
});
