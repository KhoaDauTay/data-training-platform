import { describe, expect, it } from 'vitest';
import { whyShown } from '../src/ui/engineView';

/** L317 (user feedback: a wrong quiz answer only said "Chưa đúng"): engine-ux-spec "Câu kiểm", why after right or the 2nd wrong. */
describe('engine quiz explanation', () => {
  it('hidden before a check and after the first wrong one; shown after a right answer or the second wrong one', () => {
    expect(whyShown(undefined)).toBe(false);
    expect(whyShown('pick', 5)).toBe(false);
    expect(whyShown('wrong', 1)).toBe(false);
    expect(whyShown('wrong', 2)).toBe(true);
    expect(whyShown('right', 0)).toBe(true);
  });
});
