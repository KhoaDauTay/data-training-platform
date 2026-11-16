import { describe, expect, it } from 'vitest';
import { memoByKey } from '../src/viz/memo';

describe('memoByKey', () => {
  it('cùng key chỉ gọi load một lần', async () => {
    let calls = 0;
    const f = memoByKey(async (k) => { calls++; return k.length; });
    expect(await f('abc')).toBe(3);
    expect(await f('abc')).toBe(3);
    expect(calls).toBe(1);
  });

  it('promise bị reject thì không giữ lại, lần sau gọi lại', async () => {
    let calls = 0;
    const f = memoByKey(async () => {
      calls++;
      if (calls === 1) throw new Error('timeout');
      return 1;
    });
    await expect(f('a')).rejects.toThrow('timeout');
    expect(await f('a')).toBe(1);
    expect(calls).toBe(2);
  });

  it('giữ tối đa max key, bỏ key cũ nhất', async () => {
    let calls = 0;
    const f = memoByKey(async (k) => { calls++; return k; }, 2);
    await f('a');
    await f('b');
    await f('c');
    await f('a');
    expect(calls).toBe(4);
  });
});
