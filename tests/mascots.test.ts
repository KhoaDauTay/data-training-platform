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
