import { cellKey, compareResults } from '../../grader';
import { planNodes } from '../../planCheck';
import type { CheckResult, ScriptCheck, StepResult } from './script';

// Runs in the lab worker (its own bundle), so the value imports from grader/planCheck never split main (Plan 6 U3).

const same = (a: unknown, b: unknown) => cellKey(a) === cellKey(b);

export function runCheck(c: ScriptCheck, steps: StepResult[]): CheckResult {
  const s = steps[c.step];
  if (!s || s.status !== 'ok') return { ok: false, why: 'skipped' };
  if (c.kind === 'rows') {
    const n = c.rows[0]?.length ?? s.columns.length;
    const grade = compareResults({ columns: Array(n).fill(''), types: [], rows: c.rows }, s, c.ordered ?? false);
    return grade.ok ? grade : { ok: false, why: 'rows', grade };
  }
  if (c.kind === 'plan') {
    const json = s.rows[0]?.[0];
    const nodes = planNodes(typeof json === 'string' ? JSON.parse(json) : json);
    if (!nodes.length) return { ok: false, why: 'notPlan' };
    const hits = nodes.filter((n) => {
      const node = n as unknown as Record<string, unknown>;
      return n['Node Type'] === c.node && (c.relation === undefined || n['Relation Name'] === c.relation)
        && (c.index === undefined || n['Index Name'] === c.index)
        && Object.entries(c.detail ?? {}).every(([k, v]) => same(node[k], v));
    });
    return (hits.length > 0) !== !!c.absent ? { ok: true } : { ok: false, why: 'noNode', matched: hits.length };
  }
  const where = Object.entries(c.where ?? {}).map(([col, v]) => [s.columns.indexOf(col), v] as const);
  if (where.some(([i]) => i < 0)) return { ok: false, why: 'column' };
  const matched = s.rows.filter((r) => where.every(([i, v]) => same(r[i], v))).length;
  const pass = c.all ? matched > 0 && matched === s.rows.length
    : c.count !== undefined ? matched === c.count
      : c.min !== undefined || c.max !== undefined ? matched >= (c.min ?? 0) && matched <= (c.max ?? Infinity)
        : matched > 0;
  return pass ? { ok: true } : { ok: false, why: 'count', matched };
}
