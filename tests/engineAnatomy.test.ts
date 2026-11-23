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
import { gradable } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { wordCount } from '../src/fullLesson';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<string>('../content/engine/postgres/L*/*.md', { query: '?raw', import: 'default', eager: true });
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
const ERR = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m;
const isErr = (b: string): boolean => /^--\s*ERROR\b/m.test(b);
const words = (l: EngineLesson): number => l.sections.reduce((n, s) => n + wordCount(s.text.vi.replace(/```[\s\S]*?```/g, '')), 0);

describe('Engine PostgreSQL L1–L5: giải phẫu 8 mục (R3, R6)', () => {
  it('đủ 95 bài L1–L5 (v28 thêm L4-17..19)', () => expect(all.length).toBe(95));

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
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup', async (_, l) => {
    const blocks = [...sqlBlocks(text(l, 'example')?.vi), ...sqlBlocks(text(l, 'pitfalls')?.vi)];
    // code is identical in VI and EN (lessonProblems), so the VI blocks are the page's blocks in both languages
    const steps: ScriptStep[] = [];
    const span: [number, number][] = []; // each block's statements in `steps`
    for (const b of blocks) {
      const stmts = splitSql(b);
      expect(stmts.length, `khối rỗng: ${b.slice(0, 60)}`).toBeGreaterThan(0);
      const code = ERR.exec(b)?.[1];
      if (isErr(b)) expect(code, `-- ERROR cần SQLSTATE: ${b.slice(0, 60)}`).toBeDefined();
      stmts.forEach((s, i) => steps.push(code && i === stmts.length - 1 ? { sql: s, expectError: code } : s));
      span.push([steps.length - stmts.length, steps.length]);
    }
    if (!steps.length) return;
    const r = await runLabScript({ setup: l.lab?.setup, extensions: extensionsOf(l.lab?.setup, ...blocks), steps });
    expect(r.setupError).toBeUndefined();
    const bad = r.failedStep === undefined ? undefined : r.steps[r.failedStep];
    expect(bad && [bad.sql.slice(0, 120), bad.error?.code, bad.error?.message]).toBeUndefined();
    // a block's result: its last statement that returns a result set (a block may end with RESET ROLE, COMMIT…)
    const result = (i: number) => r.steps.slice(...span[i]).filter((x) => x.columns.length).at(-1) ?? r.steps[span[i][1] - 1];
    blocks.forEach((b, i) => {
      const out = result(i);
      if (isErr(b)) return;
      if (/^--\s*WRONG\b/m.test(b)) {
        const fix = blocks[i + 1];
        expect(/^--\s*FIX\b/m.test(fix ?? ''), `-- WRONG cần -- FIX ngay sau: ${b.slice(0, 60)}`).toBe(true);
        const f = result(i + 1);
        expect(compareResults(f, out, false).ok, `WRONG ra cùng dòng với FIX: ${b.slice(0, 60)}`).toBe(false);
        return;
      }
      expect(out.rows.length, `khối không ra dòng: ${b.slice(0, 80)}`).toBeGreaterThan(0);
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
// v29 R6 (product-route-v24 §2.2, §4 R6): MongoDB and DynamoDB L3–L5 on the same section model, subset by kind (NEED above).
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

const nsFiles = import.meta.glob<string>('../content/engine/{mongodb,dynamodb}/L[345]/*.md', { query: '?raw', import: 'default', eager: true });
const nsAll = Object.entries(nsFiles).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const RUN_LANG: Record<string, readonly string[]> = { mongodb: ['javascript', 'js'], dynamodb: ['json', 'partiql'] };
type NsBlock = { code: string; run: boolean; marks: string[] };
const nsBlocks = (l: EngineLesson, id: SectionId): NsBlock[] => {
  const t = text(l, id);
  return t ? blocksOf(t.vi).flatMap((b) => {
    if (b.kind !== 'code') return [];
    const lines = b.code.split('\n');
    let n = 0;
    while (n < lines.length && /^\s*(\/\/|--)/.test(lines[n])) n++;
    const marks = lines.slice(0, n).map((x) => x.replace(/^\s*(\/\/|--)\s*/, ''));
    return [{ code: lines.slice(n).join('\n').trim(), run: RUN_LANG[l.engine].includes(b.lang), marks }];
  }) : [];
};
const markOf = (b: NsBlock, m: 'ERROR' | 'WRONG' | 'FIX'): string | undefined =>
  b.marks.map((x) => new RegExp(`^${m}\\b\\s*:?\\s*([A-Za-z_0-9]*)`).exec(x)).find(Boolean)?.[1];
const isTrap = (b: NsBlock): boolean => markOf(b, 'ERROR') !== undefined || markOf(b, 'WRONG') !== undefined;

describe('Engine MongoDB/DynamoDB L3–L5: giải phẫu theo loại bài (R6)', () => {
  it('đủ 79 bài (Mongo 43, Dynamo 36)', () => expect(nsAll.length).toBe(79));

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
      expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối (${ex.length})`).toBe(true);
      if (l.runtime !== 'docs') expect(ex.filter((b) => b.run).length, 'bài chạy trong trình duyệt: ≥ 2 ví dụ chạy được').toBeGreaterThanOrEqual(2);
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

  it('độ dài chữ VI (đích §2.2; không chặn, in ra để báo cáo)', () => {
    const short = nsAll.map(({ l }) => [l.id, l.kind, words(l)] as const).filter(([, k, n]) => (k === 'concept' ? n < 500 : k === 'lab' ? n < 350 : false));
    if (short.length) console.log('dưới đích §2.2:', short.map((x) => x.join(' ')).join('; '));
    expect(nsAll.every(({ l }) => words(l) > 0)).toBe(true);
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
        return { out: JSON.stringify([r.kind, r.docs, r.value]), empty: r.kind === 'docs' && !r.docs.length && r.value === undefined };
      }
      const r = await dynamo.run(lab, code);
      return { out: JSON.stringify([r.rows, r.meta?.dynamo?.scanned]), empty: !r.meta?.dynamo?.write && !r.rows.length };
    } catch (e) {
      const x = e as { code?: string; type?: string; message?: string };
      return { err: x.code ?? x.type ?? `? ${x.message}`, out: '', empty: true };
    }
  };

  it.each(nsAll.map((x) => [x.l.id, x] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật (mingo / dynoxide)', async (_, { l, fm }) => {
    const blocks = [...nsBlocks(l, 'example'), ...nsBlocks(l, 'pitfalls')];
    const setup = l.lab?.setup ?? (typeof fm.demo_setup === 'string' ? fm.demo_setup.trim() : l.engine === 'mongodb' ? 'shop' : '');
    for (const [i, b] of blocks.entries()) {
      if (!b.run) continue;
      expect(setup, 'khối chạy được cần lab.setup hoặc demo_setup').not.toBe('');
      const r = await runBlock(l, setup, b.code);
      const want = markOf(b, 'ERROR');
      if (want !== undefined) {
        expect(want, `// ERROR cần mã: ${b.code.slice(0, 60)}`).not.toBe('');
        expect([b.code.slice(0, 80), r.err]).toEqual([b.code.slice(0, 80), want]);
        continue;
      }
      expect([b.code.slice(0, 80), r.err]).toEqual([b.code.slice(0, 80), undefined]);
      if (markOf(b, 'WRONG') !== undefined) {
        const fix = blocks[i + 1];
        expect(fix !== undefined && markOf(fix, 'FIX') !== undefined && fix.run, `// WRONG cần // FIX chạy được ngay sau: ${b.code.slice(0, 60)}`).toBe(true);
        const f = await runBlock(l, setup, fix.code);
        expect(f.err, `FIX lỗi: ${fix.code.slice(0, 60)}`).toBeUndefined();
        expect(f.out === r.out, `WRONG ra cùng kết quả với FIX: ${b.code.slice(0, 60)}`).toBe(false);
        continue;
      }
      expect(r.empty, `khối không ra gì: ${b.code.slice(0, 80)}`).toBe(false);
    }
  }, 120_000);
});
