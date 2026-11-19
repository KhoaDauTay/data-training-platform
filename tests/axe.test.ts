// @vitest-environment jsdom
// v15 Q10 (v7 A8, L141): axe-core over the real app. index.html's markup + main.ts boot in jsdom with a worker that
// never answers (the DB stays "loading"), so every page and dialog is checked as a new player sees it before the data is in.
// A player with progress, the dark theme, a drill open and 375 px: tests/axeProgress.test.ts (FIX-1, L147). Shared setup:
// tests/axeHarness.ts.
import { beforeAll, describe, expect, it } from 'vitest';
import { boot, byId, openModal, problems, visit } from './axeHarness';

class SilentWorker { onmessage = null; onerror = null; postMessage() {} terminate() {} }

beforeAll(() => boot({ worker: SilentWorker }));

const PAGES = ['#/', '#/learn', '#/learn/sql/1', '#/learn/skill/select', '#/learn/adv/a2', '#/learn/interview', '#/practice', '#/me',
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
    await new Promise((r) => setTimeout(r, 300));
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
    expect(await problems()).toEqual([]);
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
