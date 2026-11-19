// @vitest-environment jsdom
// FIX-1 (L147): axe-core over a returning player, beside tests/axe.test.ts (a new player, the DB never answering). Here: the
// v5 fixture save (progress in all three domains), the dark theme from the device prefs, a 375 px phone and a DB that answers
// every request (empty results), so a drill and an interview question really open in the General workspace (#/learn/play/…).
// 375 px is what jsdom can do: innerWidth and matchMedia's min/max-width (sidebar, phone panes, the Data page's <select>);
// jsdom applies no CSS media queries and does no layout, so Tailwind's max-sm:/md: classes and reflow are not checked here
// (the 375/320 px screenshots in Edge are, review-log); colours: tests/theme.test.ts. The Data page stays in tests/axe.test.ts:
// with every query empty its column table has headers and no cells, which no real table has.
import { beforeAll, describe, expect, it } from 'vitest';
import save from './fixtures/save-v5.json?raw';
import { loadGeneral } from '../src/content';
import { drillHash } from '../src/route';
import { session } from '../src/session';
import { boot, EmptyWorker, openModal, problems, visit } from './axeHarness';

beforeAll(() => boot({
  worker: EmptyWorker,
  theme: 'dark',
  width: 375,
  storage: {
    'cargo-query-save': save,
    'cargo-query/prefs': JSON.stringify({ lang: 'vi', theme: 'dark' }),
    'cargo-query/domain': JSON.stringify('logistics'),
  },
}));

const PAGES = ['#/', '#/learn', '#/practice', '#/me', '#/d/logistics', '#/d/logistics/play', '#/d/logistics/dashboard', '#/d/ecommerce/play', '#/d/finance'];

describe('axe-core: a returning player, dark theme, 375 px (FIX-1)', () => {
  it('boots dark, on a phone width, with the save in, and no welcome dialog', async () => {
    await visit('#/');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.innerWidth).toBe(375);
    expect(document.getElementById('home')?.textContent).toMatch(/\S/);
    expect(openModal()).toBeUndefined();
  });

  it.each(PAGES)('page %s', async (hash) => {
    await visit(hash);
    expect(openModal()).toBeUndefined();
    expect(await problems()).toEqual([]);
  });

  it('#/learn/play with a drill open', async () => {
    const id = (await loadGeneral()).bySkill.get('where')![0].id;
    await visit(drillHash(id), () => {
      expect(session.mode.kind).toBe('drill');
      expect(document.getElementById('brief-title')).not.toBeNull();
    });
    expect(location.hash).toBe(drillHash(id));
    expect(await problems()).toEqual([]);
  });

  it('#/learn/play with an interview question open', async () => {
    await visit(drillHash('g-iv-junior-1-2'), () => {
      expect(session.mode.kind).toBe('interview');
      expect(document.getElementById('brief-title')).not.toBeNull();
    });
    expect(await problems()).toEqual([]);
  });
});
