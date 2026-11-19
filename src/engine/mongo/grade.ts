// Document grader for Mongo labs. Compares the player's documents with the Solution's:
// - by field name, key order ignored (MongoDB keeps insertion order, but { a, b } and { b, a } answer the same question);
// - arrays keep their order (they are values, not sets);
// - a missing field is not null;
// - numbers are rounded to 2 decimals, like the SQL grader ($avg and $divide give float noise);
// - as a multiset unless `ordered` (a lab whose prompt asks for a sort);
// - an `_id` the player kept and the Solution projected away is a tip, not a failure (find returns _id by default).
import type { MongoDoc, MongoResult, MongoValue } from './types';

export interface DocGrade {
  ok: boolean;
  /** `extraId`: right apart from `_id`, which the Solution leaves out. */
  tip?: 'extraId';
  /** Why it failed: different document count, different documents, or right documents in the wrong order. */
  reason?: 'count' | 'docs' | 'order' | 'value';
  /** Up to 3 documents the answer misses and 3 it has too many (multiset difference), for the feedback view. */
  missing?: MongoDoc[];
  extra?: MongoDoc[];
}

/** Canonical text of a value: sorted keys, ordered arrays, typed Date/RegExp so "2026-01-01" ≠ a Date. */
export function canon(v: MongoValue | undefined): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 100) / 100 + 0) : String(v); // + 0: -0 → 0
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (v instanceof Date) return `Date(${v.toISOString()})`;
  if (v instanceof RegExp) return `RegExp(${String(v)})`;
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  const keys = Object.keys(v)
    .filter((k) => v[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}

const withoutId = (d: MongoDoc): MongoDoc => {
  const { _id, ...rest } = d;
  void _id;
  return rest;
};

function compare(expected: MongoDoc[], actual: MongoDoc[], ordered: boolean): DocGrade {
  if (expected.length !== actual.length) return { ok: false, reason: 'count', ...diff(expected, actual) };
  const e = expected.map(canon);
  const a = actual.map(canon);
  if (ordered && e.every((x, i) => x === a[i])) return { ok: true };
  const es = [...e].sort();
  const as = [...a].sort();
  const same = es.every((x, i) => x === as[i]);
  if (same) return ordered ? { ok: false, reason: 'order' } : { ok: true };
  return { ok: false, reason: 'docs', ...diff(expected, actual) };
}

function diff(expected: MongoDoc[], actual: MongoDoc[]): { missing: MongoDoc[]; extra: MongoDoc[] } {
  const left = new Map<string, number>();
  for (const d of actual) left.set(canon(d), (left.get(canon(d)) ?? 0) + 1);
  const missing: MongoDoc[] = [];
  for (const d of expected) {
    const k = canon(d);
    const n = left.get(k) ?? 0;
    if (n > 0) left.set(k, n - 1);
    else if (missing.length < 3) missing.push(d);
  }
  const extra: MongoDoc[] = [];
  for (const d of actual) {
    const k = canon(d);
    const n = left.get(k) ?? 0;
    if (n > 0 && extra.length < 3) {
      extra.push(d);
      left.set(k, n - 1);
    }
  }
  return { missing, extra };
}

export function gradeDocs(expected: MongoDoc[], actual: MongoDoc[], opts: { ordered?: boolean } = {}): DocGrade {
  const ordered = opts.ordered ?? false;
  const g = compare(expected, actual, ordered);
  if (g.ok) return g;
  const solutionHasId = expected.some((d) => Object.hasOwn(d, '_id'));
  if (!solutionHasId && actual.some((d) => Object.hasOwn(d, '_id'))) {
    const again = compare(expected, actual.map(withoutId), ordered);
    if (again.ok) return { ok: true, tip: 'extraId' };
  }
  return g;
}

/** Grades one run against the Solution's run: values (count, distinct) exactly, documents with gradeDocs. */
export function gradeMongo(expected: MongoResult, actual: MongoResult, opts: { ordered?: boolean } = {}): DocGrade {
  if (expected.value !== undefined || actual.value !== undefined)
    return canon(expected.value) === canon(actual.value) ? { ok: true } : { ok: false, reason: 'value' };
  return gradeDocs(expected.docs, actual.docs, opts);
}
