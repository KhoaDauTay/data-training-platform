import type { QueryResult } from '../../db/run';
import type { GradeResult } from '../../grader';
import type { Lab, LabStep } from '../content';
import { planLines, type LabRunner, type LabVerdict } from '../labs';
import { PgLabClient } from './client';
import type { PgExtension } from './script';

/**
 * ENG-PGLAB (L230) + integration (L248): ENG-CORE's Postgres LabRunner on the lab runtime, for labs with `setup`.
 * Every call starts from a fresh database: `setup`, then the earlier steps' solutions that change something (a later step
 * may read an index an earlier one created, content/engine/postgres/README.md), then the statement. So setup may
 * VACUUM/ANALYZE and nothing carries over. Extensions = every `CREATE EXTENSION x` in setup plus the ones whose functions
 * the steps call (pageinspect, amcheck, pg_walinspect…), preloaded per lab; the statement itself is then skipped.
 */
interface Env {
  grade(run: (sql: string) => Promise<QueryResult>, solution: string, player: string, ordered: boolean): Promise<GradeResult>;
  verdict(r: Exclude<GradeResult, { ok: true }>): string;
}

const KNOWN: readonly PgExtension[] = ['pageinspect', 'pg_visibility', 'amcheck', 'pg_walinspect', 'pg_buffercache', 'pg_freespacemap', 'bloom', 'btree_gin', 'btree_gist', 'pg_trgm', 'pg_stat_statements', 'ltree', 'pgcrypto', 'cube', 'earthdistance'];
/** Functions → the extension that defines them (a step may call one the setup did not create). */
const BY_FUNCTION: [RegExp, PgExtension][] = [
  [/\b(get_raw_page|heap_page_items|heap_tuple_infomask_flags|page_header|bt_metap|bt_page_items|bt_page_stats|brin_page_items|brin_metapage_info|brin_revmap_data|gin_metapage_info|gin_page_opaque_info|gin_leafpage_items|hash_page_items|fsm_page_contents)\s*\(/i, 'pageinspect'],
  [/\b(bt_index_check|bt_index_parent_check|verify_heapam|gin_index_check)\s*\(/i, 'amcheck'],
  [/\bpg_get_wal_[a-z_]+\s*\(/i, 'pg_walinspect'],
  [/\bpg_stat_statements\b/i, 'pg_stat_statements'],
  [/\bpg_visibility(_map(_summary)?)?\s*\(/i, 'pg_visibility'],
  [/\bpg_buffercache\b/i, 'pg_buffercache'],
  [/\bpg_freespace\s*\(/i, 'pg_freespacemap'],
];
export function extensionsOf(...sql: (string | undefined)[]): PgExtension[] {
  const text = sql.filter(Boolean).join('\n');
  const named = [...text.matchAll(/\bCREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/gi)].map((m) => m[1].toLowerCase() as PgExtension);
  const used = BY_FUNCTION.filter(([re]) => re.test(text)).map(([, x]) => x);
  // earthdistance needs cube first
  const all = [...new Set([...named, ...used])].filter((x) => KNOWN.includes(x));
  return all.sort((a, b) => (a === 'cube' ? -1 : b === 'cube' ? 1 : 0));
}

/** A statement that only reads (its replay would change nothing). */
const reads = (sql: string): boolean => /^\s*(\(\s*)?(select|with|explain|table|values|show)\b/i.test(sql.replace(/^\s*(--[^\n]*\n\s*)*/, ''));
/** The earlier steps' solutions that change the database, in order (DDL, VACUUM, ANALYZE, DML). */
export const replayOf = (lab: Lab, step: number | undefined): string[] =>
  (step === undefined ? [] : lab.steps.slice(0, step)).map((s) => s.solution).filter((s) => !reads(s));

/**
 * What a DDL step left behind, one row per object: index definitions, columns, constraints, views. A `catalog` step
 * whose statement is not a read is graded on this (the statement itself returns no rows).
 */
export const CATALOG_PROBE = `SELECT * FROM (
  SELECT 'index' AS kind, indexname::text AS name, indexdef AS def FROM pg_indexes WHERE schemaname = 'public'
  UNION ALL SELECT 'column', table_name || '.' || column_name, data_type || ' ' || is_nullable || ' ' || coalesce(column_default, '') FROM information_schema.columns WHERE table_schema = 'public'
  UNION ALL SELECT 'constraint', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace = 'public'::regnamespace
  UNION ALL SELECT 'view', viewname::text, definition FROM pg_views WHERE schemaname = 'public'
  UNION ALL SELECT 'statistics', stxname::text, pg_get_statisticsobjdef(oid) FROM pg_statistic_ext
) c ORDER BY 1, 2, 3`;

const stepIndex = (lab: Lab, step: LabStep): number => lab.steps.indexOf(step);
const explainSql = (sql: string): string => `EXPLAIN (FORMAT JSON) ${sql.trim().replace(/;\s*$/, '')}`;

export function pgScriptRunner(env: Env, client: Pick<PgLabClient, 'run' | 'reset'> = new PgLabClient()) {
  /** Setup + replay + `code` (+ `then`); returns the last statement's result. Throws the Postgres error like DbClient (string `code`). */
  const exec = async (lab: Lab, code: string, step: number | undefined, then?: string): Promise<QueryResult> => {
    const replay = replayOf(lab, step);
    const steps = [...replay, code, ...(then ? [then] : [])];
    const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup, ...lab.steps.map((s) => s.solution), code), steps });
    if (r.setupError) throw Object.assign(new Error(r.setupError.message), r.setupError);
    for (const s of r.steps) if (s.error) throw Object.assign(new Error(s.error.message), s.error);
    const s = r.steps[r.steps.length - 1];
    return { columns: s.columns, types: s.types, rows: s.rows, ms: s.ms, ...(s.truncated ? { truncated: s.truncated } : {}) };
  };
  const plan = async (lab: Lab, sql: string, step?: number): Promise<string[]> =>
    planLines((await exec(lab, explainSql(sql), step)).rows[0]?.[0]).map((l) => l.text);
  const runner: LabRunner & { reset(): void } = {
    prepare: async (lab: Lab): Promise<void> => {
      const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup, ...lab.steps.map((s) => s.solution)), steps: [] });
      if (r.setupError) throw Object.assign(new Error(r.setupError.message), r.setupError);
    },
    run: (lab, code, step) => exec(lab, code, step),
    explain: async (lab, sql) => planLines((await exec(lab, explainSql(sql), undefined)).rows[0]?.[0]),
    check: async (lab: Lab, step: LabStep, code: string): Promise<LabVerdict> => {
      const i = stepIndex(lab, step);
      if (step.check === 'doc') return { ok: false, reason: 'unsupported' };
      if (step.check === 'plan') {
        let mine: string[];
        try {
          mine = await plan(lab, code, i);
        } catch (e) {
          return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
        }
        const want = await plan(lab, step.solution, i);
        if (want.join('|') !== mine.join('|')) return { ok: false, reason: 'wrong', why: 'plan', params: { got: mine.join(' → '), want: want.join(' → ') } };
        // the plan is right: the rows must be too (an index-friendly query that answers something else is still wrong)
      }
      if (step.check === 'catalog' && !reads(step.solution)) {
        // DDL returns no rows: compare what it left in the catalog, then (with `target`) the plan of the query it is for.
        const g = await env.grade((sql) => (sql === '§mine' ? exec(lab, code, i, CATALOG_PROBE) : exec(lab, step.solution, i, CATALOG_PROBE)), '§want', '§mine', true);
        if (!g.ok) return g.reason === 'error' ? { ok: false, reason: 'error', message: env.verdict(g) } : { ok: false, reason: 'wrong', why: 'catalog' };
        return { ok: true };
      }
      const g = await env.grade((sql) => exec(lab, sql, i), step.solution, code, step.ordered);
      return g.ok ? g : { ok: false, reason: g.reason === 'error' ? 'error' : 'wrong', message: env.verdict(g) };
    },
    reset: () => client.reset(),
  };
  return runner;
}
