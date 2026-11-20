import { describe, expect, it } from 'vitest';
import { parseShell, parseValue } from '../src/engine/mongo/parse';
import { MongoSyntaxError } from '../src/engine/mongo/types';

const err = (src: string): MongoSyntaxError => {
  try {
    parseShell(src);
  } catch (e) {
    if (e instanceof MongoSyntaxError) return e;
    throw e;
  }
  throw new Error(`parsed: ${src}`);
};

describe('mongosh parser (data only, never eval)', () => {
  it('đọc find + projection + chuỗi sort/limit/skip', () => {
    const c = parseShell(`db.orders.find({ status: 'paid', "items.qty": { $gte: 2 } }, { _id: 0, status: 1 }).sort({ createdAt: -1 }).skip(5).limit(10);`);
    expect(c.collection).toBe('orders');
    expect(c.method.name).toBe('find');
    expect(c.method.args).toEqual([{ status: 'paid', 'items.qty': { $gte: 2 } }, { _id: 0, status: 1 }]);
    expect(c.chain.map((x) => [x.name, x.args])).toEqual([
      ['sort', [{ createdAt: -1 }]],
      ['skip', [5]],
      ['limit', [10]],
    ]);
  });

  it('literal lồng nhau, dấu phẩy cuối, comment, số âm/mũ, chuỗi thoát', () => {
    const v = parseValue(`{
      // comment
      a: [1, -2.5, 3e2, +4, .5,], /* block */ 'b c': { $in: ["x\\"y", 'it\\'s', "\\u0041"] },
      n: null, t: true, f: false,
    }`);
    expect(v).toEqual({ a: [1, -2.5, 300, 4, 0.5], 'b c': { $in: ['x"y', "it's", 'A'] }, n: null, t: true, f: false });
  });

  it('ISODate, new Date, ObjectId, NumberDecimal, regex', () => {
    const v = parseValue(`{ d: ISODate("2026-01-02T00:00:00Z"), e: new Date(0), id: ObjectId("64B000000000000000000001"), x: NumberDecimal("1.25"), r: /^c[a-z]+\\/x/i }`) as Record<string, unknown>;
    expect(v.d).toEqual(new Date('2026-01-02T00:00:00Z'));
    expect(v.e).toEqual(new Date(0));
    expect(v.id).toBe('64b000000000000000000001');
    expect(v.x).toBe(1.25);
    expect(v.r).toBeInstanceOf(RegExp);
    expect((v.r as RegExp).source).toBe('^c[a-z]+\\/x');
    expect((v.r as RegExp).flags).toBe('i');
  });

  it('aggregate pipeline và getCollection', () => {
    const c = parseShell(`db.getCollection("orders").aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$customerId", n: { $sum: 1 } } }])`);
    expect(c.collection).toBe('orders');
    expect(c.method.args[0]).toEqual([{ $match: { status: 'paid' } }, { $group: { _id: '$customerId', n: { $sum: 1 } } }]);
  });

  it('lỗi có mã và vị trí (dòng, cột)', () => {
    const e = err(`db.orders.find({ status: 'paid' )`);
    expect(e.code).toBe('expected');
    expect(e.position).toBe(32);
    expect([e.line, e.column]).toEqual([1, 33]);
    expect(err(`db.orders.find(\n  { a: 'x }\n)`).line).toBe(2);
    expect(err(`db.orders.find({ a: 'x }`).code).toBe('unterminated_string');
    expect(err(`db.orders.drop()`).code).toBe('unknown_method');
    expect(err(`db.orders.aggregate([]).sort({a: 1})`).code).toBe('unknown_chain');
    expect(err(`db.find({})`).code).toBe('expected_collection');
    expect(err(`orders.find({})`).code).toBe('expected_db');
    expect(err(`db.orders.find({}); db.orders.find({})`).code).toBe('trailing');
    expect(err(``).code).toBe('empty');
    expect(err(`db.orders.find({ a: /x/g })`).code).toBe('bad_regex');
    expect(err(`db.orders.find({ a: ObjectId("12") })`).code).toBe('bad_objectid');
  });

  it('không chạy code: hàm, biến, prototype đều là lỗi cú pháp', () => {
    expect(err(`db.orders.find({ $where: function() { return true } })`).code).toBe('script_disabled');
    expect(err(`db.orders.aggregate([{ $set: { x: { $function: { body: "1", args: [], lang: "js" } } } }])`).code).toBe('script_disabled');
    expect(err(`db.orders.find({ a: function() { return 1 } })`).code).toBe('unsupported_value');
    expect(err(`db.orders.find({ a: x })`).code).toBe('unsupported_value');
    expect(err(`db.orders.find({ a: (() => 1)() })`).code).toBe('expected_name');
    expect(err(`db.orders.find({ __proto__: { polluted: 1 } })`).code).toBe('forbidden_key');
    expect(err(`db.orders.find({ "constructor": 1 })`).code).toBe('forbidden_key');
    expect(err(`db.orders.toString()`).code).toBe('unknown_method');
    expect(err(`db.orders.find({}).constructor()`).code).toBe('unknown_chain');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
