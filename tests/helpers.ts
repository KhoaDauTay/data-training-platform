import { PGlite } from '@electric-sql/pglite';
import { initDb } from '../src/db/init';
import { ensureSchema } from '../src/db/lab';
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

/** The e-commerce schema on the shared test DB (Plan 9): seeded once per file, queries run with search_path ecom, sandbox. */
export async function ecomRunner(): Promise<(sql: string) => Promise<QueryResult>> {
  const db = await seededDb();
  await ensureSchema(db, 'ecom');
  return (sql) => runSandboxed(db, sql, undefined, { schema: 'ecom' });
}
