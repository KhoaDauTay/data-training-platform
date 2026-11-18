import { describe, expect, it } from 'vitest';

// Plan 8b D8b-2: the Logistics art is one lazy chunk. A static import of it from main code (or of main's entry modules
// from it) would pull it back into main or split a shared preload chunk (Plan 6 U3).
const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const staticImports = (code: string): string[] =>
  [...code.matchAll(/^\s*import\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);

describe('art chunk', () => {
  it('has the art modules', () => {
    expect(Object.keys(SRC)).toContain('../src/art/logistics.ts');
    expect(Object.keys(SRC)).toContain('../src/art/load.ts');
  });
  it('is never imported statically outside src/art', () => {
    for (const [file, code] of Object.entries(SRC)) {
      if (file.startsWith('../src/art/')) continue;
      for (const spec of staticImports(code)) expect(spec, file).not.toMatch(/(^|\/)art\/(logistics|ambient|mapMotion|illustrations)$/);
    }
  });
  it('takes main code by injection only (D8b-2: a runtime import hoists a shared preload chunk)', () => {
    for (const [file, code] of Object.entries(SRC)) {
      // load.ts is main; gsap.ts wraps the gsap package (ui-ux-v6 §2.1, tests/gsapChunk.test.ts)
      if (!file.startsWith('../src/art/') || file === '../src/art/load.ts' || file === '../src/art/gsap.ts') continue;
      for (const spec of staticImports(code)) expect(spec, file).toMatch(/^\.\/[a-zA-Z]+$/);
    }
  });
  it('never imports the stage or main statically', () => {
    for (const [file, code] of Object.entries(SRC)) {
      if (!file.startsWith('../src/art/')) continue;
      for (const spec of staticImports(code)) expect(spec, file).not.toMatch(/(ui\/stage|\/main)$/);
    }
  });
});
