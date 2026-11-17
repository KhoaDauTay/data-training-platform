import { describe, expect, it } from 'vitest';
import { loadLessons, loadTicketTemplates } from '../src/content';
import { compareResults } from '../src/grader';
import { cueIn, LESSONS_KEY, loadLessonPrefs, markLesson, parseLessons, type Lesson } from '../src/lessons';
import { CHAPTER_TABLES, SKILLS, tablesUnlocked } from '../src/progress';
import { textOf } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { runner } from './helpers';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL_TABLES.includes(x));

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

/** product-design-v4 §C.5: content rules for every quick lesson, on the real data. */
describe('bài học nhanh (content/lessons.yml)', () => {
  const lessons = [...loadLessons().values()];
  const templates = loadTicketTemplates();
  const skillOf = (l: Lesson) => SKILLS.find((s) => s.id === l.id)!;
  /** The ticket that grants the skill, with every variant's Solution. */
  const solutionsOf = (l: Lesson) => {
    const t = templates.find((x) => x.grants.includes(l.id))!;
    return Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v).steps[0].solution);
  };

  it('mọi kỹ năng chương 1–3 có bài học; id là kỹ năng có thật', () => {
    expect(SKILLS.filter((s) => s.chapter <= 3 && !loadLessons().has(s.id)).map((s) => s.id)).toEqual([]);
    expect(lessons.filter((l) => !SKILLS.some((s) => s.id === l.id)).map((l) => l.id)).toEqual([]);
  });

  it.each(lessons)('$id: ≥ 3 dấu hiệu mỗi ngôn ngữ; việc mở kỹ năng dùng ≥ 1 dấu hiệu trong thân đề / Task', (l) => {
    const t = templates.find((x) => x.grants.includes(l.id))!;
    for (const lang of ['vi', 'en'] as const) {
      expect(l.cues[lang].length).toBeGreaterThanOrEqual(3);
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

  it.each(lessons)('$id: ví dụ, câu mở đầu và lời giải Thử ngay chạy được, có dòng, chỉ dùng bảng đã mở ở chương của kỹ năng', async (l) => {
    const run = await runner();
    const open = tablesUnlocked(skillOf(l).chapter);
    for (const sql of [l.example, l.try.starter, l.try.solution, l.mistake.sql]) expect(tablesIn(sql).filter((x) => !open.includes(x))).toEqual([]);
    for (const sql of [l.example, l.try.starter, l.try.solution]) expect((await run(sql)).rows.length).toBeGreaterThan(0);
  });

  it.each(lessons)('$id: ví dụ và lời giải Thử ngay khác kết quả Solution của việc mở kỹ năng (không lộ đáp án)', async (l) => {
    const run = await runner();
    const t = templates.find((x) => x.grants.includes(l.id))!;
    for (const solution of solutionsOf(l)) {
      const expected = await run(solution);
      expect(compareResults(expected, await run(l.example), t.ordered).ok).toBe(false);
      expect(compareResults(expected, await run(l.try.solution), t.ordered).ok).toBe(false);
    }
  });

  it.each(lessons)('$id: câu mở đầu Thử ngay chưa đạt; câu sai báo lỗi hoặc ra kết quả khác ví dụ', async (l) => {
    const run = await runner();
    expect(compareResults(await run(l.try.solution), await run(l.try.starter), l.try.ordered).ok).toBe(false);
    const wrong = await run(l.mistake.sql).catch(() => undefined);
    if (wrong) expect(compareResults(await run(l.example), wrong, true).ok).toBe(false);
  });
});
