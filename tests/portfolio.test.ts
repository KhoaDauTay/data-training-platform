import { describe, expect, it } from 'vitest';
import { portfolioMd } from '../src/me';
import { crc32, takeHomeMd, zip } from '../src/portfolio';

/** V19-D (L170): portfolio card pictures (zip) and the take-home portfolio. */
describe('portfolio zip', () => {
  it('crc32 is the zip one (check value of "123456789")', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('stores every file readably (local headers, central directory, end record)', () => {
    const files = [
      { name: 'README.md', data: new TextEncoder().encode('# Portfolio\n![a](cards/c1.png)') },
      { name: 'cards/c1.png', data: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) },
    ];
    const z = zip(files, new Date(2026, 10, 19, 12, 30, 10));
    const v = new DataView(z.buffer);
    const end = z.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
    let cd = v.getUint32(end + 16, true);
    for (const f of files) {
      expect(v.getUint32(cd, true)).toBe(0x02014b50);
      const n = v.getUint16(cd + 28, true);
      const local = v.getUint32(cd + 42, true);
      expect(new TextDecoder().decode(z.subarray(cd + 46, cd + 46 + n))).toBe(f.name);
      expect(v.getUint32(local, true)).toBe(0x04034b50);
      expect(v.getUint32(local + 14, true)).toBe(crc32(f.data));
      const start = local + 30 + v.getUint16(local + 26, true);
      expect([...z.subarray(start, start + f.data.length)]).toEqual([...f.data]);
      cd += 46 + n;
    }
  });
});

describe('portfolio README with card pictures', () => {
  const card = (id: string, sql: string) => ({ id, title: `Card [${id}]`, sql });
  it('links a picture only for cards that have one, never for a card on imported data', () => {
    const md = portfolioMd({
      lang: 'en', scope: 'logistics', what: 'Logistics', name: '', date: 'x', entries: [],
      cards: [card('c1', 'SELECT 1'), card('c2', 'SELECT 2'), card('c3', 'SELECT * FROM my_sales')], imported: ['my_sales'], pics: new Set(['c1', 'c3']),
    });
    expect(md).toContain('![Card c1](cards/c1.png)');
    expect(md).not.toContain('cards/c2.png');
    expect(md).not.toMatch(/c3|my_sales/);
  });
});

describe('take-home portfolio', () => {
  const entry = {
    title: 'Which stores miss?', brief: 'The regional manager needs…', text: 'Store 3 missed most.\nFrom September all met.',
    steps: [{ title: 'Revenue', sql: 'SELECT 1 AS step_one' }, { title: 'Target' }],
    rubric: [{ line: 'Names the stores', ticked: true }, { line: 'Spots the trend', ticked: false }],
  };
  it('holds the passed SQL, the learner text and the self-assessed rubric; says fictional and not verified', () => {
    const md = takeHomeMd({ lang: 'en', name: '', date: '19/11/2026', entries: [entry] });
    expect(md).toContain('step_one');
    expect(md).toContain('> From September all met.');
    expect(md).toContain('- [x] Names the stores');
    expect(md).toContain('- [ ] Spots the trend');
    expect(md).toContain('1/2');
    expect(md).toMatch(/fictional/);
    expect(md).toMatch(/not verified/);
    expect(md).toMatch(/no longer on this device/); // step 2 has no SQL left: never a draft
    expect(takeHomeMd({ lang: 'vi', name: 'An', date: 'x', entries: [entry] })).toMatch(/hư cấu[\s\S]*không xác minh/);
  });
  it('the lazy chunk imports only types from main modules (Plan 6 U3)', () => {
    const sources = import.meta.glob(['../src/ui/portfolioPng.ts', '../src/portfolio.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(sources)).toHaveLength(2);
    for (const [f, src] of Object.entries(sources)) {
      for (const [, what, from] of src.matchAll(/^import (type )?.*from '([^']+)'/gm)) if (!what) expect(from, f).toMatch(/^\.\.\/portfolio$/);
    }
  });
});
