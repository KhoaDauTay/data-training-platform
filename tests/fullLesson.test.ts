import { describe, expect, it } from 'vitest';
import { generalNow, loadLessons } from '../src/content';
import { sqlErrorInfo } from '../src/db/run';
import { compareResults } from '../src/grader';
import { LESSON_SECTIONS, parseFullLesson, wordCount, type FullLesson } from '../src/fullLesson';
import { fullLessons, lessonIdOf } from '../src/generalLessonSources';
import { codeSpans, labRun, VI_DIACRITIC } from './generalRules';

/**
 * v24 R0 (product-route-v24 §2.2, L337): every General full lesson has the eight sections, ≥ 3 runnable examples (rows on
 * `lab`), ≥ 2 runnable pitfalls (the wrong query fails with a SQLSTATE or returns other rows than the fix), ≥ 2 questions
 * with ≥ 1 misconception, a recap and an official source; its practice section is the quick lesson's "Thử ngay" + 4 drills.
 */
const lessons: [string, FullLesson][] = await Promise.all(Object.entries(fullLessons).map(async ([path, load]) => [lessonIdOf(path), parseFullLesson(await load(), path)] as [string, FullLesson]));
const g = generalNow()!;

describe('bài đầy đủ General: giải phẫu 8 mục', () => {
  it('có ít nhất một bài (R0: select) và id = tên file', () => {
    expect(lessons.map(([id]) => id)).toContain('select');
    for (const [id, l] of lessons) expect(l.id).toBe(id);
    expect(LESSON_SECTIONS).toHaveLength(8);
  });

  it.each(lessons)('%s: mục 1–3, 6–8 đủ; Ý chính ≤ 150 từ mỗi đoạn; EN không dấu, code span VI = EN', (id, l) => {
    expect(l.objectives.length).toBeGreaterThanOrEqual(2);
    expect(l.objectives.length).toBeLessThanOrEqual(4);
    expect(l.open.vi.split(/(?<=[.!?:])\s+/).length).toBeLessThanOrEqual(4);
    for (const p of l.idea.vi.split(/\n\s*\n/)) expect(wordCount(p)).toBeLessThanOrEqual(150);
    expect(l.syntax.sql).toMatch(/\bSELECT\b|\bWITH\b|\bINSERT\b|\bUPDATE\b|\bCREATE\b|\bEXPLAIN\b/);
    expect(l.syntax.options.length).toBeLessThanOrEqual(8);
    expect(loadLessons().get(id)?.try.solution).toBeTruthy(); // mục 6: Thử ngay
    expect(g.bySkill.get(id)).toHaveLength(4); // mục 6: 4 bài luyện
    expect(l.quiz.length).toBeGreaterThanOrEqual(2);
    expect(l.quiz.some((q) => q.trap !== undefined)).toBe(true);
    expect(l.recap.length).toBeGreaterThanOrEqual(3);
    expect(l.recap.length).toBeLessThanOrEqual(5);
    expect(l.sources.some((u) => u.startsWith('https://www.postgresql.org/docs/'))).toBe(true);
    const en = [l.title.en, l.open.en, l.idea.en, l.syntax.text?.en ?? '', ...l.objectives.map((o) => o.en), ...l.examples.flatMap((e) => [e.title.en, e.read.en]),
      ...l.pitfalls.flatMap((p) => [p.title.en, p.why.en]), ...l.quiz.flatMap((q) => [q.q.en, q.why.en, ...q.options.map((o) => o.en)]), ...l.recap.map((r) => r.en), ...l.syntax.options.map((o) => o.text.en)];
    for (const s of en) expect([s, VI_DIACRITIC.test(s)]).toEqual([s, false]);
    const pairs: [{ vi: string; en: string }, string][] = [[l.open, 'open'], [l.idea, 'idea'], ...l.examples.map((e, i) => [e.read, `ex${i}`] as [{ vi: string; en: string }, string]),
      ...l.pitfalls.map((p, i) => [p.why, `pit${i}`] as [{ vi: string; en: string }, string]), ...l.recap.map((r, i) => [r, `recap${i}`] as [{ vi: string; en: string }, string])];
    for (const [b, where] of pairs) expect([where, codeSpans(b.vi)]).toEqual([where, codeSpans(b.en)]);
  });

  it.each(lessons)('%s: ≥ 3 ví dụ chạy ra dòng trên lab, khác nhau', async (_id, l) => {
    const run = await labRun();
    expect(l.examples.length).toBeGreaterThanOrEqual(3);
    expect(l.examples.length).toBeLessThanOrEqual(6);
    const results = [];
    for (const e of l.examples) {
      const r = await run(e.sql);
      expect([e.sql, r.rows.length > 0]).toEqual([e.sql, true]);
      results.push(r);
    }
    for (let i = 1; i < results.length; i++) expect(compareResults(results[i - 1], results[i], false).ok).toBe(false);
  });

  it.each(lessons)('%s: ≥ 2 bẫy chạy thật (lỗi có SQLSTATE, hoặc dòng khác câu sửa); câu sửa chạy ra dòng', async (_id, l) => {
    const run = await labRun();
    expect(l.pitfalls.length).toBeGreaterThanOrEqual(2);
    expect(l.pitfalls.length).toBeLessThanOrEqual(4);
    for (const p of l.pitfalls) {
      const fix = await run(p.fix);
      expect(fix.rows.length).toBeGreaterThan(0);
      const wrong = await run(p.wrong).catch((e: unknown) => e);
      if (wrong instanceof Error) expect([p.wrong, sqlErrorInfo(wrong)?.code]).toEqual([p.wrong, expect.stringMatching(/^[0-9A-Z]{5}$/)]);
      else expect([p.wrong, compareResults(fix, wrong as typeof fix, false).ok]).toEqual([p.wrong, false]);
      expect(l.examples.map((e) => e.sql)).not.toContain(p.wrong);
    }
  });
});
