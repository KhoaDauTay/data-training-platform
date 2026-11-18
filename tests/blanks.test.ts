import { describe, expect, it } from 'vitest';
import { loadDomain, loadGeneral, loadLanes, loadLessons, loadTicketTemplates } from '../src/content';
import { runSandboxed, sqlErrorInfo } from '../src/db/run';
import { ensureSchema } from '../src/db/lab';
import { blanksIn } from '../src/tickets';
import { explainError } from '../src/ui/sqlErrors';
import { mascotOf } from '../src/ui/feedback';
import { applyVariant, variantsOf } from '../src/variants';
import { seededDb } from './helpers';

// v13 (product-design-v8 §3.8, D-H7): Submit refuses a standalone ___ in every exercise, not only faded ones.
describe('blanksIn', () => {
  it('đếm ___ đứng riêng, ngoài chuỗi và comment', () => {
    expect(blanksIn('SELECT ___ FROM t', false)).toBe(1);
    expect(blanksIn('SELECT c.___, ___(*) FROM t WHERE ___ = ___', false)).toBe(4);
    expect(blanksIn("SELECT name FROM t WHERE code LIKE '___'", false)).toBe(0);
    expect(blanksIn('SELECT "___" FROM t', false)).toBe(0);
    expect(blanksIn('SELECT a -- ___\nFROM t /* ___ */', false)).toBe(0);
    expect(blanksIn("SELECT 'it''s ___' , ___ FROM t", false)).toBe(1);
    expect(blanksIn('SELECT a___b, ____, x_y FROM t', false)).toBe(0);
    expect(blanksIn('SELECT name FROM t', false)).toBe(0);
  });

  it('bài faded đếm mọi ___, kể cả trong nháy', () => {
    expect(blanksIn("SELECT a FROM r WHERE r.cargo_desc ___ '___'", true)).toBe(2);
    expect(blanksIn("SELECT a FROM r WHERE r.cargo_desc ___ '___'", false)).toBe(1);
  });
});

describe('nội dung: không có ___ đứng riêng ngoài starter faded', () => {
  it('ticket, làn, drill, bài học', async () => {
    await loadDomain('ecommerce');
    const general = await loadGeneral();
    const bad: string[] = [];
    const check = (name: string, sql: string | undefined) => { if (sql && blanksIn(sql, false)) bad.push(name); };
    const tickets = [...loadTicketTemplates('logistics'), ...loadTicketTemplates('ecommerce'), ...loadLanes().tasks];
    for (const tpl of tickets) {
      for (let v = 0; v < Math.max(1, variantsOf(tpl).length); v++) {
        const t = applyVariant(tpl, v);
        t.steps.forEach((s, i) => check(`${t.id}#${v} solution ${i}`, s.solution));
        (t.wrong ?? []).forEach((w, i) => check(`${t.id}#${v} wrong ${i}`, w.sql));
        if (t.format !== 'faded') check(`${t.id}#${v} starter`, t.starter);
      }
    }
    for (const d of [...general.drills, ...general.nodes.flatMap((n) => n.drills)]) {
      check(`${d.id} solution`, d.solution);
      d.wrong.forEach((w, i) => check(`${d.id} wrong ${i}`, w.sql));
      if (d.kind !== 'faded') check(`${d.id} starter`, d.starter);
    }
    const lessons = [...loadLessons().values(), ...general.nodes.flatMap((n) => (n.lesson ? [n.lesson] : []))];
    for (const l of lessons) {
      check(`lesson ${l.id} example`, l.example);
      check(`lesson ${l.id} mistake`, l.mistake.sql);
      check(`lesson ${l.id} try`, l.try.solution);
      check(`lesson ${l.id} starter`, l.try.starter);
    }
    expect(bad).toEqual([]);
  });
});

describe('lỗi khi chạy câu còn ___', () => {
  it.each(['SELECT ___ FROM products', 'SELECT ___(*) FROM orders'])('%s trên lab → lời Boon về chỗ trống', async (sql) => {
    const db = await seededDb();
    await ensureSchema(db, 'lab');
    const e = await runSandboxed(db, sql, undefined, { schema: 'lab' }).then(() => undefined, (x: unknown) => x);
    const info = sqlErrorInfo(e);
    expect(info).toBeDefined();
    expect(explainError(info!, sql)).toBe('sqlerr.blank');
    expect(explainError(info!)).not.toBe('sqlerr.blank');
    expect(mascotOf(e, sql)).toEqual(['boon', 'think']);
  });
});
