// ENG-DYNAMO: grades a DynamoDB result against the solution's. Pure, no DOM (product-design-db-engine §3.5):
// items compared as maps (attribute order ignored, the DynamoDB type kept, N by value, sets unordered, lists ordered);
// a multiset unless `ordered`; a cost rule (Query vs Scan) turns a right answer into a weak pass.
import type { AttributeValue, DynamoResult, Item } from './types';

export interface DynamoGradeOpts {
  /** Items must come in the solution's order (a Query with ScanIndexForward, a top-N). Default: any order. */
  ordered?: boolean;
  /** A Scan gives the right items but is a weak pass ("Query vs Scan"). */
  noScan?: boolean;
  /** Weak pass when the request read more items than this (ScannedCount; Query/Scan only). */
  maxScanned?: number;
  /** Weak pass when the request used more read capacity than this (sum of ConsumedCapacity.CapacityUnits). */
  maxRcu?: number;
}

export type DynamoGrade =
  | { ok: true; weak?: 'scan' | 'scanned' | 'rcu' }
  | { ok: false; why: 'count'; expected: number; actual: number }
  | { ok: false; why: 'items' | 'order'; missing: Item[]; extra: Item[] };

const sortedObj = (o: Record<string, unknown>, f: (v: unknown) => unknown) =>
  Object.fromEntries(Object.keys(o).sort().map((k) => [k, f(o[k])]));
const num = (n: unknown) => (Number.isFinite(Number(n)) ? String(Number(n)) : String(n));

function canonValue(v: AttributeValue): unknown {
  const [type] = Object.keys(v);
  const x = v[type];
  switch (type) {
    case 'N': return { N: num(x) };
    case 'NS': return { NS: (x as unknown[]).map(num).sort() };
    case 'SS': case 'BS': return { [type]: [...(x as string[])].sort() };
    case 'M': return { M: sortedObj(x as Record<string, unknown>, (e) => canonValue(e as AttributeValue)) };
    case 'L': return { L: (x as AttributeValue[]).map(canonValue) };
    default: return v;
  }
}

/** One stable string per item: equal items (by DynamoDB's meaning) give the same string. */
export const canonItem = (item: Item): string => JSON.stringify(sortedObj(item, (v) => canonValue(v as AttributeValue)));

/** What the request read: items kept, items read, capacity used (RCU for reads). */
export function readCost(r: DynamoResult): { count: number; scanned?: number; rcu?: number } {
  const cc = r.ConsumedCapacity === undefined ? undefined : ([] as unknown[]).concat(r.ConsumedCapacity);
  const rcu = cc?.reduce<number>((s, c) => s + (Number((c as { CapacityUnits?: number })?.CapacityUnits) || 0), 0);
  return { count: r.Count, scanned: r.ScannedCount, rcu };
}

/** `Select: 'COUNT'` answers with a number, not items. */
const countOnly = (r: DynamoResult) => {
  const raw = r.raw as Record<string, unknown> | undefined;
  return !!raw && 'Count' in raw && !('Items' in raw);
};

export function gradeItems(actual: DynamoResult, expected: DynamoResult, opts: DynamoGradeOpts = {}): DynamoGrade {
  if (countOnly(expected)) {
    if (actual.Count !== expected.Count) return { ok: false, why: 'count', expected: expected.Count, actual: actual.Count };
  } else {
    // A write lab grades the state its `after` read shows; a read lab grades the items it returned.
    const want = expected.after ?? expected.Items;
    const got = actual.after ?? actual.Items;
    const a = got.map(canonItem);
    const e = want.map(canonItem);
    const left = new Map<string, number>();
    for (const k of e) left.set(k, (left.get(k) ?? 0) + 1);
    const extra: Item[] = [];
    a.forEach((k, i) => (left.get(k) ? left.set(k, left.get(k)! - 1) : extra.push(got[i])));
    const missing = want.filter((_, i) => left.get(e[i])! > 0 && left.set(e[i], left.get(e[i])! - 1));
    if (extra.length || missing.length) return { ok: false, why: 'items', missing: missing.slice(0, 3), extra: extra.slice(0, 3) };
    if (opts.ordered && a.some((k, i) => k !== e[i])) return { ok: false, why: 'order', missing: [], extra: [] };
  }
  const cost = readCost(actual);
  if (opts.noScan && actual.op === 'Scan') return { ok: true, weak: 'scan' };
  if (opts.maxScanned !== undefined && (cost.scanned ?? 0) > opts.maxScanned) return { ok: true, weak: 'scanned' };
  if (opts.maxRcu !== undefined && (cost.rcu ?? 0) > opts.maxRcu) return { ok: true, weak: 'rcu' };
  return { ok: true };
}
