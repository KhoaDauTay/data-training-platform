import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import schema from '../src/db/schema.sql?raw';
import { parsePeople, PEOPLE, personOf, roleLine } from '../src/people';
import { runner } from './helpers';

const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const ONE = `- name: A
  dept: Ops
  employee: null
  role: { vi: "a", en: "a" }
  bio: { vi: "b", en: "b" }
  tables: [shipments]
  look: { skin: light, hair: black, style: short, accessory: none }
`;

describe('people.yml (L18)', () => {
  it('mọi người gửi ticket có trong people.yml, đúng phòng ban', () => {
    const missing = loadTickets()
      .filter((t) => personOf(t.from.name)?.dept !== t.from.dept)
      .map((t) => `${t.id}: ${t.from.name} (${t.from.dept})`);
    expect(missing).toEqual([]);
  });

  it('đủ vai trò nghiệp vụ: 6 trưởng phòng/giám đốc + chứng từ, khai báo, điều độ/CFS, pricing, AR, AP, CSKH, sales, IT', () => {
    expect(PEOPLE.map((p) => p.dept).sort()).toEqual([
      'CS', 'CS', 'Customs', 'Customs', 'Finance', 'Finance', 'Finance', 'IT', 'Management', 'Ops', 'Ops', 'Ops', 'Sales', 'Sales', 'Sales',
    ]);
    const roles = PEOPLE.map((p) => p.role.en).join(' | ');
    for (const role of ['Managing director', 'Head of Operations', 'Documentation and booking', 'Customs declarant', 'CFS dispatcher',
      'Pricing officer', 'Accounts receivable', 'Accounts payable', 'Customer service officer', 'Sales executive', 'IT team lead']) {
      expect(roles).toContain(role);
    }
  });

  it('người có employee khớp đúng tên và phòng ban trong bảng employees của seed', async () => {
    const run = await runner();
    const r = await run('SELECT id, full_name, dept FROM employees');
    const seed = new Map(r.rows.map(([id, name, dept]) => [Number(id), `${String(name)}|${String(dept)}`]));
    const wrong = PEOPLE.filter((p) => p.employee !== null && seed.get(p.employee) !== `${p.name}|${p.dept}`).map((p) => p.name);
    expect(wrong).toEqual([]);
    expect(PEOPLE.filter((p) => p.employee === null).map((p) => p.dept)).toEqual(['IT']);
  });

  it('EN của role/bio không có dấu tiếng Việt', () => {
    expect(PEOPLE.filter((p) => VI_DIACRITIC.test(p.role.en + p.bio.en)).map((p) => p.name)).toEqual([]);
  });

  it('parsePeople báo lỗi cấu trúc', () => {
    expect(parsePeople(ONE)[0]).toMatchObject({ name: 'A', employee: null, look: { accessory: 'none' } });
    expect(() => parsePeople(ONE.replace('accessory: none', 'accessory: cape'))).toThrow(/look\.accessory/);
    expect(() => parsePeople(ONE.replace('role: { vi: "a", en: "a" }', 'role: { vi: "a", en: "" }'))).toThrow(/role/);
    expect(() => parsePeople(ONE.replace('  employee: null\n', ''))).toThrow(/employee/);
    expect(() => parsePeople(ONE + ONE)).toThrow(/trùng/);
    expect(() => parsePeople('name: A')).toThrow(/danh sách/);
    expect(() => parsePeople(ONE.replace('  tables: [shipments]\n', ''))).toThrow(/tables/);
  });

  it('tables: mọi người có ít nhất một bảng, tên bảng có thật trong schema.sql (L18, L34)', () => {
    const real = new Set([...schema.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]));
    expect(PEOPLE.filter((p) => p.tables.length === 0 || p.tables.some((x) => !real.has(x))).map((p) => p.name)).toEqual([]);
  });

  it('roleLine: vai trò + bảng đã mở, không dịch tên bảng; người lạ → rỗng', () => {
    expect(roleLine('Hoàng Khánh', 'en')).toBe('Head of Operations, your mentor');
    expect(roleLine('Hoàng Khánh', 'en', ['shipments', 'customers'])).toBe('Head of Operations, your mentor · shipments');
    expect(roleLine('Hoàng Khánh', 'vi', ['shipments', 'containers'])).toBe('Trưởng phòng Ops, người kèm DA mới · shipments, containers');
    expect(roleLine('Không Ai', 'vi', ['shipments'])).toBe('');
  });
});
