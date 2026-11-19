import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { vi } from '../src/i18n/vi';
import { ACC_AT, accAt, DAYS_KEY, DAYS_MAX, dayCount, LILY_KEY, type LilyStage, lilyStage, LOOK, markDay, markStages, parseDays, parseLilyPref, reachedOn, readLily, setAcc, STAGE_AT, toNextStage, withDay } from '../src/lily';
import type { KV } from '../src/storage';

const mem = (init: Record<string, string> = {}): KV & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

describe('Lily lớn lên (L87)', () => {
  it('6 giai đoạn (L132): 0, 1–2, 3–9, 10–17, 18–24, 25+ hoặc học hết', () => {
    expect(STAGE_AT).toEqual([0, 1, 3, 10, 18, 25]);
    expect([0, 1, 2, 3, 9, 10, 17, 18, 24, 25, 38].map((n) => lilyStage(n, 38))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(lilyStage(12, 12)).toBe(5); // every skill learned
    expect(lilyStage(0, 0)).toBe(0);
  });

  it('còn bao nhiêu kỹ năng tới giai đoạn sau; giai đoạn cuối thì không có', () => {
    expect([0, 1, 2, 3, 9, 10, 17, 18, 24].map((n) => toNextStage(n, 38))).toEqual([1, 2, 1, 7, 1, 8, 1, 7, 1]);
    expect(toNextStage(25, 38)).toBeUndefined();
    expect(toNextStage(10, 12)).toBe(2); // capped by the skills left
  });

  it('cập nhật không làm ai tụt (§5.3): cao hình không giảm, phụ kiện cũ còn, tên cũ giữ (trừ k = 0 và 18–24 lên Dày dạn)', () => {
    // Before L132: stages at 0/3/10/25, --lily-size 0.8/0.9/1/1, scarf from 1, star from 2, laptop at 3. Kept here, not in the code.
    const OLD_AT = [0, 3, 10, 25];
    const OLD_SIZE = [0.8, 0.9, 1, 1];
    const OLD_GEAR = [[], ['scarf-on'], ['scarf-on', 'badge-on'], ['scarf-on', 'badge-on', 'prop-on']] as const;
    const OLD_NAME = ['Cún con', 'Cún nhỏ', 'Trưởng thành', 'Chuyên gia'];
    const NEW_NAME = ['Sơ sinh', 'Cún con', 'Cún nhỏ', 'Trưởng thành', 'Dày dạn', 'Chuyên gia'];
    expect(NEW_NAME.map((_, i) => vi[`lily.stage${i}` as keyof typeof vi])).toEqual(NEW_NAME);
    // figure height in viewBox units: 97 before (ear tip to feet); the head (50 units, ear tip to neck) scales, the lift adds
    const height = (s: LilyStage) => LOOK[s].size * (97 + LOOK[s].lift + LOOK[s].perk - (1 - LOOK[s].head) * 50);
    for (let k = 0; k <= 38; k++) {
      const old = OLD_AT.filter((at) => k >= at).length - 1;
      const now = lilyStage(k, 38);
      expect(height(now), `k=${k}`).toBeGreaterThanOrEqual(97 * OLD_SIZE[old]);
      for (const g of OLD_GEAR[old]) expect(LOOK[now][g], `k=${k} ${g}`).toBe(1);
      const renamed = k === 0 || (k >= 18 && k <= 24);
      expect(NEW_NAME[now] === OLD_NAME[old], `k=${k}`).toBe(!renamed);
    }
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

  it('markDay trả true chỉ khi vừa ghi một ngày mới (ui-ux-v5 C2)', () => {
    const kv = mem({});
    expect(markDay('2026-12-01', kv)).toBe(true);
    expect(markDay('2026-12-01', kv)).toBe(false);
    expect(markDay('2026-12-02', kv)).toBe(true);
    expect(markDay('2026-12-01', mem({ [DAYS_KEY]: '["2026-12-01"]' }))).toBe(false); // already stored (another tab)
  });

  it('sprite: phụ kiện theo biến giai đoạn; không data-lily thì là Lily trưởng thành (giai đoạn 3)', () => {
    for (const v of ['collar', 'scarf', 'badge', 'harness', 'prop']) expect(html).toContain(`style="opacity:var(--lily-${v}-on)"`);
    const root = css.split(':root {')[1]?.split('}')[0] ?? '';
    for (const [k, v] of Object.entries(LOOK[3])) expect(root).toContain(`--lily-${k}: ${v};`);
  });

  it('bảng CSS mỗi giai đoạn đặt đủ mọi biến, đúng bằng LOOK; data-stage của một bản sao thắng <html data-lily>', () => {
    for (const [n, look] of LOOK.entries()) {
      const sel = `:root[data-lily="${n}"] [data-mascot=lily]:not([data-stage]), [data-mascot=lily][data-stage="${n}"] {`;
      const row = css.split(sel)[1]?.split('}')[0] ?? '';
      expect(row, `stage ${n}`).not.toBe('');
      const vars = Object.fromEntries([...row.matchAll(/--lily-([\w-]+):\s*([-\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
      expect(vars, `stage ${n}`).toEqual(look);
    }
  });
  it('L134: từ giai đoạn 2, mỗi lần lớn đổi dáng (≥ 3 tỉ lệ), không chỉ phụ kiện; sơ sinh ngồi bệt, dày dạn ưỡn ngực', () => {
    const SHAPE = ['size', 'head', 'lift', 'perk', 'paw', 'ears', 'ear-tilt', 'tail', 'chest', 'eye'] as const;
    for (let n = 2; n <= 5; n++) expect(SHAPE.filter((k) => LOOK[n][k] !== LOOK[n - 1][k]).length, `stage ${n}`).toBeGreaterThanOrEqual(3);
    expect(LOOK[0].lift).toBeLessThan(0);
    expect(LOOK[4].perk).toBeGreaterThan(0);
    expect([0, 1, 2].map((n) => LOOK[n].eye)).toEqual([1.1, 1.1, 1.1]);
  });

  it('L134 pref cargo-query/lily: dữ liệu xấu bị bỏ, ngày chỉ ghi lần đầu, màu không mất khi ghi ngày', () => {
    expect(parseLilyPref(undefined)).toEqual({ at: {} });
    expect(parseLilyPref('x')).toEqual({ at: {} });
    expect(parseLilyPref({ at: { 0: '2026-11-01', 1: '2026-11-02', 2: 'hôm qua', 6: '2026-11-03', 3: 5 }, acc: 2.5 })).toEqual({ at: { 1: '2026-11-02' } });
    expect(parseLilyPref({ at: [], acc: 7 })).toEqual({ at: {} });
    expect(parseLilyPref({ acc: ACC_AT.length })).toEqual({ at: {}, acc: ACC_AT.length });
    const kv = mem({ [LILY_KEY]: '{bad json' });
    expect(readLily(kv)).toEqual({ at: {} });
    setAcc(2, kv);
    markStages(0, 2, '2026-11-19', kv);
    markStages(1, 3, '2026-11-20', kv);
    expect(readLily(kv)).toEqual({ at: { 1: '2026-11-19', 2: '2026-11-19', 3: '2026-11-20' }, acc: 2 });
    setAcc(undefined, kv);
    expect(readLily(kv)).toEqual({ at: { 1: '2026-11-19', 2: '2026-11-19', 3: '2026-11-20' } });
  });

  it('L134 album và màu: chưa tới / trước đây / có ngày; màu chưa mở ở giai đoạn này đọc như mặc định', () => {
    const pref = { at: { 2: '2026-11-19', 5: '2026-12-01' }, acc: 4 };
    expect([0, 1, 2, 3, 4].map((n) => reachedOn(pref, n, 3, '2026-11-01'))).toEqual(['2026-11-01', null, '2026-11-19', null, undefined]);
    expect(reachedOn(pref, 0, 0)).toBeNull();
    expect(reachedOn(pref, 5, 3)).toBeUndefined(); // a day from before a lower save was imported
    expect(accAt(pref, ACC_AT[3] - 1)).toBeUndefined();
    expect(accAt(pref, ACC_AT[3])).toBe(4);
    expect(accAt({ at: {} }, 5)).toBeUndefined();
  });
});
