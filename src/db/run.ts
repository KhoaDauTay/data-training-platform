import type { PGlite } from '@electric-sql/pglite';

export interface QueryResult {
  columns: string[];
  /** Postgres type OID per column (1082 = date, 1114 = timestamp, 1700 = numeric...). */
  types: number[];
  rows: unknown[][];
}

/**
 * Runs exactly one statement inside BEGIN … ROLLBACK so players can never change data.
 * PGlite rejects multi-statement input, so a player cannot smuggle a COMMIT + DML pair.
 */
export async function runSandboxed(db: PGlite, sql: string): Promise<QueryResult> {
  await db.exec('BEGIN');
  try {
    const r = await db.query<unknown[]>(sql, [], { rowMode: 'array' });
    return {
      columns: r.fields.map((f) => f.name),
      types: r.fields.map((f) => f.dataTypeID),
      rows: r.rows,
    };
  } finally {
    await db.exec('ROLLBACK');
  }
}
