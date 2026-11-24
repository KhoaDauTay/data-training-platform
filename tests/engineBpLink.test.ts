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
