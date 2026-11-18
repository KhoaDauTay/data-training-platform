// D-DB1 (L86): the custom-card unlock rule and the starter cards (src/starterCards.ts) shown until the player has cards.
import { describe, expect, it } from 'vitest';
import { loadDomain, loadTicketTemplates } from '../src/content';
import { CUSTOM_SKILL, customCardsOpen, KIND_SKILL, valueCols } from '../src/dashboard';
import type { DomainId } from '../src/domains';
import { compareResults } from '../src/grader';
import { vi } from '../src/i18n/vi';
import { chapterTablesOf, domainSkills } from '../src/progress';
import { starterCards, STARTERS } from '../src/starterCards';
import { applyVariant, variantsOf } from '../src/variants';
import { ecomRunner, finRunner, runner } from './helpers';

await Promise.all([loadDomain('ecommerce'), loadDomain('finance')]);
const DOMAINS: DomainId[] = ['logistics', 'ecommerce', 'finance'];

describe('customCardsOpen (D-DB1)', () => {
  it('locks a gated beginner until the Number card skill is learned', () => {
    expect(customCardsOpen(new Set(['select']), 0, true)).toBe(false);
    expect(customCardsOpen(new Set(['select', CUSTOM_SKILL]), 0, true)).toBe(true);
  });
  it('never locks "I know SQL", pre-welcome players, or a player who already has cards', () => {
    expect(customCardsOpen(new Set(), 0, false)).toBe(true);
    expect(customCardsOpen(new Set(['select']), 1, true)).toBe(true);
  });
  it('is the skill of a card kind that every domain teaches', () => {
    expect(Object.values(KIND_SKILL)).toContain(CUSTOM_SKILL);
    for (const d of DOMAINS) expect(domainSkills(loadTicketTemplates(d)).some((s) => s.id === CUSTOM_SKILL)).toBe(true);
  });
});

describe('starter cards', () => {
  const t = (k: string) => `T:${k}`;
  it('are derived (titles resolved, source "starter") and filtered by open tables', () => {
    const all = starterCards('logistics', chapterTablesOf('logistics')[1], t as never);
    expect(all.length).toBe(STARTERS.logistics!.length);
    expect(all.every((c) => c.source === 'starter' && c.title.startsWith('T:starter.'))).toBe(true);
    expect(starterCards('logistics', ['carriers'], t as never).map((c) => c.id)).toEqual(['logistics/s-carriers']) // the domain in the id: both domains have an s-customers with the same SQL;
    expect(starterCards('finance', ['x'], t as never)).toEqual([]);
    expect(starterCards('finance', ['products'], t as never).map((c) => c.id)).toEqual(['finance/s-products']);
  });

  for (const d of DOMAINS) {
    const list = STARTERS[d]!;
    it(`${d}: read only chapter-1 tables, have VI titles, no now()/CURRENT_DATE, unique ids`, () => {
      const ch1 = new Set(chapterTablesOf(d)[1]);
      for (const s of list) {
        expect(s.tables.every((x) => ch1.has(x)), s.id).toBe(true);
        expect(vi[s.title], s.id).toBeTruthy();
        expect(/now\(\)|current_date/i.test(s.sql), s.id).toBe(false);
      }
      expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
    });

    it(`${d}: every card runs, fits its kind, and equals no ticket Solution (no answer, no KPI tile leaks)`, async () => {
      const run = d === 'logistics' ? await runner() : d === 'ecommerce' ? await ecomRunner() : await finRunner();
      const solutions = loadTicketTemplates(d).flatMap((tk) => Array.from({ length: Math.max(1, variantsOf(tk).length) }, (_, i) => i).flatMap((i) => applyVariant(tk, i).steps.map((s) => s.solution)));
      const results = [];
      for (const sql of new Set(solutions)) {
        try {
          results.push(await run(sql));
        } catch {
          // lab steps (CREATE INDEX) do not run as plain queries
        }
      }
      for (const s of list) {
        const r = await run(s.sql);
        expect(r.rows.length, s.id).toBeGreaterThan(0);
        expect(valueCols(s.kind, r).length, s.id).toBeGreaterThan(0);
        if (s.col !== undefined) expect(valueCols(s.kind, r), s.id).toContain(s.col);
        for (const sol of results) expect(compareResults(sol, r, false).ok, s.id).toBe(false);
      }
    }, 120_000);
  }
});
