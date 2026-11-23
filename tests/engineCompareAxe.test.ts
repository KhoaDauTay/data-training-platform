// @vitest-environment jsdom
// v28 E-CMP + LINK (L430–L432): axe on "Which engine?" (#/engine/compare, a deep link): h1 under the Engine trail, the label
// table, nine axis cards, twelve scenarios; a right answer shows its explanation and evidence and changes nothing in the
// Save (0 XP); the overview lists the page; a General skill page carries the "Đào sâu" chips (General → Engine only).
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

describe('#/engine/compare', () => {
  it('the page: h1 under the Engine trail, the label table, nine axes, twelve scenarios, the way back to the SQL path', async () => {
    await visit('#/engine/compare', () => expect(q('[data-cmp]')).not.toBeNull());
    expect(byId('home-title').textContent).toBe('Chọn engine nào?');
    expect([...document.querySelectorAll('#home nav[aria-label="Đường dẫn"] a')].map((a) => a.getAttribute('href'))).toEqual(['#/engine']);
    expect(document.querySelectorAll('[data-cmp-summary] tbody tr').length).toBe(9);
    expect(document.querySelectorAll('[data-cell]').length).toBe(27);
    expect(document.querySelectorAll('[data-scenario]').length).toBe(12);
    expect(q('[data-cmp] a[href="#/learn"]')).not.toBeNull();
    expect(q('#engine-page')).not.toBeNull();
    expect(await problems()).toEqual([]);
  });

  it('a right answer shows the explanation with its evidence; the Save does not change', async () => {
    const before = JSON.stringify(app.save);
    q<HTMLInputElement>('[data-ek="cmp-S4-0"]')!.click();
    q<HTMLButtonElement>('[data-ek="cmp-S4-check"]')!.click();
    await settle();
    const card = q('[data-scenario="S4"]')!;
    expect(card.querySelector('[role=status]')!.textContent).toBe('Đúng.');
    expect(card.textContent).toContain('P1 còn 3');
    expect(q('[data-cmp-score]')!.textContent).toContain('1/12');
    expect(JSON.stringify(app.save)).toBe(before);
    expect(await problems()).toEqual([]);
  });

  it('the Engine overview lists the page', async () => {
    await visit('#/engine', () => expect(q('a[href="#/engine/compare"]')).not.toBeNull());
    expect(await problems()).toEqual([]);
  });
});

describe('"Đào sâu" on a General skill page', () => {
  it('links to Engine lessons only, names no domain', async () => {
    await visit('#/learn/skill/join', () => expect(q('[data-deep="join"]')).not.toBeNull());
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-deep] a')].map((a) => a.getAttribute('href'));
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l).toMatch(/^#\/engine\/(postgres|mongodb|dynamodb)\/L[1-5]\/e-/);
    expect(q('[data-deep]')!.textContent).not.toMatch(/Logistics|E-com|Finance|Tài chính|Chợ|Hũ Bạc|Tien Sa/i);
    expect(await problems()).toEqual([]);
  });
});
