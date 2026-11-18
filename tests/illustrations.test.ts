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
  it('draws modules and tracks on the 96x64 grid of the Phosphor duotone grammar (ui-ux-v6 S4)', () => {
    for (const [name, svg] of all().slice(0, 16)) {
      expect(svg.attrs.viewBox, name).toBe('0 0 96 64');
      for (const n of walk(svg)) if (n.attrs['stroke-width']) expect(n.attrs['stroke-width'], `${name} ${n.tag}`).toBe('4');
      expect(walk(svg).some((n) => n.attrs.opacity === '0.2'), `${name} has a duotone layer`).toBe(true);
    }
  });
  it('a done badge: a ring and a one-stroke tick, so the unlock can draw the ring and morph a dot into the tick', () => {
    const b = fake(il.doneBadge());
    expect(b.attrs['aria-hidden']).toBe('true');
    const ring = walk(b).filter((n) => 'data-ring' in n.attrs);
    const mark = walk(b).filter((n) => 'data-mark' in n.attrs);
    expect(ring.length).toBe(1);
    expect(mark.length).toBe(1);
    expect(mark[0].tag).toBe('path');
    expect(mark[0].attrs.d.match(/M/g)?.length).toBe(1); // one subpath: MorphSVG from UNLOCK_FROM stays clean
    expect(il.UNLOCK_FROM.match(/M/g)?.length).toBe(1);
    for (const n of [...ring, ...mark]) expect(n.attrs.pathLength).toBe('1'); // the CSS fallback draws them with dashes
  });
  it('the unlock lasts 900 ms (v6 S4; at most 3 s)', () => {
    expect(il.UNLOCK_MS).toBe(900);
  });
});
