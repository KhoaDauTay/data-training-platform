// v47 Telemetry R1 (L1030–L1049): the sixth Engine card, "Telemetry & Observability", lessons `e-tm-l<n>-NN`. L1–L2 and the
// capstone are PostgreSQL labs (PGlite); L3's `lang: promql` steps run on the PromQL simulation (src/engine/telemetry/promql.ts)
// over the lab's `samples` table. Anatomy as the data stack track (tests/engineStack.test.ts): every lesson is a lab with the
// eight sections, ≥ 2 questions, ≥ 1 trap, one `tm-` figure, code lines ≤ 40 characters, sources from official docs.
// Runs: setup, then every ```sql block of Ví dụ and Lỗi hay gặp; every ```promql block is evaluated on the lab's samples.
// Lab steps: the Solution passes its own check; `SELECT 1` never does.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { blocksOf, lessonProblems, parseEngineLesson, parseModules, SECTIONS, type EngineLesson, type SectionId } from '../src/engine/content';
import { gradable, honestOf } from '../src/engine/labs';
import { extensionsOf, pgScriptRunner } from '../src/engine/pglab/runner';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import type { ScriptStep } from '../src/engine/pglab/script';
import { runPromql, seriesOf } from '../src/engine/telemetry/promql';
import { SAMPLES_SQL, tmRunner } from '../src/engine/telemetry/promqlRunner';
import { compareResults, grade } from '../src/grader';
import v5 from './fixtures/save-v5.json?raw';
import { ENGINE_XP, engineXp, lessonIdFor, onPg } from '../src/engine/content';
import { LAB_RUNNERS } from '../src/engine/labs';
import { PREREQS } from '../src/engine/tracks';
import { badges, BADGE_ENGINES, levelsOf } from '../src/mastery';
import { engineHash, enginePlayOf, engineRouteOf } from '../src/route';
import { ENGINE_ID, parseSave, type Known } from '../src/save';

const files = import.meta.glob<string>('../content/engine/telemetry/L*/*.md', { query: '?raw', import: 'default', eager: true });
const moduleRaw = import.meta.glob<string>('../content/engine/telemetry/modules.yml', { query: '?raw', import: 'default', eager: true });
const all = Object.entries(files).map(([p, raw]) => {
  const fm = parse(/^---\n([\s\S]*?)\n---\n/.exec(raw.replace(/\r\n/g, '\n'))![1]) as Record<string, unknown>;
  return { l: parseEngineLesson(raw, p, parse), fm, raw };
}).sort((a, b) => a.l.id.localeCompare(b.l.id));
const ids = new Set(all.map((x) => x.l.id));

const PLAN: Record<string, EngineLesson['kind'][]> = {
  L1: ['lab', 'lab', 'lab', 'lab'],
  L2: ['lab', 'lab', 'lab', 'lab', 'lab'],
  L3: ['lab', 'lab', 'lab', 'capstone'],
};
const ORDER = Object.keys(SECTIONS) as SectionId[];
const NEED: SectionId[] = ['open', 'idea', 'syntax', 'example', 'pitfalls', 'practice', 'recap'];
const text = (l: EngineLesson, id: SectionId): { vi: string; en: string } | undefined => l.sections.find((s) => s.id === id)?.text;
const codeBlocks = (t: string | undefined, lang: string): string[] => (t ? blocksOf(t).flatMap((b) => (b.kind === 'code' && b.lang === lang ? [b.code] : [])) : []);
const ERR = /^--\s*ERROR\s+([0-9A-Z]{5})\b/m;
const isErr = (b: string): boolean => /^(--|#)\s*ERROR\b/m.test(b);
const isWrong = (b: string): boolean => /^(--|#)\s*WRONG\b/m.test(b);
const isFix = (b: string): boolean => /^(--|#)\s*FIX\b/m.test(b);
const wordCountOf = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const OFFICIAL = /^https:\/\/(opentelemetry\.io|prometheus\.io|grafana\.com|www\.postgresql\.org|raw\.githubusercontent\.com\/prometheus|github\.com\/prometheus)\//;

async function samplesOf(setup: string | undefined) {
  const r = await runLabScript({ setup, steps: [SAMPLES_SQL] });
  expect(r.setupError).toBeUndefined();
  const rows = r.steps[0].rows;
  return { data: seriesOf(rows), at: Number(rows[0][4]) };
}

describe('Engine Telemetry (v47 R1): bài, mô-đun, luật nội dung', () => {
  it('13 bài, đúng loại từng cấp, id e-tm-', () => {
    const got = Object.fromEntries(Object.keys(PLAN).map((lv) => [lv, all.filter((x) => x.l.level === lv).sort((a, b) => a.l.order - b.l.order).map((x) => x.l.kind)]));
    expect(got).toEqual(PLAN);
    expect(all.every((x) => /^e-tm-l[1-3]-\d\d$/.test(x.l.id) && x.l.engine === 'telemetry')).toBe(true);
  });
  it('modules.yml: mỗi mô-đun có VI/EN và được dùng', () => {
    const [path, raw] = Object.entries(moduleRaw)[0];
    const names = parseModules(raw, path, parse);
    const used = new Set(all.map((x) => x.l.module));
    expect(names.map((n) => n.id).filter((id) => !used.has(id))).toEqual([]);
    expect([...used].filter((id) => !names.some((n) => n.id === id))).toEqual([]);
  });
  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: luật nội dung, nhãn chạy thật, một hình tm-, nguồn chính thức', (_, l) => {
    expect(lessonProblems(l, new Set([...ids, ...l.requires.filter((r) => /^e-pg-/.test(r))]))).toEqual([]);
    expect(honestOf(l)).toBe('pg');
    for (const s of l.lab?.steps ?? []) expect(gradable(l, s)).toBe(true);
    expect((l.figures ?? []).filter((f) => f.name.startsWith('tm-')).length).toBe(1);
    expect(l.sources.length).toBeGreaterThanOrEqual(1);
    for (const s of l.sources) expect(s, l.id).toMatch(OFFICIAL);
    for (const s of l.sections) for (const t of [s.text.vi, s.text.en]) expect(t, l.id).not.toMatch(/\$\s?\d|USD\s?\d|\d\s?(USD|đô)/);
    // a PromQL lab says it is simulated (the lab card adds tm.sim; the text says it too)
    if (l.lab!.steps.some((s) => s.lang)) expect(`${text(l, 'idea')!.vi} ${text(l, 'syntax')!.vi}`).toMatch(/mô phỏng/);
    for (const s of l.lab!.steps) if (s.lang) expect(s.lang).toBe('promql');
  });
  it.each(all.map((x) => [x.l.id, x.raw] as const))('%s: mọi dòng code ≤ 40 ký tự (L542)', (_, raw) => {
    const body = raw.replace(/\r\n/g, '\n').split(/\n---\n/).slice(1).join('\n---\n');
    const long = [...body.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n')).filter((x) => [...x].length > 40);
    expect(long).toEqual([]);
  });
});

describe('Engine Telemetry: giải phẫu 8 mục', () => {
  it.each(all.map((x) => [x.l.id, x] as const))('%s: mục, thứ tự, câu hỏi có bẫy, lựa chọn cân', (_, { l, fm }) => {
    const sec = l.sections.map((s) => s.id);
    expect(sec, 'thứ tự mục').toEqual([...sec].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
    expect(NEED.filter((k) => !sec.includes(k)), 'thiếu mục').toEqual([]);
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(text(l, 'open')!.vi.split(/(?<=[.!?])\s+/).filter(Boolean).length, 'Mở bài ≤ 3 câu').toBeLessThanOrEqual(3);
    for (const p of (text(l, 'idea')?.vi ?? '').split(/\n\s*\n/)) expect(wordCountOf(p), `Ý chính: đoạn > 150 từ: ${p.slice(0, 40)}`).toBeLessThanOrEqual(150);
    expect(blocksOf(text(l, 'syntax')!.vi)[0]?.kind, 'Cú pháp mở bằng một khối code').toBe('code');
    for (const lang of ['vi', 'en'] as const) {
      const recap = blocksOf(text(l, 'recap')![lang]);
      expect(recap.map((b) => b.kind), 'Tóm tắt = một danh sách').toEqual(['ul']);
      const n = (recap[0] as { items: string[] }).items.length;
      expect(n >= 3 && n <= 5, `Tóm tắt 3–5 dòng (${n})`).toBe(true);
    }
    const ex = codeBlocks(text(l, 'example')?.vi, 'sql').filter((b) => !isErr(b));
    expect(ex.length >= 2 && ex.length <= 6, `Ví dụ 2–6 khối SQL chạy ra dòng (${ex.length})`).toBe(true);
    const pit = [...codeBlocks(text(l, 'pitfalls')?.vi, 'sql'), ...codeBlocks(text(l, 'pitfalls')?.vi, 'promql')].filter((b) => isErr(b) || isWrong(b));
    expect(pit.length >= 2 && pit.length <= 4, `Lỗi hay gặp 2–4 bẫy (${pit.length})`).toBe(true);
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
    const answers = all.flatMap(({ l }) => (l.quiz ?? []).map((q) => q.answer));
    expect(new Set(answers).size).toBeGreaterThanOrEqual(3);
  });

  it.each(all.map((x) => [x.l.id, x.l] as const))('%s: Ví dụ và Lỗi hay gặp chạy thật sau setup (SQL trên PGlite, PromQL trên bản mô phỏng)', async (_, l) => {
    const blocks = [...codeBlocks(text(l, 'example')?.vi, 'sql'), ...codeBlocks(text(l, 'pitfalls')?.vi, 'sql')];
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
      if (isWrong(b)) {
        expect(isFix(blocks[i + 1] ?? ''), `-- WRONG cần -- FIX ngay sau: ${b.slice(0, 60)}`).toBe(true);
        expect(compareResults(result(i + 1), result(i), false).ok, `WRONG ra cùng dòng với FIX: ${b.slice(0, 60)}`).toBe(false);
        return;
      }
      expect(result(i).rows.length, `khối không ra dòng: ${b.slice(0, 80)}`).toBeGreaterThan(0);
    });
    const prom = [...codeBlocks(text(l, 'example')?.vi, 'promql'), ...codeBlocks(text(l, 'pitfalls')?.vi, 'promql')];
    if (!prom.length) return;
    const { data, at } = await samplesOf(setup);
    const ev = (q: string) => runPromql(q.split('\n').filter((x) => !/^\s*#/.test(x)).join('\n'), data, at);
    prom.forEach((b, i) => {
      if (isErr(b)) { expect(() => ev(b), b).toThrow(); return; }
      const out = ev(b);
      if (isWrong(b)) {
        expect(isFix(prom[i + 1] ?? ''), `# WRONG cần # FIX ngay sau: ${b}`).toBe(true);
        expect(compareResults({ ...ev(prom[i + 1]), types: [] }, { ...out, types: [] }, false).ok, `WRONG = FIX: ${b}`).toBe(false);
        return;
      }
      expect(out.rows.length, `PromQL không ra dòng: ${b}`).toBeGreaterThan(0);
    });
  }, 120_000);
});

describe('Engine Telemetry: mọi bước lab qua bằng lời giải, không qua khi không làm gì', () => {
  const pg = pgScriptRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, { run: runLabScript, reset: () => undefined });
  const runner = tmRunner({ grade, verdict: (x) => JSON.stringify(x).slice(0, 300) }, pg);
  const steps = all.flatMap(({ l }) => l.lab!.steps.map((s, i) => [`${l.id} s${i + 1} (${s.lang ?? s.check})`, l, i] as const));
  it.each(steps)('%s', async (_, l, i) => {
    const s = l.lab!.steps[i];
    expect(await runner.check(l.lab!, s, s.solution)).toMatchObject({ ok: true });
    expect(await runner.check(l.lab!, s, 'SELECT 1')).toMatchObject({ ok: false });
    if (s.check === 'rows' && !s.after) {
      const out = await runner.run(l.lab!, s.solution, i);
      expect(out.rows.length, 'Solution trả 0 dòng').toBeGreaterThan(0);
      for (const row of out.rows) for (const v of row) expect(Number.isNaN(v), 'NaN trong kết quả').toBe(false);
      if (s.ordered && !s.lang) expect(s.solution).toMatch(/ORDER BY/i);
    }
  }, 120_000);
});

describe('Engine Telemetry: wiring (routes, Save ids, XP, badges, track facts, runner)', () => {
  const known: Known = { ticketIds: new Set(['ch1-01']), laneIds: new Set(), skills: new Set(['select']) };
  it('routes #/engine/telemetry[/L<n>[/<id>]] and #/engine/play/e-tm-…', () => {
    expect(engineRouteOf('#/engine/telemetry')).toEqual({ engine: 'telemetry', level: undefined, lesson: undefined });
    expect(engineRouteOf('#/engine/telemetry/l3/e-tm-l3-02')).toEqual({ engine: 'telemetry', level: 'L3', lesson: 'e-tm-l3-02' });
    expect(enginePlayOf('#/engine/play/e-tm-l1-02')).toBe('#/engine/telemetry/L1/e-tm-l1-02');
    expect(engineHash('telemetry', 'L2', 'e-tm-l2-01')).toBe('#/engine/telemetry/L2/e-tm-l2-01');
    expect(engineRouteOf('#/engine/telemetrys').engine).toBeUndefined();
  });
  it('e-tm-… ids survive read → write → read, no Save bump', () => {
    const raw = JSON.stringify({ ...JSON.parse(v5), completed: ['ch1-01', 'e-tm-l1-01', 'e-tm-l3-04'] });
    const s = parseSave(raw, known);
    expect(s.completed).toEqual(['ch1-01', 'e-tm-l1-01', 'e-tm-l3-04']);
    expect(s.version).toBe(JSON.parse(v5).version);
    expect(lessonIdFor('telemetry', 'L3', '04')).toBe('e-tm-l3-04');
    expect(ENGINE_ID.test('e-tx-l1-01')).toBe(false);
  });
  it('labs run on the Postgres runtime (onPg) behind the PromQL wrapper, normal XP', () => {
    const l = { engine: 'telemetry', runtime: 'browser', kind: 'lab', viz: undefined, lab: { setup: 'SELECT 1', steps: [] } } as unknown as EngineLesson;
    expect(onPg('telemetry')).toBe(true);
    expect(LAB_RUNNERS.telemetry).toBeTypeOf('function');
    expect(LAB_RUNNERS.telemetry).not.toBe(LAB_RUNNERS.postgres);
    expect(engineXp(l, false)).toBe(ENGINE_XP.lab);
    expect(engineXp({ ...l, kind: 'capstone' }, false)).toBe(ENGINE_XP.capstone);
  });
  it('badges: telemetry L1–L3 only; prerequisites name SQL Parts and PostgreSQL L1', () => {
    expect(BADGE_ENGINES).toContain('telemetry');
    expect(levelsOf('telemetry')).toEqual(['L1', 'L2', 'L3']);
    const b = badges({ parts: [], levels: new Map(), foundation: [], perf: [], completed: new Set(), engines: { telemetry: [{ level: 'L1', k: 1, n: 1, started: true, done: true }] }, domains: [] });
    expect(b.filter((x) => x.kind === 'engine' && x.engine === 'telemetry').map((x) => [x.id, x.have])).toEqual([['telemetry-L1', true], ['telemetry-L2', false], ['telemetry-L3', false]]);
    expect(PREREQS.telemetry).toEqual([{ sql: [1, 8] }, { engine: 'postgres', to: 'L1' }]);
  });
});