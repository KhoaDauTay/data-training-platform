import type { PGlite } from '@electric-sql/pglite';
import { SANDBOX_SETUP_SQL } from './import';
import { ensureSchema } from './lab';

/**
 * v12.0 P1: the worker boots empty: only `sandbox` and the session search_path `logistics, sandbox` (a schema that does not
 * exist yet is skipped by Postgres). Each domain's tables come later through ensureSchema (`game` = Logistics).
 */
export const initEngine = (db: Pick<PGlite, 'exec'>): Promise<unknown> => db.exec(SANDBOX_SETUP_SQL);

/**
 * Engine + Logistics, as the app booted before v12.0. Tests only (tests/helpers.ts). ensureSchema('game') runs the same
 * statements the old initDb did (CREATE SCHEMA logistics; SET search_path TO logistics; schema.sql; seed.sql;
 * SANDBOX_SETUP_SQL), so the md5 pins in tests/seed.test.ts are unchanged.
 */
export async function initDb(db: PGlite): Promise<void> {
  await initEngine(db);
  await ensureSchema(db, 'game');
}
