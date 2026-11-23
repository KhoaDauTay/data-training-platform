/**
 * Chapter 11 grading on the execution plan (curriculum §6.3): node types and planner cost from
 * EXPLAIN (FORMAT JSON) without ANALYZE, never milliseconds (WASM timing is noisy, costs are deterministic).
 */

/** `plan:` of a step: the result must be right AND the plan must read `index` (a table) through an index. */
export interface PlanSpec { index: string }
/**
 * `lab:` of a step (index lab): the player's editor holds one CREATE INDEX; the step's Solution is the slow query.
 * Passes when, after the player's index, `table` is read through an index and the root cost is ≤ max_cost_ratio × before.
 * `ddl` is the reference answer (Recap, content tests).
 */
export interface LabSpec { table: string; ddl: string; max_cost_ratio: number }

interface RawNode { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; 'Total Cost'?: number; 'Plan Rows'?: number; Filter?: string; Plans?: RawNode[] }

/** Seq Scan: reads the whole table. Index / Index Only / Bitmap Heap Scan: reads it through an index. */
const INDEX_READS = new Set(['Index Scan', 'Index Only Scan', 'Bitmap Heap Scan']);

/** EXPLAIN (FORMAT JSON) output (the cell PGlite returns) → every node, root first. */
export function planNodes(json: unknown): RawNode[] {
  if (typeof json === 'string') json = JSON.parse(json); // the Engine lab runtime may return the cell as text
  const root = (Array.isArray(json) ? json[0] : undefined) as { Plan?: RawNode } | undefined;
  const out: RawNode[] = [];
  const walk = (n: RawNode) => {
    out.push(n);
    for (const c of n.Plans ?? []) walk(c);
  };
  if (root?.Plan) walk(root.Plan);
  return out;
}

export const rootCost = (json: unknown): number => planNodes(json)[0]?.['Total Cost'] ?? 0;

/** Why the plan does not read `table` through an index, or undefined when it does. */
export type PlanFail = { reason: 'seqScan' | 'noIndex'; table: string } | { reason: 'cost'; table: string; ratio: number };

export function checkPlan(json: unknown, table: string): PlanFail | undefined {
  const nodes = planNodes(json).filter((n) => n['Relation Name'] === table);
  if (nodes.some((n) => n['Node Type'] === 'Seq Scan')) return { reason: 'seqScan', table };
  if (!nodes.some((n) => INDEX_READS.has(n['Node Type']))) return { reason: 'noIndex', table };
  return undefined;
}

export function checkLab(before: unknown, after: unknown, spec: LabSpec): PlanFail | undefined {
  const fail = checkPlan(after, spec.table);
  if (fail) return fail;
  const ratio = rootCost(after) / Math.max(rootCost(before), 1e-9);
  return ratio <= spec.max_cost_ratio ? undefined : { reason: 'cost', table: spec.table, ratio };
}

/** One line per plan for the feedback: the scan and index nodes and the total cost, e.g. "Seq Scan container_events · 2168". */
export function planLine(json: unknown): string {
  const scans = planNodes(json).filter((n) => n['Relation Name'] || n['Index Name'])
    .map((n) => [n['Node Type'], n['Relation Name'], n['Index Name'] && `(${n['Index Name']})`].filter(Boolean).join(' '));
  return `${scans.join(', ')} · ${Math.round(rootCost(json))}`;
}

/**
 * v24 "right but slow" (schema-perf-v24.md §5, L324, L340–L344). `perf:` of a drill or a Postgres Engine lab step: after a
 * right result, the answer is NOT passed when it lost the index the Solution reads `table` through (Solution: Index / Index
 * Only / Bitmap Heap Scan on it; answer: Seq Scan on it; and the answer costs more), or costs more than `max_ratio` (1.5) ×
 * the Solution. Everywhere else a right answer costing > 3 × the Solution and > 1,000 is a weak pass with a note. Both plans
 * come from EXPLAIN (FORMAT JSON) without ANALYZE on the same DB: planner cost, never milliseconds.
 */
export interface PerfSpec { table: string; max_ratio?: number }
export const PERF_RATIO = 1.5;
/** Outside `perf:`: weak only when ratio > WEAK_RATIO and the answer costs > WEAK_FLOOR (the CI gate's floor). */
export const WEAK_RATIO = 3;
export const WEAK_FLOOR = 1000;
export interface SlowVerdict { block: boolean; indexLost?: string; cost: number; solution: number; ratio: number }

/**
 * Undefined = not slow. `spec` given = a `perf:` step (blocks); none = the weak-pass rule. Nothing when either plan is empty or
 * the Solution costs 0 (a mock DB, an empty answer): never block on what was not measured.
 */
export function slowVerdict(solution: unknown, answer: unknown, spec?: PerfSpec): SlowVerdict | undefined {
  const sol = planNodes(solution);
  const ans = planNodes(answer);
  const s = sol[0]?.['Total Cost'] ?? 0;
  const a = ans[0]?.['Total Cost'] ?? 0;
  if (!s || !ans.length) return undefined;
  const ratio = a / s;
  const v = { cost: Math.round(a), solution: Math.round(s), ratio: Math.round(ratio * 100) / 100 };
  if (!spec) return ratio > WEAK_RATIO && a > WEAK_FLOOR ? { block: false, ...v } : undefined;
  // ponytail: no row-count floor on `table` here; the content test proves the Solution reads it by index and `slow:` fails
  const t = spec.table;
  const lost = ratio > 1 && sol.some((n) => n['Relation Name'] === t && INDEX_READS.has(n['Node Type']))
    && ans.some((n) => n['Relation Name'] === t && n['Node Type'] === 'Seq Scan');
  if (lost) return { block: true, indexLost: t, ...v };
  return ratio > (spec.max_ratio ?? PERF_RATIO) ? { block: true, ...v } : undefined;
}

/**
 * CI performance gate (schema-perf-v24.md §4, tests/perfGate.test.ts): per table, its size and the first column of each index.
 * `seqCost` = one full read (relpages + 0.01 × rows), the planner's own unit.
 */
export type TableFacts = Record<string, { rows: number; seqCost: number; lead: string[] }>;
export const GATE = { k: 10, floor: 1000, engineMax: 5000, bigTable: 5000, selective: 0.05 } as const;

/** Cost over `max(floor, k × full read of the biggest table the plan touches)`: the budget, or undefined when within it. */
export function overBudget(json: unknown, facts: TableFacts): { cost: number; budget: number } | undefined {
  const nodes = planNodes(json);
  const cost = nodes[0]?.['Total Cost'] ?? 0;
  const big = Math.max(0, ...nodes.map((n) => facts[n['Relation Name'] ?? '']?.seqCost ?? 0));
  const budget = Math.max(GATE.floor, GATE.k * big);
  return cost > budget ? { cost: Math.round(cost), budget: Math.round(budget) } : undefined;
}

/**
 * A Seq Scan of a table ≥ 5,000 rows whose Filter names a column some index leads with, estimated to keep ≤ 5 % of it:
 * the predicate is not sargable (a function or cast on the column). Returns the table, or undefined. String.raw keeps `\b` a
 * word boundary (v29, L441: in a plain template it was a backspace and never matched); the column is escaped, since an
 * expression index leads with e.g. `lower(email`, an unterminated group as a raw pattern.
 */
export function nonSargable(json: unknown, facts: TableFacts): string | undefined {
  return planNodes(json).find((n) => {
    const f = facts[n['Relation Name'] ?? ''];
    return n['Node Type'] === 'Seq Scan' && f && f.rows >= GATE.bigTable && (n['Plan Rows'] ?? 0) <= GATE.selective * f.rows
      && f.lead.some((c) => new RegExp(String.raw`\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\b`).test(n.Filter ?? ''));
  })?.['Relation Name'];
}

/**
 * `sql` with comments removed and literals ('…', "…", $tag$…$tag$) blanked, the way Postgres' lexer reads them:
 * block comments nest, and -- or /* inside a literal is not a comment. Undefined when anything is left unclosed,
 * a stray * / remains, a $ follows an identifier/number character, or there is a backslash (E'…' escapes, never
 * needed in a CREATE INDEX).
 */
export function codeOnly(sql: string): string | undefined {
  if (sql.includes('\\')) return undefined;
  let out = '';
  for (let i = 0; i < sql.length;) {
    if (sql.startsWith('--', i)) {
      const nl = /[\r\n]/g; // Postgres ends a -- comment at \r as well as \n
      nl.lastIndex = i;
      i = nl.exec(sql)?.index ?? sql.length;
      out += ' ';
    } else if (sql.startsWith('/*', i)) {
      let depth = 0;
      do {
        if (i >= sql.length) return undefined;
        if (sql.startsWith('/*', i)) { depth++; i += 2; } else if (sql.startsWith('*/', i)) { depth--; i += 2; } else i++;
      } while (depth > 0);
      out += ' ';
    } else if (sql.startsWith('*/', i)) {
      return undefined;
    } else if (sql[i] === "'" || sql[i] === '"') {
      const q = sql[i];
      let j = i + 1;
      for (;;) {
        j = sql.indexOf(q, j);
        if (j < 0) return undefined;
        if (sql[j + 1] !== q) break;
        j += 2; // '' or "" inside the literal
      }
      out += ' ';
      i = j + 1;
    } else if (sql[i] === '$' && /[\w$]|[^\x00-\x7F]/.test(sql[i - 1] ?? '')) {
      // Right after an identifier, number or $1 parameter: whether Postgres reads a $tag$ here depends on the token
      // before it (é$a$ and x$a$ are one identifier, 1$a$ and 0x1F$a$ are a number then a dollar quote). Refused.
      return undefined;
    } else {
      // Postgres' dolqdelim: $$ or $tag$, tag = letters, digits, _ and any non-ASCII character, not starting with a digit.
      const dolq = /\$([A-Za-z_\u0080-￿][\w\u0080-￿]*)?\$/y;
      dolq.lastIndex = i;
      const tag = sql[i] === '$' ? dolq.exec(sql)?.[0] : undefined;
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        if (end < 0) return undefined;
        out += ' ';
        i = end + tag.length;
      } else out += sql[i++];
    }
  }
  return out;
}

/**
 * The index lab accepts exactly one CREATE [UNIQUE] INDEX (comments and one trailing ; allowed). Checked in the worker,
 * not only in the UI; the worker also checks that the statement created exactly one index on the lab table (runLab).
 * CONCURRENTLY cannot run inside the lab's transaction.
 */
export function isCreateIndex(sql: string): boolean {
  const body = codeOnly(sql)?.trim().replace(/;$/, '');
  return body !== undefined && /^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(body) && !/;|\bCONCURRENTLY\b/i.test(body);
}
