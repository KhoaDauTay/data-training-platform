import type { PGlite } from '@electric-sql/pglite';
import { isCreateIndex } from '../planCheck';
import { SCHEMAS, type SchemaId } from '../domains';

/** Rows posted from the worker are capped here; the UI shows far fewer (MAX_ROWS = 500). */
export const MAX_ROWS_WORKER = 50_000;

export interface QueryResult {
  columns: string[];
  /** Postgres type OID per column (1082 = date, 1114 = timestamp, 1700 = numeric...). */
  types: number[];
  rows: unknown[][];
  /** Set only when the query returned more than MAX_ROWS_WORKER rows and `rows` was cut. */
  truncated?: true;
  /** Time the statement took inside the worker (ms, rounded), without the queue wait. Plan 5: the 2 s pin rule. */
  ms?: number;
}

/** Postgres error fields. `message` is Postgres' own text and is never translated. */
export interface SqlErrorInfo {
  message: string;
  /** 1-based character offset into the SQL that was run. */
  position?: number;
  /** SQLSTATE, e.g. 42703. */
  code?: string;
  hint?: string;
}

export class SqlError extends Error implements SqlErrorInfo {
  name = 'SqlError';
  position?: number;
  code?: string;
  hint?: string;
  constructor(info: SqlErrorInfo) {
    super(info.message);
    this.position = info.position;
    this.code = info.code;
    this.hint = info.hint;
  }
}

/**
 * Postgres error fields of `e`, or undefined when `e` is not a Postgres error.
 * PGlite's error class is minified, so detect it by its string `code` instead of instanceof.
 */
export function sqlErrorInfo(e: unknown): SqlErrorInfo | undefined {
  if (e instanceof SqlError) return { message: e.message, position: e.position, code: e.code, hint: e.hint };
  if (!e || typeof e !== 'object') return undefined;
  const pe = e as { message?: unknown; position?: unknown; code?: unknown; hint?: unknown };
  if (typeof pe.code !== 'string' || typeof pe.message !== 'string') return undefined;
  const position = Number(pe.position);
  return {
    message: pe.message,
    position: Number.isInteger(position) && position > 0 ? position : undefined,
    code: pe.code,
    hint: typeof pe.hint === 'string' ? pe.hint : undefined,
  };
}

/**
 * Plan 8a D8a-4: the schema is chosen per request. Absent = the session path (game schema, then sandbox).
 * `params` (V22-B, L206): bound values for `$1`…, never spliced into the SQL text.
 */
export interface RunOpts { schema?: SchemaId; params?: unknown[] }

/**
 * search_path for one request, right after BEGIN (v6 §4.4). Absent or 'game' = the session path (logistics, sandbox). lab never
 * sees sandbox (a game table name in a drill is 42P01, D8a-4); ecom and fin do, so imported CSVs work in the e-commerce Sandbox
 * (Plan 9 D9-9). Names come from SCHEMAS only.
 */
const REQUEST_PATH: Partial<Record<SchemaId, string>> = { lab: SCHEMAS.lab, ecom: `${SCHEMAS.ecom}, sandbox`, fin: `${SCHEMAS.fin}, sandbox` };
export async function setRequestPath(db: { exec(sql: string): Promise<unknown> }, schema?: SchemaId): Promise<void> {
  const path = schema && REQUEST_PATH[schema];
  if (path) await db.exec(`SET LOCAL search_path TO ${path}`);
}

async function begin(db: PGlite, opts: RunOpts): Promise<void> {
  await db.exec('BEGIN');
  await setRequestPath(db, opts.schema);
}

/**
 * Runs exactly one statement inside BEGIN … ROLLBACK so players can never change data.
 * PGlite rejects multi-statement input, so a player cannot smuggle a COMMIT + DML pair.
 * Postgres errors are rethrown as SqlError.
 */
export async function runSandboxed(db: PGlite, sql: string, maxRows = MAX_ROWS_WORKER, opts: RunOpts = {}): Promise<QueryResult> {
  await begin(db, opts);
  try {
    const t0 = performance.now();
    const r = await db.query<unknown[]>(sql, opts.params ?? [], { rowMode: 'array' });
    const result: QueryResult = {
      columns: r.fields.map((f) => f.name),
      types: r.fields.map((f) => f.dataTypeID),
      rows: r.rows.length > maxRows ? r.rows.slice(0, maxRows) : r.rows,
      ms: Math.round(performance.now() - t0),
    };
    if (r.rows.length > maxRows) result.truncated = true;
    return result;
  } catch (e) {
    const info = sqlErrorInfo(e);
    throw info ? new SqlError(info) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}

/** EXPLAIN ANALYZE executes the statement, so it gets the same BEGIN … ROLLBACK sandbox. */
export async function runExplain(db: PGlite, sql: string, opts: RunOpts = {}): Promise<unknown> {
  await begin(db, opts);
  try {
    const r = await db.query<unknown[]>(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, [], { rowMode: 'array' });
    return r.rows[0][0];
  } catch (e) {
    const info = sqlErrorInfo(e);
    throw info ? new SqlError({ ...info, position: undefined }) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}

/** The index lab's answer: plans of the step's query before and after the player's index (planCheck.ts). */
export interface LabResult { before: unknown; after: unknown }

/**
 * Index lab (chapter 11): EXPLAIN `sql`, create the player's index, EXPLAIN again, all in one transaction that is
 * always rolled back, so the index never outlives the request. `ddl` must be one CREATE INDEX: checked here, in the
 * worker, and sent through query() (one statement only), never exec(). After it ran, pg_class must hold exactly one
 * new relation, an index on `table`, and nothing may have gone; otherwise the lab refuses it (and rolls back).
 */
export async function runLab(db: PGlite, ddl: string, sql: string, table: string, opts: RunOpts = {}): Promise<LabResult> {
  if (!isCreateIndex(ddl)) throw new SqlError({ message: 'only one CREATE INDEX statement is allowed here', code: 'LAB01' });
  const explain = async () => (await db.query<unknown[]>(`EXPLAIN (FORMAT JSON) ${sql}`, [], { rowMode: 'array' })).rows[0][0];
  // The indexed table's bare name: indrelid::regclass::text would read "logistics.container_events" whenever the
  // schema is not on the search_path (v6 §4.3), and Plan 8 sets the path per request.
  const relations = async () => (await db.query<{ oid: string; kind: string; tbl: string | null }>(
    `SELECT c.oid::text AS oid, c.relkind::text AS kind, t.relname::text AS tbl
     FROM pg_class c LEFT JOIN pg_index i ON i.indexrelid = c.oid LEFT JOIN pg_class t ON t.oid = i.indrelid`)).rows;
  await begin(db, opts);
  try {
    const before = await explain();
    const old = await relations();
    await db.query(ddl);
    const now = await relations();
    const known = new Set(old.map((r) => r.oid));
    const added = now.filter((r) => !known.has(r.oid));
    // CREATE INDEX IF NOT EXISTS on a name already taken creates nothing (only a NOTICE).
    if (now.length === old.length && added.length === 0) throw new SqlError({ message: 'no new index was created', code: 'LAB03' });
    if (now.length !== old.length + 1 || added.length !== 1 || added[0].kind !== 'i') {
      throw new SqlError({ message: 'only one CREATE INDEX statement is allowed here', code: 'LAB01' });
    }
    if (added[0].tbl !== table) throw new SqlError({ message: `the index must be on the ${table} table`, code: 'LAB02' });
    return { before, after: await explain() };
  } catch (e) {
    const info = sqlErrorInfo(e);
    throw info ? new SqlError(info) : e;
  } finally {
    await db.exec('ROLLBACK');
  }
}
