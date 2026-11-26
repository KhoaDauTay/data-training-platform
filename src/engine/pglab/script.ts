/**
 * ENG-PGLAB (L230): the script contract of the Postgres lab runtime. Types only, so main can import it for free.
 * ENG-CORE's LabRunner (src/engine/labs.ts: prepare/run/check) sits on top of this through runner.ts.
 * A lab is a script of statements run in order on a fresh throwaway database (PgLabClient: its own worker and PGlite,
 * never the game DB), so VACUUM, CHECKPOINT, ANALYZE and several transactions work; the checks run on the results.
 */
import type { SqlErrorInfo } from '../../db/run';
import type { GradeResult } from '../../grader';

/** PGlite 0.5.16 contrib extensions a lab may load (db-engine-knowledge §1.2: each one measured to load and run). */
export type PgExtension =
  | 'pageinspect' | 'pg_visibility' | 'amcheck' | 'pg_walinspect' | 'pg_buffercache' | 'pg_freespacemap'
  | 'bloom' | 'btree_gin' | 'btree_gist' | 'pg_trgm' | 'pg_stat_statements' | 'ltree' | 'pgcrypto' | 'cube' | 'earthdistance'
  | 'postgis'; // L711: from @electric-sql/pglite-postgis 0.2.16, not contrib

/** One statement (PGlite runs exactly one per step). `expectError` = the SQLSTATE this step must fail with (e.g. 25001). */
export type ScriptStep = string | { sql: string; expectError?: string };

/** Assertions on a step's result (`step` = 0-based index into `steps`). Run in the lab worker. */
export type ScriptCheck =
  /** The step's rows equal `rows` by column position (grader.compareResults: multiset, or sequence when `ordered`). */
  | { kind: 'rows'; step: number; rows: unknown[][]; ordered?: boolean }
  /**
   * The step is `EXPLAIN (FORMAT JSON …)`: some plan node has type `node` (and `relation`/`index` when given) and every
   * `detail` field (e.g. `{ 'Heap Fetches': 0 }`, needs ANALYZE) — or, with `absent`, no such node exists.
   */
  | { kind: 'plan'; step: number; node: string; relation?: string; index?: string; detail?: Record<string, unknown>; absent?: boolean }
  /**
   * Counts the step's rows whose columns equal `where` (all of them; values compared like the grader, so 2 = '2').
   * Passes when that count is `count`, within `min`/`max`, equals every row (`all`, at least one row), or is ≥ 1 when
   * none is given. E.g. a HOT redirect: `heap_page_items` + `{ where: { lp_flags: 2 }, min: 1 }`.
   */
  | { kind: 'catalog'; step: number; where?: Record<string, unknown>; count?: number; min?: number; max?: number; all?: boolean };

export interface LabScript {
  extensions?: PgExtension[];
  /**
   * Content SQL run before the steps, split into statements that each run on their own (so VACUUM works here too); no
   * results kept. A `CREATE EXTENSION x` of a listed extension is skipped (already created). A failure = `setupError`.
   */
  setup?: string;
  steps: ScriptStep[];
  checks?: ScriptCheck[];
  /** Hard limit for the whole lab after the runtime is up (fresh database + steps); then the worker is terminated. */
  timeoutMs?: number;
}

export interface LabNotice { severity: string; message: string; code?: string }

export interface StepResult {
  sql: string;
  /** `skipped`: an earlier step did not do what the script expected, so the rest did not run. */
  status: 'ok' | 'error' | 'skipped';
  columns: string[];
  /** Postgres type OID per column. */
  types: number[];
  rows: unknown[][];
  truncated?: true;
  /** NOTICE/INFO/WARNING messages the statement raised (VACUUM VERBOSE, RAISE NOTICE…), Postgres' own text. */
  notices: LabNotice[];
  ms: number;
  command?: string;
  /** Postgres error fields (`code` = SQLSTATE); `message` only for a non-Postgres failure. */
  error?: SqlErrorInfo;
}

export type CheckResult =
  | { ok: true }
  | { ok: false; why: 'skipped' | 'notPlan' | 'noNode' | 'column' | 'count'; matched?: number }
  | { ok: false; why: 'rows'; grade: GradeResult };

export interface ScriptResult {
  steps: StepResult[];
  checks: CheckResult[];
  /** Every step did what the script expected and every check passed. */
  ok: boolean;
  /** First step that failed unexpectedly, or succeeded where `expectError` was set. */
  failedStep?: number;
  /** A setup statement failed: `sql` is that statement; no step ran. */
  setupError?: SqlErrorInfo & { sql: string };
  /** Fresh database + extensions, before the first step. */
  bootMs: number;
  ms: number;
}

export interface ScriptRunner {
  run(script: LabScript): Promise<ScriptResult>;
}
