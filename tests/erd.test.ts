import { describe, expect, it } from 'vitest';
import { runSandboxed } from '../src/db/run';
import { erColumnsSql, erDefinition, loadErMetadata, mermaidName, tablesInQuery, type ErColumn, type ErConstraint } from '../src/viz/erd';
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

describe('erDefinition escape tên (header CSV, L36)', () => {
  const evil = 'x" ||--o{ y : "z"\n  style a fill:red\n  click a href "javascript:alert(1)"';
  const cols: ErColumn[] = [
    { table: 'bad table}', name: evil, type: 'character varying', nullable: true },
    { table: 'bad table}', name: 'số_lượng', type: 'integer', nullable: false },
    { table: '2026 orders', name: 'id', type: 'integer', nullable: false },
  ];
  const cons: ErConstraint[] = [{ table: 'bad table}', column: evil, kind: 'FOREIGN KEY', refTable: '2026 orders' }];

  it('mỗi tên thành một từ an toàn; chữ Việt có dấu được giữ', () => {
    expect(mermaidName('shipments')).toBe('shipments');
    expect(mermaidName('bad table}')).toBe('bad_table_');
    expect(mermaidName('2026 orders')).toBe('_2026_orders');
    expect(mermaidName('số_lượng')).toBe('số_lượng');
    expect(mermaidName('')).toBe('_');
  });

  it('không chèn được cú pháp Mermaid; style dùng màu hex hợp lệ', () => {
    const def = erDefinition(cols, cons, ['bad table}', '2026 orders'], new Set(['bad table}']), '#0284c7');
    const lines = def.split('\n');
    // Only our own lines: header, direction, 1 relationship, 2 table blocks (4 + 3 lines), 1 style.
    expect(lines).toHaveLength(2 + 1 + 4 + 3 + 1);
    expect(lines.filter((l) => /^\s*(style|click)\b/.test(l))).toEqual(['  style bad_table_ stroke-width:3px,stroke:#0284c7']);
    const label = mermaidName(evil);
    expect(label).toMatch(/^\w+$/);
    expect(def).toContain(`_2026_orders |o--o{ bad_table_ : "${label}"`);
    expect(def).toContain(`character_varying ${label} FK`);
    expect(def).toContain('integer số_lượng');
  });

  it('màu không phải hex bị bỏ, chỉ còn viền đậm', () => {
    const def = erDefinition(cols, [], ['bad table}'], new Set(['bad table}']), 'red;fill:url(x)');
    expect(def).toContain('  style bad_table_ stroke-width:3px');
    expect(def).not.toContain('url(');
  });
});

describe('tablesInQuery', () => {
  it('nhận tên bảng, bỏ qua chuỗi ký tự và phân biệt hoa thường', () => {
    const known = ['shipments', 'customers', 'ports'];
    expect(tablesInQuery("SELECT * FROM Shipments s JOIN customers c ON c.id = s.customer_id WHERE s.note = 'ports'", known))
      .toEqual(new Set(['shipments', 'customers']));
  });
});
