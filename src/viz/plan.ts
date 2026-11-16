import type { Key } from '../i18n';

export type PlanDetail = {
  kind: 'index' | 'indexCond' | 'hashCond' | 'joinFilter' | 'filter' | 'groupKey' | 'sortKey';
  /** Raw Postgres text (expression, index name). Translated labels are added by the view. */
  text: string;
  removed?: number;
};

export interface PlanNode {
  id: number;
  depth: number;
  parent: number | null;
  type: string;
  label: string;
  relation?: string;
  /** Actual rows × loops: rows this node handed to its parent. */
  rows: number;
  /** rows + rows removed by filter: rows the node actually looked at. */
  scanned: number;
  estRows: number;
  ms: number;
  detail: PlanDetail[];
}

export interface Plan {
  nodes: PlanNode[];
  executionMs: number;
}

interface RawNode {
  'Node Type': string;
  Strategy?: string;
  'Join Type'?: string;
  'Relation Name'?: string;
  Alias?: string;
  'Index Name'?: string;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Plan Rows'?: number;
  'Actual Total Time'?: number;
  Filter?: string;
  'Rows Removed by Filter'?: number;
  'Hash Cond'?: string;
  'Index Cond'?: string;
  'Join Filter'?: string;
  'Sort Key'?: string[];
  'Group Key'?: string[];
  Plans?: RawNode[];
}

const AGG: Record<string, string> = { Hashed: 'HashAggregate', Sorted: 'GroupAggregate', Mixed: 'MixedAggregate' };

function label(n: RawNode): string {
  const base = n['Node Type'] === 'Aggregate' ? (AGG[n.Strategy ?? ''] ?? 'Aggregate') : n['Node Type'];
  const join = n['Join Type'] && n['Join Type'] !== 'Inner' ? ` (${n['Join Type']})` : '';
  const rel = n['Relation Name'];
  const alias = n.Alias && n.Alias !== rel ? ` ${n.Alias}` : '';
  return `${base}${join}${rel ? ` ${rel}${alias}` : ''}`;
}

function detail(n: RawNode): PlanDetail[] {
  const out: PlanDetail[] = [];
  if (n['Index Name']) out.push({ kind: 'index', text: n['Index Name'] });
  if (n['Index Cond']) out.push({ kind: 'indexCond', text: n['Index Cond'] });
  if (n['Hash Cond']) out.push({ kind: 'hashCond', text: n['Hash Cond'] });
  if (n['Join Filter']) out.push({ kind: 'joinFilter', text: n['Join Filter'] });
  if (n.Filter) {
    const removed = n['Rows Removed by Filter'];
    out.push(removed ? { kind: 'filter', text: n.Filter, removed } : { kind: 'filter', text: n.Filter });
  }
  if (n['Group Key']) out.push({ kind: 'groupKey', text: n['Group Key'].join(', ') });
  if (n['Sort Key']) out.push({ kind: 'sortKey', text: n['Sort Key'].join(', ') });
  return out;
}

export function flattenPlan(json: unknown): Plan {
  const root = (json as { Plan: RawNode; 'Execution Time'?: number }[])[0];
  const nodes: PlanNode[] = [];
  const walk = (n: RawNode, depth: number, parent: number | null) => {
    const id = nodes.length;
    const rows = (n['Actual Rows'] ?? 0) * (n['Actual Loops'] ?? 1);
    nodes.push({
      id, depth, parent,
      type: n['Node Type'],
      label: label(n),
      relation: n['Relation Name'],
      rows,
      scanned: rows + (n['Rows Removed by Filter'] ?? 0) * (n['Actual Loops'] ?? 1),
      estRows: n['Plan Rows'] ?? 0,
      ms: n['Actual Total Time'] ?? 0,
      detail: detail(n),
    });
    for (const child of n.Plans ?? []) walk(child, depth + 1, id);
  };
  walk(root.Plan, 0, null);
  return { nodes, executionMs: root['Execution Time'] ?? 0 };
}

/** i18n key of the glossary line for each node type (text in src/i18n, VI + EN). */
export const NODE_HELP: Record<string, Key> = {
  'Seq Scan': 'node.seqScan',
  'Index Scan': 'node.indexScan',
  'Index Only Scan': 'node.indexOnlyScan',
  'Bitmap Index Scan': 'node.bitmapIndexScan',
  'Bitmap Heap Scan': 'node.bitmapHeapScan',
  'Hash Join': 'node.hashJoin',
  Hash: 'node.hash',
  'Nested Loop': 'node.nestedLoop',
  'Merge Join': 'node.mergeJoin',
  Sort: 'node.sort',
  'Incremental Sort': 'node.incrementalSort',
  Aggregate: 'node.aggregate',
  Limit: 'node.limit',
  Unique: 'node.unique',
  Materialize: 'node.materialize',
  Memoize: 'node.memoize',
  'Subquery Scan': 'node.subqueryScan',
  'CTE Scan': 'node.cteScan',
  WindowAgg: 'node.windowAgg',
  Append: 'node.append',
  SetOp: 'node.setOp',
  Result: 'node.result',
  Gather: 'node.gather',
};

export function nodeHelpKey(type: string): Key {
  return NODE_HELP[type] ?? 'node.fallback';
}

export function isHeavyScan(n: PlanNode): boolean {
  return n.type === 'Seq Scan' && n.scanned >= 10_000;
}
