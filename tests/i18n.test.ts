import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';

/** Keys whose EN text is intentionally the same as VI (SQL keywords, product names). */
const SAME_OK = new Set<string>(['tab.explain', 'top.xp', 'beat.boss']);
const placeholders = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();

describe('từ điển i18n', () => {
  it('placeholder {x} của VI và EN khớp nhau (với thông điệp dạng chuỗi)', () => {
    const bad = Object.entries(vi).flatMap(([k, v]) => {
      const e = en[k as keyof typeof en];
      return typeof v === 'string' && typeof e === 'string' && placeholders(v) !== placeholders(e) ? [k] : [];
    });
    expect(bad).toEqual([]);
  });

  it('EN không trùng y hệt VI, trừ SAME_OK', () => {
    const same = Object.entries(vi)
      .filter(([k, v]) => typeof v === 'string' && en[k as keyof typeof en] === v && !SAME_OK.has(k))
      .map(([k]) => k);
    expect(same).toEqual([]);
  });

  it('thông điệp EN dạng hàm xử lý số ít / số nhiều', () => {
    const rows = en['res.rows'] as (p: Record<string, number>) => string;
    expect(rows({ n: 1 })).toBe('Result: 1 row');
    expect(rows({ n: 1234 })).toBe('Result: 1,234 rows');
  });

  it('nhãn EN của tab Cột là "Columns" (gợi ý EN của ch1-01 nhắc đúng chữ này)', () => {
    expect(en['tab.columns']).toBe('Columns');
  });
});
