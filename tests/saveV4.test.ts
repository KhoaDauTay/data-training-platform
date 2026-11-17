import { describe, expect, it } from 'vitest';
import v3 from './fixtures/save-v3.json?raw';
import v4 from './fixtures/save-v4.json?raw';
import { domainSlot, emptySave, MIGRATIONS, NewerSaveError, parseSave, SAVE_VERSION, type Known } from '../src/save';

// Logistics ids are listed (Known); e-commerce ids are kept by pattern (ECOM_ID) because that content is a lazy chunk.
const known: Known = {
  ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03', 'ch1-04', 'ch1-05', 'ch2-01', 'ch2-02', 'ch2-03', 'r-1', 'r-2']),
  laneIds: new Set(['r-1', 'r-2']),
  skills: new Set(['select', 'where', 'order_by', 'limit']),
};
const emptySlot = { dashboard: { cards: [], hidden: [] }, sandboxDraft: '' };

describe('save v4 (Plan 9: domain E-commerce)', () => {
  it('SAVE_VERSION 4; save mới có slot E-com rỗng', () => {
    expect(SAVE_VERSION).toBe(4);
    expect(emptySave()).toMatchObject({ version: 4, byDomain: { ecommerce: emptySlot } });
  });

  it('v3 → v4: mọi trường v3 giữ nguyên, thêm slot E-com rỗng', () => {
    expect(parseSave(v3, known)).toEqual({ ...JSON.parse(v3), version: 4, byDomain: { ecommerce: emptySlot } });
  });

  it('đọc save mẫu v4 nguyên vẹn: id ecom- giữ theo mẫu dù chưa tải nội dung E-com', () => {
    expect(parseSave(v4, known)).toEqual(JSON.parse(v4));
  });

  it('id không thuộc nội dung nào và không khớp mẫu vẫn bị bỏ', () => {
    const raw = JSON.stringify({ ...JSON.parse(v4), completed: ['ch1-01', 'ecom-x', 'ecom-ch1-01', 'zzz'] });
    expect(parseSave(raw, known).completed).toEqual(['ch1-01', 'ecom-ch1-01']);
  });

  it('slot hỏng đọc thành slot rỗng; nháp Sandbox bị cắt ở 20.000 ký tự', () => {
    const raw = JSON.stringify({ ...JSON.parse(v4), byDomain: { ecommerce: { dashboard: 5, sandboxDraft: 'x'.repeat(30_000) } } });
    expect(parseSave(raw, known).byDomain.ecommerce).toEqual({ dashboard: { cards: [], hidden: [] }, sandboxDraft: 'x'.repeat(20_000) });
  });

  it('build v3 gặp save v4: NewerSaveError (loadSave chép vào .bak, không ghi đè)', () => {
    expect(() => parseSave(v4, known, MIGRATIONS, 3)).toThrow(NewerSaveError);
  });

  it('domainSlot: Logistics là chính Save, E-com là byDomain.ecommerce; ghi qua slot là ghi vào Save', () => {
    const s = parseSave(v4, known);
    expect(domainSlot(s, 'logistics').sandboxDraft).toBe('SELECT count(*) FROM shipments');
    expect(domainSlot(s, 'ecommerce').dashboard.cards.map((c) => c.id)).toEqual(['e1']);
    domainSlot(s, 'ecommerce').sandboxDraft = 'SELECT 1';
    expect(s.byDomain.ecommerce.sandboxDraft).toBe('SELECT 1');
  });
});
