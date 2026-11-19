import type { QueryResult } from '../../db/run';
import type { GradeResult } from '../../grader';
import { PgLabClient } from './client';
import type { PgExtension } from './script';

/**
 * ENG-PGLAB (L230): ENG-CORE's Postgres LabRunner (src/engine/labs.ts on its branch: prepare/run/check over a lesson's
 * `lab: { setup?, steps }`) on the lab runtime. The shapes are written out here because labs.ts is not on main yet; at
 * merge, `LAB_RUNNERS.postgres` becomes `async (env) => (await import('./pglab/runner')).pgScriptRunner(env)`.
 * Every call starts from a fresh database with `setup` applied, so setup may VACUUM/ANALYZE and nothing carries over.
 * Extensions = every `CREATE EXTENSION x` in setup (the bundle is loaded, the statement then skipped).
 */
interface Lab { setup?: string }
interface Step { solution: string; check: 'rows' | 'plan' | 'catalog' | 'doc'; ordered: boolean }
type Verdict = { ok: true } | { ok: false; reason: 'wrong' | 'error' | 'unsupported'; message?: string };
interface Env {
  grade(run: (sql: string) => Promise<QueryResult>, solution: string, player: string, ordered: boolean): Promise<GradeResult>;
  verdict(r: Exclude<GradeResult, { ok: true }>): string;
}

const extensionsOf = (setup = ''): PgExtension[] =>
  [...setup.matchAll(/\bCREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/gi)].map((m) => m[1] as PgExtension);

/** Node types and relations of a plan, root first: two plans "match" when this list is equal. */
function planShape(json: unknown): string[] {
  type N = { 'Node Type'?: string; 'Relation Name'?: string; Plans?: N[] };
  const out: string[] = [];
  const walk = (n: N) => {
    out.push(`${n['Node Type']} ${n['Relation Name'] ?? ''}`.trim());
    n.Plans?.forEach(walk);
  };
  const root = (Array.isArray(json) ? json[0] : undefined) as { Plan?: N } | undefined;
  if (root?.Plan) walk(root.Plan);
  return out;
}

export function pgScriptRunner(env: Env, client: Pick<PgLabClient, 'run' | 'reset'> = new PgLabClient()) {
  /** The player's (or the Solution's) one statement after setup. Throws the Postgres error like DbClient (string `code`). */
  const run = async (lab: Lab, code: string): Promise<QueryResult> => {
    const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup), steps: [code] });
    if (r.setupError) throw Object.assign(new Error(r.setupError.message), r.setupError);
    const s = r.steps[0];
    if (s.error) throw Object.assign(new Error(s.error.message), s.error);
    return { columns: s.columns, types: s.types, rows: s.rows, ms: s.ms, ...(s.truncated ? { truncated: s.truncated } : {}) };
  };
  return {
    prepare: async (lab: Lab): Promise<void> => {
      const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup), steps: [] });
      if (r.setupError) throw Object.assign(new Error(r.setupError.message), r.setupError);
    },
    run,
    check: async (lab: Lab, step: Step, code: string): Promise<Verdict> => {
      if (step.check === 'doc') return { ok: false, reason: 'unsupported' };
      if (step.check === 'plan') {
        const explain = (sql: string) => run(lab, `EXPLAIN (FORMAT JSON) ${sql.trim().replace(/;$/, '')}`).then((q) => planShape(q.rows[0]?.[0]));
        let mine: string[];
        try {
          mine = await explain(code);
        } catch (e) {
          return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
        }
        const want = await explain(step.solution);
        return want.join('|') === mine.join('|') ? { ok: true } : { ok: false, reason: 'wrong', message: mine.join(' → ') };
      }
      // rows and catalog: the player's output equals the Solution's on the same fresh setup.
      const g = await env.grade((sql) => run(lab, sql), step.solution, code, step.ordered);
      return g.ok ? g : { ok: false, reason: g.reason === 'error' ? 'error' : 'wrong', message: env.verdict(g) };
    },
    reset: () => client.reset(),
  };
}
