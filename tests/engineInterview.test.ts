// v27 (L411): the Database Engine interview bank (content/engine/iv-<engine>.yml), its sets, the room's device pref, and every
// runnable part re-run: each `pglite-0.5.16` exhibit on a fresh PGlite equals its recorded `shown`, each Postgres take-home
// query runs on its fixture, each `aws-rules` calc expression equals its `expect` (evaluated here only, never in the app).
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import pg from '../content/engine/iv-postgres.yml';
import mg from '../content/engine/iv-mongodb.yml';
import dy from '../content/engine/iv-dynamodb.yml';
import { ALL_SETS, BANDS, exhibitScript, parseBank, setOf, setQuestions, type Bank } from '../src/engine/interviewBank';
import { dayPlus, dueAgain, IV_KEY, parseIvPrefs, shareOf } from '../src/engine/engineInterviewPrefs';
import { IV_DICT } from '../src/i18n/engineInterview';
import { ENGINE_ID, emptySave, INTERVIEW_ID, isWorkId, parseSave, serializeSave, type Known } from '../src/save';

const banks: Record<string, Bank> = { postgres: parseBank(pg), mongodb: parseBank(mg), dynamodb: parseBank(dy) };
const all = Object.values(banks);
const questions = all.flatMap((b) => b.questions);
const takeHomes = all.flatMap((b) => b.takeHomes);
const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const spans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

describe('bank shape', () => {
  it('180 questions, 12 take-homes, ids unique and matching engine/band; each file holds only its engine', () => {
    expect(questions).toHaveLength(180);
    expect(takeHomes).toHaveLength(12);
    expect(new Set([...questions, ...takeHomes].map((q) => q.id)).size).toBe(192);
    for (const [e, b] of Object.entries(banks)) for (const q of [...b.questions, ...b.takeHomes]) expect([q.id, q.engine]).toEqual([q.id, e]);
    const code = { postgres: 'pg', mongodb: 'mg', dynamodb: 'dy' } as const;
    for (const q of questions) expect(q.id.startsWith(`e-iv-${code[q.engine]}-${q.band}-`)).toBe(true);
    for (const t of takeHomes) expect(t.id.startsWith(`e-iv-${code[t.engine]}-th-`)).toBe(true);
  });
  it('fields by kind: rubric 3–5, design ≥ 2 trade-offs, only diagnose has exhibits, docs links, mongodb-docs has a url', () => {
    for (const q of questions) {
      expect([q.id, q.rubric.length >= 3 && q.rubric.length <= 5]).toEqual([q.id, true]);
      if (q.kind === 'design') expect([q.id, q.tradeoffs.length >= 2]).toEqual([q.id, true]);
      expect([q.id, q.kind === 'diagnose' || !q.exhibits.length]).toEqual([q.id, true]);
      if (q.kind === 'diagnose') expect([q.id, q.exhibits.length > 0]).toEqual([q.id, true]);
      expect(q.doc).toMatch(/^https:\/\//);
      for (const x of q.exhibits) {
        if (x.source === 'mongodb-docs') expect(x.url).toMatch(/^https:\/\/www\.mongodb\.com\/docs\//);
        if (x.source === 'aws-rules') expect(x.calc?.length).toBeGreaterThan(0);
        if (x.source === 'pglite-0.5.16') expect([q.id, !!exhibitScript(banks.postgres, x)]).toEqual([q.id, true]);
      }
    }
    for (const t of takeHomes) expect([t.id, t.rubric.length >= 3 && t.rubric.length <= 5 && t.deliverables.length > 0]).toEqual([t.id, true]);
  });
  it('VI/EN: code spans equal, EN without diacritics', () => {
    const pairs = [...questions.flatMap((q) => [q.q, q.answer, ...q.rubric, ...q.tradeoffs, ...q.exhibits.map((x) => x.label)]),
      ...takeHomes.flatMap((t) => [t.title, t.brief, t.model, ...t.rubric, ...t.deliverables])];
    for (const p of pairs) {
      expect([p.en.slice(0, 60), DIACRITIC.test(p.en)]).toEqual([p.en.slice(0, 60), false]);
      expect([p.en.slice(0, 60), spans(p.vi)]).toEqual([p.en.slice(0, 60), spans(p.en)]);
    }
  });
});

describe('sets (design-v27 §2.2, bank header)', () => {
  it('36 sets × 5 questions of one engine and band, exactly the ids the room lists', () => {
    expect([...new Set(questions.map((q) => q.set))].sort()).toEqual([...ALL_SETS].sort());
    for (const set of ALL_SETS) {
      const s = setOf(set)!;
      const qs = setQuestions(banks[s.engine], set);
      expect([set, qs.length]).toEqual([set, 5]);
      for (const q of qs) expect([q.id, q.engine, q.band]).toEqual([q.id, s.engine, s.band]);
      expect([set, qs.some((q) => q.kind === 'diagnose')]).toEqual([set, true]);
      expect([set, qs.filter((q) => q.kind === 'concept').length <= 4]).toEqual([set, true]);
      if (s.engine === 'postgres') expect([set, qs.some((q) => q.exhibits.some((x) => x.source === 'pglite-0.5.16'))]).toEqual([set, true]);
    }
  });
  it('a band with design questions has at least one set holding one', () => {
    for (const [e, b] of Object.entries(banks)) for (const band of BANDS) {
      const cell = b.questions.filter((q) => q.band === band);
      if (cell.some((q) => q.kind === 'design')) expect([e, band, new Set(cell.filter((q) => q.kind === 'design').map((q) => q.set)).size >= 1]).toEqual([e, band, true]);
    }
  });
});

describe('runnable parts', () => {
  it('every aws-rules calc expression equals its expect (evaluated in the test only)', () => {
    for (const q of questions) for (const x of q.exhibits) for (const c of x.calc ?? []) {
      expect([q.id, c.expr, new Function(`return (${c.expr});`)()]).toEqual([q.id, c.expr, c.expect]);
    }
  });

  const statements = (sql: string): string[] => sql.split(';').map((s) => s.trim()).filter(Boolean);
  async function fresh(setup: string): Promise<PGlite> {
    const db = new PGlite();
    for (const s of statements(setup)) await db.exec(s); // one by one: VACUUM cannot run in a multi-statement exec
    return db;
  }
  const exhibits = questions.flatMap((q) => q.exhibits.filter((x) => x.source === 'pglite-0.5.16').map((x, i) => [`${q.id} #${i}`, x] as const));
  it('23 pglite exhibits', () => expect(exhibits).toHaveLength(23));
  it.each(exhibits)('%s re-runs to its recorded `shown` on a fresh PGlite 0.5.16', async (_, x) => {
    const s = exhibitScript(banks.postgres, x)!;
    const db = await fresh(s.setup);
    try {
      const r = await db.query<unknown[]>(s.sql, [], { rowMode: 'array' });
      expect(r.rows.map((row) => String(row[0])).join('\n').trim()).toBe(x.shown.trim());
    } finally {
      await db.close();
    }
  }, 120_000);
  it.each(takeHomes.filter((t) => t.fixture).map((t) => [t.id, t] as const))('take-home %s: every query runs on its fixture', async (_, t) => {
    const db = await fresh(banks.postgres.fixtures[t.fixture!]);
    try {
      for (const q of t.queries) await expect(db.query(q)).resolves.toBeDefined();
    } finally {
      await db.close();
    }
  }, 120_000);
});

describe('pref cargo-query/engine-interview (never the Save)', () => {
  it('bad data never throws and is dropped', () => {
    for (const bad of [null, 1, 'x', [], { results: [], live: 'x', th: 3, again: null, noted: {} }]) {
      expect(parseIvPrefs(bad)).toEqual({ results: {}, live: {}, th: {}, again: {}, noted: [] });
    }
    const p = parseIvPrefs({
      results: { 'pg-mid-2': { at: '2026-11-24', score: 7, total: 15, ms: 1000, skipped: 1 }, 'zz-mid-2': { at: 'x' } },
      live: { 'pg-mid-2': { qs: ['e-iv-pg-mid-01', 'nope'], i: 9, answers: ['a'.repeat(5000)], ticks: [[0, 1, 99]], timer: true } },
      th: { 'e-iv-pg-th-1': { drafts: ['x'], ticks: [1], at: 'now' }, 'e-iv-xx-th-1': {} },
      again: { 'e-iv-pg-mid-01': '2026-11-25', 'e-iv-pg-mid-02': 'tomorrow' },
    });
    expect(Object.keys(p.results)).toEqual(['pg-mid-2']);
    expect(p.live['pg-mid-2']).toMatchObject({ qs: ['e-iv-pg-mid-01'], i: 1, ticks: [[0, 1]], timer: true, shown: [false] });
    expect(p.live['pg-mid-2'].answers[0]).toHaveLength(4000);
    expect(Object.keys(p.th)).toEqual(['e-iv-pg-th-1']);
    expect(p.again).toEqual({ 'e-iv-pg-mid-01': '2026-11-25' });
  });
  it('review: due questions by local day, 1 then 3 days; self-score share', () => {
    expect(dayPlus('2026-12-31', 1)).toBe('2027-01-01');
    const p = parseIvPrefs({ again: { 'e-iv-pg-mid-01': '2026-11-24', 'e-iv-mg-mid-01': '2026-11-20', 'e-iv-dy-mid-01': '2026-11-25' } });
    expect(dueAgain(p, '2026-11-24')).toEqual(['e-iv-mg-mid-01', 'e-iv-pg-mid-01']);
    expect(shareOf([0, 0, 2], 3)).toBeCloseTo(2 / 3);
    expect(IV_KEY).toBe('cargo-query/engine-interview');
  });
  it('e-iv- ids are never work ids: parseSave drops them (like g-iv-, L144)', () => {
    const known: Known = { ticketIds: new Set(['ch1-01']), laneIds: new Set(), skills: new Set() };
    for (const id of ['e-iv-pg-mid-01', 'e-iv-dy-th-2']) expect([id, ENGINE_ID.test(id), isWorkId(new Set(), id)]).toEqual([id, false, false]);
    expect(INTERVIEW_ID.test('e-iv-pg-mid-01')).toBe(false); // the General pattern; the Engine one never matches ENGINE_ID
    const raw = JSON.parse(serializeSave(emptySave()));
    raw.completed = ['ch1-01', 'e-iv-pg-mid-01', 'e-iv-pg-th-1'];
    expect(parseSave(JSON.stringify(raw), known).completed).toEqual(['ch1-01']);
  });
  it('VI/EN text: placeholders, EN differs, EN without diacritics, code spans equal', () => {
    for (const [k, v] of Object.entries(IV_DICT.vi)) {
      const e = IV_DICT.en[k as keyof typeof IV_DICT.en];
      expect([k, [...e.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()]).toEqual([k, [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()]);
      expect([k, e]).not.toEqual([k, v]);
      expect([k, DIACRITIC.test(e)]).toEqual([k, false]);
      expect([k, spans(v)]).toEqual([k, spans(e)]);
    }
  });
});
