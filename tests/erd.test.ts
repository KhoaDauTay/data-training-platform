import { describe, expect, it } from 'vitest';
import { runSandboxed } from '../src/db/run';
import { erColumnsSql, erDefinition, loadErMetadata, tablesInQuery } from '../src/viz/erd';
import { freshDb, runner } from './helpers';

const CH2 = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];

describe('erDefinition (schema public)', () => {
  it('quan hệ crow\'s foot và khóa từ information_schema', async () => {
    const { cols, cons } = await loadErMetadata(await runner(), 'public');
    const def = erDefinition(cols, cons, CH2, new Set(['shipments']));
    expect(def.startsWith('erDiagram')).toBe(true);
    expect(def).toContain('customers ||--o{ shipments : "customer_id"');
    expect(def).toContain('employees |o--o{ employees : "manager_id"');
    expect(def).toContain('ports ||--o{ shipments : "pol"');
    expect(def).toContain('shipments ||--o{ containers : "shipment_id"');
    expect(def).toContain('integer id PK');
    expect(def).toContain('text ref UK');
    expect(def).toContain('integer customer_id FK');
    expect(def).toMatch(/style shipments /);
    expect(def).not.toMatch(/style customers /);
  });

  it('chỉ vẽ bảng đã mở khóa và quan hệ giữa chúng', async () => {
    const { cols, cons } = await loadErMetadata(await runner(), 'public');
    const def = erDefinition(cols, cons, CH2.slice(0, 5), new Set());
    expect(def).not.toContain('containers');
  });
});

describe('schema khác (dữ liệu nạp vào sandbox)', () => {
  it('đọc đúng schema, bảng không có khóa thì chỉ có hộp bảng', async () => {
    const db = await freshDb();
    await db.exec('CREATE SCHEMA IF NOT EXISTS sandbox; CREATE TABLE sandbox.my_orders (order_no text, qty integer)');
    const { cols, cons } = await loadErMetadata((sql) => runSandboxed(db, sql), 'sandbox');
    expect(cols.map((c) => `${c.table}.${c.name}`)).toEqual(['my_orders.order_no', 'my_orders.qty']);
    expect(cons).toEqual([]);
    const def = erDefinition(cols, cons, ['my_orders'], new Set());
    expect(def).toContain('my_orders {');
    expect(def).toContain('integer qty');
    expect(def).not.toContain('--');
  });

  it('từ chối tên schema không phải định danh', () => {
    expect(() => erColumnsSql("public' OR '1'='1")).toThrow();
  });
});

describe('tablesInQuery', () => {
  it('nhận tên bảng, bỏ qua chuỗi ký tự và phân biệt hoa thường', () => {
    const known = ['shipments', 'customers', 'ports'];
    expect(tablesInQuery("SELECT * FROM Shipments s JOIN customers c ON c.id = s.customer_id WHERE s.note = 'ports'", known))
      .toEqual(new Set(['shipments', 'customers']));
  });
});
