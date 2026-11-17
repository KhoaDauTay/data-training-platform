import { describe, expect, it } from 'vitest';
import { buildGeneral, drillTicket, DRILL_ID, parseAdv, parseDrills } from '../src/general';
import { generalNow } from '../src/content';
import { SKILLS } from '../src/progress';
import { textOf } from '../src/tickets';
import { distinctResults, drillRules } from './generalRules';

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
