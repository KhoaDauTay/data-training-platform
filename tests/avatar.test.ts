// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { LOOK, PEOPLE } from '../src/people';
import { avatar } from '../src/ui/avatar';

// ui-ux-v7 X1 (L164): portraits in the mascot grammar. Every gradient they use lives in the sprite, every colour token in style.css.
describe('colleague portraits', () => {
  const svg = avatar({ name: PEOPLE[0].name, dept: PEOPLE[0].dept }, 'lg');

  it('six hair styles, each worn by someone', () => {
    expect(LOOK.style).toHaveLength(6);
    expect(new Set(PEOPLE.map((p) => p.look.style))).toEqual(new Set(LOOK.style));
  });

  it('shared gradients exist in the sprite and every --pp-* token exists in both themes', () => {
    const markup = svg.outerHTML;
    for (const [, id] of markup.matchAll(/url\(#([\w-]+)\)/g)) expect(html, id).toContain(`id="${id}"`);
    const src = Object.values(import.meta.glob<string>('../src/ui/avatar.ts', { query: '?raw', import: 'default', eager: true }))[0];
    const used = new Set([...src.matchAll(/var\(--(pp-[\w-]+)\)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(8);
    const root = css.split(':root {')[1].split('}')[0];
    const dark = css.split(':root[data-theme=dark] {')[1].split('}')[0];
    for (const k of used) expect(root, k).toContain(`--${k}:`);
    for (const k of ['pp-skin-light', 'pp-skin-medium', 'pp-skin-tan', 'pp-skin-deep', 'pp-line']) expect(dark, k).toContain(`--${k}:`);
  });

  it('decorative, never focusable', () => {
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });
});
