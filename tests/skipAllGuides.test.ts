import { describe, expect, it } from 'vitest';
import { GUIDES_KEY, guideFor, parseGuides } from '../src/guides';
import { readJson } from '../src/storage';
import { COACH_KEY, coachDone, GUIDES_PREF, restoreGuides, skipAllGuides } from '../src/ui/coach';

/** L318 (feedback #11): one "skip all guides" on a mark turns off the tour and every guide; ⋯ restores both. */
describe('skip all guides', () => {
  const kv = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
  it('sets the tour skipped and guides off, keeps what was seen; restore brings both back', () => {
    expect(GUIDES_PREF).toBe(GUIDES_KEY);
    const s = kv();
    s.setItem(GUIDES_KEY, JSON.stringify({ seen: ['g1'], off: false }));
    skipAllGuides(s);
    expect(coachDone(s)).toBe(true);
    const p = parseGuides(readJson(GUIDES_KEY, s));
    expect(p).toEqual({ seen: ['g1'], off: true });
    expect(guideFor({ offered: ['g2'], knows: false, tour: false }, p)).toBeUndefined();
    restoreGuides(s);
    expect(coachDone(s)).toBe(false);
    expect(readJson(COACH_KEY, s)).toBe(false);
    expect(guideFor({ offered: ['g2'], knows: false, tour: false }, parseGuides(readJson(GUIDES_KEY, s)))).toBe('g2');
  });
});
