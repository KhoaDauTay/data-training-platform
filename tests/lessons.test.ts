import { describe, expect, it } from 'vitest';
import { generalNow, loadLessons, loadTicketTemplates } from '../src/content';
import labSql from '../src/db/lab.sql?raw';
import { sqlErrorInfo } from '../src/db/run';
import { compareResults } from '../src/grader';
import { cueIn, lessonSchema, LESSONS_KEY, loadLessonPrefs, markLesson, parseLessons as lessonsOf } from '../src/lessons';
import { parse as parseYaml } from 'yaml';
const parseLessons = (src: string, origin?: string) => lessonsOf(parseYaml(src), origin); // V22-E: the parser takes parsed YAML
import { CHAPTER_TABLES, GENERAL_SKILLS, ROUTE_SKILLS } from '../src/progress';
const SKILLS = ROUTE_SKILLS; // v25 R1: skills.yml + the General-only skills (skills-general.yml)
import { textOf } from '../src/tickets';
import { labRun } from './generalRules';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
/** L84: lessons run on `lab`. Tables of lab.sql, and every name a lesson could borrow by mistake (Logistics + lab). */
const LAB_TABLES = [...labSql.matchAll(/^CREATE TABLE (\w+)/gim)].map((m) => m[1].toLowerCase());
const KNOWN_TABLES = new Set([...Object.values(CHAPTER_TABLES).flat(), ...LAB_TABLES]);
/** FROM/JOIN identifiers that are a known table name (EXTRACT(… FROM col) and CTE names are not tables, so they are skipped). */
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => KNOWN_TABLES.has(x));

const fakeKV = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

const ENTRY = `
- id: where
  cues: { vi: ["chỉ …"], en: ["only …"] }
  concept: { vi: "khái niệm", en: "concept" }
  example: "SELECT 1"
  explain: { vi: "giải thích", en: "notes" }
  mistake: { sql: "SELECT", vi: "sai", en: "wrong" }
  try: { task: { vi: "thử", en: "try" }, starter: "SELECT 1", solution: "SELECT 2" }
  docs: https://www.postgresql.org/docs/current/queries-table-expressions.html`;

describe('parseLessons, cueIn, pref bài học', () => {
  it('đọc một mục hợp lệ; ordered mặc định false', () => {
    const [l] = parseLessons(ENTRY);
    expect(l).toMatchObject({ id: 'where', cues: { vi: ['chỉ …'], en: ['only …'] }, mistake: { sql: 'SELECT', why: { vi: 'sai', en: 'wrong' } } });
    expect(l.try).toEqual({ task: { vi: 'thử', en: 'try' }, starter: 'SELECT 1', solution: 'SELECT 2', ordered: false });
  });

  it('báo lỗi khi thiếu trường, trùng id hay docs không phải trang PostgreSQL', () => {
    expect(() => parseLessons(ENTRY.replace('  example: "SELECT 1"\n', ''))).toThrow(/example/);
    expect(() => parseLessons(ENTRY + ENTRY)).toThrow(/trùng id/);
    expect(() => parseLessons(ENTRY.replace('https://www.postgresql.org/docs/', 'https://example.com/'))).toThrow(/docs/);
    expect(() => parseLessons(ENTRY.replace('en: "notes"', 'en: ""'))).toThrow(/explain/);
  });

  it('v46 (L860): figure: { name, variant?, step? } đọc thành FigRef ở mục Ý chính; tên, variant hay step hỏng thì báo lỗi', () => {
    expect(parseLessons(ENTRY)[0].figure).toBeUndefined();
    const fig = (f: string) => parseLessons(ENTRY.replace('- id: where\n', `- id: where\n  figure: ${f}\n`));
    expect(fig('{ name: sql-rows-columns, variant: rows }')[0].figure).toEqual({ name: 'sql-rows-columns', at: 'concept', variant: 'rows' });
    expect(fig('{ name: sql-clause-order, step: 2 }')[0].figure).toEqual({ name: 'sql-clause-order', at: 'concept', step: 2 });
    expect(() => fig('{ name: "Bad Name" }')).toThrow(/figure.name/);
    expect(() => fig('[sql-x]')).toThrow(/figure cần/);
    expect(() => fig('{ name: sql-x, variant: 3 }')).toThrow(/figure.variant/);
    expect(() => fig('{ name: sql-x, step: -1 }')).toThrow(/figure.step/);
  });

  it('cueIn: các đoạn giữa "…" theo thứ tự, trong cùng một câu, không phân biệt hoa thường', () => {
    expect(cueIn('từ ngày … đến …', 'Lấy lô từ ngày 01/07 đến hết 30/09.')).toBe(true);
    expect(cueIn('từ ngày … đến …', 'Đến cuối tháng. Từ ngày 01/07.')).toBe(false);
    expect(cueIn('the … heaviest', 'Send me the 10 heaviest shipments.')).toBe(true);
    expect(cueIn('… lên đầu', 'Lô nặng nhất lên đầu.')).toBe(true);
    expect(cueIn('…', 'anything')).toBe(false);
  });

  it('pref đã xem / đã thử: dữ liệu hỏng thành rỗng, đánh dấu không trùng', () => {
    const kv = fakeKV();
    expect(loadLessonPrefs(kv)).toEqual({ seen: [], tried: [] });
    kv.setItem(LESSONS_KEY, '{"seen": "where", "tried": [1, "join"]}');
    expect(loadLessonPrefs(kv)).toEqual({ seen: [], tried: ['join'] });
    kv.setItem(LESSONS_KEY, 'not json');
    expect(loadLessonPrefs(kv)).toEqual({ seen: [], tried: [] });
    markLesson('where', false, kv);
    markLesson('where', true, kv);
    expect(loadLessonPrefs(kv)).toEqual({ seen: ['where'], tried: ['where'] });
  });
});

/** product-design-v4 §C.5 as amended by L84: content rules for every quick lesson, on the `lab` schema. */
describe('bài học nhanh (content/lessons.yml)', () => {
  const lessons = [...loadLessons().values()];
  const templates = loadTicketTemplates();

  it('lab.sql có bảng (kiểm chính bộ đọc tên bảng của test này)', () => {
    expect(LAB_TABLES).toContain('orders');
    expect(LAB_TABLES.length).toBeGreaterThanOrEqual(10);
  });

  it('mọi kỹ năng trong skills.yml có đúng một bài học (Plan 8a: 38); id là kỹ năng có thật; mọi bài chạy trên lab', () => {
    expect(SKILLS.filter((s) => !loadLessons().has(s.id)).map((s) => s.id)).toEqual([]);
    expect(lessons).toHaveLength(SKILLS.length);
    expect(lessons.filter((l) => !SKILLS.some((s) => s.id === l.id)).map((l) => l.id)).toEqual([]);
    expect(lessons.filter((l) => lessonSchema(l) !== 'lab').map((l) => l.id)).toEqual([]);
  });

  it.each(lessons)('$id: ≥ 3 dấu hiệu mỗi ngôn ngữ; việc mở kỹ năng dùng ≥ 1 dấu hiệu trong thân đề / Task', (l) => {
    const t = templates.find((x) => x.grants.includes(l.id));
    for (const lang of ['vi', 'en'] as const) {
      expect(l.cues[lang].length).toBeGreaterThanOrEqual(3);
      if (!t && GENERAL_SKILLS.some((s) => s.id === l.id)) continue; // v25 R1: no domain ticket grants a General-only skill
      if (!t) throw new Error(`${l.id}: no ticket grants it`);
      const x = textOf(t, lang);
      expect(l.cues[lang].some((c) => cueIn(c, `${x.body}\n${x.task}`))).toBe(true);
    }
  });

  it.each(lessons)('$id: EN không dấu, code span VI = EN, khái niệm ≤ 60 từ, giải thích ≤ 90 từ', (l) => {
    const en = [l.concept.en, l.explain.en, l.mistake.why.en, l.try.task.en, ...l.cues.en].join('\n');
    expect(en.replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const k of ['concept', 'explain'] as const) expect(codeSpans(l[k].en)).toEqual(codeSpans(l[k].vi));
    expect(codeSpans(l.mistake.why.en)).toEqual(codeSpans(l.mistake.why.vi));
    expect(codeSpans(l.try.task.en)).toEqual(codeSpans(l.try.task.vi));
    expect(l.concept.vi.split(/\s+/).length).toBeLessThanOrEqual(60);
    expect(l.explain.vi.split(/\s+/).length).toBeLessThanOrEqual(90);
  });

  it.each(lessons)('$id: ví dụ, câu sai, câu mở đầu và lời giải Thử ngay chỉ dùng bảng của lab', (l) => {
    for (const sql of [l.example, l.mistake.sql, l.try.starter, l.try.solution]) expect(tablesIn(sql).filter((x) => !LAB_TABLES.includes(x))).toEqual([]);
  });

  it.each(lessons)('$id: ví dụ, câu mở đầu và lời giải Thử ngay chạy trên lab, có dòng; câu sai không lỗi vì thiếu bảng', async (l) => {
    const run = await labRun();
    for (const sql of [l.example, l.try.starter, l.try.solution]) expect((await run(sql)).rows.length).toBeGreaterThan(0);
    const err = await run(l.mistake.sql).then(() => undefined, (e: unknown) => e);
    if (err) expect(sqlErrorInfo(err)?.code).not.toBe('42P01'); // the mistake teaches SQL, not a table that is not there
  });

  it.each(lessons)('$id: lời giải Thử ngay khác kết quả của cả bốn drill cùng kỹ năng (không là đáp án drill)', async (l) => {
    const run = await labRun();
    const drills = generalNow()!.bySkill.get(l.id) ?? [];
    expect(drills).toHaveLength(4);
    const mine = await run(l.try.solution);
    for (const d of drills) expect(compareResults(await run(d.solution, d.check), mine, false).ok, d.id).toBe(false);
  });

  it.each(lessons)('$id: câu mở đầu Thử ngay chưa đạt; câu sai báo lỗi hoặc ra kết quả khác ví dụ', async (l) => {
    const run = await labRun();
    expect(compareResults(await run(l.try.solution), await run(l.try.starter), l.try.ordered).ok).toBe(false);
    const wrong = await run(l.mistake.sql).catch(() => undefined);
    if (wrong) expect(compareResults(await run(l.example), wrong, true).ok).toBe(false);
  });
});
