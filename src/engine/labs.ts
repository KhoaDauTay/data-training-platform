import type { QueryResult } from '../db/run';
import type { GradeResult } from '../grader';
import type { EngineId, Lab, LabStep } from './content';

/**
 * ENG-CORE (L221): the seam every engine's lab runtime plugs into. The lesson page (src/ui/engineView.ts) calls `prepare`
 * once per lesson visit, then `run` (show the player's result, never graded) and `check` (grade one lab step).
 * Runners are loaded lazily through LAB_RUNNERS; ENG-PGLAB replaces `postgres` (setup, extensions, plan/catalog checks),
 * MONGO adds `mongodb` (src/engine/mongo/**), the DynamoDB track adds `dynamodb`. Same rule as every lazy chunk: a runner
 * imports only types from main modules and gets main values through `LabEnv`.
 */

/**
 * Engine numbers a runner may add beside the table (coordinator decision 2, engine-ux-spec Q-C2): DynamoDB (table,
 * scannedCount, count, consumedCapacity), Mongo explain, Postgres plans before/after an index and catalog rows. Each one
 * shown is drawn in its own line under the result; absent fields draw nothing.
 */
export interface LabMeta {
  table?: string;
  scannedCount?: number;
  count?: number;
  consumedCapacity?: number;
  explain?: { stages: string[]; keysExamined: number; docsExamined: number };
  planBefore?: string;
  planAfter?: string;
  catalog?: unknown[][];
}
/** A table for the Result view (QueryResult-compatible: `types` = Postgres type OIDs, empty for a document engine) + meta. */
export type LabOutput = QueryResult & { meta?: LabMeta };
/** `unsupported`: this runner cannot do the step's check kind or the lab's setup (the page says so; nothing is graded). */
export type LabVerdict = { ok: true } | { ok: false; reason: 'wrong' | 'error' | 'unsupported'; message?: string };

export interface LabRunner {
  /** Once per lesson visit, before the first run: e.g. apply `lab.setup`. Throws → the page shows the error and a retry. */
  prepare(lab: Lab): Promise<void>;
  /** Runs the player's code and returns its output (throws on an engine error: the page shows it like a SQL error). */
  run(lab: Lab, code: string): Promise<LabOutput>;
  /** Grades one step: `check` says what is compared (rows, plan, catalog, doc). */
  check(lab: Lab, step: LabStep, code: string): Promise<LabVerdict>;
}

/** Main-bundle values a runner may use (passed by the engine UI chunk). */
export interface LabEnv {
  /** One statement on the `lab` schema through runSandboxed (BEGIN → query → ROLLBACK), seeding `lab` first. */
  sql(text: string): Promise<QueryResult>;
  /** src/grader.ts grade(), bound to nothing: pass `sql` as its runner. */
  grade(run: (sql: string) => Promise<QueryResult>, solution: string, player: string, ordered: boolean): Promise<GradeResult>;
  /** One sentence for a failed grade (src/ui/tryPreview.ts verdictText). */
  verdict(r: Exclude<GradeResult, { ok: true }>): string;
}

/**
 * Postgres on the existing `lab` schema (the shop chain, seeded lazily): one statement, rolled back, so `setup` cannot run
 * here; `check: rows` and `catalog` are graded by grade() like a General drill, `plan`/`doc` are `unsupported`.
 */
export function pgLabRunner(env: LabEnv): LabRunner {
  return {
    prepare: async (lab) => {
      if (lab.setup) throw new Error('unsupported: lab.setup needs the Postgres lab engine (ENG-PGLAB)');
    },
    run: (_lab, code) => env.sql(code),
    check: async (lab, step, code) => {
      if (lab.setup || (step.check !== 'rows' && step.check !== 'catalog')) return { ok: false, reason: 'unsupported' };
      const r = await env.grade(env.sql, step.solution, code, step.ordered);
      return r.ok ? r : { ok: false, reason: r.reason === 'error' ? 'error' : 'wrong', message: env.verdict(r) };
    },
  };
}

/** Engine → its runner, loaded on the first lab of that engine. An engine without one shows its labs read-only. */
export const LAB_RUNNERS: Partial<Record<EngineId, (env: LabEnv) => Promise<LabRunner>>> = {
  postgres: async (env) => {
    // A lab without `setup` reads the shop chain on `lab`; one with `setup` runs on ENG-PGLAB's own worker (fresh database per
    // script, extensions on demand, rows/plan/catalog checks, L230), loaded only then.
    const onLab = pgLabRunner(env);
    let script: Promise<LabRunner> | undefined;
    const pick = (lab: Lab): Promise<LabRunner> =>
      lab.setup ? (script ??= import('./pglab/runner').then((m) => m.pgScriptRunner(env)).catch((e: unknown) => { script = undefined; throw e; })) : Promise.resolve(onLab);
    return {
      prepare: async (lab) => (await pick(lab)).prepare(lab),
      run: async (lab, code) => (await pick(lab)).run(lab, code),
      check: async (lab, step, code) => (await pick(lab)).check(lab, step, code),
    };
  },
};
