import type { PGlite } from '@electric-sql/pglite';
import lab from './lab.sql?raw';
import { SCHEMAS, type SchemaId } from '../domains';
import { SANDBOX_SETUP_SQL } from './import';

/**
 * Schemas seeded lazily, on the first `ensure` request, never at boot (v6 F7): `game` (Logistics, v12.0 P1; its SQL is
 * its own chunk, src/db/gameSeed.ts), `lab` (Plan 8a D8a-3, the General drills' shop data) and `ecom` (Plan 9, the
 * e-commerce domain; chunk src/db/ecomSeed.ts). Imported only by the worker and the tests, so the seed SQL stays out of
 * the main bundle.
 */
const LAZY_SEEDS: Partial<Record<SchemaId, () => Promise<string[]>>> = {
  game: async () => {
    const m = await import('./gameSeed');
    return [m.schema, m.seed];
  },
  lab: async () => [lab],
  ecom: async () => {
    const m = await import('./ecomSeed');
    return [m.schema, m.seed];
  },
};
const seeded = new WeakMap<PGlite, Set<SchemaId>>();

/**
 * Seeds `id` once per DB, each file with only its schema on the path. A failed seed
 * drops the half-built schema and restores the session search_path. `source` replaces the seed files (tests only).
 */
export async function ensureSchema(db: PGlite, id: SchemaId, source?: string): Promise<void> {
  const load = LAZY_SEEDS[id];
  if (!load) return;
  const done = seeded.get(db) ?? new Set<SchemaId>();
  seeded.set(db, done);
  if (done.has(id)) return;
  const name = SCHEMAS[id];
  try {
    const files = source === undefined ? await load() : [source];
    await db.exec(`CREATE SCHEMA ${name}; SET search_path TO ${name};`);
    for (const sql of files) await db.exec(sql);
    await db.exec(SANDBOX_SETUP_SQL);
  } catch (e) {
    await db.exec(`DROP SCHEMA IF EXISTS ${name} CASCADE; ${SANDBOX_SETUP_SQL}`);
    throw e;
  }
  done.add(id);
}
