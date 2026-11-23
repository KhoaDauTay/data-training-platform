import { describe, expect, it } from 'vitest';
import { loadDomain, loadGeneral, loadLanes, loadLessons, loadTicketTemplates } from '../src/content';
import type { QueryResult } from '../src/db/run';
import { frameOf, frameParts, tokenize, topClauses } from '../src/frame';
import { grade } from '../src/grader';
import { blanksIn } from '../src/tickets';
import { applyVariant, variantsOf } from '../src/variants';
import { labRun } from './generalRules';
import { ecomRunner, finRunner, runner } from './helpers';

// v13 (product-design-v8 §3.3, §3.9): the scaffold Boon fills into the editor, generated from the Solution.
const lines = (...xs: string[]) => xs.join('\n');

describe('frameOf: ví dụ §3.4', () => {
  it('(1) ch1-02: tên cột và giá trị thành ___, bảng giữ; > 60 ký tự thì mỗi mệnh đề một dòng', () => {
    expect(frameOf("SELECT code, name, country FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'")).toBe(lines(
      'SELECT ___, ___, ___',
      'FROM ports',
      'WHERE ___ = ___ AND ___ = ___'));
  });

  it('(2) ch7-02: truy vấn con thụt theo độ sâu, AND mở truy vấn con xuống dòng', () => {
    const sql = loadTicketTemplates('logistics').find((t) => t.id === 'ch7-02')!;
    expect(frameOf(applyVariant(sql, 0).steps[0].solution)).toBe(lines(
      'SELECT c.___, count(*)',
      'FROM quotations q',
      'JOIN customers c ON c.___ = q.___',
      'WHERE q.___ >= ___ AND q.___ < ___',
      '  AND q.___ IN (',
      '    SELECT ___',
      '    FROM shipments',
      '    WHERE ___ >= ___ AND ___ < ___',
      '    GROUP BY ___',
      '    HAVING count(*) > ___',
      '  )',
      'GROUP BY ___, ___',
      'ORDER BY ___, ___'));
  });

  it('(3) g-where-3: bài bẫy gộp mệnh đề khác câu sai thành một ___ (khung bẫy ≤ 60 ký tự: một dòng, L95)', () => {
    const sol = "SELECT id, store_id FROM orders WHERE channel = 'ONLINE' AND (store_id = 1 OR store_id = 2)";
    expect(frameOf(sol)).toBe(lines('SELECT ___, ___', 'FROM orders', 'WHERE ___ = ___ AND (___ = ___ OR ___ = ___)'));
    expect(frameOf(sol, ["SELECT id, store_id FROM orders WHERE channel = 'ONLINE' AND store_id = 1 OR store_id = 2"]))
      .toBe('SELECT ___, ___ FROM orders WHERE ___');
  });

  it('(4) g-a3-4: CTE, hàm bảng, FILTER; từ khóa giữ cách viết của Solution (interval)', () => {
    const d = generalDrills().find((x) => x.id === 'g-a3-4')!;
    expect(frameOf(d.solution)).toBe(lines(
      'WITH spine AS (',
      '  SELECT s.___ AS ___, g.___',
      '  FROM stores s',
      '  CROSS JOIN generate_series(DATE ___, DATE ___, interval ___) AS g (___)',
      '), per_day AS (',
      '  SELECT sp.___, sp.___, count(o.___) AS ___',
      '  FROM spine sp',
      '  LEFT JOIN orders o ON o.___ = sp.___ AND o.___ = sp.___ AND o.___ = ___',
      '  GROUP BY ___, ___',
      ')',
      'SELECT ___, count(*) FILTER (WHERE ___ = ___)',
      'FROM per_day',
      'GROUP BY ___',
      'ORDER BY ___'));
  });

  it('(5) Thử ngay where: câu ngắn một dòng', () => {
    expect(frameOf(loadLessons().get('where')!.try.solution)).toBe('SELECT ___, ___ FROM staff WHERE ___ = ___ AND ___ = ___');
  });
});

describe('frameOf: Finance (v9 §3.4 (d))', () => {
  it('ROLLUP/CUBE/GROUPING SETS giữ, mỗi phần tử bên trong một ___; ORDER BY giữ NULLS LAST/FIRST', () => {
    expect(frameOf("SELECT b.region, b.name, sum(g.amount) FROM gl_entries g JOIN branches b ON b.id = g.branch_id WHERE g.posted_on >= '2026-07-01' GROUP BY ROLLUP (b.region, b.name) ORDER BY b.region NULLS LAST, b.name DESC NULLS FIRST"))
      .toBe(lines(
        'SELECT b.___, b.___, sum(g.___)',
        'FROM gl_entries g',
        'JOIN branches b ON b.___ = g.___',
        'WHERE g.___ >= ___',
        'GROUP BY ROLLUP (___, ___)',
        'ORDER BY ___ NULLS LAST, ___ NULLS FIRST'));
    expect(frameOf('SELECT 1 FROM t GROUP BY CUBE (a, b), c')).toBe('SELECT ___ FROM t GROUP BY CUBE (___, ___), ___');
    expect(frameOf('SELECT 1 FROM t GROUP BY GROUPING SETS ((a, b), (a), ())')).toBe(lines('SELECT ___', 'FROM t', 'GROUP BY GROUPING SETS ((___, ___), (___), ())'));
    expect(frameOf('SELECT sum(v) OVER (ORDER BY d NULLS LAST) FROM t')).toBe('SELECT sum(___) OVER (ORDER BY ___ NULLS LAST) FROM t');
  });

  it('bài bẫy: kiểu ghép khác câu sai thì "FULL JOIN" là một ___ (bảng vẫn hiện)', () => {
    expect(frameOf('SELECT a.k FROM a FULL JOIN b ON b.k = a.k', ['SELECT a.k FROM a LEFT JOIN b ON b.k = a.k']))
      .toBe('SELECT a.___ FROM a ___ b ON b.___ = a.___');
  });

  it('WHERE dài: mỗi AND một dòng (AND của BETWEEN giữ); CASE dài: mỗi WHEN/ELSE một dòng', () => {
    expect(frameOf("SELECT l.code FROM loans l WHERE l.branch_id = 7 AND l.disbursed_on BETWEEN '2026-03-01' AND '2026-05-31' AND l.status = 'active'"))
      .toBe(lines('SELECT l.___', 'FROM loans l', 'WHERE l.___ = ___', '  AND l.___ BETWEEN ___ AND ___', '  AND l.___ = ___'));
    expect(frameOf('SELECT loan_id, CASE WHEN dpd = 0 THEN 0 WHEN dpd <= 30 THEN 1 WHEN dpd <= 90 THEN 2 ELSE 3 END AS bucket FROM loan_snapshots'))
      .toBe(lines('SELECT ___, CASE', '  WHEN ___ = ___ THEN ___', '  WHEN ___ <= ___ THEN ___', '  WHEN ___ <= ___ THEN ___', '  ELSE ___', 'END AS ___', 'FROM loan_snapshots'));
  });
});

describe('frameOf: luật', () => {
  it('true/false, ép kiểu, CAST, EXTRACT … FROM, khung cửa sổ, bí danh trùng tên CTE', () => {
    expect(frameOf('SELECT a FROM t WHERE ok = true')).toBe('SELECT ___ FROM t WHERE ___ = ___');
    expect(frameOf("SELECT x::date, CAST(y AS numeric) FROM t")).toBe('SELECT ___::date, CAST(___ AS numeric) FROM t');
    expect(frameOf('SELECT extract(month FROM d) FROM t')).toBe('SELECT extract(___ FROM ___) FROM t');
    expect(frameOf('SELECT sum(v) OVER (PARTITION BY a ORDER BY b DESC ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) FROM t'))
      .toBe(lines('SELECT sum(___) OVER (PARTITION BY ___ ORDER BY ___ ROWS BETWEEN ___ PRECEDING AND CURRENT ROW)', 'FROM t'));
    expect(frameOf('WITH paid AS (SELECT o, sum(a) AS paid FROM p GROUP BY o) SELECT paid.paid FROM paid'))
      .toBe(lines('WITH paid AS (SELECT ___, sum(___) AS ___ FROM p GROUP BY ___)', 'SELECT paid.___', 'FROM paid'));
    expect(frameOf('WITH o AS (SELECT a - b AS over, c AS last FROM t) SELECT sum(over), o.last FROM o WHERE over > 0'))
      .toBe(lines('WITH o AS (SELECT ___ - ___ AS ___, ___ AS ___ FROM t)', 'SELECT sum(___), o.___', 'FROM o', 'WHERE ___ > ___'));
    expect(frameOf("SELECT name n FROM t WHERE code LIKE 'A%' -- note\nORDER BY 1")).toBe("SELECT ___ FROM t WHERE ___ LIKE ___ ORDER BY ___");
  });

  it('không bao giờ ném lỗi với câu hỏng', () => {
    const long = 'SELECT a, b, c, d, e, f, g, h FROM orders o JOIN items i ON (i.x = o.y AND (SELECT max(z) FROM w';
    for (const s of [long, '', 'SELECT (', "SELECT 'x", 'SELECT ) FROM', 'WITH a AS (SELECT 1', '"abc']) expect(() => frameOf(s, [s, 'FROM ('])).not.toThrow();
  });
});

// ---- sweep: every real Solution (all variants and steps), drill, challenge and "Thử ngay" ----

/** v26 R2: writes get no scaffold (brief.ts fillBox, lessonCard.ts): frameOf is shaped for a read. */
const WRITE = /^\s*(INSERT|UPDATE|DELETE|MERGE|CREATE)\b/i;
interface Case { id: string; sql: string; ordered: boolean; precision?: number; trap?: string[]; on: 'game' | 'ecom' | 'fin' | 'lab' }
function generalDrills() {
  return generalNowSync.drills; // skill drills + advanced nodes' drills
}
const generalNowSync = await loadGeneral();
await loadDomain('ecommerce');
await loadDomain('finance');

function cases(): Case[] {
  const out: Case[] = [];
  const story = (tpls: ReturnType<typeof loadTicketTemplates>, on: Case['on']) => {
    for (const tpl of tpls) {
      for (let v = 0; v < Math.max(1, variantsOf(tpl).length); v++) {
        const t = applyVariant(tpl, v);
        const trap = t.trap ? t.wrong?.map((w) => w.sql) : undefined; // the same selector as brief.ts fillBox
        t.steps.forEach((s, i) => out.push({ id: `${t.id}#${v}.${i}`, sql: s.solution, ordered: t.ordered, precision: s.precision, trap, on }));
      }
    }
  };
  story(loadTicketTemplates('logistics'), 'game');
  story(loadLanes().tasks, 'game');
  story(loadTicketTemplates('ecommerce'), 'ecom');
  story(loadTicketTemplates('finance'), 'fin');
  for (const d of generalDrills().filter((x) => !x.check)) out.push({ id: d.id, sql: d.solution, ordered: d.ordered, on: 'lab', trap: d.kind === 'trap' ? d.wrong.map((w) => w.sql) : undefined });
  const lessons = [...loadLessons().values(), ...generalNowSync.nodes.flatMap((n) => (n.lesson ? [n.lesson] : []))];
  for (const l of lessons.filter((x) => !WRITE.test(x.try.solution))) out.push({ id: `try:${l.id}`, sql: l.try.solution, ordered: l.try.ordered, on: 'lab' });
  return out;
}
const ALL = cases();

/** The only scaffolds with a single ___ (v8 §3.3 table): one-column drills/tries, and trap drills whose whole tested clause is hidden. */
const ONE_BLANK = ['g-distinct-1', 'try:distinct', 'g-select-3', 'g-aggregate-3', 'g-date-math-3', 'g-case-when-3', 'g-explain-read-3', 'g-a7-3'];

const refill = (frame: string, holes: string[]) => { let i = 0; return frame.replace(/(?<![\w$])___(?![\w$])/g, () => holes[i++]); };
const shape = (sql: string) => tokenize(sql).map((x) => (x.k === 'str' ? x.t : x.t.toLowerCase()));

describe('frameOf trên toàn bộ nội dung', () => {
  it(`${ALL.length} câu: ≠ Solution, ≥ 2 chỗ trống (trừ danh sách), Nộp bị chặn`, () => {
    expect(ALL.length).toBeGreaterThan(350);
    const one: string[] = [];
    for (const c of ALL) {
      const f = frameOf(c.sql, c.trap);
      expect(f, c.id).not.toBe(c.sql);
      const n = blanksIn(f, false);
      expect(n, c.id).toBeGreaterThan(0);
      if (n < 2) one.push(c.id);
    }
    expect(one.sort()).toEqual([...ONE_BLANK].sort());
  });

  it('không lộ: không còn chuỗi, số, true/false hay tên cột của schema', async () => {
    const run = await labRun();
    await ecomRunner();
    await finRunner();
    const names = async (sql: string) => new Set((await run(sql)).rows.map((r) => String(Object.values(r)[0]).toLowerCase()));
    const columns = await names("SELECT column_name FROM information_schema.columns WHERE table_schema IN ('logistics', 'ecom', 'finance', 'lab')");
    const tables = await names("SELECT table_name FROM information_schema.tables WHERE table_schema IN ('logistics', 'ecom', 'finance', 'lab')");
    expect(columns.size).toBeGreaterThan(100);
    const bad: string[] = [];
    for (const c of ALL) {
      const ts = tokenize(frameOf(c.sql, c.trap));
      ts.forEach((x, i) => {
        if (x.k === 'str' || x.k === 'num' || x.u === 'TRUE' || x.u === 'FALSE') bad.push(`${c.id}: ${x.t}`);
        const kept = x.k === 'id' && x.t !== '___' && ts[i + 1]?.t !== '(' && ts[i - 1]?.t !== '::';
        if (kept && columns.has(x.t.toLowerCase()) && !tables.has(x.t.toLowerCase()) && !isAlias(c.sql, x.t)) bad.push(`${c.id}: cột ${x.t}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('đi vòng: điền lại từng ___ ra đúng Solution, và câu đó qua grade() trên PGlite', async () => {
    const run: Record<Case['on'], (sql: string) => Promise<QueryResult>> = { game: await runner(), ecom: await ecomRunner(), fin: await finRunner(), lab: await labRun() };
    const bad: string[] = [];
    for (const c of ALL) {
      const { text, holes } = frameParts(c.sql, c.trap);
      expect(holes.length, c.id).toBe(blanksIn(text, false));
      const back = refill(text, holes);
      expect(shape(back), c.id).toEqual(shape(c.sql));
      const r = await grade(run[c.on], c.sql, back, c.ordered, c.precision);
      if (!r.ok) bad.push(c.id);
    }
    expect(bad).toEqual([]);
  });

  it('bài bẫy: mọi mệnh đề có ở cả Solution lẫn câu sai mà khác nhau nằm trọn trong một ___', () => {
    const traps = ALL.filter((c) => c.trap);
    expect(traps.length).toBeGreaterThanOrEqual(50);
    for (const c of traps) {
      const { holes } = frameParts(c.sql, c.trap);
      const ts = tokenize(c.sql);
      for (const w of c.trap!) {
        const theirs = new Map(topClauses(tokenize(w)).map((x) => [x.key, x.norm]));
        for (const k of topClauses(ts)) {
          if (!theirs.has(k.key) || theirs.get(k.key) === k.norm || k.a >= k.b) continue;
          const text = c.sql.slice(ts[k.a].s, ts[k.b - 1].e); // adjacent clauses merge into one ___ (`FROM ___ ON`)
          expect(holes.some((x) => x.includes(text)), `${c.id} ${k.key}: ${text}`).toBe(true);
        }
      }
    }
  });

  it('xuống dòng theo độ sâu: ≤ 60 ký tự thì một dòng; mỗi dòng cân ngoặc, thụt 2 mỗi mức', () => {
    for (const c of ALL) {
      const f = frameOf(c.sql, c.trap);
      if (!f.includes('\n')) { expect(f.length, c.id).toBeLessThanOrEqual(60); continue; }
      const stack: number[] = [];
      for (const line of f.split('\n')) {
        const indent = line.length - line.trimStart().length;
        let body = line.trim();
        if (body.startsWith(')')) { expect(indent, `${c.id}: ${line}`).toBe(stack.pop()); body = body.slice(1); }
        else expect(indent, `${c.id}: ${line}`).toBe((stack.length ? stack.at(-1)! + 2 : 0) + (/^(AND|OR|WHEN|ELSE)\b/i.test(body) ? 2 : 0));
        const opens = body.endsWith('(');
        if (opens) body = body.slice(0, -1);
        let depth = 0;
        for (const ch of body.replace(/'[^']*'/g, '')) { depth += ch === '(' ? 1 : ch === ')' ? -1 : 0; expect(depth, `${c.id}: ${line}`).toBeGreaterThanOrEqual(0); }
        expect(depth, `${c.id}: ${line}`).toBe(0);
        if (opens) stack.push(indent); // the body sits 2 deeper than the line that opens it, `)` back at that line's indent
      }
      expect(stack, c.id).toEqual([]);
    }
  });
});

/** A name the Solution itself declares as a table alias or CTE (`FROM orders o`, `m AS (`), even when a column shares it. */
function isAlias(sql: string, name: string): boolean {
  const n = name.replace(/[^\w]/g, '');
  return new RegExp(`(FROM|JOIN|,)\\s+\\w+(\\s+AS)?\\s+${n}\\b|\\b${n}\\s+AS\\s*\\(|\\)\\s*(AS\\s+)?${n}\\b`, 'i').test(sql);
}
