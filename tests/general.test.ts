import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { buildGeneral as build, drillTicket, DRILL_ID, parseAdv as advOf, parseDrills as drillsOf } from '../src/general';
import { parseLessonBody } from '../src/lessons';
import { DRILL_ID as SAVE_DRILL_ID } from '../src/save';
import { BLANK } from '../src/tickets';

const parseDrills = (src: string, origin: string) => drillsOf(parseYaml(src), origin);
const parseAdv = (src: string, origin: string) => advOf(parseYaml(src), origin, parseLessonBody);
const buildGeneral = (a: string, b: string) => build(parseYaml(a), parseYaml(b), parseLessonBody);
import { generalNow } from '../src/content';
import { SKILLS } from '../src/progress';
import { textOf } from '../src/tickets';
import { compareResults } from '../src/grader';
import { codeSpans, distinctResults, drillRules, labRun, VI_DIACRITIC } from './generalRules';

const DRILL = `
- id: g-where-1
  skill: where
  kind: open
  task: { vi: "Lấy tên.", en: "Get the name." }
  solution: "SELECT name FROM products"
  hint: { vi: "Gợi ý.", en: "Hint." }`;

const LESSON = `
  lesson:
    concept: { vi: "khái niệm", en: "concept" }
    example: "SELECT 1"
    explain: { vi: "giải thích", en: "notes" }
    mistake: { sql: "SELECT", vi: "sai", en: "wrong" }
    try: { task: { vi: "thử", en: "try" }, starter: "SELECT 1", solution: "SELECT 2" }
    docs: https://www.postgresql.org/docs/current/queries.html`;

const NODE = `
- id: a1
  group: A
  status: in
  title: { vi: "Khung", en: "Frames" }
  why: { vi: "Vì.", en: "Why." }
  needs: [window_agg]${LESSON}
  drills:
    - id: g-a1-1
      kind: open
      task: { vi: "Làm.", en: "Do." }
      solution: "SELECT 1"
      hint: { vi: "G.", en: "H." }
    - id: g-a1-2
      kind: challenge
      task: { vi: "Khó.", en: "Hard." }
      solution: "SELECT 2"
      hint: { vi: "G.", en: "H." }`;

const EXT = `
- id: d1
  group: D
  status: external
  title: { vi: "Đọc", en: "Read" }
  why: { vi: "Vì.", en: "Why." }
  needs: []
  links:
    - { title: { vi: "Trang", en: "Page" }, url: "https://roadmap.sh/data-analyst" }`;

describe('parser drill và nút nâng cao', () => {
  it('DRILL_ID và ___ giống save.ts / tickets.ts (general.ts không import giá trị từ main)', () => {
    expect(DRILL_ID.source).toBe(SAVE_DRILL_ID.source);
    expect(parseDrills(DRILL.replace('kind: open', `kind: faded\n  starter: "SELECT ${BLANK} FROM products"`), 'x')[0].kind).toBe('faded');
  });

  it('đọc một drill hợp lệ; ordered mặc định false, starter mặc định undefined', () => {
    const [d] = parseDrills(DRILL, 'sql.yml');
    expect(d).toMatchObject({ id: 'g-where-1', skill: 'where', kind: 'open', ordered: false, solution: 'SELECT name FROM products', wrong: [] });
    expect(d.starter).toBeUndefined();
    expect(DRILL_ID.test(d.id)).toBe(true);
  });

  it('báo lỗi có id khi thiếu trường, kind lạ, faded không có ___, trap không có wrong, id sai mẫu', () => {
    expect(() => parseDrills(DRILL.replace(' en: "Get the name."', ' en: ""'), 'x')).toThrow(/g-where-1.*task/);
    expect(() => parseDrills(DRILL.replace('  solution: "SELECT name FROM products"\n', ''), 'x')).toThrow(/g-where-1.*solution/);
    expect(() => parseDrills(DRILL.replace(/ {2}hint:.*$/m, ''), 'x')).toThrow(/g-where-1.*hint/);
    expect(() => parseDrills(DRILL.replace('kind: open', 'kind: weird'), 'x')).toThrow(/kind/);
    expect(() => parseDrills(DRILL.replace('kind: open', 'kind: faded\n  starter: "SELECT name FROM products"'), 'x')).toThrow(/___/);
    expect(() => parseDrills(DRILL.replace('kind: open', 'kind: trap'), 'x')).toThrow(/wrong/);
    expect(() => parseDrills(DRILL.replace('g-where-1', 'where_1'), 'x')).toThrow(/id/);
    expect(() => parseDrills(DRILL + DRILL, 'x')).toThrow(/trùng/);
  });

  it('nút: đọc bài học và drill; status lạ, thiếu lesson/challenge, external thiếu links → ném', () => {
    const [n] = parseAdv(NODE, 'adv.yml');
    expect(n).toMatchObject({ id: 'a1', group: 'A', status: 'in', needs: ['window_agg'], links: [] });
    expect(n.lesson).toMatchObject({ id: 'a1', node: 'a1', example: 'SELECT 1', cues: { vi: [], en: [] } });
    expect(n.drills.map((d) => [d.id, d.node, d.kind])).toEqual([['g-a1-1', 'a1', 'open'], ['g-a1-2', 'a1', 'challenge']]);
    expect(parseAdv(EXT, 'adv.yml')[0]).toMatchObject({ id: 'd1', status: 'external', drills: [], links: [{ url: 'https://roadmap.sh/data-analyst' }] });
    expect(() => parseAdv(NODE.replace('status: in', 'status: soon'), 'x')).toThrow(/status/);
    expect(() => parseAdv(NODE.replace(LESSON, ''), 'x')).toThrow(/lesson/);
    expect(() => parseAdv(NODE.replace('kind: challenge', 'kind: open'), 'x')).toThrow(/challenge/);
    expect(() => parseAdv(EXT.replace(/ {2}links:\n.*$/m, ''), 'x')).toThrow(/links/);
  });

  it('id trùng giữa sql.yml và adv.yml → ném', () => {
    expect(() => buildGeneral(DRILL, NODE)).not.toThrow();
    expect(() => buildGeneral(DRILL.replace('g-where-1', 'g-a1-1'), NODE)).toThrow(/g-a1-1/);
    const g = buildGeneral(DRILL, NODE);
    expect(g.byId.get('g-a1-2')?.kind).toBe('challenge');
    expect(g.bySkill.get('where')?.map((d) => d.id)).toEqual(['g-where-1']);
  });

  it('drillTicket: Ticket tổng hợp để work.ts chấm như việc thật', () => {
    const [d] = parseDrills(DRILL.replace('kind: open', 'kind: faded\n  starter: "SELECT ___ FROM products"\n  ordered: true'), 'x');
    const t = drillTicket(d);
    expect(t).toMatchObject({ id: 'g-where-1', chapter: 0, tables: [], ordered: true, hints: ['Gợi ý.'], format: 'faded', starter: 'SELECT ___ FROM products', wrong: [] });
    expect(t.steps).toHaveLength(1);
    expect(t.steps[0].solution).toBe(d.solution);
    expect(textOf(t, 'en').task).toBe('Get the name.');
    expect(textOf(t, 'en').hints).toEqual(['Hint.']);
    expect(textOf(t, 'vi').task).toBe('Lấy tên.');
    const [o] = parseDrills(DRILL, 'x');
    expect(drillTicket(o).format).toBe('open');
  });
});

describe('nội dung: drill theo kỹ năng (content/general/sql.yml)', () => {
  const g = generalNow()!;
  const skillDrills = g.drills.filter((d) => d.skill);

  it('mỗi kỹ năng trong skills.yml có đúng 3 drill: một faded, một open, một trap', () => {
    for (const s of SKILLS) expect([s.id, (g.bySkill.get(s.id) ?? []).map((d) => d.kind).sort()]).toEqual([s.id, ['faded', 'open', 'trap']]);
    expect(skillDrills.filter((d) => !SKILLS.some((s) => s.id === d.skill)).map((d) => d.id)).toEqual([]);
  });

  it.each(SKILLS.map((s) => s.id))('%s: hai drill cùng kỹ năng không cùng kết quả', async (id) => {
    expect(await distinctResults(g.bySkill.get(id) ?? [])).toEqual([]);
  });

  drillRules(skillDrills);
});

describe('nội dung: lộ trình DA nâng cao (content/general/adv.yml)', () => {
  const g = generalNow()!;
  const nodes = g.nodes;
  const withLesson = nodes.filter((n) => n.lesson);
  const IDS = [...Array.from({ length: 10 }, (_, i) => `a${i + 1}`), ...Array.from({ length: 7 }, (_, i) => `b${i + 1}`),
    'c1', 'c2', 'c3', ...Array.from({ length: 8 }, (_, i) => `d${i + 1}`)];
  const PARTIAL = ['a10', 'b5', 'b7', 'c2'];

  it('đủ 28 nút đúng thứ tự và trạng thái của v5 §D.3', () => {
    expect(nodes.map((n) => n.id)).toEqual(IDS);
    for (const n of nodes) expect([n.id, n.status]).toEqual([n.id, n.id.startsWith('d') ? 'external' : PARTIAL.includes(n.id) ? 'partial' : 'in']);
    for (const n of nodes) expect(n.group).toBe(n.id[0].toUpperCase());
  });

  it('in|partial: bài học + ≥ 3 drill gồm đúng một challenge; partial|external: ≥ 1 link https', () => {
    for (const n of nodes) {
      if (n.status !== 'external') {
        expect(n.lesson, n.id).toBeDefined();
        expect(n.drills.length, n.id).toBeGreaterThanOrEqual(3);
        expect(n.drills.filter((d) => d.kind === 'challenge'), n.id).toHaveLength(1);
      }
      if (n.status !== 'in') expect(n.links.length, n.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('needs: mọi id là kỹ năng hoặc nút có thật, không vòng', () => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) for (const x of n.needs) expect(SKILLS.some((s) => s.id === x) || byId.has(x), `${n.id} → ${x}`).toBe(true);
    const state = new Map<string, 'open' | 'done'>();
    const visit = (id: string, path: string[]): void => {
      if (state.get(id) === 'done' || !byId.has(id)) return;
      expect(state.get(id), `vòng: ${[...path, id].join(' → ')}`).not.toBe('open');
      state.set(id, 'open');
      for (const x of byId.get(id)!.needs) visit(x, [...path, id]);
      state.set(id, 'done');
    };
    for (const n of nodes) visit(n.id, []);
  });

  it.each(withLesson)('$id: bài học: EN không dấu, code span VI = EN, khái niệm ≤ 70 từ, giải thích ≤ 90 từ', (n) => {
    const l = n.lesson!;
    const en = [l.concept.en, l.explain.en, l.mistake.why.en, l.try.task.en].join('\n');
    expect(en.replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const b of [l.concept, l.explain, l.mistake.why, l.try.task]) expect(codeSpans(b.en)).toEqual(codeSpans(b.vi));
    expect(l.concept.vi.split(/\s+/).length).toBeLessThanOrEqual(70);
    expect(l.explain.vi.split(/\s+/).length).toBeLessThanOrEqual(90);
  });

  it.each(withLesson)('$id: bài học trên lab: ví dụ, câu mở đầu, lời giải có dòng; mở đầu chưa đạt; câu sai báo lỗi hoặc khác ví dụ', async (n) => {
    const l = n.lesson!;
    const run = await labRun();
    for (const sql of [l.example, l.try.starter, l.try.solution]) expect((await run(sql)).rows.length).toBeGreaterThan(0);
    expect(compareResults(await run(l.try.solution), await run(l.try.starter), l.try.ordered).ok).toBe(false);
    const wrong = await run(l.mistake.sql).catch(() => undefined);
    if (wrong) expect(compareResults(await run(l.example), wrong, true).ok).toBe(false);
  });

  it.each(withLesson)('$id: các drill của nút không cùng kết quả', async (n) => {
    expect(await distinctResults(n.drills)).toEqual([]);
  });

  drillRules(nodes.flatMap((n) => n.drills));
});
