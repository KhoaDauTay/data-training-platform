// v47 R1 (L970–L979; tools/v47/content-gaps.md E2): the sixth Engine card, "Chuỗi thời gian" / Time-series, lessons
// `e-ts-l<n>-NN` whose labs run on PostgreSQL (PGlite), like the data stack (tests/engineStack.test.ts, minus dbt).
// Anatomy: concept = Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt; lab/capstone = + Cú pháp · Thực hành. Every lesson has a
// lab of 3–6 steps (a browser concept needs a lab, L825), ≥ 2 questions, ≥ 1 trap, one `ts-` figure, code lines ≤ 40 chars.
// v48 E3 (L1190–L1199): L4 runs on mingo / dynoxide when the lab data is MongoDB or DynamoDB JSON (runEngine), in modules
// `mongo` / `dynamo`; L5 adds two `runtime: docs` concepts (TimescaleDB, no lab: their examples run on demo_setup) and
// forecasting labs; badges L1–L5.
// Runs: one fresh lab database per lesson: setup, then every ```sql block of Ví dụ and Lỗi hay gặp in order. Lab steps: the
// Solution passes its own check; `SELECT 1` (MongoDB: a count, DynamoDB: a Scan) never does; every `perf:` bar refuses its
// `slow:` (same rows) for being slow.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, lessonIdFor, lessonProblems, onPg, parseEngineLesson, parseModules, runEngine, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { demoBlocks, demoSetup } from '../src/engine/demo';
import { DynamoEngine } from '../src/engine/dynamo/engine';
import { dynamoRunner, labOf } from '../src/engine/dynamo/runner';
import type { DynamoRequest } from '../src/engine/dynamo/types';
import { gradable, honestOf, honestRow, LAB_RUNNERS } from '../src/engine/labs';
import { loadDataset, runMongo } from '../src/engine/mongo/engineMongo';
import { mongoRunner } from '../src/engine/mongo/runner';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { compareResults, grade } from '../src/grader';
import { BADGE_ENGINES, levelsOf } from '../src/mastery';
import { slowVerdict } from '../src/planCheck';
import { enginePlayOf, engineRouteOf } from '../src/route';
import { ENGINE_ID } from '../src/save';

const files = import.meta.glob<string>('../content/engine/timeseries/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/timeseries/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));

/** content-gaps.md E2, R1 = L1–L3 (13 lessons); v48 E3 = L4 (MongoDB, DynamoDB, a MongoDB capstone) and L5 (TSDB, forecasting). */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['concept', 'lab', 'lab', 'lab', 'lab'],
  L2: ['lab', 'lab', 'lab', 'lab'],
  L3: ['lab', 'lab', 'lab', 'capstone'],
  L4: ['lab', 'lab', 'lab', 'concept', 'capstone'],
  L5: ['concept', 'concept', 'lab', 'lab', 'capstone'],
};
const pgL = (l: EngineLesson): boolean => runEngine(l) === 'timeseries';
const docs = (l: EngineLesson): boolean => l.runtime === 'docs';
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: Partial<Record<EngineLesson['kind'], SectionId[]>> = {
  concept: ['open', 'idea', 'example', 'pitfalls', 'recap'],
  lab: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
  capstone: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
};
const text = (l: EngineLesson, id: SectionId): { vi: string; en: string } | undefined => l.sections.find((s) => s.id === id)?.text;
const sqlBlocks = (t: string | undefined): string[] => (t ? blocksOf(t).flatMap((b) => (b.kind === 'code' && b.lang === 'sql' ? [b.code] : [])) : []);
const ERR = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m;
const isErr = (b: string): boolean => /^--\s*ERROR\b/m.test(b);
const wordCountOf = (s: string): number => s.split(/\s+/).filter(Boolean).length;

describe('Engine Chuỗi thời gian (v47 R1): nối vào Engine', () => {
  it('id, route, Save, runner, badges', () => {
    expect(lessonIdFor('timeseries', 'L2', '03')).toBe('e-ts-l2-03');
    expect(engineRouteOf('#/engine/timeseries')).toEqual({ engine: 'timeseries', level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/timeseries/l3/e-ts-l3-04')).toEqual({ engine: 'timeseries', level: 'L3', lesson: 'e-ts-l3-04' });
    expect(engineRouteOf('#/engine/timeseries/l5/e-ts-l5-05')).toEqual({ engine: 'timeseries', level: 'L5', lesson: 'e-ts-l5-05' });
    expect(enginePlayOf('#/engine/play/e-ts-l1-02')).toBe('#/engine/timeseries/L1/e-ts-l1-02');
    expect(ENGINE_ID.test('e-ts-l1-02')).toBe(true);
    expect(ENGINE_ID.test('e-ts-l4-01')).toBe(true);
    expect(onPg('timeseries')).toBe(true);
    expect(LAB_RUNNERS.timeseries).toBeDefined(); // v48: dispatches on the data (runEngine)
    expect(runEngine({ engine: 'timeseries', lab: { setup: '{"collections": {}}', steps: [] } })).toBe('mongodb');
    expect(runEngine({ engine: 'timeseries', demoSetup: ' {"tables": []}' })).toBe('dynamodb');
    expect(runEngine({ engine: 'timeseries', lab: { setup: 'CREATE TABLE t (a int);', steps: [] } })).toBe('timeseries');
    expect(runEngine({ engine: 'search', lab: { setup: '{"collections": {}}', steps: [] } })).toBe('search');
    expect(BADGE_ENGINES).toContain('timeseries');
    expect(levelsOf('timeseries')).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
  });
});

describe('Engine Chuỗi thời gian: bài, mô-đun, luật nội dung', () => {
  it('23 bài (R1 13 + v48 10), đúng loại từng cấp, id e-ts-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-ts-l[1-5]-\d\d$/.test(x.l.id) && x.l.engine === 'timeseries')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, chạy thật, một hình ts-', (_, l) => {
    expect(lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => /^e-(pg|ds|st)-/.test(r))]))).toEqual([]);
    if (docs(l)) {
      expect(l.lab, 'bài docs không có lab').toBeUndefined();
      expect(l.demoSetup, 'bài docs chạy ví dụ trên demo_setup').toBeDefined();
      expect(honestOf(l)).toBe('docs');
    } else {
      expect(l.lab, 'mọi bài chạy được có lab').toBeDefined();
      expect(honestOf(l)).toBe({ timeseries: 'pg', mongodb: 'mingo', dynamodb: 'dynoxide' }[runEngine(l) as 'timeseries']);
      expect(honestRow(l), 'chip ở hàng bài (đọc từ module) = chip trong bài').toBe(honestOf(l));
      for (const s of l.lab!.steps) expect(gradable(l, s)).toBe(true);
    }
    // the L4 lessons on MongoDB / DynamoDB sit in their own modules (the lesson index has no lab: honestRow reads the module)
    expect(runEngine(l) === 'mongodb', 'module mongo').toBe(l.module === 'mongo');
    expect(runEngine(l) === 'dynamodb', 'module dynamo').toBe(l.module === 'dynamo');
    expect((l.figures ?? []).filter((f) => f.name.startsWith('ts-')).length).toBe(1);
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542)', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
  });
  it('không dùng now()/CURRENT_DATE trong SQL chạy được (hôm nay trong game là 2026-10-31)', () => {
    for (const { l } of all) {
      const sql = [l.lab?.setup ?? l.demoSetup ?? '', ...(l.lab?.steps ?? []).flatMap((s) => [s.solution, s.slow ?? '', s.after ?? '']), ...demoBlocks(l).filter((b) => b.runs).map((b) => b.run)];
      for (const x of sql) expect(x, l.id).not.toMatch(/\bnow\(\)|\bcurrent_(date|timestamp)\b|\blocaltimestamp\b|new Date\(\)|ISODate\(\)/i);
    }
  });
});

describe('Engine Chuỗi thời gian: giải phẫu 8 mục', () => {
  it.each(all.map((x) => [x.l.id, x] as const))('%s: mục, thứ tự, câu hỏi có bẫy, lựa chọn cân', (_, { l, fm }) => {
    const sec = l.sections.map((s) => s.id);
    expect(sec, 'thứ tự mục').toEqual([...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect((NEED[l.kind] ?? []).filter((k) => !sec.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCountOf(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    const syntax = text(l, 'syntax');
    if (syntax) expect(blocksOf(syntax.vi)[0]?.kind, 'Cú pháp mở bằng một khối code').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    const bs = demoBlocks(l).filter((b) => b.runs);
    const ex = bs.filter((b) => b.sec === 'example' && b.mark !== 'error');
    expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối chạy ra dòng (${ex.length})`).toBe(true);
    const pit = bs.filter((b) => b.sec === 'pitfalls' && (b.mark === 'error' || b.mark === 'wrong'));
    expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
    if (!docs(l)) {
      expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
      expect(l.lab!.steps.length, 'lab 3–6 bước').toBeLessThanOrEqual(6);
    }
    const qs = [...((fm.quiz as Record<string, unknown>[] | undefined) ?? []), ...(fm.predict ? [fm.predict as Record<string, unknown>] : [])];
    expect(qs.length, 'số câu hỏi').toBeGreaterThanOrEqual(2);
    for (const q of qs) if (q.trap !== undefined) {
      const n = (q.options as unknown[]).length;
      expect(typeof q.trap === 'number' && q.trap !== q.answer && q.trap >= 0 && q.trap < n, 'trap = một lựa chọn sai').toBe(true);
    }
    expect(qs.some((q) => q.trap !== undefined), '≥ 1 câu có trap').toBe(true);
    for (const q of l.quiz ?? []) {
      const len = q.options.map((o) => o.vi.length);
      expect(len[q.answer], `${q.q.vi.slice(0, 40)}: đáp án dài hơn hẳn`).toBeLessThanOrEqual(Math.max(...len.filter((_, i) => i !== q.answer)) * 1.6);
      // explain-guide (tools/v44): 2–4 sentences, no raw lesson id
      for (const w of [q.why.vi, q.why.en]) expect(w, 'why: không ghi id bài thô').not.toMatch(/\be-(pg|ts|ds|st)-(l\d|ext)/);
    }
  });
  it('vị trí đáp án đổi (không cùng một chỉ số cho mọi câu)', () => {
    const answers = all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer));
    expect(new Set(answers).size).toBeGreaterThanOrEqual(3);
  });

  it.each(all.filter((x) => pgL(x.l)).map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup', async (_, l) => {
    const blocks = [...sqlBlocks(text(l, 'example')?.vi), ...sqlBlocks(text(l, 'pitfalls')?.vi)];
    const steps: ScriptStep[] = [];
    const span: [number, number][] = [];
    for (const b of blocks) {
      const stmts = splitSql(b);
      const code = ERR.exec(b)?.[1];
      if (isErr(b)) expect(code, `-- ERROR cần SQLSTATE: ${b.slice(0, 60)}`).toBeDefined();
      stmts.forEach((s, i) => steps.push(code && i === stmts.length - 1 ? { sql: s, expectError: code } : s));
      span.push([steps.length - stmts.length, steps.length]);
    }
    const setup = l.lab?.setup ?? l.demoSetup;
    const r = await runLabScript({ setup, extensions: extensionsOf(setup, ...blocks), steps });
    expect(r.setupError).toBeUndefined();
    const bad = r.failedStep === undefined ? undefined : r.steps[r.failedStep];
    expect(bad && [bad.sql.slice(0, 120), bad.error?.code, bad.error?.message]).toBeUndefined();
    const result = (i: number) => r.steps.slice(...span[i]).filter((x) => x.columns.length).at(-1) ?? r.steps[span[i][1] - 1];
    blocks.forEach((b, i) => {
      if (isErr(b)) return;
      if (/^--\s*WRONG\b/m.test(b)) {
        expect(/^--\s*FIX\b/m.test(blocks[i + 1] ?? ''), `-- WRONG cần -- FIX ngay sau: ${b.slice(0, 60)}`).toBe(true);
        expect(compareResults(result(i + 1), result(i), false).ok, `WRONG ra cùng dòng với FIX: ${b.slice(0, 60)}`).toBe(false);
        return;
      }
      expect(result(i).rows.length, `khối không ra dòng: ${b.slice(0, 80)}`).toBeGreaterThan(0);
    });
  }, 120_000);
});

describe('Engine Chuỗi thời gian: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const steps = all.filter(({ l }) => l.lab && pgL(l)).flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.after ? 'after' : s.check})`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const r = await runLabScript({ setup: l.lab!.setup, steps: [...replayOf(l.lab!, i), ...splitSql(s.solution)] });
      expect(r.steps.at(-1)!.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);

  // tests/perfGateEngine.test.ts also EXPLAINs every read here (cost budget, sargability); this proves each bar.
  const slowRunner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300), slow: slowVerdict }, { run: runLabScript, reset: () => undefined });
  const bars = all.filter(({ l }) => l.lab && pgL(l)).flatMap(({ l }) => l.lab!.steps.flatMap((s, i) => (s.perf ? [[`${l.id} s${i + 1} perf`, l, i] as const] : [])));
  it('có thanh tốc độ ở bài index (timestamptz, giá trị mới nhất, BRIN, bài tổng kết)', () =>
    expect(bars.map(([n]) => n.split(' ')[0])).toEqual(expect.arrayContaining(['e-ts-l1-02', 'e-ts-l1-05', 'e-ts-l3-03', 'e-ts-l3-04'])));
  it.each(bars)('%s: lời giải qua, slow: trượt vì chậm', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(s.check).toBe('rows');
    expect(await slowRunner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await slowRunner.check(l.lab!, s, s.slow!)).toMatchObject({ ok: false, reason: 'wrong', why: expect.stringMatching(/^slow/) });
    expect(await runner.check(l.lab!, s, s.slow!)).toMatchObject({ ok: true });
  }, 120_000);
});

// v48 E3 (L1192): the L4 lessons on MongoDB (mingo) and DynamoDB (dynoxide), through the runners the page uses, as in
// tests/engineIntegration.test.ts and tests/engineAnatomy.test.ts.
describe('Engine Chuỗi thời gian L4: MongoDB và DynamoDB chạy thật', () => {
  const lang = () => 'en' as const;
  const mongo = mongoRunner({ lang }, { exec: async (src: string, ds: string, stages?: boolean) => runMongo(await loadDataset(ds), src, { stages }) });
  let eng: DynamoEngine;
  beforeAll(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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
    eng = await DynamoEngine.open(() => import('@dynoxide/wasm-engine/worker'));
  }, 60_000);
  const dynamo = dynamoRunner({ lang }, {
    request: async (req: DynamoRequest, o: { dataset: string; after?: DynamoRequest }) => {
      await eng.setup(o.dataset, labOf(o.dataset));
      return eng.run(req, o.after);
    },
  } as never);
  const nosql = all.filter(({ l }) => !pgL(l));
  it('có bài MongoDB và DynamoDB ở L4, dữ liệu viết thẳng (không dùng dataset dùng chung)', () => {
    expect(nosql.filter(({ l }) => runEngine(l) === 'mongodb').length).toBeGreaterThanOrEqual(3);
    expect(nosql.filter(({ l }) => runEngine(l) === 'dynamodb').length).toBeGreaterThanOrEqual(2);
    expect(nosql.every(({ l }) => l.level === 'L4' && !!l.lab?.setup)).toBe(true);
  });
  const out = async (l: EngineLesson, code: string): Promise<{ err?: string; out: string; empty: boolean }> => {
    const lab = { setup: demoSetup(l) ?? '', steps: [] };
    try {
      if (runEngine(l) === 'mongodb') {
        const r = await mongo.exec(lab, code);
        const shown = await mongo.run(lab, code);
        if (r.docs.length && shown.rows.length !== r.docs.length) return { err: `run() drew ${shown.rows.length} of ${r.docs.length}`, out: '', empty: true };
        return { out: JSON.stringify([r.kind, r.docs, r.value]), empty: r.kind === 'docs' && !r.docs.length && r.value === undefined };
      }
      const r = await dynamo.run(lab, code);
      const d = r.meta?.dynamo as Record<string, unknown> | undefined;
      return { out: JSON.stringify([r.rows, d?.scanned, d?.capacity]), empty: !r.meta?.dynamo?.write && !r.rows.length };
    } catch (e) {
      const x = e as { code?: string; type?: string; message?: string; cause?: { code?: string } };
      return { err: x.code ?? x.type ?? x.cause?.code ?? `? ${x.message}`, out: '', empty: true };
    }
  };
  it.each(nosql.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật (mingo / dynoxide)', async (_, l) => {
    const blocks = demoBlocks(l);
    for (const [i, b] of blocks.entries()) {
      if (!b.runs) continue;
      const r = await out(l, b.run);
      if (b.error !== undefined) {
        expect([b.run.slice(0, 80), r.err]).toEqual([b.run.slice(0, 80), b.error]);
        continue;
      }
      expect([b.run.slice(0, 80), r.err]).toEqual([b.run.slice(0, 80), undefined]);
      if (b.mark === 'wrong') {
        const fix = blocks[i + 1];
        expect(fix?.mark === 'fix' && fix.runs, `// WRONG cần // FIX ngay sau: ${b.run.slice(0, 60)}`).toBe(true);
        const f = await out(l, fix.run);
        expect(f.err).toBeUndefined();
        expect(f.out === r.out, `WRONG ra cùng kết quả với FIX: ${b.run.slice(0, 60)}`).toBe(false);
        continue;
      }
      if (b.mark !== 'fix') expect(r.empty, `khối không ra gì: ${b.run.slice(0, 80)}`).toBe(false);
    }
  }, 120_000);
  const nsSteps = nosql.flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1}`, l, i] as const));
  it.each(nsSteps)('%s: lời giải qua, câu "không làm gì" trượt, `slow:` trượt', async (_, l, i) => {
    const s = l.lab!.steps[i];
    const r = runEngine(l) === 'mongodb' ? mongo : dynamo;
    expect(await r.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    const table = runEngine(l) === 'mongodb' ? '' : String((labOf(l.lab!.setup!).tables[0] as { TableName: string }).TableName);
    const nothing = runEngine(l) === 'mongodb' ? 'db.readings.countDocuments()' : JSON.stringify({ op: 'Scan', input: { TableName: table } });
    expect(await r.check(l.lab!, s, nothing)).toMatchObject({ ok: false });
    if (s.slow) expect(await r.check(l.lab!, s, s.slow)).toMatchObject({ ok: false });
  }, 120_000);
});
