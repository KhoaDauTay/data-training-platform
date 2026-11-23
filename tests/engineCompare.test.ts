// v28 E-CMP + LINK (L430–L433): the "Which engine?" page content (src/engine/compare.ts) and the "Đào sâu" table
// (src/engine/deepLinks.ts). Every `run` number on the page is measured again on PGlite, mingo and dynoxide
// (tests/engineCompare.measure.ts); every other number is a docs fact with its page; only a scenario's question (its premise)
// may hold digits of its own. Plus: VI/EN rules, lesson targets exist, routes.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { AXES, CMP_ENGINES, FACTS, fill, placeholders, SCENARIOS, type Txt } from '../src/engine/compare';
import { DEEP, TITLES } from '../src/engine/deepLinks';
import { engineCompareHash, engineCompareOf, engineRouteOf, engineTermsOf, parseRoute } from '../src/route';
import { measure } from './engineCompare.measure';

const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const spans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
/** Every text on the page, with where it sits and whether it is a scenario's premise. */
const texts: { at: string; t: Txt; premise?: boolean }[] = [
  ...AXES.flatMap((a) => [{ at: `${a.id}.title`, t: a.title }, { at: `${a.id}.ask`, t: a.ask },
    ...CMP_ENGINES.map((e) => ({ at: `${a.id}.${e}`, t: a.cells[e].text }))]),
  ...Object.entries(FACTS).flatMap(([id, f]) => (f.text ? [{ at: `fact ${id}`, t: f.text }] : [])),
  ...SCENARIOS.flatMap((s) => [{ at: `${s.id}.q`, t: s.q, premise: true }, { at: `${s.id}.why`, t: s.why },
    ...s.options.map((o, i) => ({ at: `${s.id}.o${i}`, t: o }))]),
];

describe('#/engine/compare: content', () => {
  it('nine axes, three engines each; twelve scenarios with a trap that is not the answer', () => {
    expect(AXES.map((a) => a.id)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']);
    for (const a of AXES) expect(Object.keys(a.cells).sort()).toEqual([...CMP_ENGINES].sort());
    expect(SCENARIOS.map((s) => s.id)).toEqual(Array.from({ length: 12 }, (_, i) => `S${i + 1}`));
    for (const s of SCENARIOS) {
      expect([s.id, s.options.length >= 3, s.answer in s.options, s.trap in s.options, s.trap !== s.answer]).toEqual([s.id, true, true, true, true]);
    }
  });

  it('VI/EN: code spans identical, EN without diacritics, no empty text', () => {
    for (const { at, t } of texts) {
      expect([at, spans(t.vi)]).toEqual([at, spans(t.en)]);
      expect([at, DIACRITIC.test(t.en)]).toEqual([at, false]);
      expect([at, !!t.vi.trim() && !!t.en.trim()]).toEqual([at, true]);
    }
  });

  it('a number only through a fact placeholder (a scenario question may state its premise); every placeholder resolves', () => {
    for (const { at, t, premise } of texts) for (const s of [t.vi, t.en]) {
      for (const [id, i] of placeholders(s)) expect([at, id, FACTS[id]?.values[i] !== undefined]).toEqual([at, id, true]);
      expect([at, fill(s, String)]).not.toEqual([at, expect.stringMatching(/\{\w+\.\d+\}/)]);
      if (premise) continue;
      // index key specs such as `{ customerId: 1 }` are syntax, not figures; P1 or 22P02 are names (a letter before the digit)
      const bare = s.replace(/\{\w+\.\d+\}/g, '').replace(/`\{[^`]*\}`/g, '');
      expect([at, bare.match(/(?<![A-Za-z\d])\d/)?.[0]]).toEqual([at, undefined]);
    }
  });

  it('every evidence id is a fact with a sentence; every fact with a sentence is shown somewhere', () => {
    const listed = new Set([...AXES.flatMap((a) => a.facts), ...SCENARIOS.flatMap((s) => s.facts)]);
    for (const id of listed) expect([id, !!FACTS[id]?.text]).toEqual([id, true]);
    expect(Object.entries(FACTS).filter(([id, f]) => f.text && !listed.has(id)).map(([id]) => id)).toEqual([]);
  });

  it('a docs fact names an official docs page; sources are https docs pages', () => {
    const DOCS = /^https:\/\/(docs\.aws\.amazon\.com|www\.mongodb\.com\/docs|www\.postgresql\.org\/docs)\//;
    for (const [id, f] of Object.entries(FACTS)) if (f.src !== 'run') expect([id, f.src]).toEqual([id, expect.stringMatching(DOCS)]);
    for (const a of AXES) for (const u of a.sources) expect([a.id, u]).toEqual([a.id, expect.stringMatching(DOCS)]);
  });

  it('every measured figure is what the three runtimes give now (PGlite, mingo, dynoxide)', async () => {
    const got = await measure();
    const run = Object.entries(FACTS).filter(([, f]) => f.src === 'run');
    expect(Object.keys(got).sort()).toEqual(run.map(([id]) => id).sort());
    for (const [id, f] of run) expect([id, got[id]]).toEqual([id, f.values]);
  }, 120_000);
});

// ---- lessons the page and the chips link to

const files = import.meta.glob<string>('../content/engine/*/L*/*.md', { query: '?raw', import: 'default', eager: true });
const lessons = new Map(Object.values(files).map((raw) => {
  const fm = parse(raw.split(/^---$/m)[1]) as { id: string; title: string; title_en: string };
  return [fm.id, [fm.title, fm.title_en]] as const;
}));
const skills = new Set((parse(Object.values(import.meta.glob<string>('../content/skills.yml', { query: '?raw', import: 'default', eager: true }))[0]) as { id: string }[]).map((s) => s.id));
const adv = Object.values(import.meta.glob<string>('../content/general/adv.yml', { query: '?raw', import: 'default', eager: true }))[0];

describe('links into the Engine lessons', () => {
  it('every axis lesson exists', () => {
    for (const a of AXES) for (const id of a.lessons) expect([a.id, id, lessons.has(id)]).toEqual([a.id, id, true]);
  });
  it('"Đào sâu": keys are General skills or advanced nodes, every target exists, titles equal the lessons\' own', () => {
    for (const [k, ids] of Object.entries(DEEP)) {
      expect([k, skills.has(k) || new RegExp(`^- id: ${k}$`, 'm').test(adv)]).toEqual([k, true]);
      expect([k, ids.length > 0 && ids.length <= 3]).toEqual([k, true]);
      for (const id of ids) expect([k, id, lessons.has(id), TITLES[id]]).toEqual([k, id, true, lessons.get(id)]);
    }
    expect(Object.keys(TITLES).sort()).toEqual([...new Set(Object.values(DEEP).flat())].sort());
    expect(Object.keys(DEEP).filter((k) => skills.has(k)).length).toBeGreaterThanOrEqual(25);
  });
});

describe('routes', () => {
  it('#/engine/compare parses before the engine route, which never mistakes it for an engine', () => {
    expect(engineCompareOf('#/engine/compare')).toBe(true);
    expect(engineCompareOf('#engine/compare')).toBe(true);
    expect(engineCompareOf('#/engine/compare?x=1')).toBe(true);
    expect(engineCompareOf('#/engine/comparex')).toBe(false);
    expect(engineCompareOf('#/engine/postgres')).toBe(false);
    expect(engineCompareOf('#/engine')).toBe(false);
    expect(engineCompareOf(engineCompareHash())).toBe(true);
    expect(engineRouteOf('#/engine/compare')).toEqual({});
    expect(engineTermsOf('#/engine/compare')).toBeUndefined();
    expect(parseRoute('#/engine/compare')).toBe('engine');
  });
});
