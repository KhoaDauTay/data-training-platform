import { describe, expect, it } from 'vitest';
import src from '../src/main.ts?raw';
import { PGlite } from '@electric-sql/pglite';
import worker from '../src/db/worker.ts?raw';
import schemaSql from '../src/db/schema.sql?raw';
import { initEngine } from '../src/db/init';
import { ensureSchema } from '../src/db/lab';
import { ECOM_TABLES, LOGISTICS_TABLES } from '../src/domains';

// main.ts is a top-level-await module that needs a browser, so this checks its source order instead:
// the DB worker (PGlite download + seed) must start before the ticket chunk is awaited, so both load in parallel.
describe('khởi động', () => {
  it('DbClient được tạo trước await loadContent() (Plan 5: cùng lúc với từ điển EN)', () => {
    const db = src.indexOf('new DbClient(');
    const content = src.indexOf('await Promise.all([loadContent(), loadLang()])');
    expect(db).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(db);
  });
});

describe('v12.0 P1: worker khởi động rỗng, Logistics seed lười', () => {
  it('worker không còn nạp schema.sql/seed.sql lúc khởi động', () => {
    expect(worker).not.toMatch(/seed\.sql|schema\.sql|initDb\(/);
    expect(worker).toContain('initEngine(');
  });

  it('boot rỗng → ecom → game: không có bảng logistics trước khi ensure, đủ 26 bảng sau, search_path giữ nguyên', async () => {
    const db = new PGlite();
    await initEngine(db);
    const count = async (s: string) => (await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = '${s}'`)).rows[0].n;
    expect((await db.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
    await ensureSchema(db, 'ecom');
    expect(await count('logistics')).toBe(0);
    expect(await count('ecom')).toBe(ECOM_TABLES.length);
    await ensureSchema(db, 'game');
    expect(await count('logistics')).toBe(LOGISTICS_TABLES.length);
    expect((await db.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
  }, 120_000);

  it('LOGISTICS_TABLES = mọi CREATE TABLE trong schema.sql (đổi tên CSV, D10-11)', () => {
    const names = [...schemaSql.matchAll(/^CREATE TABLE\s+([a-z_]+)/gim)].map((m) => m[1].toLowerCase());
    expect([...LOGISTICS_TABLES].sort()).toEqual(names.sort());
  });
});
