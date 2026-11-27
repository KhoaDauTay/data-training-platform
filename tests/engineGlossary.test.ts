// v27 (L410): the Database Engine glossary (content/engine/glossary.yml), its routes and the lesson term marker.
import { describe, expect, it } from 'vitest';
import glossary from '../content/engine/glossary.yml';
import { aliasesOf, docFor, DOC_SITE, fold, marker, MAX_BUTTONS, parseGlossary, searchTerms, termSlug, type Term } from '../src/engine/glossary';
import { ENGINES, isRefEngine, LEVELS, parseEngineLesson, REF_ENGINES, type LessonSource, type RefEngine } from '../src/engine/content';
import { canonicalHash, engineInterviewHash, engineInterviewOf, engineRouteOf, engineTermsHash, engineTermsOf, interviewTabHash, interviewTabOf, parseRoute } from '../src/route';
import { parseUse } from '../src/ui/engineTerms';
import { TERMS_DICT } from '../src/i18n/engineTerms';

const terms = parseGlossary(glossary);
const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const spans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

describe('glossary.yml', () => {
  it('every entry parses, has an id = slug of its term, ids unique', () => {
    expect(terms.length).toBeGreaterThanOrEqual(390); // v48 (L1141): + 96 terms of the seven v47 tracks
    for (const t of terms) expect([t.term, t.id]).toEqual([t.term, termSlug(t.term)]);
    expect(new Set(terms.map((t) => t.id)).size).toBe(terms.length);
    for (const t of terms) expect(t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it('EN without diacritics, code spans VI = EN, `doc` on the official site of one of its engines', () => {
    for (const t of terms) {
      expect([t.id, DIACRITIC.test(t.en) || DIACRITIC.test(t.term)]).toEqual([t.id, false]);
      expect([t.id, spans(t.vi)]).toEqual([t.id, spans(t.en)]);
      expect([t.id, t.engines.some((e) => isRefEngine(e) && DOC_SITE[e].test(t.doc))]).toEqual([t.id, true]);
    }
  });
  it('v48 (L1140–L1141): every engine with reference material has 10+ terms; Design and Data stack have none', () => {
    for (const e of REF_ENGINES) expect([e, terms.filter((t) => t.engines.includes(e)).length >= 10]).toEqual([e, true]);
    expect(terms.some((t) => t.engines.includes('design') || t.engines.includes('stack'))).toBe(false);
    expect(() => parseGlossary([{ ...(glossary as Record<string, unknown>[])[0], engines: ['design'] }])).toThrow(/engines/);
  });
  it('v35 R1 (E09): a lesson shows its own engine\'s docs, never another product\'s', () => {
    const by = (id: string): Term => terms.find((t) => t.id === id)!;
    expect(docFor(by('session'), 'postgres')).toMatch(/^https:\/\/www\.postgresql\.org\/docs\/18\/sql-set\.html$/);
    expect(docFor(by('session'), 'mongodb')).toMatch(/mongodb\.com/);
    expect(docFor(by('primary-key'), 'design')).toMatch(/postgresql\.org/);
    expect(docFor(by('primary-key'), 'dynamodb')).toMatch(/amazondynamodb/);
    for (const t of terms) for (const e of t.engines) {
      const u = docFor(t, e);
      if (u) expect([t.id, e, DOC_SITE[e as RefEngine].test(u)]).toEqual([t.id, e, true]);
    }
    // v48 (L1141): a track reads its own sites; Design and Data stack read PostgreSQL's
    expect(docFor(by('ttl-time-to-live'), 'redis')).toMatch(/^https:\/\/valkey\.io\//);
    expect(docFor(by('counter-reset'), 'telemetry')).toMatch(/prometheus\.io/);
    expect(docFor(by('counter-reset'), 'timeseries')).toMatch(/postgresql\.org/);
    expect(docFor(by('change-data-capture-cdc'), 'stream')).toMatch(/debezium\.io/);
    expect(docFor(by('brin'), 'olap')).toMatch(/postgresql\.org/);
    expect(docFor(by('brin'), 'stack')).toMatch(/postgresql\.org/);
    expect(() => parseGlossary([{ ...(glossary as Record<string, unknown>[])[0], docs: { postgres: 'https://example.org/' } }])).toThrow(/docs/);
  });
  it('a broken entry throws (the page shows Retry, a lesson draws without buttons)', () => {
    expect(() => parseGlossary([{ id: 'x' }])).toThrow();
    expect(() => parseGlossary('nope')).toThrow();
  });
});

describe('routes #/engine/terms and #/engine/interview (route.ts)', () => {
  it('engineTermsOf: the page, a term, nothing else', () => {
    expect(engineTermsOf('#/engine/terms')).toBe('');
    expect(engineTermsOf('#/engine/terms/mvcc')).toBe('mvcc');
    expect(engineTermsOf('#/engine/terms/join-strategy-nested-loop-hash-join-merge-join')).toBe('join-strategy-nested-loop-hash-join-merge-join');
    expect(engineTermsOf('#/engine/terms/<b>')).toBe('');
    expect(engineTermsOf('#/engine/termsx')).toBeUndefined();
    expect(engineTermsOf('#/engine/postgres')).toBeUndefined();
    expect(engineTermsHash('mvcc')).toBe('#/engine/terms/mvcc');
    for (const t of terms) expect(engineTermsOf(engineTermsHash(t.id))).toBe(t.id);
  });
  it('v47 S4 (L980–L981): engineInterviewOf reads a set, the review run or a take-home inside the one room; the room itself is a tab', () => {
    expect(engineInterviewOf('#/learn/interview/pg-mid-2')).toEqual({ set: 'pg-mid-2' });
    expect(engineInterviewOf('#/learn/interview/again')).toEqual({ set: 'again' });
    expect(engineInterviewOf('#/learn/interview/e-iv-dy-th-4')).toEqual({ th: 'e-iv-dy-th-4' });
    expect(engineInterviewOf('#/learn/interview/mg-senior-4')).toEqual({ set: 'mg-senior-4' }); // v36: one extra senior set for MongoDB/DynamoDB
    for (const h of ['#/learn/interview', '#/learn/interview?e=mg', '#/learn/interview/xx-mid-2', '#/learn/interview/pg-mid-9', '#/learn/interview/pg-senior-4', '#/learn/interviews/pg-mid-2', '#/engine/interview/pg-mid-2']) {
      expect(engineInterviewOf(h)).toBeUndefined();
    }
    expect(engineInterviewHash('mg-staff-3')).toBe('#/learn/interview/mg-staff-3');
    expect(engineInterviewHash()).toBe('#/learn/interview?e=pg'); // the Databases hub and sidebar open the PostgreSQL tab
    expect(['#/learn/interview', '#/learn/interview?e=pg', '#/learn/interview?e=mg', '#/learn/interview?e=dy', '#/learn/interview?e=zz', '#/learn/interview/pg-mid-2?e=mg'].map(interviewTabOf))
      .toEqual(['sql', 'pg', 'mg', 'dy', 'sql', 'sql']);
    for (const tab of ['sql', 'pg', 'mg', 'dy'] as const) expect(interviewTabOf(interviewTabHash(tab))).toBe(tab);
  });
  it('the old #/engine/interview hashes are aliases kept forever (canonicalHash), all on the Học route', () => {
    const ALIAS: [string, string][] = [
      ['#/engine/interview', '#/learn/interview?e=pg'],
      ['#/engine/interview/', '#/learn/interview?e=pg'],
      ['#/engine/interview/pg-mid-2', '#/learn/interview/pg-mid-2'],
      ['#/engine/interview/mg-senior-4', '#/learn/interview/mg-senior-4'],
      ['#/engine/interview/again', '#/learn/interview/again'],
      ['#/engine/interview/e-iv-dy-th-4', '#/learn/interview/e-iv-dy-th-4'],
      ['#/engine/interview/xx-mid-2', '#/learn/interview?e=pg'], // an unknown tail opened the room
      ['engine/interview/pg-junior-1', 'engine/interview/pg-junior-1'], // not a hash
    ];
    for (const [old, now] of ALIAS) expect(canonicalHash(old)).toBe(now);
    expect(canonicalHash('#/engine/interviews')).toBe('#/engine/interviews');
    for (const [old] of ALIAS.slice(0, 7)) expect(parseRoute(old)).toBe('learn');
  });
  it('the glossary is an engine page, never an engine/level/lesson', () => {
    for (const h of ['#/engine/terms', '#/engine/terms/acid']) {
      expect(parseRoute(h)).toBe('engine');
      expect(engineRouteOf(h)).toEqual({ engine: undefined, level: undefined, lesson: undefined });
    }
  });
});

const T = (id: string, term: string, level: Term['level'], engines: Term['engines'] = ['postgres'], extra: Partial<Term> = {}): Term =>
  ({ id, term, level, engines, keepEn: true, viTerm: term, avoid: '', vi: 'x', en: 'x', doc: 'https://www.postgresql.org/docs/18/', ...extra });

describe('first-mention marker (design-v27 Q2)', () => {
  const g = [T('mvcc', 'MVCC', 'L3'), T('heap', 'heap', 'L1'), T('covering-index', 'covering index', 'L3'), T('index', 'index', 'L3'),
    T('scan', 'Scan', 'L1', ['dynamodb']), T('wal', 'WAL', 'L2', ['postgres'], { match: ['WAL', 'write-ahead log'] })];
  const buttons = (p: ReturnType<ReturnType<typeof marker>['mark']>): string[] => p.flatMap((x) => (typeof x === 'string' || !x.button ? [] : [x.text]));
  it('only the first mention, only at or above the lesson level, only the lesson engine', () => {
    const m = marker(g, 'postgres', 'L2');
    expect(buttons(m.mark('MVCC keeps old rows in the heap; MVCC again. Scan is DynamoDB.'))).toEqual(['MVCC']);
    expect(buttons(m.mark('MVCC once more, then the write-ahead log and WAL.'))).toEqual(['write-ahead log']);
    expect(m.seen.map((t) => t.id)).toEqual(['mvcc', 'heap', 'wal']); // heap (L1 < L2) is listed, never a button
  });
  it('the longer term wins; a shorter one inside it is no mention', () => {
    const m = marker(g, 'postgres', 'L1');
    expect(buttons(m.mark('A covering index is an index.'))).toEqual(['covering index', 'index']);
    expect(buttons(marker(g, 'postgres', 'L1').mark('covering index only'))).toEqual(['covering index']);
  });
  it('exact case, except a lower-case phrase may start a sentence; word edges', () => {
    expect(buttons(marker(g, 'postgres', 'L1').mark('mvcc, Heap, heap'))).toEqual(['heap']); // "Explain why…" is no mention of explain
    expect(buttons(marker(g, 'postgres', 'L1').mark('Covering index first.'))).toEqual(['Covering index']);
    expect(buttons(marker(g, 'dynamodb', 'L1').mark('a scan, then a Scan'))).toEqual(['Scan']);
    expect(buttons(marker(g, 'postgres', 'L1').mark('heaps and reindexing'))).toEqual([]);
  });
  it('text round-trips; at most MAX_BUTTONS per lesson', () => {
    const many = Array.from({ length: 20 }, (_, i) => T(`t${i}`, `term${String.fromCharCode(97 + i)}`, 'L1'));
    const m = marker(many, 'postgres', 'L1');
    const text = many.map((t) => t.term).join(' ');
    const out = m.mark(text);
    expect(out.map((x) => (typeof x === 'string' ? x : x.text)).join('')).toBe(text);
    expect(buttons(out)).toHaveLength(MAX_BUTTONS);
  });
  it('aliases: match, else term and VI word without a "(…)" note (never split: "simple" alone is no term)', () => {
    expect(aliasesOf(T('a', 'simple / composite primary key', 'L1', ['dynamodb'], { viTerm: 'khóa đơn / khóa kép' }))).toEqual(['simple / composite primary key', 'khóa đơn / khóa kép']);
    expect(aliasesOf(T('b', 'window function ($setWindowFields)', 'L1', ['mongodb'], { viTerm: '`$setWindowFields`' }))).toEqual(['window function', '$setWindowFields']);
  });
  it('search: no diacritics, any case, every word; engine and level filters', () => {
    expect(fold('Tính Nguyên Tử đ')).toBe('tinh nguyen tu d');
    const all = new Set(ENGINES), lv = new Set(LEVELS);
    expect(searchTerms(terms, 'tinh nguyen tu', all, lv).map((t) => t.id)).toContain('atomicity');
    expect(searchTerms(terms, 'MVCC', new Set(['dynamodb'] as const), lv)).toEqual([]);
    expect(searchTerms(terms, '', all, new Set(['L1'] as const)).every((t) => t.level === 'L1')).toBe(true);
  });
});

describe('the marker on the real Engine lessons (objectives + sections, code spans left out)', () => {
  const files = import.meta.glob<LessonSource>('../content/engine/*/L*/*.md', { query: '?fm', import: 'default', eager: true });
  const lessons = Object.entries(files).map(([p, s]) => parseEngineLesson(s, p));
  it('≤ 15 buttons per lesson, most lessons get at least one, no term in a code span', () => {
    let some = 0;
    for (const l of lessons) { // v48 (L1143): every engine but Design and Data stack has terms, so the ratio counts every lesson again
      for (const lang of ['vi', 'en'] as const) {
        const m = marker(terms, l.engine, l.level);
        const texts = [...l.objectives.map((o) => o[lang]), ...l.sections.map((s) => s.text[lang])];
        const pieces = texts.flatMap((x) => x.split(/(`[^`\n]+`)/).filter((p) => !p.startsWith('`')).flatMap((p) => m.mark(p)));
        const n = pieces.filter((p) => typeof p !== 'string' && p.button).length;
        expect([l.id, n <= MAX_BUTTONS]).toEqual([l.id, true]);
        if (lang === 'vi' && n) some++;
      }
    }
    expect(some / lessons.length).toBeGreaterThan(0.6);
  });
});

describe('pref cargo-query/engine-terms and the chunk rule', () => {
  it('parseUse never throws and keeps only glossary ids and positive counts', () => {
    const ids = new Set(['mvcc']);
    for (const bad of [null, 'x', 3, [], { opened: 'x', page: -1 }]) expect(parseUse(bad, ids)).toEqual({ opened: {}, page: 0 });
    expect(parseUse({ opened: { mvcc: 2, nope: 4, heap: 0 }, page: 3 }, ids)).toEqual({ opened: { mvcc: 2 }, page: 3 });
  });
  it('VI/EN text: placeholders, EN differs, EN without diacritics, code spans equal', () => {
    for (const [k, v] of Object.entries(TERMS_DICT.vi)) {
      const e = TERMS_DICT.en[k as keyof typeof TERMS_DICT.en];
      expect([k, [...e.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()]).toEqual([k, [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()]);
      expect([k, e]).not.toEqual([k, v]);
      expect([k, DIACRITIC.test(e)]).toEqual([k, false]);
      expect([k, spans(v)]).toEqual([k, spans(e)]);
    }
  });
  const files = import.meta.glob<string>(['../src/ui/engineTerms.ts', '../src/ui/engineInterview.ts', '../src/i18n/engineTerms.ts', '../src/i18n/engineInterview.ts', '../src/engineTermsSources.ts', '../src/ui/ivTabs.ts'], { query: '?raw', import: 'default', eager: true });
  it.each(Object.keys(files))('lazy chunk %s imports no value from a main module (Plan 6 U3)', (f) => {
    const values = [...files[f].matchAll(/^import (?!type )[^;]*? from '([^']+)';/gm)].map((m) => m[1]);
    // v47 S4 (L982): ./ivTabs is the room's tab bar, shared by the two lazy interview chunks (itself type-only imports)
    for (const v of values) expect([f, v]).toEqual([f, expect.stringMatching(/^(\.\.\/engine\/\w+|\.\.\/i18n\/engine\w*|\.\/ivTabs)$/)]);
  });
});
