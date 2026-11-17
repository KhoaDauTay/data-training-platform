// Plan 9: every rule of tests/content.test.ts and tests/variants.test.ts, applied to the e-commerce domain
// (content/domains/ecom/, schema ecom). Rules that differ from Logistics: every chapter's teach ticket is worked,
// every skill but select has a normal ticket with ≥ 3 variants, prompts may not name window/CTE keywords either.
import { describe, expect, it } from 'vitest';
import ecomSchemaSql from '../src/db/ecom/schema.sql?raw';
import { loadDomain, loadTicketTemplates } from '../src/content';
import { cellKey, compareResults } from '../src/grader';
import { kpisOf } from '../src/home';
import { peopleOf, personOf } from '../src/people';
import { chaptersOf, chapterTablesOf, contentProblems, domainSkills } from '../src/progress';
import { textOf, type TicketText } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { ecomRunner } from './helpers';

await loadDomain('ecommerce');
const templates = loadTicketTemplates('ecommerce');
const tickets = templates.map((t) => applyVariant(t, 0));
const chapters = chaptersOf('ecommerce');
const tables = chapterTablesOf('ecommerce');
const skills = domainSkills(tickets);
const unlocked = (ch: number): string[] => Object.entries(tables).filter(([c]) => Number(c) <= ch).flatMap(([, t]) => t);
const ALL_TABLES = Object.values(tables).flat();
const normal = templates.filter((t) => t.beat !== 'boss');
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({
  name: `${t.id}#${i}`, ordered: t.ordered, tables: t.tables, sql: s.solution, columns: s.columns, chapter: t.chapter,
})));

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText): string => [
  x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []), x.example ?? '',
].join('\n');
// ponytail: regex over FROM/JOIN, as in tests/content.test.ts (CTE names are not table names, so they are filtered out).
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))].filter((x) => ALL_TABLES.includes(x));
const SQLISH = /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|HAVING|LIMIT|COUNT|SUM|AVG|DISTINCT|OVER|PARTITION|CASE|WITH)\b|\b[a-z]+_[a-z_]+\b/g;

describe('E-com: cấu trúc', () => {
  it('30 ticket, 6 chương, id ecom-chN-0M', () => {
    expect(templates).toHaveLength(30);
    expect(chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(templates.filter((t) => !/^ecom-ch\d+-\d\d$/.test(t.id)).map((t) => t.id)).toEqual([]);
  });

  it('soft-lock, nhịp chương, kỹ năng, bảng theo chương (contentProblems)', () => {
    expect(contentProblems(tickets, skills, chapters, tables)).toEqual([]);
  });

  it('bảng của mọi chương có thật trong src/db/ecom/schema.sql', () => {
    const real = new Set([...ecomSchemaSql.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]));
    expect(ALL_TABLES.filter((x) => !real.has(x))).toEqual([]);
    expect([...real].sort()).toEqual([...ALL_TABLES].sort());
  });

  it('người gửi có trong content/domains/ecom/people.yml, đúng phòng, không trùng tên Logistics', () => {
    expect(tickets.filter((t) => personOf(t.from.name)?.dept !== t.from.dept).map((t) => t.id)).toEqual([]);
    const names = peopleOf('ecommerce').map((p) => p.name);
    expect(peopleOf('logistics').filter((p) => names.includes(p.name))).toEqual([]);
    const real = new Set([...ecomSchemaSql.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]));
    for (const p of peopleOf('ecommerce')) for (const tb of p.tables) expect(real.has(tb), `${p.name}: ${tb}`).toBe(true);
  });
});

describe('E-com: song ngữ và đề bài', () => {
  it.each(tickets)('$id', (t) => {
    expect(t.en).toBeDefined();
    expect(codeSpans(allText(textOf(t, 'en')))).toEqual(codeSpans(allText(textOf(t, 'vi'))));
    expect(allText(textOf(t, 'en')).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
    for (const lang of ['vi', 'en'] as const) {
      const x = textOf(t, lang);
      const prompts = [x.body, x.task, ...x.steps.map((s) => s.prompt)].join('\n');
      expect(prompts).not.toContain('`');
      expect(prompts.match(SQLISH)).toBeNull();
    }
  });
});

describe('E-com: Solution', () => {
  it.each(steps)('$name', async ({ sql, ordered, tables: declared, columns, chapter }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
    if (ordered) expect(sql).toMatch(/order\s+by/i);
    expect(tablesIn(sql).filter((x) => !declared.includes(x))).toEqual([]);
    expect(tablesIn(sql).filter((x) => !unlocked(chapter).includes(x))).toEqual([]);
    const r = await (await ecomRunner())(sql);
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
});

describe('E-com: phương pháp học', () => {
  it.each([1, 2, 3, 4, 5, 6])('chương %i: teach là worked, đúng một faded là develop đầu', (c) => {
    const inC = templates.filter((t) => t.chapter === c);
    expect(inC.find((t) => t.beat === 'teach')?.format).toBe('worked');
    expect(inC.filter((t) => t.format === 'faded').map((t) => t.id)).toEqual([inC.find((t) => t.beat === 'develop')?.id]);
  });

  it.each(normal)('$id: reflect + wrong, EN không dấu', (t) => {
    expect(t.reflect).toBeDefined();
    expect([t.reflect!.q, t.reflect!.why, ...t.reflect!.options].map((b) => b.en).join('\n')).not.toMatch(VI_DIACRITIC);
    expect(t.wrong?.length ?? 0).toBeGreaterThan(0);
    for (const w of t.wrong ?? []) expect(w.why.en).not.toMatch(VI_DIACRITIC);
  });

  it.each(templates.filter((t) => t.example))('$id: ví dụ mẫu chạy, có dòng, khác Solution, chỉ dùng bảng đã mở', async (t) => {
    const r = await (await ecomRunner())(t.example!.sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(t.example!.sql).not.toBe(t.steps[0].solution);
    expect(tablesIn(t.example!.sql).filter((x) => !unlocked(t.chapter).includes(x))).toEqual([]);
  });

  const wrongs = normal.flatMap((t) => Array.from({ length: Math.max(1, variantsOf(t).length) }, (_, v) => applyVariant(t, v))
    .flatMap((tv, v) => (tv.wrong ?? []).map((w, i) => ({
      name: `${t.id}#${v} wrong[${i}]`, sql: w.sql, solution: tv.steps[0].solution, ordered: t.ordered, chapter: t.chapter,
    }))));
  it.each(wrongs)('$name: chạy, có dòng, khác Solution', async ({ sql, solution, ordered, chapter }) => {
    const run = await ecomRunner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(compareResults(await run(solution), r, ordered).ok).toBe(false);
    expect(tablesIn(sql).filter((x) => !unlocked(chapter).includes(x))).toEqual([]);
  });

  it('mọi kỹ năng E-com dạy (trừ select) có ticket thường ≥ 3 biến thể', () => {
    const missing = skills.filter((s) => s.id !== 'select')
      .filter((s) => !normal.some((t) => [...t.requires, ...t.grants].includes(s.id) && variantsOf(t).length >= 3)).map((s) => s.id);
    expect(missing).toEqual([]);
  });
});

describe('E-com: biến thể', () => {
  const SKIP_KEYS = new Set(['id', 'from', 'variants', 'tables', 'requires', 'grants', 'beat', 'scene']);
  const texts = (v: unknown, key = ''): string[] => {
    if (SKIP_KEYS.has(key)) return [];
    if (typeof v === 'string') return [v];
    if (Array.isArray(v)) return v.flatMap((x) => texts(x));
    if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => texts(x, k));
    return [];
  };

  it('không sót giá trị cứng của biến thể 0', () => {
    const problems: string[] = [];
    for (const t of templates) {
      const vs = variantsOf(t);
      vs.slice(1).forEach((v, j) => {
        const all = texts(applyVariant(t, j + 1)).join('\n');
        for (const [k, x] of Object.entries(vs[0])) {
          if (v[k] !== x && !Object.values(v).includes(x) && all.includes(String(x))) problems.push(`${t.id}#${j + 1}: "${x}" (${k})`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it.each(templates.filter((x) => variantsOf(x).length > 0))('$id: mọi biến thể chạy, có dòng, khác nhau từng đôi', async (t) => {
    const run = await ecomRunner();
    const seen: string[] = [];
    for (let i = 0; i < variantsOf(t).length; i++) {
      const r = await run(applyVariant(t, i).steps[0].solution);
      expect(r.rows.length, `#${i}`).toBeGreaterThan(0);
      seen.push(r.rows.map((row) => row.map(cellKey).join('|')).join('\n'));
    }
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('E-com: KPI (content/domains/ecom/kpis.yml)', () => {
  it.each(kpisOf('ecommerce'))('$id: Solution của việc nguồn ra đúng dạng ô', async (k) => {
    const t = tickets.find((x) => x.id === k.ticket)!;
    expect(t, k.ticket).toBeDefined();
    const r = await (await ecomRunner())(t.steps[k.step].solution);
    if (k.kind === 'number') {
      expect(r.rows).toHaveLength(1);
      expect(Number.isFinite(Number(r.rows[0][k.col]))).toBe(true);
    }
    if (k.kind === 'rowcount') expect(r.rows.length).toBeGreaterThan(0);
    if (k.kind === 'bar') expect(r.rows.every((row) => Number.isFinite(Number(row[row.length - 1])))).toBe(true);
  });
});
