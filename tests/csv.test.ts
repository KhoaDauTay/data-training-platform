import { describe, expect, it } from 'vitest';
import { IMPORT_LIMITS, RESERVED, inspectCsv, sanitizeIdent, scanRecords, splitCsvLine, tableNameFor, uniqueNames } from '../src/import/csv';
import { seededDb } from './helpers';

const GAME = new Set(['ports', 'shipments', 'customers']);
const bytes = (s: string) => new TextEncoder().encode(s);
const file = (s: string) => new Blob([s]);

describe('sanitize tên', () => {
  it('bỏ dấu tiếng Việt, chữ thường, ký tự lạ thành _, số đầu thêm c_', () => {
    expect(sanitizeIdent('Mã Lô (VNĐ)', 'x')).toBe('ma_lo_vnd');
    expect(sanitizeIdent('  Đơn  giá/kg ', 'x')).toBe('don_gia_kg');
    expect(['xmin', 'ctid', 'tableoid'].map((c) => sanitizeIdent(c, 'x'))).toEqual(['xmin_', 'ctid_', 'tableoid_']); // system columns (42701)
    expect(sanitizeIdent('2026 Sales', 'x')).toBe('c_2026_sales');
    expect(sanitizeIdent('!!!', 'col_3')).toBe('col_3');
    expect(sanitizeIdent('a'.repeat(80), 'x')).toHaveLength(63);
  });

  it('từ khóa dành riêng của Postgres thêm _ ở cuối', () => {
    expect(sanitizeIdent('Order', 'x')).toBe('order_');
    expect(sanitizeIdent('LEFT', 'x')).toBe('left_');
    expect(sanitizeIdent('year', 'x')).toBe('year');
  });

  it('RESERVED khớp pg_get_keywords() của PGlite đang dùng', async () => {
    const db = await seededDb();
    const r = await db.query<{ word: string }>("SELECT word FROM pg_get_keywords() WHERE catcode IN ('R', 'T')");
    expect(new Set(r.rows.map((x) => x.word))).toEqual(RESERVED);
  });

  it('trùng tên thêm _2, _3 và vẫn ≤ 63 ký tự', () => {
    expect(uniqueNames(['a', 'a', 'a_2', 'a'])).toEqual(['a', 'a_2', 'a_2_2', 'a_3']);
    const long = 'b'.repeat(63);
    expect(uniqueNames([long, long])[1]).toBe(`${'b'.repeat(61)}_2`);
  });

  it('tên bảng từ tên file; trùng bảng game thêm _my', () => {
    expect(tableNameFor('Đơn hàng 2026.csv', GAME)).toBe('don_hang_2026');
    expect(tableNameFor('Shipments.CSV', GAME)).toBe('shipments_my');
    expect(tableNameFor('.csv', GAME)).toBe('my_data');
    expect(tableNameFor(`${'p'.repeat(70)}.csv`, new Set(['p'.repeat(63)]))).toBe(`${'p'.repeat(60)}_my`);
  });
});

describe('đọc CSV', () => {
  it('tách dòng tiêu đề có ngoặc kép', () => {
    expect(splitCsvLine('"Mã, lô";"He said ""hi""";x', ';')).toEqual(['Mã, lô', 'He said "hi"', 'x']);
  });

  it('đếm bản ghi: xuống dòng trong ngoặc kép không tính, dòng cuối không có \\n vẫn tính', () => {
    expect(scanRecords(bytes('a,b\n1,"x\ny"\n2,z'))).toEqual({ records: 3, headerEnd: 3 });
    expect(scanRecords(bytes('a,b\r\n1,2\r\n'))).toEqual({ records: 2, headerEnd: 4 });
  });

  it('inspectCsv: BOM, CRLF, phân cách ;, tên cột sanitize', async () => {
    const r = await inspectCsv(file('\uFEFF"Mã lô";Số tiền;order\r\nA;1;x\r\nB;2;y\r\n'), 'Lô hàng.csv', GAME, []);
    expect(r).toEqual({
      ok: true,
      spec: { table: 'lo_hang', fileName: 'Lô hàng.csv', delimiter: ';', headers: ['Mã lô', 'Số tiền', 'order'], columns: ['ma_lo', 'so_tien', 'order_'], rows: 2, bytes: expect.any(Number) },
    });
  });

  it('từ chối theo từng giới hạn, trước khi gửi tới worker', async () => {
    const big = { size: IMPORT_LIMITS.maxBytes + 1 } as Blob; // không đọc nội dung khi quá dung lượng
    expect(await inspectCsv(big, 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'tooLarge', bytes: IMPORT_LIMITS.maxBytes + 1 } });
    expect(await inspectCsv(file('a\n' + '1\n'.repeat(IMPORT_LIMITS.maxRows + 1)), 'a.csv', GAME, []))
      .toEqual({ ok: false, problem: { kind: 'tooManyRows', rows: IMPORT_LIMITS.maxRows + 1 } });
    expect(await inspectCsv(file('a\n' + '1\n'.repeat(IMPORT_LIMITS.maxRows)), 'a.csv', GAME, [])).toMatchObject({ ok: true });
    const wide = Array.from({ length: 51 }, (_, i) => `c${i}`).join(',');
    expect(await inspectCsv(file(`${wide}\n${wide}\n`), 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'tooManyColumns', columns: 51 } });
    expect(await inspectCsv(file('a\n'), 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'empty' } });
    expect(await inspectCsv(file(''), 'a.csv', GAME, [])).toEqual({ ok: false, problem: { kind: 'empty' } });
    const five = ['t1', 't2', 't3', 't4', 't5'];
    expect(await inspectCsv(file('a\n1\n'), 'new.csv', GAME, five)).toEqual({ ok: false, problem: { kind: 'tooManyTables' } });
    expect(await inspectCsv(file('a\n1\n'), 't3.csv', GAME, five)).toMatchObject({ ok: true, spec: { table: 't3' } });
  });
});
