// @vitest-environment jsdom
// v15 Q10 (v7 A8, L141): axe-core over the real app. index.html's markup + main.ts boot in jsdom with a worker that
// never answers (the DB stays "loading"), so every page and dialog is checked as a new player sees it before the data is in.
// A player with progress, the dark theme, a drill open and 375 px: tests/axeProgress.test.ts (FIX-1, L147). Shared setup:
// tests/axeHarness.ts.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, byId, openModal, problems, settle, visit } from './axeHarness';

class SilentWorker { onmessage = null; onerror = null; postMessage() {} terminate() {} }

beforeAll(() => boot({ worker: SilentWorker }));

const PAGES = ['#/', '#/learn', '#/learn/sql/1', '#/learn/skill/select', '#/learn/adv/a2', '#/learn/adv/d5', '#/learn/interview', '#/practice', '#/me',
  '#/engine', '#/engine/postgres', '#/engine/mongodb', '#/engine/postgres/L1/e-pg-l1-01', // a lesson id with no file falls back to its engine page
  '#/engine/best/sql', '#/engine/best/sql/e-bp-q02', '#/engine/best/postgres/e-bp-i04', '#/engine/best/habits', '#/engine/best/dynamodb/e-bp-d06', // v24 BP-UI (L346); v26 the DynamoDB track (L383)
  '#/d/logistics', '#/d/logistics/play', '#/d/logistics/data/ports', '#/d/logistics/dashboard', '#/d/logistics/map',
  '#/d/ecommerce', '#/d/ecommerce/play', '#/d/ecommerce/data', '#/d/ecommerce/dashboard', '#/d/ecommerce/map',
  '#/d/finance', '#/d/finance/play', '#/d/finance/data', '#/d/finance/dashboard', '#/d/finance/map'];

// Dialogs over the Logistics workspace, opened the way the player opens them.
const next = (): void => document.querySelector<HTMLElement>('#welcome-dialog [data-w=next]')!.click();
const DIALOGS: [string, () => unknown][] = [
  ['inbox', () => byId('inbox-btn').click()],
  ['notebook (non-modal: the whole page)', () => byId('notebook-btn').click()],
  ['map', () => document.querySelector<HTMLElement>('#map [data-nav=map]')!.click()],
  ['side drawer', () => byId('side-btn').click()],
  ['lesson', async () => (await import('../src/ui/lessonCard')).openLesson('select')],
  ['welcome replay 1/4', () => byId('replay-btn').click()],
  ['welcome replay 2/4', next], // v47 S3: the goal step (cards; Next keeps the goal)
  ['welcome replay 3/4', next],
  ['welcome replay 4/4', next],
];

describe('axe-core (v15 Q10)', () => {
  it('first visit: the welcome dialog with the domain picker', async () => {
    await settle(); // the welcome dialog drawn and still (axe caches heading order)
    const modal = openModal();
    expect(modal?.id).toBe('welcome-dialog');
    const v = await problems();
    next(); // v47 S3 (L910): the goal step
    v.push(...await problems());
    modal!.dispatchEvent(new Event('cancel', { cancelable: true })); // Esc: Logistics, tour skipped
    modal!.close();
    expect(v).toEqual([]);
  });

  it.each(PAGES)('page %s', async (hash) => {
    await visit(hash);
    expect(openModal()).toBeUndefined();
    // v22 P3-6 (L254): the domain's "preparing data" line only on its own pages (the DB never answers here, so it is pending)
    const notice = byId('notice').hidden ? '' : byId('notice').textContent;
    if (hash.startsWith('#/d/')) expect(notice).toMatch(/Đang chuẩn bị dữ liệu/);
    else expect(notice).not.toMatch(/Đang chuẩn bị dữ liệu/);
    // v22 P2-2: advanced node names are cut below sm, so each link carries its full name in `title`
    if (hash === '#/learn') {
      const links = (): HTMLAnchorElement[] => [...document.querySelectorAll<HTMLAnchorElement>('#home a[href*="/adv/"]')];
      await vi.waitFor(() => expect(links().length).toBeGreaterThan(0), { timeout: 10_000 }); // the learn chunk draws it
      const adv = links();
      for (const a of adv) expect(a.textContent).toContain(a.title);
    }
    // v24 R0 (L338): the full lesson page (its own lazy chunk) is drawn before axe looks at it
    // F10 (L489): one icon = one destination: the Engine sidebar has one Best Practice row, not one star per track
    if (hash === '#/engine/best/sql') await vi.waitFor(() => expect([...document.querySelectorAll('#side [data-side^="bp"]')].map((x) => x.getAttribute('data-side'))).toEqual(['bp', 'bp:habits']));
    if (hash === '#/learn/skill/select') await vi.waitFor(() => expect(document.querySelector('[data-lesson-page] [data-sec=recap]')).not.toBeNull(), { timeout: 20_000 });
    expect(await problems()).toEqual([]);
  });

  it('v42 (L700–L703): a figure\'s "Giải thích sơ đồ" opened: point, data table with caption and column headers', async () => {
    await visit('#/learn/skill/select');
    const block = (): HTMLDetailsElement | null => document.querySelector('figure[data-fig] details[data-fig-alt]');
    await vi.waitFor(() => expect(block()?.querySelector('table caption')).not.toBeNull(), { timeout: 20_000 });
    const d = block()!;
    d.open = true;
    d.querySelectorAll('details').forEach((x) => (x.open = true));
    expect(d.querySelector('summary')?.textContent).toBe('Giải thích sơ đồ');
    const svg = d.closest('figure')!.querySelector('svg')!;
    const point = document.getElementById(svg.getAttribute('aria-labelledby')!.split(' ')[1])!;
    expect(point.textContent).toMatch(/SELECT name, city/);
    expect(point.querySelector('table')).toBeNull(); // the svg's name is the point, never the data
    expect(d.querySelectorAll('table th[scope=col]').length).toBe(4);
    expect(await problems()).toEqual([]);
  });

  it('dialog: the full lesson contents sheet (v24 R0)', async () => {
    await visit('#/learn/skill/select');
    await vi.waitFor(() => expect(document.querySelector('[data-fl-bar] button[aria-haspopup=dialog]')).not.toBeNull(), { timeout: 20_000 });
    document.querySelector<HTMLElement>('[data-fl-bar] button[aria-haspopup=dialog]')!.click();
    await new Promise((r) => setTimeout(r, 100));
    expect(document.querySelector('#fl-toc-sheet[open]')).not.toBeNull();
    const v = await problems();
    byId('fl-toc-sheet').closest('dialog')!.close();
    expect(v).toEqual([]);
  });

  it('dialog: the search palette (F12, L490): ⋯ menu button, search, axe, a result navigates and closes', async () => {
    await visit('#/learn');
    byId('search-btn').click();
    await vi.waitFor(() => expect(document.querySelector('dialog#palette[open]')).not.toBeNull());
    const box = document.querySelector<HTMLInputElement>('#palette-q')!;
    expect(document.activeElement).toBe(box);
    box.value = 'mvcc';
    box.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(document.querySelector('#palette-list a[data-palette=term]')).not.toBeNull(), { timeout: 20_000 });
    expect(await problems()).toEqual([]);
    const link = document.querySelector<HTMLAnchorElement>('#palette-list a[href="#/engine/terms/mvcc"]')!;
    link.click();
    expect(document.querySelector('dialog#palette[open]')).toBeNull();
    await vi.waitFor(() => expect(location.hash).toBe('#/engine/terms/mvcc'));
    // {mod}+K opens it again (Ctrl here: jsdom is no Mac)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(document.querySelector('dialog#palette[open]')).not.toBeNull());
    byId('palette').closest('dialog')!.close();
  });

  it('v46 (L861): the quick lesson dialog draws its figure at the end of the concept part, and axe passes with it', async () => {
    await visit('#/learn');
    // the harness's IntersectionObserver never fires; here one that sees every host at once (the figure mounts when on screen)
    const stub = globalThis.IntersectionObserver;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private cb: (xs: { isIntersecting: boolean }[]) => void) {}
      observe() { queueMicrotask(() => this.cb([{ isIntersecting: true }])); }
      unobserve() {}
      disconnect() {}
    });
    (await import('../src/ui/lessonCard')).openLesson('group_by', undefined, { guide: true });
    vi.stubGlobal('IntersectionObserver', stub);
    const fig = (): Element | null => document.querySelector('#lesson-dialog [data-fig-slot="sql-group-fold"] figure[data-fig] svg');
    await vi.waitFor(() => expect(fig()).not.toBeNull(), { timeout: 20_000 });
    const slot = fig()!.closest('[data-fig-slot]')!;
    expect(slot.closest('section')?.getAttribute('aria-label')).toBe('Ý chính');
    expect(fig()!.closest('figure')?.querySelector('details[data-fig-alt]')).not.toBeNull();
    const v = await problems();
    byId('lesson-dialog').closest('dialog')!.close();
    expect(v).toEqual([]);
  });

  it('v46 (b56 eye, L882): a story ticket\'s quick lesson card in the brief mounts its figure too', async () => {
    await visit('#/learn');
    const stub = globalThis.IntersectionObserver;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private cb: (xs: { isIntersecting: boolean }[]) => void) {}
      observe() { queueMicrotask(() => this.cb([{ isIntersecting: true }])); }
      unobserve() {}
      disconnect() {}
    });
    const host = (await import('../src/ui/lessonCard')).lessonSlot(['group_by'])!;
    vi.stubGlobal('IntersectionObserver', stub);
    document.body.append(host);
    const fig = (): Element | null => host.querySelector('[data-fig-slot="sql-group-fold"] figure[data-fig] svg');
    await vi.waitFor(() => expect(fig()).not.toBeNull(), { timeout: 20_000 });
    expect(fig()!.closest('section')?.getAttribute('aria-label')).toBe('Ý chính');
    host.remove();
  });

  it.each(DIALOGS)('dialog: %s', async (name, open) => {
    if (location.hash !== '#/d/logistics/play') await visit('#/d/logistics/play');
    await open();
    await new Promise((r) => setTimeout(r, 100));
    expect(document.querySelector('dialog[open]')).not.toBeNull();
    const v = await problems();
    if (!name.startsWith('welcome') || name.endsWith('4/4')) for (const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) d.close();
    expect(v).toEqual([]);
  });
});
