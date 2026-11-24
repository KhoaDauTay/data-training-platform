// @vitest-environment jsdom
// v27 (L410–L411): axe on the glossary page (#/engine/terms, a deep link), a lesson with its term buttons and popovers (jsdom
// has no Popover API, so every popover is in the page: axe sees them all "open"), the interview room, a set run with the
// model answer and rubric shown, and a take-home; a whole set leaves the Save untouched (0 XP, device pref only).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, byId, EmptyWorker, problems, settle, visit } from './axeHarness';
import { app } from '../src/state';

vi.mock('../src/engineSources', () => ({
  meta: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime,viz', import: 'default', eager: true }),
  full: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm', import: 'default' }),
  modules: import.meta.glob('./fixtures/engine/*/modules.yml', { import: 'default', eager: true }),
}));

beforeAll(() => boot({ worker: EmptyWorker, storage: { 'cargo-query/coach-done': 'true', 'cargo-query/domain': '"logistics"' } }));
const q = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 20));
/** The text a reader sees outside code (F02: no raw backtick pair may survive a renderer). */
const proseText = (el: Element): string => {
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll('code, pre, textarea, script').forEach((x) => x.remove());
  return c.textContent ?? '';
};

describe('#/engine/terms', () => {
  it('the page: h1 under the Engine trail, grouped by level, search narrows the list in place', async () => {
    await visit('#/engine/terms', () => expect(q('[data-terms-list]')).not.toBeNull());
    expect(byId('home-title').textContent).toBe('Thuật ngữ');
    expect([...document.querySelectorAll('#home nav[aria-label="Đường dẫn"] a')].map((a) => a.getAttribute('href'))).toEqual(['#/engine']);
    expect(document.querySelectorAll('[data-terms-list] article').length).toBeGreaterThanOrEqual(296);
    // F28: long identifiers wrap (jsdom has no layout: the page root carries the wrap rule); F15: no "Design" filter in VI
    expect(q('[data-terms-list]')!.parentElement!.className).toContain('wrap-anywhere');
    expect(q('[data-ek="terms-design"]')).toBeNull();
    // F14: a jump to each level and a way back to the top
    expect([...document.querySelectorAll('[data-terms-list] nav button')].map((b) => b.textContent)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(document.querySelectorAll('[data-terms-list] section > p > button')).toHaveLength(5);
    expect(await problems()).toEqual([]);
    const box = q<HTMLInputElement>('#terms-q')!;
    box.value = 'tinh nguyen tu';
    box.dispatchEvent(new Event('input'));
    expect(q('#term-atomicity')).not.toBeNull();
    expect(document.querySelectorAll('[data-terms-list] article').length).toBeLessThan(10);
    expect(document.activeElement === box || document.body.contains(box)).toBe(true); // the field itself was not rebuilt
    box.value = 'zzzz no such term';
    box.dispatchEvent(new Event('input'));
    expect(q('[data-terms-list] [role=status]')!.textContent).toContain('0');
    q<HTMLButtonElement>('[data-terms-list] button')!.click(); // "Bỏ lọc"
    await settle();
    expect(document.querySelectorAll('[data-terms-list] article').length).toBeGreaterThanOrEqual(296);
  });
  it('a deep link loosens a filter that hides its term and focuses its heading', async () => {
    q<HTMLInputElement>('[data-ek="terms-postgres"]')!.click(); // MVCC is a Postgres term: hide Postgres
    await visit('#/engine/terms/mvcc');
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('term-mvcc-h'));
    expect(await problems()).toEqual([]);
  });
});

describe('term buttons in a lesson', () => {
  it('first mentions become buttons with a popover after them; never inside code; the closing list', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-01');
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('#engine-page button[data-term]')];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.length).toBeLessThanOrEqual(15);
    expect(new Set(buttons.map((b) => b.dataset.term)).size).toBe(buttons.length);
    for (const b of buttons) {
      const pop = b.nextElementSibling as HTMLElement;
      expect([pop.id, pop.getAttribute('popover'), b.getAttribute('popovertarget'), b.getAttribute('aria-expanded')]).toEqual([`tp-${b.dataset.term}`, 'auto', pop.id, 'false']);
      expect(b.closest('code')).toBeNull();
    }
    expect(q('[data-terms] summary')).not.toBeNull();
    expect(await problems()).toEqual([]);
  });
});

describe('#/engine/interview', () => {
  it('the room: engine picker, bands with 3 sets and the take-homes', async () => {
    await visit('#/engine/interview', () => expect(q('#iv-junior')).not.toBeNull());
    expect(byId('home-title').textContent).toBe('Phỏng vấn Engine');
    expect(document.querySelectorAll('#engine-page a[href^="#/engine/interview/pg-"]')).toHaveLength(12);
    expect(document.querySelectorAll('#engine-page a[href^="#/engine/interview/e-iv-pg-th-"]')).toHaveLength(4);
    expect(proseText(byId('engine-page'))).not.toMatch(/`[^`]+`/); // F02: a take-home title with `orders` renders as code
    expect([...document.querySelectorAll('#engine-page a[href^="#/engine/interview/e-iv-pg-th-"]')].some((a) => a.closest('li')?.querySelector('b code'))).toBe(true);
    expect(q('#engine-page a[href="#/learn/interview"]')).not.toBeNull(); // F27: the other room
    expect(await problems()).toEqual([]);
  });

  it('a whole set: write, reveal beside the model, tick the rubric; results in the pref, the Save untouched', async () => {
    const before = localStorage.getItem('cargo-query-save');
    const xp = app.save.xp;
    await visit('#/engine/interview/pg-junior-1', () => expect(q('[data-ek="iv-start"]')).not.toBeNull());
    expect(await problems()).toEqual([]);
    q<HTMLButtonElement>('[data-ek="iv-start"]')!.click();
    for (let i = 0; i < 5; i++) {
      await vi.waitFor(() => expect(q('[data-ek="iv-answer"]')).not.toBeNull());
      expect(q('#iv-q')).not.toBeNull();
      expect(q('#engine-page button[data-term]')).toBeNull(); // no term buttons in the room (they could give the answer away)
      const reveal = q<HTMLButtonElement>('[data-ek="iv-reveal"]')!;
      expect(reveal.disabled).toBe(true);
      const box = q<HTMLTextAreaElement>('[data-ek="iv-answer"]')!;
      box.value = `my answer ${i}`;
      box.dispatchEvent(new Event('input'));
      expect(reveal.disabled).toBe(false);
      reveal.click();
      await vi.waitFor(() => expect(q('[data-ek="iv-tick-0"]')).not.toBeNull());
      if (i === 0) expect(await problems()).toEqual([]);
      q<HTMLInputElement>('[data-ek="iv-tick-0"]')!.click();
      await tick();
      q<HTMLButtonElement>('[data-ek="iv-next"]')!.click();
      await tick();
    }
    await vi.waitFor(() => expect(q('#engine-page [role=status]')?.textContent).toMatch(/Tự chấm 5\/1[5-9]/));
    const pref = JSON.parse(localStorage.getItem('cargo-query/engine-interview')!);
    expect(pref.results['pg-junior-1']).toMatchObject({ score: 5, skipped: 0 });
    expect(pref.live).toEqual({});
    expect(Object.keys(pref.again)).toHaveLength(5); // 1 of 3+ ticked < 60%: all come back tomorrow
    expect(localStorage.getItem('cargo-query-save')).toBe(before);
    expect(app.save.xp).toBe(xp);
    expect(app.save.completed.some((id) => id.startsWith('e-iv-'))).toBe(false);
    expect(await problems()).toEqual([]);
  });

  it('a take-home: brief, queries, drafts kept in the pref, model + rubric after submit', async () => {
    await visit('#/engine/interview/e-iv-pg-th-1', () => expect(q('[data-ek="iv-th-submit"]')).not.toBeNull());
    expect(byId('home-title').textContent).toBe('Ba truy vấn chậm của trang quản trị');
    expect(await problems()).toEqual([]);
    const box = q<HTMLTextAreaElement>('[data-ek="iv-th-0"]')!;
    box.value = 'plans';
    box.dispatchEvent(new Event('input'));
    q<HTMLButtonElement>('[data-ek="iv-th-submit"]')!.click();
    await vi.waitFor(() => expect(q('[data-ek="iv-th-tick-0"]')).not.toBeNull());
    expect(JSON.parse(localStorage.getItem('cargo-query/engine-interview')!).th['e-iv-pg-th-1']).toMatchObject({ drafts: ['plans', '', ''] });
    expect(await problems()).toEqual([]);
  });

  it('the overview and the sidebar link both pages', async () => {
    await visit('#/engine');
    expect(q('#engine-page a[href="#/engine/terms"]')).not.toBeNull();
    expect(q('#engine-page a[href="#/engine/interview"]')).not.toBeNull();
    expect(await problems()).toEqual([]);
  });
});
