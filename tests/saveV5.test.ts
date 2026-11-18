import { describe, expect, it } from 'vitest';
import v4 from './fixtures/save-v4.json?raw';
import v5 from './fixtures/save-v5.json?raw';
import { domainSlot, emptySave, MIGRATIONS, NewerSaveError, parseSave, SAVE_VERSION, type Known } from '../src/save';

// Logistics ids are listed (Known); e-commerce and finance ids are kept by pattern (ECOM_ID, FIN_ID): lazy content chunks.
const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05', 'ch2-01', 'ch2-02', 'ch2-03', 'r-1', 'r-2']),
  laneIds: new Set(['r-1', 'r-2']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};
const emptySlot = { dashboard: { cards: [], hidden: [] }, sandboxDraft: '' };

describe('save v5 (v14: domain Finance)', () => {
  it('SAVE_VERSION 5; save mới có slot E-com và Finance rỗng', () => {
    expect(SAVE_VERSION).toBe(5);
    expect(emptySave()).toMatchObject({ version: 5, byDomain: { ecommerce: emptySlot, finance: emptySlot } });
  });

  it('v4 → v5: mọi trường v4 giữ nguyên (cả slot E-com), thêm slot Finance rỗng', () => {
    const d = JSON.parse(v4);
    expect(parseSave(v4, known)).toEqual({ ...d, version: 5, byDomain: { ...d.byDomain, finance: emptySlot } });
  });

  it('đọc save mẫu v5 nguyên vẹn: id fin- giữ theo mẫu dù chưa tải nội dung Finance', () => {
    expect(parseSave(v5, known)).toEqual(JSON.parse(v5));
  });

  it('id fin- sai mẫu bị bỏ', () => {
    const raw = JSON.stringify({ ...JSON.parse(v5), completed: ['ch1-01', 'fin-x', 'fin-ch1-01', 'fin-ch123-01', 'zzz'] });
    expect(parseSave(raw, known).completed).toEqual(['ch1-01', 'fin-ch1-01']);
  });

  it('slot Finance hỏng đọc thành slot rỗng; slot E-com không bị ảnh hưởng', () => {
    const d = JSON.parse(v5);
    const raw = JSON.stringify({ ...d, byDomain: { ...d.byDomain, finance: 'x' } });
    const s = parseSave(raw, known);
    expect(s.byDomain.finance).toEqual(emptySlot);
    expect(s.byDomain.ecommerce).toEqual(d.byDomain.ecommerce);
  });

  it('build v4 gặp save v5: NewerSaveError (loadSave chép vào .bak, không ghi đè)', () => {
    expect(() => parseSave(v5, known, MIGRATIONS, 4)).toThrow(NewerSaveError);
  });

  it('domainSlot ba domain: Logistics là chính Save, còn lại là byDomain[id]; ghi qua slot là ghi vào Save', () => {
    const s = parseSave(v5, known);
    expect(domainSlot(s, 'logistics').sandboxDraft).toBe('SELECT count(*) FROM shipments');
    expect(domainSlot(s, 'ecommerce').dashboard.cards.map((c) => c.id)).toEqual(['e1']);
    expect(domainSlot(s, 'finance').dashboard.cards.map((c) => c.id)).toEqual(['f1']);
    domainSlot(s, 'finance').sandboxDraft = 'SELECT 1';
    expect(s.byDomain.finance.sandboxDraft).toBe('SELECT 1');
    expect(s.sandboxDraft).toBe('SELECT count(*) FROM shipments');
  });
});
