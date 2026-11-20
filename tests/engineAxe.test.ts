// @vitest-environment jsdom
// ENG-CORE (L220): the lesson viewer in the real app with the three sample lessons (tests/fixtures/engine) standing in for the
// Postgres content chunk: axe on each lesson page, then a quiz lesson answered until its id is in save.completed.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, byId, EmptyWorker, problems, visit } from './axeHarness';
import { app } from '../src/state';

vi.mock('../src/engineSources', () => ({
  meta: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime', import: 'default', eager: true }),
  full: import.meta.glob('./fixtures/engine/*/L*/*.md', { query: '?fm', import: 'default' }),
  modules: import.meta.glob('./fixtures/engine/*/modules.yml', { import: 'default', eager: true }),
}));

beforeAll(() => boot({ worker: EmptyWorker, storage: { 'cargo-query/coach-done': 'true', 'cargo-query/domain': '"logistics"' } }));

const LESSONS = ['e-pg-l1-01', 'e-pg-l1-02', 'e-pg-l1-03'].map((id) => `#/engine/postgres/L1/${id}`);

describe('Database Engine lesson pages (fixtures)', () => {
  it.each(LESSONS)('axe: %s', async (hash) => {
    await visit(hash);
    expect(byId('engine-lesson-title')).not.toBeNull();
    expect(await problems()).toEqual([]);
  });

  it('quiz + predict answered right → lesson completed with its XP, once', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-03');
    const xp = app.save.xp;
    const answer = async (part: string, value: number): Promise<void> => {
      document.querySelector<HTMLInputElement>(`[data-ek="e-pg-l1-03-${part}-${value}"]`)!.click();
      document.querySelector<HTMLElement>(`[data-ek="e-pg-l1-03-${part}-check"]`)!.click();
      await new Promise((r) => setTimeout(r, 20));
    };
    await answer('q0', 0); // wrong
    expect(app.save.completed).not.toContain('e-pg-l1-03');
    await answer('p', 1);
    await answer('q0', 1);
    expect(app.save.completed).not.toContain('e-pg-l1-03');
    await answer('q1', 0);
    expect(app.save.completed).toContain('e-pg-l1-03');
    expect(app.save.xp).toBe(xp + 5);
    await answer('q1', 0);
    expect(app.save.completed.filter((x) => x === 'e-pg-l1-03')).toHaveLength(1);
  });

  it('a concept lesson is completed by its button', async () => {
    await visit('#/engine/postgres/L1/e-pg-l1-01');
    document.querySelector<HTMLElement>('[data-ek="e-pg-l1-01-done"]')!.click();
    expect(app.save.completed).toContain('e-pg-l1-01');
  });
});
