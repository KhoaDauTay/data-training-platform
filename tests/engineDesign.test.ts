// v28 R4 (product-route-v24 §1.5, §2.2, §4 R4; L420–L423): the fourth Engine card, "Thiết kế CSDL" / database design and
// DBMS theory, 25 lessons `e-ds-l<n>-NN` whose labs run on PostgreSQL (the lab runtime, src/engine/pglab).
// Anatomy (the v27-pg R3 test, tests/engineAnatomy.test.ts on that branch, adapted to theory lessons, §2.2 "Lý thuyết"):
//   concept: Mở bài · Ý chính · [Cú pháp] · Ví dụ · Lỗi hay gặp · Tóm tắt (Cú pháp optional: "trừ bài lý thuyết thuần");
//   lab: Mở bài · Ý chính · Cú pháp · Ví dụ · Lỗi hay gặp · Thực hành · Tóm tắt, ≥ 3 steps;
//   quiz: Mở bài · Ý chính · Ví dụ · Tóm tắt; capstone: Mở bài · Thực hành · Tóm tắt.
// Every lesson has a lab that runs here (runtime: browser), so its honest chip is "PostgreSQL 18.6 (PGlite)" (L422).
// Runs: one fresh lab database per lesson: setup, then every ```sql block of "Ví dụ" and "Lỗi hay gặp" in page order
// (`-- ERROR <SQLSTATE>` blocks fail with that code; a `-- WRONG` block returns other rows than the `-- FIX` after it).
// Lab steps: the Solution passes its own check; `SELECT 1` never does.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, lessonProblems, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { gradable, honestOf } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { wordCount } from '../src/fullLesson';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<string>('../content/engine/design/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/design/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));

/** §1.5: the 25 lessons, their kinds, by level. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['concept', 'lab', 'quiz'],
  L2: ['concept', 'concept', 'lab', 'lab', 'quiz'],
  L3: ['concept', 'lab', 'concept', 'quiz'],
  L4: ['concept', 'lab', 'lab', 'concept', 'concept', 'capstone'],
  L5: ['concept', 'lab', 'concept', 'quiz', 'concept', 'concept', 'concept'],
};
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: Record<EngineLesson['kind'], SectionId[]> = {
  concept: ['open', 'idea', 'example', 'pitfalls', 'recap'],
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

describe('Engine Thiết kế CSDL (R4): 25 bài theo §1.5', () => {
  it('25 bài, đúng loại từng cấp, id e-ds-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-ds-l[1-5]-\d\d$/.test(x.l.id) && x.l.engine === 'design')).toBe(true);
  });

  it('modules.yml: mỗi mô-đun có VI/EN và được dùng; mỗi bài nằm trong một mô-đun có tên', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, chạy ở đây (nhãn pg), requires tồn tại', (_, l) => {
    const known = new Set([...ids, ...l.requires.filter((r) => /^e-(pg|mg|dy)-/.test(r))]); // links to other engines are checked by engineContent
    expect(lessonProblems(l, known)).toEqual([]);
    expect(l.runtime).toBe('browser');
    expect(honestOf(l)).toBe('pg');
    expect(l.lab!.steps.every((s) => gradable(l, s))).toBe(true);
  });
});

describe('Engine Thiết kế CSDL: giải phẫu 8 mục', () => {
  it.each(all.map((x) => [x.l.id, x] as const))('%s: mục theo loại bài, thứ tự, độ dài, câu hỏi, nguồn', (_, { l, fm }) => {
    const sec = l.sections.map((s) => s.id);
    expect(sec, 'thứ tự mục').toEqual([...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect(NEED[l.kind].filter((k) => !sec.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCount(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    const syntax = text(l, 'syntax');
    if (syntax) expect(blocksOf(syntax.vi)[0]?.kind, 'Cú pháp mở bằng một khối code').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    expect(l.sources.length).toBeGreaterThanOrEqual(1);
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

  it('độ dài chữ VI (đích §2.2 lý thuyết 700–1,200; không chặn, in ra để báo cáo)', () => {
    console.log('từ VI:', all.map(({ l }) => `${l.id} ${words(l)}`).join('; '));
    expect(all.every(({ l }) => words(l) > 0)).toBe(true);
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup', async (_, l) => {
    const blocks = [...sqlBlocks(text(l, 'example')?.vi), ...sqlBlocks(text(l, 'pitfalls')?.vi)];
    const steps: ScriptStep[] = [];
    const span: [number, number][] = [];
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
    const result = (i: number) => r.steps.slice(...span[i]).filter((x) => x.columns.length).at(-1) ?? r.steps[span[i][1] - 1];
    blocks.forEach((b, i) => {
      const out = result(i);
      if (isErr(b)) return;
      if (/^--\s*WRONG\b/m.test(b)) {
        const fix = blocks[i + 1];
        expect(/^--\s*FIX\b/m.test(fix ?? ''), `-- WRONG cần -- FIX ngay sau: ${b.slice(0, 60)}`).toBe(true);
        expect(compareResults(result(i + 1), out, false).ok, `WRONG ra cùng dòng với FIX: ${b.slice(0, 60)}`).toBe(false);
        return;
      }
      expect(out.rows.length, `khối không ra dòng: ${b.slice(0, 80)}`).toBeGreaterThan(0);
    });
  }, 120_000);
});

describe('Engine Thiết kế CSDL: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  it.each(all.map(({ l }) => [l.id, l] as const))('%s: setup chạy', async (_, l) => {
    await expect(runner.prepare(l.lab!)).resolves.toBeUndefined();
  }, 120_000);
  const steps = all.flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.check})`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const r = await runLabScript({ setup: l.lab!.setup, extensions: extensionsOf(l.lab!.setup, s.solution), steps: [...replayOf(l.lab!, i), s.solution] });
      expect(r.steps.at(-1)!.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);
});
