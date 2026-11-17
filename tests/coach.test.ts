import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '../src/tickets';

// No DOM here: h() returns plain records so the coach mark's buttons can be clicked by hand.
interface El { tag: string; attrs: Record<string, unknown>; children: unknown[] }
vi.mock('../src/ui/dom', () => ({
  h: (tag: string, attrs: Record<string, unknown> = {}, ...children: unknown[]): El => ({ tag, attrs, children }),
}));

const tk = (id: string) => ({ id }) as Ticket;
let found: Record<string, { focus: ReturnType<typeof vi.fn> }>;
let skipped = false;
const focused = () => Object.entries(found).filter(([, el]) => el.focus.mock.calls.length).map(([sel]) => sel);

async function load(selected: string, completed: string[] = []) {
  vi.resetModules(); // `dismissed` is module state
  const { app } = await import('../src/state');
  const { coach } = await import('../src/ui/coach');
  app.tickets = [tk('A'), tk('B')];
  app.save = (await import('../src/save')).emptySave();
  app.save.completed = completed;
  app.selectedId = selected;
  return coach;
}

beforeEach(() => {
  found = {};
  skipped = false;
  const el = (sel: string) => (found[sel] ??= { focus: vi.fn() });
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => (skipped && k === 'cargo-query/coach-done' ? 'true' : null), setItem() {} } });
  vi.stubGlobal('document', {
    querySelector: (sel: string) => el(sel),
    getElementById: (id: string) => el(`#${id}`),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('dấu Gợi ý ở việc 2 (v4 §B.5)', () => {
  it('hiện ở việc 2 chưa xong; "Hiểu rồi" gỡ dấu và đưa focus về nút Gợi ý', async () => {
    const coach = await load('B');
    const mark = coach('hints') as unknown as El;
    const ok = mark.children[1] as El;
    const state = { removed: false };
    (ok.attrs.onclick as (e: unknown) => void)({ currentTarget: { closest: (s: string) => (s === '.coach' ? { remove: () => { state.removed = true; } } : null) } });
    expect(state.removed).toBe(true);
    expect(focused()).toEqual(['.hints button']);
  });

  it('không hiện ở việc khác, khi việc 2 đã xong, hay khi đã bỏ qua hướng dẫn', async () => {
    expect((await load('A'))('hints')).toBeNull();
    expect((await load('B', ['B']))('hints')).toBeNull();
    skipped = true;
    expect((await load('B'))('hints')).toBeNull();
  });
});
