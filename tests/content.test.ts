import { describe, expect, it } from 'vitest';
import template from '../content/TEMPLATE.md?raw';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { compareResults } from '../src/grader';
import { KPIS } from '../src/home';
import { CHAPTER_TABLES, contentProblems, SKILLS } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { runner } from './helpers';

const tickets = loadTickets();
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({
  name: `${t.id}#${i}`, ordered: t.ordered, tables: t.tables, sql: s.solution, columns: s.columns,
})));

const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText): string => [
  x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? '',
].join('\n');
// ponytail: regex over FROM/JOIN is enough for content Solutions (no CTE, no quoted names).
// Swap for tablesInQuery (Plan 1b Task 6, libpg-query) if a Solution ever needs a CTE or subquery in FROM.
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))]
    .filter((x) => ALL_TABLES.includes(x));

describe('nội dung ticket', () => {
  it('có ticket', () => {
    expect(tickets.length).toBeGreaterThan(0);
  });

  it('soft-lock, nhịp chương, kỹ năng và chương hợp lệ', () => {
    expect(contentProblems(tickets)).toEqual([]);
  });

  it('content/TEMPLATE.md là ticket hợp lệ', () => {
    expect(parseTicket(template, 'content/TEMPLATE.md').en).toBeDefined();
  });
});

describe('song ngữ', () => {
  it.each(tickets)('$id: có khối # EN', (t) => {
    expect(t.en).toBeDefined();
  });

  it.each(tickets)('$id: EN giữ nguyên mọi `code span` của VI', (t) => {
    expect(codeSpans(allText(textOf(t, 'en')))).toEqual(codeSpans(allText(textOf(t, 'vi'))));
  });

  it.each(tickets)('$id: EN không còn chữ tiếng Việt có dấu (ngoài code span)', (t) => {
    expect(allText(textOf(t, 'en')).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
  });

  it.each(tickets)('$id: thân đề, Task và đề bước không có backtick (problem-design §1.2)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task, ...x.steps.map((s) => s.prompt)].join('\n')).not.toContain('`');
    }
  });

  // FCL/LCL are everyday freight terms, so prompts may use them. Table names are plain English words ("customers"), so only SQL keywords, coded values and snake_case columns are caught.
  const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|BOOKED|IN_TRANSIT|ARRIVED|DELIVERED|CANCELLED|EXPORT|IMPORT|SEA|AIR)\b|\b[a-z]+_[a-z_]+\b/g;
  it.each(tickets)('$id: đề không có từ khóa SQL, mã trạng thái hay tên cột snake_case (problem-design §1)', (t) => {
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      expect([x.body, x.task ?? '', ...x.steps.map((s) => s.prompt)].join('\n').match(SQLISH)).toBeNull();
    }
  });
});

describe('Solution', () => {
  it.each(steps)('$name: không dùng ngày hệ thống', ({ sql }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
  });

  it.each(steps.filter((s) => s.ordered))('$name: ticket ordered phải có ORDER BY', ({ sql }) => {
    expect(sql).toMatch(/order\s+by/i);
  });

  it.each(steps)('$name: bảng dùng trong Solution phải khai trong tables', ({ sql, tables }) => {
    expect(tablesIn(sql).filter((x) => !tables.includes(x))).toEqual([]);
  });

  it.each(steps)('$name: Solution chạy được; columns là nhãn nghiệp vụ VI/EN, đủ số cột, không đọc hộ tên cột (L25)', async ({ sql, columns }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
    for (const label of columns ?? []) {
      expect(label.en).not.toMatch(VI_DIACRITIC);
      for (const text of [label.vi, label.en]) {
        expect(text).not.toMatch(/^[a-z0-9_]+$/);
        expect(r.columns).not.toContain(text);
      }
    }
  });

  it('ch1-05: bước 1 trả ≥ 4 dòng để LIMIT 3 ở bước 3 có nghĩa (L14)', async () => {
    const run = await runner();
    const boss = tickets.find((t) => t.id === 'ch1-05');
    expect((await run(boss!.steps[0].solution)).rows.length).toBeGreaterThanOrEqual(4);
  });
});

/** curriculum §5: learning-method fields, required from chapter 4 (ch1–3 stay as they are). */
describe('phương pháp học (Plan 2, từ chương 4)', () => {
  const templates = loadTicketTemplates().filter((t) => t.chapter >= 4);
  const normal = templates.filter((t) => t.beat !== 'boss');
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  /** Every variant of every `wrong:` SQL, so a variant cannot make a wrong answer accidentally right. */
  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({ name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered }))));

  it.each(chapters)('chương %i: teach là ví dụ mẫu (worked), có đúng một bài làm cùng (faded)', (c) => {
    const inChapter = templates.filter((t) => t.chapter === c);
    expect(inChapter.find((t) => t.beat === 'teach')?.format).toBe('worked');
    expect(inChapter.filter((t) => t.format === 'faded')).toHaveLength(1);
  });

  it.each(normal)('$id: có câu ngẫm lại (reflect), EN không dấu', (t) => {
    expect(t.reflect).toBeDefined();
    const r = t.reflect!;
    expect([r.q, r.why, ...r.options].map((b) => b.en).join('\n')).not.toMatch(VI_DIACRITIC);
    for (const w of t.wrong ?? []) expect(w.why.en).not.toMatch(VI_DIACRITIC);
  });

  it.each(templates.filter((t) => t.example))('$id: SQL ví dụ mẫu chạy được, có dữ liệu, khác Solution', async (t) => {
    const run = await runner();
    const r = await run(t.example!.sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.example!.sql).not.toBe(t.steps[0].solution);
  });

  it.each(wrongs)('$name: câu sai chạy được và cho kết quả khác Solution', async ({ sql, solution, ordered }) => {
    const run = await runner();
    expect(compareResults(await run(solution), await run(sql), ordered).ok).toBe(false);
  });

  // L37: the review queue needs other figures to practise with, not the same task again.
  it('mỗi kỹ năng mới có một ticket thường với ≥ 3 biến thể (biến thể 0 + 2)', () => {
    const missing = SKILLS.filter((s) => chapters.includes(s.chapter))
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3))
      .map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('KPI (content/kpis.yml)', () => {
  const live = KPIS.filter((k) => tickets.some((t) => t.id === k.ticket));
  it.each(live)('$id: Solution của việc nguồn ra đúng dạng ô', async (k) => {
    const t = tickets.find((x) => x.id === k.ticket)!;
    expect(k.step).toBeLessThan(t.steps.length);
    const r = await (await runner())(t.steps[k.step].solution);
    if (k.kind === 'number') {
      expect(r.rows).toHaveLength(1);
      expect(Number.isFinite(Number(r.rows[0][k.col]))).toBe(true);
    }
    if (k.kind === 'rowcount') expect(r.rows.length).toBeGreaterThan(0);
    if (k.kind === 'bar') {
      expect(r.columns.length).toBeGreaterThanOrEqual(2);
      expect(r.rows.every((row) => Number.isFinite(Number(row[row.length - 1])))).toBe(true);
    }
  });
});
