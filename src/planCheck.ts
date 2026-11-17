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

interface RawNode { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; 'Total Cost'?: number; Plans?: RawNode[] }

/** Seq Scan: reads the whole table. Index / Index Only / Bitmap Heap Scan: reads it through an index. */
const INDEX_READS = new Set(['Index Scan', 'Index Only Scan', 'Bitmap Heap Scan']);

/** EXPLAIN (FORMAT JSON) output (the cell PGlite returns) → every node, root first. */
export function planNodes(json: unknown): RawNode[] {
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
 * The index lab accepts exactly one CREATE [UNIQUE] INDEX (comments allowed). Checked in the worker, not only in the UI;
 * PGlite's query() also refuses a second statement. CONCURRENTLY cannot run inside the lab's transaction.
 */
export function isCreateIndex(sql: string): boolean {
  const body = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return /^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(body) && !/\bCONCURRENTLY\b/i.test(body);
}
