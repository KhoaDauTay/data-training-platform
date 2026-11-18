import { describe, expect, it } from 'vitest';
import { loadTicketTemplates, loadTickets } from '../src/content';
import { cellKey } from '../src/grader';
import { applyVariant, renderTemplate, templateVars, variantsOf } from '../src/variants';
import { runner } from './helpers';

/** Strings a player reads or the grader runs; excludes ids and metadata. */
const SKIP_KEYS = new Set(['id', 'from', 'variants', 'tables', 'requires', 'grants', 'beat', 'scene']);
function texts(v: unknown, key = ''): string[] {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap((x) => texts(x));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => texts(x, k));
  return [];
}

describe('renderTemplate / applyVariant', () => {
  it('thay biến có giá trị, giữ nguyên biến không có giá trị', () => {
    expect(renderTemplate("a = '{{x}}' AND b = {{y}}", { x: '1' })).toBe("a = '1' AND b = {{y}}");
  });

  it('thay mọi chuỗi lồng nhau và không đổi ticket gốc', () => {
    const base = loadTickets()[0];
    const tpl = {
      ...base,
      title: 'T {{m}}',
      hints: ['h {{m}}', 'b', 'c'],
      steps: [{ ...base.steps[0], solution: "SELECT '{{m}}'", columns: [{ vi: 'Cột {{m}}', en: 'Col {{m}}' }] }],
      variants: [{ m: 'A' }, { m: 'B' }],
    };
    const v1 = applyVariant(tpl, 1);
    expect(v1.title).toBe('T B');
    expect(v1.hints[0]).toBe('h B');
    expect(v1.steps[0].solution).toBe("SELECT 'B'");
    expect(v1.steps[0].columns?.[0]).toEqual({ vi: 'Cột B', en: 'Col B' });
    expect(tpl.title).toBe('T {{m}}');
    expect(templateVars(tpl)).toEqual(['m']);
  });

  it('ticket không có biến thể: applyVariant trả về chính nó', () => {
    const plain = loadTicketTemplates().find((t) => variantsOf(t).length === 0)!;
    expect(applyVariant(plain, 0)).toBe(plain);
  });

  it('Làm việc (loadTickets) không còn {{…}}', () => {
    for (const t of loadTickets()) expect(texts(t).join('\n'), t.id).not.toMatch(/\{\{\w+\}\}/);
  });
});

describe('biến thể trong nội dung', () => {
  const templates = loadTicketTemplates();

  it('ch1–3 có ít nhất 2 ticket có biến thể (D2)', () => {
    expect(templates.filter((t) => variantsOf(t).length >= 2).length).toBeGreaterThanOrEqual(2);
  });

  // Format rules (2–4 sets, safe values, exact keys, no promotion review) are enforced by parseTicket.
  it('không sót giá trị cứng của biến thể 0 ở chỗ lẽ ra phải là {{x}}', () => {
    const problems: string[] = [];
    for (const t of templates) {
      const vs = variantsOf(t);
      if (vs.length === 0) continue;
      const first = vs[0];
      vs.slice(1).forEach((v, j) => {
        const all = texts(applyVariant(t, j + 1)).join('\n');
        for (const [k, x] of Object.entries(first)) {
          // A value this variant also uses under another key (ch6-04: next year = the following variant's year) is expected.
          if (v[k] !== x && !Object.values(v).includes(x) && all.includes(String(x))) problems.push(`${t.id}#${j + 1}: còn sót "${x}" của biến thể 0 — đổi chỗ đó thành {{${k}}}`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it('mọi biến thể: Solution chạy được, có dữ liệu, kết quả khác nhau từng đôi', async () => {
    const run = await runner();
    for (const t of templates.filter((x) => variantsOf(x).length > 0)) {
      const seen: string[] = [];
      for (let i = 0; i < variantsOf(t).length; i++) {
        const sql = applyVariant(t, i).steps[0].solution;
        expect(sql, `${t.id}#${i}`).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
        const r = await run(sql);
        expect(r.rows.length, `${t.id}#${i}`).toBeGreaterThan(0);
        seen.push(r.rows.map((row) => row.map((c) => cellKey(c)).join('|')).join('\n'));
      }
      expect(new Set(seen).size, `${t.id}: các biến thể cho kết quả trùng nhau`).toBe(seen.length);
    }
  });
});

describe('applyVariant không đụng id/metadata', () => {
  it('chỉ thay chữ người chơi đọc và SQL', () => {
    const base = loadTickets()[0];
    const tpl = { ...base, id: 'ch1-{{m}}', title: 'T {{m}}', from: { name: '{{m}}', dept: 'D' }, variants: [{ m: 'A' }, { m: 'B' }] };
    const v = applyVariant(tpl, 1);
    expect(v.title).toBe('T B');
    expect(v.id).toBe('ch1-{{m}}');
    expect(v.from.name).toBe('{{m}}');
  });
});
