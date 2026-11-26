// v43 (L720–L725): the PostgreSQL Extensions shelf. Routes kept forever, no XP, never in a tree (so never in the L1–L5
// rows, the badges or the skill map), ids kept by the Save without a version bump, and the lab runtime's extension list.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import v5 from './fixtures/save-v5.json?raw';
import { DOCS_WHY, docsNoteKey, ENGINE_XP, engineXp, parseEngineLesson, treeOf, type EngineLesson, type Lab } from '../src/engine/content';
import { extensionsOf, loadOnlyOf, pgScriptRunner } from '../src/engine/pglab/runner';
import { EXTENSIONS, runLabScript } from '../src/engine/pglab/session';
import { grade } from '../src/grader';
import { badges, engineLevels } from '../src/mastery';
import { paletteItems } from '../src/palette';
import { engineHash, enginePlayOf, engineRouteOf, parseRoute } from '../src/route';
import { ENGINE_ID, parseSave, type Known } from '../src/save';
import { ENGINE_DICT } from '../src/i18n/engine';

const files = import.meta.glob<string>('../content/engine/postgres/{L*,ext}/*.md', { query: '?raw', import: 'default', eager: true });
const all: EngineLesson[] = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p, parse));
const ext = all.filter((l) => l.level === 'EXT');
const known: Known = { ticketIds: new Set(['ch1-01']), laneIds: new Set(), skills: new Set(['select']) };

/** A minimal shelf lesson (the shelf may still be empty while its lessons are written). */
const SAMPLE = `---
id: e-pg-ext-99
engine: postgres
level: EXT
module: ext-basics
title: "Mẫu"
title_en: "Sample"
kind: concept
minutes: 5
objectives:
  - { vi: "Một", en: "One" }
sources: [https://www.postgresql.org/docs/18/sql-createextension.html]
---
## Ý chính

Một.

# EN

## Key idea

One.
`;
const sample = parseEngineLesson(SAMPLE, 'content/engine/postgres/ext/99-sample.md', parse);

describe('route #/engine/postgres/ext (kept forever)', () => {
  it('the shelf and its lessons; ext only under postgres', () => {
    expect(parseRoute('#/engine/postgres/ext')).toBe('engine');
    expect(engineRouteOf('#/engine/postgres/ext')).toEqual({ engine: 'postgres', level: 'EXT', lesson: undefined });
    expect(engineRouteOf('#/engine/postgres/ext/e-pg-ext-02')).toEqual({ engine: 'postgres', level: 'EXT', lesson: 'e-pg-ext-02' });
    expect(engineRouteOf('#/engine/mongodb/ext')).toEqual({ engine: 'mongodb' });
    expect(engineRouteOf('#/engine/postgres/extra')).toEqual({ engine: 'postgres', level: undefined, lesson: undefined });
    expect(engineHash('postgres', 'EXT')).toBe('#/engine/postgres/ext');
    expect(engineHash('postgres', 'EXT', 'e-pg-ext-02')).toBe('#/engine/postgres/ext/e-pg-ext-02');
    expect(engineRouteOf(engineHash('postgres', 'EXT', 'e-pg-ext-02')).lesson).toBe('e-pg-ext-02');
    expect(enginePlayOf('#/engine/play/e-pg-ext-02')).toBeUndefined();
  });
  it('the search palette lists a shelf lesson under "PostgreSQL · Extensions" with the shelf hash', () => {
    const items = paletteItems({ skills: [], terms: [], lessons: { x: { fm: { id: 'e-pg-ext-02', engine: 'postgres', level: 'EXT', title: 'A', title_en: 'B' } } } },
      'en', { skill: (id) => id, lesson: engineHash, term: (id) => id });
    expect(items).toEqual([{ kind: 'lesson', title: 'B', sub: 'PostgreSQL · Extensions', href: '#/engine/postgres/ext/e-pg-ext-02' }]);
  });
});

describe('parse: level EXT', () => {
  it('ext/ → level EXT, id e-pg-ext-NN; only under postgres', () => {
    expect([sample.level, sample.id]).toEqual(['EXT', 'e-pg-ext-99']);
    expect(() => parseEngineLesson(SAMPLE.replace('postgres', 'mongodb').replace('e-pg-', 'e-mg-'), 'content/engine/mongodb/ext/99-sample.md', parse)).toThrow(/ext/);
    expect(() => parseEngineLesson(SAMPLE.replace('level: EXT', 'level: L1'), 'content/engine/postgres/ext/99-sample.md', parse)).toThrow(/level/);
    expect(ENGINE_ID.test('e-pg-ext-01')).toBe(true);
  });
  it('docs_why: ext has its own notice, VI and EN', () => {
    expect(DOCS_WHY).toContain('ext');
    expect(docsNoteKey({ engine: 'postgres', docsWhy: 'ext' })).toBe('runtime.docs.ext');
    expect(ENGINE_DICT.vi['runtime.docs.ext']).toBeTruthy();
    expect(ENGINE_DICT.en['runtime.docs.ext']).toBeTruthy();
    expect([ENGINE_DICT.vi['complete.noxp'], ENGINE_DICT.en['complete.noxp']]).toEqual(['Xong bài.', 'Lesson done.']);
  });
});

describe('no XP, no badge, no level row (L721)', () => {
  const shelf = [sample, ...ext];
  it('every shelf lesson gives 0 XP, first time or not; the levels keep theirs', () => {
    for (const l of shelf) expect([l.id, engineXp(l, false), engineXp(l, true)]).toEqual([l.id, 0, 0]);
    const l1 = all.find((l) => l.level === 'L1')!;
    expect(engineXp(l1, false)).toBe(ENGINE_XP[l1.kind]);
  });
  it('treeOf never holds a shelf lesson (L1–L5 rows, engineLevels, badges, skill map)', () => {
    const tree = treeOf('postgres', [...all, sample]);
    const ids = tree.levels.flatMap((lv) => lv.modules.flatMap((m) => m.lessons.map((l) => l.id)));
    expect(ids.filter((id) => id.startsWith('e-pg-ext-'))).toEqual([]);
    expect(tree.levels.map((lv) => lv.level)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
  });
  it('a save with every shelf lesson done earns the same badges and XP as one without', () => {
    const tree = treeOf('postgres', [...all, sample]);
    const base = JSON.parse(v5) as { completed: string[]; xp: number };
    const withExt = parseSave(JSON.stringify({ ...base, completed: [...base.completed, ...shelf.map((l) => l.id)] }), known);
    const without = parseSave(v5, known);
    expect(withExt.completed.filter((id) => id.startsWith('e-pg-ext-'))).toEqual(shelf.map((l) => l.id)); // kept, no version bump
    expect(withExt.version).toBe(without.version);
    expect(withExt.xp).toBe(without.xp);
    const input = (done: Set<string>) => ({ parts: [], levels: new Map(), foundation: [], perf: [], completed: done, engines: { postgres: engineLevels(tree, done) }, domains: [] });
    expect(badges(input(new Set(withExt.completed)))).toEqual(badges(input(new Set(without.completed))));
  });
});

describe('lab runtime: an install step is graded (L725)', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 200) }, { run: runLabScript, reset: () => undefined });
  const lab: Lab = {
    setup: 'CREATE TABLE staff (id int PRIMARY KEY, email text)',
    steps: [
      { task: { vi: 'a', en: 'a' }, hint: { vi: 'a', en: 'a' }, check: 'rows', ordered: false, solution: 'CREATE EXTENSION citext', after: "SELECT extname FROM pg_extension WHERE extname = 'citext'" },
      { task: { vi: 'b', en: 'b' }, hint: { vi: 'b', en: 'b' }, check: 'rows', ordered: false, solution: "SELECT 'A'::citext = 'a' AS same" },
    ],
  };
  it('loadOnlyOf: the Solutions\' plain CREATE EXTENSION, not the setup\'s', () => {
    expect(loadOnlyOf(lab)).toEqual(['citext']);
    expect(loadOnlyOf({ ...lab, setup: 'CREATE EXTENSION IF NOT EXISTS citext' })).toEqual([]);
  });
  it('skipping the install fails it; a later step still has the extension (replay)', async () => {
    expect(await runner.check(lab, lab.steps[0], 'SELECT 1')).toMatchObject({ ok: false });
    expect(await runner.check(lab, lab.steps[0], 'CREATE EXTENSION citext')).toMatchObject({ ok: true });
    expect(await runner.check(lab, lab.steps[1], "SELECT 'A'::citext = 'a' AS same")).toMatchObject({ ok: true });
  }, 60_000);
});

describe('lab runtime: the shelf\'s extensions (L723–L725)', () => {
  it('every new extension is offered, "uuid-ossp" keeps its hyphen', () => {
    for (const x of ['citext', 'fuzzystrmatch', 'unaccent', 'uuid-ossp', 'hstore', 'tablefunc', 'vector']) expect(Object.hasOwn(EXTENSIONS, x)).toBe(true);
    expect(extensionsOf('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')).toEqual(['uuid-ossp']);
    expect(extensionsOf('CREATE EXTENSION citext')).toEqual(['citext']);
  });
  it('functions, types and operators name their extension', () => {
    expect(extensionsOf("SELECT unaccent('Đèn')")).toEqual(['unaccent']);
    expect(extensionsOf("SELECT levenshtein('VNDAD', 'VNDDA')")).toEqual(['fuzzystrmatch']);
    expect(extensionsOf('SELECT uuid_generate_v5(uuid_ns_url(), $$x$$)')).toEqual(['uuid-ossp']);
    expect(extensionsOf('SELECT * FROM crosstab($$a$$, $$b$$) AS t(c text)')).toEqual(['tablefunc']);
    expect(extensionsOf("SELECT crypt('pw', gen_salt('bf', 8))")).toEqual(['pgcrypto']);
    expect(extensionsOf("SELECT word_similarity('a', 'b')")).toEqual(['pg_trgm']);
    expect(extensionsOf('CREATE TABLE u (email citext)')).toEqual(['citext']);
    expect(extensionsOf("SELECT 'a=>1'::hstore")).toEqual(['hstore']);
    expect(extensionsOf('CREATE TABLE p (v vector(4))')).toEqual(['vector']);
    expect(extensionsOf("SELECT id FROM p ORDER BY v <=> '[1,0,0,0]' LIMIT 3")).toEqual(['vector']);
    // `<->` alone is shared (PostGIS, pg_trgm, cube): it names nothing
    expect(extensionsOf('SELECT a <-> b FROM t')).toEqual([]);
    // prose words are not calls
    expect(extensionsOf('SELECT 1 -- the difference')).toEqual([]);
  });
});
