import schema from './schema.sql?raw';
import seed from './seed.sql?raw';

export async function initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void> {
  await db.exec(schema);
  await db.exec(seed);
}
