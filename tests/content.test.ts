import { describe, expect, it } from 'vitest';
import template from '../content/TEMPLATE.md?raw';
import { loadTickets } from '../src/content';
import { CHAPTER_TABLES, contentProblems } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
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
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []),
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

  it.each(steps)('$name: Solution chạy được, có dữ liệu, số nhãn columns bằng số cột', async ({ sql, columns }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
  });

  it('ch1-05: bước 1 trả ≥ 4 dòng để LIMIT 3 ở bước 3 có nghĩa (L14)', async () => {
    const run = await runner();
    const boss = tickets.find((t) => t.id === 'ch1-05');
    expect((await run(boss!.steps[0].solution)).rows.length).toBeGreaterThanOrEqual(4);
  });
});
