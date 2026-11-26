// v27 R3 + v29 R6 (product-route-v24 §2.2, §4 R3/R6): the eight-section anatomy of PostgreSQL Engine lessons, L1–L5 (R6 extends the
// scope to L3–L5 and the NoSQL engines). Sections per kind (§2.2 "tập con"):
//   concept/lab: Mở bài · Ý chính · Cú pháp · Ví dụ · Lỗi hay gặp · (lab: Thực hành) · Tóm tắt, plus questions;
//   quiz: Mở bài · Ý chính · Ví dụ · Tóm tắt; predict: Mở bài · Ý chính · Tóm tắt (the predict card is its example);
//   capstone: Mở bài · Thực hành · Tóm tắt.
// Runs: one fresh lab database per lesson (the lab runtime, src/engine/pglab): setup, then every ```sql block of "Ví dụ" and
// "Lỗi hay gặp" in page order. An example block's result (its last statement with a result set) has rows; a block marked `-- ERROR <SQLSTATE>: …`
// fails with that code on its last statement; a `-- WRONG` block runs and returns other rows than the `-- FIX` block after
// it. Questions: ≥ 2 (quiz items + the predict; capstone ≥ 1), and outside capstones ≥ 1 carries `trap:` (the option a
// believer of the misconception picks; read from the raw frontmatter, the page does not need it).
// Grading: every step graded on the catalog or on an `after` read fails when the player does nothing (`SELECT 1`).
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, parseEngineLesson, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { demoBlocks, demoSetup, pgDemoScript, type DemoBlock } from '../src/engine/demo';
import { gradable } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import { wordCount } from '../src/fullLesson';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<string>('../content/engine/postgres/{L*,ext}/*.md', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));

const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: Record<EngineLesson['kind'], SectionId[]> = {
  concept: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'recap'],
  lab: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
  quiz: ['open', 'idea', 'example', 'recap'],
  predict: ['open', 'idea', 'recap'],
  capstone: ['open', 'practice', 'recap'],
};
const text = (l: EngineLesson, id: SectionId): { vi: string; en: string } | undefined => l.sections.find((s) => s.id === id)?.text;
const sqlBlocks = (t: string | undefined): string[] => (t ? blocksOf(t).flatMap((b) => (b.kind === 'code' && b.lang === 'sql' ? [b.code] : [])) : []);
const isErr = (b: string): boolean => /^--\s*ERROR\b/m.test(b);
const words = (l: EngineLesson): number => l.sections.reduce((n, s) => n + wordCount(s.text.vi.replace(/```[\s\S]*?```/g, '')), 0);

describe('Engine PostgreSQL L1–L5: giải phẫu 8 mục (R3, R6)', () => {
  it('đủ 105 bài L1–L5 (v28 thêm L4-17..19; v32 thêm L1-18, L2-25, L5-18; v35 thêm L1-19, L2-26, L4-20, L5-19..22)', () => expect(all.filter((x) => x.l.level !== 'EXT').length).toBe(105)); // v43: the Extensions shelf (postgres/ext) is counted apart

  it.each(all.map((x) => [x.l.id, x] as const))('%s: mục theo loại bài, thứ tự, độ dài, câu hỏi, nguồn', (_, { l, fm }) => {
    const ids = l.sections.map((s) => s.id);
    expect(ids, 'thứ tự mục').toEqual([...ids].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect(NEED[l.kind].filter((k) => !ids.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCount(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    const syntax = text(l, 'syntax');
    if (syntax) expect(blocksOf(syntax.vi)[0]?.kind, 'Cú pháp mở bằng khối sql').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    expect(l.sources.some((u) => u.startsWith('https://www.postgresql.org/docs/'))).toBe(true);
    if (l.kind === 'concept' || l.kind === 'lab') {
      const ex = sqlBlocks(text(l, 'example')?.vi).filter((b) => !isErr(b));
      expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối chạy ra dòng (${ex.length})`).toBe(true);
      const pit = sqlBlocks(text(l, 'pitfalls')?.vi).filter((b) => isErr(b) || /^--\s*WRONG\b/m.test(b));
      expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
    }
    if (l.kind === 'lab') expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
    const qs = [...((fm.quiz as Record<string, unknown>[] | undefined) ?? []), ...(fm.predict ? [fm.predict as Record<string, unknown>] : [])];
    expect(qs.length, 'số câu hỏi').toBeGreaterThanOrEqual(l.kind === 'capstone' ? 1 : 2);
    for (const q of qs) if (q.trap !== undefined) {
      const n = (q.options as unknown[]).length;
      expect(typeof q.trap === 'number' && q.trap !== q.answer && q.trap >= 0 && q.trap < n, 'trap = một lựa chọn sai').toBe(true);
    }
    if (l.kind !== 'capstone') expect(qs.some((q) => q.trap !== undefined), '≥ 1 câu có trap (hiểu lầm)').toBe(true);
  });

  it('độ dài chữ VI (đích §2.2: concept 500–900, lab 350–700; không chặn, in ra để báo cáo)', () => {
    const short = all.map(({ l }) => [l.id, l.kind, words(l)] as const).filter(([, k, n]) => (k === 'concept' ? n < 500 : k === 'lab' ? n < 350 : false));
    if (short.length) console.log('dưới đích §2.2:', short.map((x) => x.join(' ')).join('; '));
    expect(all.every(({ l }) => words(l) > 0)).toBe(true);
    // v38 (L581): the multi-tenant lessons block at the floor
    expect(short.filter(([id]) => /^e-pg-l(1-19|2-26|4-20|5-(10|19|2[0-2]))$/.test(id))).toEqual([]);
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup', async (_, l) => {
    // v30.1 (L480): the blocks and the script are the lesson page's own (src/engine/demo.ts), so page and test cannot drift
    const bs = demoBlocks(l);
    const runs = bs.flatMap((b, i) => (b.runs ? [i] : []));
    for (const i of runs) {
      expect(splitSql(bs[i].run).length, `khối rỗng: ${bs[i].code.slice(0, 60)}`).toBeGreaterThan(0);
      if (bs[i].mark === 'error') expect(bs[i].error, `-- ERROR cần SQLSTATE: ${bs[i].code.slice(0, 60)}`).toBeDefined();
    }
    if (!runs.length) return;
    const { steps, span } = pgDemoScript(bs, bs.length - 1);
    const setup = demoSetup(l);
    const r = await runLabScript({ setup, extensions: extensionsOf(setup, ...runs.map((i) => bs[i].run)), steps });
    expect(r.setupError).toBeUndefined();
    const bad = r.failedStep === undefined ? undefined : r.steps[r.failedStep];
    expect(bad && [bad.sql.slice(0, 120), bad.error?.code, bad.error?.message]).toBeUndefined();
    // a block's result: its last statement that returns a result set (a block may end with RESET ROLE, COMMIT…)
    const result = (i: number) => r.steps.slice(...span[i]).filter((x) => x.columns.length).at(-1) ?? r.steps[span[i][1] - 1];
    runs.forEach((i, n) => {
      const b = bs[i];
      if (b.mark === 'error') return;
      if (b.mark === 'wrong') {
        const fix = runs[n + 1];
        expect(fix !== undefined && bs[fix].mark === 'fix', `-- WRONG cần -- FIX ngay sau: ${b.code.slice(0, 60)}`).toBe(true);
        expect(compareResults(result(fix), result(i), false).ok, `WRONG ra cùng dòng với FIX: ${b.code.slice(0, 60)}`).toBe(false);
        return;
      }
      expect(result(i).rows.length, `khối không ra dòng: ${b.code.slice(0, 80)}`).toBeGreaterThan(0);
    });
  }, 120_000);
});

describe('Engine PostgreSQL L1–L5: bước chấm bằng catalog hoặc `after` không qua khi không làm gì', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 200) }, { run: runLabScript, reset: () => undefined });
  const steps = all.flatMap(({ l }) => (l.lab?.steps ?? []).map((s, i) => [`${l.id} s${i + 1}`, l, i] as const)
    .filter(([, , i]) => { const s = l.lab!.steps[i]; return gradable(l, s) && (s.after !== undefined || s.check === 'catalog'); }));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------------------------------
// v29 R6 (product-route-v24 §2.2, §4 R6): MongoDB and DynamoDB L1–L5 (v30 adds L1–L2) on the same section model, subset by kind (NEED above).
// Runnable blocks in "Ví dụ" and "Lỗi hay gặp": MongoDB ```javascript or ```js (one mongosh command) on mingo, DynamoDB ```json (one
// `{ op, input }` request) or ```partiql (one statement) on dynoxide; ```text blocks are shown, never run (server output,
// commands a browser cannot run, numbers quoted from the docs). Leading `//` / `--` comment lines are markers, stripped
// before the run: `// ERROR <code>` (MongoDB error code, DynamoDB exception name) must be refused with it, `// WRONG` needs
// a `// FIX` block right after that gives another result (documents, items or ScannedCount), any other block succeeds and
// returns something. Data: the lab's `setup`, else frontmatter `demo_setup` (read here only), else MongoDB's `shop` dataset.
// A `runtime: browser` concept/lab shows ≥ 2 runnable examples; a `runtime: docs` one may show its examples as text.
import { beforeAll as beforeAllNs, vi as viNs } from 'vitest';
import { DynamoEngine as DynamoEngineNs } from '../src/engine/dynamo/engine';
import { dynamoRunner as dynamoRunnerNs, labOf as labOfNs } from '../src/engine/dynamo/runner';
import type { DynamoRequest as DynamoRequestNs } from '../src/engine/dynamo/types';
import { loadDataset as loadDatasetNs, runMongo as runMongoNs } from '../src/engine/mongo/engineMongo';
import { mongoRunner as mongoRunnerNs } from '../src/engine/mongo/runner';

const nsFiles = import.meta.glob<string>('../content/engine/{mongodb,dynamodb}/L[1-5]/*.md', { query: '?raw', import: 'default', eager: true });
const nsAll = Object.entries(nsFiles).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
// v30.1 (L480): the block grammar is the lesson page's own (src/engine/demo.ts)
const nsBlocks = (l: EngineLesson, id: SectionId): DemoBlock[] => demoBlocks(l).filter((b) => b.sec === id);
const isTrap = (b: DemoBlock): boolean => b.mark === 'error' || b.mark === 'wrong';

describe('Engine MongoDB/DynamoDB L1–L5: giải phẫu theo loại bài (R6, v30 thêm L1–L2)', () => {
  it('đủ 137 bài (Mongo 73, Dynamo 64; v36 thêm mg L3-19, L5-12, dy L3-14, L4-16, L5-09)', () => {
    expect(nsAll.filter((x) => x.l.engine === 'mongodb').length).toBe(73);
    expect(nsAll.filter((x) => x.l.engine === 'dynamodb').length).toBe(64);
  });

  it.each(nsAll.map((x) => [x.l.id, x] as const))('%s: mục theo loại bài, thứ tự, độ dài, câu hỏi, nguồn', (_, { l, fm }) => {
    const ids = l.sections.map((s) => s.id);
    expect(ids, 'thứ tự mục').toEqual([...ids].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect(NEED[l.kind].filter((k) => !ids.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCount(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    const syntax = text(l, 'syntax');
    if (syntax) expect(blocksOf(syntax.vi)[0]?.kind, 'Cú pháp mở bằng khối code').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    const home = l.engine === 'mongodb' ? 'https://www.mongodb.com/docs/' : 'https://docs.aws.amazon.com/';
    expect(l.sources.some((u) => u.startsWith(home)), `nguồn chính thức ${home}`).toBe(true);
    if (l.kind === 'concept' || l.kind === 'lab') {
      const ex = nsBlocks(l, 'example').filter((b) => !isTrap(b));
      // v44 (L766): a figure placed in Ví dụ replaced a text-drawn block, so it counts as one of the examples
      const shown = ex.length + (l.figures ?? []).filter((f) => f.at === 'example').length;
      expect(shown >= 2 && shown <= 6, `Ví dụ 2–6 khối hay hình (${shown})`).toBe(true);
      if (l.runtime !== 'docs') expect(ex.filter((b) => b.runs).length, 'bài chạy trong trình duyệt: ≥ 2 ví dụ chạy được').toBeGreaterThanOrEqual(2);
      const pit = nsBlocks(l, 'pitfalls').filter(isTrap);
      expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
    }
    if (l.kind === 'lab') expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
    const qs = [...((fm.quiz as Record<string, unknown>[] | undefined) ?? []), ...(fm.predict ? [fm.predict as Record<string, unknown>] : [])];
    expect(qs.length, 'số câu hỏi').toBeGreaterThanOrEqual(l.kind === 'capstone' ? 1 : 2);
    for (const q of qs) if (q.trap !== undefined) {
      const n = (q.options as unknown[]).length;
      expect(typeof q.trap === 'number' && q.trap !== q.answer && q.trap >= 0 && q.trap < n, 'trap = một lựa chọn sai').toBe(true);
    }
    if (l.kind !== 'capstone') expect(qs.some((q) => q.trap !== undefined), '≥ 1 câu có trap (hiểu lầm)').toBe(true);
  });

  it('độ dài chữ VI (đích §2.2; chặn ở L1–L2, L3–L5 chỉ in ra)', () => {
    const short = nsAll.map(({ l }) => [l.id, l.kind, words(l)] as const).filter(([, k, n]) => (k === 'concept' ? n < 500 : k === 'lab' ? n < 350 : false));
    if (short.length) console.log('dưới đích §2.2:', short.map((x) => x.join(' ')).join('; '));
    expect(nsAll.every(({ l }) => words(l) > 0)).toBe(true);
    // v33 (L531): L1–L2 reached the floor, so there it blocks; L3–L5 concepts stay print-only until lengthened
    expect(short.filter(([id]) => /-l[12]-/.test(id)), 'L1–L2 dưới đích §2.2').toEqual([]);
    // v38 (L581): so do the multi-tenant lessons
    expect(short.filter(([id]) => /^e-(mg-l3-19|mg-l5-12|dy-l3-14|dy-l4-16|dy-l5-09)$/.test(id))).toEqual([]);
  });

  const lang = () => 'en' as const;
  const mongo = mongoRunnerNs({ lang }, { exec: async (src: string, ds: string, stages?: boolean) => runMongoNs(await loadDatasetNs(ds), src, { stages }) });
  let eng: DynamoEngineNs;
  beforeAllNs(async () => {
    viNs.spyOn(console, 'warn').mockImplementation(() => {});
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
    eng = await DynamoEngineNs.open(() => import('@dynoxide/wasm-engine/worker'));
  }, 60_000);
  const dynamo = dynamoRunnerNs({ lang }, {
    request: async (req: DynamoRequestNs, o: { dataset: string; after?: DynamoRequestNs }) => {
      await eng.setup(o.dataset, labOfNs(o.dataset));
      return eng.run(req, o.after);
    },
  } as never);
  /** What a block gives, as text: refused → `err` (MongoDB code, DynamoDB exception); else documents/value or items + ScannedCount. */
  const runBlock = async (l: EngineLesson, setup: string, code: string): Promise<{ err?: string; out: string; empty: boolean }> => {
    const lab = { setup, steps: [] };
    try {
      if (l.engine === 'mongodb') {
        const r = await mongo.exec(lab, code);
        // v30.1: the lesson page runs blocks through run() (stages on, docs → table); it must draw what exec() returned
        const shown = await mongo.run(lab, code);
        if (r.docs.length && shown.rows.length !== r.docs.length) return { err: `run() drew ${shown.rows.length} of ${r.docs.length}`, out: '', empty: true };
        return { out: JSON.stringify([r.kind, r.docs, r.value]), empty: r.kind === 'docs' && !r.docs.length && r.value === undefined };
      }
      const r = await dynamo.run(lab, code);
      // v37: columns now have a fixed order, so a WRONG that returns the same items must differ in cost (ScannedCount or consumed capacity)
      const d = r.meta?.dynamo as Record<string, unknown> | undefined;
      return { out: JSON.stringify([r.rows, d?.scanned, d?.capacity ?? d?.consumed ?? d?.rcu]), empty: !r.meta?.dynamo?.write && !r.rows.length };
    } catch (e) {
      const x = e as { code?: string; type?: string; message?: string };
      return { err: x.code ?? x.type ?? `? ${x.message}`, out: '', empty: true };
    }
  };

  it.each(nsAll.map((x) => [x.l.id, x] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật (mingo / dynoxide)', async (_, { l }) => {
    const blocks = [...nsBlocks(l, 'example'), ...nsBlocks(l, 'pitfalls')];
    const setup = demoSetup(l) ?? '';
    for (const [i, b] of blocks.entries()) {
      if (!b.runs) continue;
      expect(setup, 'khối chạy được cần lab.setup hoặc demo_setup').not.toBe('');
      const r = await runBlock(l, setup, b.run);
      const want = b.error;
      if (want !== undefined) {
        expect(want, `// ERROR cần mã: ${b.run.slice(0, 60)}`).not.toBe('');
        expect([b.run.slice(0, 80), r.err]).toEqual([b.run.slice(0, 80), want]);
        continue;
      }
      expect([b.run.slice(0, 80), r.err]).toEqual([b.run.slice(0, 80), undefined]);
      if (b.mark === 'wrong') {
        const fix = blocks[i + 1];
        expect(fix !== undefined && fix.mark === 'fix' && fix.runs, `// WRONG cần // FIX chạy được ngay sau: ${b.run.slice(0, 60)}`).toBe(true);
        const f = await runBlock(l, setup, fix.run);
        expect(f.err, `FIX lỗi: ${fix.run.slice(0, 60)}`).toBeUndefined();
        expect(f.out === r.out, `WRONG ra cùng kết quả với FIX: ${b.run.slice(0, 60)}`).toBe(false);
        continue;
      }
      expect(r.empty, `khối không ra gì: ${b.run.slice(0, 80)}`).toBe(false);
    }
  }, 120_000);
});
