import { describe, expect, it, vi } from 'vitest';
import labSql from '../src/db/lab.sql?raw';
import gameSql from '../src/db/schema.sql?raw';
import { loadDomain, loadTickets } from '../src/content';
import { DOMAIN_KEY } from '../src/domains';
import { resumeTarget } from '../src/home';
import { setLang } from '../src/i18n';
import { sqlOnly } from '../src/onboarding';
import { unlockNote } from '../src/overview';
import { SKILLS } from '../src/progress';
import { textOf } from '../src/tickets';
import { canonicalHash, domainOfHash, drillHash, drillOfHash, generalNav, LEARN_PLAY, parseRoute, workspaceHash } from '../src/route';

/** v15 "Ranh giới sạch" (product-roadmap-v15 §3, §5): the General area and the domains no longer leak into each other. */

describe('Q1: the General workspace has its own hash (D-N2)', () => {
  it('a drill is never on a #/d/… route: Back to a domain workspace leaves the General work (FIX-1, L147 amends the L135 alias)', () => {
    for (const d of ['logistics', 'ecommerce', 'finance']) {
      expect(generalNav(`#/d/${d}/play`, LEARN_PLAY)).toBe('leave');
      expect(generalNav(`#/d/${d}/play`, drillHash('g-where-open'))).toBe('leave');
      expect(workspaceHash(`#/d/${d}/play`, undefined)).toBe(`#/d/${d}/play`);
    }
    expect(generalNav(canonicalHash('#/play'), LEARN_PLAY)).toBe('leave'); // the pre-Plan 7 hash too
    expect(parseRoute(LEARN_PLAY)).toBe('play');
    expect(domainOfHash(LEARN_PLAY)).toBeUndefined();
  });

  it('other hashes are kept; #/learn/play without a drill (a reload) goes to Practise SQL', () => {
    expect(workspaceHash('#/d/logistics/play', undefined)).toBe('#/d/logistics/play');
    expect(workspaceHash('#/d/finance/data/loans', LEARN_PLAY)).toBe('#/d/finance/data/loans');
    expect(workspaceHash('#/learn/skill/where', LEARN_PLAY)).toBe('#/learn/skill/where');
    expect(workspaceHash(LEARN_PLAY, undefined)).toBe('#/practice');
    expect(workspaceHash(LEARN_PLAY, LEARN_PLAY)).toBe(LEARN_PLAY);
  });

  it('a drill keeps its own hash, so a reload reopens it instead of dropping the player on the hub', () => {
    const h = drillHash('g-where-open');
    expect(h).toBe('#/learn/play/g-where-open');
    expect(drillOfHash(h)).toBe('g-where-open');
    expect(parseRoute(h)).toBe('play');
    expect(domainOfHash(h)).toBeUndefined();
    expect(workspaceHash(h, undefined)).toBe(h); // page load, nothing open yet: main.ts reopens the drill
    expect(generalNav(LEARN_PLAY, h)).toBe('leave'); // Back to the review a drill replaced: that review is gone…
    expect(workspaceHash(LEARN_PLAY, undefined)).toBe('#/practice'); // …so the hub, where it starts again
    expect(drillOfHash('#/learn/play/<script>')).toBeUndefined();
    expect(generalNav('#/learn/play/<script>', h)).toBe('leave');
    expect(drillOfHash('#/learn/play')).toBeUndefined();
  });
});

describe('FIX-1 (L147): Back and Forward in the General workspace', () => {
  const a = drillHash('g-where-open');
  const b = drillHash('g-select-open');
  it('Back to an older drill or interview question opens it; the open one, a review or other pages change nothing', () => {
    expect(generalNav(a, b)).toEqual({ open: 'g-where-open' });
    expect(workspaceHash(a, b)).toBe(a); // never swapped back to the open drill
    expect(generalNav(drillHash('g-iv-junior-1-2'), drillHash('g-iv-junior-1-3'))).toEqual({ open: 'g-iv-junior-1-2' });
    expect(generalNav(a, LEARN_PLAY)).toEqual({ open: 'g-where-open' }); // a drill hash during a review of drills
    expect(generalNav(a, a)).toBeUndefined();
    expect(generalNav(LEARN_PLAY, LEARN_PLAY)).toBeUndefined();
    for (const x of ['#/learn/skill/where', '#/practice', '#/d/finance/data/loans', '#/']) expect(generalNav(x, a)).toBeUndefined();
  });
  it('after Exit (nothing General open), Back or Forward to a drill hash reopens that drill instead of showing the story', () => {
    expect(generalNav(a, undefined)).toEqual({ open: 'g-where-open' });
    expect(generalNav('#/d/logistics/play', undefined)).toBeUndefined();
    expect(generalNav(LEARN_PLAY, undefined)).toBeUndefined(); // workspaceHash sends it to the hub
  });
});

describe('§5: a "SQL only" player who never opened a domain', () => {
  const kv = (v?: unknown) => ({ getItem: (k: string) => (k === DOMAIN_KEY && v !== undefined ? JSON.stringify(v) : null), setItem: () => undefined });
  const ids = SKILLS.map((s) => s.id);
  const next = loadTickets('logistics')[0];

  it('is read from the domain pref only', () => {
    expect(sqlOnly(kv('general'))).toBe(true);
    for (const v of ['logistics', 'ecommerce', undefined]) expect(sqlOnly(kv(v))).toBe(false);
  });

  it('Q2: "Continue" never offers a domain task; the last drill passed wins for everyone', () => {
    expect(resumeTarget([], next, true, ids)).toEqual({ kind: 'learn' });
    expect(resumeTarget(['g-where-2'], next, true, ids)).toEqual({ kind: 'skill', skill: 'where' });
    expect(resumeTarget([next.id, 'g-conditional-agg-1'], next, false, ids)).toEqual({ kind: 'skill', skill: 'conditional_agg' });
    expect(resumeTarget(['g-a1-1'], next, false, ids)).toEqual({ kind: 'learn' }); // an advanced node's drill
    expect(resumeTarget(['g-where-2', next.id], next, false, ids)).toEqual({ kind: 'ticket', ticket: next });
    expect(resumeTarget([], undefined, false, ids)).toBeUndefined();
  });
});

describe('Q3: skill-card syntax is written on lab tables (D-N3)', () => {
  /** Every table and column name a CREATE TABLE of the file declares. */
  const names = (sql: string): Set<string> => {
    const out = new Set<string>();
    for (const m of sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\n\);/gi)) {
      out.add(m[1].toLowerCase());
      for (const c of m[2].matchAll(/^\s+([a-z_][a-z0-9_]*)\s+[a-z]/gm)) out.add(c[1]);
    }
    return out;
  };
  const lab = names(labSql);
  const game = names(gameSql);

  it('the parser sees both schemas', () => {
    expect(lab.has('price_vnd') && lab.has('stores')).toBe(true);
    expect(game.has('shipments') && game.has('gross_weight_kg')).toBe(true);
  });

  it('no syntax names a Logistics table or column that lab does not have', () => {
    const bad = SKILLS.flatMap((s) => {
      const words = s.syntax.replace(/'[^']*'/g, '').match(/\b[a-z_][a-z0-9_]*\b/g) ?? [];
      return words.filter((w) => game.has(w) && !lab.has(w)).map((w) => `${s.id}: ${w}`);
    });
    expect(bad).toEqual([]);
  });

  it('every FROM/JOIN/INDEX ON table of a syntax line is a lab table (or a CTE it names)', () => {
    const bad = SKILLS.flatMap((s) => [...s.syntax.matchAll(/\b(?:FROM|JOIN|INDEX ON)\s+([a-z_][a-z0-9_]*)/g)]
      .map((m) => m[1]).filter((x) => game.has(x) && !lab.has(x)).map((x) => `${s.id}: ${x}`));
    expect(bad).toEqual([]);
  });
});

describe('Q4: the Notebook never prints a raw task id', () => {
  const RAW_ID = /\b(?:ch|ecom-ch|fin-ch)\d+-\d+\b/;

  it('unlock lines name the task (or the learning path), in every domain and language', async () => {
    vi.stubGlobal('document', { querySelectorAll: () => [], documentElement: {} }); // setLang() relabels static markup (tests/a11y.test.ts)
    await loadDomain('ecommerce');
    await loadDomain('finance');
    for (const lang of ['vi', 'en'] as const) {
      await setLang(lang);
      for (const d of ['logistics', 'ecommerce', 'finance'] as const) {
        const tickets = loadTickets(d);
        for (const s of SKILLS) for (const inDomain of [true, false]) expect(unlockNote(tickets, s.id, lang, inDomain), `${d} ${s.id}`).not.toMatch(RAW_ID);
      }
    }
    await setLang('vi');
    vi.unstubAllGlobals();
  });

  it('outside a domain the line points at the learning path, never at a domain task', () => {
    const tickets = loadTickets('logistics');
    const teaches = (id: string) => tickets.find((x) => x.grants.includes(id))!;
    expect(unlockNote(tickets, 'where', 'vi', false)).toBe(unlockNote(tickets, 'select', 'vi', false));
    expect(unlockNote(tickets, 'where', 'vi', true)).toContain(textOf(teaches('where'), 'vi').title);
  });
});
