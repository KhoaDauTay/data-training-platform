import { afterEach, describe, expect, it } from 'vitest';
import { ambient, kick, resetAmbient, type AmbientEnv } from '../src/art/ambient';

function fakeEnv(reduced = false) {
  const frames = new Map<number, FrameRequestCallback>();
  const watchers: ((on: boolean) => void)[] = [];
  let next = 0;
  let disconnected = 0;
  const state = { reduced, hidden: false };
  const env: AmbientEnv = {
    raf: (f) => { frames.set(++next, f); return next; },
    caf: (n) => { frames.delete(n); },
    reduced: () => state.reduced,
    hidden: () => state.hidden,
    observe: (_el, cb) => { watchers.push(cb); return () => { disconnected++; }; },
  };
  const step = (ms = 16): void => { const fs = [...frames.values()]; frames.clear(); fs.forEach((f) => f(ms)); };
  return { env, frames, watchers, step, state, disconnected: () => disconnected };
}
const el = {} as Element;

afterEach(() => resetAmbient());

describe('ambient', () => {
  it('registers nothing under reduced motion', () => {
    const f = fakeEnv(true);
    ambient(el, () => {}, f.env);
    expect(f.watchers.length).toBe(0);
    expect(f.frames.size).toBe(0);
  });
  it('never calls frame while the picture is off screen or the tab is hidden', () => {
    const f = fakeEnv();
    let n = 0;
    ambient(el, () => n++, f.env);
    expect(f.frames.size).toBe(0); // not on screen yet
    f.watchers[0](true);
    f.step();
    expect(n).toBe(1);
    f.watchers[0](false);
    f.step();
    f.step();
    expect(n).toBe(1);
    f.watchers[0](true);
    f.state.hidden = true;
    f.step();
    expect(n).toBe(1);
    f.state.hidden = false;
    kick(f.env); // visibilitychange
    f.step();
    expect(n).toBe(2);
  });
  it('stop ends the frames and disconnects the observer', () => {
    const f = fakeEnv();
    let n = 0;
    const stop = ambient(el, () => n++, f.env);
    f.watchers[0](true);
    stop();
    f.step();
    expect(n).toBe(0);
    expect(f.disconnected()).toBe(1);
    expect(f.frames.size).toBe(0);
  });
  it('runs one loop for many subscribers', () => {
    const f = fakeEnv();
    const seen: string[] = [];
    ambient(el, () => seen.push('a'), f.env);
    ambient(el, () => seen.push('b'), f.env);
    f.watchers[0](true);
    f.watchers[1](true);
    expect(f.frames.size).toBe(1);
    f.step();
    expect(seen).toEqual(['a', 'b']);
    expect(f.frames.size).toBe(1);
  });
});
