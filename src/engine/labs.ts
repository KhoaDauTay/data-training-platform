import type { QueryResult } from '../db/run';
import type { GradeResult } from '../grader';
import type { slowVerdict } from '../planCheck';
import { onPg, type EngineId, type EngineLesson, type Lab, type LabStep } from './content';
import type { Capacity, ReadMode } from './dynamo/cost';
import type { ScriptResult, ScriptStep } from './pglab/script';

/**
 * ENG-CORE (L221): the seam every engine's lab runtime plugs into. The lesson page (src/ui/engineView.ts) calls `prepare`
 * once per lesson visit, then `run` (show the player's result, never graded) and `check` (grade one lab step).
 * Runners are loaded lazily through LAB_RUNNERS (integration L248): `postgres` = the shop chain on `lab` or ENG-PGLAB's
 * script runner, `mongodb` = ENG-MONGO's MongoLabClient (src/engine/mongo/runner.ts), `dynamodb` = ENG-DYNAMO's client
 * (src/engine/dynamo/runner.ts). Same rule as every lazy chunk: a runner imports only types from main modules and gets
 * main values through `LabEnv`.
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
  /** v25 MongoDB "Pipeline từng bước": each prefix of the aggregate the player ran, its document count and first documents. */
  pipeline?: { stage: string; n: number; head: unknown[] }[];
  /**
   * v26 DynamoDB (L380): what the "Partition / Chi phí" panel draws. `capacity` = the engine's ConsumedCapacity (measured);
   * `bytes` = each returned item's size by the AWS rules (for the formula); `pk` = the partition key of the table or index read;
   * `lastKey` = LastEvaluatedKey (another page exists); `index` = IndexName.
   */
  dynamo?: { op: string; mode: ReadMode; write: boolean; capacity?: Capacity; bytes: number[]; pk?: string; index?: string; lastKey?: Record<string, unknown>; scanned?: number };
}
/** A table for the Result view (QueryResult-compatible: `types` = Postgres type OIDs, empty for a document engine) + meta. */
export type LabOutput = QueryResult & { meta?: LabMeta };
/**
 * `unsupported`: this runner cannot do the step's check kind or the lab's setup (the page says so; nothing is graded).
 * `why` (L248): a stable code the page translates (`why.<code>` in src/i18n/engine.ts) with `params`; `message` is ready text.
 */
export type LabVerdict = { ok: true; tip?: string } | { ok: false; reason: 'wrong' | 'error' | 'unsupported'; message?: string; why?: string; params?: Record<string, string | number> };

/** A plan as nested lines (`Seq Scan on orders`), root first; what a predict's "see the real plan" shows. */
export interface PlanLine { depth: number; text: string; node: string; relation?: string; index?: string }

export interface LabRunner {
  /** Once per lesson visit, before the first run: e.g. apply `lab.setup`. Throws → the page shows the error and a retry. */
  prepare(lab: Lab): Promise<void>;
  /** Runs the player's code and returns its output (throws on an engine error: the page shows it like a SQL error). `step` = the
   * step the editor belongs to (Postgres replays the earlier steps' DDL first). */
  run(lab: Lab, code: string, step?: number): Promise<LabOutput>;
  /** Grades one step: `check` says what is compared (rows, plan, catalog, doc). */
  check(lab: Lab, step: LabStep, code: string): Promise<LabVerdict>;
  /** Postgres only: the real plan of `sql` on the lab's data (EXPLAIN (FORMAT JSON)), for a predict's answer. */
  explain?(lab: Lab, sql: string): Promise<PlanLine[]>;
  /** Postgres only (v30.1, L480): a lesson's runnable examples as one script on a fresh lab database (src/engine/demo.ts). */
  demo?(setup: string | undefined, steps: ScriptStep[]): Promise<ScriptResult>;
}

/** Main-bundle values a runner may use (passed by the engine UI chunk). */
export interface LabEnv {
  /** One statement on the `lab` schema through runSandboxed (BEGIN → query → ROLLBACK), seeding `lab` first. */
  sql(text: string): Promise<QueryResult>;
  /** src/grader.ts grade(), bound to nothing: pass `sql` as its runner. */
  grade(run: (sql: string) => Promise<QueryResult>, solution: string, player: string, ordered: boolean): Promise<GradeResult>;
  /** One sentence for a failed grade (src/ui/tryPreview.ts verdictText). */
  verdict(r: Exclude<GradeResult, { ok: true }>): string;
  /** The UI language, for the few sentences a runner writes itself (timeouts, input errors). */
  lang(): 'vi' | 'en';
  /** src/planCheck.ts slowVerdict (v24 `perf:` bar), passed in so a runner chunk never value-imports a main module. */
  slow?: typeof slowVerdict;
}

/**
 * v24 (L340): a right answer on a `perf:` step is still refused when slowVerdict blocks it. `plans` = EXPLAIN (FORMAT JSON) of
 * the Solution and the answer on the same database. Undefined = passed.
 */
export async function perfVerdict(env: Pick<LabEnv, 'slow'>, step: LabStep, plans: () => Promise<[unknown, unknown]>): Promise<LabVerdict | undefined> {
  if (!step.perf || !env.slow) return undefined;
  const v = env.slow(...await plans(), step.perf);
  return v?.block ? { ok: false, reason: 'wrong', why: v.indexLost ? 'slowIndex' : 'slow', params: { cost: v.cost, sol: v.solution, ratio: v.ratio, table: v.indexLost ?? step.perf.table } } : undefined;
}

/** EXPLAIN (FORMAT JSON) output → plan lines (the JSON is the first cell; PGlite may give it as text). */
export function planLines(json: unknown): PlanLine[] {
  type N = { 'Node Type'?: string; 'Relation Name'?: string; 'Index Name'?: string; Plans?: N[] };
  const v = typeof json === 'string' ? JSON.parse(json) as unknown : json;
  const root = (Array.isArray(v) ? v[0] : undefined) as { Plan?: N } | undefined;
  const out: PlanLine[] = [];
  const walk = (n: N, depth: number) => {
    const node = n['Node Type'] ?? '?';
    const relation = n['Relation Name'];
    const index = n['Index Name'];
    out.push({ depth, node, relation, index, text: `${node}${index ? ` using ${index}` : ''}${relation ? ` on ${relation}` : ''}` });
    n.Plans?.forEach((c) => walk(c, depth + 1));
  };
  if (root?.Plan) walk(root.Plan, 0);
  return out;
}
const explainSql = (sql: string): string => `EXPLAIN (FORMAT JSON) ${sql.trim().replace(/;\s*$/, '')}`;

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
      if (!r.ok) return { ok: false, reason: r.reason === 'error' ? 'error' : 'wrong', message: env.verdict(r) };
      const plan = async (sql: string) => (await env.sql(explainSql(sql))).rows[0]?.[0];
      return (await perfVerdict(env, step, async () => [await plan(step.solution), await plan(code)])) ?? r;
    },
    explain: async (_lab, sql) => planLines((await env.sql(explainSql(sql))).rows[0]?.[0]),
  };
}

/**
 * Whether a lab step can be graded in the browser (it then counts toward the lesson's completion). Postgres: `doc` never;
 * `plan` only with `setup` (ENG-PGLAB); rows/catalog always. MongoDB grades `doc`; DynamoDB `doc` and `catalog` (its runner compares any step, L299). A lesson
 * marked `runtime: docs` never runs here. Update with each new runner.
 */
export const gradable = (l: EngineLesson, step: LabStep): boolean =>
  !!LAB_RUNNERS[l.engine] && l.runtime !== 'docs'
  && (onPg(l.engine) ? step.check !== 'doc' && !(step.check === 'plan' && !l.lab?.setup) : step.check === 'doc' || (l.engine === 'dynamodb' && step.check === 'catalog'));

/**
 * The one honest runtime label beside a lesson's title (product-design-db-engine §3.6, checklist L1), derived from what
 * actually executes: a lesson that runs here (a lab, or a Postgres predict's real plan) names its runner; one that does
 * not is a diagram when it has one, else it is read from the official docs.
 */
export type Honest = 'pg' | 'mingo' | 'dynoxide' | 'diagram' | 'docs';
const RUNS: Record<EngineId, Honest> = { postgres: 'pg', mongodb: 'mingo', dynamodb: 'dynoxide', design: 'pg', stack: 'pg', olap: 'pg' };
export const honestOf = (l: Pick<EngineLesson, 'engine' | 'runtime' | 'viz' | 'lab' | 'predict'>): Honest =>
  l.runtime !== 'docs' && LAB_RUNNERS[l.engine] && (l.lab || (l.predict && onPg(l.engine))) ? RUNS[l.engine] : l.viz ? 'diagram' : 'docs';

/**
 * L280: the same label from the lesson index alone (no lab/predict in it), for lesson rows: a lesson runs here exactly when
 * it is not `runtime: docs` (tests/engineContent.test.ts checks both agree on every lesson).
 */
export const honestRow = (l: Pick<EngineLesson, 'engine' | 'runtime' | 'viz'>): Honest =>
  l.runtime !== 'docs' && LAB_RUNNERS[l.engine] ? RUNS[l.engine] : l.viz ? 'diagram' : 'docs';

/** Engine → its runner, loaded on the first lab of that engine. An engine without one shows its labs read-only. */
export const LAB_RUNNERS: Partial<Record<EngineId, (env: LabEnv) => Promise<LabRunner>>> = {
  postgres: async (env) => {
    // A lab without `setup` reads the shop chain on `lab`; one with `setup` runs on ENG-PGLAB's own worker (fresh database per
    // script, extensions on demand, rows/plan/catalog checks, L230), loaded only then.
    const onLab = pgLabRunner(env);
    let script: Promise<LabRunner> | undefined;
    const lab$ = (): Promise<LabRunner> => (script ??= import('./pglab/runner').then((m) => m.pgScriptRunner(env)).catch((e: unknown) => { script = undefined; throw e; }));
    const pick = (lab: Lab): Promise<LabRunner> => (lab.setup ? lab$() : Promise.resolve(onLab));
    return {
      demo: async (setup, steps) => (await lab$()).demo!(setup, steps),
      prepare: async (lab) => (await pick(lab)).prepare(lab),
      run: async (lab, code, step) => (await pick(lab)).run(lab, code, step),
      check: async (lab, step, code) => (await pick(lab)).check(lab, step, code),
      explain: async (lab, sql) => (await pick(lab)).explain!(lab, sql),
    };
  },
  mongodb: async (env) => (await import('./mongo/runner')).mongoRunner(env),
  dynamodb: async (env) => (await import('./dynamo/runner')).dynamoRunner(env),
};
LAB_RUNNERS.design = LAB_RUNNERS.stack = LAB_RUNNERS.olap = LAB_RUNNERS.postgres; // v47 (L990): olap too // v45 (L742): stack labs too // v28 R4 (L420): design labs are PostgreSQL labs (`lab` schema, or the lab runtime with `setup`)
