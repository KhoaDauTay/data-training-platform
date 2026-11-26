// v47 R1 (L1010–L1019): the Engine card "Tìm kiếm & Elasticsearch" (engine `search`, ids `e-sr-l<n>-NN`). Two runtimes, one per
// lesson: a lesson whose data (`lab.setup`, else `demo_setup`) is a JSON index runs on BoonData's Elasticsearch-style interpreter
// (src/engine/search/), every other one on PostgreSQL (PGlite). Anatomy as the Data stack (tests/engineStack.test.ts): concept =
// Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt; lab/capstone = + Cú pháp · Thực hành, ≥ 3 steps; ≥ 2 questions, ≥ 1 trap;
// one `sr-` figure; every code line ≤ 40 characters. Every runnable block runs; every lab Solution passes and a no-op fails.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, isEsLesson, lessonProblems, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { demoBlocks } from '../src/engine/demo';
import { gradable, honestOf } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { EsError, normLength, run, type EsResult } from '../src/engine/search/es';
import { compare, esRunner, indexOf } from '../src/engine/search/esLab';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<string>('../content/engine/search/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/search/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));
const figRaw = import.meta.glob<string>('../content/figures/sr-*.yml', { query: '?raw', import: 'default', eager: true });

/** content-gaps §5 E4 + E10, cut to R1: L1 the index and analyzers, L2 queries and relevance, L3 aggregations, PostgreSQL, choice, capstone. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['lab', 'lab', 'lab', 'lab'],
  L2: ['lab', 'lab', 'lab', 'lab', 'lab'],
  L3: ['lab', 'lab', 'lab', 'lab', 'capstone'],
};
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: SectionId[] = ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'];
const text = (l: EngineLesson, id: SectionId): { vi: string; en: string } | undefined => l.sections.find((s) => s.id === id)?.text;
const wordCountOf = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const NOOP_ES = 'GET shop/_search\n{"query": {"match_all": {}}}';
const lang = (l: EngineLesson): string => (isEsLesson(l) ? 'json' : 'sql');

describe('Engine Tìm kiếm (v47 R1): bài, mô-đun, luật nội dung', () => {
  it('14 bài, đúng loại từng cấp, id e-sr-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-sr-l[1-3]-\d\d$/.test(x.l.id) && x.l.engine === 'search')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it('cả hai bộ chạy đều có bài: ít nhất 3 bài PostgreSQL và 9 bài mô phỏng Elasticsearch', () => {
    expect(all.filter((x) => !isEsLesson(x.l)).length).toBeGreaterThanOrEqual(3);
    expect(all.filter((x) => isEsLesson(x.l)).length).toBeGreaterThanOrEqual(9);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, nhãn chạy thật, một hình sr-', (_, l) => {
    expect(lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => /^e-pg-/.test(r))]))).toEqual([]);
    expect(honestOf(l)).toBe('search');
    for (const s of l.lab?.steps ?? []) expect(gradable(l, s)).toBe(true);
    expect((l.figures ?? []).filter((f) => f.name.startsWith('sr-')).length).toBe(1);
  });
  it('hình sr-: chỉ dùng tông có trong engineVizCore (tông lạ làm hình không vẽ được trong trình duyệt)', () => {
    const TONES = ['cell', 'live', 'dead', 'new', 'ptr', 'warm', 'free', 'ghost', 'plain'];
    for (const [p, raw] of Object.entries(figRaw)) for (const m of raw.matchAll(/(?:tone|rowTone|colTone|cellTone)\s*:\s*(\[[^\]]*\]|\{[^}]*\}|\w+)/g)) for (const t of m[1].match(/[a-z]+/g) ?? []) expect(t === 'null' || TONES.includes(t) || /^\d/.test(t), `C:\Users\khoa.huynh\Documents\study\bd-wt\v47-search\tests\engineSearch.test.ts: `).toBe(true);
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542)', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
  });
  it.each(all.filter((x) => isEsLesson(x.l)).map((x) => [x.l.id, x.l] as const))('%s: mỗi trường text < 40 token (độ dài norms chính xác), không dùng chung khối hai bộ chạy', (_, l) => {
    const ix = indexOf(l.lab?.setup ?? l.demoSetup);
    for (const fi of [...(ix as unknown as { fields: Map<string, { len: number[] }> }).fields.values()]) for (const n of fi.len) expect(normLength(n)).toBe(n);
    for (const b of demoBlocks(l)) if (b.runs) expect(b.code.startsWith('GET ') || /^\/\/ /.test(b.code)).toBe(true);
    expect(demoBlocks(l).filter((b) => b.runs && /^\s*SELECT\b/im.test(b.run))).toEqual([]);
  });
});

describe('Engine Tìm kiếm: giải phẫu 8 mục', () => {
  it.each(all.map((x) => [x.l.id, x] as const))('%s: mục, thứ tự, câu hỏi có bẫy, lựa chọn cân', (_, { l, fm }) => {
    const sec = l.sections.map((s) => s.id);
    expect(sec, 'thứ tự mục').toEqual([...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect(NEED.filter((k) => !sec.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCountOf(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    expect(blocksOf(text(l, 'syntax')!.vi)[0]?.kind, 'Cú pháp mở bằng một khối code').toBe('code');
    for (const lg of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lg]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    const bs = demoBlocks(l);
    const ex = bs.filter((b) => b.sec === 'example' && b.runs && !b.error);
    expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối chạy ra kết quả (${ex.length})`).toBe(true);
    const pit = bs.filter((b) => b.sec === 'pitfalls' && (b.mark === 'error' || b.mark === 'wrong'));
    expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
    for (const b of bs) if (b.runs) expect(blocksOf(`\`\`\`${lang(l)}\n${b.code}\n\`\`\``)[0]).toBeTruthy();
    expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
    expect(l.lab!.steps.length).toBeLessThanOrEqual(6);
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
    }
  });
  it('vị trí đáp án đổi (không cùng một chỉ số cho mọi câu)', () => {
    expect(new Set(all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer))).size).toBeGreaterThanOrEqual(3);
  });

  it.each(all.filter((x) => isEsLesson(x.l)).map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy trên trình mô phỏng', (_, l) => {
    const ix = indexOf(l.lab?.setup ?? l.demoSetup);
    const bs = demoBlocks(l).filter((b) => b.runs);
    const out = bs.map((b): EsResult | EsError => {
      try {
        return run(ix, b.run);
      } catch (e) {
        expect(e, b.code.slice(0, 80)).toBeInstanceOf(EsError);
        return e as EsError;
      }
    });
    bs.forEach((b, i) => {
      const o = out[i];
      if (b.mark === 'error') return expect(o instanceof EsError ? o.code : 'no error', b.code.slice(0, 80)).toBe(b.error);
      expect(o instanceof EsError ? `${o.code}: ${o.message}` : 'ok', b.code.slice(0, 80)).toBe('ok');
      const r = o as EsResult;
      if (b.mark === 'wrong') {
        expect(bs[i + 1]?.mark, `// WRONG cần // FIX ngay sau: ${b.code.slice(0, 60)}`).toBe('fix');
        expect(compare(out[i + 1] as EsResult, r, false, 'vi'), `WRONG ra cùng kết quả với FIX: ${b.code.slice(0, 60)}`).toBeDefined();
        return;
      }
      expect(r.rows.length, `khối không ra dòng: ${b.code.slice(0, 80)}`).toBeGreaterThan(0);
    });
  });

  it.each(all.filter((x) => !isEsLesson(x.l)).map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật trên PostgreSQL', async (_, l) => {
    const sql = (t: string | undefined): string[] => (t ? blocksOf(t).flatMap((b) => (b.kind === 'code' && b.lang === 'sql' ? [b.code] : [])) : []);
    const blocks = [...sql(text(l, 'example')?.vi), ...sql(text(l, 'pitfalls')?.vi)];
    const isErr = (b: string): boolean => /^--\s*ERROR\b/m.test(b);
    const steps: ScriptStep[] = [];
    const span: [number, number][] = [];
    for (const b of blocks) {
      const stmts = splitSql(b);
      const code = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m.exec(b)?.[1];
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

describe('Engine Tìm kiếm: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const es = esRunner({ lang: () => 'vi' });
  const pg = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const steps = all.filter(({ l }) => l.lab).flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1}`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    if (isEsLesson(l)) {
      expect(await es.check(l.lab!, s, s.solution)).toEqual({ ok: true });
      expect(await es.check(l.lab!, s, NOOP_ES)).toMatchObject({ ok: false });
      expect(await es.check(l.lab!, s, '')).toMatchObject({ ok: false });
      expect((await es.run(l.lab!, s.solution)).rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      return;
    }
    expect(await pg.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await pg.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const r = await runLabScript({ setup: l.lab!.setup, extensions: extensionsOf(l.lab!.setup, s.solution), steps: [...replayOf(l.lab!, i), s.solution] });
      expect(r.steps.at(-1)!.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);
});
