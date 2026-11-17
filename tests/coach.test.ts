import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../src/tickets';

// No DOM here: h() returns plain records so the coach mark's buttons can be clicked by hand.
interface El { tag: string; attrs: Record<string, unknown>; children: unknown[] }
vi.mock('../src/ui/dom', () => ({
  h: (tag: string, attrs: Record<string, unknown> = {}, ...children: unknown[]): El => ({ tag, attrs, children }),
}));

const tk = (id: string) => ({ id }) as Ticket;
let found: Record<string, { focus: ReturnType<typeof vi.fn> }>;
const focused = () => Object.entries(found).filter(([, el]) => el.focus.mock.calls.length).map(([sel]) => sel);

async function clickOk(setup: (app: typeof import('../src/state').app) => void): Promise<{ removed: boolean }> {
  vi.resetModules(); // `dismissed` is module state
  const { app } = await import('../src/state');
  const { coach } = await import('../src/ui/coach');
  app.tickets = [tk('A'), tk('B')];
  app.save = (await import('../src/save')).emptySave();
  app.lastRun = undefined;
  setup(app);
  const spot = app.selectedId === 'B' ? 'hints' : app.save.completed.includes('A') ? 'recap' : app.lastRun ? 'panel' : 'brief';
  const mark = coach(spot) as unknown as El;
  const ok = mark.children[1] as El;
  const state = { removed: false };
  (ok.attrs.onclick as (e: unknown) => void)({ currentTarget: { closest: (s: string) => (s === '.coach' ? { remove: () => { state.removed = true; } } : null) } });
  return state;
}

beforeEach(() => {
  found = {};
  const el = (sel: string) => (found[sel] ??= { focus: vi.fn() });
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem() {} } });
  vi.stubGlobal('document', {
    querySelector: (sel: string) => el(sel),
    getElementById: (id: string) => el(`#${id}`),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('coach mark: đóng thì focus đi đúng chỗ', () => {
  it('brief → editor', async () => {
    expect((await clickOk((app) => { app.selectedId = 'A'; })).removed).toBe(true);
    expect(focused()).toEqual(['#work .cm-content']);
  });

  it('panel → editor', async () => {
    await clickOk((app) => { app.selectedId = 'A'; app.lastRun = { key: 'A#0', sql: '', offset: 0 }; });
    expect(focused()).toEqual(['#work .cm-content']);
  });

  it('recap → nút "Việc tiếp theo" trong Recap', async () => {
    await clickOk((app) => { app.selectedId = 'A'; app.save.completed = ['A']; });
    expect(focused()).toEqual(['.recap button.primary']);
  });

  it('hints → nút gợi ý', async () => {
    await clickOk((app) => { app.selectedId = 'B'; });
    expect(focused()).toEqual(['.hints button']);
  });

  it('không tìm thấy đích → tiêu đề đề bài', async () => {
    vi.stubGlobal('document', {
      querySelector: () => null,
      getElementById: (id: string) => (found[`#${id}`] ??= { focus: vi.fn() }),
    });
    await clickOk((app) => { app.selectedId = 'A'; });
    expect(focused()).toEqual(['#brief-title']);
  });
});
