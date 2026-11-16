import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryResult } from '../src/db/run';
import type { Ticket } from '../src/tickets';

// No DOM in this test environment: the editor and h() are replaced by plain objects,
// so mountWork's run/submit logic can be driven directly.
interface FakeEditor { opts: { doc: string; onRun(): void; onSubmit(): void } }
const editors: FakeEditor[] = [];

vi.mock('../src/ui/editor', () => ({
  createEditor: (_parent: unknown, opts: FakeEditor['opts']) => {
    const value = opts.doc;
    const ed = {
      opts,
      getValue: () => value,
      runTarget: () => ({ sql: value, offset: 0 }),
      setValue() {}, setSchema() {}, setLabel() {}, showError() {}, clearError() {}, closeCompletion() {}, focus() {}, destroy() {},
      format: async () => true,
    };
    editors.push(ed);
    return ed;
  },
}));

const fakeEl = () => ({
  replaceChildren() {}, append() {}, setAttribute() {}, addEventListener() {}, focus() {},
  hidden: false, disabled: false, textContent: '', className: '',
});
vi.mock('../src/ui/dom', () => ({
  h: () => fakeEl(),
  nodes: (...c: unknown[]) => c.filter((x) => x !== null && x !== undefined && x !== false),
  richText: () => fakeEl(),
  byId: () => fakeEl(),
}));

const { app } = await import('../src/state');
const { mountWork } = await import('../src/ui/work');
const { HISTORY_KEY } = await import('../src/history');

const result: QueryResult = { columns: ['n'], types: [23], rows: [[1]] };
const ticket = (id: string, steps = 1): Ticket => ({
  id, chapter: 1, title: id, from: { name: 'A', dept: 'Ops' }, difficulty: 1, beat: 'develop', requires: [], grants: [],
  tables: [], ordered: false, body: '', task: '', hints: [],
  steps: Array.from({ length: steps }, () => ({ title: '', prompt: '', solution: 'SELECT 1 AS n' })),
});

let store: Record<string, string>;
let release: () => void;

function setup() {
  // The player's query waits until the test calls release(); the Solution answers at once.
  const db = {
    run: vi.fn((sql: string) => (sql === 'SELECT 1 AS n'
      ? Promise.resolve(result)
      : new Promise<QueryResult>((resolve) => { release = () => resolve(result); }))),
  };
  const panel = { show: vi.fn(), refresh: vi.fn(), active: 'columns' };
  const deps = { db, panel, onSolved: vi.fn(), onStepSolved: vi.fn(), onConclusion: vi.fn(), onRun: vi.fn() };
  const work = mountWork(fakeEl() as unknown as HTMLElement, deps as never);
  return { work, deps };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const historyOf = (id: string) => (JSON.parse(store[HISTORY_KEY] ?? '{}') as Record<string, { sql: string }[]>)[id] ?? [];

function open(work: ReturnType<typeof mountWork>, tk: Ticket) {
  app.selectedId = tk.id;
  app.stepIndex = 0;
  work.setTicket(tk, 0);
}

beforeEach(() => {
  editors.length = 0;
  store = {};
  vi.stubGlobal('document', { addEventListener() {}, querySelector: () => null, getElementById: () => null });
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } });
  app.save = { version: 1, completed: [], xp: 0, hintsUsed: {}, drafts: { 'A#0': 'SELECT 1  AS n', 'B#0': 'SELECT 2' }, graded: {} };
  app.lastRun = undefined;
});
afterEach(() => vi.unstubAllGlobals());

describe('đổi ticket khi query đang chạy', () => {
  it('Nộp xong sau khi đã đổi ticket: chỉ ghi lịch sử của ticket lúc bấm, không chấm điểm', async () => {
    const { work, deps } = setup();
    open(work, ticket('A'));
    editors[0].opts.onSubmit();
    open(work, ticket('B'));
    release();
    await flush();
    expect(historyOf('A').map((e) => e.sql)).toEqual(['SELECT 1  AS n']);
    expect(historyOf('B')).toEqual([]);
    expect(app.lastRun).toBeUndefined();
    expect(deps.onSolved).not.toHaveBeenCalled();
    expect(deps.onStepSolved).not.toHaveBeenCalled();
    expect(app.save.graded).toEqual({});
  });

  it('Nộp xong trên cùng ticket: được chấm và lưu SQL đã chấm', async () => {
    const { work, deps } = setup();
    open(work, ticket('A'));
    editors[0].opts.onSubmit();
    release();
    await flush();
    expect(deps.onSolved).toHaveBeenCalledOnce();
    expect(app.save.graded).toEqual({ 'A#0': 'SELECT 1  AS n' });
    expect(app.lastRun?.key).toBe('A#0');
    expect(historyOf('A')).toHaveLength(1);
  });

  it('Chạy xong sau khi đã đổi ticket: lịch sử về ticket cũ, không đụng lastRun / tab', async () => {
    const { work, deps } = setup();
    open(work, ticket('A'));
    editors[0].opts.onRun();
    open(work, ticket('B'));
    deps.panel.show.mockClear();
    release();
    await flush();
    expect(historyOf('A')).toHaveLength(1);
    expect(historyOf('B')).toEqual([]);
    expect(app.lastRun).toBeUndefined();
    expect(deps.panel.show).not.toHaveBeenCalled();
    expect(deps.onRun).not.toHaveBeenCalled();
  });

  it('boss: đổi bước khi đang nộp thì không nhảy bước lần nữa', async () => {
    const { work, deps } = setup();
    const boss = ticket('A', 3);
    open(work, boss);
    editors[0].opts.onSubmit();
    app.stepIndex = 1; // e.g. the player re-opened the ticket on another step
    work.setTicket(boss, 1);
    release();
    await flush();
    expect(deps.onStepSolved).not.toHaveBeenCalled();
    expect(app.save.graded).toEqual({});
  });
});
