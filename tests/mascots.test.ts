import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { POSES } from '../src/ui/mascots';

const start = html.indexOf('<svg id="mascot-sprite"');
const sprite = html.slice(start, html.indexOf('</svg>', start));
const ids = new Set([...sprite.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
const light = css.split(':root {')[1]?.split('}')[0] ?? '';

describe('linh vật (L57, product-design-v6 §1)', () => {
  it('sprite có 6 tư thế cho mỗi bạn: Lily (chó) và Boon (vịt)', () => {
    expect(start).toBeGreaterThan(0);
    const want = ['lily', 'boon'].flatMap((who) => POSES.map((p) => `${who}-${p}`));
    expect(want.filter((id) => !sprite.includes(`<symbol id="${id}" viewBox="0 0 120 120">`))).toEqual([]);
  });

  it('mọi href="#…" trong sprite trỏ tới một id có thật', () => {
    const refs = [...sprite.matchAll(/href="#([\w-]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(20);
    expect(refs.filter((r) => !ids.has(r))).toEqual([]);
  });

  it('mọi màu var(--…) của sprite có trong :root (theme tối chỉ ghi đè một phần)', () => {
    const vars = new Set([...sprite.matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]));
    expect([...vars].filter((v) => !light.includes(`--${v}:`))).toEqual([]);
  });

  it('không còn tên cũ của mockup (Bin, Mây) hay tên nhân vật có bản quyền', () => {
    expect(sprite).not.toMatch(/\bbin-|\bmay-|Mây|Snoopy|Donald|Duck/i);
  });

  it('sprite không display:none (animation không chạy trong cây bị ẩn), aria-hidden, đứng đầu <body>', () => {
    expect(sprite).toMatch(/^<svg id="mascot-sprite" class="absolute size-0 overflow-hidden" aria-hidden="true" focusable="false">/);
    expect(html.indexOf('<body>')).toBeLessThan(start);
    expect(html.slice(html.indexOf('<body>') + 6, start).trim().startsWith('<!--')).toBe(true);
  });
});

// ui-ux v5 §1: CSS motion rules. Declarations are `animation:` and custom properties holding one (`--animate-pop`, `--lily-wag`…).
const anims = [...css.matchAll(/(?:^|[;{\s])(animation|--[\w-]+)\s*:\s*([^;}]+)/g)]
  .filter(([, prop, v]) => prop === 'animation' || /\d(?:ms|s)\b/.test(v))
  .flatMap(([, , v]) => v.replace(/\([^)]*\)/g, '()').split(',').map((a) => a.trim()))
  .filter((a) => a && !/^(none|var\()/.test(a));
const ms = (t: string) => parseFloat(t) * (t.endsWith('ms') ? 1 : 1000);

describe('chuyển động (ui-ux v5 §1)', () => {
  it('mỗi animation một lần (không infinite) dài ≤ 3 s, tính cả delay và số lần lặp', () => {
    const long = anims.filter((a) => {
      const words = a.split(/\s+/);
      if (words.includes('infinite')) return false;
      const [dur = 0, delay = 0] = words.filter((w) => /^-?[\d.]+m?s$/.test(w)).map(ms);
      const count = Number(words.find((w) => /^[\d.]+$/.test(w)) ?? 1);
      return dur * count + Math.max(delay, 0) > 3000;
    });
    expect(anims.length).toBeGreaterThan(10);
    expect(long).toEqual([]);
  });

  it('mọi tên cq-* được dùng có @keyframes, và không tên nào định nghĩa hai lần', () => {
    const defined = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    expect(defined.filter((n, i) => defined.indexOf(n) !== i)).toEqual([]);
    const used = anims.flatMap((a) => a.match(/\bcq-[\w-]+/g) ?? []);
    expect(used.filter((n) => !defined.includes(n))).toEqual([]);
  });

  it('giảm chuyển động vẫn tắt mọi animation (khung tĩnh)', () => {
    const reduce = css.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';
    expect(reduce).toMatch(/^\s*\{\s*\*\s*\{[^}]*animation:\s*none\s*!important/);
  });

  it('@property cho các biến giai đoạn của Lily, giá trị đầu bằng :root', () => {
    for (const v of ['--lily-size', '--lily-scarf-on', '--lily-badge-on', '--lily-prop-on']) {
      const root = light.split(`${v}:`)[1]?.split(';')[0].trim();
      expect(css).toContain(`@property ${v} { syntax: '<number>'; inherits: true; initial-value: ${root}; }`);
    }
  });
});
