import type { QueryResult } from '../../db/run';
import type { GradeResult } from '../../grader';
import type { Lab, LabStep } from '../content';
import { perfVerdict, planLines, type LabEnv, type LabRunner, type LabVerdict } from '../labs';
import { callsOf, compileStep, DbtError, isDbtLab } from '../stack/dbt';
import { stackText } from '../stack/text';
import { PgLabClient } from './client';
import type { PgExtension } from './script';
import { createdIn } from './split';

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
  slow?: LabEnv['slow'];
  /** v45: the language of the dbt lab's own sentences (src/engine/stack/text.ts); VI when absent. */
  lang?: LabEnv['lang'];
}

const KNOWN: readonly PgExtension[] = ['pageinspect', 'pg_visibility', 'amcheck', 'pg_walinspect', 'pg_buffercache', 'pg_freespacemap', 'bloom', 'btree_gin', 'btree_gist', 'pg_trgm', 'pg_stat_statements', 'ltree', 'pgcrypto', 'cube', 'earthdistance', 'postgis',
  'citext', 'fuzzystrmatch', 'unaccent', 'uuid-ossp', 'hstore', 'tablefunc', 'vector'];
/** Functions → the extension that defines them (a step may call one the setup did not create). */
const BY_FUNCTION: [RegExp, PgExtension][] = [
  [/\b(get_raw_page|heap_page_items|heap_tuple_infomask_flags|page_header|bt_metap|bt_page_items|bt_page_stats|brin_page_items|brin_metapage_info|brin_revmap_data|gin_metapage_info|gin_page_opaque_info|gin_leafpage_items|hash_page_items|fsm_page_contents)\s*\(/i, 'pageinspect'],
  [/\b(bt_index_check|bt_index_parent_check|verify_heapam|gin_index_check)\s*\(/i, 'amcheck'],
  [/\bpg_get_wal_[a-z_]+\s*\(/i, 'pg_walinspect'],
  [/\bpg_stat_statements\b/i, 'pg_stat_statements'],
  [/\bpg_visibility(_map(_summary)?)?\s*\(/i, 'pg_visibility'],
  [/\bpg_buffercache\b/i, 'pg_buffercache'],
  [/\bpg_freespace\s*\(/i, 'pg_freespacemap'],
  [/\bST_[A-Za-z0-9_]+\s*\(/i, 'postgis'],
  // v43 (L723–L724): the Extensions shelf. Only names no other extension and no core function uses; `<->` is shared by
  // PostGIS, pg_trgm and cube, so pgvector is found by its type and its own operators.
  [/\b(similarity|word_similarity|strict_word_similarity|show_trgm)\s*\(/i, 'pg_trgm'],
  [/\b(levenshtein|levenshtein_less_equal|soundex|difference|metaphone|dmetaphone|dmetaphone_alt|daitch_mokotoff)\s*\(/i, 'fuzzystrmatch'],
  [/\bunaccent\s*\(/i, 'unaccent'],
  [/\buuid_(generate_v[1345](mc)?|ns_(url|dns|oid|x500)|nil)\s*\(/i, 'uuid-ossp'],
  [/\bcrosstab[0-9]*\s*\(|\bconnectby\s*\(|\bnormal_rand\s*\(/i, 'tablefunc'],
  [/\b(crypt|gen_salt|digest|hmac|pgp_sym_encrypt|pgp_sym_decrypt|pgp_pub_encrypt|pgp_pub_decrypt|armor|dearmor|gen_random_bytes)\s*\(/i, 'pgcrypto'],
  [/\b(nlevel|subpath|subltree|lca|text2ltree|ltree2text)\s*\(|::\s*l(tree|query|txtquery)\b/i, 'ltree'],
  [/::\s*citext\b|\bcitext\b(?!\s*\()/i, 'citext'],
  [/::\s*hstore\b|\bhstore\s*\(/i, 'hstore'],
  [/\b(vector|halfvec|sparsevec)\s*\(\s*\d|::\s*(vector|halfvec|sparsevec)\b|<=>|<#>|<\+>|\b(vector_cosine_ops|vector_l2_ops|vector_ip_ops)\b/i, 'vector'],
];
export function extensionsOf(...sql: (string | undefined)[]): PgExtension[] {
  const text = sql.filter(Boolean).join('\n');
  const named = [...text.matchAll(/\bCREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w-]+)"?/gi)].map((m) => m[1].toLowerCase() as PgExtension); // v43: "uuid-ossp" keeps its hyphen
  const used = BY_FUNCTION.filter(([re]) => re.test(text)).map(([, x]) => x);
  // earthdistance needs cube first
  const all = [...new Set([...named, ...used])].filter((x) => KNOWN.includes(x));
  return all.sort((a, b) => (a === 'cube' ? -1 : b === 'cube' ? 1 : 0));
}

/**
 * v43 (L725): the extensions a lab's own steps install (plain `CREATE EXTENSION x` in a Solution, not in setup). They are
 * loaded but never created at boot, in every run of the lab, so a player who skips the install step does not get it.
 */
export const loadOnlyOf = (lab: Lab): string[] => {
  const inSetup = createdIn(lab.setup ?? '', false);
  return [...createdIn(lab.steps.map((s) => s.solution).join('\n'), true)].filter((x) => !inSetup.has(x));
};

/** A statement that only reads (its replay would change nothing). */
const reads = (sql: string): boolean => /^\s*(\(\s*)?(select|with|explain|table|values|show)\b/i.test(sql.replace(/^\s*(--[^\n]*\n\s*)*/, ''));
/** The earlier steps' solutions that change the database, in order (DDL, VACUUM, ANALYZE, DML). */
export const replayOf = (lab: Lab, step: number | undefined): string[] =>
  (step === undefined ? [] : lab.steps.slice(0, step)).flatMap((s, j) =>
    (isDbtLab(lab.steps) ? (s.model || !reads(s.solution) ? compileStep(lab.setup, lab.steps, j, s.solution) : []) : reads(s.solution) ? [] : [s.solution]));
/** v45 (L742): a dbt lab compiles step `i`'s code (a model build may be several statements); any other lab runs it as written. */
const stmtsOf = (lab: Lab, step: number | undefined, code: string): string[] =>
  step !== undefined && isDbtLab(lab.steps) ? compileStep(lab.setup, lab.steps, step, code) : [code];

/**
 * What a DDL step left behind, one row per object: index definitions, columns, constraints, views, statistics, and (v27
 * R3) schemas with their ACL, functions and procedures (definition + ACL; not those an extension installs, so the probe stays under MAX_LAB_ROWS), triggers, table and column ACLs, roles, memberships and
 * default privileges, in every non-system schema; v35 (L550, D3): row-level security policies, the RLS/FORCE flags,
 * relation options (`security_invoker`, `fillfactor`), partition keys and bounds, role settings, `BYPASSRLS` and connection
 * limits (only non-default state, so the probe stays small). A `catalog` step
 * whose statement is not a read is graded on this (the statement itself returns no rows).
 */
export const CATALOG_PROBE = `SELECT * FROM (
  SELECT 'index' AS kind, schemaname || '.' || indexname AS name, indexdef AS def FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  UNION ALL SELECT 'column', table_schema || '.' || table_name || '.' || column_name, data_type || ' ' || is_nullable || ' ' || coalesce(column_default, '') FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  UNION ALL SELECT 'constraint', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace::regnamespace::text NOT IN ('pg_catalog', 'information_schema')
  UNION ALL SELECT 'view', schemaname || '.' || viewname, definition FROM pg_views WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  UNION ALL SELECT 'matview', schemaname || '.' || matviewname, definition FROM pg_matviews
  UNION ALL SELECT 'statistics', stxname::text, pg_get_statisticsobjdef(oid) FROM pg_statistic_ext
  UNION ALL SELECT 'schema', nspname::text, coalesce(nspacl::text, '') FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
  UNION ALL SELECT 'function', p.oid::regprocedure::text, pg_get_functiondef(p.oid) || coalesce(p.proacl::text, '') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND p.prokind IN ('f', 'p') AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  UNION ALL SELECT 'trigger', tgrelid::regclass::text || '.' || tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal
  UNION ALL SELECT 'acl', c.oid::regclass::text, c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relacl IS NOT NULL AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
  UNION ALL SELECT 'column acl', attrelid::regclass::text || '.' || attname, attacl::text FROM pg_attribute WHERE attacl IS NOT NULL
  UNION ALL SELECT 'role', rolname::text, rolcanlogin::text || rolinherit::text || rolcreaterole::text || rolcreatedb::text || rolbypassrls::text || ' ' || rolconnlimit FROM pg_roles WHERE rolname !~ '^pg_' AND NOT rolsuper
  UNION ALL SELECT 'member', roleid::regrole::text || ' > ' || member::regrole::text, admin_option::text || inherit_option::text FROM pg_auth_members WHERE roleid::regrole::text !~ '^pg_'
  UNION ALL SELECT 'default acl', defaclrole::regrole::text || ' ' || defaclobjtype::text, defaclacl::text FROM pg_default_acl
  UNION ALL SELECT 'policy', schemaname || '.' || tablename || '.' || policyname, permissive || ' ' || cmd || ' ' || roles::text || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '') FROM pg_policies
  UNION ALL SELECT 'rls', c.oid::regclass::text, c.relrowsecurity::text || ' ' || c.relforcerowsecurity::text FROM pg_class c WHERE c.relrowsecurity OR c.relforcerowsecurity
  UNION ALL SELECT 'reloptions', c.oid::regclass::text, c.reloptions::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.reloptions IS NOT NULL AND n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
  UNION ALL SELECT 'partition key', partrelid::regclass::text, pg_get_partkeydef(partrelid) FROM pg_partitioned_table
  UNION ALL SELECT 'partition', c.oid::regclass::text, i.inhparent::regclass::text || ' ' || pg_get_expr(c.relpartbound, c.oid) FROM pg_class c JOIN pg_inherits i ON i.inhrelid = c.oid WHERE c.relispartition AND c.relkind IN ('r', 'p')
  UNION ALL SELECT 'role setting', coalesce(s.setrole::regrole::text, '*') || ' ' || coalesce(d.datname::text, '*'), s.setconfig::text FROM pg_db_role_setting s LEFT JOIN pg_database d ON d.oid = s.setdatabase
) c ORDER BY 1, 2, 3`;

const stepIndex = (lab: Lab, step: LabStep): number => lab.steps.indexOf(step);
const explainSql = (sql: string): string => `EXPLAIN (FORMAT JSON) ${sql.trim().replace(/;\s*$/, '')}`;

export function pgScriptRunner(env: Env, client: Pick<PgLabClient, 'run' | 'reset'> = new PgLabClient()) {
  const lang = (): 'vi' | 'en' => env.lang?.() ?? 'vi';
  /** v45 S-04: a compiler error keeps its code chip and position, with the VI/EN explanation and line:column as its message. */
  const dbtError = (e: unknown, lab: Lab, step: number | undefined): unknown => {
    if (!(e instanceof DbtError)) return e;
    const want = (step !== undefined && lab.steps[step]?.model?.materialized) || 'view';
    const text = stackText(lang(), e.code, { what: '', name: '', list: '-', want, ...e.params });
    return Object.assign(new Error(`${stackText(lang(), 'at', { line: e.line, col: e.col })}: ${text}`), { code: e.code, ...(e.position ? { position: e.position } : {}) });
  };
  /** Setup + replay + `code` (+ `then`); returns the last statement's result. Throws the Postgres error like DbClient (string `code`). */
  const exec = async (lab: Lab, code: string, step: number | undefined, then?: string): Promise<QueryResult> => {
    const replay = replayOf(lab, step);
    let own: string[];
    try {
      own = stmtsOf(lab, step, code);
    } catch (e) {
      throw dbtError(e, lab, step);
    }
    const steps = [...replay, ...own, ...(then ? [then] : [])];
    const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup, ...lab.steps.map((s) => s.solution), code), loadOnly: loadOnlyOf(lab), steps });
    if (r.setupError) throw Object.assign(new Error(r.setupError.message), r.setupError);
    // a compiled statement's error position points into the compiled SQL, not the player's code: drop it
    const bad = r.steps.findIndex((s) => s.error);
    if (bad >= 0) {
      const e = r.steps[bad].error!;
      // v45 S-03: the hidden check read failed (not the player's statement): say so, with the model's real columns
      if (then && bad === steps.length - 1 && isDbtLab(lab.steps) && step !== undefined) throw await afterError(lab, step, code, replay, own, then, e);
      throw Object.assign(new Error(e.message), e, own[0] !== code ? { position: undefined } : {});
    }
    const s = r.steps[r.steps.length - 1];
    return { columns: s.columns, types: s.types, rows: s.rows, ms: s.ms, ...(s.truncated ? { truncated: s.truncated } : {}) };
  };
  const afterError = async (lab: Lab, step: number, code: string, replay: string[], own: string[], then: string, e: { message: string; code?: string }): Promise<Error> => {
    const m = lab.steps[step].model;
    const rel = m ? `${m.layer}.${m.name}` : (/\bFROM\s+([a-z_]+\.[a-z_]+)/i.exec(then)?.[1] ?? '?');
    let cols = '';
    if (m) {
      const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup, code), loadOnly: loadOnlyOf(lab), steps: [...replay, ...own, `SELECT * FROM ${rel} LIMIT 0`] });
      const last = r.steps[r.steps.length - 1];
      cols = last && !last.error ? last.columns.join(', ') : '';
    }
    const text = stackText(lang(), m && cols ? 'afterMissing' : 'afterNoModel', { model: rel, err: e.message, cols, sql: then.replace(/\s+/g, ' ').trim() });
    return Object.assign(new Error(text), { code: e.code ?? 'ERROR' });
  };
  const plan = async (lab: Lab, sql: string, step?: number): Promise<string[]> =>
    planLines((await exec(lab, explainSql(sql), step)).rows[0]?.[0]).map((l) => l.text);
  const runner: LabRunner & { reset(): void } = {
    prepare: async (lab: Lab): Promise<void> => {
      const r = await client.run({ setup: lab.setup, extensions: extensionsOf(lab.setup, ...lab.steps.map((s) => s.solution)), loadOnly: loadOnlyOf(lab), steps: [] });
      if (r.setupError) throw Object.assign(new Error(r.setupError.message), r.setupError);
    },
    // v45: Run on a dbt model step shows what the model holds (its `after:` read), not the empty CREATE
    // S-02: in a dbt lab any step with `after:` (a sync, a fix) shows that read too, so its effect is visible
    run: (lab, code, step) => exec(lab, code, step, step !== undefined && isDbtLab(lab.steps) ? lab.steps[step]?.after : undefined),
    // the script replays every block above the one run, so it gets more than one lab's LAB_TIMEOUT_MS
    demo: (setup, steps) => client.run({ setup, extensions: extensionsOf(setup, ...steps.map((s) => (typeof s === 'string' ? s : s.sql))), steps, timeoutMs: 60_000 }),
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
      // v45 S-01: a dbt step must use what it teaches: every ref()/source() of the Solution, and the incremental filter
      if (isDbtLab(lab.steps)) {
        const want = callsOf(step.solution), got = callsOf(code);
        if (want && got) {
          const ref = want.refs.find((x) => !got.refs.includes(x));
          const src = want.sources.find((x) => !got.sources.includes(x));
          const why = ref ? stackText(lang(), 'needRef', { name: ref }) : src ? stackText(lang(), 'needSource', { s: src.split('.')[0], t: src.split('.')[1] })
            : want.filter && !got.filter ? stackText(lang(), 'needFilter') : undefined;
          if (why) {
            // v46 (L836): the rows first: a broken or wrong answer keeps its own verdict, and "the result is right, but…" is said
            // only when it is (the text starts with those words)
            const g = await env.grade((sql) => exec(lab, sql, i, step.after), step.solution, code, step.ordered);
            if (!g.ok) return { ok: false, reason: g.reason === 'error' ? 'error' : 'wrong', message: env.verdict(g) };
            return { ok: false, reason: 'wrong', message: why };
          }
        }
      }
      if (step.after) {
        // v27 R3: GRANT, CALL, TRUNCATE, a write… are graded on the read that follows them, not on their (empty) result
        const g = await env.grade((sql) => exec(lab, sql, i, step.after), step.solution, code, step.ordered);
        return g.ok ? { ok: true } : { ok: false, reason: g.reason === 'error' ? 'error' : 'wrong', message: env.verdict(g) };
      }
      if (step.check === 'catalog' && !reads(step.solution)) {
        // DDL returns no rows: compare what it left in the catalog, then (with `target`) the plan of the query it is for.
        const g = await env.grade((sql) => (sql === '§mine' ? exec(lab, code, i, CATALOG_PROBE) : exec(lab, step.solution, i, CATALOG_PROBE)), '§want', '§mine', true);
        if (!g.ok) return g.reason === 'error' ? { ok: false, reason: 'error', message: env.verdict(g) } : { ok: false, reason: 'wrong', why: 'catalog' };
        return { ok: true };
      }
      const g = await env.grade((sql) => exec(lab, sql, i), step.solution, code, step.ordered);
      if (!g.ok) return { ok: false, reason: g.reason === 'error' ? 'error' : 'wrong', message: env.verdict(g) };
      const json = async (sql: string) => (await exec(lab, explainSql(sql), i)).rows[0]?.[0];
      return (await perfVerdict(env, step, async () => [await json(step.solution), await json(code)])) ?? g;
    },
    reset: () => client.reset(),
  };
  return runner;
}
