// v47 Graph R1 (L1080–L1089; tools/v47/content-gaps.md §5 E6): the Engine card "Graph", lessons `e-gr-l<n>-NN` whose labs run on
// PostgreSQL (PGlite 0.5.16 = PostgreSQL 18.6): edge tables, recursive CTEs, SEARCH and CYCLE. Cypher is shown in ```text only.
// Mirrors tests/engineStack.test.ts: anatomy (concept = Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt; lab = + Cú pháp ·
// Thực hành, ≥ 3 steps), ≥ 2 questions with ≥ 1 trap, one gr- figure, code lines ≤ 40 characters, every ```sql block of Ví dụ and
// Lỗi hay gặp runs after setup, every lab step passes with its Solution and fails with `SELECT 1`.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, lessonProblems, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { gradable, honestOf } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<string>('../content/engine/graph/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/graph/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));

/** content-gaps §5 E6, R1: L1 model (2 labs + the property-graph concept), L2 traversal (4 labs), when to use a graph DB, capstone. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['lab', 'lab', 'concept'],
  L2: ['lab', 'lab', 'lab', 'lab', 'concept', 'capstone'],
};
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

describe('Engine Graph (v47 R1): bài, mô-đun, luật nội dung', () => {
  it('9 bài R1, đúng loại từng cấp, id e-gr-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-gr-l[1-2]-\d\d$/.test(x.l.id) && x.l.engine === 'graph')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, chạy trên pg, một hình gr-, nguồn chính thức', (_, l) => {
    expect(lessonProblems(l, ids)).toEqual([]);
    expect(l.runtime).toBe('browser');
    expect(l.lab, 'mọi bài có lab (khái niệm chạy trong trình duyệt cũng cần lab, L825)').toBeDefined();
    expect(honestOf(l)).toBe('pg');
    for (const s of l.lab!.steps) expect(gradable(l, s)).toBe(true);
    expect((l.figures ?? []).filter((f) => f.name.startsWith('gr-')).length).toBe(1);
    // facts come from official docs: postgresql.org or neo4j.com
    expect(l.sources.some((u) => /^https:\/\/(www\.postgresql\.org\/docs\/18\/|neo4j\.com\/docs\/)/.test(u))).toBe(true);
    expect(l.sources.every((u) => /^https:\/\/(www\.postgresql\.org|neo4j\.com)\//.test(u)), 'chỉ nguồn chính thức').toBe(true);
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542); Cypher chỉ ở khối text', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
    for (const m of body.matchAll(/```sql\n([\s\S]*?)```/g)) expect(m[1], 'Cypher trong khối sql').not.toMatch(/\bMATCH\s*\(|\]->|-\[:/);
  });
  it('vị trí đáp án đổi (không cùng một chỉ số cho mọi câu)', () => {
    const answers = all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer));
    expect(new Set(answers).size).toBeGreaterThanOrEqual(3);
  });
});

describe('Engine Graph: giải phẫu 8 mục', () => {
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
    const ex = sqlBlocks(text(l, 'example')?.vi).filter((b) => !isErr(b));
    expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối chạy ra dòng (${ex.length})`).toBe(true);
    const pit = sqlBlocks(text(l, 'pitfalls')?.vi).filter((b) => isErr(b) || /^--\s*WRONG\b/m.test(b));
    expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
    if (l.kind === 'lab' || l.kind === 'capstone') expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
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

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup', async (_, l) => {
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

describe('Engine Graph: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const steps = all.flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.check})`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const r = await runLabScript({ setup: l.lab!.setup, steps: [...replayOf(l.lab!, i), s.solution] });
      expect(r.steps.at(-1)!.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);
});

describe('Engine Graph: PostgreSQL 18 của PGlite có SEARCH và CYCLE', () => {
  it('version() là PostgreSQL 18; SEARCH BREADTH FIRST và CYCLE chạy', async () => {
    const r = await runLabScript({
      setup: "CREATE TABLE e (a text, b text); INSERT INTO e VALUES ('A','B'), ('B','C'), ('C','A');",
      steps: [
        'SELECT version()',
        `WITH RECURSIVE w(n, d) AS (SELECT 'A'::text, 0 UNION ALL SELECT e.b, w.d + 1 FROM w JOIN e ON e.a = w.n)
         SEARCH BREADTH FIRST BY n SET ord CYCLE n SET is_cycle USING path
         SELECT n, d, is_cycle FROM w ORDER BY ord`,
      ],
    });
    expect(r.failedStep).toBeUndefined();
    expect(String(r.steps[0].rows[0][0])).toMatch(/^PostgreSQL 18\./);
    expect(r.steps[1].rows.map((x) => x.join(':'))).toEqual(['A:0:false', 'B:1:false', 'C:2:false', 'A:3:true']);
  });
});
