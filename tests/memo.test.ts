import { describe, expect, it } from 'vitest';
import { clearMemos, memoByKey, once } from '../src/viz/memo';

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

describe('once (ensureParser dùng cái này)', () => {
  it('tải hỏng thì lần sau thử lại; tải được rồi thì không tải nữa', async () => {
    let calls = 0;
    const load = once(async () => {
      calls++;
      if (calls === 1) throw new Error('Failed to fetch');
    });
    await expect(load()).rejects.toThrow('Failed to fetch');
    await expect(load()).resolves.toBeUndefined();
    await load();
    expect(calls).toBe(2);
  });
});

describe('clearMemos', () => {
  it('xóa cache của mọi memoByKey, lần gọi sau nạp lại; once() giữ nguyên', async () => {
    let a = 0;
    let b = 0;
    let c = 0;
    const fa = memoByKey(async (k) => { a++; return k; });
    const fb = memoByKey(async (k) => { b++; return k; });
    const fc = once(async () => { c++; return 1; });
    await fa('sandbox');
    await fb('SELECT 1');
    await fc();
    clearMemos();
    await fa('sandbox');
    await fb('SELECT 1');
    await fc();
    expect([a, b, c]).toEqual([2, 2, 1]);
  });
});
