import type { PGlite } from '@electric-sql/pglite';
import lab from './lab.sql?raw';
import { SCHEMAS, type SchemaId } from '../domains';
import { SANDBOX_SETUP_SQL } from './import';

/**
 * Plan 8a D8a-3: the `lab` schema (src/db/lab.sql, the General drills' shop data) is seeded lazily, on the first `ensure`
 * request, never at boot. Imported only by the worker and the tests, so lab.sql stays out of the main bundle.
 */
const seeded = new WeakMap<PGlite, Set<SchemaId>>();

/** Seeds `id` once per DB. The game schema is always there. A failed seed drops the half-built schema and restores the session search_path. */
export async function ensureSchema(db: PGlite, id: SchemaId, source: string = lab): Promise<void> {
  if (id === 'game') return;
  const done = seeded.get(db) ?? new Set<SchemaId>();
  seeded.set(db, done);
  if (done.has(id)) return;
  const name = SCHEMAS[id];
  try {
    await db.exec(`CREATE SCHEMA ${name}; SET search_path TO ${name};`);
    await db.exec(source);
    await db.exec(SANDBOX_SETUP_SQL);
  } catch (e) {
    await db.exec(`DROP SCHEMA IF EXISTS ${name} CASCADE; ${SANDBOX_SETUP_SQL}`);
    throw e;
  }
  done.add(id);
}
