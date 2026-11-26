// F12 (L490): the search palette's index (General skills, Engine lessons, glossary terms) and its routes; {mod}+K.
import { describe, expect, it } from 'vitest';
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
      for (const x of by('lesson')) expect(engineRouteOf(x.href).lesson).toMatch(/^e-(pg|mg|dy|rd|ds|st|tm)-(l\d|ext)-\d\d$/); // v43: the Extensions shelf (e-pg-ext-NN)
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
    const all = paletteItems(src, 'vi', { ...hashes, interview: interviewTabHash }, 'Design', 'Data stack', 'Phòng phỏng vấn');
    expect(all.filter((x) => x.kind === 'page').map((x) => x.href)).toEqual(['#/learn/interview', '#/learn/interview?e=pg', '#/learn/interview?e=mg', '#/learn/interview?e=dy']);
    expect(all.filter((x) => x.kind === 'page').map((x) => x.title)).toEqual(['Phòng phỏng vấn · SQL', 'Phòng phỏng vấn · PostgreSQL', 'Phòng phỏng vấn · MongoDB', 'Phòng phỏng vấn · DynamoDB']);
    for (const q of ['phong van', 'interview', 'phỏng vấn mongo']) expect(search(all, q).some((x) => x.kind === 'page')).toBe(true);
    for (const x of all.filter((y) => y.kind === 'page')) expect(isInterviewPage(x.href) && interviewTabHash(interviewTabOf(x.href))).toBe(x.href);
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
