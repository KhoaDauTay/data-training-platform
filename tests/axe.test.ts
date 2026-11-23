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
  ['welcome replay 1/3', () => byId('replay-btn').click()],
  ['welcome replay 2/3', next],
  ['welcome replay 3/3', next],
];

describe('axe-core (v15 Q10)', () => {
  it('first visit: the welcome dialog with the domain picker', async () => {
    await settle(); // the welcome dialog drawn and still (axe caches heading order)
    const modal = openModal();
    expect(modal?.id).toBe('welcome-dialog');
    const v = await problems();
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
    if (hash === '#/learn/skill/select') await vi.waitFor(() => expect(document.querySelector('[data-lesson-page] [data-sec=recap]')).not.toBeNull(), { timeout: 20_000 });
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

  it.each(DIALOGS)('dialog: %s', async (name, open) => {
    if (location.hash !== '#/d/logistics/play') await visit('#/d/logistics/play');
    await open();
    await new Promise((r) => setTimeout(r, 100));
    expect(document.querySelector('dialog[open]')).not.toBeNull();
    const v = await problems();
    if (!name.startsWith('welcome') || name.endsWith('3/3')) for (const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) d.close();
    expect(v).toEqual([]);
  });
});
