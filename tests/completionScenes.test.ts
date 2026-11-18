import { describe, expect, it } from 'vitest';
import { confettiBits, PROMO } from '../src/art/logistics';
import { durationOf, STEPS } from '../src/scene';
import { MOVES } from '../src/ui/mascots';

// ui-ux-v6 A2 (T6): the completion scenes run on GSAP timelines. Vitest has no DOM, so what is checked here is the pure
// part: the seeded confetti, the promotion schedule, and that the hand-written rAF tween engine is gone.
const SRC = import.meta.glob('../src/art/logistics.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const code = SRC['../src/art/logistics.ts'];

describe('promotion confetti (Physics2D, seeded by the ticket id)', () => {
  it('28 pieces, the same for the same id', () => {
    expect(confettiBits('ch1-05')).toHaveLength(28);
    expect(confettiBits('ch1-05')).toEqual(confettiBits('ch1-05'));
  });
  it('differs between ids', () => expect(confettiBits('ch1-05')).not.toEqual(confettiBits('ch2-05')));
  it('flies up from both lower corners and lands inside the confetti window', () => {
    const [from, to] = PROMO.confetti;
    for (const b of confettiBits('ch3-06')) {
      expect(b.angle).toBeLessThan(-30); // upward (Physics2D: 0° = right, -90° = up)
      expect(b.angle).toBeGreaterThan(-150);
      expect(b.side === 0 ? b.angle > -90 : b.angle < -90).toBe(true); // left cannon aims right, right cannon aims left
      expect(b.velocity).toBeGreaterThan(0);
      expect(from + b.delay).toBeLessThan(to - 0.5); // every piece flies a while before it fades
      expect(b.color).toBeGreaterThanOrEqual(1);
      expect(b.color).toBeLessThanOrEqual(12);
    }
  });
});

describe('promotion schedule (v6 A2)', () => {
  const total = durationOf({ kind: 'promotion' }) / 1000;
  it('every window fits in durationOf', () => {
    for (const [a, b] of Object.values(PROMO)) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(total);
      expect(a).toBeLessThan(b);
    }
  });
  it('the last container lands in STEPS.promotion[0]; Lily cheers to the end of the scene', () => {
    expect(PROMO.drop[1]).toBe(STEPS.promotion[0] / 1000);
    expect(PROMO.lily[1]).toBe(total);
    expect(PROMO.lily[1] - PROMO.lily[0]).toBeCloseTo(MOVES.cheer.ms / 1000);
    expect(PROMO.lane[1]).toBe(PROMO.sail[0]);
  });
});

describe('old tween engine', () => {
  it('is gone from the Logistics scenes', () => {
    expect(code).not.toMatch(/requestAnimationFrame|\btween\(|\blerp\(|\bease(In|Out|InOut)\b|\bwait\(/);
  });
});
