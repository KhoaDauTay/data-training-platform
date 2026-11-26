// v45 R1 (L740–L759; tools/v43/de-tools-plan.md §4): the fifth Engine card, "Công cụ dữ liệu" / Data stack, lessons
// `e-st-l<n>-NN` whose labs run on PostgreSQL (PGlite) with the dbt-style compiler (src/engine/stack/dbt.ts).
// Anatomy as the design track (tests/engineDesign.test.ts): concept = Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt;
// lab = + Cú pháp · Thực hành, ≥ 3 steps. ≥ 2 questions, ≥ 1 trap. Every code line ≤ 40 characters (L542, L594).
// Runs: one fresh lab database per lesson: setup (or demo_setup), then every ```sql block of Ví dụ and Lỗi hay gặp in order.
// Lab steps: the Solution passes its own check; `SELECT 1` never does. Jinja is shown in ```text, never run as SQL.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, lessonProblems, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { gradable, honestOf } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { dagOrder, refsOf } from '../src/engine/stack/dbt';
import { compareResults, grade } from '../src/grader';

const files = import.meta.glob<string>('../content/engine/stack/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/stack/modules.yml', { query: '?raw', import: 'default', eager: true });
const specs = import.meta.glob<{ nodes: { id: string }[]; edges?: { from: string; to: string }[] }>('../content/figures/st-*.yml', { import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));

/** de-tools-plan §4 / §7: R1 L1-01…05 and L2-01…04; R2 (v46) L2-05…08 and L3-01…06 with the capstone. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['concept', 'lab', 'lab', 'concept', 'lab'],
  L2: ['lab', 'lab', 'lab', 'lab', 'lab', 'lab', 'concept', 'lab'],
  L3: ['concept', 'lab', 'concept', 'concept', 'concept', 'capstone'],
};
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: Partial<Record<EngineLesson['kind'], SectionId[]>> = {
  concept: ['open', 'idea', 'example', 'pitfalls', 'recap'],
  lab: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
  // v46 R2: the capstone keeps the full anatomy (the design capstones have three sections; this track asks for eight)
  capstone: ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'],
};
const text = (l: EngineLesson, id: SectionId): { vi: string; en: string } | undefined => l.sections.find((s) => s.id === id)?.text;
const sqlBlocks = (t: string | undefined): string[] => (t ? blocksOf(t).flatMap((b) => (b.kind === 'code' && b.lang === 'sql' ? [b.code] : [])) : []);
const ERR = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m;
const isErr = (b: string): boolean => /^--\s*ERROR\b/m.test(b);
const wordCountOf = (s: string): number => s.split(/\s+/).filter(Boolean).length;

describe('Engine Công cụ dữ liệu (v45 R1): bài, mô-đun, luật nội dung', () => {
  it('19 bài R1 + R2, đúng loại từng cấp, id e-st-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-st-l[1-3]-\d\d$/.test(x.l.id) && x.l.engine === 'stack')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, nhãn chạy thật, một hình st-', (_, l) => {
    expect(lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => /^e-(pg|ds)-/.test(r))]))).toEqual([]);
    // a lab runs here (chip pg); a concept's examples run but its chip follows the engine rule (no lab = docs), like Postgres concepts
    if (l.lab) expect(honestOf(l)).toBe('pg');
    for (const s of l.lab?.steps ?? []) expect(gradable(l, s)).toBe(true);
    expect((l.figures ?? []).filter((f) => f.name.startsWith('st-')).length).toBe(1);
    // product names in text only: no logo, no price (S5)
    for (const s of l.sections) for (const t of [s.text.vi, s.text.en]) expect(t, l.id).not.toMatch(/\$\s?\d|USD\s?\d|\d\s?(USD|đô)/);
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542)', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
  });
});

describe('Engine Công cụ dữ liệu: giải phẫu 8 mục', () => {
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
    for (const b of [...sqlBlocks(text(l, 'example')?.vi), ...sqlBlocks(text(l, 'pitfalls')?.vi)]) expect(b, 'Jinja chỉ ở khối text').not.toMatch(/\{\{|\{%/);
    if (l.kind === 'lab' || l.kind === 'capstone') expect(l.lab!.steps.length, 'lab 3–6 bước').toBeGreaterThanOrEqual(3);
    const qs = [...((fm.quiz as Record<string, unknown>[] | undefined) ?? []), ...(fm.predict ? [fm.predict as Record<string, unknown>] : [])];
    expect(qs.length, 'số câu hỏi').toBeGreaterThanOrEqual(2);
    for (const q of qs) if (q.trap !== undefined) {
      const n = (q.options as unknown[]).length;
      expect(typeof q.trap === 'number' && q.trap !== q.answer && q.trap >= 0 && q.trap < n, 'trap = một lựa chọn sai').toBe(true);
    }
    expect(qs.some((q) => q.trap !== undefined), '≥ 1 câu có trap').toBe(true);
    // balanced options (L564): the right answer is never the longest by far
    for (const q of l.quiz ?? []) {
      const len = q.options.map((o) => o.vi.length);
      expect(len[q.answer], `${q.q.vi.slice(0, 40)}: đáp án dài hơn hẳn`).toBeLessThanOrEqual(Math.max(...len.filter((_, i) => i !== q.answer)) * 1.6);
    }
  });
  it('vị trí đáp án đổi (không cùng một chỉ số cho mọi câu)', () => {
    const answers = all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer));
    expect(new Set(answers).size).toBeGreaterThanOrEqual(3);
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

describe('Engine Công cụ dữ liệu: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const labs = all.filter(({ l }) => l.lab);
  const steps = labs.flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.model ? 'model' : s.check})`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const r = await runLabScript({ setup: l.lab!.setup, steps: [...replayOf(l.lab!, i), ...(await import('../src/engine/stack/dbt')).compileStep(l.lab!.setup, l.lab!.steps, i, s.solution)] });
      expect(r.steps.at(-1)!.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      if (s.ordered) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);

  it('st-dag vẽ đúng đồ thị mà bộ dịch sắp (bài e-st-l2-02)', () => {
    const l = all.find((x) => x.l.id === 'e-st-l2-02')!.l;
    const models = Object.fromEntries(l.lab!.steps.filter((s) => s.model).map((s) => [s.model!.name, s.solution]));
    const order = dagOrder(models);
    const spec = Object.values(specs).find((s) => s.nodes.some((n) => n.id === 'fct_orders') && s.nodes.some((n) => n.id === 'stg_customers'))!;
    const edges = new Set((spec.edges ?? []).map((e) => `${e.from}>${e.to}`));
    for (const m of order) for (const r of refsOf(models[m])) expect(edges.has(`${r}>${m}`), `${r} → ${m}`).toBe(true);
  });
});
