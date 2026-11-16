import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import chaptersYml from '../content/chapters.yml?raw';
import kpisYml from '../content/kpis.yml?raw';
import peopleYml from '../content/people.yml?raw';
import html from '../index.html?raw';
import { loadTickets } from '../src/content';
import { isMacPlatform, keyLabels, t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';
import { textOf } from '../src/tickets';

/** Every string inside a parsed value (keys and YAML comments are not player text). */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
const GAME_TONE = /boss|sự cố/i;

/** Keys whose EN text is intentionally the same as VI (SQL keywords, product names). */
const SAME_OK = new Set<string>(['tab.explain', 'top.xp']);
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

  it('L22: không chuỗi hiển thị nào dùng giọng game "boss" / "sự cố"', () => {
    const bad = [...Object.entries(vi), ...Object.entries(en)]
      .filter(([, v]) => typeof v === 'string' && /\bboss\b|sự cố/i.test(v))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('L22: chapters.yml, people.yml, kpis.yml và chữ ticket (VI + EN) không có "boss" / "sự cố"', () => {
    const texts = [
      ...[chaptersYml, peopleYml, kpisYml].flatMap((y) => strings(parseYaml(y))),
      ...loadTickets().flatMap((tk) => (['vi', 'en'] as const).flatMap((lang) => strings(textOf(tk, lang)))),
    ];
    expect(texts.length).toBeGreaterThan(100);
    expect(texts.filter((x) => GAME_TONE.test(x))).toEqual([]);
  });

  it('mọi khóa data-i18n / data-i18n-aria trong index.html có trong vi', () => {
    const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
    expect(keys).toContain('nav.label');
    expect(keys.filter((k) => !(k in vi))).toEqual([]);
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
