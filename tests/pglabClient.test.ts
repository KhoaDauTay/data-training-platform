import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScriptResult } from '../src/engine/pglab/script';
import { LAB_TIMEOUT_MS, LabFailedError, LabResetError, LabTimeoutError, PgLabClient } from '../src/engine/pglab/client';

/** Stand-in for pglabWorker: records posted labs, the test answers by hand. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  posted: { id: number }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: { id: number }) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  send(data: unknown) {
    this.onmessage?.({ data });
  }
  answer(i: number) {
    this.send({ type: 'result', id: this.posted[i].id, result: { ok: true, steps: [], checks: [], bootMs: 1, ms: i } satisfies ScriptResult });
  }
}
const last = () => FakeWorker.all[FakeWorker.all.length - 1];
const script = { steps: ['SELECT 1'] };

beforeEach(() => {
  FakeWorker.all = [];
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PgLabClient', () => {
  it('chờ worker sẵn sàng, gửi từng lab một', async () => {
    const lab = new PgLabClient();
    const a = lab.run(script);
    const b = lab.run(script);
    await vi.advanceTimersByTimeAsync(0);
    const w = last();
    expect(w.posted).toHaveLength(0);
    w.send({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(0);
    expect(w.posted).toHaveLength(1);
    w.answer(0);
    await expect(a).resolves.toMatchObject({ ms: 0 });
    await vi.advanceTimersByTimeAsync(0);
    expect(w.posted).toHaveLength(2);
    w.answer(1);
    await expect(b).resolves.toMatchObject({ ms: 1 });
    expect(FakeWorker.all).toHaveLength(1);
  });

  it('quá giờ: terminate, LabTimeoutError, dựng ngay worker mới cho lab sau', async () => {
    const lab = new PgLabClient();
    const a = lab.run({ ...script, timeoutMs: 1000 });
    const caught = a.catch((e) => e);
    await vi.advanceTimersByTimeAsync(0);
    const w = last();
    w.send({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(999);
    expect(w.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const e = await caught;
    expect(e).toBeInstanceOf(LabTimeoutError);
    expect(e.timeoutMs).toBe(1000);
    expect(w.terminated).toBe(true);
    expect(FakeWorker.all).toHaveLength(2);
    const b = lab.run(script);
    last().send({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(0);
    last().answer(0);
    await expect(b).resolves.toMatchObject({ ok: true });
    expect(LAB_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('reset: lab đang chạy bị LabResetError, lab sau chạy trên worker mới', async () => {
    const lab = new PgLabClient();
    const a = lab.run(script).catch((e) => e);
    await vi.advanceTimersByTimeAsync(0);
    const w = last();
    w.send({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(0);
    lab.reset();
    expect(await a).toBeInstanceOf(LabResetError);
    expect(w.terminated).toBe(true);
    const b = lab.run(script);
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWorker.all).toHaveLength(2);
    last().send({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(0);
    last().answer(0);
    await expect(b).resolves.toMatchObject({ ok: true });
  });

  it('boot hỏng hoặc fault = LabFailedError; lần sau thử boot lại', async () => {
    const lab = new PgLabClient();
    const a = lab.run(script).catch((e) => e);
    await vi.advanceTimersByTimeAsync(0);
    last().send({ type: 'initError', message: 'wasm 404' });
    expect(await a).toMatchObject({ name: 'LabFailedError', detail: 'wasm 404' });
    const b = lab.run(script).catch((e) => e);
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWorker.all).toHaveLength(2);
    last().send({ type: 'ready' });
    await vi.advanceTimersByTimeAsync(0);
    last().send({ type: 'fault', id: last().posted[0].id, message: 'unknown extension x' });
    const e = await b;
    expect(e).toBeInstanceOf(LabFailedError);
    expect(last().terminated).toBe(false);
  });
});
