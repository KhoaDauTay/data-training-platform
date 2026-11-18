import { describe, expect, it } from 'vitest';

// ui-ux-v6 §2.1: GSAP is one lazy chunk (`gsap-*`, budget group gsap). Only src/art/gsap.ts touches the library, and
// nobody imports that wrapper statically (a static import would merge 45 KB into main or into logistics-*).
const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const WRAPPER = '../src/art/gsap.ts';
const fromGsap = /(?:from\s+|import\s*\(\s*|import\s+)['"]gsap(?:\/[^'"]*)?['"]/;
const staticWrapper = /^\s*import\s+(?!type\b)[^'"]*?from\s+['"](?:\.{1,2}\/)+(?:art\/)?gsap['"]/m;

describe('gsap chunk', () => {
  it('has the wrapper', () => expect(Object.keys(SRC)).toContain(WRAPPER));
  it('only src/art/gsap.ts imports the gsap package', () => {
    for (const [file, code] of Object.entries(SRC)) if (file !== WRAPPER) expect(fromGsap.test(code), file).toBe(false);
    expect(fromGsap.test(SRC[WRAPPER])).toBe(true);
  });
  it('the wrapper is only ever imported dynamically (types are fine)', () => {
    for (const [file, code] of Object.entries(SRC)) expect(staticWrapper.test(code), file).toBe(false);
  });
});
