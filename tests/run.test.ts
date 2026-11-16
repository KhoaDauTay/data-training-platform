import { describe, expect, it } from 'vitest';
import { MAX_ROWS_WORKER, runSandboxed, SqlError, sqlErrorInfo } from '../src/db/run';
import { seededDb } from './helpers';

async function failure(sql: string): Promise<unknown> {
  const db = await seededDb();
  return runSandboxed(db, sql).then(
    () => expect.fail(`không lỗi: ${sql}`),
    (e: unknown) => e,
  );
}

describe('runSandboxed: lỗi Postgres có cấu trúc', () => {
  it('cột sai: position (1-based, số), code, hint; message giữ nguyên', async () => {
    const e = await failure('SELECT cde FROM ports');
    expect(e).toBeInstanceOf(SqlError);
    expect(e).toMatchObject({ message: 'column "cde" does not exist', position: 8, code: '42703' });
    expect((e as SqlError).hint).toMatch(/ports\.code/);
  });

  it('position tính theo ký tự khi SQL có dấu tiếng Việt', async () => {
    expect(await failure("SELECT 'Hà Nội' || cde FROM ports")).toMatchObject({ code: '42703', position: 20 });
  });

  it('nhiều câu lệnh: 42601, không có position', async () => {
    const e = await failure('SELECT 1; SELECT 2');
    expect(e).toMatchObject({ code: '42601', position: undefined });
  });

  it('sau lỗi vẫn chạy tiếp được (đã ROLLBACK)', async () => {
    await failure('SELEC 1');
    const db = await seededDb();
    expect((await runSandboxed(db, 'SELECT 1')).rows).toEqual([[1]]);
  });
});

describe('sqlErrorInfo', () => {
  it('lỗi không phải Postgres → undefined', () => {
    expect(sqlErrorInfo(new Error('x'))).toBeUndefined();
    expect(sqlErrorInfo('x')).toBeUndefined();
  });
  it('đổi position chuỗi thành số, bỏ position không hợp lệ', () => {
    expect(sqlErrorInfo({ message: 'm', code: '42P01', position: '18' })).toEqual({ message: 'm', code: '42P01', position: 18, hint: undefined });
    expect(sqlErrorInfo({ message: 'm', code: '42601', position: '' })?.position).toBeUndefined();
  });
});

describe('runSandboxed: trần số dòng', () => {
  it('MAX_ROWS_WORKER = 50.000', () => {
    expect(MAX_ROWS_WORKER).toBe(50_000);
  });
  it('vượt trần: cắt và đánh dấu truncated', async () => {
    const db = await seededDb();
    const r = await runSandboxed(db, 'SELECT generate_series(1, 10)', 3);
    expect(r.rows).toEqual([[1], [2], [3]]);
    expect(r.truncated).toBe(true);
  });
  it('không vượt trần: không có truncated', async () => {
    const db = await seededDb();
    const r = await runSandboxed(db, 'SELECT generate_series(1, 3)', 3);
    expect(r.rows).toHaveLength(3);
    expect(r).not.toHaveProperty('truncated');
  });
});
