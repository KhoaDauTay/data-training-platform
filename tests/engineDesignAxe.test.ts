// @vitest-environment jsdom
// v28 R4 (L420): the fourth card in the real app with the real design lessons standing in for the engine content chunk:
// axe on the overview (four cards, the "go deeper in PostgreSQL L3–L5" line), the design engine and level pages, and one
// lesson of each kind; the trail names the design track; a lesson-id code span is a link.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, byId, EmptyWorker, problems, visit } from './axeHarness';

vi.mock('../src/engineSources', () => ({
  meta: import.meta.glob(['../content/engine/design/L*/*.md', '../content/engine/postgres/L4/12-*.md'], { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime,viz', import: 'default', eager: true }),
  full: import.meta.glob('../content/engine/design/L*/*.md', { query: '?fm', import: 'default' }),
  modules: import.meta.glob('../content/engine/design/modules.yml', { import: 'default', eager: true }),
}));

beforeAll(() => boot({ worker: EmptyWorker, storage: { 'cargo-query/coach-done': 'true', 'cargo-query/domain': '"logistics"' } }));

describe('Thiết kế CSDL: thẻ thứ tư và trang bài', () => {
  it('#/engine: thẻ Thiết kế CSDL với dòng "đào sâu ở PostgreSQL L3–L5"', async () => {
    await visit('#/engine');
    const card = document.querySelector('#home a[href="#/engine/design"]');
    expect(card?.textContent).toBe('Thiết kế CSDL');
    expect(document.querySelector('#home a[href="#/engine/postgres/L3"]')?.textContent).toContain('PostgreSQL L3–L5');
    expect(await problems()).toEqual([]);
  });

  it.each(['#/engine/design', '#/engine/design/L4'])('axe: %s', async (hash) => {
    await visit(hash);
    expect(byId('engine-page')).not.toBeNull();
    expect(await problems()).toEqual([]);
  });

  it.each(['L1/e-ds-l1-01', 'L1/e-ds-l1-02', 'L2/e-ds-l2-05', 'L4/e-ds-l4-06', 'L5/e-ds-l5-05', 'L4/e-ds-l4-08', 'L4/e-ds-l4-09', 'L5/e-ds-l5-10', 'L5/e-ds-l5-11'])('axe: #/engine/design/%s', async (tail) => {
    const hash = `#/engine/design/${tail}`;
    await visit(hash);
    expect(byId('engine-page')?.dataset.lesson).toBe(hash.split('/').pop());
    expect([...document.querySelectorAll('#home nav[aria-label="Đường dẫn"] a')].map((a) => a.getAttribute('href'))).toEqual(['#/engine', '#/engine/design', `#/engine/design/${tail.split('/')[0]}`]);
    expect(await problems()).toEqual([]);
  });

  it('một id bài trong code span thành link tới bài đó', async () => {
    await visit('#/engine/design/L5/e-ds-l5-05');
    expect(document.querySelector('#engine-page a[href="#/engine/postgres/L4/e-pg-l4-12"]')).not.toBeNull();
  });

  it('v34 (L545): the hub links its lessons and the Best Practice card by id', async () => {
    await visit('#/engine/design/L4/e-ds-l4-09');
    for (const href of ['#/engine/design/L2/e-ds-l2-06', '#/engine/design/L4/e-ds-l4-11', '#/engine/best/postgres/e-bp-s10', '#/engine/design/L5/e-ds-l5-08', '#/engine/design/L5/e-ds-l5-11'])
      expect(document.querySelector(`#engine-page a[href="${href}"]`), href).not.toBeNull();
    expect(document.querySelector('#engine-page a[href="#/engine/best/postgres/e-bp-s10"]')!.textContent).toBe('Best Practice · S10');
    // v38 (L582): a `{ url, title }` source shows its title, never the URL slug
    expect([...document.querySelectorAll('#e-ds-l4-09-src ~ ul a')].map((a) => a.textContent)).toEqual([
      'AWS SaaS Lens · Silo, Pool, and Bridge Models (mở trong tab mới)', 'PostgreSQL · Constraints › Foreign Keys (mở trong tab mới)',
      'PostgreSQL · Row Security Policies (mở trong tab mới)']);
  });
});
