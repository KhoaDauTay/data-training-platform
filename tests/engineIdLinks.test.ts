// @vitest-environment jsdom
// v44 (L790–L792): a learner never reads a raw lesson or card id. engineView's inline() (lesson prose, quiz q/options/why,
// predict, hints, facts, capstone, compare, and Best Practice cards through engineBest) turns every `e-pg-l4-03`, bare or in
// backticks, into a link named by the title only; the word before it stays prose, with no "bài bài".
import { beforeAll, describe, expect, it } from 'vitest';
import * as bestSources from '../src/bestSources';
import * as bestMongo from '../src/bestMongoIndex';
import * as bestDynamo from '../src/bestDynamoIndex';
import * as src from '../src/engineSources';
import { engineHash } from '../src/route';
import { h } from '../src/ui/dom';
import { icon } from '../src/ui/icons';
import { initEngine, inline, type EngineDeps } from '../src/ui/engineView';

const RAW = /\be-(?:pg|mg|dy|ds|ol|gr|bp)-[a-z0-9]+-?\d/;
const lang = { now: 'vi' as 'vi' | 'en' };
const show = (text: string): HTMLElement => h('p', {}, ...inline(text));
const titleOf = (id: string): string => {
  const fm = [...Object.values(src.meta), ...Object.values(bestSources.meta), ...Object.values(bestMongo.meta), ...Object.values(bestDynamo.meta)]
    .map((s) => s.fm as { id: string; title: string; title_en: string }).find((f) => f.id === id)!;
  return lang.now === 'vi' ? fm.title : fm.title_en;
};

beforeAll(() => {
  const deps = { h, icon, getLang: () => lang.now, locale: () => lang.now, engineHash, app: { save: { completed: [] } } } as unknown as EngineDeps;
  initEngine(deps, src, { ...bestSources.meta, ...bestMongo.meta, ...bestDynamo.meta });
});

describe('id → titled link', () => {
  it.each([
    ['(bài e-pg-l4-03)', 'e-pg-l4-03', '#/engine/postgres/L4/e-pg-l4-03', (t: string) => `(bài ${t})`],
    ['Đọc bài `e-pg-l4-03`.', 'e-pg-l4-03', '#/engine/postgres/L4/e-pg-l4-03', (t: string) => `Đọc bài ${t}.`],
    ['Như bài e-pg-l4-09: nối', 'e-pg-l4-09', '#/engine/postgres/L4/e-pg-l4-09', (t: string) => `Như bài ${t}: nối`],
    ['- `e-ds-l4-09`', 'e-ds-l4-09', '#/engine/design/L4/e-ds-l4-09', (t: string) => `- ${t}`],
    ['khóa: `e-mg-l5-12`.', 'e-mg-l5-12', '#/engine/mongodb/L5/e-mg-l5-12', (t: string) => `khóa: ${t}.`],
    ['(bài `e-pg-ext-02`)', 'e-pg-ext-02', '#/engine/postgres/ext/e-pg-ext-02', (t: string) => `(bài ${t})`], // v43: the Extensions shelf
    ['(lesson `e-dy-l3-14`)', 'e-dy-l3-14', '#/engine/dynamodb/L3/e-dy-l3-14', (t: string) => `(lesson ${t})`],
    ['thẻ `e-bp-s10` (RLS)', 'e-bp-s10', '#/engine/best/postgres/e-bp-s10', (t: string) => `thẻ ${t} (RLS)`],
    ['xem e-bp-m39, e-bp-d01', 'e-bp-m39', '#/engine/best/mongodb/e-bp-m39', (t: string) => `xem ${t}, ${titleOf('e-bp-d01')}`],
    ['**Đọc e-bp-q07**', 'e-bp-q07', '#/engine/best/sql/e-bp-q07', (t: string) => `Đọc ${t}`],
  ])('%s', (text, id, href, want) => {
    for (const l of ['vi', 'en'] as const) {
      lang.now = l;
      const p = show(text);
      const a = p.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)!;
      expect(a.hasAttribute('data-xref')).toBe(true);
      expect(a.textContent).toBe(titleOf(id));
      expect(p.textContent).toBe(want(titleOf(id)));
      expect(p.textContent).not.toMatch(RAW);
    }
    lang.now = 'vi';
  });

  it('an id with no title: a neutral link that takes the word before it (no "bài bài")', () => {
    const p = show('(bài `e-pg-l5-99`) và e-ds-l3-98');
    expect(p.textContent).toBe('(bài liên quan) và bài liên quan');
    expect(p.querySelector('a[href="#/engine/postgres/L5/e-pg-l5-99"]')).not.toBeNull();
  });

  it('other code and words stay as they are', () => {
    const p = show('`SELECT 1`, e-commerce, **bold**, `e-bp-z1`');
    expect(p.querySelectorAll('a')).toHaveLength(0);
    expect(p.textContent).toBe('SELECT 1, e-commerce, bold, e-bp-z1');
  });
});

// Every line a learner can read in Engine content (outside fenced code and `id:` keys) renders with no raw id left.
const texts = import.meta.glob<string>('../content/engine/{*/L*,postgres/ext,best/*,mongodb/path}/*.{md,yml}', { query: '?raw', import: 'default', eager: true });
const all = import.meta.glob<string>('../content/**/*.{md,yml}', { query: '?raw', import: 'default', eager: true });
describe('content', () => {
  it('every Engine text line with an id renders it as a link', () => {
    const left: string[] = [];
    let n = 0;
    for (const [p, raw] of Object.entries(texts)) {
      let fence = false;
      for (const line of raw.split('\n')) {
        if (/^\s*```/.test(line)) fence = !fence;
        if (fence || /^\s*-?\s*id:/.test(line) || !RAW.test(line)) continue;
        n++;
        const shown = show(line).textContent!;
        if (RAW.test(shown)) left.push(`${p}: ${shown.slice(0, 120)}`);
      }
    }
    expect(n).toBeGreaterThan(200);
    expect(left).toEqual([]);
  });

  it('ids appear only where inline() renders them: never in fenced code, General, figures or tickets', () => {
    const bad: string[] = [];
    for (const [p, raw] of Object.entries(all)) {
      if (p.endsWith('README.md')) continue; // notes for authors, never shipped
      const shipped = p in texts;
      let fence = false;
      for (const line of raw.split('\n')) {
        if (/^\s*```/.test(line)) fence = !fence;
        else if (RAW.test(line) && !/^\s*(#|-?\s*id:)/.test(line) && (fence || !shipped)) bad.push(`${p}: ${line.trim().slice(0, 100)}`);
      }
    }
    expect(bad.filter((b) => !/best\/(tracks|habits)\.yml/.test(b))).toEqual([]);
  });
});
