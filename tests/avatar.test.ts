// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from '../src/style.css?raw';
import { LOOK, PEOPLE } from '../src/people';
import { avatar } from '../src/ui/avatar';
import { mascot, MINI_VIEW } from '../src/ui/mascots';

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

// ui-ux-v7 X3 (L165): Boon at 32 px or less is the small head; larger Boon, sleeping Boon and every Lily keep the full rig.
describe('small Boon', () => {
  it('size-8 Boon draws the head on a disc; size-12 Boon and size-8 Lily do not', () => {
    const small = mascot('boon', 'point', 'size-8 shrink-0');
    expect(small.getAttribute('viewBox')).toBe(MINI_VIEW);
    expect(small.querySelector('[data-part="mini-bg"]')).not.toBeNull();
    expect(small.querySelector('[data-part="body"]')).toBeNull();
    expect(mascot('boon', 'point', 'size-12').getAttribute('viewBox')).toBe('0 0 120 120');
    expect(mascot('boon', 'point', 'size-10').getAttribute('viewBox')).toBe('0 0 120 120');
    expect(mascot('lily', 'think', 'size-8 shrink-0').getAttribute('viewBox')).toBe('0 0 120 120');
    expect(mascot('boon', 'sleep', 'size-8').getAttribute('viewBox')).toBe('0 0 120 120');
  });
});
