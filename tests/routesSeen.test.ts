import { describe, expect, it } from 'vitest';
import { diffSeen, readSeen, ROUTES_SEEN_KEY, takeNewRoutes } from '../src/routesSeen';

const kv = (v?: string) => {
  const m = new Map<string, string>(v === undefined ? [] : [[ROUTES_SEEN_KEY, v]]);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, x: string) => void m.set(k, x), m };
};

describe('routes seen', () => {
  it('reads only port codes of ROUTES', () => {
    expect(readSeen(kv(JSON.stringify(['NLRTM', 'XXXXX', 3, null])))).toEqual(['NLRTM']);
    expect(readSeen(kv('{"a":1}'))).toEqual([]);
    expect(readSeen(kv('not json'))).toEqual([]);
    expect(readSeen(kv())).toEqual([]);
  });
  it('draws nothing on the first visit and remembers every open lane', () => {
    expect(diffSeen([], ['CNSHA', 'NLRTM'])).toEqual({ draw: [], next: ['CNSHA', 'NLRTM'] });
  });
  it('draws a lane opened since', () => {
    expect(diffSeen(['NLRTM'], ['NLRTM', 'SGSIN'])).toEqual({ draw: ['SGSIN'], next: ['NLRTM', 'SGSIN'] });
  });
  it('takeNewRoutes stores what it returns, so a lane draws once', () => {
    const s = kv(JSON.stringify(['NLRTM']));
    expect(takeNewRoutes(['NLRTM', 'SGSIN'], s)).toEqual(['SGSIN']);
    expect(takeNewRoutes(['NLRTM', 'SGSIN'], s)).toEqual([]);
  });
});
