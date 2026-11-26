// @vitest-environment jsdom
// v30.1 F01/F13 (L480): an Engine lesson in the General full-lesson layout, in the real app with real lessons. The lab clients
// are swapped for their in-process engines (PGlite lab script, mingo, dynoxide in Node), so a Run goes page → engineFull →
// LAB_RUNNERS → runner → engine exactly as in the browser, minus the worker. Checks: the contents list the lesson's sections
// in page order; an example Run shows rows on each engine; an `ERROR <code>` block shows its code; a WRONG/FIX pair runs both;
// only the current lab step has an editor; axe on the drawn pages.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { boot, EmptyWorker, problems, settle, visit } from './axeHarness';
import { parseEngineLesson, type EngineLesson, type LessonSource } from '../src/engine/content';
import { demoBlocks } from '../src/engine/demo';

vi.mock('../src/engineSources', () => {
  return {
    meta: import.meta.glob(['../content/engine/postgres/L1/01-*.md', '../content/engine/postgres/L1/02-*.md', '../content/engine/mongodb/L1/02-*.md', '../content/engine/dynamodb/L1/01-*.md', '../content/engine/design/L1/02-*.md'],
      { query: '?fm&meta=id,engine,level,module,title,title_en,kind,minutes,requires,runtime,viz', import: 'default', eager: true }),
    full: import.meta.glob(['../content/engine/postgres/L1/01-*.md', '../content/engine/postgres/L1/02-*.md', '../content/engine/mongodb/L1/02-*.md', '../content/engine/dynamodb/L1/01-*.md', '../content/engine/design/L1/02-*.md'],
      { query: '?fm', import: 'default' }),
    modules: import.meta.glob('../content/engine/*/modules.yml', { import: 'default', eager: true }),
  };
});
vi.mock('../src/engine/pglab/client', async () => {
  const { runLabScript } = await import('../src/engine/pglab/session');
  return { PgLabClient: class { run = runLabScript; reset() {} } };
});
vi.mock('../src/engine/mongo/client', async (orig) => {
  const e = await import('../src/engine/mongo/engineMongo');
  return { ...(await orig<object>()), MongoLabClient: class { async exec(src: string, ds: string, stages?: boolean) { return e.runMongo(await e.loadDataset(ds), src, { stages }); } } };
});
vi.mock('../src/engine/dynamo/client', async (orig) => {
  const { DynamoEngine } = await import('../src/engine/dynamo/engine');
  let eng: ReturnType<typeof DynamoEngine.open> | undefined;
  return {
    ...(await orig<object>()),
    DynamoClient: class {
      constructor(private labOf: (s: string) => never) {}
      async request(req: never, o: { dataset: string; after?: never }) {
        const x = await (eng ??= DynamoEngine.open(() => import('@dynoxide/wasm-engine/worker')));
        await x.setup(o.dataset, this.labOf(o.dataset));
        return x.run(req, o.after);
      }
    },
  };
});

const files = import.meta.glob<LessonSource>(['../content/engine/postgres/L1/01-*.md', '../content/engine/postgres/L1/02-*.md', '../content/engine/mongodb/L1/02-*.md', '../content/engine/dynamodb/L1/01-*.md', '../content/engine/design/L1/02-*.md'],
  { query: '?fm', import: 'default', eager: true });
const lessons = new Map(Object.entries(files).map(([p, s]) => { const l = parseEngineLesson(s, p); return [l.id, l] as const; }));
const L = (id: string): EngineLesson => lessons.get(id)!;
const hashOf = (l: EngineLesson): string => `#/engine/${l.engine}/${l.level}/${l.id}`;
const q = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);

beforeAll(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // dynoxide's wasm by file URL in Node (tests/engineAnatomy.test.ts does the same)
  (globalThis as Record<string, unknown>).self ??= globalThis;
  const node = (globalThis as unknown as { process: { getBuiltinModule(id: string): unknown } }).process;
  const { readFile } = node.getBuiltinModule('fs/promises') as { readFile(p: string): Promise<Uint8Array<ArrayBuffer>> };
  const { fileURLToPath } = node.getBuiltinModule('url') as { fileURLToPath(u: string): string };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith('file:')) return realFetch(input, init);
    return new Response(await readFile(fileURLToPath(url)), { headers: { 'content-type': 'application/wasm' } });
  };
  await boot({ worker: EmptyWorker, storage: { 'cargo-query/coach-done': 'true', 'cargo-query/domain': '"logistics"' } });
}, 60_000);

/** What the contents should list: the sections in file order (Recap last), with the predict, lab and questions cards before Recap. */
const want = (l: EngineLesson): string[] => {
  const ids = l.sections.map((s) => s.id);
  return [...ids.filter((x) => x !== 'recap'), ...(l.predict ? ['predict'] : []), ...(l.lab && !ids.includes('practice') ? ['lab'] : []),
    ...(l.quiz?.length ? ['quiz'] : []), ...(ids.includes('recap') ? ['recap'] : [])];
};
const runAndWait = async (l: EngineLesson, i: number): Promise<HTMLElement> => {
  const btn = q(`[data-ek="${l.id}-x${i}-run"]`)!;
  btn.focus();
  btn.click();
  await vi.waitFor(() => expect(q(`[data-demo="${i}"] [role=status], [data-demo="${i}"] .error`)).not.toBeNull(), { timeout: 90_000, interval: 100 });
  return q(`[data-demo="${i}"]`)!;
};

describe('Engine full-lesson layout (F01)', () => {
  it.each(['e-pg-l1-01', 'e-mg-l1-02', 'e-dy-l1-01', 'e-ds-l1-02'])('%s: contents in page order, icon headings, wrapper hooks, axe', async (id) => {
    const l = L(id);
    await visit(hashOf(l));
    const page = q('#engine-page')!;
    expect(page.dataset.lesson).toBe(id);
    expect(page.hasAttribute('data-lesson-page')).toBe(true);
    const toc = [...document.querySelectorAll<HTMLElement>('#engine-page aside [data-toc]')];
    expect(toc.map((b) => b.dataset.toc)).toEqual(want(l));
    expect([...document.querySelectorAll<HTMLElement>('#engine-page [data-fl-toc] [data-toc]')].map((b) => b.dataset.toc)).toEqual(want(l));
    // every entry points at a heading on the page, in the same order
    const heads = toc.map((b) => document.getElementById(b.dataset.toc!.match(/^(predict|lab|quiz)$/) ? `${id}-${{ predict: 'pred', lab: 'lab', quiz: 'quiz' }[b.dataset.toc as 'lab']}` : `ek-${b.dataset.toc}-h`));
    expect(heads.every(Boolean)).toBe(true);
    for (let i = 1; i < heads.length; i++) expect(heads[i - 1]!.compareDocumentPosition(heads[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(q(`#ek-${l.sections[0].id}-h svg`)).not.toBeNull(); // the icon badge
    expect(await problems()).toEqual([]);
  }, 60_000);

  it('PostgreSQL: an example shows rows; an ERROR block shows its SQLSTATE; WRONG/FIX run together (0 XP, nothing saved)', async () => {
    const l = L('e-pg-l1-01');
    await visit(hashOf(l));
    const { app } = await import('../src/state');
    const before = JSON.stringify(app.save);
    const bs = demoBlocks(l);
    const ex = await runAndWait(l, 0);
    expect(ex.querySelector('table')).not.toBeNull();
    expect(ex.querySelector('[role=status]')!.className).toContain('text-good');
    expect(document.activeElement?.getAttribute('data-ek')).toBe(`${l.id}-x0-run`); // focus survives the redraw
    const e = bs.findIndex((b) => b.mark === 'error');
    const err = await runAndWait(l, e);
    expect(err.textContent).toContain(bs[e].error!);
    expect(err.querySelector('[role=status]')!.className).toContain('text-good'); // the expected error is the teaching point
    const w = bs.findIndex((b) => b.mark === 'wrong');
    await runAndWait(l, w);
    await vi.waitFor(() => expect(q(`[data-demo="${w + 1}"] table`)).not.toBeNull(), { timeout: 30_000 });
    expect(q(`[data-demo="${w}"] table`)).not.toBeNull();
    expect(JSON.stringify(app.save)).toBe(before);
    await settle();
    expect(await problems()).toEqual([]);
  }, 120_000);

  it.each(['e-mg-l1-02', 'e-dy-l1-01', 'e-ds-l1-02'])('%s: an example Run shows rows on its own runtime, an ERROR block its code', async (id) => {
    const l = L(id);
    await visit(hashOf(l));
    const bs = demoBlocks(l);
    const x = bs.findIndex((b) => b.runs && !b.mark && b.sec === 'example');
    const ex = await runAndWait(l, x);
    expect(ex.querySelector('table')).not.toBeNull();
    // v38 (R2 E17): each engine names its own unit (documents, items, rows), in the line and the table caption
    const unit = { mongodb: 'tài liệu', dynamodb: 'item', postgres: 'dòng', design: 'dòng', stack: 'dòng', stream: 'dòng' }[l.engine];
    expect(ex.querySelector('[role=status]')!.textContent).toMatch(new RegExp(`^\\d+ ${unit} trong`));
    expect(ex.querySelector('caption')!.textContent).toMatch(new RegExp(`^Kết quả: \\d+ ${unit}$`));
    const e = bs.findIndex((b) => b.mark === 'error');
    if (e >= 0) {
      const err = await runAndWait(l, e);
      expect(err.querySelector('[role=status]')!.textContent).toContain(bs[e].error!);
    }
  }, 120_000);
});

describe('lab steps: only the current one has an editor (F13)', () => {
  it('e-pg-l1-02: step 1 has the editor, later steps a prompt and "Mở bước"; opening one builds its editor', async () => {
    const l = L('e-pg-l1-02');
    await visit(hashOf(l));
    const codes = () => [...document.querySelectorAll<HTMLElement>('li[data-step] [data-ek$="-code"]')].map((x) => x.dataset.ek);
    expect(codes()).toEqual([`${l.id}-s0-code`]);
    expect(q(`[data-ek="${l.id}-s0-code"]`)).toHaveProperty('value');
    for (let i = 1; i < l.lab!.steps.length; i++) {
      expect(q(`[data-ek="${l.id}-s${i}-submit"]`)).toBeNull();
      expect(q(`[data-ek="${l.id}-s${i}-status"]`)).not.toBeNull();
      expect(q(`[data-ek="${l.id}-s${i}-open"]`)).not.toBeNull();
    }
    q(`[data-ek="${l.id}-s1-open"]`)!.click();
    expect(codes()).toEqual([`${l.id}-s0-code`, `${l.id}-s1-code`]);
    await settle();
    expect(await problems()).toEqual([]);
  }, 60_000);
});
