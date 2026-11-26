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
import { ROUTE_SKILLS } from '../src/progress';
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

  it('F04/F06: Home counts the route skills like #/learn and links the SQL path and Engine (secondary links only)', async () => {
    await visit('#/');
    const card = document.querySelector('#home [aria-labelledby=home-path]')!;
    const home = /(\d+)\/(\d+)/.exec(card.textContent!)!;
    expect(Number(home[2])).toBe(ROUTE_SKILLS.length);
    expect([...card.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['#/learn', '#/engine']);
    expect(card.querySelector('.bg-accent')).toBeNull();
    await visit('#/learn', () => expect(document.getElementById('home')!.textContent).toContain(`Đã học ${home[1]}/${ROUTE_SKILLS.length} kỹ năng`));
  });

  it('F03 (L485): one skill scale: no memory level on #/me or #/practice, the review box is named "Lịch ôn"', async () => {
    await visit('#/practice');
    expect(document.getElementById('home')!.textContent).not.toMatch(/Mức nhớ/);
    expect(document.getElementById('home')!.textContent).toMatch(/Lịch ôn: /);
    await visit('#/me');
    const home = document.getElementById('home')!;
    expect(home.textContent).not.toMatch(/Mức nhớ|Độ vững kỹ năng|\/5\)/);
    // F23: a badge not held is drawn not held (dashed edge), its condition in the tile
    const not = home.querySelector<HTMLElement>('[data-badge][data-have=false]')!;
    expect(not.className).toContain('border-dashed');
    expect(not.className).not.toContain('bg-accent-soft');
  });

  it('F02: the full lesson page renders inline code in the Syntax table (no raw backtick pair)', async () => {
    await visit('#/learn/skill/upsert', () => expect(document.querySelector('#home table')).not.toBeNull());
    const c = document.getElementById('home')!.cloneNode(true) as Element;
    c.querySelectorAll('code, pre, .cm-editor, textarea').forEach((x) => x.remove());
    expect(c.textContent).not.toMatch(/`[^`]+`/);
  });

  it.each(PAGES)('page %s', async (hash) => {
    await visit(hash);
    expect(openModal()).toBeUndefined();
    expect(await problems()).toEqual([]);
  });

  it('#/me (v24, L323): skill map with level words, 42 badges (v47: + Redis L1–L2), no certificate; the skill and Part pages show levels', async () => {
    await visit('#/me');
    const home = document.getElementById('home')!;
    expect(home.querySelector('[data-me=skill-map]')).not.toBeNull();
    expect(home.querySelectorAll('[data-me=badges] details [data-badge]')).toHaveLength(42);
    expect(home.textContent).not.toMatch(/Tải (PNG|SVG)/);
    expect(home.querySelector('[data-skill=select] a')?.getAttribute('aria-label')).toMatch(/^Chọn cột \(SELECT\): (Làm được, mức 2 trên 4|Đã gặp, mức 1 trên 4, cần ôn)$/); // save-v5: taught by ch1; the real clock decides overdue
    for (const hash of ['#/learn/sql/1', '#/learn/skill/select']) {
      await visit(hash);
      expect(document.querySelector('#home [data-level]')).not.toBeNull();
      expect(await problems()).toEqual([]);
    }
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
