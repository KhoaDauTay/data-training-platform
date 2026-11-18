import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { DAYS_KEY, DAYS_MAX, dayCount, lilyStage, markDay, parseDays, toNextStage, withDay } from '../src/lily';
import type { KV } from '../src/storage';

const mem = (init: Record<string, string> = {}): KV & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

describe('Lily lớn lên (L87)', () => {
  it('giai đoạn theo số kỹ năng đã học: 0–2, 3–9, 10–24, 25+ hoặc học hết', () => {
    expect([0, 2, 3, 9, 10, 24, 25, 38].map((n) => lilyStage(n, 38))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(lilyStage(12, 12)).toBe(3); // every skill learned
    expect(lilyStage(0, 0)).toBe(0);
  });

  it('còn bao nhiêu kỹ năng tới giai đoạn sau; giai đoạn cuối thì không có', () => {
    expect(toNextStage(0, 38)).toBe(3);
    expect(toNextStage(4, 38)).toBe(6);
    expect(toNextStage(24, 38)).toBe(1);
    expect(toNextStage(25, 38)).toBeUndefined();
    expect(toNextStage(10, 12)).toBe(2); // capped by the skills left
  });

  it('pref ngày: chỉ chuỗi ngày hợp lệ, không trùng, có thứ tự, tối đa 366', () => {
    expect(parseDays(undefined)).toEqual([]);
    expect(parseDays('2026-11-18')).toEqual([]);
    expect(parseDays(['2026-11-18', 3, null, 'x', '2026-11-17', '2026-11-18', '2026-1-1'])).toEqual(['2026-11-17', '2026-11-18']);
    const many = Array.from({ length: 400 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
    const kept = parseDays(many);
    expect(kept).toHaveLength(DAYS_MAX);
    expect(kept.at(-1)).toBe(many.at(-1));
    expect(withDay(['2026-11-18'], '2026-11-18')).toEqual(['2026-11-18']);
  });

  it('markDay ghi mỗi ngày một lần; dữ liệu hỏng đọc như rỗng; ngày đầu là ngày thứ 1', () => {
    const kv = mem({ [DAYS_KEY]: '{bad json' });
    expect(dayCount(kv)).toBe(1);
    markDay('2026-11-16', kv);
    markDay('2026-11-16', kv);
    markDay('2026-11-17', kv);
    expect(JSON.parse(kv.data[DAYS_KEY])).toEqual(['2026-11-16', '2026-11-17']);
    expect(dayCount(kv)).toBe(2);
  });

  it('sprite: khăn, huy hiệu và laptop theo biến giai đoạn; mặc định (logo) là Lily trưởng thành', () => {
    for (const v of ['scarf', 'badge', 'prop']) expect(html).toContain(`style="opacity:var(--lily-${v}-on)"`);
    const root = css.split(':root {')[1]?.split('}')[0] ?? '';
    expect(root).toMatch(/--lily-scarf-on: 1; --lily-badge-on: 1; --lily-prop-on: 0; --lily-size: 1;/);
    for (const n of [0, 1, 3]) expect(css).toContain(`:root[data-lily="${n}"] [data-mascot=lily]`);
  });
});
