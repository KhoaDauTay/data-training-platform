import { PGlite } from '@electric-sql/pglite';
import { initDb } from '../src/db/init';
import { runSandboxed, type QueryResult } from '../src/db/run';

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await initDb(db);
  return db;
}

let shared: Promise<PGlite> | undefined;
/** One seeded DB per test file (Vitest isolates modules per file). */
export function seededDb(): Promise<PGlite> {
  shared ??= freshDb();
  return shared;
}

export async function runner(): Promise<(sql: string) => Promise<QueryResult>> {
  const db = await seededDb();
  return (sql) => runSandboxed(db, sql);
}
