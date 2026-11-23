import { describe, expect, it } from 'vitest';
import { runSandboxed } from '../src/db/run';
import { GAME_SCHEMA } from '../src/domains';
import { loadTickets } from '../src/content';
import { tablesUnlocked } from '../src/progress';
import { app, showsParents, textValues } from '../src/state';
import {
  distinctValuesSql, erColumnsSql, erDefinition, erRowCountsSql, loadErMetadata, mermaidName, relatedTables, tablesInQuery, TEXT_TYPES, toDistinctValues,
  type ErColumn, type ErConstraint,
} from '../src/viz/erd';
import { clearMemos, MEMO_MAX } from '../src/viz/memo';
import { freshDb, runner } from './helpers';

const CH2 = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];

describe('erDefinition (schema public)', () => {
  it('quan hệ crow\'s foot và khóa từ information_schema', async () => {
    const { cols, cons } = await loadErMetadata(await runner(), GAME_SCHEMA);
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
    const { cols, cons } = await loadErMetadata(await runner(), GAME_SCHEMA);
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
  const cons: ErConstraint[] = [{ table: 'bad table}', column: evil, kind: 'FOREIGN KEY', refTable: '2026 orders', refColumn: 'id' }];

  it('mỗi tên thành một từ an toàn; chữ Việt có dấu được giữ', () => {
    expect(mermaidName('shipments')).toBe('shipments');
    expect(mermaidName('bad table}')).toBe('bad_table_');
    expect(mermaidName('2026 orders')).toBe('_2026_orders');
    expect(mermaidName('số_lượng')).toBe('số_lượng');
    expect(mermaidName('')).toBe('_');
  });

  it('từ khóa Mermaid (kể cả khi theo sau là chữ có dấu) được thêm _ ở đầu', () => {
    expect(mermaidName('class')).toBe('_class');
    expect(mermaidName('toán')).toBe('_toán');
    expect(mermaidName('PK')).toBe('_PK');
    expect(mermaidName('tons')).toBe('tons');
    expect(mermaidName('endpoint')).toBe('endpoint');
  });

  it('không chèn được cú pháp Mermaid; style dùng màu hex hợp lệ', () => {
    const def = erDefinition(cols, cons, ['bad table}', '2026 orders'], new Set(['bad table}']), '#0284c7');
    const lines = def.split('\n');
    // Only our own lines: header, direction, 1 relationship, 2 table blocks (4 + 3 lines), 1 style.
    expect(lines).toHaveLength(2 + 1 + 4 + 3 + 1);
    expect(lines.filter((l) => /^\s*(style|click)\b/.test(l))).toEqual(['  style bad_table_ stroke-width:2px,stroke:#0284c7']);
    const label = mermaidName(evil);
    expect(label).toMatch(/^\w+$/);
    expect(def).toContain(`_2026_orders |o--o{ bad_table_ : "${label}"`);
    expect(def).toContain(`character_varying ${label} FK`);
    expect(def).toContain('integer số_lượng');
  });

  it('màu không phải hex bị bỏ, chỉ còn viền đậm', () => {
    const def = erDefinition(cols, [], ['bad table}'], new Set(['bad table}']), 'red;fill:url(x)');
    expect(def).toContain('  style bad_table_ stroke-width:2px');
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

const fk = (table: string, refTable: string, column = `${refTable}_id`): ErConstraint => ({ table, column, kind: 'FOREIGN KEY', refTable, refColumn: 'id' });

describe('relatedTables (ui-ux-v4 §4)', () => {
  const cons = [fk('c', 'b'), fk('b', 'a'), fk('a', 'a', 'parent_id'), fk('x', 'b'), fk('y', 'x'), fk('z', 'z', 'self_id')];
  const all = ['a', 'b', 'c', 'x', 'y', 'z'];

  it('đi con → cha mọi độ sâu, không đi cha → con, tự tham chiếu không lặp', () => {
    expect(relatedTables(['c'], all, cons)).toEqual({ tables: ['c', 'a', 'b'], dropped: [] });
    expect(relatedTables(['z'], all, cons)).toEqual({ tables: ['z'], dropped: [] });
    expect(relatedTables(['a'], all, cons).tables).toEqual(['a']);
  });

  it('L2: withParents false = chỉ bảng của việc và cầu nối, không bảng cha FK', () => {
    expect(relatedTables(['c'], all, cons, 10, false)).toEqual({ tables: ['c'], dropped: [] });
    expect(relatedTables(['c', 'y'], all, cons, 10, false)).toEqual({ tables: ['c', 'y', 'b', 'x'], dropped: [] });
  });

  it('thêm bảng cầu nối khi bảng của việc không liên thông', () => {
    // c and y meet through b and x (c → b ← x ← y); a is a parent of b.
    expect(relatedTables(['c', 'y'], all, cons)).toEqual({ tables: ['c', 'y', 'b', 'x', 'a'], dropped: [] });
  });

  it('bảng chưa mở không bao giờ xuất hiện, kể cả qua FK', () => {
    expect(relatedTables(['c', 'q'], ['b', 'c'], cons)).toEqual({ tables: ['c', 'b'], dropped: [] });
  });

  it('vượt max: bỏ bảng cha ít được tham chiếu nhất trước; core không bị cắt', () => {
    const r = relatedTables(['c', 'y'], all, cons, 4);
    expect(r).toEqual({ tables: ['c', 'y', 'b', 'x'], dropped: ['a'] });
    expect(relatedTables(['c', 'y'], all, cons, 1).tables).toEqual(['c', 'y', 'b', 'x']);
  });

  it('dữ liệu thật: ch10-04 có 8 bảng; chỉ ch12-06 phải ẩn bớt', async () => {
    const { cons: real } = await loadErMetadata(await runner(), GAME_SCHEMA);
    const tickets = loadTickets();
    const ch10 = tickets.find((x) => x.id === 'ch10-04')!;
    expect(new Set(relatedTables(ch10.tables, tablesUnlocked(10), real).tables)).toEqual(
      new Set(['container_events', 'containers', 'shipments', 'customers', 'free_time_terms', 'ports', 'carriers', 'employees']));
    const over = tickets.filter((x) => relatedTables(x.tables, tablesUnlocked(x.chapter), real).dropped.length > 0).map((x) => x.id);
    expect(over).toEqual(['ch12-06']);
    expect(real.find((c) => c.table === 'shipments' && c.column === 'customer_id')).toMatchObject({ refTable: 'customers', refColumn: 'id' });
  });
});

describe('erDefinition detail', () => {
  it('chỉ bảng trong detail có khối cột; bảng khác là hộp tên', async () => {
    const { cols, cons } = await loadErMetadata(await runner(), GAME_SCHEMA);
    const def = erDefinition(cols, cons, CH2, new Set(['shipments']), undefined, new Set(['shipments']));
    expect(def).toContain('shipments {');
    expect(def).not.toContain('customers {');
    expect(def.split(/\n/)).toContain('  customers');
    expect(def).toContain('customers ||--o{ shipments : "customer_id"');
  });
});

describe('erRowCountsSql', () => {
  it('đếm chính xác, giá trị là số', async () => {
    const r = await (await runner())(erRowCountsSql(['ports', 'carriers']));
    expect(r.rows.map(([t]) => t)).toEqual(['ports', 'carriers']);
    for (const [, n] of r.rows) expect(typeof n).toBe('number');
  });

  it('một truy vấn cho mọi bảng của chương 12, đủ nhanh dưới giới hạn 5 s', async () => {
    const run = await runner();
    const all = tablesUnlocked(12);
    const start = performance.now();
    const r = await run(erRowCountsSql(all));
    const ms = performance.now() - start;
    console.log(`erRowCountsSql: ${all.length} tables in ${ms.toFixed(0)} ms`);
    expect(r.rows.map(([x]) => x)).toEqual(all);
    for (const [, n] of r.rows) expect(n).toBeGreaterThan(0);
    expect(ms).toBeLessThan(5000);
  });

  it('từ chối tên bảng không phải định danh', () => {
    expect(() => erRowCountsSql(['ports; DROP TABLE x'])).toThrow();
  });
});

describe('distinctValuesSql (giá trị của cột chữ, product-design-v4 §C.4-4)', () => {
  it('giá trị đã sắp xếp; cột có hơn 20 giá trị không hiện; tên lạ bị từ chối', async () => {
    const run = await runner();
    expect(toDistinctValues(await run(distinctValuesSql('ports', ['kind', 'region', 'code'])))).toEqual({
      kind: ['AIRPORT', 'SEAPORT'],
      region: ['Asia', 'Europe', 'North America', 'Oceania'],
    });
    expect(toDistinctValues(await run(distinctValuesSql('employees', ['dept'])))).toEqual({ dept: ['CS', 'Customs', 'Finance', 'Management', 'Ops', 'Sales'] });
    expect(() => distinctValuesSql('ports', ['kind; DROP TABLE ports'])).toThrow();
    expect(() => distinctValuesSql('ports x', ['kind'])).toThrow();
  });

  it('mọi bảng chữ của chương 12: một câu mỗi bảng, tổng cộng nhanh (Node; trình duyệt chậm hơn vài lần)', async () => {
    const run = await runner();
    const meta = await loadErMetadata(run, GAME_SCHEMA);
    const start = performance.now();
    for (const table of tablesUnlocked(12)) {
      const cols = meta.cols.filter((c) => c.table === table && TEXT_TYPES.has(c.type)).map((c) => c.name);
      if (cols.length) await run(distinctValuesSql(table, cols));
    }
    const ms = performance.now() - start;
    console.log(`distinctValuesSql: ${tablesUnlocked(12).length} tables in ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});

describe('textValues (src/state.ts)', () => {
  it('mỗi bảng chạy đúng một lần mỗi phiên, kể cả khi mở hết bảng chương 12 và bảng tuyến (> MEMO_MAX)', async () => {
    const run = await runner();
    const sqls: string[] = [];
    app.run = (sql) => (sqls.push(sql), run(sql));
    clearMemos();
    const tables = [...tablesUnlocked(12), 'lane_profiles', 'bunker_prices'];
    expect(tables.length).toBeGreaterThan(MEMO_MAX);
    for (let pass = 0; pass < 2; pass++) await Promise.all(tables.map((x) => textValues(x)));
    const perTable = sqls.filter((s) => s.includes('ARRAY(SELECT DISTINCT')).map((s) => s.match(/ FROM (\w+) WHERE/)![1]);
    expect(perTable).toContain('ports');
    expect(perTable.length).toBe(new Set(perTable).size);
  });
});

describe('L2: bảng cha FK chỉ từ chương dạy JOIN', () => {
  it('Logistics: chương 1–2 không, từ chương 3 có', () => {
    app.tickets = loadTickets('logistics');
    const ch = (n: number) => app.tickets.find((x) => x.chapter === n)!;
    expect(showsParents(ch(1))).toBe(false);
    expect(showsParents(ch(2))).toBe(false);
    expect(showsParents(ch(3))).toBe(true);
  });
});
