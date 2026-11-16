import type { PGlite } from '@electric-sql/pglite';

/** Rows posted from the worker are capped here; the UI shows far fewer (MAX_ROWS = 500). */
export const MAX_ROWS_WORKER = 50_000;

export interface QueryResult {
  columns: string[];
  /** Postgres type OID per column (1082 = date, 1114 = timestamp, 1700 = numeric...). */
  types: number[];
  rows: unknown[][];
  /** Set only when the query returned more than MAX_ROWS_WORKER rows and `rows` was cut. */
  truncated?: true;
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
 * Runs exactly one statement inside BEGIN … ROLLBACK so players can never change data.
 * PGlite rejects multi-statement input, so a player cannot smuggle a COMMIT + DML pair.
 * Postgres errors are rethrown as SqlError.
 */
export async function runSandboxed(db: PGlite, sql: string, maxRows = MAX_ROWS_WORKER): Promise<QueryResult> {
  await db.exec('BEGIN');
  try {
    const r = await db.query<unknown[]>(sql, [], { rowMode: 'array' });
    const result: QueryResult = {
      columns: r.fields.map((f) => f.name),
      types: r.fields.map((f) => f.dataTypeID),
      rows: r.rows.length > maxRows ? r.rows.slice(0, maxRows) : r.rows,
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
