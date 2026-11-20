import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoLabClient } from '../src/engine/mongo/client';
import { LabFailedError, LabTimeoutError, MongoRunError, MongoSyntaxError, type MongoResult } from '../src/engine/mongo/types';

/** Stand-in for the Mongo worker: records posted runs, the test answers them by hand. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string; preventDefault?: () => void }) => void) | null = null;
  posted: { id: number; src: string; dataset: string }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: { id: number; src: string; dataset: string }) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  send(data: unknown) {
    this.onmessage?.({ data });
  }
  answer(i: number) {
    const result: MongoResult = { kind: 'docs', collection: 'c', docs: [{ i }], truncated: false, ms: 1 };
    this.send({ type: 'result', id: this.posted[i].id, result });
  }
}
const last = () => FakeWorker.all[FakeWorker.all.length - 1];
const client = () => new MongoLabClient(5000, () => new FakeWorker() as unknown as Worker);

beforeEach(() => {
  FakeWorker.all = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('MongoLabClient', () => {
  it('chờ ready, gửi từng lệnh một', async () => {
    const c = client();
    const a = c.exec('A', 'shop');
    const b = c.exec('B', 'shop');
    expect(last().posted).toEqual([]);
    last().send({ type: 'ready' });
    expect(last().posted.map((p) => p.src)).toEqual(['A']);
    last().answer(0);
    expect(last().posted.map((p) => [p.src, p.dataset])).toEqual([['A', 'shop'], ['B', 'shop']]);
    last().answer(1);
    expect((await a).docs).toEqual([{ i: 0 }]);
    expect((await b).docs).toEqual([{ i: 1 }]);
  });

  it('quá giờ: lệnh bị từ chối, worker bị dừng và khởi động lại, hàng đợi chạy tiếp', async () => {
    const c = client();
    const seen: LabTimeoutError[] = [];
    c.onTimeout = (e) => seen.push(e);
    last().send({ type: 'ready' });
    const slow = c.exec('SLOW', 'shop');
    const slowDone = expect(slow).rejects.toBeInstanceOf(LabTimeoutError);
    const next = c.exec('NEXT', 'shop');
    const first = last();
    await vi.advanceTimersByTimeAsync(4999);
    expect(first.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await slowDone;
    expect(seen).toHaveLength(1);
    expect(first.terminated).toBe(true);
    expect(FakeWorker.all).toHaveLength(2);
    first.answer(0); // a late answer from the dead worker is ignored
    last().send({ type: 'ready' });
    expect(last().posted.map((p) => p.src)).toEqual(['NEXT']);
    last().answer(0);
    expect((await next).docs).toEqual([{ i: 0 }]);
  });

  it('lỗi cú pháp và lỗi chạy thành lớp lỗi có mã', async () => {
    const c = client();
    last().send({ type: 'ready' });
    const s = c.exec('x', 'shop');
    last().send({ type: 'error', id: last().posted[0].id, error: { type: 'syntax', code: 'expected_db', message: 'm', position: 0, line: 1, column: 1 } });
    await expect(s).rejects.toBeInstanceOf(MongoSyntaxError);
    const r = c.exec('y', 'shop');
    last().send({ type: 'error', id: last().posted[1].id, error: { type: 'run', code: 'mingo', message: 'unknown operator $foo' } });
    await expect(r).rejects.toMatchObject({ code: 'mingo', message: 'unknown operator $foo' });
    await expect(r).rejects.toBeInstanceOf(MongoRunError);
  });

  it('worker hỏng hoặc dispose: mọi lệnh bị từ chối', async () => {
    const c = client();
    const a = c.exec('A', 'shop');
    last().onerror?.({ message: 'boom' });
    await expect(a).rejects.toBeInstanceOf(LabFailedError);
    await expect(c.exec('B', 'shop')).rejects.toBeInstanceOf(LabFailedError);
    const d = client();
    const p = d.exec('C', 'shop');
    d.dispose();
    await expect(p).rejects.toBeInstanceOf(LabFailedError);
  });
});

/** Runs the real engine in-process (Node has no Worker), answering after `delay` ms like a worker would. */
const inProcess = (delay: number) =>
  class InProcessWorker extends FakeWorker {
    postMessage(m: { id: number; src: string; dataset: string }) {
      super.postMessage(m);
      setTimeout(async () => {
        const { runOnDataset } = await import('../src/engine/mongo/engineMongo');
        try {
          const result = await runOnDataset(m.dataset, m.src);
          if (!this.terminated) this.send({ type: 'result', id: m.id, result });
        } catch (e) {
          const error =
            e instanceof MongoSyntaxError
              ? { type: 'syntax', code: e.code, message: e.message, position: e.position, line: e.line, column: e.column }
              : { type: 'run', code: (e as MongoRunError).code, message: (e as Error).message };
          if (!this.terminated) this.send({ type: 'error', id: m.id, error });
        }
      }, delay);
    }
  };
const realClient = (timeoutMs: number, delay = 0) => {
  const W = inProcess(delay);
  const c = new MongoLabClient(timeoutMs, () => new W() as unknown as Worker);
  last().send({ type: 'ready' });
  return c;
};

describe('Mongo worker time limit (real engine, real clock)', () => {
  it('lệnh chạy quá giới hạn thì bị dừng; dưới giới hạn thì trả kết quả', async () => {
    vi.useRealTimers();
    await expect(realClient(10, 50).exec('db.orders.find({})', 'shop')).rejects.toBeInstanceOf(LabTimeoutError);
    expect((await realClient(1000).exec('db.orders.countDocuments({})', 'shop')).value).toBe(80);
  });
});

describe('MongoLabClient as ENG-CORE LabRunner', () => {
  const lab = { setup: 'shop', steps: [] };
  const step = (solution: string, ordered = false) => ({ solution, check: 'doc', ordered });

  it('prepare nạp dataset; dataset lạ bị từ chối', async () => {
    vi.useRealTimers();
    await expect(realClient(1000).prepare(lab)).resolves.toBeUndefined();
    await expect(realClient(1000).prepare({ setup: 'nope', steps: [] })).rejects.toMatchObject({ code: 'unknown_dataset' });
  });

  it('run trả bảng: cột theo trường, thiếu trường là undefined; count/distinct', async () => {
    vi.useRealTimers();
    const c = realClient(1000);
    const t = await c.run(lab, 'db.customers.find({ _id: { $in: [4, 6] } }, { _id: 1, email: 1 })');
    expect(t.columns).toEqual(['_id', 'email']);
    expect(t.rows).toEqual([[4, null], [6, undefined]]);
    expect(t.types).toEqual([]);
    expect((await c.run(lab, 'db.orders.countDocuments()')).rows).toEqual([[80]]);
    expect((await c.run(lab, 'db.products.distinct("category")')).columns).toEqual(['value']);
  });

  it('check: đúng, _id thừa là gợi ý, sai thứ tự, lỗi của người chơi, check khác doc', async () => {
    vi.useRealTimers();
    const c = realClient(1000);
    const s = step('db.customers.find({ city: "Hue" }, { _id: 0, name: 1 })');
    expect(await c.check(lab, s, `db.customers.find({ city: 'Hue' }, { name: 1, _id: 0 })`)).toEqual({ ok: true });
    expect(await c.check(lab, s, `db.customers.find({ city: 'Hue' }, { name: 1 })`)).toEqual({ ok: true, tip: 'extraId' });
    const sorted = step('db.products.find({}, { _id: 1 }).sort({ price: 1, _id: 1 })', true);
    expect(await c.check(lab, sorted, 'db.products.find({}, { _id: 1 }).sort({ _id: 1 })')).toMatchObject({ ok: false, reason: 'wrong', grade: { reason: 'order' } });
    expect(await c.check(lab, s, 'db.customers.find({ city: "Hue" ')).toMatchObject({ ok: false, reason: 'error' });
    expect(await c.check(lab, { ...s, check: 'rows' }, 'x')).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('check ghi: insert không _id và upsert khớp với chính Solution (id sinh theo lượt chạy)', async () => {
    vi.useRealTimers();
    const c = realClient(1000);
    const ins = 'db.products.insertMany([{ name: "x" }, { name: "y" }])';
    expect(await c.check(lab, step(ins), ins)).toEqual({ ok: true });
    const ups = 'db.products.updateOne({ name: "zz" }, { $set: { price: 1 } }, { upsert: true })';
    expect(await c.check(lab, step(ups), ups)).toEqual({ ok: true });
    expect(await c.check(lab, step(ins), 'db.products.insertMany([{ name: "x" }])')).toMatchObject({ ok: false, reason: 'wrong' });
  });
});
