// F12 (L490): the search palette's index (General skills, Engine lessons, glossary terms) and its routes; {mod}+K.
import { describe, expect, it } from 'vitest';
import { ENGINES } from '../src/engine/content';
import { meta } from '../src/engineSources';
import { glossary } from '../src/engineTermsSources';
import { fold, paletteItems, search, type PaletteSources } from '../src/palette';
import { ROUTE_SKILLS } from '../src/progress';
import { engineHash, engineRouteOf, engineTermsHash, engineTermsOf, interviewTabHash, interviewTabOf, isInterviewPage, learnSkillOf } from '../src/route';
import { opensSearch } from '../src/ui/search';

const hashes = { skill: (id: string) => `#/learn/skill/${id}`, lesson: engineHash, term: (id: string) => engineTermsHash(id) };
const src: PaletteSources = { skills: ROUTE_SKILLS, lessons: meta, terms: glossary };

describe('search palette (F12)', () => {
  it('indexes every route skill, every Engine lesson and every glossary term, each with a hash the router opens', () => {
    for (const lang of ['vi', 'en'] as const) {
      const all = paletteItems(src, lang, hashes);
      const by = (k: string) => all.filter((x) => x.kind === k);
      expect(by('skill')).toHaveLength(ROUTE_SKILLS.length);
      expect(by('lesson')).toHaveLength(Object.keys(meta).length);
      expect(by('term')).toHaveLength((glossary as unknown[]).length);
      for (const x of by('skill')) expect(ROUTE_SKILLS.some((s) => s.id === learnSkillOf(x.href))).toBe(true);
      for (const x of by('lesson')) expect(engineRouteOf(x.href).lesson).toMatch(/^e-[a-z]{2}-(l\d|ext)-\d\d$/); // v43: the Extensions shelf (e-pg-ext-NN)
      for (const x of by('term')) expect(engineTermsOf(x.href)).toMatch(/^[a-z0-9-]+$/);
      expect(all.every((x) => x.title && !x.title.includes('`'))).toBe(true);
    }
  });

  it('matches every word without Vietnamese marks, prefix matches first, capped', () => {
    const all = paletteItems(src, 'vi', hashes);
    expect(fold('Lọc Dòng đơn')).toBe('loc dong don');
    expect(search(all, 'mvcc').some((x) => x.href === engineTermsHash('mvcc'))).toBe(true);
    expect(search(all, 'left join').some((x) => x.href === '#/learn/skill/left_join')).toBe(true);
    expect(search(all, '   ')).toEqual([]);
    expect(search(all, 'a').length).toBeLessThanOrEqual(30);
    const hits = search(all, 'mvcc');
    expect(fold(hits[0].title).startsWith('mvcc')).toBe(true);
  });

  it('v47 S4 (L984): the one interview room, one result per tab, found as "phong van" or "interview"', () => {
    const all = paletteItems(src, 'vi', { ...hashes, interview: interviewTabHash }, 'Phòng phỏng vấn'); // B-02 (L1111): the track names live in palette.ts now
    const rooms = all.filter((x) => x.kind === 'page' && x.href.startsWith('#/learn/interview')); // L1092: other pages follow
    expect(rooms.map((x) => x.href)).toEqual(['#/learn/interview', '#/learn/interview?e=pg', '#/learn/interview?e=mg', '#/learn/interview?e=dy']);
    expect(rooms.map((x) => x.title)).toEqual(['Phòng phỏng vấn · SQL', 'Phòng phỏng vấn · PostgreSQL', 'Phòng phỏng vấn · MongoDB', 'Phòng phỏng vấn · DynamoDB']);
    for (const q of ['phong van', 'interview', 'phỏng vấn mongo']) expect(search(all, q).some((x) => x.kind === 'page')).toBe(true);
    for (const x of rooms) expect(isInterviewPage(x.href) && interviewTabHash(interviewTabOf(x.href))).toBe(x.href);
  });

  it('L1092 (eye E-01): the hub and Practise pages are results too, in both languages, each on a route the router opens', () => {
    for (const lang of ['vi', 'en'] as const) {
      const all = paletteItems(src, lang, hashes);
      const hit = (q: string) => search(all, q).filter((x) => x.kind === 'page').map((x) => x.href);
      expect(hit('best practice')).toContain('#/engine/best');
      expect(hit('extension')).toContain('#/engine/postgres/ext');
      expect(hit('chon csdl')).toContain('#/engine/compare');
      expect(hit('which database')).toContain('#/engine/compare');
      expect(hit('engine')).toContain('#/engine');
      expect(hit('sua cau loi')).toContain('#/practice');
      expect(hit('mixed review')).toContain('#/practice');
    }
    expect(engineRouteOf('#/engine/postgres/ext').level).toBe('EXT');
    expect(engineTermsOf('#/engine/terms')).toBe('');
  });

  it('eye-v47b B-02 (L1111): every track page and its levels, product words, and the domain cases', () => {
    for (const lang of ['vi', 'en'] as const) {
      const all = paletteItems(src, lang, hashes);
      const hit = (q: string) => search(all, q).filter((x) => x.kind === 'page').map((x) => x.href);
      for (const e of ENGINES) {
        const page = all.find((x) => x.kind === 'page' && x.href === `#/engine/${e}`);
        expect(page && engineRouteOf(page.href).engine, e).toBe(e);
        expect(all.some((x) => x.href === `#/engine/${e}/L1` && engineRouteOf(x.href).level === 'L1'), e).toBe(true);
      }
      for (const [q, e] of [['redis', 'redis'], ['kafka', 'stream'], ['debezium', 'stream'], ['clickhouse', 'olap'], ['elasticsearch', 'search'],
        ['prometheus', 'telemetry'], ['promql', 'telemetry'], ['graph', 'graph'], ['neo4j', 'graph'], ['telemetry', 'telemetry'], ['opentelemetry', 'telemetry'], ['chuoi thoi gian', 'timeseries']])
        expect(hit(q), q).toContain(`#/engine/${e}`);
      expect(search(all, 'redis')[0].href).toBe('#/engine/redis'); // the page before its lessons
      const redis = Object.values(meta).filter((x) => (x.fm as { engine?: string }).engine === 'redis').length;
      expect(search(all, 'redis').filter((x) => x.kind === 'lesson')).toHaveLength(redis);
      for (const q of ['tinh huong', 'case study']) expect(hit(q)).toEqual(expect.arrayContaining(['#/d/logistics', '#/d/ecommerce', '#/d/finance']));
    }
  });

  it('{mod}+K opens it: Ctrl on Windows/Linux, ⌘ on macOS; never with Shift/Alt or a handled event', () => {
    const k = { key: 'k', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, defaultPrevented: false, isComposing: false };
    expect(opensSearch(k, false)).toBe(true);
    expect(opensSearch({ ...k, key: 'K' }, false)).toBe(true);
    expect(opensSearch(k, true)).toBe(false);
    expect(opensSearch({ ...k, ctrlKey: false, metaKey: true }, true)).toBe(true);
    expect(opensSearch({ ...k, shiftKey: true }, false)).toBe(false);
    expect(opensSearch({ ...k, defaultPrevented: true }, false)).toBe(false);
  });
});
