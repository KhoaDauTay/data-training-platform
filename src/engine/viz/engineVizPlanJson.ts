import type { PlanNode } from '../../viz/plan';

// v23 PG-VIZ (L263): EXPLAIN (FORMAT JSON) → what the plan diagrams read. Shared by pg-plan-tree (engineViz chunk) and
// pg-query-path / pg-partition-prune (engineVizPgFlow chunk); pure, no DOM.

// ── EXPLAIN (FORMAT JSON) ───────────────────────────────────────────────────────────────────────────────────────
/** One node of EXPLAIN (FORMAT JSON), only the keys the diagrams read. */
export interface RawPlan {
  'Node Type'?: string; 'Relation Name'?: string; 'Index Name'?: string; 'Parent Relationship'?: string;
  'Total Cost'?: number; 'Plan Rows'?: number; 'Actual Rows'?: number; 'Actual Loops'?: number; 'Subplans Removed'?: number;
  Plans?: RawPlan[];
}
const RAW_KEYS = ['Node Type', 'Relation Name', 'Index Name', 'Parent Relationship', 'Total Cost', 'Plan Rows', 'Actual Rows', 'Actual Loops', 'Subplans Removed'] as const;
/** The root plan node of EXPLAIN (FORMAT JSON) output as PGlite gives it: the cell (text or parsed), `[{ Plan }]`, `{ Plan }` or a node. */
export function rawPlanOf(json: unknown): RawPlan | undefined {
  let v = json;
  if (typeof v === 'string') try { v = JSON.parse(v) as unknown; } catch { return undefined; }
  while (Array.isArray(v)) v = v[0];
  if (!v || typeof v !== 'object') return undefined;
  const o = v as { Plan?: RawPlan } & RawPlan;
  return o.Plan ?? (o['Node Type'] ? o : undefined);
}
/** The same plan with only the keys a diagram reads (no timings): how the built-in samples are stored and pinned. */
export function slimPlan(json: unknown): RawPlan | undefined {
  const slim = (n: RawPlan): RawPlan => {
    const o: Record<string, unknown> = {};
    for (const k of RAW_KEYS) if (n[k] !== undefined) o[k] = n[k];
    if (n.Plans?.length) o.Plans = n.Plans.map(slim);
    return o as RawPlan;
  };
  const r = rawPlanOf(json);
  return r && slim(r);
}

// ── plan nodes ──────────────────────────────────────────────────────────────────────────────────────────────────
/** A plan node: the fields of src/viz/plan.ts's PlanNode that a picture needs, plus the planner's total cost. */
export type PlanVizNode = Pick<PlanNode, 'id' | 'parent' | 'type'> & Partial<Pick<PlanNode, 'relation' | 'estRows'>> & {
  cost?: unknown; rows?: unknown; index?: string; loops?: number; removed?: number; initPlan?: boolean;
};
/** EXPLAIN (FORMAT JSON) → plan nodes, root first (ids in pre-order). `rows` = actual rows × loops when ANALYZE ran. */
export function planNodesOf(json: unknown): PlanVizNode[] {
  const out: PlanVizNode[] = [];
  const walk = (n: RawPlan, parent: number | null, sub: boolean): void => {
    const id = out.length + 1;
    const loops = n['Actual Loops'];
    const initPlan = sub || n['Parent Relationship'] === 'InitPlan' || n['Parent Relationship'] === 'SubPlan';
    out.push({
      id, parent, type: n['Node Type'] ?? '?', relation: n['Relation Name'], index: n['Index Name'], estRows: n['Plan Rows'], cost: n['Total Cost'],
      rows: loops !== undefined && n['Actual Rows'] !== undefined ? n['Actual Rows'] * Math.max(1, loops) : undefined, loops, removed: n['Subplans Removed'], initPlan,
    });
    n.Plans?.forEach((c) => walk(c, id, initPlan));
  };
  const root = rawPlanOf(json);
  if (root) walk(root, null, false);
  return out;
}
/** A model that is already plan nodes, or EXPLAIN JSON to turn into them. */
