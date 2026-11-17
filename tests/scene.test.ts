import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { derive, durationOf, parseScene, routeOpenedBy, ROUTES, sceneOf, STEPS, type Scene } from '../src/scene';
import { parseTicket } from '../src/tickets';
import { runner } from './helpers';

const tickets = loadTickets();
const upTo = (ch: number) => new Set(tickets.filter((t) => t.chapter <= ch).map((t) => t.id));
const fail = (msg: string): never => {
  throw new Error(msg);
};
const parse = (v: unknown, boss = false): Scene => parseScene(v, boss, fail);
const as = (dept: string, tables: string[] = ['ports']) => ({ ...tickets[0], from: { name: 'X', dept }, tables });

describe('sceneOf (completion-animations §3.2–§3.3)', () => {
  it('mọi ticket ra đúng bảng §3.3 (ch1–3 sau 3 dòng scene: của Step 4; ch4–6 theo Plan 2)', () => {
    expect(Object.fromEntries(tickets.map((t) => [t.id, sceneOf(t)]))).toEqual({
      'ch1-01': { kind: 'yard' }, 'ch1-02': { kind: 'yard' }, 'ch1-03': { kind: 'yard' }, 'ch1-04': { kind: 'yard' },
      'ch1-05': { kind: 'promotion', to: 'NLRTM' },
      'ch2-01': { kind: 'yard' }, 'ch2-02': { kind: 'yard' }, 'ch2-03': { kind: 'yard' }, 'ch2-04': { kind: 'ship' },
      'ch2-05': { kind: 'promotion' },
      'ch3-01': { kind: 'chat' }, 'ch3-02': { kind: 'yard' }, 'ch3-03': { kind: 'chat' }, 'ch3-04': { kind: 'yard' },
      'ch3-05': { kind: 'promotion' },
      'ch4-01': { kind: 'chat' }, 'ch4-02': { kind: 'ship' }, 'ch4-03': { kind: 'truck' }, 'ch4-04': { kind: 'chat' },
      'ch4-05': { kind: 'truck' }, 'ch4-06': { kind: 'promotion' },
      'ch5-01': { kind: 'customs', lane: 'green' }, 'ch5-02': { kind: 'customs', lane: 'yellow' },
      'ch5-03': { kind: 'customs', lane: 'green' }, 'ch5-04': { kind: 'customs', lane: 'red' }, 'ch5-05': { kind: 'chat' },
      'ch5-06': { kind: 'promotion' },
      'ch6-01': { kind: 'chat' }, 'ch6-02': { kind: 'truck' }, 'ch6-03': { kind: 'yard' }, 'ch6-04': { kind: 'ledger' },
      'ch6-05': { kind: 'ship' }, 'ch6-06': { kind: 'promotion' },
      'ch7-01': { kind: 'yard' }, 'ch7-02': { kind: 'quote' }, 'ch7-03': { kind: 'quote' }, 'ch7-04': { kind: 'quote' },
      'ch7-05': { kind: 'yard' }, 'ch7-06': { kind: 'promotion' },
      'ch8-01': { kind: 'ledger' }, 'ch8-02': { kind: 'ledger' }, 'ch8-03': { kind: 'ledger' }, 'ch8-04': { kind: 'ledger' },
      'ch8-05': { kind: 'ledger' }, 'ch8-06': { kind: 'promotion' },
      'ch9-01': { kind: 'yard' }, 'ch9-02': { kind: 'ledger' }, 'ch9-03': { kind: 'yard' }, 'ch9-04': { kind: 'ship' },
      'ch9-05': { kind: 'ship' }, 'ch9-06': { kind: 'promotion' },
      'ch10-01': { kind: 'yard' }, 'ch10-02': { kind: 'yard' }, 'ch10-03': { kind: 'truck' }, 'ch10-04': { kind: 'ledger' },
      'ch10-05': { kind: 'ledger' }, 'ch10-06': { kind: 'promotion' },
      'ch11-01': { kind: 'yard' }, 'ch11-02': { kind: 'yard' }, 'ch11-03': { kind: 'chat' }, 'ch11-04': { kind: 'truck' },
      'ch11-05': { kind: 'ledger' }, 'ch11-06': { kind: 'promotion' },
    });
  });

  it('mặc định theo phòng ban và bảng; scene: khai thì thắng; customs không khai lane là luồng xanh', () => {
    expect(sceneOf(as('Customs'))).toEqual({ kind: 'customs', lane: 'green' });
    expect(sceneOf(as('Finance'))).toEqual({ kind: 'ledger' });
    expect(sceneOf(as('CS'))).toEqual({ kind: 'chat' });
    expect(sceneOf(as('Ops', ['shipments']))).toEqual({ kind: 'ship' });
    expect(sceneOf(as('Ops'))).toEqual({ kind: 'yard' });
    expect(sceneOf(as('Sales', ['shipments']))).toEqual({ kind: 'yard' });
    expect(sceneOf({ ...as('Sales'), scene: { kind: 'quote' } })).toEqual({ kind: 'quote' });
    expect(sceneOf({ ...as('Ops'), scene: { kind: 'customs' } })).toEqual({ kind: 'customs', lane: 'green' });
    expect(sceneOf({ ...as('Ops'), scene: { kind: 'customs', lane: 'red' } })).toEqual({ kind: 'customs', lane: 'red' });
  });
});

describe('parseScene (§3.1)', () => {
  it('nhận các dạng hợp lệ', () => {
    expect(parse({ kind: 'ship', to: 'NLRTM' })).toEqual({ kind: 'ship', to: 'NLRTM' });
    expect(parse({ kind: 'customs', lane: 'yellow' })).toEqual({ kind: 'customs', lane: 'yellow' });
    expect(parse({ kind: 'yard' })).toEqual({ kind: 'yard' });
    expect(parse({ kind: 'ship', to: 'SGSIN' }, true)).toEqual({ kind: 'ship', to: 'SGSIN' });
    expect(parse({ kind: 'yard', to: 'AUSYD' }, true)).toEqual({ kind: 'yard', to: 'AUSYD' });
  });

  it('báo lỗi', () => {
    expect(() => parse('ship')).toThrow(/scene phải là/);
    expect(() => parse({ kind: 'promotion' })).toThrow(/scene\.kind/);
    expect(() => parse({ kind: 'boat' })).toThrow(/scene\.kind/);
    expect(() => parse({ kind: 'yard', lane: 'red' })).toThrow(/scene\.lane/);
    expect(() => parse({ kind: 'customs', lane: 'blue' })).toThrow(/scene\.lane/);
    expect(() => parse({ kind: 'yard', to: 'NLRTM' })).toThrow(/scene\.to/);
    expect(() => parse({ kind: 'ship', to: 'BKK' })).toThrow(/scene\.to/);
    expect(() => parse({ kind: 'ship', port: 'NLRTM' })).toThrow(/khóa lạ/);
  });

  it('parseTicket đọc scene: và báo lỗi kèm tên file', () => {
    const src = `---
id: ch1-02
chapter: 1
title: Cảng
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: []
grants: [where]
tables: [ports]
scene: { kind: truck }
---
Đề.

## Hints
1. a
2. b
3. c

## Solution
\`\`\`sql
SELECT 1
\`\`\`
`;
    expect(parseTicket(src, 'x.md').scene).toEqual({ kind: 'truck' });
    expect(() => parseTicket(src.replace('{ kind: truck }', '{ kind: truck, lane: red }'), 'x.md')).toThrow(/x\.md: scene\.lane/);
  });
});

describe('tuyến từ Tiên Sa (L26, L31)', () => {
  it('mỗi tuyến là cảng SEAPORT của seed, tên đúng ports.name; có Laem Chabang, không có Bangkok', async () => {
    const run = await runner();
    const r = await run("SELECT code, name FROM ports WHERE kind = 'SEAPORT'");
    const seed = new Map(r.rows.map(([code, name]) => [String(code), String(name)]));
    expect(ROUTES.filter((x) => seed.get(x.port) !== x.name).map((x) => x.port)).toEqual([]);
    expect(ROUTES.map((x) => x.name)).toContain('Laem Chabang');
    expect(ROUTES.map((x) => x.name).join()).not.toMatch(/Bangkok/);
  });

  it('mỗi chương mở nhiều nhất một tuyến; ch6+ không mở tuyến', () => {
    expect([1, 2, 3, 4, 5, 6, 12].map(routeOpenedBy)).toEqual(['SGSIN', 'NLRTM', 'KRPUS', 'USLAX', 'AUSYD', undefined, undefined]);
    const opens = ROUTES.map((x) => x.opens).filter((n) => n > 0);
    expect(new Set(opens).size).toBe(opens.length);
  });
});

describe('derive (§7): mọi thứ tính lại từ completed', () => {
  it('save trống: bãi trống, hai tuyến mở từ đầu', () => {
    expect(derive(tickets, new Set())).toEqual({ bays: {}, passed: new Set(), open: new Set(['CNSHA', 'THLCH']), trips: {}, departures: 0 });
  });

  it('xong chương 1: 5 container chương 1, qua chương 1, mở Singapore; tàu ch1-05 tới Rotterdam mở luôn tuyến đó (L32)', () => {
    expect(derive(tickets, upTo(1))).toEqual({
      bays: { 1: 5 }, passed: new Set([1]), open: new Set(['CNSHA', 'THLCH', 'SGSIN', 'NLRTM']), trips: { NLRTM: 1 }, departures: 0,
    });
  });

  it('một chuyến tàu tới cảng nào thì mở tuyến tới cảng đó (L32), không cần qua chương', () => {
    const ship = { ...tickets[0], id: 'zz-01', beat: 'develop' as const, scene: { kind: 'ship' as const, to: 'USLAX' } };
    expect(derive([ship], new Set(['zz-01'])).open).toEqual(new Set(['CNSHA', 'THLCH', 'USLAX']));
  });

  it('xong chương 2: mở Rotterdam; cột mốc ch2 (không to) chạy tuyến vừa mở; ch2-04 là chuyến không đích', () => {
    const h = derive(tickets, upTo(2));
    expect(h.bays).toEqual({ 1: 5, 2: 5 });
    expect(h.open).toEqual(new Set(['CNSHA', 'THLCH', 'SGSIN', 'NLRTM']));
    expect(h.trips).toEqual({ NLRTM: 2 });
    expect(h.departures).toBe(1);
  });

  it('bỏ qua id lạ trong completed', () => {
    expect(derive(tickets, new Set(['nope']))).toEqual(derive(tickets, new Set()));
  });
});

describe('thời lượng (§2): mỗi hoạt cảnh ≤ 3 s', () => {
  it('khớp bảng §2', () => {
    expect(durationOf({ kind: 'ship' })).toBe(2600);
    expect(durationOf({ kind: 'yard' })).toBe(2800);
    expect(durationOf({ kind: 'customs' })).toBe(2400);
    expect(durationOf({ kind: 'customs', lane: 'yellow' })).toBe(2800);
    expect(durationOf({ kind: 'customs', lane: 'red' })).toBe(3000);
    expect(durationOf({ kind: 'truck' })).toBe(2700);
    expect(durationOf({ kind: 'quote' })).toBe(2300);
    expect(durationOf({ kind: 'ledger' })).toBe(2600);
    expect(durationOf({ kind: 'chat' })).toBe(2400);
    expect(durationOf({ kind: 'promotion' })).toBe(3000);
  });

  it('không loại nào vượt 3000 ms', () => {
    const all = (Object.keys(STEPS) as Scene['kind'][]).flatMap((kind) => (['green', 'yellow', 'red'] as const).map((lane) => durationOf({ kind, lane })));
    expect(Math.max(...all)).toBeLessThanOrEqual(3000);
  });
});
