// v47 R1 (L990–L1009; tools/v47/content-gaps.md §5 E3 + E9): the Engine card "OLAP & ClickHouse", lessons `e-ol-l<n>-NN`
// whose labs run on PostgreSQL (PGlite). ClickHouse is taught from its official docs: its SQL is shown in ```text, never run;
// every lesson runs a PostgreSQL equivalent. Mirrors tests/engineStack.test.ts (anatomy, every block and lab step on PGlite)
// plus the wiring block of tests/stackCore.test.ts (routes, Save ids, XP, badges).
// concept = Mở bài · Ý chính · Ví dụ · Lỗi hay gặp · Tóm tắt; lab/capstone = + Cú pháp · Thực hành, ≥ 3 steps.
// ≥ 2 questions, ≥ 1 trap. Every code line ≤ 40 characters (L542). One `ol-` figure per lesson.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import v5 from './fixtures/save-v5.json?raw';
import { blocksOf, ENGINE_XP, engineXp, lessonIdFor, lessonProblems, onPg, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { gradable, honestOf, honestRow, LAB_RUNNERS } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner, replayOf } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { PREREQS } from '../src/engine/tracks';
import { compareResults, grade } from '../src/grader';
import { badges, BADGE_ENGINES, levelsOf } from '../src/mastery';
import { engineHash, enginePlayOf, engineRouteOf } from '../src/route';
import { ENGINE_ID, parseSave, type Known } from '../src/save';

const files = import.meta.glob<string>('../content/engine/olap/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/olap/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));

/** R1: L1 OLTP vs OLAP, L2 analytics on PostgreSQL + columnar, L3 ClickHouse with the capstone. */
const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['concept', 'lab', 'lab'],
  L2: ['lab', 'lab', 'lab', 'concept'],
  L3: ['concept', 'concept', 'lab', 'lab', 'concept', 'concept', 'capstone'],
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

describe('Engine OLAP & ClickHouse (v47 R1): bài, mô-đun, luật nội dung', () => {
  it('14 bài, đúng loại từng cấp, id e-ol-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-ol-l[1-3]-\d\d$/.test(x.l.id) && x.l.engine === 'olap')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l, x.fm] as const))('%s: luật nội dung, nhãn chạy thật, một hình ol-, nguồn chính thức', (_, l, fm) => {
    expect(lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => /^e-(pg|ds|st)-/.test(r))]))).toEqual([]);
    if (l.lab) expect(honestOf(l)).toBe('pg');
    else expect(l.runtime).toBe('docs');
    for (const s of l.lab?.steps ?? []) expect(gradable(l, s)).toBe(true);
    expect((l.figures ?? []).filter((f) => f.name.startsWith('ol-')).length).toBe(1);
    // every lesson runs something on PostgreSQL: its lab, or its examples on setup/demo_setup
    expect(!!l.lab || !!l.demoSetup).toBe(true);
    // ClickHouse facts come from clickhouse.com/docs only; Postgres from postgresql.org/docs/18 (PGlite 0.5.16 = 18.6)
    const said = l.sections.some((s) => /ClickHouse/.test(s.text.vi));
    if (said) expect(l.sources.some((u) => u.startsWith('https://clickhouse.com/docs/')), 'ClickHouse cần nguồn clickhouse.com/docs').toBe(true);
    for (const u of l.sources) expect(u).toMatch(/^https:\/\/(clickhouse\.com\/docs\/|www\.postgresql\.org\/docs\/18\/)/);
    // no prices
    for (const s of l.sections) for (const t of [s.text.vi, s.text.en]) expect(t, l.id).not.toMatch(/\$\s?\d|USD\s?\d|\d\s?(USD|đô)/);
    // ClickHouse SQL is shown, never run: only ```text holds it (MergeTree, FINAL, uniq(…) never in a ```sql block)
    for (const s of l.sections) for (const b of sqlBlocks(s.text.vi)) expect(b).not.toMatch(/\bENGINE\s*=|\bFINAL\b|\buniq(Exact)?\(|\bquantile\(|MergeTree/);
    void fm;
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542)', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
  });
});

describe('Engine OLAP & ClickHouse: giải phẫu 8 mục', () => {
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
    if (l.kind === 'lab' || l.kind === 'capstone') expect(l.lab!.steps.length, 'lab 3–6 bước').toBeLessThanOrEqual(6);
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

describe('Engine OLAP & ClickHouse: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const runner = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const labs = all.filter(({ l }) => l.lab);
  const steps = labs.flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.check}${s.after ? ' after' : ''})`, l, i] as const));
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

describe('Engine OLAP & ClickHouse: wiring (routes, Save ids, XP, badges, track facts)', () => {
  const known: Known = { ticketIds: new Set(['ch1-01']), laneIds: new Set(), skills: new Set(['select']) };
  it('routes #/engine/olap[/L<n>[/<id>]] and #/engine/play/e-ol-…', () => {
    expect(engineRouteOf('#/engine/olap')).toEqual({ engine: 'olap', level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/olap/l3/e-ol-l3-03')).toEqual({ engine: 'olap', level: 'L3', lesson: 'e-ol-l3-03' });
    expect(enginePlayOf('#/engine/play/e-ol-l1-02')).toBe('#/engine/olap/L1/e-ol-l1-02');
    expect(engineHash('olap', 'L2', 'e-ol-l2-01')).toBe('#/engine/olap/L2/e-ol-l2-01');
    expect(engineRouteOf('#/engine/olaps').engine).toBeUndefined();
    expect(engineRouteOf('#/engine/olap/ext')).toEqual({ engine: 'olap' }); // the Extensions shelf stays PostgreSQL's
  });
  it('e-ol-… ids survive read → write → read, no Save bump', () => {
    const raw = JSON.stringify({ ...JSON.parse(v5), completed: ['ch1-01', 'e-ol-l1-01', 'e-ol-l3-07'] });
    const s = parseSave(raw, known);
    expect(s.completed).toEqual(['ch1-01', 'e-ol-l1-01', 'e-ol-l3-07']);
    expect(s.version).toBe(JSON.parse(v5).version);
    expect(ENGINE_ID.test('e-ox-l1-01')).toBe(false);
    expect(lessonIdFor('olap', 'L3', '07')).toBe('e-ol-l3-07');
  });
  it('labs run on the Postgres runtime (onPg), normal XP', () => {
    const l = { engine: 'olap', runtime: 'browser', kind: 'lab', viz: undefined, lab: { setup: 'SELECT 1', steps: [] } } as unknown as EngineLesson;
    expect(onPg('olap')).toBe(true);
    expect(LAB_RUNNERS.olap).toBe(LAB_RUNNERS.postgres);
    expect(honestRow(l)).toBe('pg');
    expect(gradable(l, { check: 'rows' } as never)).toBe(true);
    expect(engineXp(l, false)).toBe(ENGINE_XP.lab);
    expect(engineXp({ ...l, kind: 'capstone' }, false)).toBe(ENGINE_XP.capstone);
    expect(engineXp(l, true)).toBe(0);
  });
  it('badges: olap L1–L3 only', () => {
    expect(BADGE_ENGINES).toContain('olap');
    expect(levelsOf('olap')).toEqual(['L1', 'L2', 'L3']);
    const b = badges({ parts: [], levels: new Map(), foundation: [], perf: [], completed: new Set(), engines: { olap: [{ level: 'L1', k: 1, n: 1, started: true, done: true }] }, domains: [] });
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'olap').map((x) => [x.id, x.have])).toEqual([['olap-L1', true], ['olap-L2', false], ['olap-L3', false]]);
  });
  it('track facts: prerequisites name SQL Parts and PostgreSQL L1', () => {
    expect(PREREQS.olap).toEqual([{ sql: [1, 7] }, { engine: 'postgres', to: 'L1' }]);
  });
});
