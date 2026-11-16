import schema from './schema.sql?raw';
import seed from './seed.sql?raw';
import { SANDBOX_SETUP_SQL } from './import';

export async function initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void> {
  await db.exec(schema);
  await db.exec(seed);
  await db.exec(SANDBOX_SETUP_SQL);
}
