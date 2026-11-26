import type { QueryResult } from '../../db/run';
import type { Lab, LabStep } from '../content';
import type { LabEnv, LabRunner } from '../labs';
import { PromqlError, runPromql, seriesOf, type Series } from './promql';

/**
 * v47 Telemetry R1 (L1037): the telemetry track's runner (lazy chunk `promqlRunner`, budget `promql`, loaded only by a telemetry lab). Every lab is a
 * PostgreSQL lab (`pg`, the Postgres runner); a step with `lang: promql` instead reads the lab's `samples` table once (setup
 * only, on the Postgres lab runtime) and evaluates the PromQL in TypeScript at the virtual clock = the newest sample's time.
 * Graded by src/grader.ts like a SQL step: the Solution and the answer are both evaluated, rows compared as a multiset.
 */
export const SAMPLES_SQL = `SELECT metric, labels::text, (extract(epoch FROM ts) * 1000)::float8,
  value::float8, (SELECT (extract(epoch FROM max(ts)) * 1000)::float8 FROM samples)
FROM samples`;

export function tmRunner(env: Pick<LabEnv, 'grade' | 'verdict'>, pg: LabRunner): LabRunner {
  const cache = new Map<string, Promise<{ data: Series[]; at: number }>>();
  const samples = (lab: Lab): Promise<{ data: Series[]; at: number }> => {
    const key = lab.setup ?? '';
    let p = cache.get(key);
    if (!p) {
      p = pg.run(lab, SAMPLES_SQL).then((r) => {
        if (!r.rows.length) throw new PromqlError('the lab has no samples');
        return { data: seriesOf(r.rows), at: Number(r.rows[0][4]) };
      });
      p.catch(() => cache.delete(key));
      cache.set(key, p);
    }
    return p;
  };
  const promql = async (lab: Lab, code: string): Promise<QueryResult> => {
    const t0 = Date.now();
    const { data, at } = await samples(lab);
    const out = runPromql(code, data, at);
    return { ...out, types: out.columns.map((c) => (c === 'value' ? 701 : 25)), ms: Date.now() - t0 };
  };
  const isProm = (s: LabStep | undefined): boolean => s?.lang === 'promql';
  return {
    prepare: (lab) => pg.prepare(lab),
    run: (lab, code, step) => (step !== undefined && isProm(lab.steps[step]) ? promql(lab, code) : pg.run(lab, code, step)),
    check: async (lab, step, code) => {
      if (!isProm(step)) return pg.check(lab, step, code);
      const r = await env.grade((q) => promql(lab, q), step.solution, code, step.ordered);
      return r.ok ? r : { ok: false, reason: r.reason === 'error' ? 'error' : 'wrong', message: env.verdict(r) };
    },
    ...(pg.explain ? { explain: pg.explain } : {}),
    ...(pg.demo ? { demo: pg.demo } : {}),
  };
}
