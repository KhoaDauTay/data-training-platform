import type { EngineLesson, Lab, PredictExpect } from './content';

/**
 * v23 PRED (L256): the pure part of a predict's "Xem thật" and of the capstone's before/after plans. The UI
 * (src/ui/enginePredict.ts, src/ui/engineCapstone.ts) and tests/enginePredict.test.ts call the same functions, so the plan
 * the page draws is the plan the test checks against `expect`. No DOM, no value import from main modules.
 */

/** One node of a real plan, from EXPLAIN (FORMAT JSON) without ANALYZE: planner cost and row estimate, never milliseconds. */
export interface PlanNode {
  node: string;
  relation?: string;
  index?: string;
  /** Startup and total planner cost (arbitrary units). */
  startup: number;
  cost: number;
  /** The planner's row estimate. */
  rows: number;
  children: PlanNode[];
}

export const explainSql = (sql: string): string => `EXPLAIN (FORMAT JSON) ${sql.trim().replace(/;\s*$/, '')}`;

/** EXPLAIN (FORMAT JSON) output (the first cell; PGlite may give it as text) → the plan tree, or undefined. */
export function planTree(json: unknown): PlanNode | undefined {
  type N = { 'Node Type'?: string; 'Relation Name'?: string; 'Index Name'?: string; 'Startup Cost'?: number; 'Total Cost'?: number; 'Plan Rows'?: number; Plans?: N[] };
  let v = json;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return undefined;
    }
  }
  const root = (Array.isArray(v) ? v[0] : undefined) as { Plan?: N } | undefined;
  const walk = (n: N): PlanNode => ({
    node: n['Node Type'] ?? '?',
    ...(n['Relation Name'] ? { relation: n['Relation Name'] } : {}),
    ...(n['Index Name'] ? { index: n['Index Name'] } : {}),
    startup: Number(n['Startup Cost'] ?? 0),
    cost: Number(n['Total Cost'] ?? 0),
    rows: Number(n['Plan Rows'] ?? 0),
    children: (n.Plans ?? []).map(walk),
  });
  return root?.Plan ? walk(root.Plan) : undefined;
}

/** Every node, root first (depth-first, the order EXPLAIN prints). */
export const nodesOf = (t: PlanNode | undefined): PlanNode[] => (t ? [t, ...t.children.flatMap(nodesOf)] : []);

/** The first node `expect` names (any depth, like src/engine/pglab/check.ts), or undefined. */
export const matchesExpect = (t: PlanNode | undefined, x: PredictExpect): PlanNode | undefined =>
  nodesOf(t).find((n) => n.node === x.node && (x.table === undefined || n.relation === x.table)
    && (x.index === undefined || n.index === x.index) && (x.rows === undefined || n.rows === x.rows));

/** The node that answers the question: only the one `expect` names (without `expect` nothing is outlined, never a guess). */
export const answerNode = (t: PlanNode | undefined, x?: PredictExpect): PlanNode | undefined => (x ? matchesExpect(t, x) : undefined);

/** One observation sentence as a code (`obs.<code>` in src/i18n/engine.ts) and its params. */
export interface Observation { code: 'pick' | 'pickIndex' | 'top' | 'sort' | 'noSort' | 'differs'; params: Record<string, string> }
/**
 * What the real plan shows, in words: the node `expect` names (else the root) with its index or table, and for a query with ORDER BY whether
 * a Sort node is there. `differs` when the plan has no node `expect` names (the page still draws the real plan).
 */
export function observe(t: PlanNode | undefined, sql: string, x?: PredictExpect): Observation[] {
  const out: Observation[] = [];
  if (!t) return out;
  if (x && !matchesExpect(t, x)) out.push({ code: 'differs', params: { node: x.node } });
  const n = answerNode(t, x) ?? t; // without `expect`: the root, the one node every plan's reading starts from
  out.push(n.index ? { code: 'pickIndex', params: { node: n.node, index: n.index } }
    : n.relation ? { code: 'pick', params: { node: n.node, table: n.relation } } : { code: 'top', params: { node: n.node } });
  if (/\border\s+by\b/i.test(sql)) out.push({ code: nodesOf(t).some((m) => /Sort$/.test(m.node)) ? 'sort' : 'noSort', params: {} });
  return out;
}

/**
 * A Postgres predict whose question reads statistics counters (`pg_stat_*`, no `expect`), e.g. l3-08's HOT counts: "Xem thật"
 * runs that query after the lab's setup and shows its rows, since its EXPLAIN would only show catalog views (blind-pg l3-08, L296).
 */
export const readsCounters = (l: EngineLesson): boolean =>
  (l.engine === 'postgres' || l.engine === 'design' || l.engine === 'stack' || l.engine === 'olap') && l.runtime !== 'docs' && !!l.predict && !l.predict.expect && !!l.lab?.setup && /\bpg_stat(io)?_/i.test(l.predict.sql);
/** A Postgres predict gets the real plan only where a plan is the answer: its own lab data (`setup`) or an `expect`. */
export const hasRealPlan = (l: EngineLesson): boolean =>
  (l.engine === 'postgres' || l.engine === 'design' || l.engine === 'stack' || l.engine === 'olap') && l.runtime !== 'docs' && !!l.predict && (!!l.lab?.setup || !!l.predict.expect) && !readsCounters(l);
/**
 * v25: a MongoDB predict on its own lab data whose answer is a result, not a plan (no `recorded`): "Xem thật" runs the question
 * on mingo and shows its documents (tests/engineIntegration.test.ts runs each one). mingo has no planner, so a plan question
 * carries `recorded` (what the docs print) instead.
 */
export const mongoRows = (l: EngineLesson): boolean =>
  l.engine === 'mongodb' && l.runtime !== 'docs' && !!l.lab && !!l.predict && !l.predict.recorded;
/** "Xem thật" shows the question's own rows: a counters question, or a MongoDB result question. */
export const showsRows = (l: EngineLesson): boolean => readsCounters(l) || mongoRows(l);
/** The predict card with "Xem thật": a real plan or the real rows. */
export const hasRealRun = (l: EngineLesson): boolean => hasRealPlan(l) || showsRows(l);

/** The statements of `setup` the question rests on ("Đang có", engine-ux-spec §5.4): its CREATE INDEX lines. */
export const shownSetup = (setup: string | undefined): string[] =>
  (setup ?? '').split(/;\s*(?:\n|$)/).map((x) => x.replace(/^(\s*--[^\n]*\n)+/, '').trim()).filter((x) => /^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(x));

// ---- the first choice (device pref, never the Save; Product reads it to measure first guesses, roadmap v23 PRED)

export const FIRST_KEY = 'cargo-query/engine-first';
export const FIRST_MAX = 300;
const LESSON_ID = /^e-(pg|mg|dy)-l[1-5]-\d{2}$/;
/** `{ <lesson id>: <original option index> }`; anything else is dropped, never thrown. */
export function parseEngineFirst(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
    if (Object.keys(out).length >= FIRST_MAX) break;
    if (LESSON_ID.test(k) && typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 10) out[k] = n;
  }
  return out;
}
/** The pref with this lesson's first pick added, or undefined when it already has one (or is full): nothing to write. */
export function withFirst(prev: Record<string, number>, id: string, pick: number): Record<string, number> | undefined {
  if (id in prev || Object.keys(prev).length >= FIRST_MAX || !LESSON_ID.test(id)) return undefined;
  return { ...prev, [id]: pick };
}

// ---- capstone (v23 CAP, L257)

/** A statement that only reads (same rule as src/engine/pglab/runner.ts: its replay changes nothing). */
const reads = (sql: string): boolean => /^\s*(\(\s*)?(select|with|explain|table|values|show)\b/i.test(sql.replace(/^\s*(--[^\n]*\n\s*)*/, ''));

/**
 * The query a capstone's before/after plans are about and the replay points (runner `step` = how many earlier steps are
 * replayed): the first step with `target` (its DDL is the change), else the last `plan` step when a step before it changes
 * the database. `gate` = the step the player must have passed first (the "after" plan replays their own statement there).
 */
export interface Pivot { query: string; before: number; after: number; gate: number }
export function capstonePivot(lab: Lab | undefined): Pivot | undefined {
  const steps = lab?.steps ?? [];
  const t = steps.findIndex((s) => s.target);
  if (t >= 0) return { query: steps[t].target!, before: t, after: t + 1, gate: t };
  for (let p = steps.length - 1; p >= 0; p--) {
    if (steps[p].check !== 'plan') continue;
    const change = steps.slice(0, p).map((s, i) => (reads(s.solution) ? -1 : i)).filter((i) => i >= 0).pop();
    return change === undefined ? undefined : { query: steps[p].solution, before: change, after: change + 1, gate: change };
  }
  return undefined;
}

/** The lab the "after" plan runs on: the learner's own statement in place of the pivot step's solution. */
export const afterLab = (lab: Lab, gate: number, mine: string): Lab => ({ ...lab, steps: lab.steps.map((s, j) => (j === gate ? { ...s, solution: mine } : s)) });

/** The bar's short name of a step: its `name`, else the task's first clause without a leading "Bước n," / "Step n,". */
export function stepName(task: string, name?: string): string {
  if (name) return name;
  const plain = task.replace(/`([^`\n]+)`/g, '$1').replace(/^(Bước|Step)\s+\d+\s*[,.:]\s*/i, '');
  const first = plain.split(/(?<=[.:?!])\s/)[0].replace(/[.:]$/, '');
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first;
}
