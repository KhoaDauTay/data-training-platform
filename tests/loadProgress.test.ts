import { describe, expect, it } from 'vitest';
import { countingFetch, type LoadProgress } from '../src/db/loadProgress';

const body = (n: number, headers: Record<string, string> = {}) => new Response(new Uint8Array(n), { headers });

describe('tiến độ tải PGlite theo byte', () => {
  it('đếm byte của .wasm/.data; total = tổng Content-Length khi không nén; giữ Content-Type', async () => {
    const seen: LoadProgress[] = [];
    const f = countingFetch(async () => body(10, { 'content-length': '10', 'content-type': 'application/wasm' }), (p) => seen.push(p));
    const res = await f('https://x/assets/pglite-abc.wasm');
    expect(res.headers.get('content-type')).toBe('application/wasm');
    expect((await res.arrayBuffer()).byteLength).toBe(10);
    expect(seen.at(-1)).toEqual({ loaded: 10, total: 10 });
  });

  it('có Content-Encoding thì total không rõ (Content-Length là số byte nén)', async () => {
    const seen: LoadProgress[] = [];
    const f = countingFetch(async () => body(30, { 'content-length': '12', 'content-encoding': 'gzip' }), (p) => seen.push(p));
    const res = await f(new URL('https://x/pglite.data'));
    expect(res.headers.get('content-encoding')).toBeNull();
    await res.arrayBuffer();
    expect(seen.at(-1)).toEqual({ loaded: 30, total: undefined });
  });

  it('file khác đi thẳng, không đếm', async () => {
    const seen: LoadProgress[] = [];
    const original = body(5);
    const f = countingFetch(async () => original, (p) => seen.push(p));
    expect(await f('https://x/index.js')).toBe(original);
    expect(seen).toEqual([]);
  });
});
