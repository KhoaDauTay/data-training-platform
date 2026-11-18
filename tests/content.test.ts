import { describe, expect, it } from 'vitest';
import template from '../content/TEMPLATE.md?raw';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { cellKey, compareResults } from '../src/grader';
import { KPIS } from '../src/home';
import { CHAPTER_TABLES, contentProblems, SKILLS, tablesUnlocked } from '../src/progress';
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

/**
 * curriculum §5, extended to every chapter by product-design-v4 §E.1 (L54): reflect on every normal ticket and one faded
 * ticket (the first develop) per chapter. Only from chapter 4 is the teach ticket a worked example: in chapters 1–3 the
 * skill's quick lesson (content/lessons.yml) is the paired example instead (D-C4).
 */
describe('phương pháp học (mọi chương)', () => {
  const templates = loadTicketTemplates();
  const normal = templates.filter((t) => t.beat !== 'boss');
  const chapters = [...new Set(templates.map((t) => t.chapter))];
  /** Every variant of every `wrong:` SQL, so a variant cannot make a wrong answer accidentally right. */
  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({ name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered }))));

  it.each(chapters.filter((c) => c >= 4))('chương %i: teach là ví dụ mẫu (worked)', (c) => {
    expect(templates.find((t) => t.chapter === c && t.beat === 'teach')?.format).toBe('worked');
  });

  it.each(chapters)('chương %i: đúng một bài làm cùng (faded), là việc develop đầu tiên', (c) => {
    const inChapter = templates.filter((t) => t.chapter === c);
    expect(inChapter.filter((t) => t.format === 'faded').map((t) => t.id)).toEqual([inChapter.find((t) => t.beat === 'develop')?.id]);
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

  // An empty result is never matched against `wrong:` (src/ui/work.ts wrongTipper), so an empty `wrong:` could never fire.
  it.each(wrongs)('$name: câu sai chạy được, có dòng, và cho kết quả khác Solution', async ({ sql, solution, ordered }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(compareResults(await run(solution), r, ordered).ok).toBe(false);
  });

  it.each(templates)('$id: bảng trong SQL `wrong:` và ví dụ mẫu đã mở ở chương này', (t) => {
    const unlocked = tablesUnlocked(t.chapter);
    for (const sql of [...(t.wrong ?? []).map((w) => w.sql), t.example?.sql ?? '']) {
      expect(tablesIn(sql).filter((x) => !unlocked.includes(x))).toEqual([]);
    }
  });

  // L37: the review queue needs other figures to practise with, not the same task again (from chapter 4, Plan 2).
  it('mỗi kỹ năng mới từ chương 4 có một ticket thường với ≥ 3 biến thể (biến thể 0 + 2)', () => {
    const missing = SKILLS.filter((s) => s.chapter >= 4 && chapters.includes(s.chapter))
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3))
      .map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('precision (L4)', () => {
  it('L4: bước có precision trả mọi số đã ở đúng số chữ số thập phân, ở mọi biến thể', async () => {
    const run = await runner();
    const steps = loadTicketTemplates().flatMap((tpl) => Array.from({ length: Math.max(1, variantsOf(tpl).length) }, (_, v) => applyVariant(tpl, v)))
      .flatMap((tk) => tk.steps.filter((s) => s.precision !== undefined).map((s) => [tk.id, s] as const));
    expect([...new Set(steps.map(([id]) => id))].sort()).toEqual(['ch12-06', 'ch8-06']);
    for (const [id, s] of steps) {
      const r = await run(s.solution);
      for (const row of r.rows) for (const c of row) expect(cellKey(c, s.precision).endsWith('~'), `${id}: ${String(c)}`).toBe(false);
    }
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
