// @vitest-environment jsdom
// v23 (L299): a first visit that lands on #/engine and picks "SQL only" in the welcome dialog stays on the Engine page
// (it used to jump to the learning path: Phần 1…11 rows and the SQL track in the sidebar, under an Engine URL a moment before).
import { beforeAll, expect, it, vi } from 'vitest';
import { boot, EmptyWorker, openModal, settle } from './axeHarness';

vi.mock('../src/engineSources', () => ({
  meta: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime,viz', import: 'default', eager: true }),
  full: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm', import: 'default' }),
  modules: import.meta.glob('./fixtures/engine/*/modules.yml', { import: 'default', eager: true }),
}));

beforeAll(async () => {
  location.hash = '#/engine';
  await boot({ worker: EmptyWorker });
});

it('welcome "SQL only" on #/engine keeps the Engine page', async () => {
  await settle();
  expect(openModal()?.id).toBe('welcome-dialog');
  document.querySelector<HTMLElement>('#welcome-dialog [data-w=next]')!.click(); // language step first
  document.querySelector<HTMLElement>('#welcome-dialog [data-w=next]')!.click(); // v47 S3: the goal step, skipped (analyst)
  document.querySelector<HTMLElement>('#welcome-dialog [data-w="pick-general"]')!.click();
  await settle();
  expect(location.hash).toBe('#/engine');
  expect(document.body.dataset.route).toBe('engine');
  expect(localStorage.getItem('cargo-query/domain')).toBe('"general"');
});
