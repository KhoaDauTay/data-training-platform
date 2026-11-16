import { describe, expect, it } from 'vitest';
import { isMacPlatform, keyLabels, t } from '../src/i18n';
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

describe('nhãn phím tắt theo hệ điều hành', () => {
  it('nhận macOS qua userAgentData hoặc platform', () => {
    expect(isMacPlatform({ userAgentData: { platform: 'macOS' } })).toBe(true);
    expect(isMacPlatform({ platform: 'MacIntel' })).toBe(true);
    expect(isMacPlatform({ platform: 'iPad' })).toBe(true);
    expect(isMacPlatform({ userAgentData: { platform: 'Windows' }, platform: 'Win32' })).toBe(false);
    expect(isMacPlatform({ platform: 'Linux x86_64' })).toBe(false);
    expect(isMacPlatform(undefined)).toBe(false);
  });

  it('macOS dùng ⌘/⌥, nơi khác Ctrl/Alt', () => {
    expect(keyLabels(true)).toEqual({ mod: '⌘', alt: '⌥' });
    expect(keyLabels(false)).toEqual({ mod: 'Ctrl', alt: 'Alt' });
  });

  it('không chuỗi nào ghi cứng Ctrl/Alt: dùng {mod}/{alt}', () => {
    const hard = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /\b(Ctrl|Alt|Cmd)\b/.test(v))
      .map(([k]) => k);
    expect(hard).toEqual([]);
  });

  it('t() tự điền {mod}/{alt}', () => {
    expect(t('work.submit')).toMatch(/^\S+ \((Ctrl|⌘)\+Shift\+Enter\)$/);
    expect(t('work.format')).toMatch(/(Alt|⌥)\+F\)$/);
  });
});
