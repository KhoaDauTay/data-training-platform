// V22-A (L203–L204): the map's place detection (src/viz/geo.ts) and the Map page questions (src/mapQueries.ts), on real seeds.
import { describe, expect, it } from 'vitest';
import { BRANCHES } from '../src/art/finance';
import { CITIES } from '../src/art/ecommerce';
import { loadDomain, loadLanes, loadTicketTemplates } from '../src/content';
import type { QueryResult } from '../src/db/run';
import type { DomainId } from '../src/domains';
import { compareResults } from '../src/grader';
import { MAP_QUESTIONS, questionFor } from '../src/mapQueries';
import { chapterTablesOf, tablesUnlocked } from '../src/progress';
import { applyVariant, variantsOf } from '../src/variants';
import { framesOf, geoRows, geoSpec, isCount, portOf, PORTS } from '../src/viz/geo';
import { ecomRunner, finRunner, runner } from './helpers';

await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
const DOMAINS: DomainId[] = ['logistics', 'ecommerce', 'finance'];
const IS_PLACE: Record<DomainId, (v: string) => boolean> = {
  logistics: (v) => portOf(v) !== undefined,
  ecommerce: (v) => CITIES.some((c) => c.name === v),
  finance: (v) => BRANCHES.some((b) => b.name === v),
};
const RUN = { logistics: runner, ecommerce: ecomRunner, finance: finRunner };
const res = (columns: string[], types: number[], rows: unknown[][]): QueryResult => ({ columns, types, rows });

describe('geoSpec', () => {
  it('finds the place column and the numeric ones, by type (numeric arrives as a string)', () => {
    const r = res(['city', 'n', 'pct'], [25, 20, 1700], [['Hue', 3, '12.5'], ['Da Nang', 5, '7.0']]);
    expect(geoSpec(r, IS_PLACE.ecommerce)).toEqual({ key: 0, values: [1, 2] });
    expect(isCount(r, 1)).toBe(true);
    expect(isCount(r, 2)).toBe(false);
  });
  it('is keyed by the domain: Hue is an E-com city, not a Logistics port', () => {
    expect(geoSpec(res(['city', 'n'], [25, 20], [['Hue', 1]]), IS_PLACE.logistics)).toBeUndefined();
  });
  it('needs every non-null value to be a place, and a numeric column', () => {
    expect(geoSpec(res(['city', 'n'], [25, 20], [['Hue', 1], ['Paris', 2]]), IS_PLACE.ecommerce)).toBeUndefined();
    expect(geoSpec(res(['city', 'name'], [25, 25], [['Hue', 'x']]), IS_PLACE.ecommerce)).toBeUndefined();
    expect(geoSpec(res(['city', 'n'], [25, 20], [['Hue', 1], [null, 2]]), IS_PLACE.ecommerce)).toEqual({ key: 0, values: [1] });
  });
  it('reads codes and port names, two port columns as lines, a repeated place as frames of its date column', () => {
    expect(portOf('Rotterdam')).toBe('NLRTM');
    const pairs = res(['pol', 'pod', 'n'], [25, 25, 20], [['VNDAD', 'NLRTM', 4], ['VNSGN', 'NLRTM', 2]]);
    expect(geoSpec(pairs, IS_PLACE.logistics)).toEqual({ key: 0, key2: 1, values: [2] });
    const d1 = new Date('2026-06-30T00:00:00Z');
    const d2 = new Date('2026-10-31T00:00:00Z');
    const months = res(['name', 'month_end', 'pct'], [25, 1082, 1700], [['Hue', d1, '1.0'], ['Hue', d2, '2.0'], ['Tam Ky', d1, '3.0']]);
    const s = geoSpec(months, IS_PLACE.finance)!;
    expect(s.frame).toBe(1);
    expect(framesOf(months, s)).toEqual(['2026-06-30', '2026-10-31']);
    expect(geoRows(months, s, 2, '2026-10-31')).toEqual([{ key: 'Hue', v: 2, row: 1 }]);
  });
  it('has a coordinate for every ports.code of the seed', async () => {
    const run = await runner();
    const codes = (await run('SELECT code, name FROM ports ORDER BY code')).rows;
    for (const [code, name] of codes) expect(PORTS[String(code)]?.[2], String(code)).toBe(name);
    expect(Object.keys(PORTS)).toHaveLength(codes.length);
  });
});

describe('map questions', () => {
  for (const d of DOMAINS) {
    it(`${d}: every chapter-1 point has a question; hook questions wait for their review`, () => {
      const ch1 = tablesUnlocked(1, chapterTablesOf(d));
      expect(questionFor(d, 'x', 0, ch1, new Set())).toBeDefined();
      for (const q of MAP_QUESTIONS[d].filter((x) => x.at)) {
        const all = tablesUnlocked(12, chapterTablesOf(d));
        expect(questionFor(d, q.at![0], 0, all, new Set())?.id, q.id).not.toBe(q.id);
        expect(questionFor(d, q.at![0], 0, all, new Set([q.after!]))?.id, q.id).toBe(q.id);
      }
    });

    it(`${d}: a sample lists the skills it uses; a beginner gets only those they know (L304)`, () => {
      const USES: [RegExp, string][] = [[/\bGROUP BY\b/i, 'group_by'], [/\bFILTER\b/i, 'conditional_agg'], [/\bJOIN\b/i, 'join'], [/\bcoalesce\b/i, 'coalesce'], [/\b[a-z_]+ - [a-z_]+\b/, 'date_math']];
      for (const q of MAP_QUESTIONS[d]) {
        for (const [re, skill] of USES) if (re.test(q.sql)) expect(q.needs.some((x) => x === skill || (skill === 'join' && x === 'multi_join')), `${q.id} ${skill}`).toBe(true);
      }
      const all = tablesUnlocked(12, chapterTablesOf(d));
      expect(questionFor(d, 'x', 0, all, new Set(), new Set(['group_by', 'join', 'conditional_agg', 'date_math']))).toBeDefined();
      const first = questionFor(d, 'x', 0, all, new Set(), new Set());
      if (d === 'logistics') expect(first?.id).toBe('l-transit');
      else expect(first).toBeUndefined();
    });

    it(`${d}: samples run, read only their listed (existing) tables, draw on the map, and equal no Solution`, async () => {
      const run = await RUN[d]();
      const tickets = [...loadTicketTemplates(d), ...(d === 'logistics' ? loadLanes().tasks : [])];
      const sols = tickets.flatMap((tk) => Array.from({ length: Math.max(1, variantsOf(tk).length) }, (_, i) => i).flatMap((i) => applyVariant(tk, i).steps.map((s) => s.solution)));
      const results: QueryResult[] = [];
      for (const sql of new Set(sols)) {
        try {
          results.push(await run(sql));
        } catch {
          // lab steps (CREATE INDEX) do not run as plain queries
        }
      }
      const known = new Set(Object.values(chapterTablesOf(d)).flat());
      for (const q of MAP_QUESTIONS[d]) {
        for (const x of q.tables) expect(known.has(x), `${q.id}: ${x}`).toBe(true);
        const read = [...q.sql.matchAll(/\b(?:FROM|JOIN)\s+(\w+)/gi)].map((m) => m[1]);
        expect(read.every((x) => q.tables.includes(x)), q.id).toBe(true);
        expect(/now\(\)|current_date/i.test(q.sql), q.id).toBe(false);
        const r = await run(q.sql);
        expect(r.rows.length, q.id).toBeGreaterThan(1);
        const spec = geoSpec(r, IS_PLACE[d]);
        expect(spec, q.id).toBeDefined();
        expect(geoRows(r, spec!, spec!.values[0]).length, q.id).toBeGreaterThan(1);
        for (const sol of results) expect(compareResults(sol, r, false).ok, q.id).toBe(false);
      }
    }, 120_000);
  }
});
