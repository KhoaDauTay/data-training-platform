import { describe, expect, it } from 'vitest';
import { canon, gradeDocs, gradeMongo } from '../src/engine/mongo/grade';
import type { MongoResult } from '../src/engine/mongo/types';

describe('Mongo document grader', () => {
  it('bỏ qua thứ tự khóa, kể cả lồng nhau', () => {
    expect(gradeDocs([{ a: 1, b: { c: 2, d: 3 } }], [{ b: { d: 3, c: 2 }, a: 1 }]).ok).toBe(true);
  });

  it('mảng giữ thứ tự', () => {
    expect(gradeDocs([{ a: [1, 2] }], [{ a: [2, 1] }])).toMatchObject({ ok: false, reason: 'docs' });
  });

  it('thiếu trường khác null', () => {
    expect(gradeDocs([{ a: 1, email: null }], [{ a: 1 }]).ok).toBe(false);
    expect(canon({ a: undefined } as never)).toBe('{}');
  });

  it('multiset mặc định; ordered bắt sai thứ tự', () => {
    const e = [{ x: 1 }, { x: 2 }, { x: 2 }];
    expect(gradeDocs(e, [{ x: 2 }, { x: 1 }, { x: 2 }]).ok).toBe(true);
    expect(gradeDocs(e, [{ x: 2 }, { x: 1 }, { x: 2 }], { ordered: true })).toEqual({ ok: false, reason: 'order' });
    expect(gradeDocs(e, [{ x: 1 }, { x: 1 }, { x: 2 }])).toMatchObject({ ok: false, reason: 'docs', missing: [{ x: 2 }], extra: [{ x: 1 }] });
    expect(gradeDocs(e, [{ x: 1 }])).toMatchObject({ ok: false, reason: 'count' });
  });

  it('_id thừa là gợi ý, không phải lỗi', () => {
    expect(gradeDocs([{ city: 'Hue' }], [{ _id: 7, city: 'Hue' }])).toEqual({ ok: true, tip: 'extraId' });
    expect(gradeDocs([{ _id: 1, city: 'Hue' }], [{ _id: 7, city: 'Hue' }]).ok).toBe(false);
  });

  it('số làm tròn 2 chữ số, Date khác chuỗi', () => {
    expect(gradeDocs([{ avg: 33.333333 }], [{ avg: 33.33 }]).ok).toBe(true);
    expect(gradeDocs([{ d: new Date('2026-01-01') }], [{ d: '2026-01-01T00:00:00.000Z' }]).ok).toBe(false);
    expect(gradeDocs([{ d: new Date('2026-01-01') }], [{ d: new Date('2026-01-01') }]).ok).toBe(true);
  });

  it('gradeMongo so value của countDocuments/distinct', () => {
    const r = (value: MongoResult['value']): MongoResult => ({ kind: 'value', collection: 'c', docs: [], value, truncated: false, ms: 0 });
    expect(gradeMongo(r(3), r(3)).ok).toBe(true);
    expect(gradeMongo(r(3), r(4))).toEqual({ ok: false, reason: 'value' });
    expect(gradeMongo(r(['a', 'b']), r(['a', 'b'])).ok).toBe(true);
  });
});
