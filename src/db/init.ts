import schema from './schema.sql?raw';
import seed from './seed.sql?raw';
import { GAME_SCHEMA } from '../domains';
import { SANDBOX_SETUP_SQL } from './import';

/**
 * v6 §4.4 S1: the game tables are created in their own schema (public stays empty). schema.sql and seed.sql are unchanged:
 * they use bare names, so the session search_path decides where they go. md5 pins in tests/seed.test.ts are unaffected
 * (row::text carries no schema name).
 */
export async function initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void> {
  await db.exec(`CREATE SCHEMA ${GAME_SCHEMA}; SET search_path = ${GAME_SCHEMA};`);
  await db.exec(schema);
  await db.exec(seed);
  await db.exec(SANDBOX_SETUP_SQL);
}
