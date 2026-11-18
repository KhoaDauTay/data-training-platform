import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryResult } from '../src/db/run';
import type { GradeResult } from '../src/grader';
import { emptySave } from '../src/save';
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

/** Every fake element, with a real class set: celebrate() adds a class, drawMessage() reassigns className. */
const els: { classes: Set<string>; textContent: string; disabled: boolean; onclick?: unknown; shown: unknown[]; kids?: unknown[] }[] = [];
const fakeEl = () => {
  const classes = new Set<string>();
  const el = {
    shown: [] as unknown[],
    replaceChildren(...c: unknown[]) { el.shown = c; }, append() {}, setAttribute() {}, addEventListener() {}, focus() {},
    hidden: false, disabled: false, textContent: '', classes,
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
    get className() { return [...classes].join(' '); },
    set className(v: string) { classes.clear(); for (const c of v.split(' ').filter(Boolean)) classes.add(c); },
  };
  els.push(el);
  return el;
};
vi.mock('../src/ui/dom', () => ({
  // Keeps onclick so a test can press a button.
  h: (_tag: string, attrs?: { onclick?: unknown }, ...kids: unknown[]) => Object.assign(fakeEl(), { onclick: attrs?.onclick, kids }),
  nodes: (...c: unknown[]) => c.filter((x) => x !== null && x !== undefined && x !== false),
  richText: () => fakeEl(),
  byId: () => fakeEl(),
}));

vi.mock('../src/ui/avatar', () => ({ avatar: () => fakeEl() }));
vi.mock('../src/ui/mascots', () => ({ mascot: () => fakeEl() })); // Task 9: the feedback line draws a mascot (SVG)

const { app } = await import('../src/state');
const { mountWork } = await import('../src/ui/work');
const { HISTORY_KEY } = await import('../src/history');
const { QueryTimeoutError } = await import('../src/db/client');
const { SqlError } = await import('../src/db/run');
const { t } = await import('../src/i18n');

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
/** Text currently shown in any element (strings passed to replaceChildren, and string children of h() elements shown there). */
// Deep: since Task 9 a line with a mascot nests its words one level further down (mascot · div · words).
const textOf = (x: unknown): string[] => (typeof x === 'string' ? [x] : ((x as { kids?: unknown[] })?.kids ?? []).flatMap(textOf));
const shownText = () => els.flatMap((e) => e.shown).flatMap(textOf).join(' | ');
const historyOf = (id: string) => (JSON.parse(store[HISTORY_KEY] ?? '{}') as Record<string, { sql: string }[]>)[id] ?? [];

function open(work: ReturnType<typeof mountWork>, tk: Ticket) {
  app.selectedId = tk.id;
  app.stepIndex = 0;
  work.setTicket(tk, 0);
}

beforeEach(() => {
  editors.length = 0;
  els.length = 0;
  store = {};
  vi.stubGlobal('document', { addEventListener() {}, querySelector: () => null, getElementById: () => null });
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } });
  app.save = { ...emptySave(), drafts: { 'A#0': 'SELECT 1  AS n', 'B#0': 'SELECT 2' } };
  app.lastRun = undefined;
});
afterEach(() => vi.unstubAllGlobals());

describe('đổi ticket khi query đang chạy', () => {
  it('editor trống: Chạy và Nộp bị từ chối, không chạy, không ghi lịch sử, không tính nộp sai (v10 B1)', async () => {
    app.save.drafts['A#0'] = '  ';
    const { work, deps } = setup();
    const onWrong = vi.fn();
    (deps as { onWrong?: () => void }).onWrong = onWrong;
    open(work, ticket('A'));
    editors[0].opts.onRun();
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.db.run).not.toHaveBeenCalled();
    expect(historyOf('A')).toEqual([]);
    expect(onWrong).not.toHaveBeenCalled();
  });

  it('bước sau của bài thăng tiến bắt đầu từ SQL đã đạt ở bước trước (v10 B4)', () => {
    app.save.graded['A#0'] = 'SELECT 7';
    const { work } = setup();
    const tk = ticket('A', 2);
    app.selectedId = tk.id;
    app.stepIndex = 1;
    work.setTicket(tk, 1);
    expect(editors.at(-1)!.opts.doc).toBe('SELECT 7');
  });

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

describe('hiệu ứng mừng', () => {
  it('Nộp đúng ticket thường: lớp pop vẫn còn sau khi complete() vẽ lại (rerender → relabel)', async () => {
    const { work, deps } = setup();
    deps.onSolved.mockImplementation(() => work.relabel()); // as main.ts complete() → rerender() → work.relabel()
    open(work, ticket('A'));
    editors[0].opts.onSubmit();
    release();
    await flush();
    expect(deps.onSolved).toHaveBeenCalledOnce();
    expect(els.some((e) => e.classes.has('motion-safe:animate-pop'))).toBe(true);
  });
});

describe('nút EXPLAIN', () => {
  const explainBtn = () => els.find((e) => e.textContent === 'EXPLAIN')!;
  const press = () => (explainBtn().onclick as () => void)();

  it('có nhãn, bị khóa khi đang chạy, mở tab EXPLAIN khi chạy xong trên cùng editor', async () => {
    const { work, deps } = setup();
    open(work, ticket('A'));
    expect(explainBtn()).toBeDefined();
    press();
    expect(explainBtn().disabled).toBe(true);
    release();
    await flush();
    expect(explainBtn().disabled).toBe(false);
    expect(deps.panel.show).toHaveBeenLastCalledWith('explain');
  });

  it('đổi ticket khi đang chạy: không chuyển sang tab EXPLAIN', async () => {
    const { work, deps } = setup();
    open(work, ticket('A'));
    press();
    open(work, ticket('B'));
    deps.panel.show.mockClear();
    release();
    await flush();
    expect(deps.panel.show).not.toHaveBeenCalled();
  });
});

describe('Practice không đụng tiến độ câu chuyện', () => {
  it('nộp đúng trong Practice: chỉ đổi hộp ôn + thống kê; hintsUsed/graded/history/completed giữ nguyên; không complete()', async () => {
    const { session, useHint } = await import('../src/session');
    const { onSolved } = await import('../src/ui/modes');
    const { actions } = await import('../src/state');
    const complete = vi.spyOn(actions, 'complete');
    const tk = { ...ticket('A'), grants: ['select'] };
    session.mode = { kind: 'practice', run: { id: 1, items: [{ ticketId: 'A', variant: 1, skills: ['select'] }], tickets: [tk], index: 0, wrong: 0, hints: 0, passed: 0, draft: 'SELECT 2' } };
    try {
      const { work, deps } = setup();
      deps.onSolved.mockImplementation(onSolved);
      work.setTicket(tk, 0, true);
      useHint('A');
      editors[0].opts.onSubmit();
      release();
      await flush();
      expect(deps.onSolved).toHaveBeenCalledOnce();
      expect(complete).not.toHaveBeenCalled();
      expect(app.save.completed).toEqual([]);
      expect(app.save.hintsUsed).toEqual({});
      expect(app.save.graded).toEqual({});
      expect(historyOf('A')).toEqual([]);
      expect(app.save.review.select?.box).toBe(2);
      expect(app.save.practice).toEqual({ solved: 1, weak: 0 });
    } finally {
      session.mode = { kind: 'story' };
      complete.mockRestore();
    }
  });

  it('onSolved trong câu chuyện gọi complete()', async () => {
    const { onSolved } = await import('../src/ui/modes');
    const { actions } = await import('../src/state');
    const complete = vi.spyOn(actions, 'complete').mockImplementation(() => {});
    const tk = ticket('A');
    onSolved(tk);
    expect(complete).toHaveBeenCalledWith(tk);
    complete.mockRestore();
  });
});

describe('nộp sai: ô trống, gợi ý wrong:, kết quả cũ', () => {
  it('bài faded còn ô ___: không chấm, không tính là nộp sai', async () => {
    const { work, deps } = setup();
    const onWrong = vi.fn();
    (deps as { onWrong?: () => void }).onWrong = onWrong;
    app.save.drafts['A#0'] = 'SELECT ___ FROM ports';
    open(work, { ...ticket('A'), format: 'faded' });
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.db.run).not.toHaveBeenCalled();
    expect(onWrong).not.toHaveBeenCalled();
    expect(deps.onSolved).not.toHaveBeenCalled();
    expect(app.lastRun).toBeUndefined();
  });

  it('Run bấm khi gợi ý của lần nộp sai còn đang chạy: bị chặn, không đè kết quả', async () => {
    const pending: (() => void)[] = [];
    const db = {
      run: vi.fn((sql: string) => (sql === 'SELECT 1 AS n'
        ? Promise.resolve(result)
        : sql === 'SELECT 2'
          ? Promise.resolve({ ...result, rows: [[2]] })
          : new Promise<QueryResult>((resolve) => { pending.push(() => resolve({ ...result, rows: [[3]] })); }))),
    };
    const deps = { db, panel: { show: vi.fn(), active: 'columns' }, onSolved: vi.fn(), onStepSolved: vi.fn(), onConclusion: vi.fn(), onRun: vi.fn(), onWrong: vi.fn() };
    const work = mountWork(fakeEl() as unknown as HTMLElement, deps as never);
    app.selectedId = 'B';
    app.stepIndex = 0;
    work.setTicket({ ...ticket('B'), wrong: [{ sql: 'SELECT 3', why: { vi: 'v', en: 'e' } }] }, 0);
    editors[0].opts.onSubmit();
    await flush();
    expect(pending).toHaveLength(1); // the `wrong:` query is running, Submit still busy
    editors[0].opts.onRun();
    expect(db.run).toHaveBeenCalledTimes(3); // player, Solution, wrong: — the Run was refused
    pending[0]();
    await flush();
    expect(deps.onWrong).toHaveBeenCalledOnce();
    expect(app.lastRun?.sql).toBe('SELECT 2');
  });
});

describe('drill (Plan 8a): chạy trên lab, nộp sai không có người gửi', () => {
  it('Nộp sai một drill: mọi câu mang schema lab, tính nộp sai, không có lời người gửi', async () => {
    const db = { run: vi.fn((sql: string, _opts?: unknown) => Promise.resolve(sql === 'SELECT 1 AS n' ? result : { ...result, rows: [[2]] })) };
    const deps = { db, panel: { show: vi.fn(), active: 'columns' }, onSolved: vi.fn(), onStepSolved: vi.fn(), onConclusion: vi.fn(), onRun: vi.fn(), onWrong: vi.fn() };
    const work = mountWork(fakeEl() as unknown as HTMLElement, deps as never);
    app.save.drafts['g-where-3#0'] = 'SELECT 2';
    const { session } = await import('../src/session');
    const tk: Ticket = { ...ticket('g-where-3'), chapter: 0, from: { name: '', dept: '' } };
    session.mode = { kind: 'drill', ticket: tk, drill: {} as never, wrong: 0 };
    try {
      work.setTicket(tk, 0);
      editors[0].opts.onSubmit();
      await flush();
      await flush();
      expect(db.run.mock.calls.map((c) => c[1])).toEqual([{ schema: 'lab' }, { schema: 'lab' }]);
      expect(deps.onWrong).toHaveBeenCalledOnce();
      expect(shownText()).not.toContain(t('voice.values'));
      expect(app.lastRun?.schema).toBe('lab');
    } finally {
      session.mode = { kind: 'story' };
    }
  });
});

describe('wrongTipper', async () => {
  const { wrongTipper } = await import('../src/ui/work');
  const { SKILLS } = await import('../src/progress');
  const { getLang } = await import('../src/i18n');
  const rows = (...v: number[]): QueryResult => ({ columns: ['n'], types: [23], rows: v.map((x) => [x]) });
  const skill = SKILLS[0];
  const tk: Ticket = { ...ticket('W'), grants: [skill.id], wrong: [{ sql: 'W1', why: { vi: 'sai 1', en: 'wrong 1' } }, { sql: 'W2', why: { vi: 'sai 2', en: 'wrong 2' } }] };
  const rowsFail: GradeResult = { ok: false, reason: 'rows', missing: 1, extra: 1, extraRows: [], missingRows: [], expectedRows: 1, actualRows: 1 };
  const make = () => {
    const run = vi.fn(async (sql: string) => (sql === 'W1' ? rows(1) : rows(2, 3)));
    return { run, tip: wrongTipper(run) };
  };

  it('khớp kết quả một câu wrong: → lời giải thích của câu đó; chạy mỗi câu một lần', async () => {
    const { run, tip } = make();
    expect((await tip(tk, rows(3, 2), rowsFail))?.()).toBe(tk.wrong![1].why[getLang()]);
    expect((await tip(tk, rows(3, 2), rowsFail))?.()).toBe(tk.wrong![1].why[getLang()]);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('không khớp → bẫy của kỹ năng; kết quả rỗng không bao giờ khớp wrong:', async () => {
    const { run, tip } = make();
    expect((await tip(tk, rows(9), rowsFail))?.()).toContain(skill.trap[getLang()]);
    expect((await tip(tk, rows(), rowsFail))?.()).toContain(skill.trap[getLang()]);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('sai số cột: không gợi ý, không chạy câu wrong:', async () => {
    const { run, tip } = make();
    expect(await tip(tk, rows(1), { ok: false, reason: 'columns', expected: 2, actual: 1 })).toBeUndefined();
    expect(run).not.toHaveBeenCalled();
  });
});

describe('ôn đầu chương (warm-up)', async () => {
  const { loadTickets } = await import('../src/content');
  const { session, today, warmupDone, warmupToday } = await import('../src/session');
  const { onPracticeSolved } = await import('../src/ui/modes');
  const { movedToday, addDays } = await import('../src/practice');
  const all = loadTickets();

  it('movedToday: đúng khi hạn ôn cách hôm nay đúng một khoảng của hộp', () => {
    const d = '2026-11-17';
    expect(movedToday({ box: 2, due: addDays(d, 2) }, d)).toBe(true);
    expect(movedToday({ box: 2, due: addDays(d, 1) }, d)).toBe(false);
    expect(movedToday(undefined, d)).toBe(false);
  });

  it('ôn xong trong ngày thì thẻ ẩn; làm lại không đẩy hộp lần nữa', () => {
    app.tickets = all;
    app.save.completed = all.filter((t) => t.chapter < 4).map((t) => t.id); // chapter 4 starts
    warmupDone.key = '';
    const items = warmupToday(() => 0);
    expect(items.length).toBeGreaterThan(0);
    const finish = () => {
      const tickets = items.map((i) => all.find((t) => t.id === i.ticketId)!);
      session.mode = { kind: 'practice', run: { id: 9, items, tickets, index: items.length - 1, wrong: 0, hints: 0, passed: 0, draft: '', warmup: true } };
      onPracticeSolved();
    };
    try {
      app.save.review = {};
      finish();
      expect(app.save.review[items.at(-1)!.skills[0]]?.box).toBe(2);
      expect(warmupToday(() => 0)).toEqual([]); // hidden until tomorrow
      finish();
      expect(app.save.review[items.at(-1)!.skills[0]]?.box).toBe(2); // no farming
      expect(today()).toBe(warmupDone.key.split('#')[0]);
    } finally {
      session.mode = { kind: 'story' };
      warmupDone.key = '';
      app.tickets = [];
    }
  });
});

/** Chapter 11 (Plan 4): the plan check after a right result, and the index lab. Plans are minimal EXPLAIN JSON. */
describe('chương 11: chấm kế hoạch và phòng thí nghiệm chỉ mục', () => {
  const SEQ = [{ Plan: { 'Node Type': 'Seq Scan', 'Relation Name': 't', 'Total Cost': 100 } }];
  const IDX = [{ Plan: { 'Node Type': 'Index Scan', 'Relation Name': 't', 'Index Name': 'x', 'Total Cost': 5 } }];
  function setup11(plan: unknown) {
    const db = {
      run: vi.fn((sql: string) => Promise.resolve(sql.startsWith('EXPLAIN') ? { columns: ['QUERY PLAN'], types: [114], rows: [[plan]] } : result)),
      lab: vi.fn(() => Promise.resolve({ before: SEQ, after: plan })),
    };
    const panel = { show: vi.fn(), refresh: vi.fn(), active: 'columns' };
    const deps = { db, panel, onSolved: vi.fn(), onStepSolved: vi.fn(), onConclusion: vi.fn(), onRun: vi.fn(), onWrong: vi.fn() };
    return { work: mountWork(fakeEl() as unknown as HTMLElement, deps as never), deps };
  }
  const planTicket = (): Ticket => ({ ...ticket('P'), steps: [{ title: '', prompt: '', solution: 'SELECT 1 AS n', plan: { index: 't' } }] });
  const labTicket = (): Ticket => ({ ...ticket('L'), steps: [{ title: '', prompt: '', solution: 'SELECT 1 AS n', lab: { table: 't', ddl: 'CREATE INDEX ON t (a)', max_cost_ratio: 0.1 } }] });

  it('kết quả đúng nhưng kế hoạch đọc cả bảng: nộp sai, mở tab EXPLAIN, không ghi điểm', async () => {
    app.save.drafts['P#0'] = 'SELECT 1  AS n';
    const { work, deps } = setup11(SEQ);
    open(work, planTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.onWrong).toHaveBeenCalledOnce();
    expect(deps.onSolved).not.toHaveBeenCalled();
    expect(deps.panel.show).toHaveBeenLastCalledWith('explain');
    expect(app.save.graded).toEqual({});
  });

  it('kết quả đúng và kế hoạch dùng chỉ mục: qua', async () => {
    app.save.drafts['P#0'] = 'SELECT 1  AS n';
    const { work, deps } = setup11(IDX);
    open(work, planTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.onSolved).toHaveBeenCalledOnce();
    expect(deps.db.run).toHaveBeenCalledWith('EXPLAIN (FORMAT JSON) SELECT 1  AS n', { schema: 'game' }); // Plan 8a: every workspace run names its schema
  });

  it('phòng thí nghiệm: chỉ mục làm kế hoạch đọc qua chỉ mục và đủ rẻ thì qua, lưu câu CREATE INDEX làm bài đã chấm', async () => {
    app.save.drafts['L#0'] = 'CREATE INDEX ON t (a)';
    const { work, deps } = setup11(IDX);
    open(work, labTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(deps.db.lab).toHaveBeenCalledWith('CREATE INDEX ON t (a)', 'SELECT 1 AS n', 't');
    expect(deps.onSolved).toHaveBeenCalledOnce();
    expect(app.save.graded).toEqual({ 'L#0': 'CREATE INDEX ON t (a)' });
  });

  it('phòng thí nghiệm: kế hoạch vẫn đọc cả bảng thì nộp sai; câu không phải CREATE INDEX thì không chạy, không tính sai', async () => {
    app.save.drafts['L#0'] = 'CREATE INDEX ON t (b)';
    const a = setup11(SEQ);
    open(a.work, labTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(a.deps.onWrong).toHaveBeenCalledOnce();
    expect(a.deps.onSolved).not.toHaveBeenCalled();

    app.save.drafts['L#0'] = 'SELECT 1';
    const b = setup11(IDX);
    open(b.work, labTicket());
    editors[editors.length - 1].opts.onSubmit();
    await flush();
    expect(b.deps.db.lab).not.toHaveBeenCalled();
    expect(b.deps.onWrong).not.toHaveBeenCalled();
  });

  it('EXPLAIN lúc chấm bị quá giờ: báo lỗi DB bình thường, không phải "lỗi nội dung ticket", không chấm', async () => {
    app.save.drafts['P#0'] = 'SELECT 1  AS n';
    const { work, deps } = setup11(IDX);
    deps.db.run.mockImplementation((sql: string) => (sql.startsWith('EXPLAIN') ? Promise.reject(new QueryTimeoutError(5000)) : Promise.resolve(result)));
    open(work, planTicket());
    editors[0].opts.onSubmit();
    await flush();
    expect(shownText()).toContain(t('err.timeout', { s: 5 }));
    expect(shownText()).not.toContain(t('work.contentBug', { msg: '' }).trim());
    expect(deps.onSolved).not.toHaveBeenCalled();
    expect(deps.onWrong).not.toHaveBeenCalled();
  });

  it('EXPLAIN lúc chấm báo lỗi SQL: hiện thông báo Postgres và ghi chú dạy, không phải "lỗi nội dung ticket", không chấm', async () => {
    app.save.drafts['P#0'] = 'SELECT 1  AS n';
    const { work, deps } = setup11(IDX);
    deps.db.run.mockImplementation((sql: string) => (sql.startsWith('EXPLAIN')
      ? Promise.reject(new SqlError({ message: 'syntax error at or near "x"', code: '42601' }))
      : Promise.resolve(result)));
    open(work, planTicket());
    editors[0].opts.onSubmit();
    await flush();
    const deep = (x: unknown): string[] => (typeof x === 'string' ? [x] : ((x as { kids?: unknown[] })?.kids ?? []).flatMap(deep));
    const text = els.flatMap((e) => e.shown).flatMap(deep).join(' | '); // errorView nests the message one level down
    expect(text).toContain('syntax error at or near "x"');
    expect(text).toContain(t('sqlerr.42601'));
    expect(text).not.toContain(t('work.contentBug', { msg: '' }).trim());
    expect(deps.onSolved).not.toHaveBeenCalled();
    expect(deps.onWrong).not.toHaveBeenCalled();
    expect(app.save.graded).toEqual({});
  });

  it('phòng thí nghiệm: Chạy ghi câu CREATE INDEX vào lịch sử và xóa lastRun cũ', async () => {
    app.save.drafts['L#0'] = 'CREATE INDEX ON t (a)';
    app.lastRun = { key: 'L#0', sql: 'SELECT old', offset: 0, result };
    const { work, deps } = setup11(IDX);
    open(work, labTicket());
    editors[0].opts.onRun();
    await flush();
    expect(deps.db.lab).toHaveBeenCalledOnce();
    expect(historyOf('L').map((e) => e.sql)).toEqual(['CREATE INDEX ON t (a)']);
    expect(app.lastRun).toBeUndefined();
    expect(deps.panel.refresh).toHaveBeenCalled(); // the tabs redraw without the old run
  });
});
