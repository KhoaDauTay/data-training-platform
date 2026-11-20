// BP-LINT (v24, L273–L276): src/viz/bpLint.ts on every Solution in the repo (0 tips outside EXEMPT, each rule exempt ≤ 5 %),
// the catalogue's pairs (§10.5) plus more positive/negative cases per rule, and the device pref parser of src/ui/bpTip.ts.
import { describe, expect, it } from 'vitest';
import { parse as yaml } from 'yaml';
import { parse } from 'libpg-query';
import { generalNow, loadDomain, loadLessons, loadTicketTemplates } from '../src/content';
import { DOMAINS } from '../src/domains';
import { parseEngineLesson } from '../src/engine/content';
import { applyVariant, variantsOf } from '../src/variants';
import { bpLint, EXEMPT, FACTS_SQL, keep, LINT_ON, RULES, type ColFact, type Rule } from '../src/viz/bpLint';
import { learnedCount, lintable, parseBpTips } from '../src/ui/bpTip';
import { ecomRunner, finRunner, runner } from './helpers';
import { labRun } from './generalRules';

const engineFiles = import.meta.glob<string>('../content/engine/postgres/L*/*.md', { query: '?raw', import: 'default', eager: true });

/** [exercise id, SQL]: every Solution of every domain (each variant, each step), drill, lesson answer and example, Engine lab step. */
async function allSolutions(): Promise<[string, string][]> {
  const out: [string, string][] = [];
  for (const { id: d } of DOMAINS) {
    await loadDomain(d);
    for (const tk of loadTicketTemplates(d)) {
      const n = Math.max(1, variantsOf(tk).length);
      for (let v = 0; v < n; v++) for (const s of applyVariant(tk, v).steps) out.push([tk.id, s.solution]);
    }
  }
  for (const dr of generalNow()!.drills) out.push([dr.id, dr.solution]);
  for (const [id, l] of loadLessons()) out.push([`lesson:${id}`, l.try.solution], [`lesson:${id}`, l.example]);
  for (const [p, src] of Object.entries(engineFiles)) {
    const l = parseEngineLesson(src, p, yaml);
    for (const s of l.lab?.steps ?? []) out.push([l.id, s.solution]);
  }
  return out;
}

const rules = async (sql: string, facts?: ColFact[]): Promise<Rule[]> =>
  bpLint(await parse(sql)).filter((h) => !facts || keep(h, facts)).map((h) => h.rule);

describe('bpLint trên mọi Solution', () => {
  it('không ném; vi phạm đo được = EXEMPT; mỗi luật miễn ≤ 5 %', { timeout: 120_000 }, async () => {
    const all = await allSolutions();
    expect(all.length).toBeGreaterThan(600);
    // The schema facts the browser reads (FACTS_SQL) from each real seeded schema; drills, lessons and Engine labs run on lab.
    const factsOf = async (run: Promise<(sql: string) => Promise<{ rows: unknown[][] }>>) => (await (await run)(FACTS_SQL)).rows as ColFact[];
    const facts = { game: await factsOf(runner()), ecom: await factsOf(ecomRunner()), fin: await factsOf(finRunner()), lab: await factsOf(labRun()) };
    // Not a vacuous filter: every schema has indexed columns, Logistics has timestamps (event_time).
    for (const f of Object.values(facts)) expect(f.some((x) => x[3])).toBe(true);
    expect(facts.game.some((x) => x[2])).toBe(true);
    const schemaOf = (id: string) => (id.startsWith('ecom-') ? facts.ecom : id.startsWith('fin-') ? facts.fin : /^(g-|lesson:|e-)/.test(id) ? facts.lab : facts.game);
    const found = new Set<string>();
    const unread: string[] = [];
    for (const [id, sql] of all) {
      let tree;
      try {
        tree = await parse(sql);
      } catch {
        unread.push(id); // only an Engine lab step may be outside what libpg-query 18 reads (it never runs in work.ts)
        continue;
      }
      for (const h of bpLint(tree)) if (LINT_ON.includes(h.rule) && keep(h, schemaOf(id))) found.add(`${id} ${h.rule}`);
    }
    expect(unread.filter((id) => !id.startsWith('e-'))).toEqual([]);
    expect([...found].sort()).toEqual(EXEMPT.map(([id, r]) => `${id} ${r}`).sort());
    const ids = new Set(all.map(([id]) => id)).size;
    for (const r of LINT_ON) expect(EXEMPT.filter((x) => x[1] === r).length).toBeLessThanOrEqual(ids * 0.05);
  });
});

/** ≥ 3 SQL that must fire and ≥ 3 that must not, per rule (first pair = catalogue §10.5, run on `lab`). */
const CASES: Record<Rule, [bad: string[], good: string[]]> = {
  q01: [
    ['SELECT count(*) FROM customers WHERE email = NULL', 'SELECT id FROM customers WHERE NULL <> email', 'SELECT id FROM orders o WHERE EXISTS (SELECT 1 FROM customers c WHERE c.email != NULL)'],
    ['SELECT count(*) FROM customers WHERE email IS NULL', 'SELECT id FROM customers WHERE email IS NOT NULL', "SELECT coalesce(email, '') = '' FROM customers"],
  ],
  q02: [
    ['SELECT count(*) FROM customers c WHERE c.id NOT IN (SELECT o.customer_id FROM orders o)', 'SELECT id FROM stores WHERE NOT id IN (SELECT store_id FROM orders)', 'WITH x AS (SELECT id FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)) SELECT count(*) FROM x'],
    ['SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)', "SELECT id FROM orders WHERE status NOT IN ('PAID', 'CANCELLED')", 'SELECT id FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL)'],
  ],
  q06: [
    ["SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.channel = 'ONLINE' GROUP BY c.id", "SELECT s.id FROM stores s LEFT JOIN orders o ON o.store_id = s.id LEFT JOIN customers c ON c.id = o.customer_id WHERE c.city = 'Hue'", "SELECT s.id FROM stores s LEFT JOIN orders ON orders.store_id = s.id WHERE orders.order_date >= DATE '2026-10-01'"],
    ["SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.channel = 'ONLINE' GROUP BY c.id", 'SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL', "SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Hue' AND (o.id IS NULL OR o.channel = 'ONLINE')"],
  ],
  q10: [
    ['SELECT id, order_date FROM orders LIMIT 5', 'SELECT * FROM (SELECT id FROM orders LIMIT 3) t ORDER BY id', 'SELECT name FROM stores LIMIT 1'],
    ['SELECT id, order_date FROM orders ORDER BY order_date DESC, id DESC LIMIT 5', 'SELECT id FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id LIMIT 1)', 'SELECT id FROM orders LIMIT 0'],
  ],
  q11: [
    ["SELECT count(*) FROM orders WHERE date_trunc('month', order_date) = DATE '2026-10-01'", "SELECT id FROM customers WHERE lower(email) = 'a@b.c'", "SELECT id FROM orders WHERE order_date::text LIKE '2026-10%'"],
    ["SELECT count(*) FROM orders WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'", "SELECT lower(email) FROM customers WHERE email = 'a@b.c'", "SELECT date_trunc('month', order_date), count(*) FROM orders GROUP BY 1"],
  ],
  q12: [
    ["SELECT count(*) FROM payments WHERE paid_at BETWEEN '2026-10-01' AND '2026-10-31'", "SELECT id FROM payments p WHERE p.paid_at BETWEEN TIMESTAMP '2026-10-01' AND TIMESTAMP '2026-10-31'", "SELECT id FROM payments WHERE paid_at BETWEEN SYMMETRIC '2026-10-31' AND '2026-10-01'"],
    ["SELECT count(*) FROM payments WHERE paid_at >= TIMESTAMP '2026-10-01' AND paid_at < TIMESTAMP '2026-11-01'", "SELECT id FROM orders WHERE order_date BETWEEN '2026-10-01' AND '2026-10-31'", 'SELECT id FROM payments WHERE amount BETWEEN 1 AND 9'],
  ],
  q13: [
    ["SELECT count(*) FILTER (WHERE channel = 'ONLINE') / count(*) AS online_share FROM orders", 'SELECT count(*) / count(DISTINCT customer_id) FROM orders', 'SELECT store_id, count(id) / count(*) FROM orders GROUP BY store_id'],
    ["SELECT count(*) FILTER (WHERE channel = 'ONLINE')::numeric / count(*) AS online_share FROM orders", 'SELECT 100.0 * count(*) / 7 FROM orders', 'SELECT sum(amount) / count(*) FROM payments'],
  ],
  q15: [
    ['SELECT store_id, count(*) FROM orders GROUP BY store_id HAVING store_id <> 4', "SELECT channel FROM orders GROUP BY channel HAVING channel = 'ONLINE'", 'SELECT store_id FROM orders GROUP BY store_id HAVING store_id > (SELECT min(id) FROM stores)'],
    ['SELECT store_id, count(*) FROM orders WHERE store_id <> 4 GROUP BY store_id', 'SELECT store_id FROM orders GROUP BY store_id HAVING bool_and(customer_id IS NOT NULL)', 'SELECT store_id FROM orders GROUP BY store_id HAVING count(*) > 5', 'SELECT store_id FROM orders GROUP BY ROLLUP (store_id) HAVING GROUPING(store_id) = 0'],
  ],
  q22: [
    ['SELECT store_id, count(*) FROM orders GROUP BY 1', 'SELECT id, order_date FROM orders ORDER BY 2 DESC', 'SELECT store_id, channel, count(*) FROM orders GROUP BY store_id, 2'],
    ['SELECT store_id, count(*) FROM orders GROUP BY store_id', 'SELECT id FROM orders ORDER BY order_date DESC, id', "SELECT 1 FROM orders GROUP BY channel"],
  ],
  a05: [
    ['SELECT count(*) FROM orders WHERE order_date >= CURRENT_DATE - 30', 'SELECT now()', 'SELECT id FROM payments WHERE paid_at < LOCALTIMESTAMP'],
    ["SELECT count(*) FROM orders WHERE order_date >= DATE '2026-10-31' - 30", "SELECT DATE '2026-10-31' - order_date FROM orders", "SELECT id FROM payments WHERE paid_at < TIMESTAMP '2026-10-31'"],
  ],
};

/** lab-like facts: orders.order_date leads an index, payments.paid_at is a timestamp, customers.email is indexed (Q11 fires). */
const FACTS: ColFact[] = [['orders', 'order_date', false, true], ['payments', 'paid_at', true, false], ['customers', 'email', false, true], ['orders', 'id', false, true]];

describe('bpLint: từng luật', () => {
  it('RULES có đủ 10 luật, Q22 tắt', () => {
    expect(RULES.length).toBe(10);
    expect(LINT_ON).not.toContain('q22');
    expect(LINT_ON.length).toBe(9);
  });
  it.each(RULES.map((r) => [r] as const))('%s: câu sai báo, câu đúng không', async (r) => {
    const [bad, good] = CASES[r];
    for (const q of bad) expect([q, (await rules(q, FACTS)).includes(r)]).toEqual([q, true]);
    for (const q of good) expect([q, (await rules(q, FACTS)).includes(r)]).toEqual([q, false]);
  });
  it('Q11/Q12 cần sự thật về cột: không index / không phải timestamp thì im', async () => {
    expect(await rules("SELECT count(*) FROM orders WHERE date_trunc('month', order_date) = DATE '2026-10-01'", [])).toEqual([]);
    expect(await rules("SELECT id FROM orders WHERE order_date BETWEEN '2026-10-01' AND '2026-10-31'", [['orders', 'order_date', false, true]])).toEqual([]);
    expect(await rules("SELECT o.id FROM orders o JOIN payments p ON p.order_id = o.id WHERE p.paid_at BETWEEN '2026-10-01' AND '2026-10-31'", FACTS)).toEqual(['q12']);
  });
  it('không ném trên DDL, nhiều câu, UNION, window', async () => {
    for (const q of ['CREATE INDEX ON orders (order_date)', 'SELECT 1; SELECT 2', 'SELECT 1 UNION SELECT 2 LIMIT 1', 'SELECT rank() OVER (ORDER BY id) FROM orders', "UPDATE customers SET email = NULL WHERE id = 1"]) {
      await expect(rules(q)).resolves.toBeDefined();
    }
  });
});

describe('parseBpTips (pref cargo-query/bp-tips)', () => {
  it('đọc dữ liệu đúng, bỏ dữ liệu hỏng', () => {
    expect(parseBpTips(null)).toEqual({ off: false, mute: [], seen: [], fixed: 0 });
    expect(parseBpTips('{bad')).toEqual({ off: false, mute: [], seen: [], fixed: 0 });
    expect(parseBpTips(JSON.stringify({ off: true, mute: ['q02', 'zz', 3], seen: ['q01@ch1-01', 7], fixed: 2 })))
      .toEqual({ off: true, mute: ['q02'], seen: ['q01@ch1-01'], fixed: 2 });
    expect(parseBpTips(JSON.stringify({ off: 'yes', fixed: -1 }))).toEqual({ off: false, mute: [], seen: [], fixed: 0 });
    const seen = Array.from({ length: 600 }, (_, i) => `q10@t${i}`);
    expect(parseBpTips(JSON.stringify({ seen })).seen).toEqual(seen.slice(-500));
  });
});

describe('bpTip: khi nào Boon được nhắc (§5.2/§5.3)', () => {
  const tk = (o: object) => ({ id: 'ch3-02', beat: 'develop', grants: ['join'], steps: [{ solution: 'SELECT 1' }], ...o }) as never;
  it('Sandbox có; việc đã đạt có; chưa đạt, Practice, promotion review, phỏng vấn, index lab thì không', () => {
    expect(lintable(undefined, 0, true, false)).toBe(true);
    expect(lintable(tk({}), 0, true, true)).toBe(true);
    expect(lintable(tk({}), 0, true, false)).toBe(false);
    expect(lintable(tk({}), 0, false, true)).toBe(false);
    expect(lintable(tk({ beat: 'boss' }), 0, true, true)).toBe(false);
    expect(lintable(tk({ id: 'g-iv-mid-1-q1' }), 0, true, true)).toBe(false);
    expect(lintable(tk({ steps: [{ solution: 'x', lab: { table: 't' } }] }), 0, true, true)).toBe(false);
  });
  it('người mới: đếm kỹ năng đã học như knownSkills', () => {
    const save = (completed: string[], review = {}) => ({ save: { completed, review } as never, tickets: [tk({}), tk({ id: 'ch1-01', grants: ['select', 'where'] })] });
    expect(learnedCount(save([]))).toBe(0);
    expect(learnedCount(save(['ch1-01', 'ch3-02']))).toBe(3);
    expect(learnedCount(save(['g-limit-1', 'g-limit-2', 'g-order_by-1'], { sum: {} }))).toBe(2);
  });
});
