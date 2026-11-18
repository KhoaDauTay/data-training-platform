import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// No DOM in Vitest here (tests/workRace.test.ts does the same): a fake createElementNS that records tag, attributes, children.
interface Fake { tag: string; attrs: Record<string, string>; children: Fake[]; setAttribute(k: string, v: string): void; append(...c: Fake[]): void }
const fakeEl = (tag: string): Fake => ({
  tag,
  attrs: {},
  children: [],
  setAttribute(k, v) { this.attrs[k] = v; },
  append(...c) { this.children.push(...c); },
});
const walk = (n: Fake): Fake[] => [n, ...n.children.flatMap(walk)];
const plain = (n: Fake): unknown => ({ t: n.tag, a: n.attrs, c: n.children.map(plain) });

let il: typeof import('../src/art/illustrations');
beforeAll(async () => {
  vi.stubGlobal('document', { createElementNS: (_ns: string, tag: string) => fakeEl(tag) });
  il = await import('../src/art/illustrations');
});
afterAll(() => vi.unstubAllGlobals());

const fake = (x: SVGElement): Fake => x as unknown as Fake;
const all = (): [string, Fake][] => [
  ...Array.from({ length: 12 }, (_, i): [string, Fake] => [`moduleGlyph(${i + 1})`, fake(il.moduleGlyph(i + 1))]),
  ...(['A', 'B', 'C', 'D'] as const).map((g): [string, Fake] => [`trackGlyph(${g})`, fake(il.trackGlyph(g))]),
  ['emptyDrills', fake(il.emptyDrills())],
  ['financeSoon', fake(il.financeSoon())],
];
const COLOR = /^(none|currentColor|var\(--[a-z-]+\))$/;

describe('illustrations', () => {
  it('are decorative svgs with no text, at most 120 nodes, colours from theme variables', () => {
    for (const [name, svg] of all()) {
      expect(svg.tag, name).toBe('svg');
      expect(svg.attrs['aria-hidden'], name).toBe('true');
      const nodes = walk(svg);
      expect(nodes.length, name).toBeLessThanOrEqual(120);
      expect(nodes.some((n) => n.tag === 'text'), name).toBe(false);
      for (const n of nodes) for (const k of ['fill', 'stroke']) if (k in n.attrs) expect(n.attrs[k], `${name} ${n.tag} ${k}`).toMatch(COLOR);
    }
  });
  it('draws twelve different module glyphs', () => {
    const json = Array.from({ length: 12 }, (_, i) => JSON.stringify(plain(fake(il.moduleGlyph(i + 1)))));
    expect(new Set(json).size).toBe(12);
  });
  it('marks the accent parts of every module glyph (data-acc 0..3, v5 B1 glyph-in stagger)', () => {
    for (let n = 1; n <= 12; n++) {
      const acc = walk(fake(il.moduleGlyph(n))).map((x) => x.attrs['data-acc']).filter((v) => v !== undefined);
      expect(acc.length, `moduleGlyph(${n})`).toBeGreaterThan(0);
      expect(acc, `moduleGlyph(${n})`).toEqual(acc.map((_, i) => String(i)));
      expect(acc.length).toBeLessThanOrEqual(4); // 360 ms + 3 x 80 ms stays inside the 700 ms glyph-in
    }
  });
  it('takes the chapter colour as a class', () => {
    expect(walk(fake(il.moduleGlyph(1, 'fill-violet-600'))).some((n) => n.attrs.class === 'fill-violet-600')).toBe(true);
  });
});
