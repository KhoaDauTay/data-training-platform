// v34 (L545, handoff item 4): a Best Practice id in lesson prose (`e-bp-s10`) links to its card. The track comes from the
// code's letter; every card file on disk must map to its own folder, and the hash must parse back to the same card.
import { describe, expect, it } from 'vitest';
import { bestRouteOf } from '../src/engine/best';
import { bpHashOf } from '../src/ui/engineView';

const cards = Object.keys(import.meta.glob('../content/engine/best/*/*.md'));

describe('codeOrLink: Best Practice ids', () => {
  it('every card id maps to its own track folder and round-trips through bestRouteOf', () => {
    expect(cards.length).toBeGreaterThan(100);
    for (const p of cards) {
      const [, track, code] = /best\/([a-z]+)\/([a-z]\d\d)-/.exec(p)!;
      const id = `e-bp-${code}`;
      const hash = bpHashOf(id);
      expect(hash, p).toBe(`#/engine/best/${track}/${id}`);
      expect(bestRouteOf(hash!)).toEqual({ track, id });
    }
  });
  it('anything else stays code', () => {
    for (const c of ['e-bp-z01', 'e-bp-s1', 'e-bp-s100', 'e-pg-l5-10', 'bp-s10', 'e-bp-S10']) expect(bpHashOf(c), c).toBeUndefined();
  });
});

// v38 (link check): every `e-…` id written in Engine content (lessons, Best Practice cards, path, glossary, interview sets) or
// in the multi-tenant knowledge doc names something that exists. Broad match first, then membership, so a typo such as
// `e-pg-l5-1` fails instead of being skipped by a narrow pattern.
const texts = {
  ...import.meta.glob<string>('../content/engine/**/*.{md,yml}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../docs/knowledge/database/multi-tenant.md', { query: '?raw', import: 'default', eager: true }),
};
describe('Engine ids mentioned in content exist', () => {
  const known = new Set<string>(cards.map((p) => `e-bp-${/best\/[a-z]+\/([a-z]\d\d)-/.exec(p)![1]}`));
  for (const raw of Object.values(texts)) for (const m of raw.matchAll(/^\s*-?\s*id:\s*["']?(e-[a-z0-9-]+)/gm)) known.add(m[1]);
  it('the id set is filled (lessons, cards, drills)', () => {
    expect(known.size).toBeGreaterThan(500);
    expect(known.has('e-ds-l4-09') && known.has('e-bp-x08') && known.has('e-pg-l5-22')).toBe(true);
  });
  it('every mention resolves', () => {
    const bad: string[] = [];
    for (const [p, raw] of Object.entries(texts)) {
      for (const m of raw.matchAll(/\be-[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*(?![-\w<…])/g)) if (!known.has(m[0])) bad.push(`${p.replace(/^.*content\/engine\//, '')}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });
});
